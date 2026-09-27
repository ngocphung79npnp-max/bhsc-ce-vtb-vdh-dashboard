
/* =============================================================================
   XUẤT EXCEL — dựng lại kho dữ liệu T1→T12 theo ĐÚNG cấu trúc file nguồn
   (DATA_UP_WEB_v2.xlsx: 9 sheet, tiêu đề dòng 1-2, tiêu đề cột dòng 4-5,
    dữ liệu từ dòng 6).

   BA NGUYÊN TẮC BẤT DI BẤT DỊCH CỦA MODULE NÀY
   1. SỐ GỐC. Mọi ô số đọc THẲNG từ DB.ky[kỳ].tinh[mã] — KHÔNG đi qua tRec()
      nên lớp ghi đè thủ công (DB.edits) không lọt vào file xuất. File xuất luôn
      là bản gốc từ Excel nguồn, để đối chiếu và nhập lại được.
   2. CÔNG THỨC SỐNG. Cột "% HT" và mọi dòng TỔNG là Ô CÔNG THỨC thật của Excel
      ({t:"n", f:"…"}), không phải số tính sẵn — sửa một ô target là bảng tự
      tính lại. Các cột gốc của file nguồn giữ nguyên vị trí ở bên trái để file
      vẫn nhập ngược lại được.
   3. KHÔNG PHỤ THUỘC BỘ LỌC. Luôn xuất đủ mọi tháng đang có trong DB.ky, bất kể
      màn hình đang lọc kỳ nào.

   QUY ĐỔI NGƯỢC so với lúc nhập (đối chiếu import_data.py — bản nhập nguồn):
     · ĐÚNG HẸN  : nguồn ghi TỶ LỆ TRỄ, DB lưu tỷ lệ đúng hẹn -> ghi ra 1 − đúng hẹn.
     · DOANH THU BÊN TRONG (quy tắc khách chốt lại vòng 3 — 19/08/2026): Gói bán
       2025 LUÔN tách riêng khỏi "Bảo hành tại nhà", KHÔNG gộp vào dt.trong.act
       nữa -> ghi thẳng dt.trong.act (một số ít kỳ cũ trước 19/08/2026 còn có
       actDH tách sẵn thì ưu tiên actDH, không thì dùng act).
     · Tháng chỉ có kế hoạch: thực đạt được cất ở actKeHoach -> ghi lại đúng ô cũ.
     · Tiền là ĐỒNG (DB.meta.donViTien). Tiêu đề cột ghi "(đồng)" cho đúng đơn vị
       thật của số liệu (file nguồn ghi nhầm "triệu đồng"/"tr.đ" nhưng số là đồng).
   ============================================================================= */

/* --- tên file và tên 9 sheet: giữ NGUYÊN VĂN của file nguồn, kể cả khoảng
       trắng thừa ('3. SẢN LƯỢNG ' có dấu cách cuối, '4.  ĐƠN GIÁ' hai dấu cách) */
const XO_FILE = "KHO-DU-LIEU-BHSC-2026_T1-T12.xlsx";
const XO_TEN  = {
  hd:"HƯỚNG DẪN", s1:"1. CHẤT LƯỢNG - TẠI NHÀ", s2:"2. CHẤT LƯỢNG - TẠI KHO",
  s3:"3. SẢN LƯỢNG ", s4:"4.  ĐƠN GIÁ", s5:"5. CHI PHÍ", s6:"6. DOANH THU",
  s7:"7. CHẤT LƯỢNG GÓI BẢO HÀNH", tg:"TARGET"
};
/* nhãn vùng RÚT GỌN dùng ở 7 sheet dữ liệu (sheet TARGET dùng nhãn đầy đủ) */
const xoVungNgan = code => (vungOf(code)===VTB ? "Trung Bộ" : "Duyên Hải");
/* tên tỉnh ở sheet TARGET viết tắt hơn 7 sheet còn lại — giữ đúng nguyên bản */
const XO_TG_TEN  = { "VTB_HUE":"Huế", "VDH_BRV":"Bà Rịa" };
const xoTgTen    = (code,kho) => (XO_TG_TEN[code]||tinhOf(code)) + (kho?" (Tại Kho)":"");

/* =============================================================================
   BẢN ĐỒ CỘT — KHAI BÁO MỘT LẦN, DÙNG CHO CẢ XUẤT LẪN NHẬP
   Cả hàm xuất (xoSheet*) lẫn hàm nhập (xoDocV2) đều đọc từ đúng các hằng số dưới
   đây, nên hai chiều không bao giờ lệch nhau: sửa vị trí cột ở một chỗ là cả xuất
   và nhập cùng đổi theo.
     · Sheet 1 & 2 KHÔNG có cột "Loại hình" -> nhóm đầu tiên bắt đầu ở cột E.
     · Sheet 3-7 CÓ cột "Loại hình"        -> nhóm đầu tiên bắt đầu ở cột F.
     · Mỗi nhóm rộng 2 cột (Target | Thực đạt), riêng sheet 6 rộng 4 cột
       (Số Lượng | Đơn giá TB | Target | Thực đạt).
   "kiểu" quyết định cách đọc số: pct = tỷ lệ (phân số) · score = điểm giữ nguyên
   thang · dh = ĐÚNG HẸN (nguồn ghi TỶ LỆ TRỄ, phải nghịch đảo) · num = số đếm ·
   money = tiền (đồng).                                                          */
const XO_C0_CL=5, XO_C0=6, XO_W2=2, XO_W4=4;
const xoColNhom=(c0,i,w)=>c0+i*w;
const XO_CL_NHA=[                       /* sheet 1 · cột E,G,I,K,M */
  ["dungHen","dh",   "ĐÚNG HẸN",             "(%)"],
  ["sao",    "score","PHỤC VỤ 5 SAO",        "(thang 5)"],
  ["tayNghe","pct",  "TAY NGHỀ CHUẨN",       "(%)"],
  ["xldd",   "pct",  "TAY NGHỀ XỬ LÝ 1 LẦN", "(%)"],
  ["s5",     "score","THỢ CHUẨN 5S",         "(thang 10)"]
];
const XO_CL_KHO=[                       /* sheet 2 · cột E,G,I,K,M */
  ["sao","score","PHỤC VỤ 5 SAO",                              "(thang 5)"],
  ["n14","pct",  "THỜI GIAN XỬ LÝ 14N (Tại Kho)",              "(%)"],
  ["n30","pct",  "QUAY LẠI 30N (Tại Kho)",                     "(%)"],
  ["ncc","pct",  "XỬ LÝ HÀNG TẠI KHO: TRẢ NCC + CHUYỂN ĐSD",   "(%)"],
  ["huy","pct",  "HÀNG HỦY",                                   "(%)"]
];
const XO_CG_CATS=[["doi1","1 ĐỔI 1"],["bhmr","BẢO HÀNH MỞ RỘNG"]];   /* sheet 7 · cột F,H */

/* ---------------------------------------------------------------- ô & công thức */
const xoC   = i => XLSX.utils.encode_col(i);                 // 0 -> "A"
const xoN   = (v,z)=>{ const n=NB(v); if(n==null) return null;
                       const c={t:"n",v:n}; if(z) c.z=z; return c; };
const xoS   = s => (s==null||s==="") ? null : {t:"s",v:String(s)};
/* ô RỖNG NHƯNG CÓ THẬT: dòng TỔNG cần đủ ô từ cột A để dải nền vàng liền mạch,
   ô trống hoàn toàn sẽ không tồn tại trong file nên không tô được. */
const xoTrong = ()=>({t:"s",v:""});
const xoF   = (f,z)=>{ const c={t:"n",f:f}; if(z) c.z=z; return c; };
const xoSum = (c,a,b)=>xoF(`SUM(${c}${a}:${c}${b})`,"#,##0");
const xoAvg = (c,a,b)=>xoF(`IFERROR(AVERAGE(${c}${a}:${c}${b}),"")`,"#,##0");
/* %HT = thực đạt / target, luôn là công thức để sửa target là tự tính lại */
const xoPct = (ct,ca,rn)=>xoF(`IFERROR(${ca}${rn}/${ct}${rn},"")`,"0.0%");
const Z_TIEN="#,##0", Z_DON="#,##0", Z_GIA="#,##0", Z_TL="0.00%", Z_DIEM="0.00";

/* đọc bản ghi GỐC: cố tình KHÔNG dùng tRec() để bỏ qua lớp sửa tay DB.edits */
function xoRec(nam,thang,code,kho){
  const D=DB.ky[kyKey(nam,thang)]; if(!D||!D.tinh) return null;
  const u=D.tinh[code]; if(!u) return null;
  return kho ? (u.kho||null) : u;
}
const xoGet = (o,p)=>{ let x=o; for(const s of String(p).split(".")){ if(x==null) return null; x=x[s]; } return NB(x); };
/* Ô chất lượng. Kho dữ liệu phân biệt HAI trạng thái rỗng khác nhau:
     · chuaDo = true  -> kỳ đó KHÔNG ĐO  -> ghi đúng chữ "Chưa đo" như file nguồn
     · không cờ, null -> CHƯA CÓ dữ liệu -> để trống ô
   Ghi "Chưa đo" cho cả hai sẽ làm mất thông tin khi nhập ngược trở lại. */
const xoDo  = (v,z,cd)=> cd ? xoS("Chưa đo") : (v==null ? null : xoN(v,z));
/* làm tròn 6 chữ số để phép trừ 1 − tỷ lệ không sinh đuôi nhị phân (0.017800000000000038) */
const xoR6  = v => v==null ? null : Math.round(v*1e6)/1e6;

/* năm được xuất: ưu tiên năm đang xem, không có dữ liệu thì lấy năm đầu trong kho */
function xoNam(){
  if(monthsOf(ST.nam).length) return ST.nam;
  const ks=Object.keys(DB.ky).sort();
  return ks.length ? +ks[0].split("-")[0] : ST.nam;
}
/* danh sách đơn vị của một dòng dữ liệu: 12 tỉnh (tại nhà) rồi 2 kho (tại kho) */
const XO_U_TINH = ()=>KHO_ORDER.map(c=>({code:c,kho:false}));
const XO_U_KHO  = ()=>KHOKHO.map(c=>({code:c,kho:true}));
const XO_U_ALL  = ()=>XO_U_TINH().concat(XO_U_KHO());

/* 4 (hoặc 5) cột định danh mở đầu MỌI sheet dữ liệu */
const xoDinhDanh = (m,u,coLoai)=>{
  const a=[xoN(m), xoS(xoVungNgan(u.code)), xoS(tinhOf(u.code)), xoS(u.code)];
  if(coLoai) a.push(xoS(u.kho?"Tại kho":"Tại nhà"));
  return a;
};

/* ---------------------------------------------------------------- khung dựng sheet
   o = { title, sub, ncol, h4, h5, merges, units, row(m,u,rn), tong(m,r0,r1), cols } */
function xoBuild(o){
  const A=[[xoS(o.title)],[xoS(o.sub)],[]];
  A.push(o.h4); A.push(o.h5);
  const mg=[{s:{r:0,c:0},e:{r:0,c:o.ncol-1}},{s:{r:1,c:0},e:{r:1,c:o.ncol-1}}].concat(o.merges||[]);
  const dongTong=[];
  for(const m of o.months){
    const r0=A.length+1;                                  // dòng dữ liệu đầu khối (1-based)
    for(const u of o.units) A.push(o.row(m,u,A.length+1));
    if(o.tong){ A.push(o.tong(m,r0,A.length)); dongTong.push(A.length); }
  }
  const ws=XLSX.utils.aoa_to_sheet(A);
  ws["!merges"]=mg;
  if(o.cols) ws["!cols"]=o.cols;
  /* Đóng băng 5 dòng tiêu đề + các cột định danh, và ghi nhận dòng TỔNG để bước
     trang trí (chạy trên gói .xlsx đã ghi xong) tô nền và kẻ viền cho đúng dòng. */
  XO_DECO[o.sheet||o.title]={ dong:XO_HANG_DL-1, cot:o.ncotKhoa, tong:dongTong, ncol:o.ncol,
    tieu:[1], phu:[2], hdr:[4,5] };
  return ws;
}
/* dòng đầu tiên của vùng dữ liệu trên MỌI sheet dữ liệu (1-5 là tiêu đề) */
const XO_HANG_DL=6;
/* bảng ghi chú trang trí cho từng sheet, dựng lại mỗi lần xuất */
let XO_DECO={};
/* merge cặp "nhóm tiêu chí" ở dòng 4 + merge dọc 4:5 cho các cột định danh */
const xoMgDoc = n => [...Array(n)].map((_,i)=>({s:{r:3,c:i},e:{r:4,c:i}}));
const xoMgNgang = (c,w)=>({s:{r:3,c:c},e:{r:3,c:c+w-1}});

