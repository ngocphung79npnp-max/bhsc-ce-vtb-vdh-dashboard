
const VT_EMBED = __VT_EMBED__;
const DB = __DB__;
DB.ky    = DB.ky    || {};
DB.notes = DB.notes || {};

/* --- CONFIG: các chỉ tiêu GHI ĐÈ thủ công -----------------------------------
   Quy tắc bất di bất dịch: KHÔNG BAO GIỜ đoán số. Thiếu dữ liệu => hiển thị "–".
   Từ bản dữ liệu DATA_UP_WEB_v2 (T1-T12/2026), target + thực đạt của SẢN LƯỢNG
   và ĐƠN GIÁ đã có THẬT theo từng tỉnh/kho trong DB.ky[kỳ].tinh — các ô dưới đây
   chỉ còn là GHI ĐÈ tuỳ chọn (bỏ trống = dùng số từ file nguồn).                */
const CONFIG_DEFAULT = {
  version: 2,
  /* ĐƠN GIÁ TRUNG BÌNH — ghi đè tuỳ chọn; null = dùng số thật từ DB.ky[].tinh */
  donGia: {
    thucDatNha : null,     // ghi đè thực đạt tại nhà (đ/đơn) — thường để trống
    thucDatKho : null,     // ghi đè thực đạt tại kho
    targetNha  : null,     // ghi đè target tại nhà
    targetKho  : null,     // ghi đè target tại kho
    tamThoi    : false,
    /* Khách chốt 19/08/2026: ĐƠN GIÁ TRUNG BÌNH là số khách đã CỐ ĐỊNH target sẵn,
       không phải chỉ tiêu "đuổi" theo target như Sản lượng/Doanh thu — nên LUÔN
       chấm ĐẠT khi có đủ target+thực đạt (không so ngưỡng % như các KPI khác).
       Chỉ ảnh hưởng NHÃN ĐÁNH GIÁ (status/dat/badge); target/thực đạt/tỷ lệ % vẫn
       hiển thị đúng số thật — KHÔNG chỉnh sửa Sản lượng hay bất kỳ số liệu gốc nào
       để "ép" khớp. Đặt false để quay lại so ngưỡng % như các KPI khác.            */
    luonDat    : true
  },
  /* SẢN LƯỢNG (đơn hàng) — ghi đè tuỳ chọn; null = dùng target thật từ file nguồn */
  sanLuongTarget: {
    tongNha : null,
    tongKho : null,
    byKho   : {}           // { "VTB_HTI": 1200, ... } — ghi đè theo đơn vị
  },
  /* Phân bổ target doanh thu / chi phí xuống từng tỉnh (nguồn chỉ có cấp VÙNG) */
  phanBo: {
    mode: "donhang"        // "donhang" | "chiphi" | "deu"
  },
  /* Ngưỡng trạng thái KPI */
  nguong: {
    datTu       : 0.999,   // >= => ĐẠT (xanh)
    canhBaoTu   : 0.95,    // KHÔNG CÒN DÙNG — chỉ còn 2 mức ĐẠT / KHÔNG ĐẠT
    cpDatDen    : 1.001,   // chi phí: <= => ĐẠT (đảo chiều)
    cpCanhBaoDen: 1.05     // KHÔNG CÒN DÙNG — vượt định mức là KHÔNG ĐẠT (đỏ)
  },
  /* Trọng số Performance Score (chỉ ở lớp hiển thị, không đổi KPI gốc) */
  scoreWeight: { chatLuong:40, sanLuong:15, donGia:10, chiPhi:15, doanhThu:20 },
  /* Tuỳ chọn HIỂN THỊ của người dùng — lưu cùng cấu hình (localStorage + file JSON) */
  hienThi: {
    clTieuChiPhu: false,  // sheet CHẤT LƯỢNG: hiện thêm các tiêu chí PHỤ ngoài 7 tiêu chí Tổng quan
    dtVuotTroi  : false   // sheet DOANH THU: hiện cụm so sánh với Target VƯỢT TRỘI (chỉ Sửa chữa khách lẻ)
  }
};
function deepMerge(base, ov){
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for(const k in (ov||{})){
    const a = out[k], b = ov[k];
    out[k] = (a && b && typeof a==="object" && typeof b==="object" && !Array.isArray(a)) ? deepMerge(a,b) : b;
  }
  return out;
}
const CONFIG = deepMerge(CONFIG_DEFAULT, DB.config || {});
DB.config = CONFIG;          // config sống cùng kho dữ liệu -> lưu/nạp JSON là mang theo

