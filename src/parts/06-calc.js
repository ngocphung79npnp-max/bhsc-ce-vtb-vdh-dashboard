
/* =============================================================================
   LỚP 2 · CALCULATION — hàm THUẦN. Không đụng DOM. Vào: DB + CONFIG + scope.
   Ra: object KPI chuẩn {name, target, actual, rate, status, ...}
   ============================================================================= */

/* ---------------- state (scope hiện hành) ---------------- */
let ST = {
  nam:2026, thang:8, months:[8], ky:"Tháng", vung:"TONG", kho:"ALL", loai:"ALL",
  tab:0, sort:"default",
  drill:{level:"vung", vung:null, kho:null},
  page:{}, evalEdit:{}, slide:0,
  qa:{history:[]}                 /* lịch sử hỏi-đáp trong phiên làm việc — không lưu vào kho dữ liệu */
};

const kyKey    = (n,t)=>`${n}-${String(t).padStart(2,"0")}`;
const M        = (S=ST)=>DB.ky[kyKey(S.nam,S.thang)]||null;
const monthsOf = (n)=>Object.keys(DB.ky).filter(k=>+k.split("-")[0]===n).map(k=>+k.split("-")[1]).sort((a,b)=>a-b);
const yearsOf  = ()=>{const y=[...new Set(Object.keys(DB.ky).map(k=>+k.split("-")[0]))].sort();return y.length?y:[2026]};
/* ---- CHỌN NHIỀU THÁNG ------------------------------------------------------
   ST.months = danh sách tháng đang chọn. 1 tháng  -> chế độ ĐƠN (như cũ).
   ≥2 tháng hoặc ky="Năm" -> chế độ GỘP: dùng ĐÚNG cách gộp của chế độ "Cả năm"
   (chất lượng & đơn giá = BÌNH QUÂN GIA QUYỀN theo sản lượng thực đạt;
    sản lượng / chi phí / doanh thu = CỘNG DỒN; target cộng dồn, T8 giữ pro-rate).
   Tháng không có thực đạt (T9-T12) chỉ góp TARGET, không kéo trung bình về 0. */
function selMonths(S=ST){
  if(S.ky==="Năm") return monthsOf(S.nam);
  const raw=(S.months&&S.months.length)?S.months:[S.thang];
  const ms=[...new Set(raw.map(Number))].filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);
  const has=ms.filter(m=>DB.ky[kyKey(S.nam,m)]);
  return has.length?has:ms;
}
const nSel     = (S=ST)=>selMonths(S).length;
/* --- KỲ BÁM KẾ HOẠCH ---------------------------------------------------------
   Chọn gộp T8-12 thì T9-T12 mới có TARGET, chưa có thực đạt. Khi đó target là
   tổng cả kỳ nhưng thực đạt chỉ là phần các tháng đã chạy -> KHÔNG chấm
   ĐẠT/KHÔNG ĐẠT (sẽ luôn đỏ oan), chỉ nêu rõ đang đi được bao nhiêu.           */
function thangChuaCoSo(nam,ms){
  return (ms||[]).filter(m=>{
    const D=DB.ky[kyKey(nam,m)];
    if(!D) return true;
    if(!D.tinh) return false;
    return !Object.keys(D.tinh).some(c=>{const r=D.tinh[c]; return r&&r.sl&&NB(r.sl.act)!=null});
  });
}
const kyThieu  = (S=ST)=>thangChuaCoSo(S.nam,selMonths(S));
const kyKeHoach= (S=ST)=>isYear(S) && kyThieu(S).length>0 && kyThieu(S).length<nSel(S);
/* isYear giữ NGUYÊN TÊN (mọi module đang gọi) nhưng nay nghĩa là "chế độ GỘP nhiều tháng" */
const isYear   = (S=ST)=>S.ky==="Năm" || nSel(S)>1;
const isMulti  = (S=ST)=>S.ky!=="Năm" && nSel(S)>1;
const perKey   = (S=ST)=>(S.ky==="Tháng"||S.ky==="Năm")?"Tháng 7":S.ky;  // nhãn khối lũy kế tháng trong file nguồn
const wIdx     = (S=ST)=>(S.ky==="Tháng"||S.ky==="Năm")?null:(+S.ky.slice(-1)-1);
/* hệ số "suy ra cả tháng" = nghịch đảo tỷ lệ lũy kế; nhóm KHÔNG quy đổi -> luôn = 1 */
const hs       = (D,nhom,subKey)=>1/prRatio(D,nhom,subKey);
/* ---- KỲ LŨY KẾ (tháng chưa hết): T8/2026 = 15/31 ngày -------------------------
   Quy tắc khách đã chốt: đánh giá CÔNG BẰNG bằng cách so thực đạt với
   target × (ngày đã qua / ngày trong tháng), đồng thời NÊU RÕ "dự kiến cả tháng"
   = thực đạt × (ngày trong tháng / ngày đã qua).
   ÁP DỤNG cho nhóm nào là do LỚP DATA quyết định (PRORATE_NHOM):
     sản lượng + doanh thu  -> CÓ quy đổi (số nguồn là lũy kế 15 ngày)
     chi phí                -> KHÔNG (số khách gửi đã là lũy kế cuối tháng)
     chất lượng + đơn giá   -> KHÔNG (số bình quân)
   Mọi hàm dưới nhận thêm tham số `nhom`; bỏ trống = nhóm CÓ quy đổi.
   --------------------------------------------------------------------------
   MỐC LŨY KẾ RIÊNG THEO NHÓM DOANH THU (từ 28/08/2026): "1 Đổi 1" / "Bảo hành
   mở rộng" / "Sửa chữa dịch vụ (SCDV)" đã có số thực đạt mới tới ngày 27/08,
   trong khi các nhóm doanh thu/sản lượng khác vẫn giữ lũy kế 22/08 cũ. LỚP DATA
   ghi mốc riêng vào D.ngayDaQuaNhom = {doi1:27, bhmr:27, sckl:27} (xem
   import_data.py, LUY_KE_NHOM); `subKey` dưới đây là field nội bộ tương ứng
   (DT_TFIELD[cat]) — có mốc riêng thì dùng, không thì rơi về D.ngayDaQua chung. */
const prRatio = (D,nhom,subKey)=>{ if(!D || !prorateOn(nhom)) return 1;
  const dqua = (subKey && D.ngayDaQuaNhom && D.ngayDaQuaNhom[subKey]!=null) ? D.ngayDaQuaNhom[subKey] : D.ngayDaQua;
  const n=D.ngayTrongThang||31, q=dqua||n;
  return (q>0 && q<n) ? q/n : 1; };
/* kỳ có phải kỳ lũy kế không — theo nghĩa CHUNG của tháng (dùng cho nhãn/banner) */
const isLuyKe = (D)=>prRatio(D)<1;
/* meta chuẩn cho 1 KPI đã quy đổi theo kỳ lũy kế */
function prMeta(D,targetFull,actual,nhom,subKey){
  const r=prRatio(D,nhom,subKey); if(r>=1) return null;
  const tf=NB(targetFull);
  const dqua = (subKey && D.ngayDaQuaNhom && D.ngayDaQuaNhom[subKey]!=null) ? D.ngayDaQuaNhom[subKey] : D.ngayDaQua;
  return {prorate:r, ngayDaQua:dqua, ngayTrongThang:D.ngayTrongThang,
          targetFull:tf, targetQuyDoi: tf==null?null:tf*r,
          duKien: NB(actual)==null?null:actual/r};
}
/* áp quy đổi lũy kế lên 1 cặp (target, actual) -> {target, actual, meta}
   QUY TẮC HIỆN HÀNH: cột TARGET LUÔN là số CẢ THÁNG (không nhân ×15/31 nữa).
   Việc đánh giá công bằng chuyển sang lớp tỷ lệ: mkKpi lấy DỰ KIẾN CẢ THÁNG chia
   target cả tháng (bằng đúng con số cũ) để chấm ĐẠT/KHÔNG ĐẠT, đồng thời giữ thêm
   rateNow = thực đạt hiện tại / target cả tháng để hiển thị tiến độ thật.
   Số target quy đổi theo ngày vẫn được giữ ở meta.targetQuyDoi cho tooltip.     */
function prApply(D,target,actual,meta,nhom,subKey){
  const r=prRatio(D,nhom,subKey), pm=prMeta(D,target,actual,nhom,subKey);
  return {target: NB(target),
          actual: NB(actual),
          meta: pm ? Object.assign({},meta||{},pm) : (meta||null)};
}
const vsel     = (S=ST)=>S.vung==="TONG"?VUNGS.slice():[S.vung];
const vlabel   = (S=ST)=>S.vung==="TONG"?"Tổng 2 vùng":S.vung;
/* nhãn gọn cho nhóm tháng: 7,8 -> "T7 + T8" · 8..12 -> "T8 → T12" */
function monthsLabel(ms){
  if(!ms.length) return "–";
  if(ms.length===1) return "T"+ms[0];
  const lien = ms.every((m,i)=>i===0||m===ms[i-1]+1);
  if(lien && ms.length>=3) return `T${ms[0]} → T${ms[ms.length-1]}`;
  return ms.map(m=>"T"+m).join(" + ");
}
const kyLabel  = (S=ST)=>{ if(S.ky==="Năm") return `Cả năm ${S.nam}`;
  if(isMulti(S)){ const ms=selMonths(S);
    return `${monthsLabel(ms)}/${S.nam} · gộp ${ms.length} tháng`; }
  if(S.ky!=="Tháng") return `${S.ky} ${S.thang}/${S.nam}`;
  const D=DB.ky[kyKey(S.nam,S.thang)];
  return (D&&isLuyKe(D)) ? `Lũy kế tháng ${S.thang}/${S.nam}` : `Tháng ${S.thang}/${S.nam}`; };
const scopeLbl = (S=ST)=>S.kho!=="ALL" ? `${tinhOf(S.kho)} (${S.kho})` : vlabel(S);

/* đơn vị nào nằm trong phạm vi lọc hiện tại */
function khoIn(k,S=ST){
  const c=KHO(k);
  if(!KHOMAP[c]) return false;
  if(S.kho!=="ALL") return c===S.kho;
  if(S.vung!=="TONG") return KHOMAP[c].vung===S.vung;
  return true;
}
const showNha = (S=ST)=>S.loai!=="KHO";
const showKho = (S=ST)=>S.loai!=="NHA";
/* 12 tỉnh BH tại nhà trong phạm vi (theo bộ lọc) */
const unitsNha = (S=ST)=>KHO_ORDER.filter(k=>khoIn(k,S));
/* 2 kho BH tại kho trong phạm vi */
const unitsKho = (S=ST)=>KHOKHO.filter(k=>khoIn(k,S));

/* chạy fn cho từng THÁNG ĐANG CHỌN — dùng cho chế độ GỘP ("Cả năm" hoặc nhiều tháng) */
function eachMonth(S,fn){
  const ms=selMonths(S), out=[];
  for(const m of ms){
    const Dm=DB.ky[kyKey(S.nam,m)]; if(!Dm) continue;
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    out.push(fn(Dm,S2,m));
  }
  return out;
}

/* ---------------- KPI factory ---------------- */
/* dir: "up"  = càng cao càng tốt (mặc định)
        "down"= càng thấp càng tốt (CHI PHÍ) -> ĐẠT khi thực đạt <= target      */
/* CHỈ CÒN 2 MỨC: ĐẠT hoặc KHÔNG ĐẠT. Không còn mức trung gian "có nguy cơ" —
   dưới target là KHÔNG ĐẠT, tô đỏ nổi bật, kể cả chi phí vượt định mức.        */
function statusOf(rate,dir){
  if(rate==null) return "none";
  const N=CONFIG.nguong;
  if(dir==="down") return rate<=N.cpDatDen ? "good" : "bad";
  return rate>=N.datTu ? "good" : "bad";
}
const STATUS_TEXT={good:"ĐẠT",warn:"KHÔNG ĐẠT",bad:"KHÔNG ĐẠT",none:"CHƯA CÓ DỮ LIỆU"};
const STATUS_TEXT_CP={good:"ĐẠT (trong định mức)",warn:"VƯỢT ĐỊNH MỨC",bad:"VƯỢT ĐỊNH MỨC",none:"CHƯA CÓ DỮ LIỆU"};

/* Ba trạng thái "không có số" hoàn toàn khác nhau — không được gộp làm một:
   naLabel = "không áp dụng" | "chưa cấu hình" | "chưa có dữ liệu"                      */
function mkKpi(o){
  const target = NB(o.target), actual = NB(o.actual);
  const dir    = o.dir || "up";
  /* TARGET là số CẢ THÁNG. Với kỳ lũy kế (meta.duKien có giá trị) thì:
       rate    = dự kiến cả tháng / target cả tháng  -> dùng chấm ĐẠT/KHÔNG ĐẠT (số LỚN)
       rateNow = thực đạt hiện tại / target cả tháng -> tiến độ thật (số nhỏ)
     Kỳ đã trọn tháng thì 2 tỷ lệ bằng nhau và chỉ hiện 1 số.                    */
  const dkRaw  = o.meta && NB(o.meta.duKien)!=null ? o.meta.duKien : null;
  let rate     = NB(o.rate);
  const canR   = target!=null && target!==0;
  if(rate==null && canR && (dkRaw!=null||actual!=null)) rate = (dkRaw!=null?dkRaw:actual)/target;
  const rateNow= (canR && actual!=null) ? actual/target : null;
  const noData = actual==null;
  const noCfg  = target==null;
  /* ĐƠN GIÁ TRUNG BÌNH (mọi cấp: gộp/nhà/kho/từng đơn vị đều dùng key "dongia"):
     khách chốt 19/08/2026 — target đã CỐ ĐỊNH, không phải chỉ tiêu đuổi theo %
     như Sản lượng/Doanh thu -> có đủ target+thực đạt là LUÔN chấm ĐẠT, không so
     ngưỡng % (CONFIG.donGia.luonDat, mặc định true). Chỉ đổi NHÃN đánh giá —
     rate/target/actual vẫn là số thật, không chỉnh sửa số liệu gốc nào khác. */
  const luonDatDonGia = o.key==="dongia" && CONFIG.donGia && CONFIG.donGia.luonDat!==false;
  const status = (noData||noCfg) ? "none" : (luonDatDonGia ? "good" : statusOf(rate,dir));
  /* "chưa đo" KHÁC "chưa có dữ liệu": nguồn ghi rõ là chưa đo được tiêu chí này,
     không phải bỏ trống. Hiển thị đúng chữ nguồn dùng.                          */
  const chuaDo = !!o.chuaDo && (noData||noCfg);
  const naLabel = o.naLabel ? o.naLabel
                : chuaDo ? "chưa đo"
                : (noData && noCfg) ? (o.cfgKey?"chưa cấu hình":"chưa có dữ liệu")
                : noData ? "chưa có dữ liệu"
                : noCfg  ? "chưa cấu hình" : "";
  const stText = chuaDo ? "CHƯA ĐO"
               : o.naLabel && (noData||noCfg) ? "KHÔNG ÁP DỤNG"
               : (noCfg && !noData) ? "CHƯA CẤU HÌNH TARGET"
               : (dir==="down"?STATUS_TEXT_CP:STATUS_TEXT)[status];
  return {
    naLabel, chuaDo, ed:o.ed||null,            // ô sửa tay (nếu KPI này lấy từ 1 đơn vị/1 tháng)
    key:o.key||"", name:o.name||"", icon:o.icon||null,
    target, actual, rate, rateNow, dir, status,
    /* true khi kỳ chưa trọn tháng -> lớp trình bày mới hiện thêm tỷ lệ nhỏ */
    coTienDo: dkRaw!=null && rateNow!=null && Math.abs(rateNow-rate)>1e-9,
    dat: status==="good",
    fmt: o.fmt||(v=>v==null?"–":String(v)),
    unit: o.unit||"", meta:o.meta||null, desc:o.desc||"",
    noData, noCfg,
    cfgKey: o.cfgKey||null,            // -> mở đúng mục trong bảng Cấu hình
    reason: o.naLabel ? (o.dataReason||"Chỉ tiêu này không áp dụng cho nhóm đang xem")
          : noCfg ? (o.cfgReason||"Chưa cấu hình target")
          : (noData ? (o.dataReason||"Chưa có dữ liệu nguồn") : ""),
    statusText: stText,
    tmp: !!o.tmp                       // giá trị tạm thời do client cung cấp
  };
}
const kpiOK = k=>k && !k.noData && !k.noCfg;

/* =============================================================================
   A. CHẤT LƯỢNG — định nghĩa KPI theo ĐÚNG thứ tự & tên của file mẫu
   ============================================================================= */
const CL_NHA=[
 {key:"dungHen", name:"ĐÚNG HẸN",             field:"dungHen", fmt:pc1, icon:"clock",
  desc:"Tỷ lệ đơn giao đúng hẹn (KSNB)"},
 {key:"sao",     name:"PHỤC VỤ 5 SAO",        field:"sao",     fmt:v=>fx(v,2), unit:"điểm/5", icon:"star",
  desc:"Điểm sao phục vụ khách hàng chấm cho thợ"},
 {key:"tayNghe", name:"TAY NGHỀ CHUẨN",       field:"tayNghe", fmt:pc1, icon:"badgecheck",
  desc:"Tỷ lệ đơn không phát sinh lỗi tay nghề"},
 {key:"xldd",    name:"TAY NGHỀ XỬ LÝ 1 LẦN", field:"xldd",    fmt:pc1, icon:"target", hardKpi:1,
  desc:"Tỷ lệ xử lý dứt điểm ngay lần đầu (target chốt cứng 100%)"},
 {key:"s5",      name:"THỢ CHUẨN 5S",         field:"s5",      fmt:v=>fx(v,2), unit:"điểm/10", icon:"sparkles",
  desc:"Điểm 5S của thợ"}
];
/* 5 tiêu chí tại kho: 3 tiêu chí gốc của biểu mẫu + 2 tiêu chí bổ sung theo biểu
   mẫu cập nhật (NCC + HÀNG HỦY — HÀNG HỦY là KPI đảo chiều).                   */
const CL_KHO=[
 {key:"hailong", name:"PHỤC VỤ 5 SAO",               code:"hailong", tfield:"sao", fmt:v=>fx(v,2), unit:"điểm/5", icon:"star",
  desc:"Điểm hài lòng khách hàng tại kho"},
 {key:"14ngay",  name:"THỜI GIAN XỬ LÝ 14N (Tại Kho)",code:"14ngay", tfield:"n14", fmt:pc1, icon:"clock",
  desc:"Tỷ lệ máy xử lý xong trong 14 ngày"},
 {key:"laplai",  name:"QUAY LẠI 30N (Tại Kho)",       code:"laplai", tfield:"n30", fmt:pc1, icon:"refresh",
  desc:"Tỷ lệ máy KHÔNG quay lại trong 30 ngày"},
 {key:"ncc",     name:"XỬ LÝ HÀNG TẠI KHO: TRẢ NCC + CHUYỂN ĐSD", code:"ncc", tfield:"ncc", fmt:pc1, icon:"pkg",
  desc:"Tỷ lệ hàng tại kho được xử lý: trả nhà cung cấp + chuyển điểm sử dụng (tiêu chí bổ sung theo biểu mẫu cập nhật)"},
 {key:"huy",     name:"HÀNG HỦY",                     code:"huy",   tfield:"huy", fmt:pc1, icon:"trash", dir:"down",
  desc:"Tỷ lệ hàng hủy tại kho — KPI ĐẢO CHIỀU: thấp hơn định mức = ĐẠT (tiêu chí bổ sung theo biểu mẫu cập nhật)"}
];
/* CHẤT LƯỢNG GÓI BẢO HÀNH (sheet 7 nguồn) — tỷ lệ xử lý ĐÚNG HẠN CAM KẾT.
   Phạm vi: 12 TỈNH bảo hành tại nhà. 2 kho (Đà Nẵng, Khánh Hòa) => KHÔNG ÁP DỤNG.
   Thực đạt hiện chỉ có T6, T7, T8; các tháng khác => "chưa có dữ liệu" (không phải 0). */
const CL_GOI=[
 {key:"goiDoi1", name:"1 ĐỔI 1 (ĐÚNG HẠN CAM KẾT)", tfield:"doi1", fmt:pc1, icon:"refresh",
  desc:"Tỷ lệ hồ sơ gói 1 đổi 1 xử lý ĐÚNG HẠN CAM KẾT 14 ngày"},
 {key:"goiBhmr", name:"BẢO HÀNH MỞ RỘNG (ĐÚNG HẠN CAM KẾT)", tfield:"bhmr", fmt:pc1, icon:"shield",
  desc:"Tỷ lệ hồ sơ gói bảo hành mở rộng xử lý ĐÚNG HẠN CAM KẾT 6 ngày"}
];
const GOI_NA_REASON="Gói bảo hành (1 đổi 1 / BHMR) chỉ phát sinh ở bảo hành TẠI NHÀ — 2 kho bảo hành tại kho không có nghiệp vụ này.";
/* tiêu chí tính bằng % lưu dưới dạng phân số -> gõ "98,5" phải thành 0,985 (sc=.01);
   tiêu chí tính bằng ĐIỂM (sao /5, 5S /10) lưu nguyên giá trị -> sc=1 */
