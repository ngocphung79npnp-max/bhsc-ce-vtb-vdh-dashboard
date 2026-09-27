
/* =============================================================================
   CEO PERFORMANCE DASHBOARD — BHSC CE · VTB + VDH
   Kiến trúc 3 lớp (theo yêu cầu):
     LỚP 1 — DATA      : DB (kho dữ liệu thô, không sửa) + CONFIG (người dùng chỉnh)
     LỚP 2 — CALC      : hàm thuần DATA + CONFIG -> {target, actual, rate, status}
                          KHÔNG chạm DOM ở lớp này.
     LỚP 3 — PRESENT   : hàm render chỉ tiêu thụ kết quả của LỚP 2.
   Đổi dữ liệu => dashboard tự cập nhật, không phải sửa code.
   ============================================================================= */

/* ============================ LỚP 1 · DATA ============================ */
