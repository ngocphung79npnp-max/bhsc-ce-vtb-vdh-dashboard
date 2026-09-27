
/* =============================================================================
   BIỂU ĐỒ CHUYỂN VỀ TỪ SHEET TỔNG QUAN (khách yêu cầu Tổng quan gọn lại)
   ============================================================================= */
/* "Doanh thu theo nhóm" — trước ở Tổng quan, nay thuộc module DOANH THU */
function chartDoanhThuNhom(S){
  /* 5 nhóm mới gộp 1 cột "DỊCH VỤ MỚI" cho biểu đồ khỏi vụn (chi tiết ở bảng 8 nhóm) */
  const cats=["Bảo hành tại nhà","Bảo hành tại kho","Bán gói năm 2025","BH 1 đổi 1","BHMR","SCDV"]
    .map(c=>calcDoanhThuCat(c,S)).concat([calcNgoaiMoi(S)]);
  return chartCard({
    lk:"chart.dtnhom", title:"Doanh thu theo nhóm", sub:`7 nhóm doanh thu · ${scopeLbl(S)} · ${kyLabel(S)}`, icon:"banknote",
    legend:legend([{label:"Thực đạt",color:CH.st.good},{label:"Mốc target",color:CH.navy,type:"tick"}]),
    svg:chBullet(cats.map(k=>({label:k.name,actual:k.actual,target:k.target,rate:k.rate,status:k.status})),
      {fmt:tr,axisFmt:v=>fx(v,0),padL:168,aria:"Doanh thu theo nhóm"}),
    table:chTable(["Nhóm","Target","Thực đạt","Tỷ lệ","Đánh giá"],
      cats.map(k=>[esc(k.name),k.target==null?"–":tr(k.target),k.actual==null?"–":tr(k.actual),
        k.rate==null?"–":pc1(k.rate),badge(k)])),
    note:"Đơn vị: triệu đồng. Màu thanh là <b>trạng thái KPI</b> (xanh = ĐẠT · đỏ = KHÔNG ĐẠT), không phải màu định danh nhóm."
  });
}
/* "Hiệu suất theo vùng" — trước ở Tổng quan, nay thuộc module TỈNH/KHO */
function chartHieuSuatVung(S){
  const regions=(S.vung==="TONG"?VUNGS:[S.vung]);
  const rdata=regions.map(vg=>{
    const S2=Object.assign({},S,{vung:vg,kho:"ALL"});
    return {vg, q:calcChatLuongTQ7(S2), dt:calcTongDoanhThu(S2), cp:calcChiPhiAll(S2)};
  });
  return chartCard({
    lk:"chart.region", title:"Hiệu suất theo vùng", sub:`Tỷ lệ hoàn thành theo vùng · ${kyLabel(S)}`, icon:"map",
    legend:legend([{label:"Chất lượng",color:CH.s1},{label:"Doanh thu",color:CH.s2},{label:"Kiểm soát chi phí",color:CH.s3}]),
    svg:chColumns(regions.map(v=>v.replace("Vùng ","")),[
      {name:"Chất lượng",color:CH.s1,data:rdata.map(r=>r.q.rate==null?null:r.q.rate*100)},
      {name:"Doanh thu",color:CH.s2,data:rdata.map(r=>r.dt.rate==null?null:r.dt.rate*100)},
      {name:"Kiểm soát chi phí",color:CH.s3,data:rdata.map(r=>r.cp.rate==null?null:(2-r.cp.rate)*100)}
    ],{H:250,axisFmt:v=>Math.round(v)+"%",fmt:v=>pc1(v/100),aria:"So sánh hiệu suất theo vùng"}),
    table:chTable(["Vùng","Chất lượng","Doanh thu","Chi phí (thực/target)"],
      rdata.map(r=>[esc(r.vg), `${r.q.dat}/${r.q.tong} · ${pc1(r.q.rate)}`,
        `${tr(r.dt.actual)} / ${tr(r.dt.target)} · ${pc1(r.dt.rate)}`,
        `${tr(r.cp.actual)} / ${tr(r.cp.target)} · ${pc1(r.cp.rate)}`])),
    note:`Cột <b>Kiểm soát chi phí</b> được quy đổi thành (2 − tỷ lệ chi/định mức) × 100 để cao hơn = tốt hơn, đồng hướng với 2 cột còn lại. Cột chất lượng dùng đúng ${CL_TQ7_N} tiêu chí của Tổng quan. Số gốc xem ở Bảng số.`
  });
}

/* =============================================================================
   MODULE 4 — CHI PHÍ (COST CONTROL)  · KPI ĐẢO CHIỀU
   ============================================================================= */
