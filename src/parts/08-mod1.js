
/* =============================================================================
   MODULE 1 — SHEET TỔNG QUAN  (màn hình CEO)
   Bố cục khách chốt: 5 THẺ KPI + 1 BẢNG TỔNG HỢP, vừa đúng 1 màn hình, bỏ biểu đồ.
   Các biểu đồ cũ (Cơ cấu chất lượng · Hiệu suất theo vùng · Doanh thu theo nhóm)
   KHÔNG bị xoá dữ liệu — chỉ chuyển về đúng module của chúng (Chất lượng · Tỉnh/Kho
   · Doanh thu). Ba khối bảng chi tiết cũ cũng đã có sẵn ở module tương ứng, riêng
   ô ĐÁNH GIÁ (sửa tay được) chuyển về Chất lượng / Sản lượng / Doanh thu.
   ============================================================================= */
function renderM0(){
  const S=ST, D=M(S);
  if(!D && !isYear(S)) return stateHTML("empty","Kỳ này chưa có dữ liệu",
    `Chưa có dữ liệu cho <b>${esc(kyLabel(S))}</b>. Bấm <b>Nhập Excel</b> để nạp 7 file nguồn,
     hoặc <b>Nạp JSON</b> để mở kho dữ liệu đã lưu.`,"file");
  if(isYear(S)&&!monthsOf(S.nam).length) return stateHTML("empty","Năm này chưa có dữ liệu",
    `Chưa có tháng nào của năm <b>${S.nam}</b> trong kho dữ liệu.`,"calendar");

  const ex=calcExec(S);
  return `<div class="tq1man">${gopBar(S)}${execRow(ex)}${tongHopTable(S)}</div>`;
}

/* --- BẢNG TỔNG HỢP: 5 lĩnh vực × 5 thông tin (đúng hợp đồng dùng chung với deck) --- */
function tongHopTable(S){
  const rows=calcTongQuanRows(S);
  const dgCell=r=>r.keHoach
    ? `<span class="dgc nd">${ic("calendar",12)}${esc(r.dgText)}</span>`
    : `<span class="dgc ${r.status==="none"?"nd":(r.dat?"ok":"no")}">
      ${ic(r.status==="none"?"minus":(r.dat?"check":"alert"),12)}${esc(r.dgText)}</span>`;
  const body=rows.map(r=>`<tr data-gotab="${TQ_TAB[r.key]}" tabindex="0"
      ${tipAttr(r.key==="chatLuong"?tqClTip(r):kpiTip(r.kpi))}>
    <td class="l"><span class="kico"><span class="i">${ic(TQ_ICON[r.key],14)}</span>
      <span><b>${esc(r.label)}</b>${r.ghiChu?`<i class="gc">${esc(r.ghiChu)}</i>`:""}</span></span></td>
    <td class="num">${esc(r.tText)}</td>
    <td class="num"><b>${esc(r.aText)}</b></td>
    <td class="num">${esc(r.dText)}</td>
    <td><span class="num rht"><b>${esc(r.rText)}</b>${
      r.coTienDo?`<i class="rnow">đến hiện tại ${esc(r.rNowText)}</i>`:""}</span></td>
    <td>${dgCell(r)}</td></tr>`).join("");
  const cham=rows.filter(r=>!r.keHoach);          // chỉ các lĩnh vực THỰC SỰ được chấm
  const nDat=cham.filter(r=>r.dat).length, nCo=cham.filter(r=>r.status!=="none").length;
  const nKH=rows.filter(r=>r.keHoach).length;
  const tHead=nKH?"(cả kỳ)":"(cả tháng)";
  return `<div class="card tqsum"><header><span class="ci">${ic("table",16)}</span>
      <div><h3>${lblH("tq.table.title","BẢNG TỔNG HỢP 5 LĨNH VỰC")}</h3>
        <span class="sub">${esc(scopeLbl(S))} · ${esc(kyLabel(S))} · ${nDat}/${nCo} lĩnh vực ĐẠT${
          nKH?` · ${nKH} lĩnh vực đang theo kế hoạch`:""}</span></div>
      <div class="hr">${infoI(`Đủ 5 thông tin: <b>TARGET (cả tháng) · THỰC ĐẠT HIỆN TẠI · LŨY KẾ CUỐI THÁNG (dự kiến)
        · TỶ LỆ DỰ KIẾN ĐẠT · ĐÁNH GIÁ</b>. Tỷ lệ dự kiến đạt lấy <b>dự kiến cả tháng ÷ target cả tháng</b>;
        dòng chữ nhỏ bên dưới là <b>kết quả đến hiện tại</b> so với target cả tháng. Bảng này và slide TỔNG QUAN của bản trình chiếu
        dùng <b>chung một hàm tính</b> nên không bao giờ lệch nhau. Bấm vào dòng để mở module chi tiết.
        Chất lượng chấm đúng ${CL_TQ7_N} tiêu chí Tổng quan
        (5 tại nhà: ${CL_TQ7.filter(x=>x.loai==="nha").map(x=>esc(x.name)).join(" · ")};
        2 tại kho: ${CL_TQ7.filter(x=>x.loai==="kho").map(x=>esc(x.name)).join(" · ")});
        các tiêu chí phụ xem ở sheet CHẤT LƯỢNG.`)}</div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt tqtbl">
      <thead><tr><th class="l">LĨNH VỰC</th><th>TARGET<br><span class="th2">${tHead}</span></th>
        <th>THỰC ĐẠT HIỆN TẠI</th>
        <th>LŨY KẾ CUỐI THÁNG<br><span class="th2">(dự kiến)</span></th>
        <th>TỶ LỆ DỰ KIẾN ĐẠT</th><th>ĐÁNH GIÁ</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    </div></div>`;
}
const TQ_TAB ={chatLuong:1, sanLuong:2, donGia:2, chiPhi:3, doanhThu:4};
const TQ_ICON={chatLuong:"shield", sanLuong:"pkg", donGia:"coins", chiPhi:"calculator", doanhThu:"trendup"};
function tqClTip(r){
  const q=r.kpi;
  return `<div class="tt">${ic("shield",12)}CHẤT LƯỢNG — ${CL_TQ7_N} TIÊU CHÍ TỔNG QUAN</div>
    <div style="color:#C6D6EC">5 tiêu chí bảo hành tại nhà + 2 tiêu chí bảo hành tại kho.</div>
    <dl><dt>Đạt</dt><dd>${q.dat}/${q.coDl} tiêu chí có dữ liệu</dd>
    <dt>Tổng tiêu chí</dt><dd>${CL_TQ7_N}</dd>
    <dt>Tỷ lệ</dt><dd>${pc1(q.rate)}</dd></dl>
    <div class="note">Tiêu chí phụ (Phục vụ 5 sao tại kho · Trả NCC + chuyển ĐSD · Hàng hủy · Gói bảo hành)
      không tính ở Tổng quan — xem tại sheet CHẤT LƯỢNG.</div>`;
}