/* ============================================================================
   SHEET 1 · CHẤT LƯỢNG - TẠI NHÀ   (12 tỉnh, KHÔNG có cột "Loại hình")
   A Tháng · B Vùng · C Tên · D Mã · E-F ĐÚNG HẸN · G-H PHỤC VỤ 5 SAO ·
   I-J TAY NGHỀ CHUẨN · K-L TAY NGHỀ XỬ LÝ 1 LẦN · M-N THỢ CHUẨN 5S
   ========================================================================== */
/* khung chung của 2 sheet chất lượng: cùng bố cục, chỉ khác danh sách tiêu chí,
   danh sách đơn vị và nơi cất bản ghi trong DB (cl / kho.clKho) */
function xoSheetCL(o){
  const h4=[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã")], h5=[null,null,null,null];
  o.tc.forEach(t=>{ h4.push(xoS(t[2]),null);
    h5.push(xoS("KPI "+t[3]),xoS("Thực đạt "+t[3])); });
  return xoBuild({
    months:o.months, units:o.units, ncol:4+o.tc.length*XO_W2,
    sheet:o.sheet, ncotKhoa:4,
    title:o.title, sub:o.sub, h4, h5,
    merges:xoMgDoc(4).concat(o.tc.map((_,i)=>xoMgNgang(xoColNhom(XO_C0_CL,i,XO_W2)-1,XO_W2))),
    cols:o.cols,
    row(m,u){
      const r=xoRec(o.nam,m,u.code,o.laKho), rec=(r&&r[o.field])||{};
      const a=xoDinhDanh(m,u,false);
      o.tc.forEach(t=>{
        const z = t[1]==="score" ? Z_DIEM : Z_TL;
        const cd = !!(rec[t[0]] && rec[t[0]].chuaDo);      // kỳ này KHÔNG ĐO, khác với chưa có số
        /* ĐÚNG HẸN: DB lưu tỷ lệ đúng hẹn, file nguồn ghi TỶ LỆ TRỄ -> ghi ra 1 − x */
        const v=p=>{ const x=xoGet(rec,t[0]+"."+p); return (x==null||t[1]!=="dh")?x:xoR6(1-x); };
        a.push(xoDo(v("kpi"),z,cd), xoDo(v("act"),z,cd));
      });
      return a;
    }
  });
}
function xoSheet1(nam,months){
  return xoSheetCL({ nam, months, units:XO_U_TINH(), tc:XO_CL_NHA, field:"cl", laKho:false,
    sheet:XO_TEN.s1, title:XO_TEN.s1,
    sub:`Tháng 1→12 / ${nam} · 12 tỉnh · 5 tiêu chí — số gốc từ kho dữ liệu, cột ĐÚNG HẸN ghi TỶ LỆ TRỄ như file nguồn`,
    cols:[{wch:7},{wch:12},{wch:20},{wch:15},{wch:13},{wch:13},{wch:13},{wch:16},
          {wch:13},{wch:13},{wch:13},{wch:13},{wch:14},{wch:17}] });
}

/* ============================================================================
   SHEET 2 · CHẤT LƯỢNG - TẠI KHO   (2 kho, KHÔNG có cột "Loại hình")
   ========================================================================== */
function xoSheet2(nam,months){
  return xoSheetCL({ nam, months, units:XO_U_KHO(), tc:XO_CL_KHO, field:"clKho", laKho:true,
    sheet:XO_TEN.s2, title:XO_TEN.s2,
    sub:`Tháng 1→12 / ${nam} · 2 kho (Đà Nẵng, Khánh Hòa) · 5 tiêu chí — số gốc từ kho dữ liệu`,
    cols:[{wch:7},{wch:12},{wch:20},{wch:15},{wch:14},{wch:17},{wch:16},{wch:16},
          {wch:14},{wch:14},{wch:20},{wch:16},{wch:12},{wch:14}] });
}

/* --- thực đạt "số gốc" của từng nhóm ---------------------------------------
   sl/dgia: tháng chỉ có kế hoạch thì thực đạt được cất ở actKeHoach.
   dt.trong: một số kỳ CŨ (trước 19/08/2026) còn actDH tách sẵn (từ thời còn
   gộp gói vào act) -> ưu tiên actDH cho các kỳ đó; kỳ MỚI không còn gộp nữa
   nên không có actDH, dùng thẳng act (đã là đơn hàng thuần).                  */
const xoActCat = c => !c ? null : (NB(c.act)!=null ? NB(c.act) : NB(c.actKeHoach));
const xoActDt  = (c,cat)=>{ if(!c) return null;
  if(cat==="trong") return ("actDH" in c) ? NB(c.actDH) : NB(c.act);
  return xoActCat(c); };

/* ============================================================================
   SHEET 3 · SẢN LƯỢNG   (12 tỉnh + 2 kho · 5 nhóm · thêm cột % HT ở cột P)
   ========================================================================== */
const XO_SL_CATS=[["trong","SẢN LƯỢNG BÊN TRONG"],["goi","SẢN LƯỢNG GÓI BÁN 2025"],
                  ["doi1","SẢN LƯỢNG 1 Đổi 1"],["bhmr","SẢN LƯỢNG bảo Hành Mở rộng"],
                  ["sckl","SẢN LƯỢNG Sửa Chữa Khách Lẻ"]]
                 /* 5 nhóm mới: phải có mặt để xuất→nhập không làm mất sản lượng kế hoạch */
                 .concat(DT_NGOAI_MOI.map(x=>[x.fld,"SẢN LƯỢNG "+x.ten]));
function xoSheet3(nam,months){
  const h4=[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã"),xoS("Loại hình")];
  const h5=[null,null,null,null,null];
  XO_SL_CATS.forEach(c=>{ h4.push(xoS(c[1]),null); h5.push(xoS("Target (đơn)"),xoS("Thực đạt (đơn)")); });
  h4.push(xoS("% HT")); h5.push(xoS("Thực đạt / Target (Bên trong)"));
  return xoBuild({
    months, units:XO_U_ALL(), ncol:16, sheet:XO_TEN.s3, ncotKhoa:5,
    title:XO_TEN.s3, sub:`Tháng 1→12 / ${nam} · 12 tỉnh (tại nhà) + 2 kho (tại kho) — số gốc từ kho dữ liệu`,
    h4, h5,
    merges:xoMgDoc(5).concat([xoMgNgang(5,2),xoMgNgang(7,2),xoMgNgang(9,2),xoMgNgang(11,2),
                              xoMgNgang(13,2),{s:{r:3,c:15},e:{r:4,c:15}}]),
    cols:[{wch:7},{wch:12},{wch:20},{wch:17},{wch:11}].concat([...Array(10)].map(()=>({wch:15}))).concat([{wch:10}]),
    row(m,u,rn){
      const r=xoRec(nam,m,u.code,u.kho), cats=(r&&r.sl&&r.sl.cats)||{};
      const a=xoDinhDanh(m,u,true);
      XO_SL_CATS.forEach(c=>{ const x=cats[c[0]];
        a.push(xoN(x&&x.target,Z_DON), xoN(xoActCat(x),Z_DON)); });
      a.push(xoPct("F","G",rn));
      return a;
    },
    tong(m,r0,r1){
      const a=[xoTrong(),xoTrong(),xoS("TỔNG T"+m),xoTrong(),xoTrong()];
      for(let i=5;i<15;i++) a.push(xoSum(xoC(i),r0,r1));
      a.push(xoPct("F","G",r1+1));
      return a;
    }
  });
}

/* ============================================================================
   SHEET 4 · ĐƠN GIÁ   (4 nhóm · % HT ở cột N · dòng TỔNG lấy BÌNH QUÂN vì
   cộng dồn đơn giá không có ý nghĩa nghiệp vụ)
   ========================================================================== */
const XO_DG_CATS=[["trong","ĐƠN GIÁ TRUNG BÌNH BÊN TRONG"],["doi1","ĐƠN GIÁ 1 ĐỔI 1"],
                  ["bhmr","ĐƠN GIÁ BẢO HÀNH MỞ RỘNG"],["sckl","ĐƠN GIÁ SỬA CHỮA KHÁCH LẺ"]];
function xoSheet4(nam,months){
  const h4=[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã"),xoS("Loại hình")];
  const h5=[null,null,null,null,null];
  XO_DG_CATS.forEach(c=>{ h4.push(xoS(c[1]),null); h5.push(xoS("Target (đồng/đơn)"),xoS("Thực đạt (đồng/đơn)")); });
  h4.push(xoS("% HT")); h5.push(xoS("Thực đạt / Target (Bên trong)"));
  return xoBuild({
    months, units:XO_U_ALL(), ncol:14, sheet:XO_TEN.s4, ncotKhoa:5,
    title:"4. ĐƠN GIÁ", sub:`Tháng 1→12 / ${nam} · 12 tỉnh (tại nhà) + 2 kho (tại kho) — số gốc từ kho dữ liệu`,
    h4, h5,
    merges:xoMgDoc(5).concat([xoMgNgang(5,2),xoMgNgang(7,2),xoMgNgang(9,2),xoMgNgang(11,2),
                              {s:{r:3,c:13},e:{r:4,c:13}}]),
    cols:[{wch:7},{wch:12},{wch:20},{wch:17},{wch:11}].concat([...Array(8)].map(()=>({wch:17}))).concat([{wch:10}]),
    row(m,u,rn){
      const r=xoRec(nam,m,u.code,u.kho), cats=(r&&r.dgia&&r.dgia.cats)||{};
      const a=xoDinhDanh(m,u,true);
      XO_DG_CATS.forEach(c=>{ const x=cats[c[0]];
        a.push(xoN(x&&x.target,Z_GIA), xoN(xoActCat(x),Z_GIA)); });
      a.push(xoPct("F","G",rn));
      return a;
    },
    tong(m,r0,r1){
      const a=[xoTrong(),xoTrong(),xoS("TỔNG T"+m+" (bình quân)"),xoTrong(),xoTrong()];
      for(let i=5;i<13;i++) a.push(xoAvg(xoC(i),r0,r1));
      a.push(xoPct("F","G",r1+1));
      return a;
    }
  });
}

/* ============================================================================
   SHEET 5 · CHI PHÍ   (1 nhóm · % HT ở cột H = thực chi / định mức)
   Chi phí là chỉ tiêu ĐẢO CHIỀU: % HT càng thấp càng tốt.
   ========================================================================== */
function xoSheet5(nam,months){
  return xoBuild({
    months, units:XO_U_ALL(), ncol:8, sheet:XO_TEN.s5, ncotKhoa:5,
    title:"5.  CHI PHÍ", sub:`Tháng 1→12 / ${nam} · 12 tỉnh (tại nhà) + 2 kho (tại kho) — số gốc từ kho dữ liệu · đơn vị: đồng`,
    h4:[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã"),xoS("Loại hình"),xoS("CHI PHÍ"),null,xoS("% HT")],
    h5:[null,null,null,null,null,xoS("Target (đồng)"),xoS("Thực đạt (đồng)"),
        xoS("Thực chi / Định mức — càng thấp càng tốt")],
    merges:xoMgDoc(5).concat([xoMgNgang(5,2),{s:{r:3,c:7},e:{r:4,c:7}}]),
    cols:[{wch:7},{wch:12},{wch:20},{wch:17},{wch:11},{wch:20},{wch:20},{wch:14}],
    row(m,u,rn){
      const r=xoRec(nam,m,u.code,u.kho), cp=(r&&r.cp)||{};
      return [...xoDinhDanh(m,u,true), xoN(cp.target,Z_TIEN), xoN(cp.act,Z_TIEN), xoPct("F","G",rn)];
    },
    tong(m,r0,r1){
      return [xoTrong(),xoTrong(),xoS("TỔNG T"+m),xoTrong(),xoTrong(),
              xoSum("F",r0,r1), xoSum("G",r0,r1), xoPct("F","G",r1+1)];
    }
  });
}

/* ============================================================================
   SHEET 6 · DOANH THU   (5 nhóm × 4 cột [Số Lượng | Đơn giá TB | Target |
   Thực đạt] · % HT ở cột Z)
   Hai cột "Số Lượng"/"Đơn giá Trung Bình" chỉ là SỐ THAM CHIẾU của file nguồn
   (DB lưu ở slNguon/dgiaNguon) — giữ nguyên để nhập ngược lại được, KHÔNG dùng
   để tính sản lượng hay đơn giá (sheet 3 và sheet 4 mới là nguồn chuẩn).
   ========================================================================== */
/* Nhóm doanh thu. Cột thứ 3 = nhóm có TÁCH TARGET hay không: từ bản nguồn v3,
   riêng SỬA CHỮA KHÁCH LẺ tách thành "Target CÔNG TY" + "Target VƯỢT TRỘI"
   (5 cột thay vì 4). Bố cục cột được TÍNH TỪ danh sách này chứ không viết cứng,
   nên thêm/bớt cột chỉ phải sửa ở đây. */
const XO_DT_CATS=[["trong","BÊN TRONG",false],["goi","BÊN TRONG · GÓI BÁN 2025",false],
                  ["doi1","BÊN NGOÀI · 1 ĐỔI 1",false],["bhmr","BÊN NGOÀI · BẢO HÀNH MỞ RỘNG",false],
                  ["sckl","BÊN NGOÀI · SỬA CHỮA KHÁCH LẺ",true]]
                 /* 5 nhóm BÊN NGOÀI mới (08/09/2026) — phải có mặt trong Excel xuất/nhập,
                    nếu không vòng xuất→nhập sẽ LÀM MẤT target của chúng. Nối vào SAU
                    nhóm SCDV; cột "% HT SCDV/VƯỢT TRỘI" vẫn trỏ đúng nhóm SCDV nhờ
                    xoGrpSCDV() bên dưới (KHÔNG còn lấy "nhóm cuối cùng" như trước).  */
                 .concat(DT_NGOAI_MOI.map(x=>[x.fld,"BÊN NGOÀI · "+x.ten.toUpperCase(),false]));
const XO_DT_LB={ sl:"Số Lượng", dgia:"Đơn giá Trung Bình", act:"Thực đạt (đồng)",
                 target:"Target (đồng)", targetCT:"Target  CÔNG TY (đồng)",
                 targetVT:"Target  VƯỢT TRỘI (đồng)" };
/* bố cục cột (1-based) của sheet DOANH THU khi XUẤT — chiều nhập dò lại từ tiêu đề */
function xoDtBoCuc(){
  const out=[]; let c=XO_C0;
  XO_DT_CATS.forEach(g=>{
    const o={cat:g[0], ten:g[1], vt:g[2], sl:c, dgia:c+1, target:c+2, rong:g[2]?5:4};
    if(g[2]){ o.targetVT=c+3; o.act=c+4; } else { o.act=c+3; }
    c+=o.rong; out.push(o);
  });
  return out;
}
function xoSheet6(nam,months){
  const bc=xoDtBoCuc(), cuoi=bc[bc.length-1].act;          // cột "Thực đạt" của nhóm cuối
  const cHT=cuoi+1, cHTS=cuoi+2, cHTV=cuoi+3;              // 3 cột % HT nối tiếp
  const L=i=>xoC(i-1);                                     // số cột 1-based -> chữ cái
  const g0=bc[0];                                          // nhóm BÊN TRONG
  /* nhóm SCDV = nhóm DUY NHẤT có cột Target VƯỢT TRỘI; tìm theo cờ vt, đừng lấy
     phần tử cuối mảng (từ 08/09/2026 sau SCDV còn 5 nhóm mới nữa).               */
  const gS=bc.find(g=>g.targetVT!=null)||bc[bc.length-1];
  const h4=[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã"),xoS("Loại hình")];
  const h5=[null,null,null,null,null];
  bc.forEach(g=>{
    h4.push(xoS(g.ten)); for(let i=1;i<g.rong;i++) h4.push(null);
    h5.push(xoS(XO_DT_LB.sl), xoS(XO_DT_LB.dgia));
    h5.push(xoS(g.vt?XO_DT_LB.targetCT:XO_DT_LB.target));
    if(g.vt) h5.push(xoS(XO_DT_LB.targetVT));
    h5.push(xoS(XO_DT_LB.act));
  });
  h4.push(xoS("% HT"), xoS("% HT SCDV"), xoS("% HT VƯỢT TRỘI"));
  h5.push(xoS("Thực đạt / Target (Bên trong)"),
          xoS("Thực đạt / Target CÔNG TY (Sửa chữa khách lẻ)"),
          xoS("Thực đạt / Target VƯỢT TRỘI (Sửa chữa khách lẻ)"));
  const cols=[{wch:7},{wch:12},{wch:20},{wch:17},{wch:11}];
  bc.forEach(g=>{ cols.push({wch:11},{wch:16},{wch:18});
                  if(g.vt) cols.push({wch:18}); cols.push({wch:18}); });
  cols.push({wch:10},{wch:12},{wch:15});
  return xoBuild({
    months, units:XO_U_ALL(), ncol:cHTV, sheet:XO_TEN.s6, ncotKhoa:5,
    title:XO_TEN.s6, sub:`Tháng 1→12 / ${nam} · 12 tỉnh + 2 kho — mục không áp dụng để trống · đơn vị: đồng`,
    h4, h5, cols,
    merges:xoMgDoc(5)
      .concat(bc.map(g=>xoMgNgang(g.sl-1,g.rong)))
      .concat([cHT,cHTS,cHTV].map(c=>({s:{r:3,c:c-1},e:{r:4,c:c-1}}))),
    row(m,u,rn){
      const r=xoRec(nam,m,u.code,u.kho), dt=(r&&r.dt)||{};
      const a=xoDinhDanh(m,u,true);
      bc.forEach(g=>{ const x=dt[g.cat];
        a.push(xoN(x&&x.slNguon,Z_DON), xoN(x&&x.dgiaNguon,"#,##0.00"), xoN(x&&x.target,Z_TIEN));
        if(g.vt) a.push(xoN(x&&x.targetVT,Z_TIEN));
        a.push(xoN(xoActDt(x,g.cat),Z_TIEN)); });
      a.push(xoPct(L(g0.target),L(g0.act),rn),
             xoPct(L(gS.target),L(gS.act),rn),
             xoPct(L(gS.targetVT),L(gS.act),rn));
      return a;
    },
    tong(m,r0,r1){
      const a=[xoTrong(),xoTrong(),xoS("TỔNG T"+m),xoTrong(),xoTrong()];
      bc.forEach(g=>{
        a.push(xoSum(L(g.sl),r0,r1), xoAvg(L(g.dgia),r0,r1), xoSum(L(g.target),r0,r1));
        if(g.vt) a.push(xoSum(L(g.targetVT),r0,r1));
        a.push(xoSum(L(g.act),r0,r1)); });
      a.push(xoPct(L(g0.target),L(g0.act),r1+1),
             xoPct(L(gS.target),L(gS.act),r1+1),
             xoPct(L(gS.targetVT),L(gS.act),r1+1));
      return a;
    }
  });
}

/* ============================================================================
   SHEET 7 · CHẤT LƯỢNG GÓI BẢO HÀNH   (tỷ lệ xử lý đúng hạn cam kết:
   1 đổi 1 = 14 ngày · BHMR = 6 ngày). Chỉ áp dụng cho 12 tỉnh tại nhà;
   2 kho để trống (DB đánh dấu goiNA). % HT ở cột J.
   ========================================================================== */
function xoSheet7(nam,months){
  const h4=[xoS("Tháng"),xoS("Vùng"),xoS("Tên"),xoS("Mã"),xoS("Loại hình")];
  const h5=[null,null,null,null,null];
  XO_CG_CATS.forEach(c=>{ h4.push(xoS(c[1]),null); h5.push(xoS("Target "),xoS("Thực đạt ")); });
  h4.push(xoS("% HT")); h5.push(xoS("Thực đạt / Target (1 đổi 1)"));
  return xoBuild({
    months, units:XO_U_ALL(), ncol:10, sheet:XO_TEN.s7, ncotKhoa:5,
    title:XO_TEN.s7, sub:`Tháng 1→12 / ${nam} · 12 tỉnh (tại nhà) — 2 kho không áp dụng, để trống`,
    h4, h5,
    merges:xoMgDoc(5).concat([xoMgNgang(5,2),xoMgNgang(7,2),{s:{r:3,c:9},e:{r:4,c:9}}]),
    cols:[{wch:7},{wch:12},{wch:20},{wch:17},{wch:11},{wch:12},{wch:12},{wch:14},{wch:14},{wch:10}],
    row(m,u,rn){
      const r=xoRec(nam,m,u.code,u.kho), cg=(r&&r.clGoi)||{};
      const a=xoDinhDanh(m,u,true);
      XO_CG_CATS.forEach(c=>{ const cd=!!(cg[c[0]] && cg[c[0]].chuaDo);
        a.push(xoDo(xoGet(cg,c[0]+".kpi"),"0.0%",cd), xoDo(xoGet(cg,c[0]+".act"),"0.0%",cd)); });
      a.push(xoPct("F","G",rn));
      return a;
    },
    tong(m,r0,r1){
      const a=[xoTrong(),xoTrong(),xoS("TỔNG T"+m+" (bình quân)"),xoTrong(),xoTrong()];
      for(let i=5;i<9;i++) a.push(xoF(`IFERROR(AVERAGE(${xoC(i)}${r0}:${xoC(i)}${r1}),"")`,"0.0%"));
      a.push(xoPct("F","G",r1+1));
      return a;
    }
  });
}

/* ============================================================================
   SHEET TARGET — dựng ĐÚNG bố cục file nguồn KHODULIEUBHSC2026_T1T12 (bản 08/09/2026)
   12 khối, mỗi khối 14 dòng (12 tỉnh + 2 kho), thứ tự & khoảng cách dòng y hệt nguồn:
     A  = tổng bên trong (= A1 + A2, CÔNG THỨC)   · A1 = bên trong BH tại nhà & tại kho
     A2 = bán gói năm 2025                          · B  = tổng bên ngoài (= B1…B8, CÔNG THỨC)
     B1 1 đổi 1 · B2 BH mở rộng · B3 khách lẻ · B4 BH ủy quyền · B5 SC BHX/DMX
     B6 Gói PRO · B7 Thu cũ đổi mới · B8 Solar
   Cột 2026: E = 5 tháng (công thức) · F-J DOANH THU T8-T12 · L-P ĐƠN GIÁ · R-V SỐ LƯỢNG ·
             X-AB CHI PHÍ (chỉ A1)
   Cột 2027: AD = NĂM 2027 (công thức) · AE-AP DOANH THU T1-T12/27 · AR-BC ĐƠN GIÁ ·
             BE-BP SỐ LƯỢNG · BR-CC CHI PHÍ (chỉ A1)
   Dòng TỔNG của khối là công thức; đơn giá của khối tổng A/B là công thức DT/SL.
   Doanh thu 2026 lấy từ DB.targetDT (kế hoạch T8-T12); 2027 và đơn giá/sản lượng/chi phí
   lấy target gốc trong DB.ky để cả file luôn nhất quán với 7 sheet dữ liệu.
   ========================================================================== */
const XO_TG_MON=[8,9,10,11,12];
const XO_TG_MON27=[1,2,3,4,5,6,7,8,9,10,11,12];
/* vị trí cột (0-based) của từng dải — khớp file nguồn */
const XO_TG_C={ dt:5, dg:11, sl:17, cp:23, nam27:29, dt27:30, dg27:43, sl27:56, cp27:69, n:81 };
function xoSheetTarget(nam){
  const nam27=nam+1;
  const A=[], mg=[];
  const tgLab=[], tgHdr=[], tgTong=[];      // dòng nhãn khối · dòng dải/tiêu đề cột · dòng TỔNG — để trang trí
  const push=r=>{ A.push(r); return A.length; };                 // trả về số dòng 1-based
  const C=XO_TG_C;
  const setc=(row,i,v)=>{ while(row.length<i) row.push(null); row[i]=v; };
  const hdr=()=>{ const h=[];
    setc(h,1,xoS("TRƯỞNG PHÒNG")); setc(h,2,xoS("MIỀN")); setc(h,3,xoS("TỈNH")); setc(h,4,xoS("5 THÁNG CUỐI NĂM"));
    XO_TG_MON.forEach((m,i)=>{ setc(h,C.dt+i,xoS("T"+m)); setc(h,C.dg+i,xoS("T"+m)); setc(h,C.sl+i,xoS("T"+m)); setc(h,C.cp+i,xoS("T"+m)); });
    setc(h,C.nam27,xoS("NĂM "+nam27));
    XO_TG_MON27.forEach((m,i)=>{ const t=xoS("T"+m+"/"+String(nam27).slice(-2));
      setc(h,C.dt27+i,t); setc(h,C.dg27+i,t); setc(h,C.sl27+i,t); setc(h,C.cp27+i,t); });
    /* thay ô trống bằng ô rỗng-nhưng-có-thật để dải màu tiêu đề liền mạch, không đứt quãng */
    for(let i=1;i<C.n;i++) if(h[i]==null) h[i]=xoTrong();
    return h; };
  const band=(nhan)=>{ const h=[]; setc(h,1,xoS(nhan));
    setc(h,C.dt,xoS("DOANH THU")); setc(h,C.dg,xoS("ĐƠN GIÁ")); setc(h,C.sl,xoS("SỐ LƯỢNG")); setc(h,C.cp,xoS("CHI PHÍ"));
    setc(h,C.dt27,xoS("DOANH THU "+nam27)); setc(h,C.dg27,xoS("ĐƠN GIÁ "+nam27)); setc(h,C.sl27,xoS("SỐ LƯỢNG "+nam27)); setc(h,C.cp27,xoS("CHI PHÍ "+nam27));
    for(let i=1;i<C.n;i++) if(h[i]==null) h[i]=xoTrong();
    return h; };
  const units=XO_U_ALL();
  /* doanh thu kế hoạch 2026 của 1 đơn vị theo nhóm (đồng) — đọc thẳng DB.targetDT */
  const tgDt=(m,u,cat)=>{ const T=(DB.targetDT||{})[kyKey(nam,m)]; if(!T) return null;
    let n=T[u.code]; if(!n) return null; if(u.kho) n=n.kho; if(!n) return null; return NB(n[cat]); };
  /* target gốc trong DB.ky cho đơn giá / sản lượng / chi phí (2026) */
  const tgDg=(m,u,cat)=>{ const r=xoRec(nam,m,u.code,u.kho);
    if(cat==="goi") return xoGet(r,"dt.goi.dgiaNguon");
    const v=xoGet(r,`dgia.cats.${cat}.target`); if(v!=null) return v;
    /* 5 nhóm mới: sheet 4 không có cột đơn giá -> lấy ở DB.targetDT[..].dg (đọc từ sheet TARGET) */
    const T=(DB.targetDT||{})[kyKey(nam,m)]; if(!T) return null;
    let n=T[u.code]; if(!n) return null; if(u.kho) n=n.kho; if(!n||!n.dg) return null; return NB(n.dg[cat]); };
  const tgSl=(m,u,cat)=>xoGet(xoRec(nam,m,u.code,u.kho),`sl.cats.${cat}.target`);
  const tgCp=(m,u)=>xoGet(xoRec(nam,m,u.code,u.kho),"cp.target");
  /* 2027: chỉ có kế hoạch, đọc target gốc trong DB.ky[nam+1] */
  const tgDt27=(m,u,cat)=>xoGet(xoRec(nam27,m,u.code,u.kho),`dt.${cat}.target`);
  const tgDg27=(m,u,cat)=>{ const r=xoRec(nam27,m,u.code,u.kho); if(!r) return null;
    const v=xoGet(r,`dgia.cats.${cat}.target`); if(v!=null) return v;
    return cat==="trong" ? xoGet(r,"dgia.target") : null; };
  const tgSl27=(m,u,cat)=>xoGet(xoRec(nam27,m,u.code,u.kho),`sl.cats.${cat}.target`);
  const tgCp27=(m,u)=>xoGet(xoRec(nam27,m,u.code,u.kho),"cp.target");

  const khoi={};                                       // tên khối -> {r0,r1} để khối tổng A/B tham chiếu công thức
  /* --- 1 khối: dòng nhãn (nếu có) + dòng dải + dòng tiêu đề + dòng TỔNG + 14 dòng đơn vị --- */
  function block(o){
    if(o.label){ const rl=push([]); setc(A[rl-1],1,xoS(o.label)); mg.push({s:{r:rl-1,c:1},e:{r:rl-1,c:5}}); tgLab.push(rl); }
    if(o.band){ const rb=push(band(o.band)); mg.push({s:{r:rb-1,c:1},e:{r:rb-1,c:3}}); tgHdr.push(rb); }
    tgHdr.push(push(hdr()));
    const rt=push([]);                                   // giữ chỗ dòng TỔNG, điền sau
    tgTong.push(rt);
    const r0=A.length+1;
    units.forEach(u=>{
      const rn=A.length+1;
      const row=[];
      setc(row,2,xoS(vungOf(u.code))); setc(row,3,xoS(xoTgTen(u.code,u.kho)));
      setc(row,4,xoF(`SUM(${xoC(C.dt)}${rn}:${xoC(C.dt+4)}${rn})`,Z_TIEN));
      XO_TG_MON.forEach((m,i)=>{
        setc(row,C.dt+i,o.dt?xoN(o.dt(m,u),Z_TIEN):null);
        setc(row,C.dg+i,o.dg?o.dg(m,u,rn,C.dg+i):null);
        setc(row,C.sl+i,o.sl?o.sl(m,u):null);
        if(o.coCp) setc(row,C.cp+i,xoN(tgCp(m,u),Z_TIEN));
      });
      setc(row,C.nam27,xoF(`SUM(${xoC(C.dt27)}${rn}:${xoC(C.dt27+11)}${rn})`,Z_TIEN));
      XO_TG_MON27.forEach((m,i)=>{
        setc(row,C.dt27+i,o.dt27?xoN(o.dt27(m,u),Z_TIEN):null);
        setc(row,C.dg27+i,o.dg27?o.dg27(m,u,rn,C.dg27+i):null);
        setc(row,C.sl27+i,o.sl27?o.sl27(m,u):null);
        if(o.coCp) setc(row,C.cp27+i,xoN(tgCp27(m,u),Z_TIEN));
      });
      push(row);
    });
    const r1=A.length;
    /* dòng TỔNG: công thức SUM thật để sửa 1 ô target là tổng tự nhảy; đơn giá = DT/SL */
    const t=[]; setc(t,1,xoS("TỔNG:")); setc(t,4,xoSum("E",r0,r1));
    const sumCols=(c0,n)=>{ for(let i=0;i<n;i++) setc(t,c0+i,xoSum(xoC(c0+i),r0,r1)); };
    const dgCols=(cDg,cDt,cSl,n)=>{ for(let i=0;i<n;i++) setc(t,cDg+i,xoF(`IFERROR(${xoC(cDt+i)}${rt}/${xoC(cSl+i)}${rt},"")`,Z_GIA)); };
    sumCols(C.dt,5); dgCols(C.dg,C.dt,C.sl,5); sumCols(C.sl,5); if(o.coCp) sumCols(C.cp,5);
    setc(t,C.nam27,xoSum(xoC(C.nam27),r0,r1));
    sumCols(C.dt27,12); dgCols(C.dg27,C.dt27,C.sl27,12); sumCols(C.sl27,12); if(o.coCp) sumCols(C.cp27,12);
    A[rt-1]=t;
    const k={r0,r1,rt}; if(o.key) khoi[o.key]=k;
    return k;
  }
  /* đơn giá của khối TỔNG A và B: công thức sống DT/SL trên chính dòng đó */
  const dgTyLe=(cDg,cDt,cSl)=>(m,u,rn,ci)=>{ const i=ci-cDg; return xoF(`IFERROR(${xoC(cDt+i)}${rn}/${xoC(cSl+i)}${rn},"")`,Z_GIA); };
  /* doanh thu / sản lượng của khối tổng: công thức = tổng các khối con, điền SAU khi dựng xong */
  const congThucTong=(kTong,kCon)=>{
    const T=khoi[kTong]; if(!T) return;
    for(let j=0;j<=T.r1-T.r0;j++){
      const rn=T.r0+j, row=A[rn-1];
      const ref=(c)=>kCon.map(k=>`${xoC(c)}${khoi[k].r0+j}`).join("+");
      XO_TG_MON.forEach((m,i)=>{ setc(row,C.dt+i,xoF(ref(C.dt+i),Z_TIEN)); setc(row,C.sl+i,xoF(ref(C.sl+i),Z_DON)); });
      XO_TG_MON27.forEach((m,i)=>{ setc(row,C.dt27+i,xoF(ref(C.dt27+i),Z_TIEN)); setc(row,C.sl27+i,xoF(ref(C.sl27+i),Z_DON)); });
    }
  };
  const nhomDon=(cat,label,extra)=>Object.assign({ key:cat, label,
    dt:(m,u)=>tgDt(m,u,cat), dg:(m,u)=>xoN(tgDg(m,u,cat),Z_GIA), sl:(m,u)=>xoN(tgSl(m,u,cat),Z_DON),
    dt27:(m,u)=>tgDt27(m,u,cat), dg27:(m,u)=>xoN(tgDg27(m,u,cat),Z_GIA), sl27:(m,u)=>xoN(tgSl27(m,u,cat),Z_DON) }, extra||{});

  push([]);                                                        // dòng 1 để trống như nguồn
  const r2=push([]); setc(A[r2-1],1,xoS(`DOANH THU 5 THÁNG CUỐI NĂM ${nam} DV BẢO HÀNH SỬA CHỮA CE`));
  for(let i=2;i<=5;i++) setc(A[r2-1],i,xoTrong());                // ô rỗng-nhưng-có-thật để dải màu liền mạch B→F
  mg.push({s:{r:r2-1,c:1},e:{r:r2-1,c:5}});
  setc(A[r2-1],C.nam27,xoS(`DOANH THU NĂM ${nam27} DV BẢO HÀNH SỬA CHỮA CE`));
  for(let i=C.nam27+1;i<=C.nam27+12;i++) setc(A[r2-1],i,xoTrong());
  mg.push({s:{r:r2-1,c:C.nam27},e:{r:r2-1,c:C.nam27+12}});

  block({ key:"A", label:"A. DOANH THU BÊN TRONG", band:"I - TARGET",
    dg:dgTyLe(C.dg,C.dt,C.sl), dg27:dgTyLe(C.dg27,C.dt27,C.sl27) });
  block(nhomDon("trong","1/ DOANH THU BÊN TRONG BH TẠI NHÀ & TẠI KHO",{coCp:true}));
  push([]);
  block(nhomDon("goi","2/ DOANH THU BÁN GÓI NĂM 2025"));

  block({ key:"B", label:"B. DOANH THU BÊN NGOÀI", band:"I - TARGET",
    dg:dgTyLe(C.dg,C.dt,C.sl), dg27:dgTyLe(C.dg27,C.dt27,C.sl27) });
  block(nhomDon("doi1","1/ BẢO HÀNH 1 ĐỔI 1"));
  block(nhomDon("bhmr","2/ BẢO HÀNH MỞ RỘNG"));
  push([]);
  block(nhomDon("sckl","3/ Doanh Thu KHÁCH LẺ"));
  const nhanMoi={ uyquyen:"4/ BẢO HÀNH ỦY QUYỀN", scbhx:"5/ SỬA CHỮA BHX/ DMX",
                  goipro:"6/ GÓI PRO (1 ĐỔI 1 + BẢO HÀNH MỞ RỘNG)", thucu:"7/ GÓI THU CŨ ĐỔI MỚI", solar:"8/ SOLAR MIDEA + XIAOMI" };
  DT_NGOAI_MOI.forEach(g=>{ push([]); block(nhomDon(g.fld, nhanMoi[g.fld]||g.ten)); });

  congThucTong("A",["trong","goi"]);
  congThucTong("B",["doi1","bhmr","sckl"].concat(DT_NGOAI_MOI.map(g=>g.fld)));

  const ws=XLSX.utils.aoa_to_sheet(A);
  ws["!merges"]=mg;
  const w=[]; for(let i=0;i<C.n;i++) w.push({wch:10});
  w[0]={wch:5}; w[1]={wch:25}; w[2]={wch:19}; w[3]={wch:22}; w[4]={wch:21};
  for(let i=0;i<5;i++){ w[C.dt+i]={wch:17}; w[C.dg+i]={wch:12}; w[C.sl+i]={wch:10}; w[C.cp+i]={wch:17}; }
  [C.dt-1+0,C.dg-1,C.sl-1,C.cp-1,C.nam27-1,C.dg27-1,C.sl27-1,C.cp27-1].forEach(i=>{ if(i>=5) w[i]={wch:5}; });
  w[C.nam27]={wch:17};
  for(let i=0;i<12;i++){ w[C.dt27+i]={wch:15}; w[C.dg27+i]={wch:11}; w[C.sl27+i]={wch:9}; w[C.cp27+i]={wch:15}; }
  ws["!cols"]=w;
  XO_DECO[XO_TEN.tg]={ dong:0, cot:0, tong:tgTong, ncol:C.n, tieu:[r2], hdr:tgHdr, nhan:tgLab };
  return ws;
}

/* ============================================================================
   SHEET HƯỚNG DẪN — mô tả cấu trúc file, giữ bố cục nhãn ở cột A · nội dung cột B
   ========================================================================== */
function xoSheetHD(nam,months){
  const L=(a,b)=>[xoS(a),xoS(b)];
  const trong8=()=>[...Array(8)].map(()=>xoTrong());   // dòng 2 (nằm trong vùng merge tiêu đề) cần có ô thật để tô nền
  const A=[
    L(`KHO DỮ LIỆU BHSC CE — TOÀN BỘ SỐ LIỆU THÁNG ${months[0]}-${months[months.length-1]} / ${nam}`,null),
    trong8(),[],
    L("MỤC ĐÍCH","File này là bản kết xuất TOÀN BỘ kho dữ liệu của trang báo cáo, dựng đúng theo cấu trúc"),
    L(null,"file nguồn DATA_UP_WEB_v2 (9 sheet). Dùng để đối chiếu số liệu, chỉnh sửa và nhập ngược trở lại."),
    [],
    L("SỐ GỐC","Toàn bộ ô số là SỐ GỐC từ file Excel nguồn. Các ô đã sửa tay trực tiếp trên trang báo cáo"),
    L(null,"KHÔNG được ghi vào đây — để bản kết xuất luôn đối chiếu được với dữ liệu nguồn ban đầu."),
    [],
    L("PHẠM VI",`Đủ ${months.length} kỳ (T${months.join(", T")}) × 12 tỉnh + 2 kho, không phụ thuộc bộ lọc đang chọn trên trang.`),
    [],
    L("CÁCH ĐỌC","• Dòng 1-2 là tiêu đề sheet, dòng 4-5 là tiêu đề cột (nhóm chỉ tiêu / Target - Thực đạt),"),
    L(null,"   dữ liệu bắt đầu từ dòng 6. Bốn cột đầu Tháng / Vùng / Tên / Mã là khoá định danh, không sửa."),
    L(null,"• Sheet 1 và 2 (chất lượng) không có cột Loại hình; các sheet còn lại có, phân biệt Tại nhà / Tại kho."),
    L(null,"• Ô để trống nghĩa là CHƯA CÓ dữ liệu — không được hiểu là 0. Chỉ tiêu chất lượng chưa đo ghi \"Chưa đo\"."),
    L(null,"• Đơn vị: tiền là ĐỒNG, đơn giá là ĐỒNG/ĐƠN, sản lượng là ĐƠN, tỷ lệ là phần trăm, điểm giữ nguyên thang."),
    [],
    L("CỘT % HT","Sheet 3, 4, 5, 6, 7 có thêm cột % HT ở ngoài cùng bên phải và một dòng TỔNG sau mỗi khối tháng."),
    L(null,"Đây là CÔNG THỨC EXCEL sống (% HT = Thực đạt / Target của nhóm đầu tiên): sửa một ô target thì"),
    L(null,"% HT và dòng TỔNG tự tính lại. Các cột gốc của file nguồn giữ nguyên vị trí bên trái, nên file"),
    L(null,"vẫn nhập ngược vào kho dữ liệu được bình thường."),
    L(null,"Riêng sheet 4 (đơn giá) và sheet 7 (tỷ lệ) dòng TỔNG lấy BÌNH QUÂN — cộng dồn hai chỉ tiêu này"),
    L(null,"không có ý nghĩa nghiệp vụ. Sheet 5 (chi phí) là chỉ tiêu đảo chiều: % HT càng thấp càng tốt."),
    [],
    L("LƯU Ý SỐ LIỆU","• Cột ĐÚNG HẸN của sheet 1 ghi TỶ LỆ TRỄ đúng như quy ước file nguồn (đúng hẹn = 1 − trễ)."),
    L(null,"• Doanh thu BÊN TRONG ở sheet 6 là số đơn hàng bên trong; phần Gói bán 2025 nằm ở khối riêng."),
    L(null,"• Hai cột Số Lượng / Đơn giá Trung Bình của sheet 6 chỉ là số tham chiếu của file nguồn;"),
    L(null,"   sản lượng chuẩn ở sheet 3 và đơn giá chuẩn ở sheet 4."),
    L(null,"• Gói bảo hành (sheet 7) chỉ áp dụng cho 12 tỉnh tại nhà, 2 kho để trống."),
    [],
    L("SHEET TARGET","Sheet TARGET là kế hoạch doanh thu T8-T12 năm nay + cả năm sau, tách 12 khối"),
    L(null,"(tổng bên trong · bên trong · gói bán 2025 · tổng bên ngoài · 8 nhóm bên ngoài), bố cục y hệt file nguồn."),
    L(null,"Cột 5 THÁNG CUỐI NĂM / NĂM SAU, các dòng TỔNG và 2 khối tổng A/B đều là công thức.")
  ];
  /* nhãn mục ở cột A (MỤC ĐÍCH, SỐ GỐC, PHẠM VI…) — mọi dòng có chữ ở cột A, trừ dòng tiêu đề 1-2 */
  const nhan=[]; A.forEach((r,i)=>{ if(i>=2 && r && r[0]) nhan.push(i+1); });
  const ws=XLSX.utils.aoa_to_sheet(A);
  ws["!merges"]=[{s:{r:0,c:0},e:{r:1,c:7}}];
  ws["!cols"]=[{wch:18},{wch:112},{wch:9}];
  XO_DECO[XO_TEN.hd]={ dong:2, cot:0, tong:[], ncol:8, tieu:[1,2], nhan, nhanCot:{A:1} };
  return ws;
}

/* =============================================================================
   TRANG TRÍ GÓI .XLSX — đóng băng tiêu đề + tô đậm dòng TỔNG

   Thư viện Excel đi kèm bản báo cáo chỉ ghi được GIÁ TRỊ, CÔNG THỨC và định dạng
   số; nó không ghi khung nhìn (đóng băng dòng/cột) lẫn định dạng ô (nền, chữ đậm,
   viền). File .xlsx vốn là một gói ZIP và thư viện ghi ra ở dạng KHÔNG NÉN, nên
   ở đây mở gói ngay trong trình duyệt, sửa đúng hai chỗ — khung nhìn của từng
   sheet và bảng style dùng chung — rồi đóng gói lại. Không đụng tới ô dữ liệu,
   nên số liệu và công thức giữ nguyên tuyệt đối.
   ============================================================================= */
const XO_TONG_NEN="FFF3CC", XO_TONG_VIEN="FFBF8F00";   // nền vàng nhạt · viền vàng đậm
/* bảng màu bổ sung cho lớp "làm đẹp" — chỉ ảnh hưởng NHÌN, không đụng số liệu/công thức */
const XO_HDR_NEN="FF4472C4";                 // nền xanh dương — dòng tiêu đề cột (h4/h5, dải nhóm)
const XO_TITLE_NEN="FF1F3864";               // nền xanh than đậm — dòng tiêu đề sheet
const XO_SUB_NEN="FFF2F2F2", XO_SUB_CHU="FF595959";   // nền xám nhạt + chữ xám — dòng phụ đề

/* CRC-32 (bảng chuẩn) — bắt buộc phải có để ghi lại mục trong gói ZIP */
const xoCrc32=(function(){
  const t=new Int32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c; }
  return function(b){ let c=-1; for(let i=0;i<b.length;i++) c=t[(c^b[i])&0xFF]^(c>>>8); return (c^-1)>>>0; };
})();
const xoTxt = u8 => new TextDecoder("utf-8").decode(u8);
const xoBin = s  => new TextEncoder().encode(s);

/* --- đọc gói ZIP (chỉ mục KHÔNG NÉN, đúng dạng thư viện ghi ra) --- */
function xoZipDoc(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  let eo=-1;
  for(let i=u8.length-22;i>=0 && i>u8.length-66000;i--) if(dv.getUint32(i,true)===0x06054b50){ eo=i; break; }
  if(eo<0) throw new Error("không đọc được gói .xlsx vừa tạo");
  const n=dv.getUint16(eo+10,true); let p=dv.getUint32(eo+16,true);
  const out=[];
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50) throw new Error("gói .xlsx hỏng cấu trúc");
    const nlen=dv.getUint16(p+28,true), elen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true);
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), lho=dv.getUint32(p+42,true);
    const ten=xoTxt(u8.subarray(p+46,p+46+nlen));
    const lnlen=dv.getUint16(lho+26,true), lelen=dv.getUint16(lho+28,true);
    const d0=lho+30+lnlen+lelen;
    out.push({ten, method, data:u8.subarray(d0,d0+csize)});
    p+=46+nlen+elen+clen;
  }
  return out;
}
/* --- ghi lại gói ZIP (luôn KHÔNG NÉN: trình duyệt không có sẵn bộ nén) --- */
function xoZipGhi(muc){
  const cuc=[], tt=[]; let off=0, tong=0;
  muc.forEach(e=>{
    const nm=xoBin(e.ten), d=e.data, crc=xoCrc32(d);
    const lh=new Uint8Array(30+nm.length), lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true);
    lv.setUint32(14,crc,true); lv.setUint32(18,d.length,true); lv.setUint32(22,d.length,true);
    lv.setUint16(26,nm.length,true); lh.set(nm,30);
    const ch=new Uint8Array(46+nm.length), cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,d.length,true); cv.setUint32(24,d.length,true);
    cv.setUint16(28,nm.length,true); cv.setUint32(42,off,true); ch.set(nm,46);
    cuc.push(lh,d); tt.push(ch);
    off+=lh.length+d.length; tong+=ch.length;
  });
  const eo=new Uint8Array(22), ev=new DataView(eo.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(8,muc.length,true); ev.setUint16(10,muc.length,true);
  ev.setUint32(12,tong,true); ev.setUint32(16,off,true);
  let n=0; [...cuc,...tt,eo].forEach(x=>n+=x.length);
  const out=new Uint8Array(n); let q=0;
  [...cuc,...tt,eo].forEach(x=>{ out.set(x,q); q+=x.length; });
  return out;
}
const xoXmlGiai = s => String(s).replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
/* --- tên sheet -> đường dẫn XML trong gói (đi qua workbook.xml + rels, không đoán) --- */
function xoSheetFile(muc){
  const g=n=>{ const e=muc.find(x=>x.ten===n); return e?xoTxt(e.data):""; };
  const rel={};
  (g("xl/_rels/workbook.xml.rels").match(/<Relationship\b[^>]*>/g)||[]).forEach(x=>{
    const id=/Id="([^"]+)"/.exec(x), tg=/Target="([^"]+)"/.exec(x);
    if(id&&tg) rel[id[1]]=String(tg[1]).replace(/^\/?xl\//,"");
  });
  const out={};
  (g("xl/workbook.xml").match(/<sheet\b[^>]*>/g)||[]).forEach(x=>{
    const nm=/name="([^"]*)"/.exec(x), ri=/r:id="([^"]+)"/.exec(x);
    if(nm&&ri&&rel[ri[1]]) out[xoXmlGiai(nm[1])]="xl/"+rel[ri[1]];
  });
  return out;
}
/* --- bảng style: thêm 1 phông đậm + 1 nền vàng nhạt + 1 viền trên dày, rồi NHÂN ĐÔI
   mỗi mục cellXf thành một biến thể "dòng TỔNG" giữ nguyên định dạng số của nó.
   Trả về số mục gốc N: style k của ô thường -> style k+N khi ở dòng TỔNG. --- */
function xoThemStyle(muc){
  const e=muc.find(x=>x.ten==="xl/styles.xml"); if(!e) return 0;
  let x=xoTxt(e.data);
  const dem=(the)=>{ const m=new RegExp("<"+the+'\\b[^>]*count="(\\d+)"').exec(x); return m?+m[1]:0; };
  const chen=(the,noiDung,soThem)=>{
    const c=dem(the);
    x=x.replace(new RegExp("(<"+the+'\\b[^>]*count=")\\d+(")'),"$1"+(c+soThem)+"$2")
       .replace(new RegExp("</"+the+">"), noiDung+"</"+the+">");
    return c;
  };
  /* --- TỔNG: nền vàng nhạt, chữ đậm, viền trên vàng đậm (giữ nguyên như bản gốc) --- */
  const fTong = chen("fonts",'<font><b/><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',1);
  const flTong= chen("fills",'<fill><patternFill patternType="solid"><fgColor rgb="FF'+XO_TONG_NEN+'"/><bgColor indexed="64"/></patternFill></fill>',1);
  const bTong = chen("borders",'<border><left/><right/><top style="thick"><color rgb="'+XO_TONG_VIEN+'"/></top><bottom/><diagonal/></border>',1);
  /* --- HEADER: dòng tiêu đề cột (h4/h5, dải nhóm) — nền xanh dương, chữ trắng đậm, viền mảnh trắng --- */
  const fHdr = chen("fonts",'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',1);
  const flHdr= chen("fills",'<fill><patternFill patternType="solid"><fgColor rgb="'+XO_HDR_NEN+'"/><bgColor indexed="64"/></patternFill></fill>',1);
  const bHdr = chen("borders",'<border><left style="thin"><color rgb="FFFFFFFF"/></left><right style="thin"><color rgb="FFFFFFFF"/></right><top style="thin"><color rgb="FFFFFFFF"/></top><bottom style="thin"><color rgb="FFFFFFFF"/></bottom><diagonal/></border>',1);
  /* --- TITLE: dòng tiêu đề sheet (dòng 1) — nền xanh than đậm, chữ trắng đậm.
     Cỡ 12 (không lớn hơn): dòng tiêu đề ở 7 sheet dữ liệu chỉ cao 1 dòng mặc định,
     cỡ chữ lớn hơn dễ bị cắt mất khi mở bằng trình đọc không tự giãn chiều cao dòng. --- */
  const fTit  = chen("fonts",'<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',1);
  const flTit = chen("fills",'<fill><patternFill patternType="solid"><fgColor rgb="'+XO_TITLE_NEN+'"/><bgColor indexed="64"/></patternFill></fill>',1);
  /* --- SUB: dòng phụ đề (dòng 2) — chữ xám nghiêng, nền xám nhạt --- */
  const fSub  = chen("fonts",'<font><i/><sz val="10"/><color rgb="'+XO_SUB_CHU+'"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',1);
  const flSub = chen("fills",'<fill><patternFill patternType="solid"><fgColor rgb="'+XO_SUB_NEN+'"/><bgColor indexed="64"/></patternFill></fill>',1);
  /* --- LABEL: nhãn mục (sheet HƯỚNG DẪN, dòng khối sheet TARGET) — chữ xanh than đậm, viền dưới mảnh --- */
  const fLab  = chen("fonts",'<font><b/><sz val="11"/><color rgb="'+XO_TITLE_NEN+'"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>',1);
  const bLab  = chen("borders",'<border><left/><right/><top/><bottom style="thin"><color rgb="'+XO_HDR_NEN+'"/></bottom><diagonal/></border>',1);

  const m=/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(x); if(!m) return 0;
  const xfs=m[1].match(/<xf\b[^>]*\/>/g)||[];
  const N=xfs.length;
  const bien=(fontId,fillId,borderId)=>xfs.map(t=>{
    let s=t;
    if(fontId  !=null) s=s.replace(/fontId="\d+"/,  'fontId="'  +fontId  +'"');
    if(fillId  !=null) s=s.replace(/fillId="\d+"/,  'fillId="'  +fillId  +'"');
    if(borderId!=null) s=s.replace(/borderId="\d+"/,'borderId="'+borderId+'"');
    return s.replace(/\s*\/>$/,' applyFont="1" applyFill="1" applyBorder="1"/>');
  });
  /* thứ tự cố định: TỔNG(+N) · HEADER(+2N) · TITLE(+3N) · SUB(+4N) · LABEL(+5N) */
  const khoi=[xfs.join(""),
    bien(fTong,flTong,bTong).join(""),
    bien(fHdr, flHdr, bHdr ).join(""),
    bien(fTit, flTit, null ).join(""),
    bien(fSub, flSub, null ).join(""),
    bien(fLab, null,  bLab ).join("")];
  x=x.replace(m[0],'<cellXfs count="'+(N*6)+'">'+khoi.join("")+"</cellXfs>");
  e.data=xoBin(x);
  return N;
}
/* --- áp lại style cho 1 nhóm dòng (danh sách số dòng 1-based) bằng cách dịch chỉ số
   style hiện có của mỗi ô thêm "offset" — dùng chung cho TỔNG/HEADER/TITLE/SUB/LABEL.
   cotLoc (tuỳ chọn) = {A:1,B:1,...} giới hạn chỉ tô những cột đó trong dòng, ô khác
   giữ nguyên style gốc — dùng cho nhãn cột A của sheet HƯỚNG DẪN, tránh tô luôn cả
   câu mô tả dài ở cột B cùng dòng. --- */
function xoApHang(x,rows,offset,cotLoc){
  if(!rows||!rows.length) return x;
  const bo={}; rows.forEach(r=>bo[r]=1);
  return x.replace(/<row([^>]*)>([\s\S]*?)<\/row>/g,(all,attr,noi)=>{
    const rn=/\br="(\d+)"/.exec(attr);
    if(!rn||!bo[+rn[1]]) return all;
    const moi=noi.replace(/<c\s+([^>]*?)\s*(\/)?>/g,(mm,at,tu)=>{
      if(cotLoc){
        const cm=/r="([A-Z]+)\d+"/.exec(at);
        if(!cm||!cotLoc[cm[1]]) return mm;
      }
      at = /\bs="\d+"/.test(at) ? at.replace(/\bs="(\d+)"/,(y,k)=>'s="'+(+k+offset)+'"') : at+' s="'+offset+'"';
      return "<c "+at+(tu||"")+">";
    });
    return "<row"+attr+">"+moi+"</row>";
  });
}
/* --- đặt chiều cao dòng tường minh (ht + customHeight) cho danh sách dòng đã cho —
   phòng trường hợp trình đọc không tự giãn chiều cao dòng theo cỡ chữ đậm/lớn hơn
   mặc định, khiến dòng tiêu đề/tiêu đề cột bị cắt mất chữ. --- */
function xoDatCao(x,rows,pt){
  if(!rows||!rows.length) return x;
  const bo={}; rows.forEach(r=>bo[r]=1);
  return x.replace(/<row r="(\d+)"([^>]*)>/g,(all,rn,attr)=>{
    if(!bo[+rn]) return all;
    let a=attr;
    a = /\bht="[\d.]+"/.test(a) ? a.replace(/\bht="[\d.]+"/,'ht="'+pt+'"') : a+' ht="'+pt+'"';
    a = /\bcustomHeight="1"/.test(a) ? a : a+' customHeight="1"';
    return '<row r="'+rn+'"'+a+'>';
  });
}
/* --- áp khung nhìn + style các nhóm dòng (TỔNG/tiêu đề/phụ đề/nhãn) cho 1 sheet --- */
function xoTrangTriSheet(e,deco,N){
  let x=xoTxt(e.data);
  if(deco.dong||deco.cot){
    const oTrai=XLSX.utils.encode_cell({r:deco.dong,c:deco.cot});
    x=x.replace(/<sheetView([^>]*)\/>/,
      '<sheetView$1><pane xSplit="'+deco.cot+'" ySplit="'+deco.dong+'" topLeftCell="'+oTrai
      +'" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/></sheetView>');
  }
  if(N>0){
    x=xoApHang(x,deco.tong,N);      // TỔNG        -> +N
    x=xoApHang(x,deco.hdr, 2*N);    // tiêu đề cột -> +2N
    x=xoApHang(x,deco.tieu,3*N);    // tiêu đề sheet -> +3N
    x=xoApHang(x,deco.phu, 4*N);    // phụ đề      -> +4N
    x=xoApHang(x,deco.nhan,5*N,deco.nhanCot);   // nhãn mục -> +5N (nhanCot: chỉ cột chỉ định nếu có)
  }
  x=xoDatCao(x,deco.tieu,20);   // dòng tiêu đề sheet cần cao hơn dòng thường để chữ đậm không bị cắt
  x=xoDatCao(x,deco.hdr,16);    // dòng tiêu đề cột — cao hơn một chút cho thoáng
  e.data=xoBin(x);
}
/* --- điều phối: nhận gói .xlsx thô, trả gói đã trang trí --- */
function xoTrangTri(u8,deco){
  try{
    const muc=xoZipDoc(u8);
    const N=xoThemStyle(muc);
    const file=xoSheetFile(muc);
    for(const ten in deco){
      const f=file[ten]; if(!f) continue;
      const e=muc.find(x=>x.ten===f); if(!e) continue;
      xoTrangTriSheet(e,deco[ten],N);
    }
    return xoZipGhi(muc);
  }catch(err){
    /* trang trí chỉ là phần nhìn: hỏng thì vẫn xuất file số liệu đầy đủ */
    console.warn("Không áp được định dạng cho file Excel:",err);
    return u8;
  }
}

/* ============================================================================
   ĐIỀU PHỐI: dựng workbook 9 sheet rồi tải về
   ========================================================================== */
function xoBuildWorkbook(){
  XO_DECO={};
  const nam=xoNam();
  const months=monthsOf(nam);
  if(!months.length) return null;
  const wb=XLSX.utils.book_new();
  const add=(ws,ten)=>XLSX.utils.book_append_sheet(wb,ws,ten);
  add(xoSheetHD(nam,months),      XO_TEN.hd);
  add(xoSheet1(nam,months),       XO_TEN.s1);
  add(xoSheet2(nam,months),       XO_TEN.s2);
  add(xoSheet3(nam,months),       XO_TEN.s3);
  add(xoSheet4(nam,months),       XO_TEN.s4);
  add(xoSheet5(nam,months),       XO_TEN.s5);
  add(xoSheet6(nam,months),       XO_TEN.s6);
  add(xoSheet7(nam,months),       XO_TEN.s7);
  add(xoSheetTarget(nam),         XO_TEN.tg);
  return {wb,nam,months};
}
async function exportXlsx(){
  if(typeof XLSX==="undefined"){ toast("Thiếu thư viện Excel trong file báo cáo"); return; }
  busyShow("Đang xuất Excel…","Đang dựng 9 sheet theo cấu trúc file nguồn…",8);
  await paintYield();
  try{
    const r=xoBuildWorkbook();
    if(!r){ toast("Kho dữ liệu chưa có kỳ nào để xuất"); return; }
    busyUpdate("Đang ghi file .xlsx…",70);
    await paintYield();
    busyUpdate("Đang định dạng bảng tính…",80);
    /* ghi gói KHÔNG NÉN (mặc định của thư viện) rồi mới trang trí được phần khung nhìn */
    const buf=xoTrangTri(new Uint8Array(XLSX.write(r.wb,{bookType:"xlsx",type:"array"})), XO_DECO);
    busyUpdate("Đang tải file về máy…",95);
    await paintYield();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=XO_FILE; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },2000);
    toast(`Đã xuất ${XO_FILE} — ${r.months.length} kỳ (T${r.months.join(", T")}) · 9 sheet · số gốc`);
  }catch(err){ console.error(err); toast("Lỗi khi xuất Excel: "+err.message); }
  finally{ busyHide(); }
}