const clScale = tc=>(tc.fmt===pc1||tc.fmt===pc)?0.01:1;

/* =============================================================================
   A0. LỚP TRUY CẬP DB.ky[kỳ].tinh — dữ liệu chuẩn hoá THEO TỈNH/KHO từng tháng
   (nguồn: file dữ liệu DATA_UP_WEB_v2.xlsx, T1-T12/2026).
   Cấu trúc: tinh[code] = {
     cl:   {dungHen|sao|tayNghe|xldd|s5 : {kpi,act}},              // tại nhà, 5 tiêu chí
     clGoi:{doi1|bhmr : {kpi,act}},                                // CHẤT LƯỢNG GÓI BẢO HÀNH (chỉ tỉnh)
     sl:   {target,act, cats:{trong|goi|doi1|bhmr|sckl:{target,act}}, tongTatCa:{target,act}},
     dgia: {target,act, cats:{trong|doi1|bhmr|sckl:{target,act}}},
     cp:   {target,act},
     dt:   {trong|goi|doi1|bhmr|sckl : {target,act,slNguon,dgiaNguon[,actDH,goiGop]}},
     kho:  { clKho:{sao|n14|n30|ncc|huy:{kpi,act}}, goiNA:true, sl, dgia, cp, dt } }  (kho: chỉ DNA & KHH)
   Tỷ lệ % là phân số; TIỀN (doanh thu/chi phí) = ĐỒNG (đổi sang TRIỆU bằng TRI() khi đọc);
   đơn giá = đồng/đơn; sl.target/act là nhóm BÊN TRONG (headline).
   ĐÚNG HẸN đã quy đổi sẵn về "tỷ lệ đúng hẹn". Tháng nào có .tinh thì .tinh là
   nguồn số 1; dữ liệu cũ (vùng/tuần) chỉ dùng bù cho phần .tinh không có.
   QUY TẮC GỘP (tài liệu hoá): tiền/sản lượng = CỘNG; tỷ lệ chất lượng + đơn giá
   = BÌNH QUÂN GIA QUYỀN theo SẢN LƯỢNG THỰC ĐẠT của từng đơn vị.               */
/* tRec = CỬA DUY NHẤT đọc bản ghi tỉnh/kho. Mọi SỬA TAY của người dùng được áp
   NGAY TẠI ĐÂY, nên toàn bộ lớp CALC (và do đó mọi module) tự tính lại đúng —
   không có chỗ nào ghi thẳng số hiển thị. Bản gốc trong DB.ky KHÔNG bị đụng tới. */
const _tCache=new Map();
function tRec(D,code,loai){
  const t=D&&D.tinh; if(!t||!t[code]) return null;
  const base = loai==="kho" ? (t[code].kho||null) : t[code];
  if(!base) return null;
  const mk=kyKey(D.nam,D.thang), pre=edKey(mk,code,loai,"");
  const ks=Object.keys(DB.edits).filter(k=>k.indexOf(pre)===0);
  if(!ks.length) return base;
  const ck=pre+"#"+EDV;
  if(_tCache.has(ck)) return _tCache.get(ck);
  if(_tCache.size>600) _tCache.clear();
  const cp=JSON.parse(JSON.stringify(base));
  for(const k of ks){ const e=DB.edits[k]; if(e&&NB(e.v)!=null) setPath(cp,k.slice(pre.length),e.v); }
  _tCache.set(ck,cp);
  return cp;
}
/* mô tả 1 Ô SỬA ĐƯỢC gắn vào KPI (lớp trình bày dựng ô nhập từ đây).
   sc = hệ số quy đổi HIỂN THỊ -> LƯU (tiền: triệu->đồng = 1e6; tỷ lệ: % -> phân số = .01)
   pr = phần đã quy đổi lũy kế của TARGET (T8 = 15/31) để gõ số hiển thị vẫn ra đúng số gốc */
function edSpec(D,S,code,loai,tp,ap,sc,pr){
  if(!useTinh(D,S)) return null;                 // chỉ sửa được ở chế độ 1 tháng có dữ liệu tỉnh
  const mk=kyKey(D.nam,D.thang);
  return {mk,code,loai:(loai==="kho"?"kho":"nha"),
          t:tp?edKey(mk,code,loai,tp):null, a:ap?edKey(mk,code,loai,ap):null,
          sc:sc||1, pr:pr||1};
}
/* nguồn mới không chia tuần -> chỉ dùng cho kỳ "Tháng" (Năm gộp qua eachMonth) */
const useTinh=(D,S)=>!!(D&&D.tinh&&S.ky==="Tháng");
const hasTinh=(S=ST)=>{ if(isYear(S)) return selMonths(S).some(m=>(DB.ky[kyKey(S.nam,m)]||{}).tinh);
  const D=M(S); return !!(D&&D.tinh); };
/* trọng số gộp = sản lượng thực đạt của đơn vị (fallback 1 để không chia 0) */
const tW=(D,code,loai)=>{const r=tRec(D,code,loai); const v=r&&r.sl&&NB(r.sl.act);
  return (v!=null&&v>0)?v:1;};
function blkCode(n){const s=String(n||"").toUpperCase();
  if(s.indexOf("HÀI LÒNG")>=0)return "hailong";
  if(s.indexOf("14 NGÀY")>=0)return "14ngay";
  if(s.indexOf("LẶP LẠI")>=0)return "laplai";
  if(s.indexOf("NCC")>=0)return "ncc";
  if(s.indexOf("HIỆU QUẢ CHI PHÍ")>=0)return "hqcp";
  if(s.indexOf("SỬA CHỮA DỊCH VỤ")>=0||s.indexOf("SCDV")>=0)return "scdv";
  return "";}

/* --- bản ghi chất lượng tại nhà thô cho 1 tỉnh (1 tháng) --- */
function clNhaRecKho(D,code,S){
  if(!D) return null;
  const key=Object.keys(D.clNhaKho||{}).find(x=>KHO(x)===code);
  if(!key) return null;
  return ((D.clNhaKho[key].ky)||{})[perKey(S)]||null;
}
function clNhaRecVung(D,vg,S){ return ((D.clNhaVung||{})[vg]||{})[perKey(S)]||null; }

/* Gộp KPI chất lượng qua các THÁNG của năm — bình quân gia quyền theo trọng số
   meta.w (sản lượng) của từng tháng; tháng nguồn cũ không có w -> w=1.           */
function clYearAgg(S,defs,calcMonth){
  const acc={};
  eachMonth(S,(Dm,S2)=>{ for(const k of calcMonth(S2)){
    const a=acc[k.key]=acc[k.key]||{sum:0,tsum:0,w:0,tw:0,n:0,nCD:0,nM:0};
    const w=(k.meta&&NB(k.meta.w))||1;
    a.nM++; if(k.chuaDo) a.nCD++;
    if(!k.noData){a.sum+=k.actual*w;a.w+=w;a.n++;}
    if(k.target!=null){a.tsum+=k.target*w;a.tw+=w;}
  }});
  return defs.map(tc=>{
    const a=acc[tc.key], hard=tc.hardKpi!=null?tc.hardKpi:null;
    const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,dir:tc.dir};
    /* cả kỳ đều chưa đo -> vẫn ghi "chưa đo"; lẫn lộn thì ghi chưa có dữ liệu */
    const allCD = a && a.nM>0 && a.nCD===a.nM;
    if(!a||!a.n) return mkKpi(Object.assign({},base,{target:hard,actual:null, chuaDo:allCD,
      dataReason:allCD?"Nguồn ghi “Chưa đo” cho tiêu chí này ở mọi tháng trong kỳ"
                      :"Chưa có dữ liệu tháng nào trong kỳ"}));
    return mkKpi(Object.assign({},base,{
      target: hard!=null?hard:(a.tw?a.tsum/a.tw:null),
      actual: a.w?a.sum/a.w:null,
      meta:{note:`Bình quân gia quyền theo sản lượng · ${a.n} tháng có dữ liệu`}}));
  });
}

/* 5 KPI chất lượng TẠI NHÀ cho phạm vi hiện tại (gộp có trọng số theo sản lượng) */
function calcClNha(S=ST){
  if(isYear(S)) return clYearAgg(S,CL_NHA,S2=>calcClNha(S2));
  const D=M(S);
  /* ƯU TIÊN dữ liệu .tinh: gộp 12 tỉnh trong phạm vi, trọng số = sản lượng thực đạt */
  if(useTinh(D,S)){
    return CL_NHA.map(tc=>{
      const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc};
      let sa=0,wa=0,st=0,wt=0,don=0,nCD=0,nU=0;
      for(const code of unitsNha(S)){
        const r=tRec(D,code,"nha"), x=r&&r.cl&&r.cl[tc.key]; if(!x) continue;
        nU++; if(x.chuaDo) nCD++;
        const w=tW(D,code,"nha");
        if(NB(x.act)!=null){sa+=x.act*w;wa+=w;don+=w;}
        if(NB(x.kpi)!=null){st+=x.kpi*w;wt+=w;}
      }
      const target = wt?st/wt:(tc.hardKpi!=null?tc.hardKpi:null);
      const allCD = nU>0 && nCD===nU;
      if(!wa) return mkKpi(Object.assign({},base,{target,actual:null, chuaDo:allCD,
        dataReason:allCD?"Nguồn ghi “Chưa đo” cho tiêu chí này ở mọi tỉnh trong phạm vi"
                        :"Nguồn để trống tiêu chí này ở kỳ này"}));
      return mkKpi(Object.assign({},base,{target,actual:sa/wa,
        meta:{don:Math.round(don),w:wa,gop:"BQ gia quyền theo sản lượng"}}));
    });
  }
  return CL_NHA.map(tc=>{
    const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc};
    if(!D) return mkKpi(Object.assign({},base,{target:tc.hardKpi??null,actual:null,dataReason:"Kỳ này chưa có dữ liệu"}));
    const parts=[];
    if(S.kho!=="ALL"){
      const r=clNhaRecKho(D,S.kho,S); const x=r&&r[tc.field];
      if(x) parts.push({v:tinhOf(S.kho), val:x.tyle, kpi:x.kpi,
        w: tc.key==="sao"||tc.key==="s5" ? ((r.tayNghe&&r.tayNghe.don)||0) : (x.don||0),
        don: tc.key==="sao" ? ((r.tayNghe&&r.tayNghe.don)||0) : (x.don||0), loi:x.loi});
    }else{
      for(const vg of vsel(S)){
        const r=clNhaRecVung(D,vg,S); const x=r&&r[tc.field];
        if(!x) continue;
        parts.push({v:vg, val:x.tyle, kpi:x.kpi,
          w: tc.key==="sao"||tc.key==="s5" ? ((r.tayNghe&&r.tayNghe.don)||0) : (x.don||0),
          don: tc.key==="sao" ? ((r.tayNghe&&r.tayNghe.don)||0) : (x.don||0), loi:x.loi});
      }
    }
    const valid=parts.filter(p=>NB(p.val)!=null && p.don!==0 && p.val!==0);
    const target = tc.hardKpi!=null ? tc.hardKpi : (parts.length?NB(parts[0].kpi):null);
    if(!valid.length) return mkKpi(Object.assign({},base,{target,actual:null,
      dataReason: tc.key==="xldd" ? "Chưa import số liệu xử lý đầu 1 lần (đơn = 0)" : "Chưa có số liệu kỳ này",
      meta:{parts}}));
    const W=valid.reduce((s,p)=>s+(p.w||0),0);
    const val = W>0 ? valid.reduce((s,p)=>s+p.val*p.w,0)/W
                    : valid.reduce((s,p)=>s+p.val,0)/valid.length;
    const don = valid.reduce((s,p)=>s+(p.don||0),0), loi=valid.reduce((s,p)=>s+(p.loi||0),0);
    return mkKpi(Object.assign({},base,{target,actual:val,meta:{parts:valid,don,loi}}));
  });
}

/* 5 KPI chất lượng TẠI NHÀ cho 1 tỉnh cụ thể */
function calcClNhaTinh(code,S=ST){
  if(isYear(S)) return clYearAgg(S,CL_NHA,S2=>calcClNhaTinh(code,S2));
  const D=M(S);
  /* ƯU TIÊN dữ liệu .tinh — số THẬT theo tỉnh (không còn copy từ cấp vùng) */
  if(useTinh(D,S)){
    const rt=tRec(D,code,"nha");
    if(rt&&rt.cl) return CL_NHA.map(tc=>{
      const x=rt.cl[tc.key];
      const target = (x&&NB(x.kpi)!=null)?x.kpi:(tc.hardKpi!=null?tc.hardKpi:null);
      return mkKpi({key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,
        target, actual:x?NB(x.act):null, meta:{w:tW(D,code,"nha")},
        chuaDo: !!(x&&x.chuaDo),
        ed:edSpec(D,S,code,"nha",`cl.${tc.key}.kpi`,`cl.${tc.key}.act`,clScale(tc),1),
        dataReason:(x&&x.chuaDo)?"Nguồn ghi “Chưa đo” cho tiêu chí này ở kỳ này"
                                :"Nguồn để trống tiêu chí này ở kỳ này"});
    });
  }
  const r=clNhaRecKho(D,code,S);
  return CL_NHA.map(tc=>{
    const x=r&&r[tc.field];
    const target = tc.hardKpi!=null?tc.hardKpi:(x?NB(x.kpi):null);
    const bad = !x || NB(x.tyle)==null || x.don===0 || (tc.key==="xldd" && !x.don);
    return mkKpi({key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,
      target, actual: bad?null:x.tyle,
      meta: x?{don:x.don,loi:x.loi}:null,
      dataReason: tc.key==="xldd" ? "Chưa import số liệu xử lý đầu 1 lần" : "Chưa có số liệu kỳ này"});
  });
}

/* 5 KPI chất lượng TẠI KHO — tổng phạm vi */
function calcClKho(S=ST){
  if(isYear(S)) return clYearAgg(S,CL_KHO,S2=>calcClKho(S2));
  const D=M(S);
  /* ƯU TIÊN dữ liệu .tinh: gộp 2 kho, trọng số = sản lượng thực đạt tại kho */
  if(useTinh(D,S)){
    return CL_KHO.map(tc=>{
      const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,dir:tc.dir};
      let sa=0,wa=0,st=0,wt=0,nCD=0,nU=0;
      for(const code of unitsKho(S)){
        const r=tRec(D,code,"kho"), x=r&&r.clKho&&r.clKho[tc.tfield]; if(!x) continue;
        nU++; if(x.chuaDo) nCD++;
        const w=tW(D,code,"kho");
        if(NB(x.act)!=null){sa+=x.act*w;wa+=w;}
        if(NB(x.kpi)!=null){st+=x.kpi*w;wt+=w;}
      }
      const allCD = nU>0 && nCD===nU;
      if(!wa&&!wt) return mkKpi(Object.assign({},base,{target:null,actual:null, chuaDo:allCD,
        dataReason:allCD?"Nguồn ghi “Chưa đo” cho tiêu chí này ở mọi kho trong phạm vi"
                        :"Nguồn để trống hoặc ngoài phạm vi lọc"}));
      return mkKpi(Object.assign({},base,{target:wt?st/wt:null,actual:wa?sa/wa:null,
        meta:{w:wa,gop:"BQ gia quyền theo sản lượng"}}));
    });
  }
  const KY = S.ky==="Tháng"?"thang":(S.ky==="Tuần 1"?"t1":S.ky==="Tuần 2"?"t2":null);
  return CL_KHO.map(tc=>{
    const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,dir:tc.dir};
    if(!D) return mkKpi(Object.assign({},base,{target:null,actual:null}));
    const blk=(D.bhTaiKho||[]).find(b=>blkCode(b.ten)===tc.code);
    if(!blk) return mkKpi(Object.assign({},base,{target:null,actual:null,dataReason:"Chưa có khối dữ liệu BH tại kho"}));
    const list=(blk.kho||[]).filter(k=>khoIn(k.ten,S)&&KHOKHO.indexOf(KHO(k.ten))>=0);
    if(!list.length) return mkKpi(Object.assign({},base,{target:null,actual:null,dataReason:"Ngoài phạm vi lọc"}));
    if(KY==null) return mkKpi(Object.assign({},base,{target:null,actual:null,
      dataReason:`Nguồn BH tại kho chỉ có số Tuần 1, Tuần 2 và Lũy kế tháng — chưa có ${S.ky}`}));
    let t=0,q=0,n=0;
    for(const k of list){const c=k[KY]; if(!c) continue; if(NB(c.target)!=null){t+=c.target;n++} if(NB(c.kq)!=null)q+=c.kq}
    if(!n) return mkKpi(Object.assign({},base,{target:null,actual:null}));
    return mkKpi(Object.assign({},base,{target:t/n, actual:q/n, meta:{soKho:list.length}}));
  });
}
/* 5 KPI chất lượng TẠI KHO cho 1 kho cụ thể */
function calcClKhoUnit(code,S=ST){
  if(isYear(S)) return clYearAgg(S,CL_KHO,S2=>calcClKhoUnit(code,S2));
  const D=M(S);
  if(useTinh(D,S)){
    const rt=tRec(D,code,"kho");
    if(rt&&rt.clKho) return CL_KHO.map(tc=>{
      const x=rt.clKho[tc.tfield];
      return mkKpi({key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,dir:tc.dir,
        target:x?NB(x.kpi):null, actual:x?NB(x.act):null, meta:{w:tW(D,code,"kho")},
        chuaDo: !!(x&&x.chuaDo),
        ed:edSpec(D,S,code,"kho",`clKho.${tc.tfield}.kpi`,`clKho.${tc.tfield}.act`,clScale(tc),1),
        dataReason:(x&&x.chuaDo)?"Nguồn ghi “Chưa đo” cho tiêu chí này ở kỳ này"
                                :"Nguồn để trống tiêu chí này ở kỳ này"});
    });
  }
  const KY = S.ky==="Tháng"?"thang":(S.ky==="Tuần 1"?"t1":S.ky==="Tuần 2"?"t2":null);
  return CL_KHO.map(tc=>{
    const base={key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc,dir:tc.dir};
    const blk=D&&(D.bhTaiKho||[]).find(b=>blkCode(b.ten)===tc.code);
    const row=blk&&(blk.kho||[]).find(k=>KHO(k.ten)===code);
    const c=row&&KY?row[KY]:null;
    if(!c) return mkKpi(Object.assign({},base,{target:null,actual:null,
      dataReason:KY==null?`Nguồn chỉ có Tuần 1 / Tuần 2 / Lũy kế tháng`:"Chưa có số liệu"}));
    return mkKpi(Object.assign({},base,{target:NB(c.target),actual:NB(c.kq)}));
  });
}

/* ---------------------------------------------------------------------------
   CHẤT LƯỢNG GÓI BẢO HÀNH — 2 tiêu chí, CHỈ cho 12 tỉnh bảo hành tại nhà.
   3 trạng thái "không có số" phải phân biệt rõ:
     · kho Đà Nẵng / Khánh Hòa      -> "không áp dụng"
     · tỉnh, tháng nguồn để trống   -> "chưa có dữ liệu"   (KHÔNG được hiểu là 0)
   --------------------------------------------------------------------------- */