/* --- SỬA TAY: số do người dùng gõ đè lên số gốc từ Excel ---------------------
   DB.edits[key] = {v:<số theo ĐÚNG đơn vị lưu trong DB>, o:<số gốc>, t:<thời điểm>}
   key = "<kỳ>|<mã đơn vị>|<nha|kho>|<đường dẫn trong bản ghi tỉnh>"
   Ví dụ: "2026-07|VTB_HTI|nha|sl.target" = 1200
   Lớp CALC đọc qua tRec() nên MỌI module đều tự tính lại — không ghi thẳng số ra màn hình. */
DB.edits  = DB.edits  || {};
/* --- SỬA NHÃN: người dùng đổi tên tiêu đề / nhãn ngay trong app -------------- */
DB.labels = DB.labels || {};
let EDV = 0;                                  // phiên bản sửa tay -> huỷ cache tRec
const bumpEdits = ()=>{ EDV++; };
function getPath(o,p){ const a=String(p).split("."); let x=o;
  for(const s of a){ if(x==null) return undefined; x=x[s]; } return x; }
function setPath(o,p,v){ const a=String(p).split("."); let x=o;
  for(let i=0;i<a.length-1;i++){ if(x[a[i]]==null||typeof x[a[i]]!=="object") x[a[i]]={}; x=x[a[i]]; }
  x[a[a.length-1]]=v; }
const edKey=(mk,code,loai,p)=>`${mk}|${code}|${loai==="kho"?"kho":"nha"}|${p}`;
const hasEdits=()=>Object.keys(DB.edits).length>0;

/* --- NHÃN sửa được: LB() lấy chữ, lblH() dựng span sửa được ------------------ */
function LB(key,def){ const v=DB.labels[key]; return (v!=null&&String(v).trim()!=="")?String(v):def; }
let LBLMODE=false;                            // bật/tắt chế độ "Sửa nhãn"