/* =============================================================================
   NHẬP EXCEL — đọc NGƯỢC file 1 workbook 9 sheet (DATA_UP_WEB / bản kết xuất ở
   trên) vào DB.ky, đủ mọi tháng có trong file.

   Bộ đọc này là chiều ngược của phần XUẤT phía trên và dùng CHUNG bản đồ cột
   (XO_CL_NHA / XO_CL_KHO / XO_SL_CATS / XO_DG_CATS / XO_DT_CATS / XO_CG_CATS,
   XO_C0_CL / XO_C0 / XO_W2 / XO_W4) nên hai chiều không thể lệch nhau.

   File thật của khách không đồng nhất giữa các lần gửi, nên mọi ô đều đi qua
   một bộ đọc CHỊU ĐƯỢC SAI KHÁC — nguyên tắc: thà để TRỐNG ("chưa có dữ liệu")
   còn hơn đoán ra một con số sai.
     · tỷ lệ: nhận cả phân số (0,9987), cả chuỗi '99,87%', cả số trần 99.87
     · tiền : nhận cả ĐỒNG lẫn TRIỆU ĐỒNG dù tiêu đề cột giống hệt nhau
     · ô rỗng: nhận cả ô trắng, 'Chưa đo', 'N/A', '-', '#DIV/0!'
     · tên sheet: khớp theo tiền tố đã chuẩn hoá khoảng trắng và hoa/thường
     · ĐÚNG HẸN: nguồn ghi TỶ LỆ TRỄ, DB lưu TỶ LỆ ĐÚNG HẸN -> nghịch đảo lại
   ============================================================================= */