const goiBase = tc=>({key:tc.key,name:tc.name,icon:tc.icon,fmt:tc.fmt,unit:tc.unit,desc:tc.desc});
function calcClGoiNA(){
  return CL_GOI.map(tc=>mkKpi(Object.assign({},goiBase(tc),{target:null,actual:null,
    naLabel:"không áp dụng", dataReason:GOI_NA_REASON})));
}
/* 2 tiêu chí gói bảo hành cho 1 đơn vị */
function calcClGoiUnit(code,loai,S=ST){
  if(loai==="kho") return calcClGoiNA();
  if(isYear(S)) return clYearAgg(S,CL_GOI,S2=>calcClGoiUnit(code,"nha",S2));
  const D=M(S);
  const rt=useTinh(D,S)?tRec(D,code,"nha"):null;
  const cg=rt&&rt.clGoi;
  return CL_GOI.map(tc=>{
    const x=cg&&cg[tc.tfield];
    return mkKpi(Object.assign({},goiBase(tc),{
      target: x?NB(x.kpi):null, actual: x?NB(x.act):null,
      meta:{w:tW(D,code,"nha")}, chuaDo: !!(x&&x.chuaDo),
      ed:rt?edSpec(D,S,code,"nha",`clGoi.${tc.tfield}.kpi`,`clGoi.${tc.tfield}.act`,clScale(tc),1):null,
      dataReason:"Nguồn chưa có số xử lý đúng hạn cam kết cho kỳ này"}));
  });
}
/* gộp 2 tiêu chí gói bảo hành cho phạm vi hiện tại (chỉ cộng 12 tỉnh tại nhà) */
function calcClGoi(S=ST){
  if(isYear(S)) return clYearAgg(S,CL_GOI,S2=>calcClGoi(S2));
  const D=M(S);
  if(!showNha(S)||!unitsNha(S).length) return calcClGoiNA();
  return CL_GOI.map(tc=>{
    let sa=0,wa=0,st=0,wt=0;
    for(const code of unitsNha(S)){
      const rt=useTinh(D,S)?tRec(D,code,"nha"):null;
      const x=rt&&rt.clGoi&&rt.clGoi[tc.tfield]; if(!x) continue;
      const w=tW(D,code,"nha");
      if(NB(x.act)!=null){sa+=x.act*w;wa+=w;}
      if(NB(x.kpi)!=null){st+=x.kpi*w;wt+=w;}
    }
    return mkKpi(Object.assign({},goiBase(tc),{
      target: wt?st/wt:null, actual: wa?sa/wa:null,
      meta:{w:wa,gop:"BQ gia quyền theo sản lượng"},
      dataReason:"Nguồn chưa có số xử lý đúng hạn cam kết cho kỳ này"}));
  });
}
/* danh sách dòng cho bảng "3/ CHẤT LƯỢNG GÓI BẢO HÀNH" (12 tỉnh + 2 kho K.A.D) */
function clGoiRows(S=ST){
  const out=[];
  if(showNha(S)) for(const c of unitsNha(S)) out.push({code:c,loai:"nha",kpis:calcClGoiUnit(c,"nha",S)});
  if(showKho(S)) for(const c of unitsKho(S)) out.push({code:c,loai:"kho",kpis:calcClGoiNA()});
  return out;
}

/* =============================================================================
   B. PHÂN BỔ target vùng -> tỉnh  (nguồn chỉ có cấp VÙNG — đây là ƯỚC TÍNH,
      luôn công bố bằng tooltip ⓘ; chế độ phân bổ do người dùng chọn ở CONFIG)
   ============================================================================= */
const PHANBO_LABEL={
  donhang:"Theo tỷ trọng số đơn ghi nhận ở báo cáo chất lượng",
  chiphi :"Theo tỷ trọng chi phí thực tế của tỉnh",
  deu    :"Chia đều cho các tỉnh trong vùng"
};
function shareNha(vg,S=ST){
  const khos=KHO_ORDER.filter(k=>KHOMAP[k].vung===vg);
  const mode=CONFIG.phanBo.mode, w={};
  let tot=0;
  const ms=selMonths(S);
  for(const k of khos){
    let s=0;
    for(const m of ms){
      const Dm=DB.ky[kyKey(S.nam,m)]; if(!Dm) continue;
      if(mode==="chiphi"){
        s += (Dm.cpNhaKho||[]).filter(x=>KHO(x.kho)===k).reduce((a,x)=>a+(x.tongcp||0),0);
      }else if(mode==="deu"){ s += 1; }
      else{
        const kk=Object.keys(Dm.clNhaKho||{}).find(x=>KHO(x)===k);
        const rec=kk&&((Dm.clNhaKho[kk].ky||{})["Tháng 7"]||{});
        s += (rec&&rec.tayNghe&&rec.tayNghe.don)||(rec&&rec.dungHen&&rec.dungHen.don)||0;
      }
    }
    w[k]=s; tot+=s;
  }
  if(tot<=0){khos.forEach(k=>w[k]=1/khos.length); return w;}
  khos.forEach(k=>w[k]=w[k]/tot);
  return w;
}

/* =============================================================================
   C. SẢN LƯỢNG (ĐƠN HÀNG)  &  ĐƠN GIÁ TRUNG BÌNH
   Thực tế dữ liệu: jobKho[].sljob CHỈ có số thật cho Đà Nẵng & Khánh Hòa.
   12 tỉnh BH tại nhà KHÔNG có số sản lượng đơn hàng -> "–" (không bịa).
   Target sản lượng & target đơn giá KHÔNG tồn tại trong nguồn -> CONFIG.
   ============================================================================= */
function jobKhoVal(code,S=ST){
  if(isYear(S)){
    let s=0,n=0;
    eachMonth(S,(Dm)=>{ const e=Object.entries(Dm.jobKho||{}).find(([k])=>KHO(k)===code);
      if(e&&NB(e[1].sljob)!=null){s+=e[1].sljob;n++} });
    return n?s:null;
  }
  const D=M(S); if(!D) return null;
  const e=Object.entries(D.jobKho||{}).find(([k])=>KHO(k)===code);
  if(!e) return null;
  const v=NB(e[1].sljob);
  if(v==null) return null;
  if(S.ky!=="Tháng"){                       // nguồn không chia sản lượng theo tuần
    return null;
  }
  return v;
}
function calcSanLuongUnit(code,loai,S=ST){
  const base={key:"sanluong",name:"ĐƠN HÀNG",icon:"pkg",fmt:f0,unit:"đơn",
    desc:"Sản lượng đơn hàng thực hiện trong kỳ",cfgKey:"sanLuong"};
  if(isYear(S)){
    let t=0,a=0,nt=0,na=0;
    eachMonth(S,(Dm,S2)=>{const k=calcSanLuongUnit(code,loai,S2);
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;na++}});
    return mkKpi(Object.assign({},base,{target:nt?t:null,actual:na?a:null,meta:{congDon:true}}));
  }
  const D=M(S), rt=useTinh(D,S)?tRec(D,code,loai):null;
  const ov = NB(CONFIG.sanLuongTarget.byKho[code]);       // ghi đè thủ công (tuỳ chọn)
  if(rt&&rt.sl&&(NB(rt.sl.act)!=null||NB(rt.sl.target)!=null)){
    /* kỳ lũy kế: so với target đã quy đổi theo số ngày đã qua + nêu dự kiến cả tháng */
    const p=prApply(D, ov!=null?ov:NB(rt.sl.target), NB(rt.sl.act),
      {nguon:"file dữ liệu tháng (thật theo tỉnh/kho)", cats:(rt.sl.cats||null),
       tongTatCa:(rt.sl.tongTatCa||null)});
    return mkKpi(Object.assign({},base,p,
      {ed:edSpec(D,S,code,loai,"sl.target","sl.act",1,prRatio(D))}));
  }
  const act = loai==="kho" ? jobKhoVal(code,S) : null;
  return mkKpi(Object.assign({},base,{
    target:ov, actual:act,
    cfgReason:"Kỳ này chưa có target sản lượng trong nguồn — có thể cấu hình",
    dataReason: loai==="kho"
      ? (S.ky!=="Tháng" ? "Nguồn không chia sản lượng theo tuần" : "Chưa có số jobcard")
      : (S.ky!=="Tháng" ? "Nguồn không chia sản lượng theo tuần" : "Kỳ này chưa có sản lượng theo tỉnh")}));
}
function calcSanLuongTong(loai,S=ST){
  const base={key:"sanluong",name:"ĐƠN HÀNG",icon:"pkg",fmt:f0,unit:"đơn",
    desc:"Tổng sản lượng đơn hàng trong kỳ",cfgKey:"sanLuong"};
  if(isYear(S)){
    let t=0,a=0,nt=0,na=0;
    eachMonth(S,(Dm,S2)=>{const k=calcSanLuongTong(loai,S2);
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;na++}});
    return mkKpi(Object.assign({},base,{target:nt?t:null,actual:na?a:null,meta:{congDon:true}}));
  }
  const units = loai==="kho" ? unitsKho(S) : unitsNha(S);
  const tgtCfg = NB(loai==="kho"?CONFIG.sanLuongTarget.tongKho:CONFIG.sanLuongTarget.tongNha);
  const D=M(S);
  if(useTinh(D,S)){
    let t=0,a=0,nt=0,na=0;
    for(const u of units){
      const k=calcSanLuongUnit(u,loai,S);
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;na++}
    }
    if(nt||na){
      /* target CẢ THÁNG: số cấu hình vốn đã là cả tháng, số cộng từ đơn vị cũng vậy */
      const tg=tgtCfg!=null?tgtCfg:(nt?t:null);
      return mkKpi(Object.assign({},base,{
        target: tg, actual:na?a:null,
        meta:Object.assign({nguon:"file dữ liệu tháng",soDonVi:units.length},
                           prMeta(D, tg, na?a:null)||{})}));
    }
  }
  let sumT=0,nT=0; for(const u of units){const v=NB(CONFIG.sanLuongTarget.byKho[u]); if(v!=null){sumT+=v;nT++}}
  const target = tgtCfg!=null ? tgtCfg : (nT===units.length&&nT>0 ? sumT : null);
  let act=null;
  if(loai==="kho"){ let s=0,n=0; for(const u of units){const v=jobKhoVal(u,S); if(v!=null){s+=v;n++}} act=n?s:null; }
  return mkKpi(Object.assign({},base,{target,actual:act,
    cfgReason:"Kỳ này chưa có target sản lượng trong nguồn — có thể cấu hình",
    dataReason: loai==="kho" ? "Chưa có số jobcard" : "Kỳ này chưa có sản lượng theo tỉnh"}));
}
/* Đơn giá TB của 1 đơn vị — số THẬT từ file dữ liệu tháng */
function calcDonGiaUnit(code,loai,S=ST){
  const base={key:"dongia",name:"ĐƠN GIÁ TRUNG BÌNH",icon:"coins",fmt:vnd,unit:"đ/đơn",
    desc:"Đơn giá trung bình mỗi đơn hàng",cfgKey:"donGia"};
  if(isYear(S)){
    let sa=0,wa=0,st=0,wt=0;
    eachMonth(S,(Dm,S2)=>{const k=calcDonGiaUnit(code,loai,S2);
      const w=(k.meta&&NB(k.meta.w))||1;
      if(k.actual!=null){sa+=k.actual*w;wa+=w;} if(k.target!=null){st+=k.target*w;wt+=w;}});
    return mkKpi(Object.assign({},base,{target:wt?st/wt:null,actual:wa?sa/wa:null,
      meta:{note:"BQ gia quyền theo sản lượng các tháng"}}));
  }
  const D=M(S), rt=useTinh(D,S)?tRec(D,code,loai):null;
  if(rt&&rt.dgia&&(NB(rt.dgia.act)!=null||NB(rt.dgia.target)!=null))
    return mkKpi(Object.assign({},base,{target:NB(rt.dgia.target),actual:NB(rt.dgia.act),
      ed:edSpec(D,S,code,loai,"dgia.target","dgia.act",1,1),
      meta:{w:tW(D,code,loai),nguon:"file dữ liệu tháng"}}));
  return calcDonGia(loai,S);   // fallback: mức chung theo loại hình (ghi đè CONFIG nếu có)
}
function calcDonGia(loai,S=ST){
  const C=CONFIG.donGia;
  const ovA = NB(loai==="kho"?C.thucDatKho:C.thucDatNha);   // ghi đè thủ công (tuỳ chọn)
  const ovT = NB(loai==="kho"?C.targetKho :C.targetNha);
  const base={key:"dongia",name:"ĐƠN GIÁ TRUNG BÌNH",icon:"coins",fmt:vnd,unit:"đ/đơn",
    desc:"Đơn giá trung bình mỗi đơn hàng (BQ gia quyền theo sản lượng)",cfgKey:"donGia"};
  if(isYear(S)){
    let sa=0,wa=0,st=0,wt=0;
    eachMonth(S,(Dm,S2)=>{const k=calcDonGia(loai,S2);
      const w=(k.meta&&NB(k.meta.w))||1;
      if(k.actual!=null){sa+=k.actual*w;wa+=w;} if(k.target!=null){st+=k.target*w;wt+=w;}});
    if(wa||wt) return mkKpi(Object.assign({},base,{target:wt?st/wt:null,actual:wa?sa/wa:null,
      meta:{note:"BQ gia quyền theo sản lượng các tháng"}}));
    return mkKpi(Object.assign({},base,{target:ovT,actual:ovA,tmp:C.tamThoi}));
  }
  const D=M(S);
  if(useTinh(D,S)){
    /* ĐG gộp = TỔNG DOANH THU ĐƠN HÀNG (dt.trong, không gồm gói) / TỔNG SẢN LƯỢNG
       — tính TRỰC TIẾP từ 2 trục gốc (DT & SL), KHÔNG suy ra bằng cách bình quân
       cột "dgia" theo từng đơn vị. Lý do: cột "dgia" nguồn đôi khi không khớp
       tuyệt đối SL×ĐG=DT ở cấp TỪNG đơn vị (sai số làm tròn của nguồn), nên bình
       quân theo cột đó có thể lệch vài đồng so với ĐÚNG DT/SL gộp — trong khi
       khách chốt yêu cầu Sản lượng × Đơn giá TB phải khớp ĐÚNG Doanh thu. Cột
       "dgia" (r.dgia.target/act) chỉ còn dùng làm SỐ DỰ PHÒNG khi 1 đơn vị nào
       đó chưa có dt.trong (vd nguồn thiếu dữ liệu tháng đó). */
    let sa=0,wa=0,st=0,wt=0;                 // dự phòng: bình quân theo cột "dgia"
    let dtA=0,slA=0,dtT=0,slT=0;             // chính: DT/SL trực tiếp
    const units = loai==="kho"?unitsKho(S):unitsNha(S);
    for(const code of units){
      const r=tRec(D,code,loai); if(!r||!r.dgia) continue;
      const wA=tW(D,code,loai);                                         // trọng số THỰC ĐẠT = sản lượng thực đạt
      const wT=(r.sl&&NB(r.sl.target)!=null&&r.sl.target>0)?r.sl.target:1; // trọng số TARGET = sản lượng TARGET (không lấy actual)
      if(NB(r.dgia.act)!=null){sa+=r.dgia.act*wA;wa+=wA;}
      if(NB(r.dgia.target)!=null){st+=r.dgia.target*wT;wt+=wT;}
      const dr=r.dt&&r.dt.trong;
      if(dr){
        const actDt = NB(dr.actDH)!=null?NB(dr.actDH):NB(dr.act);
        const slA_i = NB(r.sl&&r.sl.act), slT_i = NB(r.sl&&r.sl.target);
        if(actDt!=null && slA_i!=null && slA_i>0){ dtA+=actDt; slA+=slA_i; }
        if(NB(dr.target)!=null && slT_i!=null && slT_i>0){ dtT+=dr.target; slT+=slT_i; }
      }
    }
    if(slA||slT||wa||wt) return mkKpi(Object.assign({},base,{
      target: ovT!=null?ovT:(slT?dtT/slT:(wt?st/wt:null)),
      actual: ovA!=null?ovA:(slA?dtA/slA:(wa?sa/wa:null)),
      meta:{w:wa,gop:"BQ gia quyền theo sản lượng (= DT đơn hàng ÷ SL)",nguon:"file dữ liệu tháng"}}));
  }
  /* tham chiếu tính được (chỉ ở tại kho, nơi có cả doanh thu và sản lượng) */
  let ref=null;
  if(loai==="kho"){
    const dt=calcDoanhThuCat("Bảo hành tại kho",S), sl=calcSanLuongTong("kho",S);
    if(dt.actual!=null && sl.actual) ref = dt.actual*1e6/sl.actual;
  }
  return mkKpi(Object.assign({},base,{
    target:ovT, actual:ovA, tmp:C.tamThoi,
    cfgReason:"Kỳ này chưa có đơn giá trong nguồn — có thể ghi đè ở Cấu hình",
    dataReason:"Kỳ này chưa có đơn giá trong nguồn",
    meta:{ref, tamThoi:C.tamThoi}}));
}

/* =============================================================================
   D. CHI PHÍ — KPI ĐẢO CHIỀU (thấp hơn target = ĐẠT)
   ============================================================================= */
function cpRowsRaw(D,loai,S){
  const arr = loai==="kho" ? (D.cpKhoBH||[]) : (D.cpNhaKho||[]);
  return arr.filter(x=>khoIn(x.kho,S) && (loai==="kho" ? KHOKHO.indexOf(KHO(x.kho))>=0 : true));
}
function cpValOf(row,S,D){
  const w=wIdx(S);
  if(w!=null) return NB((row.tuan||[])[w]);
  const lk=NB(row.tongcp);
  /* CHI PHÍ: số nguồn ĐÃ LÀ lũy kế cuối tháng -> hs(D,"chiPhi") = 1, không suy diễn thêm */
  return lk==null?null:lk*hs(D,"chiPhi");
}
/* target chi phí cấp vùng, tách nhà/kho theo tỷ trọng chi phí thực tế của nguồn */
function cpTargetVung(D,vg,loai,S){
  const c=(D.cpVung||{})[vg]; if(!c||!NB(c.target)) return null;
  const tot=((c.bhTaiNha||0)+(c.bhTaiKho||0))||0;
  if(!tot) return null;
  const w=wIdx(S), scale = w!=null ? ((D.cpVung&&1)&&(1/4)) : 1;  // tuần: chia đều 4 tuần
  const base = c.target*(loai==="kho"?(c.bhTaiKho||0):(c.bhTaiNha||0))/tot;
  return base*scale;
}
function calcChiPhiUnit(code,loai,S=ST){
  const base={key:"chiphi",name:"CHI PHÍ",icon:"calculator",fmt:tr,unit:"tr đ",dir:"down",
    desc:"Chi phí thực tế so với định mức (thấp hơn định mức = ĐẠT)"};
  if(isYear(S)){
    let t=0,a=0,nt=0,na=0;
    eachMonth(S,(Dm,S2)=>{const k=calcChiPhiUnit(code,loai,S2);
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;na++}});
    return mkKpi(Object.assign({},base,{target:nt?t:null,actual:na?a:null,meta:{congDon:true}}));
  }
  const D=M(S); if(!D) return mkKpi(Object.assign({},base,{target:null,actual:null}));
  /* ƯU TIÊN dữ liệu .tinh — target + thực đạt THẬT theo từng tỉnh/kho (triệu đồng) */
  const rt=useTinh(D,S)?tRec(D,code,loai):null;
  if(rt&&rt.cp&&(NB(rt.cp.act)!=null||NB(rt.cp.target)!=null)){
    /* nguồn ghi ĐỒNG -> quy về TRIỆU. CHI PHÍ KHÔNG quy đổi lũy kế (khách chốt: số đã là
       lũy kế cuối tháng) -> so thẳng thực chi với ĐỊNH MỨC CẢ THÁNG. */
    const p=prApply(D, TRI(rt.cp.target), TRI(rt.cp.act),
      {chinhXac:true,nguon:"file dữ liệu tháng",khongQuyDoi:true}, "chiPhi");
    return mkKpi(Object.assign({},base,p,
      {ed:edSpec(D,S,code,loai,"cp.target","cp.act",1e6,prRatio(D,"chiPhi"))}));
  }
  const vg=vungOf(code);
  const rows=cpRowsRaw(D,loai,Object.assign({},S,{kho:"ALL",vung:"TONG"})).filter(x=>x.vung===vg);
  const me=rows.find(x=>KHO(x.kho)===code);
  const actual = me?cpValOf(me,S,D):null;
  const tgV=cpTargetVung(D,vg,loai,S);
  let target=null;
  if(tgV!=null){
    if(loai==="kho"){ target=tgV; }            // mỗi vùng có đúng 1 kho BH tại kho -> chính xác
    else{
      const sh=shareNha(vg,S)[code];
      target = sh!=null ? tgV*sh : null;
    }
  }
  return mkKpi(Object.assign({},base,{target,actual,
    meta:{uocTinh: loai!=="kho", phanBo:PHANBO_LABEL[CONFIG.phanBo.mode],
          luyKe: me?NB(me.tongcp):null}}));
}
function calcChiPhiTong(loai,S=ST){
  const base={key:"chiphi",name:"CHI PHÍ",icon:"calculator",fmt:tr,unit:"tr đ",dir:"down",
    desc:"Tổng chi phí so với định mức (thấp hơn = ĐẠT)"};
  if(isYear(S)){
    let t=0,a=0,n=0;
    eachMonth(S,(Dm,S2)=>{const k=calcChiPhiTong(loai,S2); if(k.target!=null)t+=k.target; if(k.actual!=null){a+=k.actual;n++}});
    return mkKpi(Object.assign({},base,{target:t||null,actual:n?a:null,meta:{congDon:true}}));
  }
  const D=M(S); if(!D) return mkKpi(Object.assign({},base,{target:null,actual:null}));
  if(useTinh(D,S)){
    const units = loai==="kho"?unitsKho(S):unitsNha(S);
    let t=0,a=0,nt=0,na=0;
    for(const u of units){
      const k=calcChiPhiUnit(u,loai,S);
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;na++}
    }
    if(nt||na) return mkKpi(Object.assign({},base,{target:nt?t:null,actual:na?a:null,
      meta:Object.assign({chinhXac:true,nguon:"file dữ liệu tháng",luyKe:na?a:null,khongQuyDoi:true},
                         prMeta(D, nt?t:null, na?a:null, "chiPhi")||{})}));
  }
  let t=0,a=0,nA=0,nT=0;
  for(const vg of vsel(S)){
    const tv=cpTargetVung(D,vg,loai,S); if(tv!=null&&S.kho==="ALL"){t+=tv;nT++}
    const rows=cpRowsRaw(D,loai,S).filter(x=>x.vung===vg);
    for(const r of rows){const v=cpValOf(r,S,D); if(v!=null){a+=v;nA++}}
    if(S.kho!=="ALL"&&vungOf(S.kho)===vg){
      const k=calcChiPhiUnit(S.kho,loai,S); if(k.target!=null){t+=k.target;nT++}
    }
  }
  const luyKe = (()=>{let s=0;for(const vg of vsel(S))for(const r of cpRowsRaw(D,loai,S).filter(x=>x.vung===vg))s+=(r.tongcp||0);return s})();
  return mkKpi(Object.assign({},base,{target:nT?t:null,actual:nA?a:null,meta:{luyKe}}));
}
function calcChiPhiAll(S=ST){
  const n=showNha(S)?calcChiPhiTong("nha",S):null, k=showKho(S)?calcChiPhiTong("kho",S):null;
  const t=[n,k].filter(x=>x&&x.target!=null).reduce((s,x)=>s+x.target,0);
  const a=[n,k].filter(x=>x&&x.actual!=null).reduce((s,x)=>s+x.actual,0);
  const has=[n,k].filter(x=>x&&x.actual!=null).length;
  /* CHI PHÍ không quy đổi lũy kế -> các thành phần không mang meta.prorate; giữ nhánh này
     để nếu quy tắc DATA đổi lại (PRORATE_NHOM.chiPhi=true) thì thẻ tổng vẫn nêu dự kiến. */
  const pr=[n,k].find(x=>x&&x.meta&&x.meta.prorate);
  const meta={nha:n,kho:k,khongQuyDoi:!prorateOn("chiPhi")};
  if(pr&&has){ meta.prorate=pr.meta.prorate; meta.ngayDaQua=pr.meta.ngayDaQua;
    meta.ngayTrongThang=pr.meta.ngayTrongThang; meta.duKien=a/pr.meta.prorate;
    if(t) meta.targetFull=t/pr.meta.prorate; }
  return mkKpi({key:"chiphi",name:"CHI PHÍ",icon:"calculator",fmt:tr,unit:"tr đ",dir:"down",
    desc:"Tổng chi phí phòng bảo hành so với định mức",
    target:t||null,actual:has?a:null,meta});
}

