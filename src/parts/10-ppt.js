
/* =============================================================================
   MODULE 8 — TRÌNH CHIẾU (DECK 12 SLIDE)
   · Xem trước từng slide ngay trong app (trước / sau / phóng toàn màn hình)
   · Mỗi slide có ô "NHẬN XÉT / KẾT LUẬN" gõ trực tiếp, tự lưu, và ĐI THEO
     vào file .pptx khi xuất
   · Nội dung slide dựng SỐNG từ bộ lọc hiện tại (kỳ · vùng · tỉnh · loại hình)
   · PHONG CÁCH: học đúng SLIDE BÌA của biểu mẫu — nền gradient xanh→navy + dải
     sóng chấm, tiêu đề Arial đậm trắng + cụm nhấn vàng #FFD500, logo Điện máy
     XANH góc trái / Thợ ĐMX góc phải, số slide dạng "01". Mọi bảng & thẻ số nằm
     trên NỀN SÁNG (trắng / xanh rất nhạt) để số luôn đọc rõ trên nền tối.
   ============================================================================= */
/* --- HỢP ĐỒNG DÙNG CHUNG VỚI WEB (module PPT chỉ tiêu thụ, không tự định nghĩa) ---
   · CL_TQ7 / CL_TQ7_N / CL_TQ7_HAS (lớp DATA) — đúng 7 tiêu chí chất lượng của
     sheet TỔNG QUAN và của slide "CHẤT LƯỢNG DỊCH VỤ"; calcChatLuongTQ7(S) trả bộ 7 đó.
     calcChatLuongTong(S) mới là bộ ĐẦY ĐỦ (dùng cho slide chất lượng chi tiết).
   · calcTongQuanRows(S) — 5 dòng × 5 thông tin (TARGET · THỰC ĐẠT HIỆN TẠI ·
     LŨY KẾ CUỐI THÁNG (dự kiến) · TỶ LỆ HOÀN THÀNH · ĐÁNH GIÁ) cho slide TỔNG QUAN,
     giống hệt bảng tổng hợp của sheet Tổng quan.
   · PRORATE_NHOM (lớp DATA) — chi phí KHÔNG quy đổi ×15/31; sản lượng & doanh thu CÓ.
     duKienOf(k) trả "lũy kế cuối tháng (dự kiến)" đúng theo quy tắc đó.
   · DG_TEXT (lớp CALC) — nhãn ĐẠT / KHÔNG ĐẠT / CHƯA CÓ DỮ LIỆU.               */
const SLIDE_NOTE_PH="Nhập nhận xét / kết luận cho slide này…";
function slideNoteKey(id,S){ return `__slide|${id}|${actKey(S)}|${S.vung}|${S.kho}|${S.loai}`; }
function slideNote(id,S){ const n=NOTES[slideNoteKey(id,S)]; return (n&&n.text)?String(n.text):""; }

/* ---------------------------------------------------------------------------
   BẢNG MÀU DECK — lấy từ biểu mẫu + thang trạng thái chuẩn (good / critical).
   Trạng thái LUÔN đi kèm chữ (ĐẠT / KHÔNG ĐẠT) và dấu ✅ / ❌ nên màu không bao
   giờ là kênh thông tin duy nhất.
   --------------------------------------------------------------------------- */
const DK={
  yel:"FFD500",  wh:"FFFFFF",  navy:"0B2E63",
  hdr:"123E7C",              /* nền dòng tiêu đề bảng */
  box:"123E7C",              /* nền hộp ĐÁNH GIÁ / HÀNH ĐỘNG */
  panel:"FFFFFF", panelAlt:"EAF6FD", sumBg:"FFF3CC",
  ink:"14243F", inkMut:"4E648A", hair:"C8DAF0",
  good:"0CA30C", bad:"D03B3B", warn:"FAB219",   /* thang trạng thái — dùng làm nền pill */
  goodT:"006300", badT:"C0272D", warnT:"8A5A00", noneT:"5C708F"   /* dùng làm màu chữ trên nền sáng */
};
const OKM="✅", NOM="❌";
/* class dùng chung cho bản xem trước (HTML) và ánh xạ sang màu của .pptx */
const dkCls    = st=>({good:"sg",warn:"sb",bad:"sb",none:"sn"}[st]||"sn");
const dkTxtCol = c=>({sg:DK.goodT,sw:DK.warnT,sb:DK.badT,sn:DK.noneT}[c]||DK.ink);
const dkFillCol= c=>({sg:DK.good ,sw:DK.warn ,sb:DK.bad ,sn:"8FA3C2"}[c]||"8FA3C2");

/* ---------- tiện ích số ---------- */
const sV  = k=>k&&k.actual!=null ? k.fmt(k.actual) : "chưa có dữ liệu";
const sT  = k=>k&&k.target!=null ? k.fmt(k.target) : "chưa cấu hình";
const sD  = k=>{ const d=k?duKienOf(k):null; return d==null?"–":k.fmt(d); };
/* HAI TỶ LỆ TÁCH RIÊNG, MỖI CÁI ĐÚNG 1 DÒNG — không bao giờ nhét 2 dòng vào
   một ô, vì khi xuất .pptx ô 2 dòng bị bóp chữ và tràn khung.
     sRn = KẾT QUẢ ĐẾN HIỆN TẠI  (thực đạt / target cả tháng)
     sR  = TỶ LỆ DỰ KIẾN ĐẠT     (dự kiến cả tháng / target cả tháng) -> chấm ĐẠT
   Kỳ đã trọn tháng thì 2 số bằng nhau, cột "đến hiện tại" ghi "–" cho gọn.   */
const sR  = k=>k&&k.rate!=null ? pc1(k.rate) : "–";
const sRn = k=>(k&&k.coTienDo&&k.rateNow!=null) ? pc1(k.rateNow) : "–";
/* bản dùng trong câu văn xuôi (ghi chú, hộp hành động, phụ đề thẻ) */
const sR1 = k=>k&&k.rate!=null
  ? pc1(k.rate)+(k.coTienDo?` (đến hiện tại ${pc1(k.rateNow)})`:"")
  : "–";
const sCls= k=>k?dkCls(k.status):"sn";
const sDG = k=>k?(DG_TEXT[k.status]||"CHƯA CÓ DỮ LIỆU"):"CHƯA CÓ DỮ LIỆU";
/* ô "tỷ lệ + dấu" đúng kiểu biểu mẫu: 103% ✅ / 94% ❌ */
function rateMark(k){
  if(!k||k.rate==null) return {t: (k&&k.naLabel)?k.naLabel:"–", c:"sn"};
  const ok=k.status==="good";
  return {t:`${pc(k.rate)} ${ok?OKM:NOM}`, c:ok?"sg":"sb"};
}
/* 5 THÔNG TIN BẮT BUỘC của 1 KPI -> 5 ô cuối của mọi dòng bảng số */
/* 5 cột (bảng rộng, không đủ chỗ tách đôi tỷ lệ) — cột tỷ lệ là TỶ LỆ DỰ KIẾN ĐẠT */
const five5 = k=>[sT(k), sV(k), sD(k), sR(k), {t:sDG(k), c:sCls(k)}];
const FIVE_HEAD=["TARGET (CẢ THÁNG)","THỰC ĐẠT HIỆN TẠI","LŨY KẾ CUỐI THÁNG (DỰ KIẾN)","TỶ LỆ DỰ KIẾN ĐẠT","ĐÁNH GIÁ"];
/* 6 cột — tách hẳn 2 tỷ lệ thành 2 cột riêng, mỗi ô 1 dòng */
const six6  = k=>[sT(k), sV(k), sD(k), sRn(k), sR(k), {t:sDG(k), c:sCls(k)}];
const SIX_HEAD=["TARGET (CẢ THÁNG)","THỰC ĐẠT HIỆN TẠI","LŨY KẾ CUỐI THÁNG (DỰ KIẾN)",
                "KẾT QUẢ ĐẾN HIỆN TẠI","TỶ LỆ DỰ KIẾN ĐẠT","ĐÁNH GIÁ"];

/* ============================ KHỐI NỘI DUNG ============================ */
const T =(head,body,o)=>Object.assign({kind:"table",head,body},o||{});
/* Dải số đầu slide. Ô "KẾT QUẢ ĐẾN HIỆN TẠI" chỉ xuất hiện khi chỉ tiêu THỰC SỰ
   có quy đổi lũy kế — tránh in ra một ô toàn dấu "–". lblR: đặt lại tên cột tỷ lệ
   (chi phí là chỉ tiêu đảo chiều nên gọi là TỶ LỆ KIỂM SOÁT).                  */