/* --- chuẩn hoá chuỗi: gộp khoảng trắng + viết hoa (để khớp tên sheet / mã) --- */
const xoKhoa = s => String(s==null?"":s).normalize("NFC").replace(/\s+/g," ").trim().toUpperCase();
/* --- bỏ dấu tiếng Việt: dùng khi so khớp nhãn tự do ("Tại kho" / "tai kho") --- */
const xoKhongDau = s => String(s==null?"":s).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
                         .replace(/đ/g,"d").replace(/Đ/g,"D").replace(/\s+/g," ").trim().toLowerCase();

/* --- truy cập ô theo toạ độ 1-based như Excel ---
   Ô LỖI của Excel (#DIV/0!, #N/A, #VALUE!, #REF!…) được thư viện đọc ra dưới dạng
   MÃ LỖI KIỂU SỐ (t:"e"). Không chặn ở đây thì mã lỗi 7 của #DIV/0! sẽ bị hiểu
   thành 7% — phải coi ô lỗi là "chưa có dữ liệu". */
const xoCell = (ws,r,c)=>{ if(!ws) return null;
  const x=ws[XLSX.utils.encode_cell({r:r-1,c:c-1})];
  return (x && x.t!=="e" && x.v!=null) ? x.v : null; };
const xoHetDong = ws => ws ? XLSX.utils.decode_range(ws["!ref"]||"A1").e.r+1 : 0;