/* =============================================================================
   E. DOANH THU
   Công thức file mẫu (giữ NGUYÊN):
     BÊN TRONG = Doanh Thu Đơn Hàng Bên Trong + Gói Bán 2025
     BÊN NGOÀI = 1 ĐỔI 1 + BẢO HÀNH MỞ RỘNG + SỬA CHỮA KHÁCH LẺ
   ============================================================================= */
/* nhóm quy đổi lũy kế theo CATEGORY doanh thu — mọi mục dùng "doanhThu" (có quy đổi
   theo ngày), riêng "Bán gói năm 2025" đã chốt xong 100% -> "goiBan2025" (không quy đổi). */
const dtNhomOf = cat => cat==="Bán gói năm 2025" ? "goiBan2025" : "doanhThu";
function dtCatRaw(D,vg,cat,S){
  const c=((D.doanhThu||{})[vg]||{})[cat];
  if(!c) return {target:null,actual:null,luyKe:null};
  const w=wIdx(S);
  if(w!=null) return {target:NB((c.target_tuan||[])[w]), actual:NB((c.tuan||[])[w]), luyKe:NB((c.tuan||[])[w])};
  const lk=(c.tuan||[]).reduce((s,x)=>s+(x||0),0);
  const dk=NB(c.dukien)!=null?c.dukien:lk*hs(D,dtNhomOf(cat),DT_TFIELD[cat]);
  return {target:NB(c.target), actual:dk, luyKe:lk};
}
const DT_LABEL={
  "Bảo hành tại nhà":"Bảo Hành Tại Nhà", "Bảo hành tại kho":"Bảo Hành Tại Kho",
  "Bán gói năm 2025":"Gói bán năm 2025", "BH 1 đổi 1":"1 Đổi 1",
  "BHMR":"Bảo Hành Mở Rộng", "SCDV":"Sửa Chữa Khách Lẽ"
};
DT_NGOAI_MOI.forEach(x=>{ DT_LABEL[x.cat]=x.ten; });   /* 5 nhóm mới — xem parts/02-data.js */
/* map nhóm doanh thu -> field trong DB.ky[].tinh[code].dt (sckl = sửa chữa khách lẻ) */
const DT_TFIELD={"Bảo hành tại nhà":"trong","Bảo hành tại kho":"trong","Bán gói năm 2025":"goi",
                 "BH 1 đổi 1":"doi1","BHMR":"bhmr","SCDV":"sckl"};
DT_NGOAI_MOI.forEach(x=>{ DT_TFIELD[x.cat]=x.fld; });
/* nhóm mới có target ở CẢ 12 tỉnh (tại nhà) LẪN 2 kho -> ứng xử như SCDV */
const laNgoaiMoi=cat=>DT_NGOAI_MOI.some(x=>x.cat===cat);
/* các đơn vị đóng góp cho 1 nhóm doanh thu trong phạm vi lọc hiện tại */
function dtUnitsOf(cat,S){
  const out=[];
  if(cat==="Bảo hành tại kho"){ for(const c of unitsKho(S)) out.push([c,"kho"]); return out; }
  for(const c of unitsNha(S)) out.push([c,"nha"]);
  if(cat==="SCDV"||laNgoaiMoi(cat)) for(const c of unitsKho(S)) out.push([c,"kho"]);  // khách lẻ + 5 nhóm mới có cả ở kho
  return out;                                                          // gói/1đổi1/BHMR: chỉ tại nhà
}
function calcDoanhThuCat(cat,S=ST){
  const base={key:"dt:"+cat,name:DT_LABEL[cat]||cat,icon:"banknote",fmt:tr,unit:"tr đ"};
  if(isYear(S)){
    let t=0,a=0,l=0,n=0;
    eachMonth(S,(Dm,S2)=>{const k=calcDoanhThuCat(cat,S2);
      if(k.target!=null)t+=k.target; if(k.actual!=null){a+=k.actual;n++} if(k.meta&&k.meta.luyKe!=null)l+=k.meta.luyKe;});
    return mkKpi(Object.assign({},base,{target:t||null,actual:n?a:null,meta:{luyKe:l,congDon:true}}));
  }
  const D=M(S); if(!D) return mkKpi(Object.assign({},base,{target:null,actual:null}));
  /* ƯU TIÊN dữ liệu .tinh: cộng số THẬT theo từng đơn vị trong phạm vi */
  if(useTinh(D,S)){
    const parts=dtUnitsOf(cat,S).map(([c,l2])=>calcDtUnitCat(c,l2,cat,S));
    const pt=parts.filter(k=>k.target!=null), pa=parts.filter(k=>k.actual!=null);
    if(pt.length||pa.length){
      const uoc=parts.some(k=>k.meta&&k.meta.uocTinh);
      const tg=pt.length?pt.reduce((s,k)=>s+k.target,0):null;
      const ac=pa.length?pa.reduce((s,k)=>s+k.actual,0):null;
      return mkKpi(Object.assign({},base,{
        target:tg, actual:ac,
        meta:Object.assign({luyKe:ac, soDonVi:parts.length, uocTinh:uoc, nguon:"file dữ liệu tháng"},
                           prMeta(D, tg, ac, dtNhomOf(cat), DT_TFIELD[cat])||{})}));
    }
  }
  let t=0,a=0,l=0,n=0,nt=0;
  for(const vg of vsel(S)){
    const r=dtCatRaw(D,vg,cat,S);
    if(r.target!=null){t+=r.target;nt++} if(r.actual!=null){a+=r.actual;n++} if(r.luyKe!=null)l+=r.luyKe;
  }
  /* khi lọc 1 tỉnh: doanh thu cấp vùng được phân bổ (ước tính) */
  if(S.kho!=="ALL"){
    const vg=vungOf(S.kho), isKhoUnit=KHOKHO.indexOf(S.kho)>=0;
    if(cat==="Bảo hành tại kho"){ if(!isKhoUnit) return mkKpi(Object.assign({},base,{target:null,actual:null,
      dataReason:"Tỉnh này không có kho bảo hành tại kho"})); }
    else{
      const sh=shareNha(vg,S)[S.kho]||0;
      t*=sh;a*=sh;l*=sh;
      return mkKpi(Object.assign({},base,{target:nt?t:null,actual:n?a:null,
        meta:{luyKe:l,uocTinh:true,phanBo:PHANBO_LABEL[CONFIG.phanBo.mode]}}));
    }
  }
  return mkKpi(Object.assign({},base,{target:nt?t:null,actual:n?a:null,meta:{luyKe:l}}));
}
/* doanh thu 1 category cho 1 đơn vị (tỉnh hoặc kho)
   .tinh-first: số thật theo đơn vị từ file dữ liệu tháng; nguồn cũ (vùng-level,
   phân bổ ước tính) chỉ dùng BÙ phần .tinh còn thiếu (vd T8: BÊN TRONG thực đạt
   khách để trống -> giữ số nguồn cũ, còn target là số thật từ sheet TARGET).   */
function calcDtUnitCat(code,loai,cat,S=ST){
  const base={key:"dt:"+cat,name:DT_LABEL[cat]||cat,icon:"banknote",fmt:tr,unit:"tr đ"};
  if(isYear(S)){
    let t=0,a=0,n=0,nt=0,nNA=0,nM=0,uoc=false;
    eachMonth(S,(Dm,S2)=>{const k=calcDtUnitCat(code,loai,cat,S2); nM++;
      if(k.naLabel==="không áp dụng"){nNA++;return;}
      if(k.target!=null){t+=k.target;nt++} if(k.actual!=null){a+=k.actual;n++}
      if(k.meta&&k.meta.uocTinh)uoc=true;});
    if(nM&&nNA===nM) return mkKpi(Object.assign({},base,{target:null,actual:null,
      naLabel:"không áp dụng",dataReason:"Nghiệp vụ này không phát sinh ở đơn vị đang xem"}));
    return mkKpi(Object.assign({},base,{target:nt?t:null,actual:n?a:null,meta:{congDon:true,uocTinh:uoc}}));
  }
  const D=M(S);
  const x = useTinh(D,S) ? (r=>r&&r.dt&&r.dt[DT_TFIELD[cat]]||null)(tRec(D,code,loai)) : null;
  /* quy tắc "không áp dụng" giữ nguyên như biểu mẫu */
  const notApply = (loai==="kho" && (cat==="Bán gói năm 2025"||cat==="BH 1 đổi 1"||cat==="BHMR"))
                || (loai!=="kho" && cat==="Bảo hành tại kho");
  /* 5 nhóm mới: có target ở cả nhà lẫn kho, CHƯA có thực đạt -> trả thẳng KPI
     "có target, chưa có thực đạt". KHÔNG đi vào nhánh legacy (nhánh đó sẽ gắn nhãn
     "không áp dụng" sai cho kho, vì nó chỉ biết 3 nhóm ngoài gốc). */
  if(laNgoaiMoi(cat)){
    const tg0=x?TRI(x.target):null;
    if(tg0==null) return mkKpi(Object.assign({},base,{target:null,actual:null,
      dataReason:"Kỳ này chưa có kế hoạch cho nhóm "+(DT_LABEL[cat]||cat)}));
    return mkKpi(Object.assign({},base,{target:tg0,actual:null,
      dataReason:"Đã có kế hoạch, chưa có số thực đạt (nguồn chưa có cột cho nhóm này)",
      meta:{nguon:"sheet TARGET — nhóm mới, chỉ có kế hoạch"}}));
  }
  if(!x || notApply) return calcDtUnitCatLegacy(code,loai,cat,S);
  /* ------------------------------------------------------------------------
     QUY TẮC GÓI BÁN 2025 (khách chốt lại vòng 3 — 19/08/2026):
     "Bảo hành tại nhà" LUÔN LUÔN là ĐƠN HÀNG BÊN TRONG THUẦN (không gồm Gói
     bán 2025) ở MỌI tháng T1-T12 — không còn gộp gói vào từ T8 nữa như quy
     tắc cũ (khách chốt lại: Sản lượng x Đơn giá phải khớp đúng Doanh thu đơn
     hàng, Gói bán 2025 hiển thị TÁCH RIÊNG, không cộng vào Sản lượng/Đơn giá
     hay vào "Bảo hành tại nhà"). Nguồn đã tách sẵn actDH = doanh thu ĐƠN HÀNG
     bên trong (chưa gồm gói); target dt.trong.target (T8-T12) đã được đồng bộ
     lại từ nguồn = số ĐƠN HÀNG THUẦN, không còn là số gộp gói nữa.
     ------------------------------------------------------------------------ */
  const bocGoi = (cat==="Bảo hành tại nhà") && !!x.goiGop && NB(x.actDH)!=null;
  /* nguồn ghi ĐỒNG -> quy về TRIỆU ngay tại biên đọc */
  const tgt=TRI(x.target), act=bocGoi?TRI(x.actDH):TRI(x.act);
  const goiGopHieuLuc = false;
  const nguonNote = bocGoi
    ? "Gói bán 2025 tách riêng khỏi Bảo hành tại nhà (mọi tháng) — Thực đạt BÊN TRONG = ĐH bên trong, không cộng gói"
    : "file dữ liệu tháng";
  if(tgt==null&&act==null) return calcDtUnitCatLegacy(code,loai,cat,S);
  const nhom=dtNhomOf(cat);   // "Bán gói năm 2025" đã chốt xong 100% -> không quy đổi lũy kế theo ngày
  const subKey=DT_TFIELD[cat]; // "doi1"/"bhmr"/"sckl" có thể có mốc lũy kế RIÊNG (D.ngayDaQuaNhom) — xem prRatio
  const ED=edSpec(D,S,code,loai,`dt.${DT_TFIELD[cat]}.target`,
                  bocGoi?`dt.${DT_TFIELD[cat]}.actDH`:`dt.${DT_TFIELD[cat]}.act`,1e6,prRatio(D,nhom,subKey));
  if(tgt!=null&&act!=null){
    const p=prApply(M(S),tgt,act,{sl:NB(x.slNguon),dgiaTB:NB(x.dgiaNguon),chinhXac:true,
      goiGop:goiGopHieuLuc, bocGoi, dtDonHang:TRI(x.actDH), nguon:nguonNote},nhom,subKey);
    return mkKpi(Object.assign({},base,p,{ed:ED}));
  }
  const lg=calcDtUnitCatLegacy(code,loai,cat,S);        // bù phần thiếu bằng nguồn cũ
  const p2=prApply(M(S), tgt!=null?tgt:lg.target, act!=null?act:lg.actual,
    Object.assign({},lg.meta||{},{sl:NB(x.slNguon),goiGop:goiGopHieuLuc,bocGoi},
      act==null?{uocTinh:!!(lg.meta&&lg.meta.uocTinh),buNguonCu:true}:{chinhXac:true,nguon:nguonNote}),nhom,subKey);
  return mkKpi(Object.assign({},base,p2,{ed:ED}));
}
function calcDtUnitCatLegacy(code,loai,cat,S=ST){
  const base={key:"dt:"+cat,name:DT_LABEL[cat]||cat,icon:"banknote",fmt:tr,unit:"tr đ"};
  const vg=vungOf(code);
  const NA=(reason,naLabel)=>mkKpi(Object.assign({},base,{target:null,actual:null,dataReason:reason,naLabel:naLabel}));
  if(loai==="kho"){
    if(cat==="Bảo hành tại kho"){
      if(isYear(S)){let t=0,a=0,n=0;eachMonth(S,(Dm,S2)=>{const k=calcDtUnitCat(code,loai,cat,S2);
        if(k.target!=null)t+=k.target; if(k.actual!=null){a+=k.actual;n++}});
        return mkKpi(Object.assign({},base,{target:t||null,actual:n?a:null}));}
      const D=M(S); if(!D) return NA("Kỳ này chưa có dữ liệu");
      const r=dtCatRaw(D,vg,cat,S);
      return mkKpi(Object.assign({},base,{target:r.target,actual:r.actual,meta:{luyKe:r.luyKe,chinhXac:true}}));
    }
    if(cat==="SCDV"){                          // dùng số THẬT theo kho từ khối BH tại kho
      if(isYear(S)){let t=0,a=0,n=0;eachMonth(S,(Dm,S2)=>{const k=calcDtUnitCat(code,loai,cat,S2);
        if(k.target!=null)t+=k.target; if(k.actual!=null){a+=k.actual;n++}});
        return mkKpi(Object.assign({},base,{target:t||null,actual:n?a:null}));}
      const D=M(S); const blk=D&&(D.bhTaiKho||[]).find(b=>blkCode(b.ten)==="scdv");
      const row=blk&&(blk.kho||[]).find(x=>KHO(x.ten)===code);
      const KY=S.ky==="Tháng"?"thang":(S.ky==="Tuần 1"?"t1":S.ky==="Tuần 2"?"t2":null);
      const c=row&&KY?row[KY]:null;
      if(!c) return NA(KY==null?"Nguồn chỉ có Tuần 1 / Tuần 2 / Lũy kế tháng":"Chưa có số liệu SCDV tại kho");
      return mkKpi(Object.assign({},base,{target:NB(c.target)/1e6,actual:NB(c.kq)/1e6,
        meta:{nguon:"Khối SCDV (phát triển ngoài) của báo cáo BH tại kho — không cộng vào TỔNG vùng để tránh trùng"}}));
    }
    return NA("1 đổi 1 / BHMR / Gói bán 2025 là nghiệp vụ của bảo hành TẠI NHÀ — không phát sinh ở kho bảo hành.","không áp dụng");
  }
  /* tại nhà: phân bổ từ cấp vùng */
  if(cat==="Bảo hành tại kho") return NA("Doanh thu bảo hành tại kho chỉ tính cho 2 kho Đà Nẵng và Khánh Hòa.","không áp dụng");
  if(isYear(S)){let t=0,a=0,l=0,n=0;eachMonth(S,(Dm,S2)=>{const k=calcDtUnitCat(code,loai,cat,S2);
    if(k.target!=null)t+=k.target; if(k.actual!=null){a+=k.actual;n++} if(k.meta&&k.meta.luyKe)l+=k.meta.luyKe;});
    return mkKpi(Object.assign({},base,{target:t||null,actual:n?a:null,
      meta:{luyKe:l,uocTinh:true,phanBo:PHANBO_LABEL[CONFIG.phanBo.mode]}}));}
  const D=M(S); if(!D) return NA("Kỳ này chưa có dữ liệu");
  const r=dtCatRaw(D,vg,cat,S), sh=shareNha(vg,S)[code];
  if(sh==null||r.target==null&&r.actual==null) return NA("Chưa có số liệu");
  return mkKpi(Object.assign({},base,{target:r.target!=null?r.target*sh:null,actual:r.actual!=null?r.actual*sh:null,
    meta:{luyKe:r.luyKe!=null?r.luyKe*sh:null,uocTinh:true,phanBo:PHANBO_LABEL[CONFIG.phanBo.mode],share:sh}}));
}
function sumKpi(list,name,icon,dir){
  const t=list.filter(k=>k&&k.target!=null), a=list.filter(k=>k&&k.actual!=null);
  const tg=t.length?t.reduce((s,k)=>s+k.target,0):null;
  const ac=a.length?a.reduce((s,k)=>s+k.actual,0):null;
  /* giữ lại thông tin kỳ lũy kế để hiển thị "dự kiến cả tháng" cho dòng tổng */
  const pr=list.find(k=>k&&k.meta&&k.meta.prorate);
  const meta={parts:list};
  if(pr&&ac!=null){ meta.prorate=pr.meta.prorate; meta.ngayDaQua=pr.meta.ngayDaQua;
    meta.ngayTrongThang=pr.meta.ngayTrongThang; meta.duKien=ac/pr.meta.prorate;
    /* target các phần đã là số CẢ THÁNG -> tổng cũng là cả tháng, chỉ suy ra số quy đổi */
    if(tg!=null){ meta.targetFull=tg; meta.targetQuyDoi=tg*pr.meta.prorate; } }
  return mkKpi({key:"sum",name,icon:icon||"banknote",fmt:tr,unit:"tr đ",dir:dir||"up",
    target:tg, actual:ac, meta});
}
/* BÊN TRONG / BÊN NGOÀI theo đúng công thức file mẫu.
   LƯU Ý (quy tắc khách chốt lại vòng 3): "Bảo hành tại nhà" nay LUÔN tách riêng
   Gói bán 2025 (xem calcDtUnitCat), nên BÊN TRONG = ĐH bên trong (nhà+kho)
   CỘNG THÊM dòng "Bán gói năm 2025" — nếu không tổng DOANH THU sẽ thiếu mất
   phần gói đã tách ra. */