/* --- 5 thẻ KPI điều hành --- */
function execRow(ex){
  const q=ex.chatLuong;
  const cards=[];
  /* 1. CHẤT LƯỢNG */
  cards.push(execCard({
    key:"chatLuong", label:"CHẤT LƯỢNG", icon:"shield", status:q.status,
    value: q.coDl ? `${q.dat}<small>/${q.coDl}</small>` : `<span class="dash">–</span>`, valueLbl:"tiêu chí đạt",
    under:(q.coDl?`tiêu chí <b>có dữ liệu</b> đã đạt`:`<b>chưa có dữ liệu</b> cho kỳ này`)+(q.tong>q.coDl
      ?` <span class="badge none" style="font-size:9px">${ic("minus",9)}${q.tong-q.coDl} chưa có dữ liệu</span>`
      :` <span class="badge good" style="font-size:9px">${ic("check",9)}đủ ${q.tong}/${q.tong}</span>`),
    rate:q.rate, tab:1,
    tip:`<div class="tt">${ic("shield",12)}CHẤT LƯỢNG — ${CL_TQ7_N} TIÊU CHÍ TỔNG QUAN</div>
      <div style="color:#C6D6EC">Đúng ${CL_TQ7_N} tiêu chí Tổng quan:
        ${CL_TQ7.filter(x=>x.loai==="nha").length} tại nhà + ${CL_TQ7.filter(x=>x.loai==="kho").length} tại kho.</div>
      <dl><dt>Đạt</dt><dd>${q.dat}/${q.coDl} tiêu chí có dữ liệu</dd>
      <dt>Tổng tiêu chí</dt><dd>${q.tong}</dd>
      <dt>Tỷ lệ</dt><dd>${pc1(q.rate)}</dd></dl>
      <div class="note">Tiêu chí phụ (Phục vụ 5 sao tại kho · Trả NCC + chuyển ĐSD · Hàng hủy ·
        Gói bảo hành) xem ở sheet CHẤT LƯỢNG — bật ô “Hiện thêm tiêu chí phụ”.</div>`
  }));
  /* 2..5 — kỳ bám kế hoạch (vd T8-12) thì nhóm CỘNG DỒN không chấm ĐẠT/KHÔNG ĐẠT */
  const kh=kyKeHoach(ST), nCo=selMonths(ST).length-kyThieu(ST).length, nKy=selMonths(ST).length;
  const khTxt=kh?`ĐANG THEO KẾ HOẠCH (${nCo}/${nKy} tháng)`:null;
  cards.push(execKpiCard("SẢN LƯỢNG",ex.sanLuong,"pkg",2,null,khTxt));
  cards.push(execKpiCard("ĐƠN GIÁ TB",ex.donGia,"coins",2));
  cards.push(execKpiCard("CHI PHÍ",ex.chiPhi,"calculator",3,"% kiểm soát",khTxt));
  cards.push(execKpiCard("DOANH THU",ex.doanhThu,"trendup",4,null,khTxt));
  return `<div class="execrow">${cards.join("")}</div>`;
}
function execCard(o){
  return `<article class="exec st-${o.status}" data-gotab="${o.tab}" ${tipAttr(o.tip)} tabindex="0">
    <div class="eh"><span class="eico">${ic(o.icon,17)}</span><span class="elbl">${esc(o.label)}</span></div>
    <div class="eval" data-count="${o.count==null?"":o.count}">${o.value}</div>
    <div class="eunder">${o.under||""}</div>
    <div class="emeter"><i data-w="${o.rate==null?0:clamp(o.rate*100,2,100)}"></i></div>
    <div class="efoot">${badgeOf(o.status,o.statusText||(o.status==="none"?"CHƯA CÓ DỮ LIỆU":
      o.status==="good"?"ĐẠT":"KHÔNG ĐẠT"))}
      <span style="font-size:10.5px;color:var(--muted);font-weight:700">${o.rate==null?"–":pc1(o.rate)}</span></div>
  </article>`;
}
function execKpiCard(label,k,icon,tab,rateLbl,khTxt){
  const v = k.actual==null ? `<span class="dash">–</span>` : k.fmt(k.actual);
  const under = k.target==null
    ? `<b style="color:var(--warn-tx)">Target: chưa cấu hình</b>`
    : `Target ${khTxt?"cả kỳ":"cả tháng"}: <b>${k.fmt(k.target)}</b>`;
  let extra="";
  if(k.meta&&k.meta.trend!=null) extra=` <span class="badge ${k.meta.trend>=0?"good":"bad"}" style="font-size:9px"
    title="${esc(k.meta.trendNote||"so tháng liền trước")}">
    ${ic("trendup",9)}${k.meta.trend>=0?"+":""}${pc1(k.meta.trend)} so tháng trước</span>`;
  if(k.tmp) extra+=` <span class="badge acc" style="font-size:9px">tạm thời</span>`;
  return `<article class="exec st-${khTxt?"none":k.status}" data-gotab="${tab}" ${tipAttr(kpiTip(k))} tabindex="0">
    <div class="eh"><span class="eico">${ic(icon,17)}</span><span class="elbl">${esc(label)}</span></div>
    <div class="eval">${v}${k.unit?`<small> ${esc(k.unit)}</small>`:""}</div>
    <div class="eunder">${under}${extra}</div>
    <div class="emeter"><i data-w="${k.rate==null?0:clamp(k.rate*100,2,100)}"></i></div>
    <div class="efoot">${khTxt?badgeOf("none",khTxt):badge(k)}
      <span style="font-size:10.5px;color:var(--muted);font-weight:700">${rateLbl?esc(rateLbl)+" ":""}${k.rate==null?"–":pc1(k.rate)}${
        k.coTienDo?`<i style="font-style:normal;font-weight:700;opacity:.8"> · đến hiện tại ${pc1(k.rateNow)}</i>`:""}</span></div>
  </article>`;
}