/* --- ô RỖNG: các cách người dùng thường ghi "chưa có số" --- */
const XO_RONG=["N/A","N.A","NA","-","--","–","—",".","_","KHÔNG","KHONG"];
/* --- đọc 1 ô thành số: trả {n, pct}. pct = ô có ghi dấu % (đơn vị đã là phần trăm) --- */
function xoSo(v){
  if(v==null||typeof v==="boolean") return {n:null,pct:false};
  if(typeof v==="number") return {n:isFinite(v)?v:null,pct:false};
  const s=String(v).normalize("NFC").replace(/ /g," ").trim();
  const u=s.toUpperCase();
  if(u==="") return {n:null,pct:false};
  if(u.charAt(0)==="#") return {n:null,pct:false};                 // #DIV/0!, #N/A…
  if(/^(CHƯA|CHUA)/.test(u)) return {n:null,pct:false};            // "Chưa đo", "Chưa có"
  if(XO_RONG.indexOf(u)>=0) return {n:null,pct:false};
  /* parseVN() là bộ đọc số dùng chung của lớp DATA: hiểu cả 1.234,5 lẫn 1234.5 */
  return {n:parseVN(s), pct:/%\s*$/.test(s)};
}
/* --- đổi ô thô thành giá trị theo ĐÚNG quy ước lưu trong DB ---
   pct   : luôn về PHÂN SỐ (ô ghi '%' hoặc số trần > 1,5 thì chia 100)
   dh    : như pct rồi nghịch đảo (nguồn ghi tỷ lệ trễ -> DB lưu tỷ lệ đúng hẹn)
   score : điểm, giữ nguyên thang        num: số đếm, giữ nguyên
   money : tiền, nhân hệ số quy đổi của cả sheet (1 nếu nguồn đã là đồng)          */
