# Bộ nguồn dashboard BHSC CE — VTB + VDH

Bản dựng lại ngày **16/09/2026** sau khi môi trường máy chủ bị thu hồi.
Toàn bộ mã ứng dụng được **tách ngược từ chính `index.html` đang chạy**, đã đối chiếu
khớp tuyệt đối từng ký tự ở bước ghép (`assemble`).

## Luồng

```
parts/*.js ──assemble.js──> app.template.html ──build.js──> github/index.html
                                   ▲                              + github/data.json
                        lib/xlsx.js, lib/pptxgen.js               + github/vuottroi.json
                        db.json, vuottroi.json
```

`app.template.html` chừa đúng 4 chỗ giữ chỗ: `__LIB_XLSX__` `__LIB_PPTX__`
`__VT_EMBED__` `__DB__`. `build.js` thay 4 chỗ này rồi xuất ra `github/`.

## Các file trong parts/

| File | Nội dung |
|---|---|
| `01-head.html` | `<head>`, toàn bộ CSS, khung HTML |
| `02-logo.js` | logo nhúng base64 |
| `03-deck-assets.js` | ảnh nền cho slide PPT (base64) |
| `04-data-head.js` | chú thích kiến trúc 3 lớp · **ngay sau file này là chỗ chèn DB** |
| `05-data-tail.js` | CONFIG, nhãn, hằng số nhóm doanh thu (`DT_NGOAI_MOI`…) |
| `06-calc.js` | **LỚP 2 · CALC** — mọi công thức: lũy kế, %HT, ĐẠT/KHÔNG ĐẠT |
| `07-present.js` | LỚP 3 · PRESENT — hàm render dùng chung |
| `08-mod1.js` | Module 1 — SHEET TỔNG QUAN |
| `09-charts.js` | biểu đồ các sheet |
| `10-ppt.js` | Module 8 — TRÌNH CHIẾU / xuất PowerPoint |
| `11-xlsx-out.js` | xuất Excel kho dữ liệu **và** nhập ngược (`xoDocV2`) |
| `12-vuottroi.js` | Tab 10 — VƯỢT TRỘI (module độc lập, đừng đụng khi cập nhật số) |
| `13-app.js` | điều phối: bộ lọc, chuyển tab, nút bấm |
| `99-tail.html` | đóng thẻ |
| `_manifest.json` | thứ tự ghép + ký tự phân cách (giữ để khớp từng byte) |

## Cập nhật dữ liệu định kỳ

```bash
cd /home/claude/bc
node src/tools/nap_kho.js mau_nhap/<file-nguồn>.xlsx    # Excel 9 sheet -> src/db.json
node src/tools/luy_ke.js  src/db.json 2026-09 14        # đổi mốc lũy kế (tuỳ chọn)
node src/build.js                                       # -> github/
node src/tools/kiemtra.js && node src/tools/roundtrip.js
```

Rồi đẩy `github/index.html` + `github/data.json` lên nhánh `main` của repo này.
**Chỉ 2 file đó** — không đụng `vuottroi.json`, `VUOT-TROI-2026.xlsx`,
`DATA-NGUON-VUOT-TROI.xlsx`.

## Quy ước số liệu (đã chốt với anh Thu — KHÔNG tự ý đổi)

1. Target luôn là **cả tháng**; chỉ sản lượng/doanh thu thực đạt mới quy đổi lũy kế.
2. Cột "ĐÚNG HẸN" trong file nguồn là **tỷ lệ TRỄ** → phải đảo (đúng hẹn = 1 − trễ).
3. Tiền trong file nguồn là **ĐỒNG** dù header ghi "triệu đồng".
4. Nhóm SỬA CHỮA KHÁCH LẺ có 2 target: CÔNG TY và VƯỢT TRỘI — Target Vượt Trội
   **chỉ** lên web + Excel, **không** lên slide PPT.
5. Ô ghi "Chưa đo" khác hẳn ô trống (`chuaDo:true` ≠ `null`).
6. Chỉ 2 mức trạng thái: **ĐẠT / KHÔNG ĐẠT**.
7. "Bán gói năm 2025" (`dt.goi`) **không** quy đổi lũy kế — đã hoàn tất 100%.
8. **Đơn giá** và **chi phí** cũng **không** quy đổi lũy kế (chi phí so thẳng định mức cả tháng).

## Còn thiếu so với bản gốc

`import_data.py` (đọc thẳng Google Sheet nguồn) đã mất và **không** tách ngược được
vì nó chưa bao giờ nằm trong `index.html`. Thay thế bằng `tools/nap_kho.js` — đi qua
đúng luồng nhập của web nên áp đủ quy tắc nghiệp vụ. Hai điểm `nap_kho.js` chưa đọc,
cần vá tay khi nguồn đổi: **kế hoạch 2027** và **sản lượng target của 5 nhóm
BÊN NGOÀI mới** (sheet 3 của file nguồn không có cột cho các nhóm này).