const calcBenTrong=(S=ST)=>sumKpi([calcDoanhThuCat("Bảo hành tại nhà",S),
                                   calcDoanhThuCat("Bảo hành tại kho",S),
                                   calcDoanhThuCat("Bán gói năm 2025",S)],"BÊN TRONG","layers");
/* BÊN NGOÀI = TẤT CẢ nhóm ngoài (3 nhóm gốc + 5 nhóm mới) -> luôn khớp dòng
   "B. DOANH THU BÊN NGOÀI" của sheet TARGET. Thêm/bớt nhóm thì sửa DT_NGOAI_MOI
   ở parts/02-data.js, KHÔNG sửa ở đây.                                          */
const calcBenNgoai=(S=ST)=>sumKpi(DT_NGOAI_ALL.map(c=>calcDoanhThuCat(c,S)),"BÊN NGOÀI","trendup");
/* gộp riêng 5 nhóm mới — dùng cho 1 cột "DỊCH VỤ MỚI" trong bảng ma trận DOANH THU */
const calcNgoaiMoi=(S=ST)=>sumKpi(DT_NGOAI_MOI.map(x=>calcDoanhThuCat(x.cat,S)),"DỊCH VỤ MỚI","sparkles");
const calcNgoaiMoiUnit=(code,loai,S=ST)=>sumKpi(DT_NGOAI_MOI.map(x=>calcDtUnitCat(code,loai,x.cat,S)),"DỊCH VỤ MỚI","sparkles");
const calcTongDoanhThu=(S=ST)=>sumKpi([calcBenTrong(S),calcBenNgoai(S)],"TỔNG DOANH THU","trendup");

/* =============================================================================
   TARGET VƯỢT TRỘI — chỉ nhóm SỬA CHỮA KHÁCH LẺ
   Nguồn có 2 target song song cho nhóm này: Target CÔNG TY (dùng cho mọi bảng
   hiện hành) và Target VƯỢT TRỘI (chỉ tiêu phấn đấu). Hàm dưới trả về ĐÚNG cùng
   một thực đạt nhưng so với target vượt trội, để lớp trình bày dựng cụm cột thứ
   hai. KHÔNG cộng vào BÊN NGOÀI hay TỔNG DOANH THU — hai số đó vẫn theo target
   công ty như cũ.
   ============================================================================= */
const VT_BASE={key:"dt:vt",name:"Sửa Chữa Khách Lẽ (vượt trội)",icon:"trendup",fmt:tr,unit:"tr đ"};
/* target vượt trội của 1 đơn vị trong 1 tháng, đã quy về TRIỆU đồng */
function vtTargetRaw(D,code,loai){
  const r=tRec(D,code,loai);
  const x=r&&r.dt&&r.dt.sckl;
  return x?TRI(x.targetVT):null;
}
function calcVtUnit(code,loai,S=ST){
  const cty=calcDtUnitCat(code,loai,"SCDV",S);          // thực đạt + target công ty
  if(isYear(S)){
    let t=0,nt=0;
    eachMonth(S,(Dm,S2)=>{ const v=vtTargetRaw(Dm,code,loai); if(v!=null){t+=v;nt++} });
    return mkKpi(Object.assign({},VT_BASE,{target:nt?t:null,actual:cty.actual,
      meta:Object.assign({},cty.meta||{},{vuotTroi:true,ctyTarget:cty.target})}));
  }
  const D=M(S), tgt=D?vtTargetRaw(D,code,loai):null;
  if(tgt==null) return mkKpi(Object.assign({},VT_BASE,{target:null,actual:cty.actual,
    naLabel:"chưa có target vượt trội",
    dataReason:"Nguồn chưa ghi Target VƯỢT TRỘI cho đơn vị này ở kỳ này"}));
  /* doanh thu CÓ quy đổi lũy kế -> dùng chung cơ chế với target công ty */
  const p=prApply(D,tgt,cty.actual,Object.assign({},cty.meta||{},
    {vuotTroi:true, ctyTarget:cty.target,
     nguon:"Cột “Target VƯỢT TRỘI” của sheet DOANH THU"}));
  return mkKpi(Object.assign({},VT_BASE,p));
}
/* gộp toàn phạm vi đang lọc */
function calcVtTong(S=ST){
  const parts=dtUnitsOf("SCDV",S).map(([c,l])=>calcVtUnit(c,l,S));
  const k=sumKpi(parts,"SỬA CHỮA KHÁCH LẺ — THEO TARGET VƯỢT TRỘI","trendup");
  k.meta=Object.assign(k.meta||{},{vuotTroi:true});
  return k;
}

/* =============================================================================
   F. TỔNG HỢP — 5 thẻ KPI điều hành
   ============================================================================= */
function clTally(nha,kho,goi){
  const all=[...nha,...kho,...goi];
  const co=all.filter(k=>!k.noData&&!k.noCfg);
  const dat=co.filter(k=>k.dat).length;
  return {nha,kho,goi,all,tong:all.length,coDl:co.length,dat,
    rate: co.length?dat/co.length:null,
    label:`${dat}/${all.length}`};
}
/* TOÀN BỘ tiêu chí của biểu mẫu (sheet CHẤT LƯỢNG khi bung tiêu chí phụ, ma trận Tỉnh/Kho) */
function calcChatLuongTong(S=ST){
  const nha=showNha(S)?calcClNha(S):[], kho=showKho(S)?calcClKho(S):[];
  /* gói bảo hành: chỉ tính khi phạm vi có tỉnh bảo hành tại nhà (kho = không áp dụng) */
  const goi=showNha(S)?calcClGoi(S):[];
  return clTally(nha,kho,goi);
}
/* ĐÚNG 7 TIÊU CHÍ của SHEET TỔNG QUAN + slide 3 của deck — danh sách nằm ở LỚP DATA
   (CL_TQ7), KHÔNG chép lại ở đây. Loại: PHỤC VỤ 5 SAO tại kho, TRẢ NCC + CHUYỂN ĐSD,
   HÀNG HỦY và 2 tiêu chí GÓI BẢO HÀNH.                                            */
const clPickTQ7 = (list,loai)=>list.filter(k=>CL_TQ7_HAS(loai,k.key));
function calcChatLuongTQ7(S=ST){
  const nha=clPickTQ7(showNha(S)?calcClNha(S):[], "nha");
  const kho=clPickTQ7(showKho(S)?calcClKho(S):[], "kho");
  return Object.assign(clTally(nha,kho,[]),{tq7:true, boTieuChi:CL_TQ7});
}
/* Gộp KPI cấp điều hành CHỈ trên các thành phần THỰC SỰ có số thực đạt, và chỉ ra
   target khi MỌI thành phần đóng góp số thực đạt đều đã có target — tránh so lệch
   "thực đạt của 2 nhóm" với "target của 1 nhóm".
   o.weightParts (tuỳ chọn): mảng KPI cùng thứ tự/độ dài với `parts`, dùng làm
   TRỌNG SỐ khi o.avg=true (vd sản lượng, để ĐƠN GIÁ TB gộp là BQ GIA QUYỀN theo
   sản lượng chứ không phải bình quân đơn giản — đảm bảo SL × ĐG = DT). Không
   truyền weightParts thì avg vẫn là bình quân đơn giản như cũ. */
function rollupKpi(parts,o){
  const wp=o.weightParts;
  const wOf=(k,useTarget)=>{
    if(!wp) return 1;
    const w=wp[parts.indexOf(k)];
    const v=w?(useTarget?w.target:w.actual):null;
    return (v!=null&&v>0)?v:0;
  };
  const wavg=(list,useTarget)=>{
    const ws=list.reduce((s,k)=>s+wOf(k,useTarget),0);
    return ws ? list.reduce((s,k)=>s+(useTarget?k.target:k.actual)*wOf(k,useTarget),0)/ws
              : list.reduce((s,k)=>s+(useTarget?k.target:k.actual),0)/list.length;
  };
  const co=parts.filter(k=>k.actual!=null);
  const actual = co.length ? (o.avg ? wavg(co,false) : co.reduce((s,k)=>s+k.actual,0)) : null;
  const allT   = co.length && co.every(k=>k.target!=null);
  /* Chưa có thực đạt ở nhóm nào (vd tháng kế hoạch T9-T12): vẫn công bố TARGET thật
     của các nhóm có target, để thẻ hiện "target X · chưa có dữ liệu" thay vì
     "chưa cấu hình" — target ĐÃ có trong nguồn, chỉ thiếu thực đạt. */
  const tp = parts.filter(k=>k&&k.target!=null);
  const target = allT ? (o.avg ? wavg(co,true) : co.reduce((s,k)=>s+k.target,0))
               : (!co.length && tp.length ? (o.avg ? wavg(tp,true) : tp.reduce((s,k)=>s+k.target,0)) : null);
  /* giữ thông tin kỳ lũy kế để thẻ điều hành cũng nêu được "dự kiến cả tháng" */
  const pr=co.find(k=>k.meta&&k.meta.prorate);
  const meta=Object.assign({},o.meta||{});
  if(pr&&actual!=null&&!o.avg){ meta.prorate=pr.meta.prorate; meta.ngayDaQua=pr.meta.ngayDaQua;
    meta.ngayTrongThang=pr.meta.ngayTrongThang; meta.duKien=actual/pr.meta.prorate;
    if(target!=null){ meta.targetFull=target; meta.targetQuyDoi=target*pr.meta.prorate; } }
  return mkKpi(Object.assign({},o,{target,actual,meta}));
}
function calcExec(S=ST){
  /* thẻ CHẤT LƯỢNG cấp điều hành = ĐÚNG 7 tiêu chí Tổng quan (khách chốt) */
  const q=calcChatLuongTQ7(S);
  const slN=calcSanLuongTong("nha",S), slK=calcSanLuongTong("kho",S);
  const sl=rollupKpi([slN,slK],{key:"sanluong",name:"SẢN LƯỢNG",icon:"pkg",fmt:f0,unit:"đơn",
    cfgKey:"sanLuong",cfgReason:"Nguồn không có target sản lượng — cần cấu hình",
    dataReason:"Chỉ có sản lượng của 2 kho BH tại kho",meta:{nha:slN,kho:slK}});
  /* trend sản lượng so tháng liền trước */
  let trend=null, trendNote=null;
  if(!isYear(S)&&sl.actual!=null){
    const pm=S.thang>1?S.thang-1:12, py=S.thang>1?S.nam:S.nam-1;
    if(DB.ky[kyKey(py,pm)]){
      const S2=Object.assign({},S,{nam:py,thang:pm,ky:"Tháng"});
      /* so CÙNG PHẠM VI (tại nhà + tại kho); kỳ lũy kế thì so bằng số DỰ KIẾN cả tháng */
      const pn=calcSanLuongTong("nha",S2), pk=calcSanLuongTong("kho",S2);
      const prevParts=[pn,pk].filter(x=>x&&x.actual!=null);
      const prev=prevParts.length?prevParts.reduce((s,x)=>s+x.actual,0):null;
      const prevDK=prevParts.some(x=>x.meta&&x.meta.duKien!=null)
        ? prevParts.reduce((s,x)=>s+((x.meta&&x.meta.duKien!=null)?x.meta.duKien:x.actual),0) : prev;
      const cur=(sl.meta&&sl.meta.duKien!=null)?sl.meta.duKien:sl.actual;
      if(prevDK){ trend=(cur-prevDK)/prevDK;
        trendNote=(sl.meta&&sl.meta.duKien!=null)?"so sánh bằng số dự kiến cả tháng":"so tháng liền trước"; }
    }
  }
  sl.meta=Object.assign(sl.meta||{},{trend,trendNote});
  const dgN=calcDonGia("nha",S), dgK=calcDonGia("kho",S);
  /* ĐƠN GIÁ TB gộp (nhà+kho) PHẢI là bình quân GIA QUYỀN theo sản lượng (weightParts:
     slN/slK), không phải bình quân giản đơn — nếu không SL × ĐG ≠ DT (khách chốt lại
     vòng 3: nhân Sản lượng với Đơn giá trung bình phải ra đúng Doanh thu đơn hàng). */
  const dgPairs=[[dgN,slN,showNha(S)],[dgK,slK,showKho(S)]].filter(p=>p[2]);
  const dgParts=dgPairs.map(p=>p[0]), dgWeights=dgPairs.map(p=>p[1]);
  const dg=rollupKpi(dgParts,{key:"dongia",name:"ĐƠN GIÁ TB",icon:"coins",fmt:vnd,unit:"đ/đơn",avg:true,
    weightParts:dgWeights,
    tmp:CONFIG.donGia.tamThoi,cfgKey:"donGia",
    cfgReason:"Chưa cấu hình đủ target đơn giá cho các loại hình đang hiển thị",
    meta:{nha:dgN,kho:dgK}});
  const cp=calcChiPhiAll(S);
  const dt=calcTongDoanhThu(S);
  return {
    chatLuong:Object.assign({},q,{key:"chatluong",name:"CHẤT LƯỢNG",icon:"shield",
      status: q.rate==null?"none":statusOf(q.rate,"up"), q}),
    sanLuong:sl, donGia:dg, chiPhi:cp, doanhThu:dt
  };
}

/* --- DỰ KIẾN CUỐI THÁNG của 1 KPI ------------------------------------------
   Nhóm CÓ quy đổi lũy kế (sản lượng, doanh thu) -> suy ra từ nhịp ngày đã qua.
   Nhóm KHÔNG quy đổi (chi phí, đơn giá, chất lượng) -> số đang có CHÍNH LÀ số cả tháng. */
function duKienOf(k){
  if(!k) return null;
  return (k.meta && NB(k.meta.duKien)!=null) ? k.meta.duKien : NB(k.actual);
}
/* =============================================================================
   F2. BẢNG TỔNG HỢP 5 LĨNH VỰC — HỢP ĐỒNG 5 THÔNG TIN (khách chốt)
   TARGET (cả tháng) · THỰC ĐẠT HIỆN TẠI · LŨY KẾ CUỐI THÁNG (dự kiến)
   · KẾT QUẢ ĐẾN HIỆN TẠI · TỶ LỆ DỰ KIẾN ĐẠT · ĐÁNH GIÁ
   Dùng CHUNG cho bảng tổng hợp của sheet TỔNG QUAN và slide TỔNG QUAN của deck —
   một nguồn duy nhất nên web và PowerPoint không bao giờ lệch nhau.
   ============================================================================= */
const DG_TEXT = {good:"ĐẠT", warn:"KHÔNG ĐẠT", bad:"KHÔNG ĐẠT", none:"CHƯA CÓ DỮ LIỆU"};
function calcTongQuanRows(S=ST){
  const ex=calcExec(S), q=ex.chatLuong;
  const D=M(S), lk=(D&&isLuyKe(D)&&!isYear(S));
  /* TARGET luôn là số CẢ THÁNG. Kỳ chưa trọn tháng thì %HT chấm theo dự kiến cuối
     tháng, kèm dòng nhỏ nêu tiến độ thật đến hôm nay.                            */
  const ghiChuLK=(k)=>{
    if(!lk||!k.coTienDo) return "";
    const soNgay = D&&D.ngayDaQua&&D.ngayTrongThang ? `${D.ngayDaQua}/${D.ngayTrongThang} ngày` : "";
    return `Target cả tháng · kỳ mới đi ${soNgay} nên %HT chấm theo dự kiến cuối tháng`;
  };
  /* KỲ BÁM KẾ HOẠCH (vd T8-12): target là tổng cả kỳ, thực đạt mới có vài tháng ->
     nêu rõ tiến độ, KHÔNG chấm ĐẠT/KHÔNG ĐẠT cho các nhóm cộng dồn.              */
  const keHoach = kyKeHoach(S);
  const msSel=selMonths(S), msThieu=kyThieu(S), nCo=msSel.length-msThieu.length;
  const CONG_DON={sanLuong:1, chiPhi:1, doanhThu:1};
  const mk=(key,label,k,ghiChu)=>{
    const dk=duKienOf(k);
    const kh = keHoach && CONG_DON[key];
    const ghiChuKH = kh
      ? `Target cộng dồn ${msSel.length} tháng · mới có số ${nCo}/${msSel.length} tháng `
        +`(${msThieu.map(m=>"T"+m).join(", ")} chưa có thực đạt)`
      : "";
    return {key, label, kpi:k,
      target:k.target, actual:k.actual, duKien:dk, rate:k.rate,
      status:k.status, dat:k.status==="good", fmt:k.fmt, unit:k.unit||"",
      keHoach: !!kh, soThangCo:nCo, soThangKy:msSel.length,
      tText: k.target==null?"chưa cấu hình":k.fmt(k.target),
      aText: k.actual==null?"–":k.fmt(k.actual),
      dText: dk==null?"–":k.fmt(dk),
      rText: k.rate==null?"–":pc1(k.rate),
      /* tỷ lệ nhỏ: tiến độ thật đến hôm nay so với target CẢ THÁNG */
      coTienDo: !!k.coTienDo,
      rNowText: k.coTienDo?pc1(k.rateNow):"",
      dgText: kh ? `ĐANG THEO KẾ HOẠCH (${nCo}/${msSel.length} tháng)`
                 : (DG_TEXT[k.status]||"CHƯA CÓ DỮ LIỆU"),
      ghiChu: ghiChuKH || ghiChu || ""};
  };
  return [
    {key:"chatLuong", label:"CHẤT LƯỢNG", kpi:q,
     target:CL_TQ7_N, actual:q.dat, duKien:q.dat, rate:q.rate,
     status:q.status, dat:q.status==="good", fmt:f0, unit:"tiêu chí",
     tText:`${CL_TQ7_N} tiêu chí`,
     aText:q.coDl?`${q.dat}/${q.coDl} đạt`:"–",
     dText:q.coDl?`${q.dat}/${q.coDl} đạt`:"–",
     rText:q.rate==null?"–":pc1(q.rate), coTienDo:false, rNowText:"",
     dgText:DG_TEXT[q.status]||"CHƯA CÓ DỮ LIỆU",
     ghiChu:`${CL_TQ7_N} tiêu chí Tổng quan: 5 tại nhà + 2 tại kho`},
    mk("sanLuong","SẢN LƯỢNG",ex.sanLuong, ghiChuLK(ex.sanLuong)),
    mk("donGia","ĐƠN GIÁ TRUNG BÌNH",ex.donGia,"Số bình quân — không cộng dồn, không quy đổi"),
    mk("chiPhi","CHI PHÍ (đảo chiều)",ex.chiPhi,
       lk?"So thẳng ĐỊNH MỨC CẢ THÁNG — chi phí không quy đổi lũy kế":"Thực chi ≤ định mức = ĐẠT"),
    mk("doanhThu","TỔNG DOANH THU",ex.doanhThu, ghiChuLK(ex.doanhThu))
  ];
}

/* =============================================================================
   G. MA TRẬN TỈNH / KHO + PERFORMANCE SCORE (chỉ lớp hiển thị)
   ============================================================================= */
