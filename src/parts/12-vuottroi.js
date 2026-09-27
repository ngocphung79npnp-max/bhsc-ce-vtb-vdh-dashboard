
/* __TAB10_VUOT_TROI__ */
/* =============================================================================
   MODULE 9 — VƯỢT TRỘI  (tab 10)
   Nguồn: vuottroi.json — sinh cùng lúc với app Vượt Trội nên 2 nơi LUÔN khớp số.
   · Tổng hợp theo kho, bấm vào kho xổ ra danh sách người
   · Ăn theo bộ lọc chung: Tháng (1 tháng = 1 cột) · Vùng · Kho · Loại hình
   · 2 nút xuất: Danh sách Vượt Trội (Excel 3 sheet) và Data nguồn
   ========================================================================== */
let VT = null, VT_ERR = null;
const VT_OPEN = {};                         /* kho nào đang mở danh sách */

/* ── NẠP DỮ LIỆU: fetch TRƯỚC, bản nhúng làm DỰ PHÒNG ────────────────────────
   · Qua http (GitHub Pages): fetch chạy được -> LUÔN lấy vuottroi.json mới nhất
     trong repo, nên skill cap-nhat-app-vuot-troi vẫn có thể đẩy RIÊNG file
     vuottroi.json mà không cần build lại index.html (giữ nguyên quy trình cũ).
   · Mở file HTML tự chứa bằng file:// : trình duyệt CHẶN mọi fetch (CORS), trước
     đây tab 10 báo "Không tải được dữ liệu Vượt Trội" -> nay rơi về VT_EMBED
     (bản chụp build2.js nhúng sẵn) nên vẫn xem được offline.
   VT_EMBED có thể không tồn tại (bản index.html do add_tab10.py chèn thẳng) —
   dùng typeof để không vỡ.                                                    */
const VT_FALLBACK = (typeof VT_EMBED !== 'undefined' && VT_EMBED) ? VT_EMBED : null;
/* Mở bằng file:// thì fetch CHẮC CHẮN bị chặn -> dùng thẳng bản nhúng, KHÔNG gọi
   fetch để khỏi ném lỗi CORS đỏ ra console (làm roundtrip.js/xlscheck.js báo lỗi oan). */
if (location.protocol === 'file:' && VT_FALLBACK) {
  VT = VT_FALLBACK;
  setTimeout(() => { if (ST.tab === 9) render(); }, 0);
} else {
fetch('vuottroi.json?v=' + Date.now()).then(r => {
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}).then(j => {
  VT = j; VT_ERR = null; if (ST.tab === 9) render();
}).catch(e => {
  if (VT_FALLBACK) { VT = VT_FALLBACK; VT_ERR = null; }   /* offline: dùng bản nhúng */
  else VT_ERR = e.message;
  if (ST.tab === 9) render();
});
}

const vtMonths = (S = ST) => selMonths(S).filter(m => (VT.meta.thang || []).indexOf(m) >= 0);
const vtNhomOK = (nhom, S = ST) => nhom === 'kho' ? showKho(S) : showNha(S);
/* mã kho gốc: "VTB_DNA_TK" (kho tại kho) -> "VTB_DNA" để khớp bộ lọc chung của web */
const vtBase = ma => String(ma || '').replace(/_TK$/, '');
/* dùng chính vungOf() của web — giá trị bộ lọc là "Vùng Trung Bộ"/"Vùng Duyên Hải", KHÔNG phải VTB/VDH */
const vtVungOK = (ma, S = ST) => S.vung === 'TONG' || vungOf(vtBase(ma)) === S.vung;
const vtKhoOK = (k, S = ST) => {
  if (!vtVungOK(k.ma, S)) return false;
  if (S.kho !== 'ALL' && vtBase(k.ma) !== S.kho) return false;
  return vtNhomOK(k.nhom, S);
};
const vtPct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
const vtTien = v => v == null ? '—' : Number(v).toLocaleString('vi-VN');