/* --- Biểu đồ ĐÃ CHUYỂN KHỎI TỔNG QUAN (khách yêu cầu gọn) ---------------------
   · "Cơ cấu chất lượng"      -> module CHẤT LƯỢNG   (chartCoCauCL, dưới đây)
   · "Hiệu suất theo vùng"    -> module TỈNH/KHO     (chartHieuSuatVung, 06-mod3-6.js)
   · "Doanh thu theo nhóm"    -> module DOANH THU    (chartDoanhThuNhom, 06-mod3-6.js)
   · "Tổng quan hiệu suất"    -> thay bằng BẢNG TỔNG HỢP 5 lĩnh vực ở Tổng quan
   Không xoá dữ liệu, chỉ đổi chỗ hiển thị.                                        */
function chartCoCauCL(S,q){
  const dat =q.all.filter(k=>kpiOK(k)&&k.dat).length;
  const chua=q.all.filter(k=>kpiOK(k)&&!k.dat).length;
  const nod =q.all.filter(k=>!kpiOK(k)).length;
  return chartCard({
    lk:"chart.quality", title:"Cơ cấu chất lượng — đạt / không đạt / chưa có số đo",
    sub:`${q.dat}/${q.tong} tiêu chí · ${scopeLbl(S)}`, icon:"shield",
    legend:legend([{label:"Đạt",color:CH.st.good},{label:"Không đạt",color:CH.st.bad},{label:"Chưa có số đo",color:CH.st.none}]),
    svg:chStack([{label:"Đạt",value:dat,color:CH.st.good},{label:"Không đạt",value:chua,color:CH.st.bad},
                 {label:"Chưa có số đo",value:nod,color:CH.st.none}].filter(s2=>s2.value>0),
                {aria:"Cơ cấu tiêu chí chất lượng"})
      + `<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:6px">
          ${q.all.map(k=>`<span class="badge ${k.status}" ${tipAttr(kpiTip(k))} tabindex="0">
            ${ic(k.icon,11)}${esc(k.name)} ${k.actual==null?esc(k.naLabel||"–"):k.fmt(k.actual)}</span>`).join("")}</div>`,
    table:chTable(["Tiêu chí","Target","Thực đạt","Tỷ lệ","Đánh giá"],
      q.all.map(k=>[kpiName(k), k.target==null?"–":k.fmt(k.target), k.actual==null?"–":k.fmt(k.actual),
        k.rate==null?"–":pc1(k.rate), badge(k)])),
    note:`Đang chấm <b>${q.tong} tiêu chí</b> theo lựa chọn hiển thị ở trên. Riêng sheet TỔNG QUAN
      chỉ chấm <b>${CL_TQ7_N} tiêu chí</b> (5 tại nhà + 2 tại kho). Tiêu chí chưa có dữ liệu nguồn
      KHÔNG bị tính là chưa đạt.`
  });
}

