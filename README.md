# Dashboard KẾT QUẢ VẬN HÀNH BHSC CE — Vùng Trung Bộ & Duyên Hải

Trang đang chạy: **https://thunguyenduy1990-debug.github.io/bhsc-ce-vtb-vdh-dashboard/**

| File | Vai trò |
|---|---|
| `index.html` | trang dashboard (tự chứa: mã + dữ liệu + thư viện) |
| `data.json` | kho dữ liệu (24 kỳ: T1–T12/2026 + kế hoạch 2027) |
| `vuottroi.json` | dữ liệu tab 10 — VƯỢT TRỘI |
| `VUOT-TROI-2026.xlsx`, `DATA-NGUON-VUOT-TROI.xlsx` | nguồn của tab 10 |
| **`src.zip`** | **mã nguồn + bộ công cụ dựng lại trang** |

## src.zip

Giải nén ra `src/` rồi đọc `src/README.md`. Tóm tắt:

```bash
node src/assemble.js                # parts/*.js  -> app.template.html
node src/build.js                   # template + dữ liệu -> github/index.html + data.json
node src/tools/kiemtra.js           # quét mọi tab × kỳ
node src/tools/roundtrip.js         # xuất Excel -> nhập lại -> số phải không đổi
```

Cập nhật số định kỳ: `node src/tools/nap_kho.js <file-nguồn>.xlsx` rồi `node src/build.js`.

> Lưu trữ ở đây để không mất mã nguồn khi môi trường làm việc bị thu hồi
> (đã xảy ra ngày 16/09/2026 — bộ nguồn được tách ngược lại từ chính `index.html`).