function unitRow(code,loai,S=ST){
  /* ma trận TỈNH/KHO: dòng tại nhà có thêm 2 cột chất lượng GÓI BẢO HÀNH;
     dòng tại kho giữ nguyên 5 tiêu chí (gói bảo hành không áp dụng). */
  const clGoi= loai==="kho" ? [] : calcClGoiUnit(code,"nha",S);
  const cl   = loai==="kho" ? calcClKhoUnit(code,S) : [...calcClNhaTinh(code,S),...clGoi];
  const sl   = calcSanLuongUnit(code,loai,S);
  const dg   = calcDonGiaUnit(code,loai,S);
  const cp   = calcChiPhiUnit(code,loai,S);
  const dtIn = calcDtUnitCat(code,loai, loai==="kho"?"Bảo hành tại kho":"Bảo hành tại nhà",S);
  const goi  = calcDtUnitCat(code,loai,"Bán gói năm 2025",S);
  const d11  = calcDtUnitCat(code,loai,"BH 1 đổi 1",S);
  const bhmr = calcDtUnitCat(code,loai,"BHMR",S);
  const scdv = calcDtUnitCat(code,loai,"SCDV",S);
  /* Gói bán 2025 tách riêng khỏi "Bảo hành tại nhà" (quy tắc khách chốt lại vòng 3)
     -> phải cộng thêm dòng gói vào BÊN TRONG, nếu không sẽ thiếu doanh thu */
  const benTrong = sumKpi([dtIn,goi],"BÊN TRONG","layers");
  const moi      = calcNgoaiMoiUnit(code,loai,S);
  const benNgoai = sumKpi([d11,bhmr,scdv,moi],"BÊN NGOÀI","trendup");
  const tongDt   = sumKpi([benTrong,benNgoai],"TỔNG DOANH THU","trendup");
  const co = cl.filter(k=>!k.noData&&!k.noCfg);
  const datCl = co.filter(k=>k.dat).length;
  return {code,loai,tinh:tinhOf(code),vung:vungOf(code),
    cl,clGoi,datCl,tongCl:cl.length,coCl:co.length,
    chungText: co.length?`${datCl}/${co.length} ĐẠT`:"–",
    sl,dg,cp,dtIn,goi,d11,bhmr,scdv,moi,benTrong,benNgoai,tongDt,
    score:perfScore({cl,sl,dg,cp,tongDt})};
}
/* Performance Score 0-100 — CHỈ để xếp hạng/hiển thị, KHÔNG đổi KPI nguồn.
   Điểm từng nhóm = min(rate,1.2)/1.2*100 (chi phí đảo chiều). Chỉ tính nhóm CÓ dữ liệu,
   trọng số chuẩn hoá lại theo các nhóm có dữ liệu. */
function perfScore(o){
  const W=CONFIG.scoreWeight, parts=[];
  const co=(o.cl||[]).filter(k=>!k.noData&&!k.noCfg);
  if(co.length) parts.push([W.chatLuong, co.reduce((s,k)=>s+clamp(k.rate/1.2,0,1),0)/co.length*100]);
  const add=(w,k,dir)=>{ if(kpiOK(k)) parts.push([w, dir==="down"
    ? clamp((2-k.rate)/1.2,0,1)*100 : clamp(k.rate/1.2,0,1)*100]); };
  add(W.sanLuong,o.sl); add(W.donGia,o.dg); add(W.chiPhi,o.cp,"down"); add(W.doanhThu,o.tongDt);
  const tw=parts.reduce((s,p)=>s+p[0],0);
  if(!tw) return {val:null,band:"none",label:"Chưa đủ dữ liệu",nParts:0};
  const v=parts.reduce((s,p)=>s+p[0]*p[1],0)/tw;
  const band = v>=90?"excellent": v>=75?"good": v>=60?"watch":"critical";
  /* nhãn tiếng Việt — người xem là Ban Tổng Giám đốc, không dùng chữ Anh */
  const label={excellent:"XUẤT SẮC",good:"TỐT",watch:"CẦN THEO DÕI",critical:"BÁO ĐỘNG"}[band];
  return {val:v,band,label,nParts:parts.length,
    status:{excellent:"good",good:"good",watch:"warn",critical:"bad"}[band]};
}
function allUnitRows(S=ST){
  const out=[];
  if(showKho(S)) for(const k of unitsKho(S)) out.push(unitRow(k,"kho",S));
  if(showNha(S)) for(const k of unitsNha(S)) out.push(unitRow(k,"nha",S));
  return out;
}
const SORTS=[
  {v:"default", t:"Mặc định (Vùng → Tỉnh)"},
  {v:"kpi_asc", t:"KPI thấp nhất trước"},
  {v:"kpi_desc",t:"KPI cao nhất trước"},
  {v:"dt_desc", t:"Doanh thu cao → thấp"},
  {v:"sl_desc", t:"Sản lượng cao → thấp"},
  {v:"cp_desc", t:"Chi phí cao → thấp"}
];
function sortRows(rows,mode){
  const r=rows.slice();
  const sc=x=>x.score&&x.score.val!=null?x.score.val:-1;
  if(mode==="kpi_asc")  r.sort((a,b)=>sc(a)-sc(b));
  else if(mode==="kpi_desc") r.sort((a,b)=>sc(b)-sc(a));
  else if(mode==="dt_desc")  r.sort((a,b)=>(b.tongDt.actual||0)-(a.tongDt.actual||0));
  else if(mode==="sl_desc")  r.sort((a,b)=>(b.sl.actual||0)-(a.sl.actual||0));
  else if(mode==="cp_desc")  r.sort((a,b)=>(b.cp.actual||0)-(a.cp.actual||0));
  return r;
}
function calcRanking(S=ST){
  const rows=allUnitRows(S).filter(r=>r.score.val!=null);
  const s=rows.slice().sort((a,b)=>b.score.val-a.score.val);
  return {top:s.slice(0,5), bottom:s.slice(-5).reverse().filter(r=>s.indexOf(r)>=0)};
}

/* =============================================================================
   G2. XU HƯỚNG THEO THÁNG — dữ liệu cho "biểu đồ xu hướng" của từng module.
   Hàm THUẦN: trả {months, labels, series:[{name,key,data[],fmt}], selected[]}.
   · Tháng chưa có thực đạt (T9-T12) trả null -> lớp vẽ để TRỐNG ("chưa có dữ liệu"),
     TUYỆT ĐỐI không vẽ 0.
   · Luôn chạy trên phạm vi lọc hiện tại (vùng / tỉnh / loại hình).
   ============================================================================= */
const TREND_SPAN = 12;
function trendMonths(S=ST){
  const all=monthsOf(S.nam);
  const sel=selMonths(S);
  /* chọn ≥2 tháng -> chỉ vẽ đúng các tháng đã chọn; chọn 1 tháng -> vẽ cả 12 tháng để thấy xu hướng */
  const ms=(sel.length>1)?sel:(all.length?all:[S.thang]);
  return {ms:ms.slice(0,TREND_SPAN), sel};
}
function trendSeries(which,S=ST){
  const {ms,sel}=trendMonths(S);
  const mk=m=>Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
  const out={months:ms, labels:ms.map(m=>"T"+m), selected:ms.map(m=>sel.indexOf(m)>=0), series:[], fmt:f0, axisFmt:f0, note:""};
  /* LỚP CALC không biết màu — lớp trình bày gán màu theo bảng màu đã thẩm định */
  const push=(name,key,fn)=>out.series.push({name,key,data:ms.map(m=>{try{return fn(mk(m))}catch(_){return null}})});
  if(which==="chatLuong"){
    out.fmt=pcv; out.axisFmt=v=>Math.round(v)+"%";   /* data đã ×100 -> pcv, không phải pc1 */
    push("Tỷ lệ tiêu chí đạt","dat",S2=>{const q=clPhuOn()?calcChatLuongTong(S2):calcChatLuongTQ7(S2); return q.rate==null?null:q.rate*100});
    push("Mốc mục tiêu 100%","tgt",()=>100);
    out.note="Tỷ lệ = số tiêu chí ĐẠT / số tiêu chí CÓ DỮ LIỆU trong tháng. Tháng chưa có thực đạt để trống.";
  }else if(which==="sanLuong"){
    out.fmt=f0; out.axisFmt=f0;
    push("Đơn hàng thực đạt","act",S2=>{const a=calcSanLuongTong("nha",S2),b=calcSanLuongTong("kho",S2);
      const p=[a,b].filter(k=>k.actual!=null); return p.length?p.reduce((s,k)=>s+k.actual,0):null});
    push("Target đơn hàng","tgt",S2=>{const a=calcSanLuongTong("nha",S2),b=calcSanLuongTong("kho",S2);
      const p=[a,b].filter(k=>k.target!=null); return p.length?p.reduce((s,k)=>s+k.target,0):null});
    out.note="Đơn vị: đơn hàng. Target tháng 8 đã quy đổi theo số ngày đã qua (15/31).";
  }else if(which==="donGia"){
    out.fmt=vnd; out.axisFmt=v=>fx(v/1000,0)+"k";
    push("Đơn giá TB thực đạt","act",S2=>{const p=[showNha(S2)?calcDonGia("nha",S2):null,showKho(S2)?calcDonGia("kho",S2):null]
      .filter(k=>k&&k.actual!=null); return p.length?p.reduce((s,k)=>s+k.actual,0)/p.length:null});
    push("Target đơn giá","tgt",S2=>{const p=[showNha(S2)?calcDonGia("nha",S2):null,showKho(S2)?calcDonGia("kho",S2):null]
      .filter(k=>k&&k.target!=null); return p.length?p.reduce((s,k)=>s+k.target,0)/p.length:null});
    out.note="Đơn giá là số BÌNH QUÂN nên không cộng dồn; nhiều tháng = bình quân gia quyền theo sản lượng.";
  }else if(which==="chiPhi"){
    out.fmt=tr; out.axisFmt=v=>fx(v,0);
    push("Chi phí thực tế","act",S2=>calcChiPhiAll(S2).actual);
    push("Định mức","tgt",S2=>calcChiPhiAll(S2).target);
    out.note="Đơn vị: triệu đồng. KPI ĐẢO CHIỀU — đường chi phí thực tế nằm DƯỚI đường định mức mới là ĐẠT. "
      +"Chi phí <b>KHÔNG quy đổi ×15/31</b>: số chi phí nguồn đã là lũy kế cuối tháng nên so thẳng với định mức cả tháng.";
  }else if(which==="doanhThu"){
    out.fmt=tr; out.axisFmt=v=>fx(v,0);
    push("Doanh thu thực đạt","act",S2=>calcTongDoanhThu(S2).actual);
    push("Target doanh thu","tgt",S2=>calcTongDoanhThu(S2).target);
    push("Bên trong","bt",S2=>calcBenTrong(S2).actual);
    out.note="Đơn vị: triệu đồng. Target tháng 8 đã quy đổi ×15/31 để so sánh công bằng.";
  }else{ /* "tongQuan" */
    out.fmt=pcv; out.axisFmt=v=>Math.round(v)+"%";   /* data đã ×100 -> pcv, không phải pc1 */
    push("Chất lượng","cl",S2=>{const r=calcChatLuongTQ7(S2).rate; return r==null?null:r*100});
    push("Doanh thu","dt",S2=>{const r=calcTongDoanhThu(S2).rate; return r==null?null:r*100});
    push("Kiểm soát chi phí","cp",S2=>{const r=calcChiPhiAll(S2).rate; return r==null?null:(2-r)*100});
    out.note=`Tất cả quy về <b>% hoàn thành so với target</b> nên 3 lĩnh vực khác đơn vị vẫn so được trên một thang. Cột kiểm soát chi phí = (2 − chi/định mức) × 100 để cao hơn = tốt hơn. Chất lượng ở Tổng quan chấm đúng <b>${CL_TQ7_N} tiêu chí</b>.`;
  }
  return out;
}

/* =============================================================================
   H. HÀNH ĐỘNG — tự sinh từ các KPI chưa đạt + phần người dùng tự thêm
   ============================================================================= */
const NOTES = DB.notes;
function actKey(S=ST){
  if(S.ky==="Năm") return `${S.nam}-NAM`;
  if(isMulti(S))   return `${S.nam}-M${selMonths(S).join(".")}`;
  return kyKey(S.nam,S.thang); }
function manualList(K){ const m=NOTES.__manual=NOTES.__manual||{}; m[K]=m[K]||[]; return m[K]; }
const NGUYEN_NHAN={
  chatLuong:"Điểm/chỉ tiêu chất lượng dưới chuẩn tập trung ở một nhóm thợ hoặc đơn cuối ngày",
  chiPhi:"Chi phí thực tế vượt định mức phân bổ trong kỳ",
  doanhThu:"Sản lượng đơn / bán gói chưa theo kịp nhịp target tháng",
  sanLuong:"Sản lượng đơn hàng thấp hơn target đã cấu hình",
  goiBaoHanh:"Hồ sơ gói bảo hành (1 đổi 1 / BHMR) xử lý trễ hạn cam kết — thiếu linh kiện, chậm duyệt hoặc chậm bàn giao"
};
const HANH_DONG={
  chatLuong:"Rà soát 100% đơn điểm thấp, kèm cặp 1-1 với thợ yếu, TN gọi lại khách trong 24h",
  chiPhi:"Rà lại thưởng đơn & chi phí quản lý; siết các khoản phát sinh ngoài định mức",
  doanhThu:"Giao chỉ tiêu tuần đến từng kho & từng thợ; chốt danh sách khách tiềm năng mỗi sáng",
  sanLuong:"Tăng nhịp nhận đơn, mở rộng khung giờ phục vụ, điều phối lại nhân sự theo tải",
  goiBaoHanh:"Rà soát từng hồ sơ trễ hạn: chốt ngày cam kết với khách, đẩy nhanh duyệt đổi máy / linh kiện, báo cáo tiến độ hằng ngày"
};
function calcActionSeeds(S=ST){
  const K=actKey(S), out=[];
  const push=(id,tieuChi,noi,nhom,kpiTxt,ttTxt,rate)=>out.push({
    id:K+"|"+id, auto:true, tieuChi, noi,
    nguyenNhan:NGUYEN_NHAN[nhom]||"", hanhDong:HANH_DONG[nhom]||"",
    kpi:kpiTxt, thucDat:ttTxt, rate, nhom
  });
  /* chất lượng tại nhà — theo từng tỉnh */
  if(showNha(S)) for(const code of unitsNha(S)){
    for(const k of calcClNhaTinh(code,S)) if(kpiOK(k)&&!k.dat)
      push(`nha|${code}|${k.key}`, k.name, `${tinhOf(code)} (${code})`, "chatLuong",
        k.fmt(k.target), k.fmt(k.actual), k.rate);
  }
  /* chất lượng tại kho */
  if(showKho(S)) for(const code of unitsKho(S)){
    for(const k of calcClKhoUnit(code,S)) if(kpiOK(k)&&!k.dat)
      push(`kho|${code}|${k.key}`, k.name, `Kho ${tinhOf(code)} (${code})`, "chatLuong",
        k.fmt(k.target), k.fmt(k.actual), k.rate);
  }
  /* chất lượng GÓI BẢO HÀNH — chỉ 12 tỉnh tại nhà (2 kho không áp dụng, bỏ qua) */
  if(showNha(S)) for(const code of unitsNha(S)){
    for(const k of calcClGoiUnit(code,"nha",S)) if(kpiOK(k)&&!k.dat)
      push(`goi|${code}|${k.key}`, "GÓI BẢO HÀNH — "+k.name, `${tinhOf(code)} (${code})`, "goiBaoHanh",
        k.fmt(k.target), k.fmt(k.actual), k.rate);
  }
  /* chi phí vượt định mức (đảo chiều) */
  for(const r of allUnitRows(S)) if(kpiOK(r.cp)&&!r.cp.dat)
    push(`cp|${r.code}`, "CHI PHÍ vượt định mức", `${r.loai==="kho"?"Kho ":""}${r.tinh} (${r.code})`, "chiPhi",
      "≤ "+tr(r.cp.target), tr(r.cp.actual), r.cp.rate);
  /* doanh thu theo nhóm */
  for(const cat of ["Bảo hành tại nhà","Bảo hành tại kho","Bán gói năm 2025"].concat(DT_NGOAI_ALL)){
    const k=calcDoanhThuCat(cat,S);
    if(kpiOK(k)&&!k.dat) push(`dt|${cat}`, "DOANH THU — "+(DT_LABEL[cat]||cat), scopeLbl(S), "doanhThu",
      tr(k.target), tr(k.actual), k.rate);
  }
  /* sản lượng */
  for(const loai of ["nha","kho"]){
    if(loai==="nha"&&!showNha(S))continue; if(loai==="kho"&&!showKho(S))continue;
    const k=calcSanLuongTong(loai,S);
    if(kpiOK(k)&&!k.dat) push(`sl|${loai}`, "SẢN LƯỢNG — "+(loai==="kho"?"Bảo hành tại kho":"Bảo hành tại nhà"),
      scopeLbl(S), "sanLuong", f0(k.target), f0(k.actual), k.rate);
  }
  return out;
}
const ACT_STATUS=[
  {v:"Hoàn tất",       d:"🟢", cls:"good"},
  {v:"Đang xử lý",     d:"🔵", cls:"navy"},
  {v:"Có nguy cơ trễ", d:"🟡", cls:"warn"},
  {v:"Quá hạn",        d:"🔴", cls:"bad"}
];
function todayISO(){const d=new Date();return d.toISOString().slice(0,10)}
function daysBetween(a,b){ if(!a||!b) return null;
  const x=new Date(a),y=new Date(b); if(isNaN(x)||isNaN(y))return null;
  return Math.round((y-x)/86400000); }
function calcActions(S=ST){
  const K=actKey(S);
  const seeds=calcActionSeeds(S).filter(r=>!(NOTES[r.id]&&NOTES[r.id].deleted));
  const man=manualList(K).filter(r=>!(NOTES[r.id]&&NOTES[r.id].deleted));
  const all=[...seeds,...man];
  return all.map((r,i)=>{
    const n=NOTES[r.id]||{};
    const get=(f,d)=>n[f]!=null&&n[f]!==""?n[f]:d;
    const kpiV     = get("kpi",r.kpi||"");
    const thucDatV = get("thucDat",r.thucDat||"");
    /* Tỷ lệ = Thực đạt / KPI — tự tính, cho phép ghi đè thủ công */
    let tyle = n.tyle!=null&&n.tyle!=="" ? n.tyle : null;
    let tyleAuto=null;
    const numOf=s=>{const m=String(s).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",",".");
      const v=parseFloat(m); return isFinite(v)?v:null};
    const a=numOf(thucDatV), b=numOf(kpiV);
    if(a!=null&&b) tyleAuto=a/b;
    else if(r.rate!=null) tyleAuto=r.rate;
    const rate = tyle!=null ? (parseFloat(String(tyle).replace(",","."))/100) : tyleAuto;
    const ngayTH  = get("ngayTH", r.auto?todayISO():"");
    const ngayHT  = get("ngayHT","");
    const tinhTrang = get("tinhTrang", r.auto?"Đang xử lý":"Đang xử lý");
    const progress = NB(+get("progress", tinhTrang==="Hoàn tất"?100:(tinhTrang==="Đang xử lý"?40:0)))||0;
    const aging = ngayHT ? daysBetween(ngayTH,ngayHT) : daysBetween(ngayTH,todayISO());
    const prio = rate==null?3 : (rate<0.9?1 : rate<1?2 : 3);
    return {
      stt:i+1, id:r.id, auto:!!r.auto,
      tieuChi:get("tieuChi",r.tieuChi||""), noi:get("noi",r.noi||""),
      nguyenNhan:get("nguyenNhan",r.nguyenNhan||""), hanhDong:get("hanhDong",r.hanhDong||""),
      nguoi:get("nguoi", r.auto?"Nguyễn Duy Thu / TN kho":""),
      ngayTH, ngayHT, tinhTrang, progress,
      kpi:kpiV, thucDat:thucDatV, rate, tyleManual:tyle!=null, aging, prio, nhom:r.nhom||""
    };
  });
}

/* =============================================================================
   I. ĐÁNH GIÁ tự sinh (người dùng sửa được, lưu vào kho dữ liệu)
   ============================================================================= */