/* =============================================================================
   MODULE 2 — CHẤT LƯỢNG (QUALITY MANAGEMENT)
   ============================================================================= */
/* các tiêu chí PHỤ = mọi tiêu chí KHÔNG nằm trong CL_TQ7 (+ toàn bộ khối Gói bảo hành) */
const CL_PHU_KHO = CL_KHO.filter(d=>!CL_TQ7_HAS("kho",d.key));
const CL_PHU_N   = CL_PHU_KHO.length + CL_GOI.length;
function clPhuToggle(){
  const on=clPhuOn();
  return `<div class="phutoggle">
    <label class="chk"><input type="checkbox" id="clPhuChk" ${on?"checked":""}>
      <span>Hiện thêm tiêu chí phụ</span></label>
    <span class="pt-note">${on
      ? `Đang hiện <b>đủ ${CL_NHA.length+CL_KHO.length+CL_GOI.length} tiêu chí</b> của biểu mẫu.`
      : `Đang hiện <b>${CL_TQ7_N} tiêu chí</b> như sheet TỔNG QUAN — còn <b>${CL_PHU_N} tiêu chí phụ</b> đang ẩn.`}
      Tiêu chí phụ: ${CL_PHU_KHO.map(d=>esc(d.name)).join(" · ")} · ${CL_GOI.length} tiêu chí GÓI BẢO HÀNH.
      Lựa chọn này được <b>ghi nhớ</b> cho lần mở sau.</span></div>`;
}
function renderM1(){
  const S=ST, phu=clPhuOn();
  /* Mặc định sheet CHẤT LƯỢNG chấm đúng 7 tiêu chí như TỔNG QUAN; bật ô tick thì bung đủ. */
  const q = phu ? calcChatLuongTong(S) : calcChatLuongTQ7(S);
  const pickKho = list => phu ? list : list.filter(k=>CL_TQ7_HAS("kho",k.key));
  const khoDefs = phu ? CL_KHO : CL_KHO.filter(d=>CL_TQ7_HAS("kho",d.key));
  const nhaRows = showNha(S) ? unitsNha(S).map(c=>({code:c, kpis:calcClNhaTinh(c,S)})) : [];
  const khoRows = showKho(S) ? unitsKho(S).map(c=>({code:c, kpis:pickKho(calcClKhoUnit(c,S))})) : [];
  const goiRows = phu ? clGoiRows(S) : [];
  const nhaTot=calcClNha(S), khoTot=pickKho(calcClKho(S)), goiTot=(phu&&showNha(S))?calcClGoi(S):[];
  const cnt=list=>{const co=list.filter(kpiOK); return {dat:co.filter(k=>k.dat).length,co:co.length,tot:list.length}};
  const cN=cnt(nhaTot), cK=cnt(khoTot), cG=cnt(goiTot);

  const banner=bannerHTML("TỔNG QUAN","shield",[
    bItem("Bảo hành tại nhà","home",cN.co?`${cN.dat}/${cN.co}`:`<span class="dash">–</span>`,cN.co?"tiêu chí":"",
      `Đang chấm ${cN.tot} tiêu chí · ${cN.tot-cN.co} chưa có dữ liệu`,true),
    bItem("Bảo hành tại kho","warehouse",cK.co?`${cK.dat}/${cK.co}`:`<span class="dash">–</span>`,cK.co?"tiêu chí":"",
      `Đang chấm ${cK.tot} tiêu chí · ${cK.tot-cK.co} chưa có dữ liệu`,true),
    ...(phu?[bItem("Gói bảo hành","pkg", cG.co?`${cG.dat}/${cG.co}`:`<span class="dash">–</span>`,cG.co?"tiêu chí":"",
      cG.co?`${cG.tot} tiêu chí · chỉ 12 tỉnh tại nhà`
           :`${cG.tot} tiêu chí · chưa có dữ liệu kỳ này (chỉ 12 tỉnh tại nhà)`,true)]:[]),
    bItem("Tổng cộng","shield",q.coDl?`${q.dat}/${q.coDl}`:`<span class="dash">–</span>`,q.coDl?"tiêu chí":"",
      q.coDl?`Đạt ${pc1(q.rate)} · đang chấm ${q.tong} tiêu chí`:`Cả ${q.tong} tiêu chí đều chưa có dữ liệu ở kỳ này`),
    bItem("Phạm vi","map",esc(scopeLbl(S)),"",esc(kyLabel(S)))
  ]);

  const secNha = !nhaRows.length ? "" : qualitySection({
    title:"1/ BẢO HÀNH TẠI NHÀ", icon:"home", defs:CL_NHA, tot:nhaTot, rows:nhaRows, loai:"nha", S
  });
  const secKho = !khoRows.length ? "" : qualitySection({
    title:"2/ BẢO HÀNH TẠI KHO", icon:"warehouse", defs:khoDefs, tot:khoTot, rows:khoRows, loai:"kho", S,
    note: phu ? "" : `Đang hiện <b>${khoDefs.length} tiêu chí</b> dùng cho Tổng quan.
      Bật <b>“Hiện thêm tiêu chí phụ”</b> ở trên để xem thêm: ${CL_PHU_KHO.map(d=>esc(d.name)).join(" · ")}.`
  });
  /* 3/ CHẤT LƯỢNG GÓI BẢO HÀNH — thuộc nhóm TIÊU CHÍ PHỤ, ẩn mặc định.
     2 kho vẫn hiện dòng nhưng ở trạng thái "không áp dụng" (khác "chưa có dữ liệu"). */
  const secGoi = !goiRows.length ? "" : qualitySection({
    title:"3/ CHẤT LƯỢNG GÓI BẢO HÀNH", icon:"pkg", defs:CL_GOI,
    tot: goiTot.length?goiTot:calcClGoiNA(), rows:goiRows, loai:"goi", S,
    note:`Tỷ lệ hồ sơ gói bảo hành xử lý <b>ĐÚNG HẠN CAM KẾT</b> (1 đổi 1: 14 ngày · BHMR: 6 ngày), target 100%.
      Chỉ áp dụng cho <b>12 tỉnh bảo hành tại nhà</b>; kho Đà Nẵng và Khánh Hòa hiển thị “không áp dụng”.
      Nguồn hiện có thực đạt từ tháng 6/2026 — các tháng chưa đo hiển thị “chưa có dữ liệu”, không quy về 0.
      Khối này thuộc nhóm <b>tiêu chí phụ</b> nên mặc định ẩn khỏi Tổng quan.`
  });
  const cT=trendCard("chatLuong",S,{title:LB("chart.trend.m1","Xu hướng chất lượng theo tháng"),icon:"shield"});
  return gopBar(S) + banner + clPhuToggle()
    + `<div class="chartgrid" style="grid-template-columns:1.15fr 1fr">${cT}${chartCoCauCL(S,q)}</div>`
    + secNha + secKho + secGoi + evalBox("chatLuong",S);
}
function qualitySection(o){
  const {title,icon,defs,tot,rows,loai,S,note}=o;
  const sorted = ST.sort==="default" ? rows : sortQualityRows(rows,ST.sort);
  const head=`<thead>
    <tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
        <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
        <th rowspan="2" style="vertical-align:bottom">ĐÁNH GIÁ CHUNG</th>
        ${defs.map((d,i)=>`<th class="g" colspan="3">${ic(d.icon,12)} ${esc(d.name)}</th>`).join("")}</tr>
    <tr>${defs.map(()=>`<th class="sep">KPI</th><th>THỰC ĐẠT</th><th>ĐÁNH GIÁ</th>`).join("")}</tr></thead>`;
  /* MỌI ô KPI và THỰC ĐẠT của từng tỉnh/kho đều gõ đè được (xem valCell) */
  const cells=(kpis,code)=>defs.map((d,i)=>{
    const k=kpis[i];
    return `<td class="sep">${valCell(k,"target")}</td>
      <td>${valCell(k,"actual")}
        <button class="minibtn" data-drillkpi="${loai}:${d.key}" title="Xem tỉnh/kho nào chưa đạt tiêu chí này"
          style="padding:1px 5px;font-size:9px;margin-left:3px">chi tiết</button></td>
      <td>${badge(k)}</td>`;
  }).join("");
  const chungOf=kpis=>{const co=kpis.filter(kpiOK);
    if(!co.length) return `<span class="badge none">${ic("minus",11)}–</span>`;
    const d=co.filter(k=>k.dat).length;
    return `<span class="badge ${d===co.length?"good":d>=co.length-1?"warn":"bad"}">${ic(d===co.length?"check":"alert",11)}${d}/${co.length} ĐẠT</span>`;};
  const totRow=`<tr class="tot"><td class="l stick">${esc(ST.vung==="TONG"?"2 vùng":ST.vung)}</td>
    <td class="l stick2">TỔNG:</td><td>${chungOf(tot)}</td>${cells(tot,"TONG")}</tr>`;
  const body=sorted.map(r=>`<tr${r.loai==="kho"&&loai==="goi"?' class="na"':""}>
    <td class="l stick">${esc((r.vung||vungOf(r.code)).replace("Vùng ","V. "))}</td>
    <td class="l stick2"><b>${esc(tinhOf(r.code))}${r.loai==="kho"&&loai==="goi"?" (tại kho)":""}</b> <span style="color:var(--muted);font-size:10px">${esc(r.code)}</span></td>
    <td>${chungOf(r.kpis)}</td>${cells(r.kpis,r.code)}</tr>`).join("");
  return `<div class="card"><header><span class="ci">${ic(icon,16)}</span>
      <div><h3>${esc(title)}</h3><span class="sub">${defs.length} tiêu chí × ${rows.length} đơn vị · bấm ô THỰC ĐẠT để xem chi tiết</span></div>
      <div class="hr">${infoI("Dòng <b>TỔNG:</b> là số gộp có trọng số theo số đơn của toàn phạm vi, không phải trung bình cộng các tỉnh.")}</div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt">${head}<tbody>${totRow}${body}</tbody></table></div>
      ${note?`<div class="cap">${note}</div>`:""}</div></div>`;
}
function sortQualityRows(rows,mode){
  const sc=r=>{const co=r.kpis.filter(kpiOK); return co.length?co.reduce((s,k)=>s+clamp(k.rate,0,2),0)/co.length:-1};
  const r=rows.slice();
  if(mode==="kpi_asc") r.sort((a,b)=>sc(a)-sc(b));
  else if(mode==="kpi_desc") r.sort((a,b)=>sc(b)-sc(a));
  return r;
}
/* drill-down: tiêu chí X — tỉnh/kho nào chưa đạt và thiếu bao nhiêu */
function drillKpi(spec){
  const [loai,key]=spec.split(":");
  const defs = loai==="kho"?CL_KHO:(loai==="goi"?CL_GOI:CL_NHA);
  const d=defs.find(x=>x.key===key); if(!d) return;
  const codes = loai==="kho"?unitsKho(ST):unitsNha(ST);
  const rows=codes.map(c=>{
    const src = loai==="kho"?calcClKhoUnit(c,ST):(loai==="goi"?calcClGoiUnit(c,"nha",ST):calcClNhaTinh(c,ST));
    return {code:c,k:src.find(x=>x.key===key)};
  });
  const miss=rows.filter(r=>kpiOK(r.k)&&!r.k.dat);
  const ok  =rows.filter(r=>kpiOK(r.k)&&r.k.dat);
  const nod =rows.filter(r=>!kpiOK(r.k));
  const tbl=list=>list.length?`<div class="tblwrap"><table class="dt">
    <thead><tr><th class="l">Tỉnh / Kho</th><th class="l">Vùng</th><th>KPI</th><th>Thực đạt</th><th>Chênh lệch</th><th>Tỷ lệ</th><th>Đánh giá</th></tr></thead>
    <tbody>${list.map(r=>`<tr><td class="l"><b>${esc(tinhOf(r.code))}</b> <span style="color:var(--muted);font-size:10px">${esc(r.code)}</span></td>
      <td class="l">${esc(vungOf(r.code))}</td>
      <td>${r.k.target==null?"–":r.k.fmt(r.k.target)}</td>
      <td><b>${r.k.actual==null?"–":r.k.fmt(r.k.actual)}</b></td>
      <td>${(r.k.actual==null||r.k.target==null)?"–":
        `<span style="color:${r.k.actual-r.k.target<0?"var(--bad-tx)":"var(--good-tx)"};font-weight:800">
          ${r.k.actual-r.k.target>=0?"+":""}${r.k.fmt(r.k.actual-r.k.target)}</span>`}</td>
      <td>${r.k.rate==null?"–":pc1(r.k.rate)}</td><td>${badge(r.k)}</td></tr>`).join("")}
    </tbody></table></div>`:`<p style="color:var(--muted);font-size:11.5px;padding:6px 0">Không có đơn vị nào.</p>`;
  openModal(`${d.name} — chi tiết theo ${loai==="kho"?"kho":"tỉnh"}${loai==="goi"?" (gói bảo hành)":""}`,d.icon,
    `<p style="font-size:11.5px;color:var(--muted);margin-bottom:12px">${esc(d.desc||"")} · Kỳ ${esc(kyLabel(ST))}</p>
     <h4 style="font-size:12px;font-weight:800;color:var(--bad-tx);margin:4px 0 6px">KHÔNG ĐẠT (${miss.length})</h4>${tbl(miss)}
     <h4 style="font-size:12px;font-weight:800;color:var(--good-tx);margin:14px 0 6px">ĐẠT (${ok.length})</h4>${tbl(ok)}
     ${nod.length?`<h4 style="font-size:12px;font-weight:800;color:var(--muted);margin:14px 0 6px">CHƯA CÓ DỮ LIỆU (${nod.length})</h4>
       <p style="font-size:11.5px;color:var(--muted)">${nod.map(r=>esc(tinhOf(r.code))).join(", ")} — không đánh giá đạt/chưa đạt.</p>`:""}`);
}