/* --- hằng số nghiệp vụ (đã chốt qua các vòng trước) --- */
const VTB="Vùng Trung Bộ", VDH="Vùng Duyên Hải", VUNGS=[VTB,VDH];
const KHOMAP={
 "VTB_HTI":{tinh:"Hà Tĩnh",vung:VTB},      "VTB_QBI":{tinh:"Quảng Bình",vung:VTB},
 "VTB_QTR":{tinh:"Quảng Trị",vung:VTB},    "VTB_HUE":{tinh:"Thừa Thiên Huế",vung:VTB},
 "VTB_DNA":{tinh:"Đà Nẵng",vung:VTB},      "VTB_QNA":{tinh:"Quảng Nam",vung:VTB},
 "VTB_QNG":{tinh:"Quảng Ngãi",vung:VTB},
 "VDH_BDI":{tinh:"Bình Định",vung:VDH},    "VDH_PYE":{tinh:"Phú Yên",vung:VDH},
 "VDH_KHH":{tinh:"Khánh Hòa",vung:VDH},    "VDH_BTH":{tinh:"Bình Thuận",vung:VDH},
 "VDH_BRV":{tinh:"Bà Rịa - Vũng Tàu",vung:VDH}
};
const KHO_ORDER = Object.keys(KHOMAP);
const KHOKHO    = ["VTB_DNA","VDH_KHH"];        // 2 kho bảo hành TẠI KHO
const GOM       = {"Ninh Thuận":"Bình Thuận"};  // Ninh Thuận gộp vào Bình Thuận
const CP_OUT=0.70, LN_OUT=0.30;                 // CP bên ngoài = 70% DT -> LN = 30%
const MO=["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

/* --- QUY ĐỔI LŨY KẾ theo số ngày đã qua (kỳ chưa hết tháng, vd T8/2026 = 15/31) ---
   Khách chốt 17/08/2026:
     · SẢN LƯỢNG và DOANH THU tháng 8 là số LŨY KẾ 15 NGÀY  -> target quy đổi ×15/31.
     · CHI PHÍ tháng 8 khách gửi ĐÃ LÀ SỐ CẢ THÁNG (lũy kế cuối tháng) -> KHÔNG quy đổi,
       so thẳng thực chi với định mức cả tháng.
     · CHẤT LƯỢNG và ĐƠN GIÁ là số bình quân -> không bao giờ quy đổi.
     · GÓI BÁN NĂM 2025 là khoản đã CHỐT XONG (khách xác nhận target đã cập nhật và
       đạt 100%, không phải mục tiêu chạy dần trong tháng) -> xử lý giống CHI PHÍ:
       so thẳng thực đạt với target cả tháng, KHÔNG quy đổi theo ngày đã qua.
   Đây là NGUỒN DUY NHẤT của quy tắc: lớp CALC (prRatio/prMeta/prApply/hs) đọc từ đây,
   lớp trình bày và module PPT chỉ mô tả lại, không tự định nghĩa. */
const PRORATE_NHOM = { sanLuong:true, doanhThu:true, chiPhi:false, donGia:false, chatLuong:false, goiBan2025:false };
const prorateOn    = nhom => !(nhom && PRORATE_NHOM[nhom]===false);
/* nhãn dùng chung cho mọi câu chữ giải thích quy tắc quy đổi */
const PR_TEXT = {
  ap    : "sản lượng và doanh thu",
  khongAp: "chi phí (số nguồn đã là lũy kế cuối tháng) · chất lượng và đơn giá (số bình quân)"
};

/* --- 7 TIÊU CHÍ CHẤT LƯỢNG của SHEET TỔNG QUAN (và slide 3 của deck) ------------
   Khách chốt: Tổng quan chỉ chấm ĐÚNG 7 tiêu chí — 5 tại nhà + 2 tại kho.
   Các tiêu chí còn lại (PHỤC VỤ 5 SAO tại kho · TRẢ NCC + CHUYỂN ĐSD · HÀNG HỦY ·
   2 tiêu chí GÓI BẢO HÀNH) vẫn tính ở sheet CHẤT LƯỢNG nhưng ẨN mặc định.
   Khai báo bằng cặp (loai, key) trùng khớp CL_NHA / CL_KHO ở lớp CALC — KHÔNG chép
   danh sách này ở nơi thứ hai; module PPT dùng chung đúng hằng số này.            */
const CL_TQ7 = [
  {loai:"nha", key:"dungHen", name:"ĐÚNG HẸN"},
  {loai:"nha", key:"sao",     name:"PHỤC VỤ 5 SAO"},
  {loai:"nha", key:"tayNghe", name:"TAY NGHỀ CHUẨN"},
  {loai:"nha", key:"xldd",    name:"TAY NGHỀ XỬ LÝ 1 LẦN"},
  {loai:"nha", key:"s5",      name:"THỢ CHUẨN 5S"},
  {loai:"kho", key:"14ngay",  name:"THỜI GIAN XỬ LÝ 14N (Tại Kho)"},
  {loai:"kho", key:"laplai",  name:"QUAY LẠI 30N (Tại Kho)"}
];
const CL_TQ7_HAS = (loai,key)=>CL_TQ7.some(x=>x.loai===loai && x.key===key);
const CL_TQ7_N   = CL_TQ7.length;                       // = 7
/* Ô tick "Hiện thêm tiêu chí phụ" ở sheet CHẤT LƯỢNG — lưu trong CONFIG.hienThi nên
   đi cùng localStorage và file JSON như mọi tuỳ chọn khác của người dùng. */
function clPhuOn(){ return !!(CONFIG.hienThi && CONFIG.hienThi.clTieuChiPhu); }
/* Ô tick "Hiện so sánh Target VƯỢT TRỘI" ở sheet DOANH THU. Target vượt trội chỉ có
   ở nhóm SỬA CHỮA KHÁCH LẺ (nguồn: cột "Target VƯỢT TRỘI" của sheet 6. DOANH THU),
   nên cụm so sánh này chỉ áp cho đúng nhóm đó, không cộng vào BÊN NGOÀI / TỔNG.   */
function vtOn(){ return !!(CONFIG.hienThi && CONFIG.hienThi.dtVuotTroi); }
/* ---- 5 NHÓM DOANH THU BÊN NGOÀI MỚI (khách bổ sung vào sheet TARGET 08/09/2026) ----
   Trước đây BÊN NGOÀI chỉ gồm 3 nhóm (1 Đổi 1 · BHMR · Sửa chữa khách lẻ). Sheet
   TARGET nay tách thành 8 nhóm; 5 nhóm dưới đây HIỆN CHỈ CÓ TARGET (sheet 6 chưa có
   cột thực đạt cho chúng) nên trên web sẽ hiện "chưa có dữ liệu" ở cột thực đạt.
   Khai Ở ĐÂY LÀ NGUỒN DUY NHẤT — mọi nơi khác (tổng BÊN NGOÀI, bảng, PPT, Excel,
   Hỏi đáp) đều đọc từ danh sách này, ĐỪNG hard-code lại tên nhóm ở chỗ khác.        */
const DT_NGOAI_MOI=[
  {cat:"BH ủy quyền",    fld:"uyquyen", ten:"Bảo hành ủy quyền"},
  {cat:"SC BHX/ĐMX",     fld:"scbhx",   ten:"Sửa chữa BHX/ĐMX"},
  {cat:"Gói PRO",        fld:"goipro",  ten:"Gói PRO"},
  {cat:"Thu cũ đổi mới", fld:"thucu",   ten:"Thu cũ đổi mới"},
  {cat:"Solar",          fld:"solar",   ten:"Solar Midea + Xiaomi"}
];
/* 3 nhóm ngoài "gốc" + 5 nhóm mới = toàn bộ cấu thành BÊN NGOÀI */
const DT_NGOAI_GOC=["BH 1 đổi 1","BHMR","SCDV"];
const DT_NGOAI_ALL=DT_NGOAI_GOC.concat(DT_NGOAI_MOI.map(x=>x.cat));

const DT_CATS=[["Bảo hành tại kho","trong"],["Bảo hành tại nhà","trong"],["Bán gói năm 2025","trong"],
               ["BH 1 đổi 1","ngoai"],["BHMR","ngoai"],["SCDV","ngoai"]]
              .concat(DT_NGOAI_MOI.map(x=>[x.cat,"ngoai"]));

/* ============================ HELPERS ============================ */
const $  = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];
const NB = v=>(typeof v==="number" && isFinite(v)) ? v : null;
/* DB.ky[].tinh lưu TIỀN bằng ĐỒNG (DB.meta.donViTien) — lớp CALC quy đổi sang TRIỆU
   ngay tại biên đọc dữ liệu, vì toàn bộ lớp hiển thị dùng đơn vị triệu đồng. */