const BAND=(title,k,lblR)=>({kind:"five",title:title||"",items:[
  {l:SIX_HEAD[0],v:sT(k)},{l:SIX_HEAD[1],v:sV(k)},{l:SIX_HEAD[2],v:sD(k)},
  ...(k&&k.coTienDo?[{l:SIX_HEAD[3],v:sRn(k)}]:[]),
  {l:lblR||SIX_HEAD[4],v:sR(k)},{l:SIX_HEAD[5],v:sDG(k),c:sCls(k)}]});
const CARDS=cards=>({kind:"cards",cards});
const BOXES=boxes=>({kind:"boxes",boxes});
const STRIP=cards=>({kind:"strip",cards});
const NOTE =t=>({kind:"note",t});
const CAP  =t=>({kind:"cap",t});

/* KPI "gộp" cho dải tổng của các slide ma trận.
   QUY TẮC: MỖI TIÊU CHÍ TÍNH LÀ 1, chấm trên số TỔNG MIỀN của tiêu chí đó —
   KHÔNG đếm từng ô (tỉnh × tiêu chí). Bảng 12 tỉnh × 5 tiêu chí vẫn giữ nguyên
   để soi từng tỉnh, nhưng dải tổng chỉ nói "x/5 tiêu chí đạt".
   Chất lượng không quy đổi lũy kế nên LŨY KẾ CUỐI THÁNG = số hiện tại.        */
function cellTally(kpis,name){
  const co=kpis.filter(kpiOK);
  const dat=co.filter(k=>k.dat).length;
  const rate=co.length?dat/co.length:null;
  return {name:name||"TIÊU CHÍ ĐẠT", target:co.length?co.length:null, actual:co.length?dat:null,
    rate, fmt:v=>v==null?"–":`${f0(v)} tiêu chí`, unit:"tiêu chí", meta:null,
    status: rate==null?"none":(rate>=1?"good":"bad"), dat:rate!=null&&rate>=1,
    noData:!co.length, noCfg:!co.length};
}
/* gộp danh sách KPI cùng đơn vị thành 1 KPI tổng (giữ nguyên định dạng) */
function rollupSum(list,name,fmt,unit,dir){
  const t=list.filter(k=>k&&k.target!=null), a=list.filter(k=>k&&k.actual!=null);
  const tg=t.length?t.reduce((s,k)=>s+k.target,0):null, ac=a.length?a.reduce((s,k)=>s+k.actual,0):null;
  const dk=a.length?a.reduce((s,k)=>s+(duKienOf(k)||0),0):null;
  const rate=(tg!=null&&ac!=null&&tg!==0)?ac/tg:null;
  const st=rate==null?"none":statusOf(rate,dir||"up");
  return {name,target:tg,actual:ac,rate,fmt:fmt||f0,unit:unit||"",meta:{duKien:dk},
    status:st, dat:st==="good", noData:ac==null, noCfg:tg==null};
}

/* ---------------- kỳ kế tiếp / target các tháng tới ---------------- */
function deckLastMonth(S){ const ms=selMonths(S); return ms[ms.length-1]||S.thang; }
/* tối đa 4 tháng target kế tiếp (biểu mẫu: TARGET T9 → T12); cắt ở T12 */
function nextTargetMonths(S){
  const out=[]; for(let m=deckLastMonth(S)+1;m<=12&&out.length<4;m++) if(DB.ky[kyKey(S.nam,m)]) out.push(m);
  return out;
}
const Sm=(S,m)=>Object.assign({},S,{ky:"Tháng",thang:m,months:[m]});
function coverTitle(S){
  const ms=selMonths(S), last=ms[ms.length-1];
  const a = S.ky==="Năm" ? `KẾT QUẢ NĂM ${S.nam}`
          : ms.length>1  ? `KẾT QUẢ ${monthsLabel(ms)}/${S.nam}`
                         : `KẾT QUẢ THÁNG ${last}`;
  const nx=[last+1,last+2].filter(m=>m<=12);
  const b = nx.length===2 ? `& HÀNH ĐỘNG THÁNG ${nx[0]}, ${nx[1]}`
          : nx.length===1 ? `& HÀNH ĐỘNG THÁNG ${nx[0]}`
                          : `& HÀNH ĐỘNG KỲ KẾ TIẾP`;
  return {a,b};
}

/* ---------------- lịch công tác tuần kế tiếp (slide 12) ---------------- */
const dmy=d=>`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
const dm =d=>`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
/* T2 → T6 của TUẦN KẾ TIẾP tính từ ngày xuất báo cáo (không cắm cứng ngày) */
function nextWeekDays(now){
  const d=now||new Date();
  const base=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const add=((8-base.getDay())%7)||7;            // số ngày tới Thứ 2 kế tiếp
  const mon=new Date(base.getFullYear(),base.getMonth(),base.getDate()+add);
  return [0,1,2,3,4].map(i=>new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i));
}
/* Ưu tiên: CHẤT LƯỢNG → PHÁT TRIỂN NGOÀI → CHI PHÍ */
function visitCandidates(S){
  const out=[];
  for(const r of allUnitRows(S)){
    const ten=r.tinh+(r.loai==="kho"?" (kho)":"");
    /* 1. CHẤT LƯỢNG — lấy tiêu chí hụt sâu nhất của đơn vị */
    const miss=r.cl.filter(k=>kpiOK(k)&&!k.dat).sort((a,b)=>a.rate-b.rate);
    if(miss.length){
      const k=miss[0];
      out.push({uu:1, sev:k.rate, code:r.code, ten,
        viec:`Họp Offline NV/TN — chấn chỉnh: ${k.name} ${k.fmt(k.actual)} (KPI ${k.fmt(k.target)})`,
        kq:`TN/NV nắm rõ KPI, chốt cam kết đưa ${k.name} từ ${k.fmt(k.actual)} lên ${k.fmt(k.target)}`,
        ly:`${k.name} mới ${pc(k.rate)} KPI`});
      continue;
    }
    /* 2. PHÁT TRIỂN NGOÀI */
    if(kpiOK(r.benNgoai)&&!r.benNgoai.dat){
      out.push({uu:2, sev:r.benNgoai.rate, code:r.code, ten,
        viec:`Họp Offline NV/TN — chấn chỉnh: doanh thu BÊN NGOÀI dự kiến ${pc(r.benNgoai.rate)} chỉ tiêu (${tr(duKienOf(r.benNgoai))} / ${tr(r.benNgoai.target)})`,
        kq:"Chốt kế hoạch phát triển ngoài, đưa tỷ lệ hoàn thành lên 100% target",
        ly:`phát triển ngoài mới ${pc(r.benNgoai.rate)} chỉ tiêu`});
      continue;
    }
    /* 3. CHI PHÍ (đảo chiều: thực chi ≤ định mức mới ĐẠT) */
    if(kpiOK(r.cp)&&!r.cp.dat){
      out.push({uu:3, sev:2-r.cp.rate, code:r.code, ten,
        viec:`Họp Offline NV/TN — chấn chỉnh: chi phí vượt ${pc(r.cp.rate-1)} định mức (${tr(r.cp.actual)} / ${tr(r.cp.target)})`,
        kq:`Chốt phương án tiết giảm, đưa thực chi về ≤ ${tr(r.cp.target)}`,
        ly:`chi phí vượt ${pc(r.cp.rate-1)} định mức`});
    }
  }
  return out.sort((a,b)=>a.uu-b.uu || a.sev-b.sev);
}
function visitPlan(S){
  const days=nextWeekDays(), cands=visitCandidates(S), rows=[];
  for(let i=0;i<days.length;i++){
    const c=cands[i];
    rows.push({stt:i+1, ngay:dmy(days[i]),
      noi:c?c.ten:"—", gio:"8H00 - 17H00", tp:"Thu/TN",
      viec:c?c.viec:"Dự phòng — bám sát tỉnh phát sinh trong tuần",
      kq:c?c.kq:"Kiểm soát & duy trì kết quả đến cuối tháng", uu:c?c.uu:0, ly:c?c.ly:""});
  }
  return {days,rows,cands};
}