/* =============================================================================
   MODULE 3 — SẢN LƯỢNG & ĐƠN GIÁ TB
   ============================================================================= */
function renderM2(){
  const S=ST;
  const slN=calcSanLuongTong("nha",S), slK=calcSanLuongTong("kho",S);
  const dgN=calcDonGia("nha",S), dgK=calcDonGia("kho",S);
  const ex=calcExec(S);
  const banner=bannerHTML("TỔNG QUAN","pkg",[
    bKpi("ĐƠN HÀNG",ex.sanLuong,"pkg",true),
    bKpi("ĐƠN GIÁ TRUNG BÌNH",ex.donGia,"coins",true),
    bItem("Phạm vi","map",esc(scopeLbl(S)),"",esc(kyLabel(S)))
  ]);
  const sect=(title,icon,loai)=>{
    const codes = loai==="kho"?unitsKho(S):unitsNha(S);
    if(!codes.length) return "";
    const totSl = loai==="kho"?slK:slN, totDg = loai==="kho"?dgK:dgN;
    const row=(code)=>{
      const sl=calcSanLuongUnit(code,loai,S), dg=calcDonGiaUnit(code,loai,S);
      return `<tr><td class="l stick">${esc(vungOf(code).replace("Vùng ","V. "))}</td>
        <td class="l stick2"><b>${esc(tinhOf(code))}</b> <span style="color:var(--muted);font-size:10px">${esc(code)}</span></td>
        <td class="sep">${valCell(sl,"target")}</td>
        <td>${valCell(sl,"actual")}</td>
        <td>${rateCell(sl)}</td><td>${badge(sl)}</td>
        <td class="sep">${valCell(dg,"target")}</td>
        <td>${valCell(dg,"actual")}</td>
        <td>${rateCell(dg)}</td><td>${badge(dg)}</td></tr>`;
    };
    return `<div class="card"><header><span class="ci">${ic(icon,16)}</span>
        <div><h3>${esc(title)}</h3><span class="sub">${codes.length} đơn vị</span></div></header>
      <div class="body tight"><div class="tblwrap"><table class="dt">
        <thead><tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
          <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
          <th class="g" colspan="4">${ic("pkg",12)} ĐƠN HÀNG</th>
          <th class="g" colspan="4">${ic("coins",12)} ĐƠN GIÁ TRUNG BÌNH</th></tr>
        <tr><th class="sep">KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th>
            <th class="sep">KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th></tr></thead>
        <tbody>
          <tr class="tot"><td class="l stick">${esc(S.vung==="TONG"?"2 vùng":S.vung)}</td><td class="l stick2">TỔNG:</td>
            <td class="sep">${valCell(totSl,"target")}</td>
            <td>${valCell(totSl,"actual")}</td>
            <td>${rateCell(totSl)}</td><td>${badge(totSl)}</td>
            <td class="sep">${valCell(totDg,"target")}</td>
            <td>${valCell(totDg,"actual")}</td>
            <td>${rateCell(totDg)}</td><td>${badge(totDg)}</td></tr>
          ${codes.map(row).join("")}
        </tbody></table></div>
        <div class="cap">${hasTinh(S)
          ? `Sản lượng &amp; đơn giá theo ${loai==="nha"?"tỉnh":"kho"} là <b>số thật</b> từ file dữ liệu T1-T12/2026 (target + thực đạt theo từng đơn vị). Nguồn không chia theo tuần.`
          : (loai==="nha"
            ? `<b>Vì sao cột THỰC ĐẠT của 12 tỉnh là “–”:</b> kỳ này chưa có số lượng đơn hàng theo tỉnh trong nguồn.`
            : `Sản lượng bảo hành tại kho lấy từ số jobcard hoàn tất của từng kho. Nguồn chỉ có số lũy kế tháng, chưa tách theo tuần.`)}</div>
      </div></div>`;
  };
  /* biểu đồ so sánh — mỗi đơn vị xuất hiện đúng 1 lần theo từng loại hình */
  const allUnits=[...(showKho(S)?unitsKho(S).map(c=>[c,"kho"]):[]),
                  ...(showNha(S)?unitsNha(S).map(c=>[c,"nha"]):[])];
  const rowsCh=allUnits.map(([c,loai])=>{
    const k=calcSanLuongUnit(c,loai,S);
    return {code:c,loai,k,label:`${tinhOf(c)} · ${loai==="kho"?"BH tại kho":"BH tại nhà"}`};
  });
  const withData=rowsCh.filter(r=>r.k.actual!=null||r.k.target!=null);
  const chart=chartCard({
    lk:"chart.sltarget", title:"Sản lượng — Target so với Thực đạt", icon:"pkg",
    sub:`${scopeLbl(S)} · ${kyLabel(S)} · ${withData.length}/${rowsCh.length} đơn vị có số`,
    legend:legend([{label:"Thực đạt",color:CH.st.good},{label:"Mốc target",color:CH.navy,type:"tick"}]),
    svg: withData.length
      ? chBullet(withData.map(r=>({label:r.label,actual:r.k.actual,target:r.k.target,rate:r.k.rate,status:r.k.status})),
          {fmt:v=>v==null?"–":f0(v),axisFmt:f0,padL:210,aria:"Sản lượng theo đơn vị"})
        + `<div class="cap" style="padding:8px 0 0">Không hiển thị trên biểu đồ: ${
            rowsCh.length-withData.length} đơn vị chưa có cả target lẫn thực đạt (xem bảng bên dưới).</div>`
      : stateHTML("empty","Chưa có số liệu sản lượng để vẽ",
          "Chưa cấu hình target và nguồn chưa có sản lượng cho phạm vi đang lọc.","pkg"),
    table:chTable(["Đơn vị","Loại hình","Target","Thực đạt","Tỷ lệ","Đánh giá"],
      rowsCh.map(r=>[`${esc(tinhOf(r.code))} <span style="color:var(--muted)">${esc(r.code)}</span>`,
          r.loai==="kho"?"BH tại kho":"BH tại nhà",
          r.k.target==null?"chưa cấu hình":f0(r.k.target), r.k.actual==null?"chưa có dữ liệu":f0(r.k.actual),
          r.k.rate==null?"–":pc1(r.k.rate), badge(r.k)])),
    note:"Target &amp; thực đạt sản lượng lấy từ file dữ liệu tháng (T1-T12/2026); bảng Cấu hình chỉ dùng để <b>ghi đè</b> khi cần. Thanh trống nghĩa là chưa có dữ liệu, không phải bằng 0."
  });
  const cT1=trendCard("sanLuong",S,{title:LB("chart.trend.m2a","Xu hướng sản lượng theo tháng"),icon:"pkg"});
  const cT2=trendCard("donGia",S,{title:LB("chart.trend.m2b","Xu hướng đơn giá trung bình theo tháng"),icon:"coins"});
  return gopBar(S) + banner + chart
    + `<div class="chartgrid" style="grid-template-columns:1fr 1fr">${cT1}${cT2}</div>`
    + sect("1/ BẢO HÀNH TẠI NHÀ","home","nha") + sect("2/ BẢO HÀNH TẠI KHO","warehouse","kho")
    + evalBox("sanLuong",S);
}