function xoGiaTri(v,kieu,heSo){
  const p=xoSo(v); if(p.n==null) return null;
  if(kieu==="pct")  return (p.pct||p.n>1.5) ? p.n/100 : p.n;
  if(kieu==="dh"){
    const x=(p.pct||p.n>1.5) ? p.n/100 : p.n;
    /* phòng vệ: có kỳ nguồn đổi ý ghi thẳng tỷ lệ ĐÚNG HẸN (luôn > 50%) */
    return xoR6(x>0.5 ? x : 1-x);
  }
  if(kieu==="money") return p.n*(heSo||1);
  return p.n;
}
/* --- ĐỒNG hay TRIỆU ĐỒNG? Quyết định theo TRUNG VỊ của CẢ SHEET, không theo
   từng ô — để không bao giờ có chuyện hai ô cùng một cột lại quy đổi khác nhau.
   Chi phí / doanh thu một tỉnh một tháng tính bằng đồng luôn từ hàng chục triệu
   trở lên; nếu trung vị nhỏ hơn 100.000 thì nguồn đang ghi bằng triệu đồng.     */
function xoHeSoTien(vals){
  const xs=vals.filter(v=>typeof v==="number"&&isFinite(v)&&v>0).sort((a,b)=>a-b);
  if(!xs.length) return 1;
  return xs[Math.floor(xs.length/2)] < 1e5 ? 1e6 : 1;
}