function renderM9() {
  if (VT_ERR) return stateHTML('err', 'Không tải được dữ liệu Vượt Trội',
    `Lỗi: <b>${esc(VT_ERR)}</b>. Kiểm tra file <code>vuottroi.json</code> có nằm cùng thư mục với trang này không.`, 'alert');
  if (!VT) return stateHTML('info', 'Đang tải dữ liệu Vượt Trội…', 'Chờ một chút ạ.', 'file');

  const S = ST, ms = vtMonths(S);
  const khos = Object.values(VT.kho).filter(k => vtKhoOK(k, S));
  if (!khos.length) return vtToolbar() + stateHTML('info', 'Không có kho nào khớp bộ lọc',
    'Thử đổi bộ lọc Vùng / Kho / Loại hình ở đầu trang.', 'map');

  const maSet = new Set(khos.map(k => k.ma));
  const ng = VT.nguoi.filter(p => maSet.has(p.kho) && vtNhomOK(p.nhom, S));
  const vtLK = ng.filter(p => p.vt).length;
  const nNha = ng.filter(p => p.nhom === 'nha').length, nKho = ng.filter(p => p.nhom === 'kho').length;

  const banner = bannerHTML('TỔNG QUAN VƯỢT TRỘI', 'trophy', [
    bItem('Đạt Vượt Trội', 'trophy', `${vtLK}/${ng.length}`, 'người',
      `${vtPct(vtLK, ng.length)}% · quota 30%/kho`, true),
    bItem('Bảo hành tại nhà', 'home', String(nNha), 'người', 'xét 3 tiêu chí'),
    bItem('Bảo hành tại kho', 'warehouse', String(nKho), 'người', 'xét TOP 30% thu nhập'),
    bItem('Bảo lưu kỳ 6 tháng', 'shield', String(ng.filter(p => p.chot6t).length), 'người', 'giữ nguyên danh hiệu'),
    bItem('Kho', 'map', String(khos.length), 'đơn vị', esc(scopeLbl(S)))
  ]);

  return vtToolbar() + vtNote(S) + banner + vtBangKho(khos, ms, S)
       + (showNha(S) ? vtBangTN(S, ms) : '') + vtGhiChu();
}

/* ── thanh nút xuất ─────────────────────────────────────────────────────── */
function vtToolbar() {
  return `<div class="vtbar">
    <div class="vtbar-l">${ic('trophy', 15)}<b>ĐÁNH GIÁ VƯỢT TRỘI ${VT.meta.nam}</b>
      <span class="vtsub">Nguồn: ${esc(VT.meta.nguon)} · cập nhật ${esc(VT.meta.capNhat)}</span></div>
    <div class="vtbar-r">
      <button class="btn" id="vtXuatDS">${ic('download', 13)} Xuất Excel Danh Sách Vượt Trội</button>
      <button class="btn ghost" id="vtXuatData">${ic('file', 13)} Xuất Data nguồn</button>
    </div></div>`;
}

function vtNote(S) {
  const t = [];
  if (['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'].indexOf(S.ky) >= 0)
    t.push('Vượt Trội chỉ chấm theo <b>THÁNG</b> — đang hiển thị kết quả cả tháng của kỳ đang chọn.');
  t.push(`Tháng 8 chốt data tới <b>${esc(VT.meta.chotT8)}</b>.`);
  return `<div class="lblbar">${ic('info', 14)} ${t.join(' ')}</div>`;
}

/* ── bảng tổng hợp theo kho (bấm để xổ danh sách) ───────────────────────── */
function vtBangKho(khos, ms, S) {
  const head = `<tr><th class="l">KHO / ĐƠN VỊ</th><th>NHÓM</th><th>SỐ NV</th>
    ${ms.map(m => `<th>T${m}</th>`).join('')}
    <th class="lk">LŨY KẾ<br><small>T1–T${Math.max(...(VT.meta.thang || [8]))}</small></th></tr>`;

  const body = khos.map(k => {
    const mem = VT.nguoi.filter(p => p.kho === k.ma);
    const open = !!VT_OPEN[k.ma];
    const cells = ms.map(m => {
      const d = k.thang[String(m)];
      if (!d) return `<td class="vtx">—</td>`;
      const cls = d.vt >= k.quota ? 'ok' : (d.vt ? 'mid' : 'no');
      return `<td class="vtc ${cls}"><b>${d.vt}</b><small>/${d.n}</small></td>`;
    }).join('');
    const p = vtPct(k.lk.vt, k.n);
    const row = `<tr class="vtrow ${open ? 'open' : ''}" data-vtkho="${esc(k.ma)}">
      <td class="l"><button class="vtexp">${ic(open ? 'chevdown' : 'chev', 12)}</button>
        <b>${esc(k.tinh)}</b> <span class="vtcode">${esc(k.ma)}</span></td>
      <td><span class="vtag ${k.nhom}">${k.nhom === 'kho' ? 'Tại kho' : 'Tại nhà'}</span></td>
      <td>${k.n}</td>${cells}
      <td class="lk"><b>${k.lk.vt}</b><small>/${k.n}</small><i>${p}%</i></td></tr>`;
    return row + (open ? vtDanhSach(mem, ms, k) : '');
  }).join('');

  const tot = khos.reduce((a, k) => a + k.n, 0);
  const totVT = khos.reduce((a, k) => a + k.lk.vt, 0);
  const totM = ms.map(m => {
    const s = khos.reduce((a, k) => a + ((k.thang[String(m)] || {}).vt || 0), 0);
    const n = khos.reduce((a, k) => a + ((k.thang[String(m)] || {}).n || 0), 0);
    return `<td class="vtc tot"><b>${s}</b><small>/${n}</small></td>`;
  }).join('');

  return `<section class="card vtcard"><header class="hd">
      <div><h3>${ic('map', 15)} KẾT QUẢ VƯỢT TRỘI THEO KHO</h3>
      <span class="sub">Bấm vào tên kho để xem danh sách từng người · ô hiển thị <b>số người đạt / số người có dữ liệu</b></span></div></header>
    <div class="body"><div class="tblwrap"><table class="dt vttbl">
      <thead>${head}</thead><tbody>${body}
      <tr class="vttot"><td class="l"><b>TỔNG</b></td><td></td><td><b>${tot}</b></td>${totM}
        <td class="lk"><b>${totVT}</b><small>/${tot}</small><i>${vtPct(totVT, tot)}%</i></td></tr>
      </tbody></table></div></div></section>`;
}