/* ============================ MÔ HÌNH 12 SLIDE ============================ */
function slideModel(S){
  const kyTxt=kyLabel(S), phTxt=scopeLbl(S);
  const loaiTxt=S.loai==="NHA"?"Chỉ bảo hành tại nhà":S.loai==="KHO"?"Chỉ bảo hành tại kho":"Cả tại nhà và tại kho";
  const sub=`${phTxt} · ${kyTxt} · ${loaiTxt}`;
  const ex=calcExec(S);
  const tqRows=calcTongQuanRows(S);
  const bt=calcBenTrong(S), bn=calcBenNgoai(S), tg=calcTongDoanhThu(S);
  const cpA=calcChiPhiAll(S);
  const uNha=unitsNha(S), uKho=unitsKho(S);
  const rows=allUnitRows(S);
  const nextM=nextTargetMonths(S);
  const cat=c=>calcDoanhThuCat(c,S);
  const SL=[];

  /* ---------- 01 · BÌA ---------- */
  const ct=coverTitle(S);
  SL.push({id:"bia", n:1, kind:"cover", title:"Bìa báo cáo",
    h1a:LB("ppt.title.a",ct.a), h1b:LB("ppt.title.b",ct.b),
    sub1:LB("ppt.sub1","Dịch vụ BHSC CE – Thợ Điện Máy Xanh"),
    sub2:LB("ppt.sub2", S.kho!=="ALL"?scopeLbl(S):(S.vung==="TONG"?"Vùng Trung Bộ & Vùng Duyên Hải":S.vung)),
    chip:kyTxt, sub, blocks:[],
    foot:`Người lập: Nguyễn Duy Thu (25634) · BHSC CE · ${loaiTxt}`});

  /* ---------- 02 · TỔNG QUAN ---------- */
  /* Kỳ bám kế hoạch (vd T8-12) không chấm ĐẠT/KHÔNG ĐẠT -> loại khỏi mẫu số */
  const tqCham=tqRows.filter(r=>!r.keHoach);
  const tqCo=tqCham.filter(r=>r.status!=="none").length, tqDat=tqCham.filter(r=>r.dat).length;
  const tqKH=tqRows.filter(r=>r.keHoach).length;
  /* %HT in 2 tầng đúng như web: số lớn = dự kiến cả tháng, dòng nhỏ = tiến độ đến nay */
  /* 2 tỷ lệ TÁCH RIÊNG, mỗi ô 1 dòng — không nhét 2 dòng vào 1 ô */
  const tqRn=r=>r.coTienDo?r.rNowText:"–";
  SL.push({id:"tongquan", n:2, title:"TỔNG QUAN", sub, blocks:[
    /* thẻ chỉ đủ chỗ 1 dòng -> tiến độ "đến nay" để ở bảng bên dưới cho khỏi cắt chữ */
    CARDS(tqRows.map(r=>({l:r.label, v:r.aText,
      sub:`Target ${r.tText} · Dự kiến ${r.dText} · ${r.rText}`,
      dg:r.dgText, st:r.keHoach?"none":r.status}))),
    T(["LĨNH VỰC",...SIX_HEAD],
      tqRows.map(r=>[r.label,r.tText,r.aText,r.dText,tqRn(r),r.rText,
        {t:r.dgText, c:r.keHoach?"sn":dkCls(r.status)}]).concat([
        {sum:true,cells:["TỔNG — 5 LĨNH VỰC","5 lĩnh vực",
          tqCo?`${tqDat}/${tqCo} đạt`:"–", tqCo?`${tqDat}/${tqCo} đạt`:"–", "–",
          tqCo?pc1(tqDat/tqCo):"–",
          {t: tqKH?`${tqKH} LĨNH VỰC THEO KẾ HOẠCH`
             : tqCo?(tqDat===tqCo?"ĐẠT":"KHÔNG ĐẠT"):"CHƯA CÓ DỮ LIỆU",
           c: tqKH?"sn":(tqCo?(tqDat===tqCo?"sg":"sb"):"sn")}]}]),
      {w:[2.28,1.55,1.62,1.78,1.6,1.5,2.0]}),
    NOTE(`TARGET là số CẢ THÁNG (lấy nguyên từ file TARGET, không quy đổi theo số ngày). `
      +`Tỷ lệ hoàn thành = dự kiến cả tháng ÷ target cả tháng; dòng nhỏ trong ngoặc là tiến độ thật đến hôm nay. `
      +`Chất lượng chấm đúng ${CL_TQ7_N} tiêu chí Tổng quan (5 tại nhà + 2 tại kho). `
      +"Chi phí là chỉ tiêu đảo chiều: thực chi ≤ định mức = ĐẠT. "
      +`Số dự kiến cuối tháng suy ra cho ${PR_TEXT.ap}; không suy ra cho ${PR_TEXT.khongAp}.`)]});

  /* ---------- 03 · CHẤT LƯỢNG DỊCH VỤ (7 tiêu chí + target các tháng tới) ---------- */
  const clNhaNow=showNha(S)?calcClNha(S):[], clKhoNow=showKho(S)?calcClKho(S):[];
  const pick=(list,key)=>list.find(k=>k.key===key)||null;
  const tq7=CL_TQ7.map(d=>({def:d, k: d.loai==="nha"?pick(clNhaNow,d.key):pick(clKhoNow,d.key)}));
  const futureCl={};
  for(const m of nextM){ const S2=Sm(S,m);
    futureCl[m]={nha:showNha(S)?calcClNha(S2):[], kho:showKho(S)?calcClKho(S2):[]}; }
  const cl7Band=cellTally(tq7.map(x=>x.k).filter(Boolean),"TIÊU CHÍ CHẤT LƯỢNG ĐẠT");
  SL.push({id:"chatluong", n:3, title:"CHẤT LƯỢNG DỊCH VỤ", sub, blocks:[
    BAND(`CHẤT LƯỢNG ${CL_TQ7_N} TIÊU CHÍ · ${CL_TQ7.filter(x=>x.loai==="nha").length} TẠI NHÀ – ${CL_TQ7.filter(x=>x.loai==="kho").length} TẠI KHO`, cl7Band),
    T(["TIÊU CHÍ CHẤT LƯỢNG","KPI / TARGET",`HIỆN TRẠNG ${monthsLabel(selMonths(S))}`,"TỶ LỆ HOÀN THÀNH","ĐÁNH GIÁ",
       ...nextM.map(m=>`TARGET T${m}`)],
      tq7.map(x=>{ const k=x.k;
        return [x.def.name, sT(k), sV(k), rateMark(k), {t:sDG(k),c:sCls(k)},
          ...nextM.map(m=>{ const src=x.def.loai==="nha"?futureCl[m].nha:futureCl[m].kho;
            const kk=pick(src,x.def.key); return kk&&kk.target!=null?kk.fmt(kk.target):"–"; })];
      }).concat([{sum:true,cells:[`TỔNG — ${CL_TQ7_N} TIÊU CHÍ`,
        cl7Band.target==null?"–":`${cl7Band.target} tiêu chí`,
        cl7Band.actual==null?"–":`${cl7Band.actual} đạt`,
        rateMark(cl7Band), {t:sDG(cl7Band),c:sCls(cl7Band)}, ...nextM.map(()=>"")]}]),
      {w:[3.5,1.35,1.55,1.5,1.6].concat(nextM.map(()=>1.1))}),
    STRIP(clActionCards(S,tq7))]});

  /* ---------- 04 · CHẤT LƯỢNG BẢO HÀNH TẠI NHÀ (12 tỉnh × 5 tiêu chí) ---------- */
  const nhaCells=[];
  const nhaBody=uNha.map(code=>{
    const ks=calcClNhaTinh(code,S); ks.forEach(k=>nhaCells.push(k));
    return [tinhOf(code), ...ks.map(rateMark)];
  });
  const nhaTong=showNha(S)?calcClNha(S):CL_NHA.map(()=>null);
  nhaBody.push({sum:true,cells:["TỔNG MIỀN", ...nhaTong.map(rateMark)]});
  SL.push({id:"cl-nha", n:4, title:"CHẤT LƯỢNG BẢO HÀNH TẠI NHÀ", sub, blocks:[
    BAND(`CHẤT LƯỢNG TẠI NHÀ · ${CL_NHA.length} TIÊU CHÍ TOÀN MIỀN`, cellTally(nhaTong.filter(Boolean),"TIÊU CHÍ ĐẠT")),
    CAP("Kết quả theo tỉnh — Tỷ lệ đạt so với KPI / Target"),
    T(["TỈNH",...CL_NHA.map(d=>d.name)], nhaBody, {w:[3.2,1.86,1.86,1.86,1.86,1.86]}),
    BOXES(nhaBoxes(S,uNha,nhaTong.filter(Boolean)))]});

  /* ---------- 05 · CHẤT LƯỢNG BẢO HÀNH TẠI KHO (kho × 2 tiêu chí 14N/30N) ---------- */
  const KHO2=CL_KHO.filter(d=>CL_TQ7_HAS("kho",d.key));
  const khoCells=[];
  const khoBody=uKho.map(code=>{
    const ks=calcClKhoUnit(code,S).filter(k=>CL_TQ7_HAS("kho",k.key));
    ks.forEach(k=>khoCells.push(k));
    return ["Kho Bảo Hành "+tinhOf(code), ...ks.map(rateMark)];
  });
  const khoTong=showKho(S)?calcClKho(S).filter(k=>CL_TQ7_HAS("kho",k.key)):KHO2.map(()=>null);
  khoBody.push({sum:true,cells:["TỔNG MIỀN", ...khoTong.map(rateMark)]});
  SL.push({id:"cl-kho", n:5, title:"CHẤT LƯỢNG BẢO HÀNH TẠI KHO", sub, blocks:[
    BAND(`CHẤT LƯỢNG TẠI KHO · ${KHO2.length} TIÊU CHÍ TOÀN MIỀN`, cellTally(khoTong.filter(Boolean),"TIÊU CHÍ ĐẠT")),
    CAP("Kết quả theo kho — Tỷ lệ đạt so với KPI / Target"),
    T(["KHO",...KHO2.map(d=>d.name)], khoBody, {w:[5.4,3.55,3.55]}),
    BOXES(khoBoxes(S,uKho,khoTong.filter(Boolean)))]});

  /* ---------- 06 · CHẤT LƯỢNG GÓI BẢO HÀNH (1 đổi 1 + BHMR) ---------- */
  const goiCells=[], goiBody=[];
  for(const code of uNha){
    const ks=calcClGoiUnit(code,"nha",S); ks.forEach(k=>goiCells.push(k));
    goiBody.push([tinhOf(code), ...ks.map(rateMark)]);
  }
  for(const code of uKho) goiBody.push(["Kho Bảo Hành "+tinhOf(code),
    {t:"không áp dụng",c:"sn"},{t:"không áp dụng",c:"sn"}]);
  const goiTong=showNha(S)?calcClGoi(S):calcClGoiNA();
  goiBody.push({sum:true,cells:["TỔNG MIỀN", ...goiTong.map(rateMark)]});
  SL.push({id:"cl-goi", n:6, title:"CHẤT LƯỢNG GÓI BẢO HÀNH", sub, blocks:[
    BAND(`ĐÚNG HẠN CAM KẾT (1 ĐỔI 1: 14 NGÀY · BHMR: 6 NGÀY) · ${CL_GOI.length} TIÊU CHÍ TOÀN MIỀN`, cellTally(goiTong.filter(Boolean),"TIÊU CHÍ ĐẠT")),
    CAP("Kết quả theo tỉnh — Tỷ lệ đúng hạn cam kết so với KPI / Target"),
    T(["TỈNH / KHO",...CL_GOI.map(d=>d.name)], goiBody, {w:[5.4,3.55,3.55]}),
    /* 2 cụm hành động riêng cho 1 ĐỔI 1 và BẢO HÀNH MỞ RỘNG — tự sinh từ số,
       sửa lại được trên web trước khi xuất (như các hộp hành động khác).      */
    BOXES(goiBoxes(S,uNha,goiTong))]});

  /* ---------- 07 · SẢN LƯỢNG & ĐƠN GIÁ TRUNG BÌNH ---------- */
  /* Sản lượng có quy đổi lũy kế -> đủ 6 cột (tách 2 tỷ lệ).
     Đơn giá là số bình quân, không quy đổi -> chỉ 5 cột, khỏi thừa 1 cột toàn dấu "–". */
  const slBody=rows.map(r=>[r.tinh+(r.loai==="kho"?" (kho)":""), ...six6(r.sl), ...five5(r.dg)]);
  slBody.push({sum:true,cells:["TỔNG", ...six6(ex.sanLuong), ...five5(ex.donGia)]});
  SL.push({id:"sanluong", n:7, title:"SẢN LƯỢNG & ĐƠN GIÁ TRUNG BÌNH", sub, blocks:[
    CARDS([
      {l:"SẢN LƯỢNG ĐƠN HÀNG", v:sV(ex.sanLuong), sub:`Target ${sT(ex.sanLuong)} · Dự kiến ${sD(ex.sanLuong)} · ${sR1(ex.sanLuong)}`, dg:sDG(ex.sanLuong), st:ex.sanLuong.status},
      {l:"ĐƠN GIÁ TRUNG BÌNH", v:sV(ex.donGia),   sub:`Target ${sT(ex.donGia)} · Dự kiến ${sD(ex.donGia)} · ${sR1(ex.donGia)}`,     dg:sDG(ex.donGia),   st:ex.donGia.status}]),
    T(["ĐƠN VỊ","TARGET","THỰC ĐẠT","LŨY KẾ (DỰ KIẾN)","ĐẾN HIỆN TẠI","DỰ KIẾN ĐẠT","ĐÁNH GIÁ",
                "TARGET","THỰC ĐẠT","LŨY KẾ (DỰ KIẾN)","DỰ KIẾN ĐẠT","ĐÁNH GIÁ"], slBody,
      {w:[1.55].concat(Array(11).fill(0.998)), small:true,
       group:[{t:"",n:1},{t:"SẢN LƯỢNG ĐƠN HÀNG",n:6},{t:"ĐƠN GIÁ TRUNG BÌNH",n:5}]}),
    slimActions("HÀNH ĐỘNG — SẢN LƯỢNG & ĐƠN GIÁ", slBoxItems(S,ex,rows)),
    NOTE("Đơn giá là số BÌNH QUÂN — gộp nhiều tháng lấy bình quân gia quyền theo sản lượng thực đạt, không cộng dồn và không quy đổi lũy kế.")]});

  /* ---------- 08 · CHI PHÍ ---------- */
  /* chi phí KHÔNG quy đổi lũy kế -> không có "kết quả đến hiện tại" riêng,
     giữ 6 cột cho khỏi thừa một cột toàn dấu "–". */
  const cpBody=rows.map(r=>[r.tinh+(r.loai==="kho"?" (kho)":""), ...five5(r.cp)]);
  cpBody.push({sum:true,cells:["TỔNG", ...five5(cpA)]});
  SL.push({id:"chiphi", n:8, title:"CHI PHÍ", sub, blocks:[
    BAND("CHI PHÍ TOÀN VÙNG — CHỈ TIÊU ĐẢO CHIỀU: THỰC CHI ≤ ĐỊNH MỨC = ĐẠT", cpA, "TỶ LỆ KIỂM SOÁT"),
    CAP("Kết quả theo đơn vị — Định mức · Thực chi · Lũy kế cuối tháng (dự kiến) · Tỷ lệ kiểm soát · Đánh giá"),
    T(["ĐƠN VỊ","ĐỊNH MỨC (CẢ THÁNG)","THỰC CHI HIỆN TẠI","LŨY KẾ CUỐI THÁNG (DỰ KIẾN)",
       "TỶ LỆ KIỂM SOÁT","ĐÁNH GIÁ"],
      cpBody, {w:[2.85,1.95,2.05,2.45,1.65,1.55]}),
    slimActions("HÀNH ĐỘNG — CHI PHÍ", cpBoxItems(S,cpA,rows)),
    NOTE("Chi phí KHÔNG quy đổi lũy kế theo số ngày: số nguồn đã là lũy kế cuối tháng nên so thẳng với định mức cả tháng. Đơn vị vượt định mức tô đỏ.")]});

  /* ---------- 09 · DOANH THU BÊN TRONG & BÊN NGOÀI ---------- */
  const nhaKho=sumKpi([cat("Bảo hành tại nhà"),cat("Bảo hành tại kho")],"Bảo hành tại nhà & tại kho","layers");
  const dtLines=[
    {l:"TỔNG CỘNG TNB",                  k:tg,                        lv:0, fk:"tong"},
    {l:"A. DOANH THU BÊN TRONG ĐMX",     k:bt,                        lv:1, fk:"bt"},
    {l:"1/ Bảo hành tại nhà & tại kho",  k:nhaKho,                    lv:2, fk:"nhaKho"},
    {l:"2/ Bán gói năm 2025",            k:cat("Bán gói năm 2025"),   lv:2, fk:"goi"},
    {l:"B. DOANH THU BÊN NGOÀI ĐMX",     k:bn,                        lv:1, fk:"bn"},
    {l:"1/ Bảo hành 1 đổi 1",            k:cat("BH 1 đổi 1"),         lv:2, fk:"d11"},
    {l:"2/ Bảo hành mở rộng",            k:cat("BHMR"),               lv:2, fk:"bhmr"},
    {l:"3/ Sửa chữa khách lẻ",           k:cat("SCDV"),               lv:2, fk:"scdv"},
    /* 5 nhóm BÊN NGOÀI mới (từ 08/09/2026) gộp 1 dòng cho slide khỏi tràn khung —
       nhờ vậy B = 1 + 2 + 3 + 4 vẫn cộng đúng như sheet TARGET. */
    {l:"4/ Dịch vụ mới (5 nhóm)",        k:calcNgoaiMoi(S),           lv:2, fk:"moi"}
  ];
  const futureDT={};
  for(const m of nextM){ const S2=Sm(S,m);
    futureDT[m]={tong:calcTongDoanhThu(S2), bt:calcBenTrong(S2), bn:calcBenNgoai(S2),
      nhaKho:sumKpi([calcDoanhThuCat("Bảo hành tại nhà",S2),calcDoanhThuCat("Bảo hành tại kho",S2)],"x","layers"),
      goi:calcDoanhThuCat("Bán gói năm 2025",S2), d11:calcDoanhThuCat("BH 1 đổi 1",S2),
      bhmr:calcDoanhThuCat("BHMR",S2), scdv:calcDoanhThuCat("SCDV",S2), moi:calcNgoaiMoi(S2)};
  }
  SL.push({id:"doanhthu", n:9, title:"DOANH THU BÊN TRONG & BÊN NGOÀI", sub, blocks:[
    BAND("TỔNG DOANH THU TOÀN VÙNG", tg),
    T(["KHOẢN MỤC","TARGET (CẢ THÁNG)","THỰC ĐẠT HIỆN TẠI","LŨY KẾ (DỰ KIẾN)",
       "KẾT QUẢ ĐẾN HIỆN TẠI","TỶ LỆ DỰ KIẾN ĐẠT","ĐÁNH GIÁ",...nextM.map(m=>`TARGET T${m}`)],
      dtLines.map(r=>[{t:r.l,lv:r.lv}, ...six6(r.k),
        ...nextM.map(m=>{const k=futureDT[m][r.fk]; return k&&k.target!=null?tr(k.target):"–";})])
        .concat([{sum:true,cells:["TỔNG DOANH THU", ...six6(tg),
          ...nextM.map(m=>{const k=futureDT[m].tong; return k&&k.target!=null?tr(k.target):"–";})]}]),
      {w:[2.62,1.14,1.2,1.24,1.24,1.2,1.32].concat(nextM.map(()=>0.86)), small:true}),
    STRIP(dtActionCards(bt,bn,tg))]});

  /* ---------- 10 · DOANH THU TỔNG / BÊN TRONG / BÊN NGOÀI ---------- */
  /* THẺ % của slide 10 & 11 — số LỚN đúng 1 dòng là TỶ LỆ DỰ KIẾN ĐẠT (căn cứ chấm
     ĐẠT/KHÔNG ĐẠT). KẾT QUẢ ĐẾN HIỆN TẠI để riêng 1 dòng phụ cỡ thường, không
     nhồi vào số lớn nữa để chữ luôn lọt khung khi xuất file.                    */
  const dtCard5=(l,k)=>({l, v:sR(k), big:true, dg:sDG(k), st:k.status,
    sub:`Kết quả đến hiện tại ${sRn(k)} · Target ${sT(k)} · Thực đạt ${sV(k)} · Dự kiến ${sD(k)}`});
  const dtBody=rows.map(r=>[r.tinh+(r.loai==="kho"?" (kho)":""),
    rateMark(r.tongDt), rateMark(r.benTrong), rateMark(r.benNgoai),
    tr(r.tongDt.actual), tr(r.benTrong.actual), tr(r.benNgoai.actual)]);
  dtBody.push({sum:true,cells:["TỔNG MIỀN", rateMark(tg), rateMark(bt), rateMark(bn),
    tr(tg.actual), tr(bt.actual), tr(bn.actual)]});
  SL.push({id:"dt-3", n:10, title:"DOANH THU TỔNG, BÊN TRONG & BÊN NGOÀI", sub, blocks:[
    CARDS([dtCard5("TỔNG DOANH THU",tg), dtCard5("DOANH THU BÊN TRONG ĐMX",bt), dtCard5("DOANH THU BÊN NGOÀI ĐMX",bn)]),
    CAP("Tỷ lệ hoàn thành theo đơn vị — kèm số thực đạt (triệu đồng)"),
    T(["ĐƠN VỊ","TỔNG DT %","BÊN TRONG %","BÊN NGOÀI %","TỔNG DT","BÊN TRONG","BÊN NGOÀI"], dtBody,
      {w:[2.95,1.66,1.66,1.66,1.55,1.55,1.55], small:true}),
    BOXES(dtBoxes(bt,bn,tg,rows))]});

  /* ---------- 11 · CHI TIẾT DOANH THU BÊN NGOÀI ---------- */
  const d11=cat("BH 1 đổi 1"), bhmr=cat("BHMR"), scdv=cat("SCDV"), moiK=calcNgoaiMoi(S);
  const bnBody=rows.map(r=>[r.tinh+(r.loai==="kho"?" (kho)":""),
    rateMark(r.d11), rateMark(r.bhmr), rateMark(r.scdv), rateMark(r.moi), rateMark(r.benNgoai)]);
  bnBody.push({sum:true,cells:["TỔNG MIỀN", rateMark(d11), rateMark(bhmr), rateMark(scdv), rateMark(moiK), rateMark(bn)]});
  SL.push({id:"dt-ngoai", n:11, title:"CHI TIẾT DOANH THU BÊN NGOÀI", sub, blocks:[
    CARDS([dtCard5("GÓI 1 ĐỔI 1",d11), dtCard5("BẢO HÀNH MỞ RỘNG",bhmr), dtCard5("SỬA CHỮA KHÁCH LẺ",scdv)]),
    T(["ĐƠN VỊ","1 ĐỔI 1","BẢO HÀNH MỞ RỘNG","SỬA CHỮA KHÁCH LẺ","DỊCH VỤ MỚI","TỔNG BÊN NGOÀI"], bnBody,
      {w:[3.58,1.85,1.85,1.85,1.85,1.85], small:true}),
    NOTE(`TỔNG BÊN NGOÀI — Target ${sT(bn)} · Thực đạt hiện tại ${sV(bn)} · Lũy kế cuối tháng (dự kiến) ${sD(bn)} · Tỷ lệ hoàn thành ${sR1(bn)} · Đánh giá ${sDG(bn)}.`),
    BOXES([{t:"HÀNH ĐỘNG TRỌNG TÂM", items:bnActions(d11,bhmr,scdv,rows)}])]});

  /* ---------- 12 · CÔNG VIỆC TUẦN CỦA TRƯỞNG PHÒNG ---------- */
  const vp=visitPlan(S);
  SL.push({id:"lichtuan", n:12,
    title:`CÔNG VIỆC TUẦN CỦA TRƯỞNG PHÒNG (${dm(vp.days[0])} – ${dm(vp.days[4])})`, sub, blocks:[
    T(["STT","NGÀY","ĐỊA ĐIỂM","KHUNG GIỜ","CÔNG VIỆC","THÀNH PHẦN","KẾT QUẢ CẦN ĐẠT"],
      vp.rows.map(r=>[String(r.stt), r.ngay, r.noi, r.gio, r.viec, r.tp, r.kq]).concat([
        {sum:true,cells:["TỔNG",`${vp.rows.length} ngày`,`${vp.rows.filter(r=>r.ly).length} tỉnh`,
          "8H00 - 17H00",`${vp.rows.filter(r=>r.uu===1).length} chất lượng · ${vp.rows.filter(r=>r.uu===2).length} phát triển ngoài · ${vp.rows.filter(r=>r.uu===3).length} chi phí`,
          "Thu/TN","100% tỉnh chốt cam kết cải thiện"]}]),
      {w:[0.62,1.3,1.72,1.3,4.55,1.15,2.09], wrap:true, tall:true, lalign:true}),
    NOTE(`Ưu tiên: CHẤT LƯỢNG → PHÁT TRIỂN NGOÀI → CHI PHÍ • Tuần kế tiếp: ${dmy(vp.days[0])} – ${dmy(vp.days[4])} • `
      + (vp.rows.filter(r=>r.ly).map(r=>`${r.noi} (${r.ly})`).join(" → ")
         || "Không còn tỉnh chưa đạt trong phạm vi đang xem — lịch tuần dành cho kiểm soát & duy trì."))]});
  /* ---------- 13 · VƯỢT TRỘI ---------- */
  if (typeof VT !== "undefined" && VT) {
    const vms = selMonths(S).filter(m => (VT.meta.thang || []).indexOf(m) >= 0);
    const vkho = Object.values(VT.kho).filter(k => {
      const base = String(k.ma).replace(/_TK$/, "");
      if (S.vung !== "TONG" && vungOf(base) !== S.vung) return false;
      if (S.kho !== "ALL" && base !== S.kho) return false;
      return k.nhom === "kho" ? showKho(S) : showNha(S);
    });
    if (vkho.length) {
      const maSet = {}; vkho.forEach(k => maSet[k.ma] = 1);
      const vng = VT.nguoi.filter(p => maSet[p.kho] && (p.nhom === "kho" ? showKho(S) : showNha(S)));
      const vDat = vng.filter(p => p.vt).length;
      const pc = n => vng.length ? Math.round(n / vng.length * 1000) / 10 + "%" : "0%";
      const vhead = ["KHO / ĐƠN VỊ", "NHÓM", "SỐ NV"].concat(vms.map(m => "T" + m)).concat(["LŨY KẾ", "TỶ LỆ"]);
      const vrows = vkho.map(k => [k.tinh, k.nhom === "kho" ? "Tại kho" : "Tại nhà", String(k.n)]
        .concat(vms.map(m => { const d = k.thang[String(m)]; return d ? d.vt + "/" + d.n : "–"; }))
        .concat([String(k.lk.vt), k.n ? Math.round(k.lk.vt / k.n * 1000) / 10 + "%" : "–"]));
      const sumM = vms.map(m => {
        const a = vkho.reduce((x, k) => x + ((k.thang[String(m)] || {}).vt || 0), 0);
        const b = vkho.reduce((x, k) => x + ((k.thang[String(m)] || {}).n || 0), 0);
        return a + "/" + b; });
      vrows.push({ sum: true, cells: ["TỔNG", "", String(vng.length)].concat(sumM)
        .concat([String(vDat), pc(vDat)]) });
      const nCol = vhead.length;
      const wFix = [2.5, 1.0, 0.8], wLast = [1.0, 0.95];
      const wMon = (12.8 - wFix.reduce((a, b) => a + b, 0) - wLast.reduce((a, b) => a + b, 0)) / Math.max(1, vms.length);
      SL.push({ id: "vuottroi", n: SL.length + 1,
        title: "ĐÁNH GIÁ VƯỢT TRỘI — KẾT QUẢ THEO KHO", sub, blocks: [
        { kind: "five", title: "TỔNG QUAN VƯỢT TRỘI", items: [
          { l: "ĐẠT VƯỢT TRỘI", v: vDat + "/" + vng.length },
          { l: "TỶ LỆ ĐẠT", v: pc(vDat) },
          { l: "BẢO HÀNH TẠI NHÀ", v: String(vng.filter(p => p.nhom === "nha").length) },
          { l: "BẢO HÀNH TẠI KHO", v: String(vng.filter(p => p.nhom === "kho").length) },
          { l: "BẢO LƯU KỲ 6 THÁNG", v: String(vng.filter(p => p.chot6t).length) },
          { l: "SỐ KHO", v: String(vkho.length) }
        ]},
        T(vhead, vrows, { w: wFix.concat(vms.map(() => wMon)).concat(wLast), lalign: true }),
        NOTE("Ô hiển thị SỐ NGƯỜI ĐẠT / SỐ NGƯỜI CÓ DỮ LIỆU trong tháng. "
          + "NV bảo hành tại nhà: đủ 6/6 điểm 3 tiêu chí và nằm trong quota 30% của kho. "
          + "NV bảo hành tại kho: xét TOP 30% thu nhập. "
          + "Người đã đạt Vượt Trội kỳ 6 tháng đầu năm được giữ nguyên danh hiệu.")]});
    }
  }

  return SL;
}