function renderM3(){
  const S=ST, all=calcChiPhiAll(S);
  const cpN=calcChiPhiTong("nha",S), cpK=calcChiPhiTong("kho",S);
  const chenh = (all.actual!=null&&all.target!=null) ? all.actual-all.target : null;
  const banner=bannerHTML("CHI PHÍ","calculator",[
    bItem("TARGET (định mức cả tháng)","target",all.target==null?`<span style="color:#FFD500">–</span>`:tr(all.target),"",
      "Định mức chi phí cả tháng — chi phí không quy đổi theo số ngày đã qua"),
    bItem("THỰC ĐẠT","receipt",all.actual==null?`<span style="color:#FFD500">–</span>`:tr(all.actual),"",
      all.meta&&all.meta.nha&&all.meta.nha.meta&&all.meta.nha.meta.luyKe!=null
        ? `Lũy kế tới nay: ${tr((all.meta.nha.meta.luyKe||0)+((all.meta.kho&&all.meta.kho.meta&&all.meta.kho.meta.luyKe)||0))}` : ""),
    bItem("TỶ LỆ KIỂM SOÁT","scale",all.rate==null?`<span style="color:#FFD500">–</span>`:pc1(all.rate),"",
      "Thực đạt / định mức — thấp hơn 100% là tốt",true),
    bItem("CHÊNH LỆCH","alert",chenh==null?`<span style="color:#FFD500">–</span>`:
      `<span style="color:${chenh<=0?"#7BE87B":"#FF9C9C"}">${chenh>0?"+":""}${tr(chenh)}</span>`,"",
      chenh==null?"":(chenh<=0?"Tiết kiệm so với định mức":"Vượt định mức"))
  ]);
  const warn = (all.rate!=null&&all.rate>CONFIG.nguong.cpDatDen)
    ? `<div class="card" style="border-color:var(--bad);background:var(--bad-bg)">
        <div class="body" style="display:flex;align-items:center;gap:12px">
          <span style="color:var(--bad);flex:none">${ic("alert",26)}</span>
          <div><div style="font-size:13px;font-weight:800;color:var(--bad-tx);letter-spacing:.3px">CẢNH BÁO VƯỢT ĐỊNH MỨC CHI PHÍ</div>
          <div style="font-size:11.5px;color:var(--bad-tx);margin-top:2px">Chi phí ${esc(scopeLbl(S))} đang ở mức
            <b>${tr(all.actual)}</b> so với định mức <b>${tr(all.target)}</b> — vượt <b>${tr(chenh)}</b> (${pc1(all.rate)}).
            Ngưỡng cảnh báo hiện đặt ở ${pc(CONFIG.nguong.cpCanhBaoDen)} (sửa được trong bảng Cấu hình).</div></div>
          <button class="btn dan" data-gotab="6" style="margin-left:auto;flex:none">${ic("clipboardcheck",13)}Xem hành động</button>
        </div></div>` : "";

  /* xu hướng 4 tuần / các tháng */
  const trend=cpTrend(S);
  const chart=chartCard({
    lk:"chart.cptrend", title:"Chi phí thực tế so với định mức", icon:"calculator", sub:`${scopeLbl(S)} · ${trend.label}`,
    legend:legend([{label:"Chi phí thực tế",color:CH.s1},{label:"Định mức",color:CH.s2}]),
    svg:chColumns(trend.labels,[
      {name:"Chi phí thực tế",color:CH.s1,data:trend.actual},
      {name:"Định mức",color:CH.s2,data:trend.target}],
      {H:240,axisFmt:v=>fx(v,0),fmt:tr,aria:"Xu hướng chi phí"}),
    table:chTable(["Kỳ","Chi phí thực tế","Định mức","Chênh lệch"],
      trend.labels.map((l,i)=>[esc(l),tr(trend.actual[i]),tr(trend.target[i]),
        (trend.actual[i]!=null&&trend.target[i]!=null)?
          `<span style="color:${trend.actual[i]<=trend.target[i]?"var(--good-tx)":"var(--bad-tx)"};font-weight:800">
            ${trend.actual[i]-trend.target[i]>0?"+":""}${tr(trend.actual[i]-trend.target[i])}</span>`:"–"])),
    note:"Chi phí là KPI <b>đảo chiều</b>: cột thực tế thấp hơn cột định mức mới là ĐẠT."
  });

  const sect=(title,icon,loai)=>{
    const codes = loai==="kho"?unitsKho(S):unitsNha(S);
    if(!codes.length) return "";
    const tot = loai==="kho"?cpK:cpN;
    const rows = sortRows(codes.map(c=>({code:c,cp:calcChiPhiUnit(c,loai,S)})).map(r=>
      Object.assign(r,{score:{val:r.cp.rate==null?null:(2-r.cp.rate)*50},tongDt:{actual:0},sl:{actual:0}})), ST.sort);
    const row=r=>{
      const cp=r.cp, ch=(cp.actual!=null&&cp.target!=null)?cp.actual-cp.target:null;
      return `<tr><td class="l stick">${esc(vungOf(r.code).replace("Vùng ","V. "))}</td>
        <td class="l stick2"><b>${esc(tinhOf(r.code))}</b> <span style="color:var(--muted);font-size:10px">${esc(r.code)}</span></td>
        <td class="sep">${valCell(cp,"target")}${(loai==="nha"&&!(cp.meta&&cp.meta.chinhXac))?" "+infoI(`Định mức cấp <b>vùng</b> được phân bổ xuống tỉnh: ${esc(PHANBO_LABEL[CONFIG.phanBo.mode])}. Đây là <b>ước tính</b>, không phải số target riêng của tỉnh.`):""}</td>
        <td>${valCell(cp,"actual")}</td>
        <td>${meterCell(cp)}</td>
        <td>${ch==null?DASH:`<span style="color:${ch<=0?"var(--good-tx)":"var(--bad-tx)"};font-weight:800">${ch>0?"+":""}${tr(ch)}</span>`}</td>
        <td>${badge(cp)}</td></tr>`;
    };
    const chT=(tot.actual!=null&&tot.target!=null)?tot.actual-tot.target:null;
    return `<div class="card"><header><span class="ci">${ic(icon,16)}</span>
        <div><h3>${esc(title)}</h3><span class="sub">${codes.length} đơn vị · KPI đảo chiều (thực đạt ≤ KPI = ĐẠT)</span></div></header>
      <div class="body tight"><div class="tblwrap"><table class="dt">
        <thead><tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
          <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
          <th class="g" colspan="5">${ic("calculator",12)} CHI PHÍ</th></tr>
        <tr><th class="sep">KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ (% kiểm soát)</th><th>CHÊNH LỆCH</th><th>ĐÁNH GIÁ</th></tr></thead>
        <tbody><tr class="tot"><td class="l stick">${esc(S.vung==="TONG"?"2 vùng":S.vung)}</td><td class="l stick2">TỔNG:</td>
          <td class="sep">${tot.target==null?naCell(tot):tr(tot.target)}</td>
          <td>${tot.actual==null?naCell(tot):tr(tot.actual)}</td>
          <td>${meterCell(tot)}</td>
          <td>${chT==null?DASH:`<span style="color:${chT<=0?"var(--good-tx)":"var(--bad-tx)"};font-weight:800">${chT>0?"+":""}${tr(chT)}</span>`}</td>
          <td>${badge(tot)}</td></tr>
        ${rows.map(row).join("")}</tbody></table></div></div></div>`;
  };
  const cT=trendCard("chiPhi",S,{title:LB("chart.trend.m3","Xu hướng chi phí theo tháng"),icon:"calculator"});
  return gopBar(S) + banner + warn + chart + cT
    + sect("1/ BẢO HÀNH TẠI NHÀ","home","nha") + sect("2/ BẢO HÀNH TẠI KHO","warehouse","kho");
}
function cpTrend(S){
  if(isYear(S)){
    const ms=monthsOf(S.nam), labels=[],actual=[],target=[];
    for(const m of ms){ const S2=Object.assign({},S,{ky:"Tháng",thang:m});
      const k=calcChiPhiAll(S2); labels.push("T"+m); actual.push(k.actual); target.push(k.target); }
    return {labels,actual,target,label:`${ms.length} tháng của năm ${S.nam}`};
  }
  const D=M(S);
  const hasWeekly = !!(D && (D.cpVung || (D.cpNhaKho&&D.cpNhaKho.length)));
  if(!hasWeekly){                     // nguồn mới (T1-T8) không chia tuần -> xem theo tháng
    const ms=monthsOf(S.nam).filter(m=>m<=S.thang).slice(-6), labels=[],actual=[],target=[];
    for(const m of ms){ const S2=Object.assign({},S,{ky:"Tháng",thang:m});
      const k=calcChiPhiAll(S2); labels.push("T"+m); actual.push(k.actual); target.push(k.target); }
    return {labels,actual,target,label:`các tháng gần nhất (nguồn mới không chia tuần)`};
  }
  const labels=["Tuần 1","Tuần 2","Tuần 3","Tuần 4"],actual=[],target=[];
  for(let i=0;i<4;i++){ const S2=Object.assign({},S,{ky:"Tuần "+(i+1)});
    const k=calcChiPhiAll(S2); actual.push(k.actual); target.push(k.target); }
  return {labels,actual,target,label:`4 tuần của tháng ${S.thang}/${S.nam}`};
}

/* =============================================================================
   MODULE 5 — DOANH THU (REVENUE PERFORMANCE)
   ============================================================================= */