/* ── danh sách người trong 1 kho ────────────────────────────────────────── */
function vtDanhSach(mem, ms, k) {
  const isKho = k.nhom === 'kho';
  const rows = mem.map(p => {
    const cells = ms.map(m => {
      const d = p.thang[String(m)];
      if (!d) return `<td class="vtx">—</td>`;
      if (isKho) return `<td class="${d.vt ? 'ok' : ''}">${d.vt ? '🏆' : ''}<small>#${d.h || '—'}</small></td>`;
      return `<td class="${d.vt ? 'ok' : (d.d === 6 ? 'mid' : '')}">${d.d}${d.vt ? ' 🏆' : ''}</td>`;
    }).join('');
    const lk = isKho ? `#${p.hang}` : `${p.diem}<small> · #${p.hang}</small>`;
    const warn = !p.duDK ? `<span class="vtwarn" title="Chưa đủ 5 tháng có dữ liệu">${p.soThang}/8 th</span>` : '';
    return `<tr class="vtper ${p.vt ? 'win' : ''}">
      <td class="l"><span class="vtma">${esc(p.ma)}</span> ${esc(p.ten)} ${warn}
        ${p.chot6t ? '<span class="vtchip">bảo lưu 6T</span>' : ''}</td>
      <td class="vtcv">${esc(p.cv)}</td><td class="vttn">${vtTien(p.tn)}</td>
      ${cells}<td class="lk">${lk} ${p.vt ? '🏆' : ''}</td></tr>`;
  }).join('');
  return `<tr class="vtsub-row"><td colspan="${4 + ms.length}"><div class="vtlist">
    <table class="dt vtinner"><thead><tr><th class="l">MÃ · HỌ TÊN</th><th>CHỨC VỤ</th><th>THU NHẬP</th>
      ${ms.map(m => `<th>T${m}</th>`).join('')}<th class="lk">${isKho ? 'HẠNG' : 'ĐIỂM · HẠNG'}</th></tr></thead>
    <tbody>${rows}</tbody></table></div></td></tr>`;
}