function evalKey(which,S=ST){ return `__eval|${actKey(S)}|${S.vung}|${S.kho}|${S.loai}|${which}`; }
function autoEvalChatLuong(S=ST){
  /* theo đúng bộ tiêu chí đang hiển thị ở sheet CHẤT LƯỢNG (7 tiêu chí, hoặc đủ khi bật tiêu chí phụ) */
  const q=clPhuOn()?calcChatLuongTong(S):calcChatLuongTQ7(S);
  const miss=q.all.filter(k=>!k.noData&&!k.noCfg&&!k.dat);
  const nd=q.all.filter(k=>k.noData||k.noCfg);
  if(!q.coDl) return `Chất lượng ${scopeLbl(S)} — ${kyLabel(S)}: CHƯA CÓ DỮ LIỆU THỰC ĐẠT. `
    +`Kỳ này mới có TARGET cho ${q.all.filter(k=>k.target!=null).length}/${q.tong} tiêu chí của biểu mẫu `
    +`(đang chấm ${q.tong} tiêu chí${q.tq7?` — đúng ${CL_TQ7_N} tiêu chí Tổng quan`:` = ${CL_NHA.length} tại nhà + ${CL_KHO.length} tại kho + ${CL_GOI.length} gói bảo hành`}) — `
    +`chưa đánh giá đạt/chưa đạt cho tiêu chí nào.`;
  let s=`Chất lượng ${scopeLbl(S)} — ${kyLabel(S)}: đạt ${q.dat}/${q.coDl} tiêu chí có dữ liệu (trên ${q.tong} tiêu chí đang chấm${q.tq7?", đúng bộ 7 tiêu chí Tổng quan":""}).`;
  s+= miss.length ? ` Chưa đạt: ${miss.map(k=>`${k.name} (${k.fmt(k.actual)} / target ${k.fmt(k.target)})`).join("; ")}.`
                  : " Toàn bộ tiêu chí có dữ liệu đều ĐẠT.";
  if(nd.length) s+=` Chưa có dữ liệu: ${nd.map(k=>k.name).join("; ")} — không đánh giá đạt/chưa đạt.`;
  return s;
}
function autoEvalSanLuong(S=ST){
  const slN=calcSanLuongTong("nha",S), slK=calcSanLuongTong("kho",S), cp=calcChiPhiAll(S);
  const dgN=calcDonGia("nha",S), dgK=calcDonGia("kho",S);
  let s=`Sản lượng — Đơn giá — Chi phí ${scopeLbl(S)} (${kyLabel(S)}). `;
  s+= slN.actual!=null ? `Sản lượng bảo hành tại nhà: ${f0(slN.actual)} đơn${slN.target!=null?` / target ${f0(slN.target)} (${pc(slN.rate)})`:""}. ` : "Sản lượng bảo hành tại nhà chưa có dữ liệu kỳ này. ";
  s+= slK.actual!=null ? `Tại kho: ${f0(slK.actual)} đơn${slK.target!=null?` / target ${f0(slK.target)} (${pc(slK.rate)})`:""}. ` : "";
  s+= (dgN.actual!=null||dgK.actual!=null)
    ? `Đơn giá TB: tại nhà ${vnd(dgN.actual)}${dgN.target!=null?` / target ${vnd(dgN.target)}`:""} · tại kho ${vnd(dgK.actual)}${dgK.target!=null?` / target ${vnd(dgK.target)}`:""}. `
    : "Đơn giá TB chưa có dữ liệu kỳ này. ";
  const Dlk=M(S);
  if(Dlk&&isLuyKe(Dlk)&&!isYear(S)) s+=`Kỳ mới đi ${Dlk.ngayDaQua}/${Dlk.ngayTrongThang} ngày — target ${PR_TEXT.ap} đã quy đổi theo số ngày đã qua; `
    +`riêng CHI PHÍ so thẳng với định mức CẢ THÁNG vì số chi phí nguồn đã là lũy kế cuối tháng. `;
  if(kpiOK(cp)) s+= cp.dat
    ? `Chi phí ${tr(cp.actual)} nằm trong định mức ${tr(cp.target)} — kiểm soát ${pc(cp.rate)}.`
    : `Chi phí ${tr(cp.actual)} VƯỢT định mức ${tr(cp.target)} (${pc(cp.rate)}), chênh ${tr(cp.actual-cp.target)}.`;
  return s;
}
function autoEvalDoanhThu(S=ST){
  const bt=calcBenTrong(S), bn=calcBenNgoai(S), tg=calcTongDoanhThu(S);
  let s=`Doanh thu ${scopeLbl(S)} (${kyLabel(S)}): tổng ${tr(tg.actual)}${tg.target!=null?` / target ${tr(tg.target)} → ${pc(tg.rate)}`:""}. `;
  s+= `Bên trong ${tr(bt.actual)}${bt.target!=null?` (${pc(bt.rate)})`:""}; bên ngoài ${tr(bn.actual)}${bn.target!=null?` (${pc(bn.rate)})`:""}. `;
  const cats=["Bảo hành tại nhà","Bảo hành tại kho","Bán gói năm 2025"]
             .concat(DT_NGOAI_ALL).map(c=>calcDoanhThuCat(c,S));
  const co=cats.filter(kpiOK), yeu=co.filter(k=>!k.dat);
  if(!co.length) return `Doanh thu ${scopeLbl(S)} (${kyLabel(S)}): CHƯA CÓ DỮ LIỆU THỰC ĐẠT — kỳ này mới có TARGET`
    + (tg.target!=null?` (tổng ${tr(tg.target)})`:"") + `, chưa đánh giá được nhóm nào.`;
  s+= yeu.length ? `Nhóm chưa đạt: ${yeu.map(k=>`${k.name} ${pc(k.rate)}`).join("; ")}.`
                 : "Tất cả nhóm doanh thu có dữ liệu đều đạt nhịp target.";
  const D=M(S);
  if(D&&isLuyKe(D)&&!isYear(S)) s+=` Kỳ mới đi ${D.ngayDaQua}/${D.ngayTrongThang} ngày: target đã quy đổi ×${D.ngayDaQua}/${D.ngayTrongThang}`
    + (tg.meta&&tg.meta.duKien!=null?`, dự kiến cả tháng ${tr(tg.meta.duKien)}`:"") + `.`;
  return s;
}
const AUTO_EVAL={chatLuong:autoEvalChatLuong, sanLuong:autoEvalSanLuong, doanhThu:autoEvalDoanhThu};
function getEval(which,S=ST){
  const k=evalKey(which,S), n=NOTES[k];
  return (n&&n.text!=null&&n.text!=="") ? {text:n.text,edited:true} : {text:AUTO_EVAL[which](S),edited:false};
}

/* =============================================================================
   J. HỎI ĐÁP — trả lời câu hỏi tiếng Việt bằng SỐ THẬT đã tính sẵn ở LỚP CALC.
   Nguyên tắc: KHÔNG suy diễn, KHÔNG bịa số — mọi câu trả lời đọc lại đúng kết quả
   của calcExec()/unitRow()/calcDoanhThuCat(), CÙNG một hàm đang dựng các sheet
   khác, nên câu trả lời không bao giờ lệch với phần còn lại của dashboard.
   Mở rộng 19/08/2026 theo yêu cầu khách: hỏi được PHẠM VI Tổng/Vùng/Tỉnh + tại
   nhà/tại kho riêng; THỜI GIAN 1 tháng / khoảng tháng / quý / danh sách tháng
   rời rạc / N tháng gần nhất (tái dùng cơ chế "chọn nhiều tháng" đã có sẵn cho
   mọi module khác: S.months/selMonths/isYear/eachMonth — KHÔNG viết lại lớp
   gộp); câu hỏi "kho nào N tháng gần nhất không đạt"; và câu hỏi "dự kiến
   thiếu bao nhiêu + gợi ý bù đắp" (chỉ áp dụng đúng 1 tháng, vì "dự kiến cả
   tháng" là khái niệm TRONG 1 THÁNG, không cộng dồn nhiều tháng).
   ============================================================================= */
function deaccent(s){
  return String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/đ/g,"d").replace(/Đ/g,"D");
}
/* năm nhắc tới trong câu hỏi — mặc định = năm đang xem */
function parseNamFromQ(q,S=ST){ const m=q.match(/\b(20\d{2})\b/); return m?+m[1]:S.nam; }
/* tỉnh/kho nhắc tới trong câu hỏi — so khớp không dấu, ưu tiên tên khớp DÀI NHẤT
   (để "Bà Rịa - Vũng Tàu" không bị "Vũng Tàu" trong "Rịa" đánh lừa), gồm cả bí danh GOM */
function findTinhInQ(q){
  const dq=deaccent(q).toLowerCase();
  let best=null,bestLen=0;
  const tryName=(name,code)=>{ const n=deaccent(name).toLowerCase();
    if(n && dq.indexOf(n)>=0 && n.length>bestLen){ best=code; bestLen=n.length; } };
  for(const code of KHO_ORDER) tryName(KHOMAP[code].tinh,code);
  for(const alias in GOM){ const target=GOM[alias];
    const code=KHO_ORDER.find(c=>KHOMAP[c].tinh===target); if(code) tryName(alias,code); }
  return best;
}
/* Vùng nhắc tới trong câu hỏi — CHỈ dùng khi câu hỏi KHÔNG nêu tên tỉnh cụ thể */
function findVungInQ(q){
  const dq=deaccent(q).toLowerCase();
  if(/vung\s*trung\s*bo|\btrung\s*bo\b/.test(dq)) return VTB;
  if(/vung\s*duyen\s*hai|\bduyen\s*hai\b/.test(dq)) return VDH;
  return null;
}
/* "tổng"/"toàn vùng"/"cả 2 vùng" -> ép phạm vi về Tổng 2 vùng dù đang lọc gì */
function wantTongInQ(q){
  const dq=deaccent(q).toLowerCase();
  return /\btong\b|toan vung|ca 2 vung|ca hai vung|tat ca cac vung|toan bo vung/.test(dq);
}
/* "tại nhà"/"tại kho" nhắc riêng (không kèm tên tỉnh cụ thể) -> lọc theo loại hình */
function findLoaiInQ(q){
  const dq=deaccent(q).toLowerCase();
  const hasNha=/\btai\s*nha\b/.test(dq), hasKho=/\btai\s*kho\b/.test(dq);
  if(hasNha&&!hasKho) return "NHA";
  if(hasKho&&!hasNha) return "KHO";
  return null;
}
/* nhóm doanh thu cụ thể nhắc tới trong câu hỏi (gói/1 đổi 1/BHMR/SCDV) */
const QA_DT_CATS=[
  {cat:"Bán gói năm 2025", kw:["goi 2025","ban goi","goi bao hanh"]},
  {cat:"BH 1 đổi 1",       kw:["1 doi 1","doi 1","doi tra 1"]},
  {cat:"BHMR",              kw:["bhmr","bao hanh mo rong"]},
  {cat:"SCDV",              kw:["scdv","sua chua khach le","sua chua dich vu"]}
];
function findDtCatInQ(q){
  const dq=deaccent(q).toLowerCase();
  const hit=QA_DT_CATS.find(c=>c.kw.some(k=>dq.indexOf(k)>=0));
  return hit?hit.cat:null;
}
const QA_TOPICS=[
  {key:"doanhThu",  label:"DOANH THU",             kw:["doanh thu"]},
  {key:"sanLuong",  label:"SẢN LƯỢNG (ĐƠN HÀNG)",  kw:["san luong","don hang","so don"]},
  {key:"donGia",    label:"ĐƠN GIÁ TRUNG BÌNH",    kw:["don gia"]},
  {key:"chiPhi",    label:"CHI PHÍ",               kw:["chi phi"]},
  {key:"chatLuong", label:"CHẤT LƯỢNG",            kw:["chat luong","tieu chi"]}
];
function findTopicsInQ(q){
  const dq=deaccent(q).toLowerCase();
  return QA_TOPICS.filter(t=>t.kw.some(k=>dq.indexOf(k)>=0));
}
/* ---- THỜI GIAN nhắc tới trong câu hỏi -------------------------------------
   Thứ tự nhận diện: quý -> khoảng "từ...đến..." -> "N tháng gần nhất"
   -> danh sách tháng rời rạc (≥2 mốc "tháng N") -> 1 tháng đơn (mặc định). */
function parseThoiGianFromQ(q,S=ST){
  const dq=deaccent(q).toLowerCase();
  let m=dq.match(/qu[ýy]\s*([1-4])\b/)||dq.match(/\bq([1-4])\b/);
  if(m){ const qn=+m[1]; return {months:[qn*3-2,qn*3-1,qn*3], label:`Quý ${qn}`, kind:"quy"}; }
  m=dq.match(/tu\s+thang\s*(\d{1,2})[^\d]{0,12}(?:den|toi|->)\s*thang\s*(\d{1,2})/)
    || dq.match(/thang\s*(\d{1,2})\s*(?:den|toi|->)\s*thang\s*(\d{1,2})/)
    || dq.match(/thang\s*(\d{1,2})\s*-\s*(\d{1,2})\b/);
  if(m){ let a=+m[1],b=+m[2]; if(a>b){const t=a;a=b;b=t;}
    const ms=[]; for(let i=a;i<=b&&i<=12;i++) ms.push(i);
    return {months:ms, label:`Từ tháng ${a} đến tháng ${b}`, kind:"khoang"}; }
  m=dq.match(/(\d{1,2})\s*thang\s*(?:gan nhat|gan day|toi gan|vua qua)/);
  if(m){ const n=Math.min(12,Math.max(1,+m[1])), cur=S.thang, ms=[];
    for(let i=n-1;i>=0;i--){ const mm=cur-i; if(mm>=1) ms.push(mm); }
    return {months:ms, label:`${n} tháng gần nhất (đến T${cur})`, kind:"ganday", n, cur}; }
  const tokens=new Set();
  for(const mm of dq.matchAll(/thang\s*(\d{1,2})/g)) tokens.add(+mm[1]);
  if(tokens.size>=2){ const ms=[...tokens].filter(x=>x>=1&&x<=12).sort((a,b)=>a-b);
    return {months:ms, label:monthsLabel(ms), kind:"list"}; }
  const mm2=dq.match(/thang\s*(\d{1,2})/) || dq.match(/\bt\s?(\d{1,2})\b/);
  const t=mm2?+mm2[1]:null;
  const single=(t>=1&&t<=12)?t:S.thang;
  return {months:[single], label:`Tháng ${single}`, kind:"don"};
}
/* câu trả lời NGẮN — 1 lĩnh vực, PHẠM VI theo bộ lọc hiện tại (không chỉ định tỉnh) */
function qaLineScope(topicKey,ex){
  if(topicKey==="chatLuong"){
    const q=ex.chatLuong;
    if(!q.coDl) return `CHẤT LƯỢNG: chưa có dữ liệu thực đạt cho kỳ này.`;
    const miss=q.all.filter(k=>!k.noData&&!k.noCfg&&!k.dat);
    let s=`CHẤT LƯỢNG: đạt ${q.dat}/${q.coDl} tiêu chí có dữ liệu (${pc1(q.rate)}).`;
    s+= miss.length ? ` Chưa đạt: ${miss.map(k=>k.name).join(", ")}.` : " Tất cả tiêu chí có dữ liệu đều ĐẠT.";
    return s;
  }
  const k=ex[topicKey];
  const label={sanLuong:"SẢN LƯỢNG",donGia:"ĐƠN GIÁ TRUNG BÌNH",chiPhi:"CHI PHÍ",doanhThu:"DOANH THU"}[topicKey];
  if(k.actual==null) return `${label}: chưa có số liệu thực đạt cho kỳ này${k.target!=null?` (target ${k.fmt(k.target)})`:""}.`;
  const dk = k.meta&&k.meta.duKien!=null ? `, dự kiến cả tháng ${k.fmt(k.meta.duKien)}` : "";
  return `${label}: thực đạt ${k.fmt(k.actual)}${k.target!=null?` / target ${k.fmt(k.target)}`:""}${dk} — ${k.statusText}.`;
}
/* câu trả lời NGẮN — 1 lĩnh vực, PHẠM VI 1 tỉnh/kho cụ thể */
function qaLineUnit(topicKey,r,loaiTxt){
  if(topicKey==="chatLuong"){
    if(!r.coCl) return `CHẤT LƯỢNG (${loaiTxt}): chưa có dữ liệu.`;
    const miss=r.cl.filter(k=>!k.noData&&!k.noCfg&&!k.dat);
    let s=`CHẤT LƯỢNG (${loaiTxt}): đạt ${r.datCl}/${r.coCl} tiêu chí có dữ liệu.`;
    s+= miss.length ? ` Chưa đạt: ${miss.map(k=>k.name).join(", ")}.` : " Tất cả tiêu chí có dữ liệu đều ĐẠT.";
    return s;
  }
  const map={sanLuong:["sl","SẢN LƯỢNG"],donGia:["dg","ĐƠN GIÁ TRUNG BÌNH"],chiPhi:["cp","CHI PHÍ"],doanhThu:["tongDt","DOANH THU"]};
  const [f,label]=map[topicKey], k=r[f];
  if(!k||k.actual==null) return `${label} (${loaiTxt}): chưa có số liệu thực đạt${k&&k.target!=null?` (target ${k.fmt(k.target)})`:""}.`;
  return `${label} (${loaiTxt}): thực đạt ${k.fmt(k.actual)}${k.target!=null?` / target ${k.fmt(k.target)}`:""} — ${k.statusText}.`;
}

/* =============================================================================
   J2. CÂU TRẢ LỜI CHI TIẾT (BẢNG) — khi hỏi nhiều tháng/quý/danh sách/khoảng.
   Mỗi hàng = 1 tháng, đọc lại đúng KPI đã tính ở LỚP CALC (không tính riêng);
   dòng cuối "Lũy kế" = kết quả GỘP đúng của isYear() cho toàn bộ giai đoạn hỏi.
   ============================================================================= */
function qaAggRow(label,agg){
  return [`<b>${esc(label)}</b>`,
    agg.actual==null?"–":`<b>${agg.fmt(agg.actual)}</b>`,
    agg.target==null?"–":`<b>${agg.fmt(agg.target)}</b>`,
    agg.rate==null?"–":`<b>${pc1(agg.rate)}</b>`,
    badge(agg)];
}
function qaSimpleTopicTable(getK,S){
  const months=selMonths(S);
  const rows=months.map(m=>{
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    if(!DB.ky[kyKey(S.nam,m)]) return [`T${m}`,"–","–","–","chưa có dữ liệu"];
    const k=getK(S2);
    return [`T${m}`, k.actual==null?"–":k.fmt(k.actual), k.target==null?"–":k.fmt(k.target),
      k.rate==null?"–":pc1(k.rate), badge(k)];
  });
  rows.push(qaAggRow("Lũy kế",getK(S)));
  return {head:["Tháng","Thực đạt","Target","Tỷ lệ","Đánh giá"], rows};
}
function qaSanLuongTable(S){
  const months=selMonths(S);
  const rows=months.map(m=>{
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    if(!DB.ky[kyKey(S.nam,m)]) return [`T${m}`,"–","–","–","–","–","chưa có dữ liệu"];
    const n=calcSanLuongTong("nha",S2), k2=calcSanLuongTong("kho",S2), tg=calcExec(S2).sanLuong;
    return [`T${m}`, n.actual==null?"–":f0(n.actual), k2.actual==null?"–":f0(k2.actual),
      tg.actual==null?"–":f0(tg.actual), tg.target==null?"–":f0(tg.target),
      tg.rate==null?"–":pc1(tg.rate), badge(tg)];
  });
  const an=calcSanLuongTong("nha",S), ak=calcSanLuongTong("kho",S), agg=calcExec(S).sanLuong;
  rows.push([`<b>Lũy kế</b>`, an.actual==null?"–":`<b>${f0(an.actual)}</b>`, ak.actual==null?"–":`<b>${f0(ak.actual)}</b>`,
    agg.actual==null?"–":`<b>${f0(agg.actual)}</b>`, agg.target==null?"–":`<b>${f0(agg.target)}</b>`,
    agg.rate==null?"–":`<b>${pc1(agg.rate)}</b>`, badge(agg)]);
  return {head:["Tháng","Tại nhà","Tại kho","Tổng","Target","Tỷ lệ","Đánh giá"], rows};
}
function qaChatLuongTable(S){
  const months=selMonths(S);
  const line=q=>{ const st=q.rate==null?"none":statusOf(q.rate,"up"); return {st,txt:STATUS_TEXT[st]}; };
  const rows=months.map(m=>{
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    if(!DB.ky[kyKey(S.nam,m)]) return [`T${m}`,"–","–","chưa có dữ liệu"];
    const q=calcChatLuongTQ7(S2), L=line(q);
    return [`T${m}`, q.coDl?`${q.dat}/${q.coDl}`:"–", q.rate==null?"–":pc1(q.rate), badgeOf(L.st,L.txt)];
  });
  const agg=calcChatLuongTQ7(S), La=line(agg);
  rows.push([`<b>Lũy kế</b>`, agg.coDl?`<b>${agg.dat}/${agg.coDl}</b>`:"–",
    agg.rate==null?"–":`<b>${pc1(agg.rate)}</b>`, badgeOf(La.st,La.txt)]);
  return {head:["Tháng","Đạt/Có DL","Tỷ lệ","Đánh giá"], rows};
}
function qaUnitTopicTable(topicKey,code,loai,S){
  const months=selMonths(S);
  const map={sanLuong:["sl"],donGia:["dg"],chiPhi:["cp"],doanhThu:["tongDt"]};
  if(topicKey==="chatLuong"){
    const rows=months.map(m=>{
      const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
      if(!DB.ky[kyKey(S.nam,m)]) return [`T${m}`,"–","chưa có dữ liệu"];
      const r=unitRow(code,loai,S2);
      return [`T${m}`, r.coCl?`${r.datCl}/${r.coCl}`:"–", r.coCl?(r.datCl===r.coCl?"ĐẠT":"KHÔNG ĐẠT"):"CHƯA CÓ DỮ LIỆU"];
    });
    const agg=unitRow(code,loai,S);
    rows.push([`<b>Lũy kế</b>`, agg.coCl?`<b>${agg.datCl}/${agg.coCl}</b>`:"–", agg.coCl?(agg.datCl===agg.coCl?"ĐẠT":"KHÔNG ĐẠT"):"CHƯA CÓ DỮ LIỆU"]);
    return {head:["Tháng","Đạt/Có DL","Đánh giá"], rows};
  }
  const [f]=map[topicKey];
  const rows=months.map(m=>{
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    if(!DB.ky[kyKey(S.nam,m)]) return [`T${m}`,"–","–","–","chưa có dữ liệu"];
    const k=unitRow(code,loai,S2)[f];
    return [`T${m}`, k.actual==null?"–":k.fmt(k.actual), k.target==null?"–":k.fmt(k.target),
      k.rate==null?"–":pc1(k.rate), badge(k)];
  });
  rows.push(qaAggRow("Lũy kế", unitRow(code,loai,S)[f]));
  return {head:["Tháng","Thực đạt","Target","Tỷ lệ","Đánh giá"], rows};
}
/* dựng 1 khối <bảng> hoàn chỉnh (có tiêu đề) cho 1 lĩnh vực đang hỏi chi tiết */
function qaTopicTableHtml(topicKey,S,code,loai,dtCat,loaiScope){
  let t,title;
  if(code){
    if(topicKey==="doanhThu"&&dtCat){
      t=qaSimpleTopicTable(S2=>calcDtUnitCat(code,loai,dtCat,S2),S);
      title=`DOANH THU — ${DT_LABEL[dtCat]||dtCat}`;
    }else{
      t=qaUnitTopicTable(topicKey,code,loai,S);
      title={sanLuong:"SẢN LƯỢNG",donGia:"ĐƠN GIÁ TRUNG BÌNH",chiPhi:"CHI PHÍ",doanhThu:"DOANH THU",chatLuong:"CHẤT LƯỢNG"}[topicKey];
    }
  }else{
    if(topicKey==="sanLuong"){
      if(loaiScope){ const isNha=loaiScope==="NHA";
        t=qaSimpleTopicTable(S2=>calcSanLuongTong(isNha?"nha":"kho",S2),S);
        title="SẢN LƯỢNG (ĐƠN HÀNG)"+(isNha?" — tại nhà":" — tại kho");
      } else { t=qaSanLuongTable(S); title="SẢN LƯỢNG (ĐƠN HÀNG)"; }
    } else if(topicKey==="chatLuong"){ t=qaChatLuongTable(S); title="CHẤT LƯỢNG"; }
    else if(topicKey==="doanhThu"){
      if(dtCat){ t=qaSimpleTopicTable(S2=>calcDoanhThuCat(dtCat,S2),S); title=`DOANH THU — ${DT_LABEL[dtCat]||dtCat}`; }
      else if(loaiScope){ const cat=loaiScope==="NHA"?"Bảo hành tại nhà":"Bảo hành tại kho";
        t=qaSimpleTopicTable(S2=>calcDoanhThuCat(cat,S2),S); title=`DOANH THU — ${DT_LABEL[cat]}`; }
      else { t=qaSimpleTopicTable(S2=>calcExec(S2).doanhThu,S); title="DOANH THU"; }
    } else if(topicKey==="donGia"&&loaiScope){
      const isNha=loaiScope==="NHA";
      t=qaSimpleTopicTable(S2=>calcDonGia(isNha?"nha":"kho",S2),S);
      title="ĐƠN GIÁ TRUNG BÌNH"+(isNha?" — tại nhà":" — tại kho");
    } else {
      const getK={donGia:S2=>calcExec(S2).donGia, chiPhi:S2=>calcExec(S2).chiPhi, doanhThu:S2=>calcExec(S2).doanhThu}[topicKey];
      t=qaSimpleTopicTable(getK,S);
      title={donGia:"ĐƠN GIÁ TRUNG BÌNH",chiPhi:"CHI PHÍ",doanhThu:"DOANH THU"}[topicKey];
    }
  }
  return `<div class="qa-topictitle" style="font-weight:800;margin:10px 0 4px">${esc(title)}</div>${chTable(t.head,t.rows)}`;
}