/* --- tra mã đơn vị: ưu tiên cột "Mã", không có thì suy từ cột "Tên" --- */
const XO_TEN2MA=(function(){ const m={};
  KHO_ORDER.forEach(c=>{ m[xoKhoa(KHOMAP[c].tinh)]=c; });
  m[xoKhoa("Huế")]="VTB_HUE"; m[xoKhoa("Bà Rịa")]="VDH_BRV";
  m[xoKhoa("Khánh Hoà")]="VDH_KHH"; m[xoKhoa("Thừa Thiên - Huế")]="VTB_HUE";
  return m; })();
function xoMa(ma,ten){
  const k=xoKhoa(ma); if(KHOMAP[k]) return k;
  const t=xoKhoa(String(ten==null?"":ten).replace(/\(.*?\)/g,""));
  return XO_TEN2MA[t]||null;
}
const xoLaKho = v => xoKhongDau(v).indexOf("tai kho")>=0;

/* --- ô ghi đúng chữ "Chưa đo": kỳ đó KHÔNG ĐO, khác hẳn ô để trống là chưa có số --- */
const xoLaChuaDo = v => typeof v==="string" && xoKhongDau(v)==="chua do";
/* --- dựng 1 object tiêu chí chất lượng {kpi, act[, chuaDo]} --- */
function xoTieuChi(oKpi,oAct,kieu){
  const o={ kpi:xoGiaTri(oKpi,kieu), act:xoGiaTri(oAct,kieu) };
  if(xoLaChuaDo(oKpi)||xoLaChuaDo(oAct)) o.chuaDo=true;
  return o;
}
/* --- BỐ CỤC SHEET DOANH THU đọc từ chính dòng tiêu đề (dòng 4 tên nhóm, dòng 5 tên
   cột con), KHÔNG đếm cột cứng: nguồn đã một lần đổi nhóm Sửa chữa khách lẻ từ
   4 cột sang 5 cột (thêm "Target VƯỢT TRỘI") mà tên nhóm vẫn giữ nguyên, nên chỉ
   có dò theo nhãn mới đọc đúng được cả hai bản. Ranh giới nhóm là MỌI ô có chữ ở
   dòng 4 — nhờ vậy các cột "% HT" do bản kết xuất thêm vào không bị hiểu nhầm là
   cột của nhóm cuối. --- */
function xoDocBoCuc6(ws,hNhom,hCon){
  hNhom=hNhom||4; hCon=hCon||5;
  const het=Math.max(40, ws?XLSX.utils.decode_range(ws["!ref"]||"A1").e.c+1:0);
  const dau={}, moc=[];
  for(let c=1;c<=het;c++){
    const k=xoKhoa(xoCell(ws,hNhom,c));
    if(k==="") continue;
    moc.push(c);
    XO_DT_CATS.forEach(g=>{ if(k===xoKhoa(g[1]) && dau[g[0]]==null) dau[g[0]]=c; });
  }
  const out=[]; let mac=XO_C0;
  XO_DT_CATS.forEach(g=>{
    const c0=dau[g[0]];
    if(c0==null){                                  // thiếu tiêu đề -> quay về bố cục mặc định
      const o={cat:g[0], sl:mac, dgia:mac+1, target:mac+2, targetVT:null, act:mac+3};
      mac+=4; out.push(o); return;
    }
    let c1=het+1; moc.forEach(x=>{ if(x>c0 && x<c1) c1=x; });
    const o={cat:g[0], sl:c0, dgia:c0+1, target:null, targetVT:null, act:null};
    for(let c=c0+2;c<c1;c++){
      const k=xoKhongDau(xoCell(ws,hCon,c));
      if(k==="") continue;
      if(k.indexOf("thuc dat")===0){ if(o.act==null) o.act=c; }
      else if(k.indexOf("vuot troi")>=0){ if(o.targetVT==null) o.targetVT=c; }
      else if(k.indexOf("target")===0){ if(o.target==null) o.target=c; }
    }
    if(o.act==null){ o.target=c0+2; o.act=c0+3; o.targetVT=null; }   // tiêu đề hỏng
    else if(o.target==null) o.target=c0+2;
    mac=o.act+1; out.push(o);
  });
  return out;
}
/* --- tìm sheet theo TIỀN TỐ đã chuẩn hoá (tên sheet hay thừa/thiếu khoảng trắng) --- */
function xoTimSheet(wb,tienTo){
  const p=xoKhoa(tienTo);
  for(const n of wb.SheetNames) if(xoKhoa(n).indexOf(p)===0) return wb.Sheets[n];
  return null;
}
/* --- nhận diện: ĐÚNG 1 workbook và có đủ 7 sheet dữ liệu "1." … "7." --- */
const XO_V2_TIENTO=["1.","2.","3.","4.","5.","6.","7."];
function xoLaV2(wbs){
  if(!wbs || wbs.length!==1 || !wbs[0] || !wbs[0].wb) return false;
  const wb=wbs[0].wb;
  return XO_V2_TIENTO.every(p=>!!xoTimSheet(wb,p));
}

/* --- duyệt các dòng DỮ LIỆU của một sheet: cột A = tháng 1-12, cột D (hoặc C) =
   đơn vị. Dòng tiêu đề và dòng TỔNG tự động bị bỏ qua vì không thoả hai điều kiện. */
function xoDuyetDong(ws,coLoai,fn){
  if(!ws) return;
  const het=xoHetDong(ws);
  for(let r=1;r<=het;r++){
    const mv=xoSo(xoCell(ws,r,1)).n;
    if(mv==null || mv<1 || mv>12 || mv!==Math.round(mv)) continue;
    const code=xoMa(xoCell(ws,r,4), xoCell(ws,r,3));
    if(!code) continue;
    fn(Math.round(mv), code, !!(coLoai && xoLaKho(xoCell(ws,r,5))), r);
  }
}
/* --- gom mọi số thô của một số cột (để dò đơn vị tiền của cả sheet) --- */
function xoThuThapSo(ws,coLoai,cols){
  const out=[];
  xoDuyetDong(ws,coLoai,(m,code,kho,r)=>{ cols.forEach(c=>{
    const n=xoSo(xoCell(ws,r,c)).n; if(n!=null) out.push(n); }); });
  return out;
}

/* =============================================================================
   xoDocV2(wb) -> { v2:true, ky:{<tháng>:{<mã>:{…}}}, targetDT:{<tháng>:{…}}, thang:[…] }
   Trả về CẤU TRÚC THUẦN, chưa ghi vào DB — việc ghi do xoNapV2() làm, sau khi
   người dùng đã xác nhận cách xử lý số sửa tay ở hộp thoại nhập.
   ============================================================================= */