/* ---------------- nội dung tự sinh cho các hộp / dải card ---------------- */
function clActionCards(S,tq7){
  const co=tq7.filter(x=>x.k&&kpiOK(x.k));
  const miss=co.filter(x=>!x.k.dat).sort((a,b)=>a.k.rate-b.k.rate);
  const src=(miss.length?miss:co.slice().sort((a,b)=>a.k.rate-b.k.rate)).slice(0,5);
  return src.map((x,i)=>({n:i+1, t:x.def.name,
    lines:[["HIỆN TRẠNG", x.k.actual!=null?`${x.k.fmt(x.k.actual)} / KPI ${sT(x.k)} · ${sR1(x.k)}`:"chưa có dữ liệu"],
           ["HÀNH ĐỘNG", (typeof HANH_DONG!=="undefined"&&HANH_DONG[x.def.key])||"Bám sát từng tỉnh, họp chấn chỉnh hằng tuần"],
           ["SAU HÀNH ĐỘNG", `Đưa ${x.def.name} về ≥ ${sT(x.k)}`],
           ["ĐO LƯỜNG", "TP vùng / KSCL"]]}));
}
function dtActionCards(bt,bn,tg){
  return [
    {t:"Phát triển doanh thu bên ngoài", k:bn, hd:"Đẩy tư vấn tại siêu thị: gói 1 đổi 1, bảo hành mở rộng và sửa chữa khách lẻ"},
    {t:"Doanh thu bên trong ĐMX",        k:bt, hd:"Bám sát đơn hàng bảo hành tại nhà & tại kho, kiểm soát tỷ lệ hoàn tất"},
    {t:"Tổng doanh thu toàn vùng",       k:tg, hd:"Cân đối trong – ngoài, bù phần hụt bằng nhóm còn dư địa"}
  ].map((x,i)=>({n:i+1, t:x.t,
    lines:[["HIỆN TRẠNG", `${sV(x.k)} / target ${sT(x.k)} · ${sR1(x.k)}`],
           ["HÀNH ĐỘNG", x.hd],
           ["SAU HÀNH ĐỘNG", `Dự kiến cuối tháng ${sD(x.k)} → đạt 100% target`],
           ["ĐO LƯỜNG", "TP vùng"]]}));
}
function nhaBoxes(S,uNha,nhaTong){
  const per=uNha.map(c=>{const ks=calcClNhaTinh(c,S).filter(kpiOK);
    return {c, n:ks.length, d:ks.filter(k=>k.dat).length};}).filter(p=>p.n);
  const full=per.filter(p=>p.d===p.n), part=per.filter(p=>p.d<p.n);
  const miss=nhaTong.filter(k=>kpiOK(k)&&!k.dat);
  const ht=[];
  if(per.length) ht.push(`${full.length}/${per.length} tỉnh đạt đủ tiêu chí → kiểm soát & duy trì kết quả đến cuối tháng`);
  if(part.length) ht.push(`${part.length}/${per.length} tỉnh còn tiêu chí chưa đạt: ${part.slice(0,4).map(p=>tinhOf(p.c)+` (${p.d}/${p.n})`).join(" · ")}`);
  ht.push(miss.length?`Tiêu chí toàn miền chưa đạt: ${miss.map(k=>`${k.name} ${k.fmt(k.actual)} / KPI ${k.fmt(k.target)}`).join(" · ")}`
                    :`Toàn bộ ${nhaTong.filter(kpiOK).length} tiêu chí toàn miền đang ĐẠT so với KPI`);
  const hd=[];
  for(const k of miss.slice(0,3))
    hd.push(`${k.name}: ${(typeof HANH_DONG!=="undefined"&&HANH_DONG[k.key])||"họp chấn chỉnh, bám sát từng nhân viên"} → mục tiêu ≥ ${k.fmt(k.target)}`);
  hd.push("Trưởng nhóm theo sát từng đơn hàng, họp nhân viên hằng tuần");
  hd.push("Không để phát sinh khiếu nại & kiểm soát chặt đánh giá 1, 2, 3 sao");
  return [{t:"ĐÁNH GIÁ & HIỆN TRẠNG",items:ht.slice(0,4)},{t:"HÀNH ĐỘNG",items:hd.slice(0,4)}];
}
function khoBoxes(S,uKho,khoTong){
  const co=khoTong.filter(kpiOK), miss=co.filter(k=>!k.dat);
  const items=[co.length?`${co.length-miss.length}/${co.length} tiêu chí đạt → kiểm soát & duy trì kết quả đến cuối tháng`
                       :"Chưa có dữ liệu tiêu chí bảo hành tại kho trong phạm vi đang xem",
    "Bám sát từng đơn hàng về kho, đảm bảo thời gian xử lý dưới 14 ngày",
    "Bám sát từng đơn hàng xử lý xong hoạt động bình thường, chuyển về siêu thị kinh doanh"];
  for(const k of miss) items.push(`${k.name}: ${k.fmt(k.actual)} / KPI ${k.fmt(k.target)} → cần đưa về ≥ KPI trong tháng`);
  return [{t:"ĐÁNH GIÁ & HÀNH ĐỘNG",items:items.slice(0,6)}];
}
/* 2 cụm hành động của slide GÓI BẢO HÀNH — mỗi tiêu chí (1 ĐỔI 1 · BHMR) 1 hộp,
   tự sinh từ số: hiện trạng toàn miền · tỉnh đang yếu nhất · việc cần làm · mục tiêu. */