/* =============================================================================
   J3. "KHO/TỈNH NÀO N THÁNG GẦN NHẤT KHÔNG ĐẠT" — quét N tháng gần nhất, dùng
   ĐÚNG allUnitRows()/unitRow() (giống Ma trận Tỉnh/Kho), không tính lại riêng.
   "Không đạt" = có ÍT NHẤT 1 KPI (sản lượng/đơn giá/chi phí/doanh thu/chất
   lượng) bị chấm KHÔNG ĐẠT VÀ CÓ dữ liệu thật (không tính "chưa có dữ liệu"/
   "chưa cấu hình" là không đạt — đúng nguyên tắc không suy diễn).
   ============================================================================= */
function findKhongDatQuery(q){
  const dq=deaccent(q).toLowerCase();
  const hit=/(kho|tinh|don vi)\s*nao[^.?!]{0,25}khong\s*dat|khong\s*dat[^.?!]{0,25}(kho|tinh|don vi)\s*nao/.test(dq);
  if(!hit) return null;
  const m=dq.match(/(\d{1,2})\s*thang/);
  const n=m?Math.min(12,Math.max(1,+m[1])):3;
  return {n};
}
function unitFailReasons(r){
  const out=[];
  const chk=(k,label)=>{ if(k && !k.noData && !k.noCfg && k.dat===false) out.push(label); };
  chk(r.sl,"Sản lượng"); chk(r.dg,"Đơn giá"); chk(r.cp,"Chi phí"); chk(r.tongDt,"Doanh thu");
  if(r.coCl>0 && r.datCl<r.coCl) out.push("Chất lượng");
  return out;
}
function calcKhongDatGanDay(n,S){
  const cur=S.thang, nam=S.nam, months=[];
  for(let i=n-1;i>=0;i--){ const mm=cur-i; if(mm>=1) months.push(mm); }
  const byUnit={};
  for(const m of months){
    if(!DB.ky[kyKey(nam,m)]) continue;
    const S2=Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
    for(const row of allUnitRows(S2)){
      const reasons=unitFailReasons(row);
      if(reasons.length){
        const key=row.code+"|"+row.loai;
        (byUnit[key]=byUnit[key]||{code:row.code,loai:row.loai,tinh:row.tinh,items:[]}).items.push({m,reasons});
      }
    }
  }
  return {months, list:Object.values(byUnit).sort((a,b)=>b.items.length-a.items.length)};
}
function qaKhongDatHtml(n,S){
  const {months,list}=calcKhongDatGanDay(n,S);
  if(!months.length) return esc(`Chưa có dữ liệu cho ${n} tháng gần đây.`);
  const dsThang=monthsLabel(months);
  if(!list.length) return esc(`${dsThang}: TẤT CẢ đơn vị trong phạm vi đang xem đều ĐẠT đủ các chỉ số có dữ liệu ở mọi tháng.`);
  const lines=[`Trong ${dsThang} — các đơn vị có ít nhất 1 tháng KHÔNG ĐẠT:`];
  list.forEach(u=>{
    const per=u.items.map(it=>`T${it.m} (${it.reasons.join(", ")})`).join("; ");
    lines.push(`- ${u.tinh} (${u.code}, ${u.loai==="kho"?"BH tại kho":"BH tại nhà"}): ${u.items.length}/${months.length} tháng không đạt — ${per}`);
  });
  return lines.map(esc).join("<br>");
}

/* =============================================================================
   J4. DỰ KIẾN THIẾU BAO NHIÊU + GỢI Ý BÙ ĐẮP — chỉ áp dụng ĐÚNG 1 tháng đang
   xem (khái niệm "dự kiến cả tháng" là trong-tháng). So SẢN LƯỢNG (đơn hàng,
   đúng chỉ số điều hành ex.sanLuong) dự kiến cả tháng với target; quy đổi phần
   thiếu ra doanh thu bằng ĐƠN GIÁ TARGET hiện tại (ex.donGia.target); gợi ý bù
   CHIA ĐỀU phần doanh thu thiếu cho 3 nhóm ngoài (1 đổi 1/BHMR/SCDV) — các
   nhóm này KHÔNG có target đơn giá cấu hình riêng trong hệ thống nên dùng đơn
   giá THỰC TẾ hiện tại của từng nhóm (tính trực tiếp từ nguồn = doanh thu ÷
   sản lượng CỦA CHÍNH NHÓM ĐÓ, không suy diễn/không bịa số).
   ============================================================================= */
/* LƯU Ý ĐƠN VỊ: dtTargetDong/dtActualDong giữ NGUYÊN ĐỒNG (không quy đổi TRIỆU
   như phần lớn hàm doanh thu khác trong file) — để dgiaTarget/dgiaActual ra
   đúng ĐỒNG/ĐƠN, khớp đơn vị với ex.donGia (đơn giá luôn tính bằng đồng/đơn).
   Chỉ quy đổi sang TRIỆU bằng TRI() ở lớp hiển thị khi cần in ra "x tỷ/x tr". */
function calcCatDonGia(cat,S=ST){
  if(isYear(S)){
    let st=0,sa=0,dt=0,da=0;
    eachMonth(S,(Dm,S2)=>{ const r=calcCatDonGia(cat,S2);
      if(r.slTarget!=null) st+=r.slTarget; if(r.slActual!=null) sa+=r.slActual;
      if(r.dtTargetDong!=null) dt+=r.dtTargetDong; if(r.dtActualDong!=null) da+=r.dtActualDong; });
    return {slTarget:st||null, slActual:sa||null, dtTargetDong:dt||null, dtActualDong:da||null,
      dgiaTarget: st?dt/st:null, dgiaActual: sa?da/sa:null};
  }
  const D=M(S);
  let st=0,sa=0,dt=0,da=0;
  if(useTinh(D,S)){
    const fld=DT_TFIELD[cat];
    for(const [code,loai] of dtUnitsOf(cat,S)){
      const r=tRec(D,code,loai); if(!r) continue;
      const slc=r.sl&&r.sl.cats&&r.sl.cats[fld];
      const dtc=r.dt&&r.dt[fld];
      if(slc&&NB(slc.target)!=null) st+=slc.target;
      if(slc&&NB(slc.act)!=null) sa+=slc.act;
      if(dtc&&NB(dtc.target)!=null) dt+=NB(dtc.target);
      const actDt=dtc&&(NB(dtc.actDH)!=null?NB(dtc.actDH):NB(dtc.act));
      if(actDt!=null) da+=actDt;
    }
  }
  return {slTarget:st||null, slActual:sa||null, dtTargetDong:dt||null, dtActualDong:da||null,
    dgiaTarget: st?dt/st:null, dgiaActual: sa?da/sa:null};
}
function wantGapFillInQ(q){
  const dq=deaccent(q).toLowerCase();
  return /ve dich|con thieu|thieu bao nhieu|bu dap|bu vao|bu doanh thu|du kien.{0,15}dat khong/.test(dq);
}
function calcGapFill(S){
  const ex=calcExec(S), sl=ex.sanLuong, dg=ex.donGia;
  if(sl.target==null) return {ok:false, reason:"Chưa cấu hình target sản lượng cho kỳ này nên không tính được khoảng cách."};
  const dk=duKienOf(sl);
  if(dk==null) return {ok:false, reason:"Chưa có số thực đạt sản lượng để tính dự kiến cả tháng."};
  const gapDon=sl.target-dk;
  if(gapDon<=0) return {ok:true, dat:true, dk, target:sl.target};
  const dgiaTarget=dg.target;                                    // đồng/đơn
  const gapDoanhThuDong=dgiaTarget!=null?gapDon*dgiaTarget:null;  // ĐỒNG (chưa quy đổi triệu)
  /* CỐ Ý chỉ gợi ý bù đắp qua 3 nhóm ngoài GỐC: 5 nhóm mới (từ 08/09/2026) chưa có
     thực đạt lẫn đơn giá thực tế nên không tính được mức bù -> đưa vào sẽ ra số bịa. */
  const cats=DT_NGOAI_GOC.slice();
  const perDong=gapDoanhThuDong!=null?gapDoanhThuDong/cats.length:null;
  const opts=cats.map(cat=>{
    const c=calcCatDonGia(cat,S);
    const dgia=c.dgiaActual;                                      // đồng/đơn
    const donCanThem=(perDong!=null&&dgia)?perDong/dgia:null;
    return {cat, dgia, donCanThem, doanhThuCanBuDong:perDong};
  });
  return {ok:true, dat:false, gapDon, dk, target:sl.target, gapDoanhThuDong, dgiaTarget, opts};
}
function qaGapFillHtml(S,scopeTxt){
  const g=calcGapFill(S);
  if(!g.ok) return esc(g.reason);
  if(g.dat) return esc(`Sản lượng ${scopeTxt}: dự kiến cả tháng ${f0(g.dk)} đơn — ĐÃ đạt/vượt target ${f0(g.target)} đơn, không thiếu.`);
  const lines=[];
  lines.push(`SẢN LƯỢNG (ĐƠN HÀNG) ${esc(scopeTxt)}: dự kiến cả tháng <b>${f0(g.dk)} đơn</b> / target <b>${f0(g.target)} đơn</b> → dự kiến <b>THIẾU ${f0(g.gapDon)} đơn</b>.`);
  if(g.gapDoanhThuDong!=null){
    lines.push(`Quy đổi theo đơn giá TARGET hiện tại (${vnd(g.dgiaTarget)}/đơn) → dự kiến <b>THIẾU khoảng ${tr(TRI(g.gapDoanhThuDong))}</b> doanh thu.`);
    lines.push(`Gợi ý bù đắp — chia đều phần thiếu cho 3 nhóm ngoài (1 đổi 1 / BHMR / SCDV):`);
    g.opts.forEach(o=>{
      if(o.dgia==null||o.donCanThem==null){
        lines.push(`- ${esc(DT_LABEL[o.cat]||o.cat)}: chưa đủ dữ liệu đơn giá thực tế của nhóm này trong kỳ để quy đổi.`);
      }else{
        lines.push(`- ${esc(DT_LABEL[o.cat]||o.cat)}: cần thêm khoảng <b>${f0(Math.ceil(o.donCanThem))} đơn</b> `
          +`(đơn giá thực tế hiện tại ≈ ${vnd(o.dgia)}/đơn — nhóm này chưa có target đơn giá riêng trong hệ thống) `
          +`để mang về thêm ≈ ${tr(TRI(o.doanhThuCanBuDong))} doanh thu.`);
      }
    });
    lines.push(`<span style="color:var(--muted);font-size:12px">Lưu ý: chia đều 1/3 chỉ là gợi ý hướng bù để tham khảo, không phải kế hoạch chính thức — có thể dồn hết vào 1 nhóm nếu phù hợp hơn.</span>`);
  }else{
    lines.push("Chưa có target đơn giá để quy đổi ra doanh thu thiếu — chỉ nêu được số đơn thiếu ở trên.");
  }
  return lines.join("<br>");
}

/* =============================================================================
   J5. HÀM CHÍNH — nhận câu hỏi tiếng Việt tự do, phân giải PHẠM VI + THỜI GIAN
   + LOẠI TRUY VẤN rồi gọi đúng lớp CALC đã có, không suy diễn/không bịa số.
   ============================================================================= */
function calcQAAnswer(qtext,S=ST){
  const q=String(qtext||"").trim();
  if(!q) return {html:"",scopeTxt:"",ok:false};
  const dq=deaccent(q).toLowerCase();
  const nam=parseNamFromQ(q,S);
  const tg=parseThoiGianFromQ(q,S);
  const code=findTinhInQ(q);
  const wantKho = !!code && KHOKHO.indexOf(code)>=0 && /\bkho\b/.test(dq);
  const loai = wantKho ? "kho" : "nha";
  let vung=S.vung, kho=code?code:S.kho;
  if(code){ vung=vungOf(code); }
  else if(wantTongInQ(q)){ vung="TONG"; kho="ALL"; }
  else{ const v=findVungInQ(q); if(v){ vung=v; kho="ALL"; } }
  const loaiScope = code?null:findLoaiInQ(q);
  const S2=Object.assign({},S,{nam,ky:"Tháng",thang:tg.months[tg.months.length-1]||S.thang,
    months:tg.months, vung, kho, loai:loaiScope||S.loai});
  const anyData = tg.months.some(m=>DB.ky[kyKey(nam,m)]);
  if(!anyData) return {html:`Chưa có dữ liệu cho <b>${esc(tg.label)}/${nam}</b> trong kho dữ liệu.`,
    scopeTxt:`${tg.label}/${nam}`, ok:false};
  const scopeBase = code ? `${tinhOf(code)} (${code}${loai==="kho"?" · BH tại kho":""})`
    : (loaiScope ? `${scopeLbl(S2)} · ${loaiScope==="NHA"?"tại nhà":"tại kho"}` : scopeLbl(S2));
  const scopeTxt=`${scopeBase} · ${tg.label}/${nam}`;

  /* 1) "kho/tỉnh nào N tháng gần nhất không đạt" */
  const kd=findKhongDatQuery(q);
  if(kd) return {html:qaKhongDatHtml(kd.n,S2), scopeTxt, ok:true};

  /* 2) "dự kiến thiếu bao nhiêu + gợi ý bù đắp" — chỉ khi hỏi đúng 1 tháng
        (áp dụng được cả Tổng/Vùng lẫn 1 tỉnh cụ thể — calcExec() bên trong tự
        thu hẹp đúng theo S2.vung/S2.kho, không cần code riêng cho từng cấp). */
  if(wantGapFillInQ(q) && tg.months.length===1){
    const gScope = code ? `${tinhOf(code)} (${code})` : scopeLbl(S2);
    return {html:qaGapFillHtml(S2, gScope), scopeTxt, ok:true};
  }

  const dtCat=findDtCatInQ(q);
  let topics=findTopicsInQ(q);
  if(dtCat && !topics.some(t=>t.key==="doanhThu")) topics=topics.concat([{key:"doanhThu"}]);
  const keys = topics.length?topics.map(t=>t.key):["chatLuong","sanLuong","donGia","chiPhi","doanhThu"];
  const isDetail = tg.months.length>1;

  if(isDetail){
    const html = keys.map(k=>qaTopicTableHtml(k,S2,code,loai,dtCat,loaiScope)).join("");
    return {html, scopeTxt, ok:true};
  }

  const lines=[];
  if(code){
    const r=unitRow(code,loai,S2), loaiTxt=loai==="kho"?"BH tại kho":"BH tại nhà";
    keys.forEach(k=>{
      if(k==="doanhThu"&&dtCat){
        const kk=calcDtUnitCat(code,loai,dtCat,S2);
        lines.push(kk.actual==null?`DOANH THU — ${DT_LABEL[dtCat]} (${loaiTxt}): chưa có số liệu thực đạt${kk.target!=null?` (target ${kk.fmt(kk.target)})`:""}.`
          :`DOANH THU — ${DT_LABEL[dtCat]} (${loaiTxt}): thực đạt ${kk.fmt(kk.actual)}${kk.target!=null?` / target ${kk.fmt(kk.target)}`:""} — ${kk.statusText}.`);
      }else lines.push(qaLineUnit(k,r,loaiTxt));
    });
  }else{
    const ex=calcExec(S2);
    if(loaiScope){
      const isNha=loaiScope==="NHA";
      ex.sanLuong = calcSanLuongTong(isNha?"nha":"kho", S2);
      ex.donGia   = calcDonGia(isNha?"nha":"kho", S2);
      ex.doanhThu = calcDoanhThuCat(isNha?"Bảo hành tại nhà":"Bảo hành tại kho", S2);
    }
    keys.forEach(k=>{
      if(k==="doanhThu"&&dtCat){
        const kk=calcDoanhThuCat(dtCat,S2);
        lines.push(kk.actual==null?`DOANH THU — ${DT_LABEL[dtCat]}: chưa có số liệu thực đạt${kk.target!=null?` (target ${kk.fmt(kk.target)})`:""}.`
          :`DOANH THU — ${DT_LABEL[dtCat]}: thực đạt ${kk.fmt(kk.actual)}${kk.target!=null?` / target ${kk.fmt(kk.target)}`:""} — ${kk.statusText}.`);
      }else lines.push(qaLineScope(k,ex));
    });
  }
  return {html:lines.map(esc).join("<br>"), scopeTxt, ok:true};
}
/* câu hỏi gợi ý sẵn — bấm là hỏi luôn, không cần gõ tay */
const QA_SAMPLES=[
  "Tháng 8 doanh thu bao nhiêu?",
  "Quý 3 doanh thu Vùng Trung Bộ đạt bao nhiêu?",
  "Từ tháng 1 đến tháng 6 sản lượng Khánh Hòa",
  "So sánh doanh thu tháng 6 với tháng 7 toàn vùng",
  "Kho nào 3 tháng gần nhất không đạt?",
  "Tháng 8 đơn hàng dự kiến về đích không, thiếu bao nhiêu?",
  "Chất lượng tiêu chí nào chưa đạt tháng 8?",
  "Đà Nẵng tháng 8 doanh thu bao nhiêu?"
];