function xoDocV2(wb){
  const S={}; XO_V2_TIENTO.forEach((p,i)=>{ S[i+1]=xoTimSheet(wb,p); });
  const ky={};
  /* lấy (hoặc tạo) bản ghi của 1 đơn vị trong 1 tháng; kho chỉ có ở 2 đơn vị */
  function U(m,code,kho){
    const t=ky[m]||(ky[m]={});
    let u=t[code]||(t[code]={});
    if(kho){ if(KHOKHO.indexOf(code)<0) return null; u=u.kho||(u.kho={}); }
    return u;
  }

  /* ---- 1. CHẤT LƯỢNG TẠI NHÀ / 2. CHẤT LƯỢNG TẠI KHO ---- */
  [[1,XO_CL_NHA,"cl",false],[2,XO_CL_KHO,"clKho",true]].forEach(function(cfg){
    const ws=S[cfg[0]];
    xoDuyetDong(ws,false,(m,code,_k,r)=>{
      const u=U(m,code,cfg[3]); if(!u) return;
      const rec=u[cfg[2]]||(u[cfg[2]]={});
      cfg[1].forEach((tc,i)=>{ const c=xoColNhom(XO_C0_CL,i,XO_W2);
        rec[tc[0]]=xoTieuChi(xoCell(ws,r,c), xoCell(ws,r,c+1), tc[1]); });
    });
  });

  /* ---- 3. SẢN LƯỢNG (5 nhóm) ---- */
  xoDuyetDong(S[3],true,(m,code,kho,r)=>{
    const u=U(m,code,kho); if(!u) return;
    const cats={};
    XO_SL_CATS.forEach((c,i)=>{ const col=xoColNhom(XO_C0,i,XO_W2);
      const t=xoGiaTri(xoCell(S[3],r,col),"num"), a=xoGiaTri(xoCell(S[3],r,col+1),"num");
      if(t==null && a==null) return;
      cats[c[0]]={target:t, act:a}; });
    let tT=0, tA=0, coA=false;
    for(const k in cats){ const x=cats[k];
      if(x.target!=null) tT+=x.target;
      if(x.act!=null){ tA+=x.act; coA=true; } }
    const tr=cats.trong||{};
    /* headline của SẢN LƯỢNG là nhóm BÊN TRONG; cats giữ đủ 5 nhóm */
    u.sl={ target:(tr.target==null?null:tr.target), act:(tr.act==null?null:tr.act),
           cats:cats, tongTatCa:{target:(tT||null), act:(coA?tA:null)} };
  });

  /* ---- 4. ĐƠN GIÁ (4 nhóm) ---- */
  xoDuyetDong(S[4],true,(m,code,kho,r)=>{
    const u=U(m,code,kho); if(!u) return;
    const cats={};
    XO_DG_CATS.forEach((c,i)=>{ const col=xoColNhom(XO_C0,i,XO_W2);
      const t=xoGiaTri(xoCell(S[4],r,col),"num"), a=xoGiaTri(xoCell(S[4],r,col+1),"num");
      if(t==null && a==null) return;
      cats[c[0]]={target:t, act:a}; });
    const tr=cats.trong||{};
    u.dgia={ target:(tr.target==null?null:tr.target), act:(tr.act==null?null:tr.act), cats:cats };
  });

  /* ---- 5. CHI PHÍ (tiền, đảo chiều) ---- */
  const hs5=xoHeSoTien(xoThuThapSo(S[5],true,[XO_C0,XO_C0+1]));
  xoDuyetDong(S[5],true,(m,code,kho,r)=>{
    const u=U(m,code,kho); if(!u) return;
    u.cp={ target:xoGiaTri(xoCell(S[5],r,XO_C0),"money",hs5),
           act:   xoGiaTri(xoCell(S[5],r,XO_C0+1),"money",hs5) };
  });

  /* ---- 6. DOANH THU (5 nhóm × 4 cột) ----
     Hai cột "Số Lượng"/"Đơn giá TB" chỉ là số tham chiếu của nguồn (đổi nghĩa
     theo tháng) -> lưu vào slNguon/dgiaNguon, KHÔNG dùng để tính sản lượng. */
  const bc6=xoDocBoCuc6(S[6]);
  const colTien6=[]; bc6.forEach(g=>{ colTien6.push(g.target,g.act); if(g.targetVT) colTien6.push(g.targetVT); });
  const hs6=xoHeSoTien(xoThuThapSo(S[6],true,colTien6));
  xoDuyetDong(S[6],true,(m,code,kho,r)=>{
    const u=U(m,code,kho); if(!u) return;
    const dt=u.dt||(u.dt={});
    bc6.forEach(g=>{
      const rec={ target:xoGiaTri(xoCell(S[6],r,g.target),"money",hs6) };
      /* Target VƯỢT TRỘI chỉ tồn tại ở nhóm Sửa chữa khách lẻ của bản nguồn v3;
         bản cũ 4 cột không có -> KHÔNG dựng khoá rỗng, để phân biệt "không áp dụng". */
      if(g.targetVT){ const vt=xoGiaTri(xoCell(S[6],r,g.targetVT),"money",hs6);
                      if(vt!=null) rec.targetVT=vt; }
      rec.act       = xoGiaTri(xoCell(S[6],r,g.act),"money",hs6);
      rec.slNguon   = xoGiaTri(xoCell(S[6],r,g.sl),"num");
      rec.dgiaNguon = xoGiaTri(xoCell(S[6],r,g.dgia),"num");
      if(rec.target==null && rec.act==null && rec.targetVT==null) return;
      dt[g.cat]=rec; });
  });

  /* ---- 7. CHẤT LƯỢNG GÓI BẢO HÀNH (chỉ 12 tỉnh tại nhà) ---- */
  xoDuyetDong(S[7],true,(m,code,kho,r)=>{
    if(kho){ const k=U(m,code,true); if(k) k.goiNA=true; return; }
    const u=U(m,code,false); if(!u) return;
    const cg={};
    XO_CG_CATS.forEach((c,i)=>{ const col=xoColNhom(XO_C0,i,XO_W2);
      cg[c[0]]=xoTieuChi(xoCell(S[7],r,col), xoCell(S[7],r,col+1), "pct"); });
    u.clGoi=cg;
  });

  /* ---- HẬU KIỂM 1: tháng CHỈ CÓ KẾ HOẠCH -> gỡ "thực đạt" giả của Gói bán 2025
     Nguồn chép Target sang Thực đạt ở khối gói cho các tháng tương lai. Nếu cả 4
     nhóm còn lại đều chưa có thực đạt thì tháng đó là tháng kế hoạch: cất số gói
     sang actKeHoach để không dựng ra %HT giả.                                    */
  for(const m in ky) for(const code in ky[m]) [ky[m][code], ky[m][code].kho].forEach(n=>{
    if(!n) return;
    const dt=n.dt||{};
    if(["trong","doi1","bhmr","sckl"].some(c=>(dt[c]||{}).act!=null)) return;
    const g=dt.goi;
    if(g && g.act!=null){ const v=g.act; delete g.act; g.actKeHoach=v; g.act=null; }
    const slg=((n.sl||{}).cats||{}).goi;
    if(slg && slg.act!=null){ const v=slg.act; delete slg.act; slg.actKeHoach=v; slg.act=null; }
    const sl=n.sl;
    if(sl && sl.tongTatCa){
      const vs=Object.keys(sl.cats||{}).map(k=>sl.cats[k].act);
      sl.tongTatCa.act = vs.some(v=>v!=null) ? vs.reduce((s,v)=>s+(v||0),0) : null;
    }
  });
  /* ---- HẬU KIỂM 2 — BỎ (quy tắc khách chốt lại vòng 3, 19/08/2026):
     TRƯỚC ĐÂY bước này cộng thêm "Gói bán năm 2025" vào thực đạt của
     "Bảo hành tại nhà" (dt.trong.act) cho cân với target (nguồn cũ ghi target
     BÊN TRONG đã gồm gói). Quy tắc MỚI: Gói bán 2025 LUÔN tách riêng, KHÔNG
     gộp vào "Bảo hành tại nhà" ở bất kỳ đâu (kể cả target lẫn thực đạt) — sheet
     3/4/6 của nguồn vốn đã báo "trong" và "goi" thành 2 cột/nhóm riêng biệt,
     nên không cần gộp rồi tách lại nữa. Giữ nguyên dt.trong.act/target đúng
     như nguồn báo (đơn hàng thuần), không set actDH/goiGop. */

  const kq={ v2:true, ky:ky, thang:Object.keys(ky).map(Number).sort((a,b)=>a-b),
             targetDT:xoDocTarget(xoTimSheet(wb,"TARGET")) };
  return kq.thang.length ? kq : null;
}

/* =============================================================================
   SHEET TARGET THÁNG 8-12 -> {<tháng>:{<mã>:{trong,goi,doi1,bhmr,sckl,kho:{…}}}}
   Nhận diện khối theo NHÃN ở cột B (không phụ thuộc số dòng), tháng theo dòng
   tiêu đề "TRƯỞNG PHÒNG". Hai khối tổng (A. BÊN TRONG / B. BÊN NGOÀI) bị bỏ qua
   vì chỉ là tổng của các khối con.
   ============================================================================= */
const XO_TG_KHOI=[["1/ doanh thu ben trong","trong"],["2/ doanh thu ban goi","goi"],
                  ["1/ bao hanh 1 doi 1","doi1"],["2/ bao hanh mo rong","bhmr"],
                  ["3/ doanh thu khach le","sckl"],["4/ bao hanh uy quyen","uyquyen"],
                  ["5/ sua chua bhx","scbhx"],["6/ goi pro","goipro"],["7/ goi thu cu","thucu"],
                  ["8/ solar","solar"]];
const XO_TG_CATS=XO_TG_KHOI.map(k=>k[1]);
function xoDocTarget(ws){
  if(!ws) return null;
  const het=xoHetDong(ws), tg={}, tgDg={}, thu=[];
  let cat=null, thang=[];
  const thuTu=[];                                    // giữ ĐÚNG thứ tự đơn vị xuất hiện ở khối đầu
  for(let r=1;r<=het;r++){
    const b=xoKhongDau(xoCell(ws,r,2));
    if(b==="truong phong"){                          // dòng tiêu đề: đọc T8…T12
      const ms=[];
      for(let i=0;i<5;i++){ const t=String(xoCell(ws,r,6+i)==null?"":xoCell(ws,r,6+i)).trim();
        const mm=/^T\s*(\d{1,2})$/i.exec(t); ms.push(mm?+mm[1]:null); }
      if(ms.some(x=>x!=null)) thang=ms;
      continue;
    }
    if(b && b!=="tong:" && b.indexOf("25634")!==0 && !/^\d+\s*-/.test(b)){
      const hit=XO_TG_KHOI.find(k=>b.indexOf(k[0])===0);
      cat=hit?hit[1]:null;                           // nhãn lạ (khối tổng) -> ngừng ghi
      continue;
    }
    if(!cat) continue;
    const code=xoMa(xoCell(ws,r,4), xoCell(ws,r,4));
    if(!code) continue;
    const kho=/\(\s*t[ạa]i\s*kho\s*\)/i.test(String(xoCell(ws,r,4)||""));
    const k=code+(kho?"|1":"|0");
    if(cat==="trong" && thuTu.indexOf(k)<0) thuTu.push(k);
    const o=(tg[cat]||(tg[cat]={}))[k]||((tg[cat])[k]={});
    thang.forEach((m,i)=>{ if(m==null) return;
      const raw=xoSo(xoCell(ws,r,6+i)).n; if(raw!=null) thu.push(raw);
      o[m]=xoCell(ws,r,6+i);
      const dgv=xoSo(xoCell(ws,r,12+i)).n;                        // ĐƠN GIÁ cùng khối (giá trị thật, bỏ qua công thức)
      if(dgv!=null){ const g=(tgDg[cat]||(tgDg[cat]={}))[k]||((tgDg[cat])[k]={}); g[m]=dgv; } });
  }
  if(!thuTu.length) return null;
  const heSo=xoHeSoTien(thu);
  const out={};
  thuTu.forEach(k=>{
    const code=k.slice(0,-2), kho=k.slice(-1)==="1";
    const ms={}; Object.keys(tg).forEach(c=>Object.keys(tg[c][k]||{}).forEach(m=>{ms[m]=1}));
    Object.keys(ms).map(Number).sort((a,b)=>a-b).forEach(m=>{
      let d=out[m]||(out[m]={}); d=d[code]||(d[code]={}); if(kho) d=d.kho||(d.kho={});
      XO_TG_CATS.forEach(cat=>{
        const v=xoGiaTri(((tg[cat]||{})[k]||{})[m],"money",heSo);
        if(v!=null) d[cat]=v;
        const g=((tgDg[cat]||{})[k]||{})[m];
        if(g!=null) (d.dg||(d.dg={}))[cat]=g; });
    });
  });
  return out;
}

/* =============================================================================
   xoNapV2(kq, nam) — ghi kết quả đã đọc vào DB.ky / DB.targetDT
   · Chỉ THAY khối .tinh của mỗi kỳ; mốc lũy kế (ngayDaQua / chuKy) và các khối
     dữ liệu nguồn cũ của kỳ đó được GIỮ NGUYÊN, vì file 9 sheet không mang những
     thông tin ấy — ghi đè bằng số mặc định sẽ làm sai kỳ đang tính lũy kế.
   · Kỳ chưa có trong kho thì dựng mới, mặc định là kỳ CẢ THÁNG.
   ============================================================================= */
function xoNapV2(kq,nam){
  const months=kq.thang.slice();
  months.forEach(m=>{
    const key=kyKey(nam,m);
    const node=DB.ky[key]||(DB.ky[key]={});
    node.nam=nam; node.thang=m;
    if(NB(node.ngayTrongThang)==null) node.ngayTrongThang=new Date(nam,m,0).getDate();
    if(NB(node.ngayDaQua)==null)      node.ngayDaQua=node.ngayTrongThang;
    if(node.luyKe==null)              node.luyKe=node.ngayDaQua<node.ngayTrongThang;
    if(!node.chuKy) node.chuKy = node.luyKe
      ? `Lũy kế đến ngày ${String(node.ngayDaQua).padStart(2,"0")}/${String(m).padStart(2,"0")}/${nam}`
        +` (${node.ngayDaQua}/${node.ngayTrongThang} ngày)`
      : `Cả tháng ${m}/${nam}`;
    node.tinh=kq.ky[m];
  });
  if(kq.targetDT){
    DB.targetDT=DB.targetDT||{};
    for(const m in kq.targetDT) DB.targetDT[kyKey(nam,+m)]=kq.targetDT[m];
  }
  return {nam, months};
}