const GOI_VIEC={
  doi1:"Chốt lịch giao máy đổi mới ngay khi duyệt, không để tồn quá 14 ngày cam kết",
  bhmr:"Điều phối thợ xử lý bảo hành mở rộng trong 6 ngày cam kết, ưu tiên máy tồn lâu nhất"
};
function goiBoxes(S,uNha,goiTong){
  return CL_GOI.map((tc,i)=>{
    const k=goiTong[i];
    /* xếp hạng tỉnh theo đúng tiêu chí này để nêu đích danh nơi đang yếu */
    const per=uNha.map(c=>({c, k:calcClGoiUnit(c,"nha",S)[i]}))
                  .filter(x=>x.k&&kpiOK(x.k));
    const yeu=per.filter(x=>!x.k.dat).sort((a,b)=>a.k.rate-b.k.rate);
    const items=[
      `HIỆN TRẠNG: ${kpiOK(k)?`${k.fmt(k.actual)} / KPI ${sT(k)} — ${sR1(k)} (${sDG(k)})`:(k&&k.naLabel)||"chưa có dữ liệu"}`,
      yeu.length ? `TỈNH CHƯA ĐẠT (${yeu.length}/${per.length}): ${yeu.slice(0,5).map(x=>`${tinhOf(x.c)} ${pc(x.k.rate)}`).join(" · ")}`
                 : (per.length?`Toàn bộ ${per.length} tỉnh đang ĐẠT — kiểm soát & duy trì đến cuối tháng`
                              :"Chưa có tỉnh nào có số đo cho tiêu chí này"),
      `HÀNH ĐỘNG: ${GOI_VIEC[tc.key]||"Bám sát tiến độ xử lý theo đúng hạn cam kết"}`,
      `MỤC TIÊU: đưa ${tc.name} về ≥ ${sT(k)}${yeu.length?` — ưu tiên ${tinhOf(yeu[0].c)}`:""}`
    ];
    return {t:`HÀNH ĐỘNG — ${tc.name}`, items};
  });
}
/* dải hành động MỎNG (2-3 gạch đầu dòng) cho slide đã kín bảng — slide 7 & 8 */
function slimActions(title,items){
  return {kind:"boxes", slim:true, boxes:[{t:title, items:items.filter(Boolean).slice(0,3)}]};
}
function slBoxItems(S,ex,rows){
  const yeu=rows.filter(r=>kpiOK(r.sl)&&!r.sl.dat).sort((a,b)=>a.sl.rate-b.sl.rate).slice(0,4);
  return [
    `Sản lượng ${sV(ex.sanLuong)} / target ${sT(ex.sanLuong)} — ${sR1(ex.sanLuong)} (${sDG(ex.sanLuong)}) · đơn giá TB ${sV(ex.donGia)} — ${sR1(ex.donGia)}`,
    yeu.length ? `Tỉnh hụt sản lượng: ${yeu.map(r=>`${r.tinh} ${pc(r.sl.rate)}`).join(" · ")} → giao chỉ tiêu ngày, điều phối thợ bù đơn`
               : "Toàn bộ đơn vị đạt sản lượng — giữ nhịp điều phối đến cuối tháng",
    `Giữ đơn giá trung bình không tụt dưới target: kiểm soát tỷ trọng đơn giá thấp, đẩy nhóm đơn giá cao (1 đổi 1 · bảo hành mở rộng)`
  ];
}
function cpBoxItems(S,cpA,rows){
  const vuot=rows.filter(r=>kpiOK(r.cp)&&!r.cp.dat).sort((a,b)=>b.cp.rate-a.cp.rate).slice(0,4);
  return [
    `Chi phí toàn vùng ${sV(cpA)} / định mức ${sT(cpA)} — tỷ lệ kiểm soát ${sR1(cpA)} (${sDG(cpA)})`,
    vuot.length ? `Đơn vị vượt định mức: ${vuot.map(r=>`${r.tinh} ${pc(r.cp.rate)}`).join(" · ")} → rà lại chi phí linh kiện, công tác phí, thuê ngoài`
                : "Toàn bộ đơn vị trong định mức — duy trì kiểm soát đến cuối tháng",
    "Chốt định mức từng đầu việc với trưởng nhóm, duyệt trước các khoản phát sinh ngoài định mức"
  ];
}
function dtBoxes(bt,bn,tg,rows){
  const ht=[`Tổng doanh thu ${sV(tg)} / target ${sT(tg)} — hoàn thành ${sR1(tg)} (${sDG(tg)})`,
    `Bên trong ${sV(bt)} / target ${sT(bt)} — ${sR1(bt)} · Bên ngoài ${sV(bn)} / target ${sT(bn)} — ${sR1(bn)}`];
  const yeu=rows.filter(r=>kpiOK(r.tongDt)&&!r.tongDt.dat).sort((a,b)=>a.tongDt.rate-b.tongDt.rate).slice(0,4);
  ht.push(yeu.length?`Đơn vị cần tăng cường: ${yeu.map(r=>`${r.tinh} (${pc(r.tongDt.rate)})`).join(" · ")}`
                   :"Toàn bộ đơn vị trong phạm vi đang đạt target tổng doanh thu");
  return [{t:"HIỆN TRẠNG",items:ht.slice(0,4)},{t:"HÀNH ĐỘNG",items:[
    "Đẩy mạnh doanh thu bên ngoài: đến siêu thị tư vấn gói 1 đổi 1, bảo hành mở rộng và sửa chữa khách lẻ",
    "Bám sát đơn hàng bảo hành tại nhà & tại kho để giữ nhịp doanh thu bên trong",
    `Bù phần hụt bằng nhóm còn dư địa — dự kiến cuối tháng tổng doanh thu ${sD(tg)}`]}];
}
function bnActions(d11,bhmr,scdv,rows){
  const out=[];
  for(const k of [d11,bhmr,scdv]) if(kpiOK(k)&&!k.dat)
    out.push(`${k.name}: ${sV(k)} / target ${sT(k)} (${sR1(k)}) → tăng tần suất tư vấn tại siêu thị, dự kiến cuối tháng ${sD(k)}`);
  const yeu=rows.filter(r=>kpiOK(r.benNgoai)&&!r.benNgoai.dat).sort((a,b)=>a.benNgoai.rate-b.benNgoai.rate).slice(0,4);
  if(yeu.length) out.push(`Chi nhánh phát triển ngoài yếu: ${yeu.map(r=>`${r.tinh} (${pc(r.benNgoai.rate)})`).join(" · ")}`);
  out.push("Trưởng phòng / Trưởng nhóm đến siêu thị chia sẻ về chất lượng gói bán của Thợ ĐMX & lắng nghe khó khăn để xử lý nhanh");
  return out.slice(0,4);
}

