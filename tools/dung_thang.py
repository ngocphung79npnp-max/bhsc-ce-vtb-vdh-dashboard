#!/usr/bin/env python3
"""Dựng trang riêng cho từng tháng.
   thang/YYYY-MM/seed.json  (số liệu của tháng, do PIPE.run tạo ra)
   app.html                  (mã trang, chỗ giữ: __SEED_JSON__ và __THANG_JSON__)
 -> thang/YYYY-MM/index.html cho mỗi tháng + index.html ở gốc = tháng mới nhất.
Chạy:  python3 tools/dung_thang.py   (từ thư mục gốc repo)"""
import json, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = open(os.path.join(ROOT, 'app.html'), encoding='utf8').read()
assert app.count('__SEED_JSON__') == 1 and app.count('__THANG_JSON__') == 1
kys = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, 'thang', '*', 'seed.json')))
assert kys, 'chưa có tháng nào trong thang/'
def label(k): y, m = k.split('-'); return f'Tháng {int(m)}/{y}'
def build(ky, at_root):
    seed = open(os.path.join(ROOT, 'thang', ky, 'seed.json'), encoding='utf8').read().strip()
    json.loads(seed)
    lst = [{'ky': k, 'label': label(k), 'url': (f'thang/{k}/' if at_root else f'../{k}/')} for k in reversed(kys)]
    th = json.dumps({'ky': ky, 'moiNhat': kys[-1], 'list': lst}, ensure_ascii=False)
    return app.replace('__SEED_JSON__', seed).replace('__THANG_JSON__', th)
for k in kys:
    open(os.path.join(ROOT, 'thang', k, 'index.html'), 'w', encoding='utf8').write(build(k, False))
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf8').write(build(kys[-1], True))
print('Các tháng:', ', '.join(kys), '· trang gốc =', kys[-1])