function renderM4(){
  const S=ST;
  const bt=calcBenTrong(S), bn=calcBenNgoai(S), tg=calcTongDoanhThu(S);
  const banner=bannerHTML("DOANH THU","trendup",[
    bKpi("DOANH THU","trendup"&&tg,"trendup",true),
    bKpi("BÊN TRONG",bt,"layers"),
    bKpi("BÊN NGOÀI",bn,"trendup")
  ]);
  /* biểu đồ theo vùng + theo tỉnh */
  const regions=(S.vung==="TONG"?VUNGS:[S.vung]);
  const rdata=regions.map(vg=>{const S2=Object.assign({},S,{vung:vg,kho:"ALL"});
    return {vg,bt:calcBenTrong(S2),bn:calcBenNgoai(S2)}});
  const chVung=chartCard({
    lk:"chart.dtvung", title:"Doanh thu theo vùng", icon:"map", sub:`Bên trong vs bên ngoài · ${kyLabel(S)}`,
    legend:legend([{label:"Bên trong",color:CH.s1},{label:"Bên ngoài",color:CH.s2}]),
    svg:chColumns(regions.map(v=>v.replace("Vùng ","")),[
      {name:"Bên trong",color:CH.s1,data:rdata.map(r=>r.bt.actual)},
      {name:"Bên ngoài",color:CH.s2,data:rdata.map(r=>r.bn.actual)}],
      {H:240,axisFmt:v=>fx(v,0),fmt:tr,aria:"Doanh thu theo vùng"}),
    table:chTable(["Vùng","Bên trong (thực/target)","Bên ngoài (thực/target)","Tổng"],
      rdata.map(r=>[esc(r.vg),`${tr(r.bt.actual)} / ${tr(r.bt.target)}`,`${tr(r.bn.actual)} / ${tr(r.bn.target)}`,
        tr((r.bt.actual||0)+(r.bn.actual||0))])),
    note:"Đơn vị: triệu đồng. Thực đạt là kết quả quy đổi cuối kỳ theo nhịp lũy kế của nguồn."
  });
  const units=[...(showKho(S)?unitsKho(S).map(c=>[c,"kho"]):[]),...(showNha(S)?unitsNha(S).map(c=>[c,"nha"]):[])];
  const chTinh=chartCard({
    lk:"chart.dttinh", title:"Doanh thu theo tỉnh / kho", icon:"building", sub:`${units.length} đơn vị · ${kyLabel(S)}`,
    legend:legend([{label:"Thực đạt",color:CH.st.good},{label:"Mốc target",color:CH.navy,type:"tick"}]),
    svg:chBullet(units.map(([c,loai])=>{
      const r=unitRow(c,loai,S);
      return {label:`${tinhOf(c)}${loai==="kho"?" (kho)":""}`,actual:r.tongDt.actual,target:r.tongDt.target,
        rate:r.tongDt.rate,status:r.tongDt.status};
    }),{fmt:tr,axisFmt:v=>fx(v,0),aria:"Doanh thu theo tỉnh"}),
    table:chTable(["Đơn vị","Loại hình","Target","Thực đạt","Tỷ lệ","Đánh giá"],
      units.map(([c,loai])=>{const r=unitRow(c,loai,S);
        return [`${esc(tinhOf(c))} <span style="color:var(--muted)">${esc(c)}</span>`,loai==="kho"?"BH tại kho":"BH tại nhà",
          r.tongDt.target==null?"–":tr(r.tongDt.target), r.tongDt.actual==null?"–":tr(r.tongDt.actual),
          r.tongDt.rate==null?"–":pc1(r.tongDt.rate), badge(r.tongDt)]})),
    note: hasTinh(S)
      ? "Doanh thu theo tỉnh/kho là <b>số thật theo đơn vị</b> từ file dữ liệu T1-T12/2026. Riêng ô nào file để trống thì bù bằng nguồn cũ (có dấu ⓘ ước tính)."
      : "Doanh thu của 12 tỉnh bảo hành tại nhà là <b>ước tính phân bổ</b> từ số liệu cấp vùng ("+esc(PHANBO_LABEL[CONFIG.phanBo.mode])+"). Riêng 2 kho bảo hành tại kho là số chính xác vì mỗi vùng chỉ có 1 kho."
  });

  /* --- bảng 1/ BÊN TRONG --- */
  const rowsIn = units.map(([c,loai])=>{
    const dtIn=calcDtUnitCat(c,loai,loai==="kho"?"Bảo hành tại kho":"Bảo hành tại nhà",S);
    const goi =calcDtUnitCat(c,loai,"Bán gói năm 2025",S);
    /* Gói bán 2025 tách riêng khỏi "Bảo hành tại nhà" (mọi tháng) -> BÊN TRONG =
       Đơn hàng bên trong + Gói bán 2025, phải cộng cả 2 vào TỔNG hàng này. */
    return {c,loai,dtIn,goi,tong:sumKpi([dtIn,goi],"BÊN TRONG","layers")};
  });
  const rowsOut = units.map(([c,loai])=>{
    const d11=calcDtUnitCat(c,loai,"BH 1 đổi 1",S), bhmr=calcDtUnitCat(c,loai,"BHMR",S), scdv=calcDtUnitCat(c,loai,"SCDV",S);
    /* 5 nhóm mới gộp thành 1 cột "DỊCH VỤ MỚI" — để bảng không phình thêm 20 cột,
       chi tiết từng nhóm xem bảng ngay dưới (secOutMoi). */
    const moi=calcNgoaiMoiUnit(c,loai,S);
    return {c,loai,d11,bhmr,scdv,moi,tong:sumKpi([d11,bhmr,scdv,moi],"BÊN NGOÀI","trendup")};
  });
  const grp4=k=>`<td class="sep">${valCell(k,"target")}</td><td>${valCell(k,"actual")}</td>
    <td>${rateCell(k)}</td><td>${badge(k)}</td>`;
  const nhomCell=loai=>`<td class="l">${loai==="kho"?"Tại Kho":"Tại Nhà"}</td>`;
  /* cụm so sánh với TARGET VƯỢT TRỘI — chỉ nhóm Sửa chữa khách lẻ, bật/tắt bằng ô tick */
  const vt=vtOn();
  const grp3vt=k=>!vt?"":`<td class="sep vtcol">${valCell(k,"target")}</td>
    <td class="vtcol">${rateCell(k)}</td><td class="vtcol">${badge(k)}</td>`;
  /* thực đạt phần ĐƠN HÀNG bên trong, CHƯA gồm gói bán 2025 (nguồn không tách target riêng) */
  const dhCell=k=>{const v=(k&&k.meta&&k.meta.dtDonHang!=null)?k.meta.dtDonHang:(k&&k.meta&&k.meta.goiGop?null:(k?k.actual:null));
    return `<td class="sep">${v==null?DASH:tr(v)}</td>`;};

  const secIn=`<div class="card"><header><span class="ci">${ic("layers",16)}</span>
      <div><h3>1/ BÊN TRONG</h3><span class="sub">BÊN TRONG = Doanh Thu Đơn Hàng Bên Trong + Gói Bán 2025</span></div>
      <div class="hr">${infoI("Công thức lấy nguyên từ ô D7=H7+L7 / E7=I7+M7 của file mẫu.")}</div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt">
      <thead><tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
        <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
        <th class="l" rowspan="2" style="vertical-align:bottom">NHÓM</th>
        <th class="g" colspan="4">${ic("layers",12)} BÊN TRONG (đã gồm gói)</th>
        <th class="g" rowspan="2" style="vertical-align:bottom">${ic("banknote",12)} ĐH bên trong<br><span style="font-weight:600;font-size:9.5px">THỰC ĐẠT (chưa gồm gói)</span></th>
        <th class="g" colspan="4">${ic("pkg",12)} Gói Bán 2025 (đã gồm ở cột BÊN TRONG)</th></tr>
      <tr>${Array(2).fill(0).map(()=>`<th class="sep">KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th>`).join("")}</tr></thead>
      <tbody>
        <tr class="tot"><td class="l stick">${esc(S.vung==="TONG"?"2 vùng":S.vung)}</td><td class="l stick2">TỔNG:</td><td class="l">–</td>
          ${grp4(bt)}<td class="sep">${(()=>{const ps=[calcDoanhThuCat("Bảo hành tại nhà",S),calcDoanhThuCat("Bảo hành tại kho",S)]
            .map(k=>(k.meta&&k.meta.dtDonHang!=null)?k.meta.dtDonHang:k.actual).filter(v=>v!=null);
            return ps.length?tr(ps.reduce((a,b)=>a+b,0)):DASH})()}</td>
          ${grp4(calcDoanhThuCat("Bán gói năm 2025",S))}</tr>
        ${rowsIn.map(r=>`<tr><td class="l stick">${esc(vungOf(r.c).replace("Vùng ","V. "))}</td>
          <td class="l stick2"><b>${esc(tinhOf(r.c))}</b> <span style="color:var(--muted);font-size:10px">${esc(r.c)}</span></td>
          ${nhomCell(r.loai)}${grp4(r.tong)}${dhCell(r.dtIn)}${grp4(r.goi)}</tr>`).join("")}
      </tbody></table></div>
      <div class="cap"><b>Quy tắc nguồn:</b> target và thực đạt của <b>BÊN TRONG</b> đã bao gồm <b>Gói bán 2025</b>
        (thực đạt = đơn hàng bên trong + gói bán), nên khối Gói bán chỉ để theo dõi chi tiết, không cộng thêm lần nữa.<br>${hasTinh(S)
        ? `Số theo đơn vị là <b>số thật</b> từ file dữ liệu tháng (T1-T12/2026); dòng <b>TỔNG:</b> = cộng các đơn vị. Ô file để trống được bù bằng nguồn cũ (ⓘ ước tính).`
        : `Dòng <b>TỔNG:</b> là số thực tế cấp vùng. Các dòng đơn vị bảo hành tại nhà là ước tính phân bổ nên tổng cộng có thể lệch nhẹ so với dòng TỔNG.`}</div>
    </div></div>`;

  /* Ô tick bật/tắt cụm so sánh Target VƯỢT TRỘI. Chỉ tiêu phấn đấu này chỉ áp cho
     nhóm Sửa chữa khách lẻ nên KHÔNG đụng tới BÊN NGOÀI / TỔNG DOANH THU.       */
  const vtT=vt?calcVtTong(S):null, sc=calcDoanhThuCat("SCDV",S);
  const vtBar=`<div class="phutoggle"><label class="chk">
      <input type="checkbox" id="dtVtChk" ${vt?"checked":""}>
      <span>Hiện so sánh Target Vượt Trội</span></label>
    <span class="pt-note">${vt
      ? `Đang hiện thêm cụm <b>SỬA CHỮA KHÁCH LẺ — TARGET VƯỢT TRỘI</b>: cùng số thực đạt
         <b>${sc.actual==null?"–":tr(sc.actual)}</b> nhưng so với chỉ tiêu phấn đấu
         <b>${vtT&&vtT.target!=null?tr(vtT.target):"chưa có"}</b>
         thay vì target công ty <b>${sc.target==null?"–":tr(sc.target)}</b>.`
      : `Nhóm <b>Sửa chữa khách lẻ</b> có thêm chỉ tiêu phấn đấu riêng
         (<b>Target Vượt Trội</b>) ngoài target công ty — bật ô này để so sánh.`}
      Cụm này <b>chỉ để theo dõi riêng</b>, không cộng vào BÊN NGOÀI hay TỔNG DOANH THU.
      Lựa chọn được <b>ghi nhớ</b> cho lần mở sau.</span></div>`;
  const vtToggle=()=>vtBar;

  const secOut=`<div class="card"><header><span class="ci">${ic("trendup",16)}</span>
      <div><h3>2/ BÊN NGOÀI</h3><span class="sub">BÊN NGOÀI = 1 ĐỔI 1 + BẢO HÀNH MỞ RỘNG + SỬA CHỮA KHÁCH LẺ + DỊCH VỤ MỚI</span></div>
      <div class="hr">${infoI("Từ 08/09/2026 sheet TARGET tách BÊN NGOÀI thành 8 nhóm. Ba nhóm quen thuộc giữ nguyên cột riêng; 5 nhóm mới (Bảo hành ủy quyền · Sửa chữa BHX/ĐMX · Gói PRO · Thu cũ đổi mới · Solar) gộp vào cột <b>DỊCH VỤ MỚI</b> để bảng không quá rộng — chi tiết từng nhóm xem bảng ngay bên dưới. Nhờ vậy TỔNG BÊN NGOÀI trên web luôn khớp dòng <b>B. DOANH THU BÊN NGOÀI</b> của sheet TARGET.")}</div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt">
      <thead><tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
        <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
        <th class="l" rowspan="2" style="vertical-align:bottom">NHÓM</th>
        <th class="g" colspan="4">${ic("trendup",12)} BÊN NGOÀI</th>
        <th class="g" colspan="4">${ic("refresh",12)} 1 ĐỔI 1</th>
        <th class="g" colspan="4">${ic("shield",12)} BẢO HÀNH MỞ RỘNG</th>
        <th class="g" colspan="4">${ic("wrench",12)} SỬA CHỮA KHÁCH LẺ<br><span style="font-weight:600;font-size:9px">(target công ty)</span></th>
        <th class="g" colspan="4">${ic("sparkles",12)} DỊCH VỤ MỚI<br><span style="font-weight:600;font-size:9px">(5 nhóm mới)</span></th>
        ${vt?`<th class="g vtcol" colspan="3">${ic("trendup",12)} SỬA CHỮA KHÁCH LẺ — TARGET VƯỢT TRỘI</th>`:""}</tr>
      <tr>${Array(5).fill(0).map(()=>`<th class="sep">KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th>`).join("")
        }${vt?`<th class="sep vtcol">TARGET VƯỢT TRỘI</th><th class="vtcol">TỶ LỆ</th><th class="vtcol">ĐÁNH GIÁ</th>`:""}</tr></thead>
      <tbody>
        <tr class="tot"><td class="l stick">${esc(S.vung==="TONG"?"2 vùng":S.vung)}</td><td class="l stick2">TỔNG:</td><td class="l">–</td>
          ${grp4(bn)}${grp4(calcDoanhThuCat("BH 1 đổi 1",S))}${grp4(calcDoanhThuCat("BHMR",S))}${grp4(calcDoanhThuCat("SCDV",S))}${grp4(calcNgoaiMoi(S))}${grp3vt(vt?calcVtTong(S):null)}</tr>
        ${rowsOut.map(r=>`<tr><td class="l stick">${esc(vungOf(r.c).replace("Vùng ","V. "))}</td>
          <td class="l stick2"><b>${esc(tinhOf(r.c))}</b> <span style="color:var(--muted);font-size:10px">${esc(r.c)}</span></td>
          ${nhomCell(r.loai)}${grp4(r.tong)}${grp4(r.d11)}${grp4(r.bhmr)}${grp4(r.scdv)}${grp4(r.moi)}${grp3vt(vt?calcVtUnit(r.c,r.loai,S):null)}</tr>`).join("")}
      </tbody></table></div>
      <div class="cap">Với 2 kho bảo hành tại kho, cột <b>SỬA CHỮA KHÁCH LẺ</b> lấy số thật từ khối “SCDV (phát triển ngoài)” của báo cáo BH tại kho; 1 đổi 1 và BHMR không áp dụng nên hiển thị “–”.</div>
    </div></div>`;
  /* ---- BẢNG CHI TIẾT 8 NHÓM BÊN NGOÀI ------------------------------------
     Sheet TARGET của khách liệt kê 8 dòng; bảng ma trận phía trên gộp 5 nhóm mới
     vào 1 cột cho gọn, nên ở đây trải đủ 8 dòng để đối chiếu 1-1 với sheet gốc.  */
  const rowNgoai=(cat)=>{
    const k=calcDoanhThuCat(cat,S);
    const moi=DT_NGOAI_MOI.some(x=>x.cat===cat);
    return `<tr${moi?' style="background:#FCFDFF"':''}>
      <td class="l"><b>${esc(DT_LABEL[cat]||cat)}</b>${moi?' <span class="vtchip" style="background:#E8F1FC;color:#1257B8">nhóm mới</span>':''}</td>
      <td>${valCell(k,"target")}</td><td>${valCell(k,"actual")}</td>
      <td>${rateCell(k)}</td><td>${badge(k)}</td></tr>`;
  };
  const secOutMoi=`<div class="card"><header><span class="ci">${ic("sparkles",16)}</span>
      <div><h3>Chi tiết 8 nhóm BÊN NGOÀI</h3><span class="sub">Trải đúng 8 dòng như sheet TARGET · ${esc(scopeLbl(S))} · ${esc(kyLabel(S))}</span></div>
      <div class="hr">${infoI("5 nhóm mới hiện <b>chỉ có kế hoạch (target)</b> — sheet nguồn chưa có cột thực đạt cho các nhóm này, nên cột THỰC ĐẠT hiển thị “chưa có dữ liệu”, KHÔNG phải bằng 0. Khi nào nguồn bổ sung cột thực đạt thì web tự hiện, không phải sửa gì.")}</div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt">
      <thead><tr><th class="l">NHÓM</th><th>TARGET</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th></tr></thead>
      <tbody>${DT_NGOAI_ALL.map(rowNgoai).join("")}
        <tr class="tot"><td class="l"><b>TỔNG BÊN NGOÀI</b></td>
          <td>${valCell(bn,"target")}</td><td>${valCell(bn,"actual")}</td>
          <td>${rateCell(bn)}</td><td>${badge(bn)}</td></tr>
      </tbody></table></div></div></div>`;
  const cT=trendCard("doanhThu",S,{title:LB("chart.trend.m4","Xu hướng doanh thu theo tháng"),icon:"trendup"});
  return gopBar(S) + banner + vtToggle()
    + `<div class="chartgrid" style="grid-template-columns:1fr 1.3fr">${chVung}${chTinh}</div>`
    + cT + chartDoanhThuNhom(S) + secIn + secOut + secOutMoi + evalBox("doanhThu",S);
}