/* --------------------------- RENDER XEM TRƯỚC --------------------------- */
function cellTxt(c){ return (c&&typeof c==="object"&&"t" in c)?c.t:String(c==null?"":c); }
function cellCls(c){ return (c&&typeof c==="object"&&c.c)?c.c:""; }
function cellLv (c){ return (c&&typeof c==="object"&&c.lv!=null)?c.lv:null; }
function blockHTML(b){
  if(b.kind==="cap")  return `<div class="dcap">${esc(b.t)}</div>`;
  if(b.kind==="note") return `<div class="dnote">${esc(b.t)}</div>`;
  if(b.kind==="five") return `<div class="dfive">${b.title?`<div class="dft">${esc(b.title)}</div>`:""}
    <div class="dfr">${b.items.map(x=>`<div class="dfi"><div class="dfl">${esc(x.l)}</div>
      <div class="dfv ${x.c||""}">${esc(x.v)}</div></div>`).join("")}</div></div>`;
  if(b.kind==="cards") return `<div class="dcards">${b.cards.map(x=>`<div class="dcard${x.big?" big":""}">
      <div class="dcl">${esc(x.l)}</div><div class="dcv">${esc(x.v)}</div>
      ${x.sub?`<div class="dcs">${esc(x.sub)}</div>`:""}
      ${x.dg?`<div class="dpill ${dkCls(x.st)}">${esc(x.dg)}</div>`:""}</div>`).join("")}</div>`;
  if(b.kind==="boxes") return `<div class="dboxes${b.slim?" slim":""}">${b.boxes.map(x=>`<div class="dbox">
      <div class="dbt">${esc(x.t)}</div><ul>${x.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}</div>`;
  if(b.kind==="strip") return `<div class="dstrip">${b.cards.map(x=>`<div class="dsc">
      <div class="dsct">${x.n}. ${esc(x.t)}</div>
      ${x.lines.map(l=>`<div class="dscl"><b>${esc(l[0])}</b> ${esc(l[1])}</div>`).join("")}</div>`).join("")}</div>`;
  if(b.kind==="table"){
    const grp = b.group ? `<tr class="grp">${b.group.map(g=>`<th colspan="${g.n}">${esc(g.t)}</th>`).join("")}</tr>` : "";
    const body=b.body.map(r=>{
      const cells=r&&r.sum?r.cells:r;
      return `<tr${r&&r.sum?' class="sum"':""}>${cells.map((c,i)=>{
        const lv=cellLv(c);
        return `<td class="${(i>0&&!b.lalign)?"n ":""}${cellCls(c)}${lv!=null?" lv"+lv:""}">${esc(cellTxt(c))}</td>`;
      }).join("")}</tr>`;
    }).join("");
    const dense=b.body.length>=10?" dense":"";
    return `<div class="dtw" style="flex:${b.body.length+1.6} 1 0"><table class="dtbl${b.small?" sm":""}${b.wrap?" wrap":""}${dense}">
      ${grp?`<thead class="gh">${grp}</thead>`:""}
      <thead><tr>${b.head.map((h,i)=>`<th${(i>0&&!b.lalign)?' class="n"':""}>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody></table></div>`;
  }
  return "";
}
function slideHTML(sl,i,n,S){
  const nk=slideNoteKey(sl.id,S), note=slideNote(sl.id,S);
  const A=(typeof DECK_ASSETS!=="undefined")?DECK_ASSETS:null;
  const bgSty = A&&A.bg ? `background-image:url('${A.bg}')` : "";
  const logos = A ? `<img class="dlogo-l" src="${A.dmx}" alt="Điện máy XANH">
       <img class="dlogo-r" src="${A.tho}" alt="Thợ Điện Máy Xanh">` : "";
  const body = sl.kind==="cover"
    ? `<div class="dcover"><div class="dct">
         <h1><span class="w">${esc(sl.h1a)}</span><br><span class="y">${esc(sl.h1b)}</span></h1>
         <div class="drule"></div>
         <div class="dsub1">${esc(sl.sub1)}</div>
         <div class="dsub2">${esc(sl.sub2)}</div>
         <div class="dchip">${esc(sl.chip)}</div>
         <div class="dfoot2">${esc(sl.foot)}</div></div>
         ${A?`<img class="dtech" src="${A.tech}" alt="Nhân viên kỹ thuật Thợ Điện Máy Xanh">`:""}
       </div>`
    : `<div class="dhead"><span class="dnum">${String(sl.n).padStart(2,"0")}</span>
         <div class="dht"><h2>${esc(LB("ppt.sl."+sl.id,sl.title))}</h2>
         <div class="ssub">${esc(sl.sub)}</div></div></div>
       <div class="dcontent">${sl.blocks.map(blockHTML).join("")}</div>`;
  return `<article class="slide${sl.kind==="cover"?" cover":""}" data-slide="${i}" role="group" aria-label="Slide ${i+1}/${n}" style="${bgSty}">
    ${logos}
    <div class="sbody">${body}
      <div class="dnotewrap">
        <div class="nlab">Nhận xét / kết luận</div>
        <div class="note" contenteditable="true" spellcheck="false"
          data-slidenote="${esc(nk)}" data-ph="${esc(SLIDE_NOTE_PH)}">${esc(note)}</div>
      </div>
    </div>
    <div class="sfoot"><span>Thợ Điện Máy Xanh · BHSC CE · Vùng Trung Bộ – Vùng Duyên Hải</span>
      <span class="r">${i+1} / ${n}</span></div>
  </article>`;
}
function renderM7(){
  const S=ST, SL=slideModel(S), n=SL.length;
  if(ST.slide==null||ST.slide<0||ST.slide>=n) ST.slide=0;
  const i=ST.slide;
  const nNote=SL.filter(s=>slideNote(s.id,S)).length;
  return gopBar(S)+`<div class="deckwrap" id="deck">
    <div class="deckbar">
      <button class="dnav" id="dPrev" ${i===0?"disabled":""} title="Slide trước (phím ←)">${ic("chevl",13)}Trước</button>
      <span class="dpos">Slide ${i+1} / ${n}</span>
      <button class="dnav" id="dNext" ${i===n-1?"disabled":""} title="Slide sau (phím →)">Sau ${ic("chev",13)}</button>
      <div class="dthumbs" role="group" aria-label="Chuyển nhanh tới slide">
        ${SL.map((s,j)=>`<button data-goslide="${j}" aria-current="${j===i}" title="${esc(s.title)}">${j+1}</button>`).join("")}
      </div>
      <div class="grow"></div>
      <span class="deckhelp">${nNote}/${n} slide đã có nhận xét · tự lưu</span>
      <button class="dnav" id="dFull" title="Trình chiếu toàn màn hình (ESC để thoát)">${ic("present",13)}Trình chiếu</button>
      <button class="dnav acc" id="dExport" title="Tải file .pptx (kèm nhận xét đã gõ)">${ic("download",13)}Tải file .pptx</button>
    </div>
    <div class="stage" id="dStage">${slideHTML(SL[i],i,n,S)}</div>
    <div class="fsbar"><span>← → hoặc bấm chuột để chuyển slide · ESC để thoát trình chiếu</span>
      <span style="margin-left:auto" id="fsPos">${i+1} / ${n}</span></div>
    <div class="card"><header><span class="ci">${ic("info",16)}</span>
      <div><h3>${esc(LB("m7.help.h","Cách dùng bộ trình chiếu"))}</h3>
      <span class="sub">Slide dựng sống theo bộ lọc — đổi kỳ / vùng / tỉnh / loại hình là slide đổi theo</span></div></header>
      <div class="body" style="font-size:11.5px;line-height:1.75;color:var(--ink-2)">
        <b>1.</b> Bấm <b>Trước / Sau</b> hoặc số slide để xem trước từng trang.<br>
        <b>2.</b> Bấm vào ô <b>Nhận xét / kết luận</b> ngay trên slide để gõ; chữ tự lưu vào trình duyệt,
           giữ nguyên khi dựng lại màn hình và <b>đi kèm vào file .pptx</b> khi xuất.
           Nhận xét được lưu riêng cho từng kỳ &amp; từng phạm vi lọc.<br>
        <b>3.</b> Bấm <b>Trình chiếu</b> để phóng toàn màn hình họp: dùng <b>←</b> <b>→</b> hoặc bấm chuột để chuyển,
           <b>ESC</b> để thoát.<br>
        <b>4.</b> Bấm <b>Tải file .pptx</b> để xuất ${n} slide ra PowerPoint đúng nhận diện thương hiệu.
      </div></div>
  </div>`;
}
/* ---- điều khiển bộ trình chiếu ---- */
function deckGo(d){
  const n=slideModel(ST).length;
  const cur=ST.slide||0, nx=clamp(typeof d==="number"&&Math.abs(d)>1?d:cur+d,0,n-1);
  if(nx===cur) return;
  ST.slide=nx;
  if(deckIsFull()){ redrawFullSlide(); } else render();
}
function deckSet(i){ const n=slideModel(ST).length; ST.slide=clamp(i,0,n-1);
  if(deckIsFull()) redrawFullSlide(); else render(); }
function deckIsFull(){ const d=$("#deck"); return !!(d&&d.classList.contains("fs")); }
function redrawFullSlide(){
  const S=ST, SL=slideModel(S), n=SL.length, i=ST.slide;
  const st=$("#dStage"); if(st) st.innerHTML=slideHTML(SL[i],i,n,S);
  const p=$("#fsPos"); if(p) p.textContent=`${i+1} / ${n}`;
}
function deckFull(on){
  const d=$("#deck"); if(!d) return;
  if(on){
    d.classList.add("fs");
    if(d.requestFullscreen) d.requestFullscreen().catch(()=>{});
  }else{
    d.classList.remove("fs");
    if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    render();
  }
}
document.addEventListener("fullscreenchange",()=>{
  const d=$("#deck"); if(!d) return;
  if(!document.fullscreenElement&&d.classList.contains("fs")){ d.classList.remove("fs"); render(); }
});
document.addEventListener("click",e=>{
  if(e.target.closest("#dPrev")){ deckGo(-1); return; }
  if(e.target.closest("#dNext")){ deckGo(1);  return; }
  if(e.target.closest("#dFull")){ deckFull(true); return; }
  if(e.target.closest("#dExport")){ exportDeck(); return; }
  const g=e.target.closest("[data-goslide]"); if(g){ deckSet(+g.dataset.goslide); return; }
  /* trong chế độ trình chiếu: bấm vào slide (ngoài ô nhận xét) = sang slide kế */
  if(deckIsFull() && e.target.closest(".slide") && !e.target.closest("[data-slidenote]")){ deckGo(1); }
});
document.addEventListener("keydown",e=>{
  if(ST.tab!==7) return;
  if(e.target&&e.target.isContentEditable) return;
  if(e.key==="ArrowRight"||e.key==="PageDown"){ e.preventDefault(); deckGo(1); }
  else if(e.key==="ArrowLeft"||e.key==="PageUp"){ e.preventDefault(); deckGo(-1); }
  else if(e.key==="Home"){ e.preventDefault(); deckSet(0); }
  else if(e.key==="End"){ e.preventDefault(); deckSet(999); }
  else if(e.key==="Escape"&&deckIsFull()){ e.preventDefault(); deckFull(false); }
  else if((e.key==="f"||e.key==="F")&&!deckIsFull()){ deckFull(true); }
});
/* nhận xét slide — gõ tới đâu lưu tới đó (không cần bấm Lưu) */
document.addEventListener("input",e=>{
  const el=e.target.closest&&e.target.closest("[data-slidenote]"); if(!el) return;
  const key=el.dataset.slidenote, v=el.textContent;
  if(v.trim()==="") delete NOTES[key]; else NOTES[key]={text:v};
  autoSave();
  const h=$(".deckhelp");
  if(h){ const S=ST, SL=slideModel(S);
    h.textContent=`${SL.filter(s=>slideNote(s.id,S)).length}/${SL.length} slide đã có nhận xét · đã lưu`; }
});

