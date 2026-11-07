#!/usr/bin/env python3
"""Cập nhật Data 319 (kho 33286) vào trang theo tháng – có lọc trùng.
Dùng:  python3 tools/cap_nhat_319.py <file319_1.xlsx> [file319_2.xlsx ...]
 - Chỉ giữ dòng coordinatorstoreidrq = 33286.
 - Khóa trùng = Mã vận đơn | Mã sản phẩm | IMEI. Trùng thì lấy bản của file đưa vào SAU (bước xử lý mới nhất).
 - Chia tháng theo "Ngày giao hàng". Kho dòng gọn (không tên khách, IMEI chỉ lưu dạng mã băm)
   nằm ở thang/YYYY-MM/d319_rows.json, gộp dồn qua các lần cập nhật.
 - Chạy lại PIPE trên toàn bộ dòng của tháng, thay phần d319 trong thang/YYYY-MM/seed.json
   (tháng chưa có thì tạo mới), rồi dựng lại trang (tools/dung_thang.py)."""
import sys, os, json, hashlib, subprocess, tempfile, datetime as dt, glob
import openpyxl, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KHO = '33286'
COLS = ['Mã vận đơn', 'Mã đơn hàng vật lý', 'Danh sách giao hàng', 'Nhóm hàng', 'Số lượng', 'Bước xử lý',
        'Tên YCVC', 'Ngày giao hàng', 'Trạng thái vận đơn', 'Tên sản phẩm']
s = lambda v: '' if v is None else (str(int(v)) if isinstance(v, float) and v.is_integer() else str(v).strip())

def doc(fp):
    wb = openpyxl.load_workbook(fp, read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        it = ws.iter_rows(values_only=True)
        hdr = next(it, None)
        if not hdr: continue
        H = {unicodedata.normalize('NFC', s(h).replace(chr(160), ' ')).strip(): i for i, h in enumerate(hdr) if h is not None}
        if 'coordinatorstoreidrq' not in H: continue
        miss = [c for c in COLS + ['Mã sản phẩm', 'IMEI sản phẩm'] if c not in H]
        if miss: raise SystemExit(f'{fp}: thiếu cột {miss}')
        for r in it:
            g = lambda c: r[H[c]] if H[c] < len(r) else None
            if s(g('coordinatorstoreidrq')) != KHO: continue
            ng = g('Ngày giao hàng')
            if not isinstance(ng, dt.datetime): continue
            key = hashlib.sha1(f"{s(g('Mã vận đơn'))}|{s(g('Mã sản phẩm'))}|{s(g('IMEI sản phẩm'))}".encode()).hexdigest()[:16]
            row = {c: (g(c).isoformat() if isinstance(g(c), dt.datetime) else (unicodedata.normalize('NFC', g(c)) if isinstance(g(c), str) else g(c))) for c in COLS}
            out.append((ng.strftime('%Y-%m'), key, row))
    return out

def main(files):
    nhom = {}
    for fp in files:
        rows = doc(fp)
        print(f'{os.path.basename(fp)}: {len(rows)} dòng kho {KHO}')
        for ky, key, row in rows: nhom.setdefault(ky, {})[key] = row
    if not nhom: raise SystemExit('Không có dòng nào của kho 33286 – kiểm tra lại file.')
    for ky in sorted(nhom):
        d = os.path.join(ROOT, 'thang', ky); os.makedirs(d, exist_ok=True)
        sp = os.path.join(d, 'd319_rows.json')
        if not os.path.exists(sp) and os.path.exists(os.path.join(d, 'seed.json')) and \
                json.load(open(os.path.join(d, 'seed.json'), encoding='utf8')).get('d319', {}).get('tot'):
            print(f'{ky}: BỎ QUA {len(nhom[ky])} dòng – tháng này đã có số 319 cũ nhưng không có kho dòng gộp, cập nhật sẽ làm mất số cũ.')
            continue
        store = json.load(open(sp, encoding='utf8')) if os.path.exists(sp) else {}
        n0 = len(store); moi = sum(k not in store for k in nhom[ky]); store.update(nhom[ky])
        json.dump(store, open(sp, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        # file xlsx tạm cho PIPE
        tmp = tempfile.mkdtemp()
        x = os.path.join(tmp, f'data 319 {ky}.xlsx')
        wb = openpyxl.Workbook(); ws = wb.active
        ws.append(['coordinatorstoreidrq', 'Mã sản phẩm', 'IMEI sản phẩm'] + COLS)
        for k, r in store.items():
            ws.append([KHO, k, ''] + [dt.datetime.fromisoformat(r[c]) if c == 'Ngày giao hàng' else r[c] for c in COLS])
        wb.save(x)
        y, m = map(int, ky.split('-'))
        last = max(dt.datetime.fromisoformat(r['Ngày giao hàng']) for r in store.values())
        seed_p = os.path.join(d, 'seed.json')
        seed = json.load(open(seed_p, encoding='utf8')) if os.path.exists(seed_p) else None
        co_dt = seed and any(seed['meta']['has'].get(k) for k in ('bt', 'd11', 'cn', 'rsm'))
        chot = seed['meta']['chot'] if co_dt else min(last.day, 31)
        outj = os.path.join(tmp, 'r.json')
        subprocess.run(['node', os.path.join(ROOT, 'tools', 'pipe_run.js'), str(m), str(y), str(chot), outj, x], check=True)
        r = json.load(open(outj, encoding='utf8'))
        now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        info = {**r['meta']['files'][0], 'name': f'Data 319/data 319 {ky} (gộp, lọc trùng)'}
        if seed:
            seed['d319'] = r['d319']
            have = {x['u'] for x in seed['roster'] if x}
            seed['roster'] += [x for x in r['roster'] if x and x['u'] not in have]
            seed['meta']['files'] = [f for f in seed['meta']['files'] if f.get('type') != 'd319'] + [info]
            seed['meta']['has']['d319'] = True
            if not co_dt: seed['meta']['chot'] = chot
        else:
            seed = r; seed['meta']['files'] = [info]
        # tên & bộ phận thợ: lấy theo các tháng trước (nguồn Sao chuẩn hơn)
        ref = {}
        for p in sorted(glob.glob(os.path.join(ROOT, 'thang', '*', 'seed.json'))):
            if os.path.basename(os.path.dirname(p)) >= ky: continue
            for x in json.load(open(p, encoding='utf8')).get('roster', []):
                if x: ref[x['u']] = x
        for x in seed['roster']:
            if x and x['u'] in ref and not seed['meta']['has'].get('sao'):
                x['ten'], x['pb'] = ref[x['u']]['ten'], ref[x['u']]['pb']
        seed['generated'] = now
        json.dump(seed, open(seed_p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        dd = seed['d319']
        print(f'{ky}: kho {n0} → {len(store)} dòng (+{moi} mới, {len(nhom[ky]) - moi} cập nhật lại) · '
              f'VĐ bảo hành {dd["tot"]} · BH xong {dd["bhx"]} · chuyển hãng {dd["ch"]} · chưa CN {dd["ccn"]}')
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'dung_thang.py')], check=True)

if __name__ == '__main__':
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    main(sys.argv[1:])