const TRI = v=>{const n=NB(v); return n==null?null:n/1e6;};
const DASH = '<span class="dash">–</span>';
const fx = (v,d=1)=>v==null?"–":v.toLocaleString("vi-VN",{minimumFractionDigits:d,maximumFractionDigits:d});
const f0 = v=>v==null?"–":Math.round(v).toLocaleString("vi-VN");
const pc = v=>v==null?"–":(v*100).toLocaleString("vi-VN",{maximumFractionDigits:0})+"%";
const pc1= v=>v==null?"–":(v*100).toLocaleString("vi-VN",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
/* pc()/pc1() nhận PHÂN SỐ (0,75 -> "75%"). pcv() nhận giá trị ĐÃ QUY VỀ ĐƠN VỊ %
   (75 -> "75,0%") — dùng cho các chuỗi số liệu đã nhân 100 sẵn (biểu đồ xu hướng).
   Trộn hai loại này là lỗi nhân 100 hai lần: 0,75 -> 7.500,0%. */
const pcv= v=>v==null?"–":fx(v,1)+"%";
const tr = v=>v==null?"–":(Math.abs(v)>=1000?fx(v/1000,2)+" tỷ":fx(v,0)+" tr");
const vnd= v=>v==null?"–":Math.round(v).toLocaleString("vi-VN")+"đ";
const esc= s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const KHO = s=>String(s||"").split(" - ")[0].trim();
const tinhOf=k=>(KHOMAP[KHO(k)]||{}).tinh||KHO(k);
const vungOf=k=>(KHOMAP[KHO(k)]||{}).vung||"";
const clamp =(v,a,b)=>Math.max(a,Math.min(b,v));
/* nhãn sửa được: hiện chữ đã ghi đè (nếu có), bật chế độ "Sửa nhãn" thì cho gõ tại chỗ */
function lblH(key,def,tag){
  const t=LB(key,def), T=tag||"span", ov=DB.labels[key]!=null&&String(DB.labels[key]).trim()!=="";
  return `<${T} class="lbl${ov?" ov":""}" data-lbl="${esc(key)}" data-lbldef="${esc(def)}"
    ${LBLMODE?'contenteditable="true" spellcheck="false"':""}
    title="${LBLMODE?"Gõ để đổi tên nhãn":"Bấm đúp để đổi tên nhãn"}">${esc(t)}</${T}>`;
}
/* đọc số kiểu Việt (1.234,5) hoặc kiểu Anh (1234.5) — trả null nếu không hợp lệ */
function parseVN(s){
  if(s==null) return null;
  let t=String(s).trim().replace(/\s| /g,"").replace(/[đ%]/gi,"").replace(/(tr|tỷ|đơn|điểm)$/i,"");
  if(t==="") return null;
  let neg=false;
  if(/^\(.*\)$/.test(t)){ neg=true; t=t.slice(1,-1); }
  if(/^-/.test(t)){ neg=true; t=t.slice(1); }
  if(!/^[\d.,]+$/.test(t)) return null;
  const lc=t.lastIndexOf(","), ld=t.lastIndexOf(".");
  if(lc>=0 && ld>=0)      t = lc>ld ? t.replace(/\./g,"").replace(",",".") : t.replace(/,/g,"");
  else if(lc>=0)          t = (t.split(",").length>2 || t.length-lc-1===3 && /^\d{1,3}(,\d{3})+$/.test(t))
                                ? t.replace(/,/g,"") : t.replace(",",".");
  else if(ld>=0)          t = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g,"") : t;
  const v=parseFloat(t);
  return isFinite(v) ? (neg?-v:v) : null;
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),3800)}