/* =============================================================================
   MODULE 6 — TỈNH/KHO  (hierarchy drill-down + ranking)
   ============================================================================= */
function renderM5(){
  const S=ST;
  const nhaTot=showNha(S)?calcClNha(S):[], khoTot=showKho(S)?calcClKho(S):[];
  const cnt=list=>{const co=list.filter(kpiOK);return {dat:co.filter(k=>k.dat).length,co:co.length,tot:list.length}};
  const cN=cnt(nhaTot), cK=cnt(khoTot);
  const banner=bannerHTML("TỔNG QUAN","map",[
    bItem("Bảo hành tại nhà","home",`${cN.dat}/${cN.co}`,"tiêu chí",`Biểu mẫu ${cN.tot} tiêu chí`,true),
    bItem("Bảo hành tại kho","warehouse",`${cK.dat}/${cK.co}`,"tiêu chí",`Biểu mẫu ${cK.tot} tiêu chí`,true),
    bItem("Số đơn vị","building",f0(unitsNha(S).length+unitsKho(S).length),"tỉnh/kho",esc(scopeLbl(S)))
  ]);
  return gopBar(S) + banner + chartHieuSuatVung(S) + drillPanel(S) + rankingPanel(S)
    + matrixSection(S,"nha") + matrixSection(S,"kho");
}
function drillPanel(S){
  const d=S.drill;
  const crumbs=[`<button data-drill="vung" ${d.level==="vung"?'aria-current="true"':""}>${ic("map",12)}VÙNG</button>`];
  if(d.vung) crumbs.push(`<span class="sepi">${ic("chev",12)}</span>
    <button data-drill="tinh:${esc(d.vung)}" ${d.level==="tinh"?'aria-current="true"':""}>${ic("building",12)}${esc(d.vung)}</button>`);
  if(d.kho) crumbs.push(`<span class="sepi">${ic("chev",12)}</span>
    <button data-drill="kho:${esc(d.kho)}" aria-current="true">${ic("warehouse",12)}${esc(tinhOf(d.kho))}</button>`);
  let body="";
  if(d.level==="vung"){
    const vs=(S.vung==="TONG"?VUNGS:[S.vung]);
    body=`<div class="drillgrid">${vs.map(vg=>{
      const S2=Object.assign({},S,{vung:vg,kho:"ALL"});
      const q=calcChatLuongTong(S2), dt=calcTongDoanhThu(S2), cp=calcChiPhiAll(S2);
      const sc=perfScore({cl:q.all,sl:calcSanLuongTong("kho",S2),dg:calcDonGia("kho",S2),cp,tongDt:dt});
      return dCard({title:vg,sub:`${KHO_ORDER.filter(k=>KHOMAP[k].vung===vg).length} tỉnh · ${KHOKHO.filter(k=>vungOf(k)===vg).length} kho BH`,
        icon:"map",score:sc,kpis:q.all,attr:`data-drill="tinh:${esc(vg)}"`});
    }).join("")}</div>`;
  }else if(d.level==="tinh"){
    const codes=KHO_ORDER.filter(k=>KHOMAP[k].vung===d.vung);
    body=`<div class="drillgrid">${codes.map(c=>{
      const r=unitRow(c,"nha",S);
      return dCard({title:tinhOf(c),sub:`${c} · BH tại nhà${KHOKHO.indexOf(c)>=0?" + BH tại kho":""}`,
        icon:"building",score:r.score,kpis:r.cl,attr:`data-drill="kho:${esc(c)}"`});
    }).join("")}</div>`;
  }else{
    const c=d.kho, isKho=KHOKHO.indexOf(c)>=0;
    const rN=unitRow(c,"nha",S), rK=isKho?unitRow(c,"kho",S):null;
    const kpiTable=(r,label)=>`<div class="grpcap" style="margin-top:10px"><span class="i">${ic(label==="kho"?"warehouse":"home",13)}</span>
        ${label==="kho"?"Bảo hành tại kho":"Bảo hành tại nhà"} — ${esc(tinhOf(c))}
        <span class="r">Điểm hiệu quả ${r.score.val==null?"–":fx(r.score.val,0)}/100 · ${r.score.label}</span></div>
      <div class="tblwrap"><table class="mini"><thead><tr><th>Chỉ tiêu</th><th>TARGET</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th><th>ĐÁNH GIÁ</th></tr></thead>
      <tbody>${r.cl.map(k=>tplRow(k)).join("")}
        ${tplRow(r.sl,"SẢN LƯỢNG")}${tplRow(r.dg,"ĐƠN GIÁ")}${tplRow(r.cp,"CHI PHÍ")}
        ${tplRow(r.tongDt,"TỔNG DOANH THU")}${tplRow(r.dtIn,"DOANH THU ĐƠN HÀNG BÊN TRONG")}
        ${tplRow(r.goi,"GÓI BÁN 2025")}${tplRow(r.d11,"1 ĐỔI 1")}${tplRow(r.bhmr,"BẢO HÀNH MỞ RỘNG")}
        ${tplRow(r.scdv,"SỬA CHỮA KHÁCH LẺ")}</tbody></table></div>`;
    body=(rK?kpiTable(rK,"kho"):"")+kpiTable(rN,"nha");
  }
  return `<div class="card"><header><span class="ci">${ic("layers",16)}</span>
      <div><h3>${lblH("m5.drill","Đi sâu: VÙNG → TỈNH → KHO → TIÊU CHÍ")}</h3><span class="sub">Bấm vào thẻ để xem sâu hơn, bấm đường dẫn phía trên để quay lại</span></div>
      <div class="hr">${infoI("Điểm hiệu quả (x/100) là chỉ số tổng hợp <b>chỉ dùng để xếp hạng/hiển thị</b>. Nó không làm thay đổi bất kỳ KPI gốc nào. Công thức: điểm từng nhóm = min(tỷ lệ,120%)/120% × 100 (chi phí đảo chiều), trọng số Chất lượng 40 · Sản lượng 15 · Đơn giá 10 · Chi phí 15 · Doanh thu 20, chuẩn hoá lại theo các nhóm CÓ dữ liệu.")}</div></header>
    <div class="body"><div class="crumbs" style="margin-bottom:12px">${crumbs.join("")}</div>${body}</div></div>`;
}
function dCard(o){
  const co=(o.kpis||[]).filter(kpiOK);
  const st=o.score.status||"none";
  return `<article class="dcard st-${st}" ${o.attr} tabindex="0">
    <div class="dh"><span style="color:var(--navy-600);flex:none">${ic(o.icon,17)}</span>
      <div style="min-width:0"><div class="dn">${esc(o.title)}</div><div class="dv">${esc(o.sub)}</div></div>
      <div class="score"><b style="color:var(--${st==="good"?"good-tx":st==="warn"?"warn-tx":st==="bad"?"bad-tx":"none-tx"})">${o.score.val==null?"–":fx(o.score.val,0)}</b>
        <span>${esc(o.score.label)}</span></div></div>
    <div class="kpidots">${(o.kpis||[]).map(k=>`<i class="${k.status}" ${tipAttr(kpiTip(k))}></i>`).join("")}</div>
    <div style="margin-top:6px;font-size:10.5px;color:var(--muted);font-weight:700">
      ${co.length?`${co.filter(k=>k.dat).length}/${co.length} tiêu chí chất lượng đạt`:"Chưa có dữ liệu chất lượng"}</div>
  </article>`;
}
function rankingPanel(S){
  const rows=allUnitRows(S).filter(r=>r.score.val!=null).sort((a,b)=>b.score.val-a.score.val);
  if(!rows.length) return emptyCard("Chưa xếp hạng được","Chưa có đủ dữ liệu KPI để tính Điểm hiệu quả cho các đơn vị trong phạm vi lọc.");
  const top=rows.slice(0,5), bot=rows.slice(-5).reverse();
  const tbl=(list,rev)=>`<div class="tblwrap"><table class="dt">
    <thead><tr><th class="l">XẾP HẠNG</th><th class="l">VÙNG</th><th class="l">TỈNH/KHO</th><th>ĐIỂM HIỆU QUẢ</th>
      <th>CHẤT LƯỢNG</th><th>SẢN LƯỢNG</th><th>ĐƠN GIÁ</th><th>CHI PHÍ</th><th>DOANH THU</th><th>TRẠNG THÁI</th></tr></thead>
    <tbody>${list.map((r,i)=>{
      const rank = rev ? rows.length-i : i+1;
      const co=r.cl.filter(kpiOK);
      return `<tr><td class="l"><span class="badge ${rev?"bad":"good"}" style="font-size:10px">${ic(rev?"alert":"medal",11)}#${rank}</span></td>
        <td class="l">${esc(r.vung.replace("Vùng ","V. "))}</td>
        <td class="l"><b>${esc(r.tinh)}</b> <span style="color:var(--muted);font-size:10px">${esc(r.code)} · ${r.loai==="kho"?"BH tại kho":"BH tại nhà"}</span></td>
        <td><b style="font-size:13px">${fx(r.score.val,0)}</b><span style="color:var(--muted)">/100</span></td>
        <td>${co.length?`${co.filter(k=>k.dat).length}/${co.length}`:DASH}</td>
        <td>${r.sl.actual==null?DASH:f0(r.sl.actual)}</td>
        <td>${r.dg.actual==null?DASH:vnd(r.dg.actual)}</td>
        <td>${r.cp.rate==null?DASH:`<span style="color:${r.cp.dat?"var(--good-tx)":"var(--bad-tx)"};font-weight:800">${pc(r.cp.rate)}</span>`}</td>
        <td>${r.tongDt.actual==null?DASH:tr(r.tongDt.actual)}</td>
        <td>${badgeOf(r.score.status,r.score.label)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  return `<div class="chartgrid" style="grid-template-columns:1fr 1fr">
    <div class="card"><header><span class="ci" style="background:var(--good-bg);color:var(--good-tx)">${ic("medal",16)}</span>
      <div><h3>${lblH("m5.top","DẪN ĐẦU")}</h3><span class="sub">5 đơn vị dẫn đầu theo Điểm hiệu quả tổng hợp</span></div></header>
      <div class="body tight">${tbl(top,false)}</div></div>
    <div class="card"><header><span class="ci" style="background:var(--bad-bg);color:var(--bad-tx)">${ic("alert",16)}</span>
      <div><h3>${lblH("m5.bot","CẦN CAN THIỆP NGAY")}</h3><span class="sub">5 đơn vị xếp cuối theo Điểm hiệu quả tổng hợp</span></div></header>
      <div class="body tight">${tbl(bot,true)}</div></div></div>`;
}
const PAGE_SIZE=8;
function matrixSection(S,loai){
  if(loai==="nha"&&!showNha(S)) return "";
  if(loai==="kho"&&!showKho(S)) return "";
  const codes = loai==="kho"?unitsKho(S):unitsNha(S);
  if(!codes.length) return "";
  /* dòng TẠI NHÀ có thêm 2 tiêu chí CHẤT LƯỢNG GÓI BẢO HÀNH; dòng TẠI KHO không áp dụng */
  const defs = loai==="kho"?CL_KHO:[...CL_NHA,...CL_GOI];
  const all = sortRows(codes.map(c=>unitRow(c,loai,S)),ST.sort);
  const pk="m5-"+loai, page=ST.page[pk]||0, pages=Math.ceil(all.length/PAGE_SIZE)||1;
  const rows=all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const totCl = loai==="kho"?calcClKho(S):[...calcClNha(S),...calcClGoi(S)];
  const NAcat=(name)=>mkKpi({key:"na",name,icon:"banknote",fmt:tr,unit:"tr đ",target:null,actual:null,
    naLabel:"không áp dụng",dataReason:"Nghiệp vụ này chỉ phát sinh ở bảo hành tại nhà"});
  const totRow={code:"TONG",tinh:"TỔNG:",vung:S.vung==="TONG"?"2 vùng":S.vung,cl:totCl,
    sl:calcSanLuongTong(loai,S),dg:calcDonGia(loai,S),cp:calcChiPhiTong(loai,S),
    clGoi: loai==="kho"?[]:calcClGoi(S),
    dtIn:calcDoanhThuCat(loai==="kho"?"Bảo hành tại kho":"Bảo hành tại nhà",S),
    goi: loai==="kho"?NAcat("GÓI BÁN 2025"):calcDoanhThuCat("Bán gói năm 2025",S),
    d11: loai==="kho"?NAcat("1 ĐỔI 1"):calcDoanhThuCat("BH 1 đổi 1",S),
    bhmr:loai==="kho"?NAcat("BẢO HÀNH MỞ RỘNG"):calcDoanhThuCat("BHMR",S),
    scdv:loai==="kho"?sumKpi(unitsKho(S).map(c=>calcDtUnitCat(c,"kho","SCDV",S)),"SỬA CHỮA KHÁCH LẺ","wrench")
                     :calcDoanhThuCat("SCDV",S),
    loai};
  /* TỔNG doanh thu của bảng = cộng đúng các nhóm hiển thị trong chính bảng này */
  /* gói bán 2025 ĐÃ nằm trong 5.1 (theo quy tắc nguồn) -> KHÔNG cộng lại vào TỔNG */
  totRow.tongDt=sumKpi([totRow.dtIn,totRow.d11,totRow.bhmr,totRow.scdv],"TỔNG DOANH THU","trendup");
  const cell=k=>`<td ${tipAttr(kpiTip(k))} tabindex="0">${k.actual==null?naCell(k):`<b>${k.fmt(k.actual)}</b>`}
    <div style="margin-top:2px">${badge(k)}</div></td>`;
  const rowHTML=(r,isTot)=>`<tr class="${isTot?"tot":""}">
    <td class="l stick">${esc(String(r.vung).replace("Vùng ","V. "))}</td>
    <td class="l stick2">${isTot?"<b>TỔNG:</b>":`<b>${esc(r.tinh)}</b> <span style="color:var(--muted);font-size:10px">${esc(r.code)}</span>`}</td>
    <td>${(()=>{const co=r.cl.filter(kpiOK);
      return co.length?`<span class="badge ${co.filter(k=>k.dat).length===co.length?"good":"bad"}">${co.filter(k=>k.dat).length}/${co.length} ĐẠT</span>`
        :`<span class="badge none">–</span>`})()}</td>
    ${r.cl.map((k,i)=>`<td class="${i===0?"sep":""}">${valCell(k,"actual")}
      <div style="margin-top:2px">${badge(k)}</div></td>`).join("")}
    <td class="sep">${valCell(r.sl,"actual")}</td>
    <td>${valCell(r.dg,"actual")}</td>
    <td>${valCell(r.cp,"actual")}<div style="margin-top:2px">${badge(r.cp)}</div></td>
    <td class="sep">${r.tongDt.actual==null?naCell(r.tongDt):`<b>${tr(r.tongDt.actual)}</b><div style="margin-top:2px">${badge(r.tongDt)}</div>`}</td>
    <td>${valCell(r.dtIn,"actual")}</td>
    <td>${valCell(r.goi,"actual")}</td>
    <td>${valCell(r.d11,"actual")}</td>
    <td>${valCell(r.bhmr,"actual")}</td>
    <td>${valCell(r.scdv,"actual")}</td></tr>`;
  return `<div class="card"><header><span class="ci">${ic(loai==="kho"?"warehouse":"home",16)}</span>
      <div><h3>${loai==="kho"?"2/ BẢO HÀNH TẠI KHO":"1/ BẢO HÀNH TẠI NHÀ"}</h3>
      <span class="sub">Ma trận đầy đủ: 1. Chất lượng → 5.5 Sửa chữa khách lẻ · cuộn ngang được${loai==="kho"?" · gói bảo hành không áp dụng cho kho":" · 2 cột cuối khối chất lượng là GÓI BẢO HÀNH"}</span></div></header>
    <div class="body tight"><div class="tblwrap"><table class="dt">
      <thead>
        <tr><th class="l stick" rowspan="2" style="vertical-align:bottom">VÙNG</th>
            <th class="l stick2" rowspan="2" style="vertical-align:bottom">TỈNH</th>
            <th rowspan="2" style="vertical-align:bottom">ĐÁNH GIÁ CHUNG</th>
            <th class="g" colspan="${defs.length}">1. CHẤT LƯỢNG</th>
            <th class="g" rowspan="2">2. SẢN LƯỢNG</th><th class="g" rowspan="2">3. ĐƠN GIÁ</th>
            <th class="g" rowspan="2">4. CHI PHÍ</th><th class="g" rowspan="2">5. TỔNG DOANH THU</th>
            <th class="g" rowspan="2">5.1 DOANH THU ĐƠN HÀNG BÊN TRONG<br><span style="font-weight:600;font-size:9px">(đã gồm gói bán)</span></th><th class="g" rowspan="2">5.2 GÓI BÁN 2025<br><span style="font-weight:600;font-size:9px">(đã gồm ở 5.1)</span></th>
            <th class="g" rowspan="2">5.3 1 ĐỔI 1</th><th class="g" rowspan="2">5.4 BẢO HÀNH MỞ RỘNG</th>
            <th class="g" rowspan="2">5.5 SỬA CHỮA KHÁCH LẺ</th></tr>
        <tr>${defs.map((d,i)=>`<th class="${i===0?"sep":""}">${esc(d.name)}</th>`).join("")}</tr></thead>
      <tbody>${rowHTML(totRow,true)}${rows.map(r=>rowHTML(r,false)).join("")}</tbody></table></div>
      ${pages>1?`<div class="pager"><span>Trang ${page+1}/${pages} · ${all.length} đơn vị</span>
        <button data-page="${pk}:${page-1}" ${page===0?"disabled":""}>${ic("chev",12,"")}</button>
        <button data-page="${pk}:${page+1}" ${page>=pages-1?"disabled":""}>${ic("chev",12)}</button></div>`:""}
    </div></div>`;
}

/* =============================================================================
   MODULE 7 — HÀNH ĐỘNG (ACTION CENTER)
   ============================================================================= */
function renderM6(){
  const S=ST, rows=calcActions(S);
  const byStatus=v=>rows.filter(r=>r.tinhTrang===v).length;
  const banner=bannerHTML("TRUNG TÂM HÀNH ĐỘNG","clipboardcheck",[
    bItem("Tổng việc","clipboardcheck",f0(rows.length),"dòng",`Tự sinh ${rows.filter(r=>r.auto).length} · thêm tay ${rows.filter(r=>!r.auto).length}`,true),
    bItem("🟢 Hoàn tất","check",f0(byStatus("Hoàn tất")),"",""),
    bItem("🔵 Đang xử lý","refresh",f0(byStatus("Đang xử lý")),"",""),
    bItem("🟡 Có nguy cơ trễ","alert",f0(byStatus("Có nguy cơ trễ")),"",""),
    bItem("🔴 Quá hạn","flame",f0(byStatus("Quá hạn")),"","")
  ]);
  if(!rows.length){
    /* phân biệt "đạt hết" với "kỳ chưa có thực đạt" (tháng kế hoạch T9-T12) */
    const coDl=calcChatLuongTong(S).coDl || allUnitRows(S).some(r=>kpiOK(r.cp)||kpiOK(r.tongDt)||kpiOK(r.sl));
    return gopBar(S) + banner + `<div class="card"><div class="body">
    ${coDl
      ? stateHTML("empty","Không có tiêu chí nào chưa đạt",
        "Tất cả KPI có dữ liệu trong phạm vi lọc đều đạt. Bạn vẫn có thể bấm <b>Thêm dòng</b> để ghi việc theo dõi riêng.","check")
      : stateHTML("empty","Kỳ này chưa có số thực đạt để sinh hành động",
        `<b>${esc(kyLabel(S))}</b> mới có TARGET, chưa có thực đạt nên không đánh giá được tiêu chí nào là chưa đạt.
         Hành động sẽ tự sinh khi có số thực tế. Bạn vẫn có thể bấm <b>Thêm dòng</b> để ghi việc theo dõi riêng.`,"calendar")}
    <div style="text-align:center"><button class="btn acc" id="actAdd">${ic("plus",13)}Thêm dòng</button></div></div></div>`;
  }
  const stOpt=(cur)=>ACT_STATUS.map(s=>`<option ${s.v===cur?"selected":""}>${s.d} ${s.v}</option>`).join("");
  const pk="m6", page=ST.page[pk]||0, PS=12, pages=Math.ceil(rows.length/PS)||1;
  const view=rows.slice(page*PS,(page+1)*PS);
  const ed=(id,f,v,ph)=>`<div class="ed" contenteditable="true" data-act="${esc(id)}" data-f="${f}" data-ph="${esc(ph||"")}">${esc(v||"")}</div>`;
  return gopBar(S) + banner + `<div class="card">
    <header><span class="ci">${ic("clipboardcheck",16)}</span>
      <div><h3>HÀNH ĐỘNG</h3><span class="sub">Tự sinh từ các tiêu chí KHÔNG ĐẠT · sửa được mọi ô · lưu vào kho dữ liệu</span></div>
      <div class="hr">
        ${infoI("Tỷ lệ = Thực đạt / KPI, tự tính; gõ đè vào ô <b>Tỷ lệ</b> để dùng số thủ công. <b>Số ngày tồn</b> = số ngày từ Ngày thực hiện đến Ngày hoàn tất (hoặc đến hôm nay).")}
        <button class="btn acc" id="actAdd">${ic("plus",13)}Thêm dòng</button></div></header>
    <div class="body tight"><div class="tblwrap"><table class="act">
      <thead><tr>
        <th style="width:34px">STT</th><th>TIÊU CHÍ KHÔNG ĐẠT</th><th>TÊN TỈNH/KHO KHÔNG ĐẠT</th>
        <th>NGUYÊN NHÂN</th><th>HÀNH ĐỘNG</th><th>${ic("user",11)} NGƯỜI PHỤ TRÁCH</th>
        <th>${ic("calendar",11)} NGÀY THỰC HIỆN</th><th>${ic("calendar",11)} NGÀY HOÀN TẤT</th><th>TÌNH TRẠNG</th>
        <th>KPI</th><th>THỰC ĐẠT</th><th>TỶ LỆ</th>
        <th>ĐỘ ƯU TIÊN</th><th>SỐ NGÀY TỒN</th><th>TIẾN ĐỘ</th><th style="width:32px"></th></tr></thead>
      <tbody>${view.map(r=>{
        const s=ACT_STATUS.find(x=>x.v===r.tinhTrang)||ACT_STATUS[1];
        return `<tr>
        <td style="font-weight:800;color:var(--muted)">${r.stt}</td>
        <td>${ed(r.id,"tieuChi",r.tieuChi,"Tiêu chí…")}</td>
        <td>${ed(r.id,"noi",r.noi,"Tỉnh/Kho…")}</td>
        <td style="min-width:180px">${ed(r.id,"nguyenNhan",r.nguyenNhan,"Nguyên nhân…")}</td>
        <td style="min-width:220px">${ed(r.id,"hanhDong",r.hanhDong,"Hành động…")}</td>
        <td>${ed(r.id,"nguoi",r.nguoi,"Người…")}</td>
        <td><input type="date" class="stsel" data-act="${esc(r.id)}" data-f="ngayTH" value="${esc(r.ngayTH||"")}" style="border-radius:6px"></td>
        <td><input type="date" class="stsel" data-act="${esc(r.id)}" data-f="ngayHT" value="${esc(r.ngayHT||"")}" style="border-radius:6px"></td>
        <td><select class="stsel ${s.cls==="good"?"":""}" data-act="${esc(r.id)}" data-f="tinhTrang"
             style="background:var(--${s.cls==="navy"?"navy-050":s.cls+"-bg"});color:var(--${s.cls==="navy"?"navy-700":s.cls+"-tx"})">${stOpt(r.tinhTrang)}</select></td>
        <td>${ed(r.id,"kpi",r.kpi,"KPI")}</td>
        <td>${ed(r.id,"thucDat",r.thucDat,"Thực đạt")}</td>
        <td>${ed(r.id,"tyle",r.tyleManual?String(r.rate*100):"",r.rate==null?"–":pc1(r.rate))}
            <div style="font-size:9.5px;color:var(--muted);margin-top:1px">${r.tyleManual?"thủ công":"tự tính"}</div></td>
        <td><span class="prio p${r.prio}">${r.prio===1?"Cao":r.prio===2?"Trung bình":"Thấp"}</span></td>
        <td style="font-weight:800;color:${r.aging!=null&&r.aging>14?"var(--bad-tx)":"var(--ink-2)"}">${r.aging==null?"–":r.aging+" ngày"}</td>
        <td style="min-width:110px"><div class="mrow"><div class="meter">
          <i class="${r.progress>=100?"good":r.progress>=40?"warn":"none"}" data-w="${clamp(r.progress,0,100)}" style="width:0"></i></div>
          <input type="number" min="0" max="100" value="${r.progress}" data-act="${esc(r.id)}" data-f="progress"
            style="width:46px;border:1px solid var(--hair-2);border-radius:5px;padding:2px 4px;font-size:10.5px;text-align:right"></div></td>
        <td><button class="btn dan" style="padding:3px 6px" data-actdel="${esc(r.id)}" title="Xoá dòng">${ic("trash",12)}</button></td></tr>`;
      }).join("")}</tbody></table></div>
      ${pages>1?`<div class="pager"><span>Trang ${page+1}/${pages} · ${rows.length} dòng</span>
        <button data-page="${pk}:${page-1}" ${page===0?"disabled":""}>${ic("chev",12)}</button>
        <button data-page="${pk}:${page+1}" ${page>=pages-1?"disabled":""}>${ic("chev",12)}</button></div>`:""}
      <div class="cap">Dòng tự sinh được tạo lại mỗi lần đổi bộ lọc; nội dung đã sửa vẫn được giữ theo từng dòng.
        Xoá một dòng tự sinh sẽ ẩn nó vĩnh viễn cho kỳ này. Nhớ bấm <b>Lưu JSON</b> để giữ lại.</div>
    </div></div>`;
}

/* =============================================================================
   MODULE 9 — HỎI ĐÁP (tương tác, trả lời bằng SỐ THẬT tính lại qua calcQAAnswer())
   Nguyên tắc khách chốt: KHÔNG suy diễn, KHÔNG bịa số — đọc lại đúng kết quả đã
   tính ở LỚP CALC, giống hệt số hiển thị ở các sheet khác.
   ============================================================================= */
function renderM8(){
  const S=ST; S.qa=S.qa||{history:[]};
  const hist=S.qa.history||[];
  const chips=QA_SAMPLES.map(q=>`<button type="button" class="qachip" data-qasample="${esc(q)}">${esc(q)}</button>`).join("");
  const last=hist.length?hist[hist.length-1]:null;
  const lastHTML=last?`<div class="qaans">
      <div class="qa-q">${ic("message",13)}${esc(last.q)}</div>
      <div class="qa-scope">${esc(last.scopeTxt)}</div>
      <div class="qa-a">${last.html}</div>
    </div>`:`<div class="qaans" style="background:var(--navy-050);border-left-color:var(--navy-500)">
      <div class="qa-a" style="color:var(--muted)">Gõ câu hỏi rồi bấm <b>Hỏi</b> (hoặc Enter), hoặc bấm 1 trong các câu gợi ý bên dưới để xem thử.<br>
      <b>Phạm vi:</b> Tổng 2 vùng · Vùng Trung Bộ/Duyên Hải · 1 tỉnh/kho cụ thể · tại nhà/tại kho riêng.<br>
      <b>Thời gian:</b> 1 tháng · khoảng tháng ("từ tháng 1 đến tháng 6") · quý ("Quý 3") · nhiều tháng rời rạc ("tháng 2, tháng 5, tháng 9") · "N tháng gần nhất" — hỏi nhiều tháng sẽ trả lời bằng <b>bảng chi tiết theo từng tháng + lũy kế</b>.<br>
      <b>Chỉ số:</b> doanh thu (kể cả theo từng loại: gói 2025/1 đổi 1/BHMR/SCDV) · sản lượng/đơn hàng · đơn giá · chi phí · chất lượng/tiêu chí.<br>
      <b>Câu hỏi đặc biệt:</b> "kho nào 3 tháng gần nhất không đạt?" (quét nhiều tháng, liệt kê đơn vị + lý do), và "tháng này đơn hàng dự kiến về đích không, thiếu bao nhiêu?" (tính khoảng cách dự kiến + gợi ý bù đắp qua 1 đổi 1/BHMR/SCDV).<br>
      Không nhận diện được từ khoá nào thì trả lời tổng hợp cả 5 lĩnh vực cho đúng phạm vi/thời gian đã hỏi.</div></div>`;
  const histHTML=hist.slice(0,-1).slice(-8).reverse().map(h=>`<div class="qahitem">
      <div class="qa-q">${esc(h.q)}</div><div class="qa-scope">${esc(h.scopeTxt)}</div>
      <div class="qa-a">${h.html}</div></div>`).join("");
  return `<div class="card"><header><span class="ci">${ic("message",16)}</span>
      <div><h3>${lblH("m8.title","HỎI ĐÁP")}</h3>
        <span class="sub">Gõ câu hỏi tiếng Việt về số liệu đã có — trả lời bằng đúng số đang hiển thị ở các sheet khác của dashboard</span></div></header>
    <div class="body">
      <div class="qabox">
        <input type="text" id="qaIn" placeholder="Ví dụ: Tháng 8 doanh thu bao nhiêu? · Chất lượng tiêu chí nào chưa đạt?" autocomplete="off">
        <button class="btn acc" id="qaGo">${ic("message",13)}Hỏi</button>
      </div>
      <div class="qachips">${chips}</div>
      ${lastHTML}
    </div></div>
    ${histHTML?`<div class="card"><header><span class="ci">${ic("clock",16)}</span>
      <div><h3>${lblH("m8.hist","LỊCH SỬ HỎI ĐÁP KỲ NÀY")}</h3><span class="sub">Chỉ lưu trong phiên làm việc hiện tại, không ghi vào kho dữ liệu</span></div></header>
      <div class="body"><div class="qahist">${histHTML}</div></div></div>`:""}`;
}