/* ── bảng xếp hạng Trưởng nhóm / QLDV ───────────────────────────────────── */
function vtBangTN(S, ms) {
  const CT = VT.meta.critTN, keys = Object.keys(CT);
  const list = VT.tn.filter(t => vtVungOK(t.kho, S) && (S.kho === 'ALL' || t.kho === S.kho));
  if (!list.length) return '';
  const grp = ['VTB', 'VDH'].filter(v => list.some(t => t.vung === v));
  const secs = grp.map(v => {
    const gTen = v === 'VTB' ? 'VÙNG TRUNG BỘ' : 'VÙNG DUYÊN HẢI';
    const g = list.filter(t => t.vung === v).sort((a, b) => a.hang - b.hang);
    const rows = g.map(t => `<tr class="${t.hang <= 1 ? 'win' : ''}">
      <td class="rk">${t.hang === 1 ? '🥇' : t.hang === 2 ? '🥈' : t.hang === 3 ? '🥉' : t.hang}</td>
      <td class="l"><span class="vtma">${esc(t.ma)}</span> <b>${esc(t.ten)}</b>
        <small>· ${esc(t.tinh)}</small></td>
      ${keys.map(c => `<td>${t.diemLK[c] || 0}</td>`).join('')}
      ${ms.map(m => { const d = t.thang[String(m)]; return `<td class="${d && d.hang === 1 ? 'ok' : ''}">${d ? d.tong : '—'}</td>`; }).join('')}
      <td class="lk"><b>${t.tong}</b></td></tr>`).join('');
    return `<div class="vtgrp"><div class="vtgt">${ic('shield', 13)} ${gTen}</div>
      <div class="tblwrap"><table class="dt vttbl"><thead>
        <tr><th>HẠNG</th><th class="l">MÃ · TRƯỞNG NHÓM / QLDV</th>
        ${keys.map(c => `<th title="${esc(CT[c])}">${esc(CT[c]).split(' ')[0]}<br><small>${esc(CT[c]).split(' ').slice(1).join(' ')}</small></th>`).join('')}
        ${ms.map(m => `<th>T${m}</th>`).join('')}<th class="lk">TỔNG</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }).join('');
  return `<section class="card vtcard"><header class="hd">
      <div><h3>${ic('user', 15)} XẾP HẠNG TRƯỞNG NHÓM / QUẢN LÝ DỊCH VỤ</h3>
      <span class="sub">6 tiêu chí · xếp hạng riêng từng vùng · cột T là tổng điểm tháng đó</span></div></header>
    <div class="body">${secs}</div></section>`;
}

function vtGhiChu() {
  const c = VT.meta.critNV;
  return `<section class="card vtcard"><header class="hd"><div><h3>${ic('info', 15)} CÁCH TÍNH</h3></div></header>
    <div class="body"><div class="vtnote">
      <p><b>Nhân viên bảo hành tại nhà</b> — 3 tiêu chí, mỗi tiêu chí 2đ/tháng:
        ${Object.values(c).map(x => esc(x)).join(' · ')}. Đủ <b>6/6 điểm</b> trong tháng và nằm trong
        quota 30% của kho thì tháng đó đạt Vượt Trội.</p>
      <p><b>Trưởng nhóm / QLDV</b> — 6 tiêu chí: ${Object.values(VT.meta.critTN).map(x => esc(x)).join(' · ')}.
        Phục vụ 5 Sao 4đ, các tiêu chí còn lại 2đ; Sửa chữa khách lẻ tính 4đ từ Tháng 7.</p>
      <p><b>Nhân viên bảo hành tại kho</b> — không xét 3 tiêu chí, xét <b>TOP 30% thu nhập cao nhất kho</b>.</p>
      <p>Điều kiện chung: tối thiểu <b>5 tháng có dữ liệu</b>. Người đã đạt Vượt Trội kỳ 6 tháng đầu năm
        được <b>giữ nguyên danh hiệu</b> (đánh dấu “bảo lưu 6T”).</p>
    </div></div></section>`;
}

/* ── sự kiện: mở/đóng danh sách + 2 nút xuất ────────────────────────────── */
document.addEventListener('click', e => {
  const r = e.target.closest('[data-vtkho]');
  if (r && ST.tab === 9) { const k = r.dataset.vtkho; VT_OPEN[k] = !VT_OPEN[k]; render(); return; }
  if (e.target.closest('#vtXuatDS')) { vtXuatDanhSach(); return; }
  if (e.target.closest('#vtXuatData')) { vtXuatData(); return; }
});

/* ── 2 nút xuất: tải file đã dựng sẵn trong repo ────────────────────────────
   Cố ý KHÔNG dựng Excel bằng JS trong trình duyệt: file dựng sẵn bởi pipeline
   nên luôn TRÙNG KHÍT với file anh Thu đã duyệt, không lệch định dạng.        */
function vtTaiFile(url, ten, nut) {
  const b = document.getElementById(nut); const cu = b ? b.innerHTML : '';
  if (b) { b.disabled = true; b.innerHTML = 'Đang tải…'; }
  fetch(url + '?v=' + Date.now())
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then(bl => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(bl); a.download = ten;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    })
    .catch(err => alert('Không tải được file: ' + err.message +
      '\nKiểm tra file "' + url + '" đã có trong thư mục web chưa.'))
    .finally(() => { if (b) { b.disabled = false; b.innerHTML = cu; } });
}
const vtXuatDanhSach = () => vtTaiFile('VUOT-TROI-2026.xlsx',
  `VUOT_TROI_2026__${(VT.meta.thang || []).length}_THANG_DAU_NAM_BHSC.xlsx`, 'vtXuatDS');
const vtXuatData = () => vtTaiFile('DATA-NGUON-VUOT-TROI.xlsx',
  'VTB - DH DATA 2026 (ban luu tu web).xlsx', 'vtXuatData');