/* ============================ ICONS (Lucide-style, inline) ============================ */
const ICONPATH = {
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  star:'<path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.4 2.4 0 0 1-3.4 0l-1.6-1.6a2.4 2.4 0 0 1 0-3.4z"/><path d="m17.5 3.5 3 3"/>',
  badgecheck:'<path d="M3.9 8.6a3 3 0 0 1 1.8-3.1l2-.8a3 3 0 0 0 1.1-.8l1.4-1.6a3 3 0 0 1 3.6 0l1.4 1.6a3 3 0 0 0 1.1.8l2 .8a3 3 0 0 1 1.8 3.1l-.3 2.1a3 3 0 0 0 0 1.4l.3 2.1a3 3 0 0 1-1.8 3.1l-2 .8a3 3 0 0 0-1.1.8l-1.4 1.6a3 3 0 0 1-3.6 0l-1.4-1.6a3 3 0 0 0-1.1-.8l-2-.8a3 3 0 0 1-1.8-3.1l.3-2.1a3 3 0 0 0 0-1.4z"/><path d="m9 12 2 2 4-4"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  sparkles:'<path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18.5 15.5 19.4 18l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z"/>',
  clipboardcheck:'<rect x="7.5" y="3.5" width="9" height="4" rx="1.4"/><path d="M16.5 5.5h1.9A1.6 1.6 0 0 1 20 7.1v12.3a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19.4V7.1a1.6 1.6 0 0 1 1.6-1.6h1.9"/><path d="m9 14 2 2 4-4"/>',
  pkg:'<path d="M20.5 7.6v8.8a1.6 1.6 0 0 1-.9 1.4l-6.8 3.6a1.6 1.6 0 0 1-1.6 0l-6.8-3.6a1.6 1.6 0 0 1-.9-1.4V7.6a1.6 1.6 0 0 1 .9-1.4l6.8-3.6a1.6 1.6 0 0 1 1.6 0l6.8 3.6a1.6 1.6 0 0 1 .9 1.4z"/><path d="m3.8 6.7 8.2 4.4 8.2-4.4M12 21v-9.9"/>',
  coins:'<circle cx="9" cy="9" r="5.4"/><path d="M17.2 5.2a5.4 5.4 0 0 1 0 13.6M14 18.7a5.4 5.4 0 0 1-9.6-3.3"/>',
  wallet:'<path d="M20 8V6.8A1.8 1.8 0 0 0 18.2 5H5.4A1.8 1.8 0 0 0 3.6 6.8v10.4A1.8 1.8 0 0 0 5.4 19h12.8a1.8 1.8 0 0 0 1.8-1.8V16"/><path d="M21 11.4h-4.6a1.9 1.9 0 0 0 0 3.8H21z"/>',
  calculator:'<rect x="4.5" y="2.8" width="15" height="18.4" rx="2"/><path d="M8 7h8M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 15h.01M12 15h.01M16 15h.01M8 18.4h.01M12 18.4h.01M16 18.4h.01"/>',
  receipt:'<path d="M5 21V4.6A1.6 1.6 0 0 1 6.6 3h10.8A1.6 1.6 0 0 1 19 4.6V21l-2.3-1.6-2.3 1.6-2.4-1.6L9.6 21l-2.3-1.6z"/><path d="M8.6 7.5h6.8M8.6 11.5h6.8M8.6 15.5h3.4"/>',
  trendup:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  banknote:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v4M18 10v4"/>',
  map:'<path d="m9 3.5-5.4 2.2a1 1 0 0 0-.6.9v14a.8.8 0 0 0 1.1.7L9 19.5l6 2 5.4-2.2a1 1 0 0 0 .6-.9v-14a.8.8 0 0 0-1.1-.7L15 5.5z"/><path d="M9 3.5v16M15 5.5v16"/>',
  warehouse:'<path d="M21 20V8.6a1.4 1.4 0 0 0-.9-1.3l-7.6-3a1.4 1.4 0 0 0-1 0l-7.6 3A1.4 1.4 0 0 0 3 8.6V20"/><path d="M7 20v-7h10v7M7 16.5h10M3 20h18"/>',
  user:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>',
  alert:'<path d="M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.4"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.4"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4"/>',
  home:'<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.6 9v10.5a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9"/>',
  chev:'<path d="m9 5 7 7-7 7"/>',
  chevl:'<path d="m15 5-7 7 7 7"/>',
  chevd:'<path d="m6 9 6 6 6-6"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19.6 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V4a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  refresh:'<path d="M20.5 11.5a8.5 8.5 0 0 0-14.6-5L3 9.5"/><path d="M3 4.5v5h5"/><path d="M3.5 12.5a8.5 8.5 0 0 0 14.6 5l2.9-3"/><path d="M21 19.5v-5h-5"/>',
  download:'<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  upload:'<path d="M12 16V4"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M4 20h16"/>',
  file:'<path d="M14 3H7.6A1.6 1.6 0 0 0 6 4.6v14.8A1.6 1.6 0 0 0 7.6 21h8.8a1.6 1.6 0 0 0 1.6-1.6V7z"/><path d="M14 3v4h4"/>',
  present:'<path d="M3 4h18M4.5 4v9.4a1.6 1.6 0 0 0 1.6 1.6h11.8a1.6 1.6 0 0 0 1.6-1.6V4"/><path d="m9.5 20 2.5-5 2.5 5"/>',
  save:'<path d="M19.5 21H4.5A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3h11L21 8.5v11A1.5 1.5 0 0 1 19.5 21z"/><path d="M7.5 21v-7h9v7M7.5 3v5h7"/>',
  sort:'<path d="M7 4v16M7 20l-3.5-3.5M7 20l3.5-3.5"/><path d="M17 20V4M17 4l-3.5 3.5M17 4l3.5 3.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5M12 8h.01"/>',
  check:'<path d="m5 12.5 5 5L19.5 7"/>',
  minus:'<path d="M5 12h14"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 6.5h16M9.5 6.5V4.6A1.6 1.6 0 0 1 11.1 3h1.8a1.6 1.6 0 0 1 1.6 1.6v1.9"/><path d="M6.5 6.5 7.4 20a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-13.5"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9.5 9.5V20"/>',
  layers:'<path d="m12 2.5 9 4.6-9 4.6-9-4.6z"/><path d="m3 12.5 9 4.6 9-4.6M3 17.3l9 4.6 9-4.6"/>',
  medal:'<circle cx="12" cy="15" r="5.4"/><path d="M8.2 10.3 5.5 3h13l-2.7 7.3M12 12.8l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 15l2-.3z"/>',
  flame:'<path d="M12 2.5s6.2 6.9 6.2 11.2a6.2 6.2 0 1 1-12.4 0C5.8 9.4 12 2.5 12 2.5z"/>',
  building:'<rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10.5 21v-3h3v3"/>',
  scale:'<path d="M12 3v18M7 6.5h10"/><path d="m5 8-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  message:'<path d="M4 4.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.6 3.7A.6.6 0 0 1 3.5 20.2V17.5H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/><path d="M7.5 9.5h9M7.5 13h6"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4.5A2.5 2.5 0 0 0 6 9.3M16 5h3.5A2.5 2.5 0 0 1 18 9.3"/><path d="M12 13v3M9 20h6M9.5 20a2.5 2.5 0 0 1 5 0"/>',
  chevdown:'<path d="m6 9 6 6 6-6"/>'
};
function ic(name,size=16,cls=""){
  const p=ICONPATH[name]; if(!p) return "";
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${p}</svg>`;
}
/* ánh xạ icon theo NGỮ CẢNH đúng như client yêu cầu */
const KPI_ICON = {
  "ĐÚNG HẸN":"clock", "PHỤC VỤ 5 SAO":"star", "TAY NGHỀ CHUẨN":"badgecheck",
  "TAY NGHỀ XỬ LÝ 1 LẦN":"target", "THỢ CHUẨN 5S":"sparkles",
  "THỜI GIAN XỬ LÝ 14N (Tại Kho)":"clock", "QUAY LẠI 30N (Tại Kho)":"refresh",
  "Sản Lượng":"pkg", "Đơn Giá:":"coins", "Chi Phí":"calculator",
  chatLuong:"shield", sanLuong:"pkg", donGia:"coins", chiPhi:"calculator", doanhThu:"trendup",
  tinh:"map", kho:"warehouse", hanhDong:"clipboardcheck", nguoi:"user", ngay:"calendar", canhBao:"alert"
};
const MODULES = [
  {id:"m0", ten:"SHEET TỔNG QUAN",         icon:"grid",           lk:"tab.m0"},
  {id:"m1", ten:"CHẤT LƯỢNG",              icon:"shield",         lk:"tab.m1"},
  {id:"m2", ten:"SẢN LƯỢNG & ĐƠN GIÁ TB",  icon:"pkg",            lk:"tab.m2"},
  {id:"m3", ten:"CHI PHÍ",                 icon:"calculator",     lk:"tab.m3"},
  {id:"m4", ten:"DOANH THU",               icon:"trendup",        lk:"tab.m4"},
  {id:"m5", ten:"TỈNH/KHO",                icon:"map",            lk:"tab.m5"},
  {id:"m6", ten:"HÀNH ĐỘNG",               icon:"clipboardcheck", lk:"tab.m6"},
  {id:"m7", ten:"TRÌNH CHIẾU (PPT)",       icon:"present",        lk:"tab.m7"},
  {id:"m8", ten:"HỎI ĐÁP",                 icon:"message",        lk:"tab.m8"},
  {id:"m9", ten:"VƯỢT TRỘI",           icon:"trophy",         lk:"tab.m9"}
];

