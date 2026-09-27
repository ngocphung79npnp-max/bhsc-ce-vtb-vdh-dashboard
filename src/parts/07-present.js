
/* =============================================================================
   LỚP 3 · PRESENTATION — chỉ tiêu thụ kết quả của LỚP 2.
   3a. Atoms + Charts
   ============================================================================= */

/* ---------- tooltip ---------- */
const TIPS = {};                 // id -> html
let tipSeq = 0;
function tipReg(html){ const id="t"+(++tipSeq); TIPS[id]=html; return id; }
function tipAttr(html){ return `data-tip="${tipReg(html)}"`; }
(function initTip(){
  const el=()=>$("#tip");
  document.addEventListener("mouseover",e=>{
    const t=e.target.closest("[data-tip]"); if(!t) return;
    const html=TIPS[t.getAttribute("data-tip")]; if(!html) return;
    const tip=el(); tip.innerHTML=html; tip.dataset.on="1"; posTip(e);
  });
  document.addEventListener("mousemove",e=>{ if(el().dataset.on==="1") posTip(e); });
  document.addEventListener("mouseout",e=>{
    const t=e.target.closest("[data-tip]"); if(!t) return;
    el().dataset.on="0";
  });
  document.addEventListener("focusin",e=>{
    const t=e.target.closest("[data-tip]"); if(!t) return;
    const html=TIPS[t.getAttribute("data-tip")]; if(!html) return;
    const tip=el(); tip.innerHTML=html; tip.dataset.on="1";
    const r=t.getBoundingClientRect(); place(r.left, r.bottom+8);
  });
  document.addEventListener("focusout",()=>{ el().dataset.on="0"; });
  function place(x,y){ const tip=el(), w=tip.offsetWidth, h=tip.offsetHeight;
    tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+"px";
    tip.style.top =(y+h>innerHeight-8 ? Math.max(8,y-h-22) : y)+"px"; }
  function posTip(e){ place(e.clientX+14, e.clientY+18); }
})();

/* ---------- KPI tooltip chuẩn: KPI là gì + target + thực đạt + tỷ lệ + trạng thái ---------- */
function kpiTip(k,extra){
  if(!k) return "";
  const rows=[
    ["Target", k.noCfg?'<span style="color:#FFD500">chưa cấu hình</span>':k.fmt(k.target)+(k.unit?" "+k.unit:"")],
    ["Thực đạt", k.noData?'<span style="color:#FFD500">chưa có dữ liệu</span>':k.fmt(k.actual)+(k.unit?" "+k.unit:"")],
    ["Tỷ lệ dự kiến đạt", k.rate==null?"–":`<b style="color:#FFD500">${pc1(k.rate)}</b>`
      + (k.coTienDo?" (theo dự kiến cả tháng)":"")],
    ["Trạng thái", k.statusText]
  ];
  if(k.coTienDo) rows.splice(2,0,["Kết quả đến hiện tại", pc1(k.rateNow)+" của target cả tháng"]);
  if(k.meta&&k.meta.prorate){
    const M=k.meta;
    rows.push(["Kỳ lũy kế", `${M.ngayDaQua}/${M.ngayTrongThang} ngày (${pc(M.prorate)})`]);
    if(M.duKien!=null)      rows.push(["Dự kiến cả tháng", `<b style="color:#FFD500">${k.fmt(M.duKien)}${k.unit?" "+k.unit:""}</b>`]);
    if(M.targetQuyDoi!=null) rows.push(["Target tương ứng kỳ",
      `${k.fmt(M.targetQuyDoi)}${k.unit?" "+k.unit:""} — phần target ứng với ${M.ngayDaQua}/${M.ngayTrongThang} ngày`]);
  }
  if(k.meta&&k.meta.khongQuyDoi&&k.key==="chiphi")
    rows.push(["Quy đổi lũy kế",'<b style="color:#FFD500">KHÔNG áp dụng</b> — số chi phí đã là lũy kế cuối tháng']);
  if(k.meta&&k.meta.don!=null) rows.push(["Số đơn", f0(k.meta.don)+(k.meta.loi!=null?` · lỗi ${f0(k.meta.loi)}`:"")]);
  if(k.meta&&k.meta.luyKe!=null) rows.push(["Lũy kế tới nay", tr(k.meta.luyKe)]);
  if(k.meta&&k.meta.ref!=null)   rows.push(["Tham chiếu DT/SL", vnd(k.meta.ref)]);
  if(k.meta&&k.meta.note)        rows.push(["Ghi chú", k.meta.note]);
  let note="";
  if(k.meta&&k.meta.prorate) note+=`Target là số <b>CẢ THÁNG</b>. Kỳ mới đi ${k.meta.ngayDaQua}/${k.meta.ngayTrongThang} ngày nên <b>tỷ lệ dự kiến đạt</b> chấm theo dự kiến cả tháng; <b>kết quả đến hiện tại</b> là phần đã làm được tới hôm nay.<br>`;
  if(k.meta&&k.meta.khongQuyDoi&&k.key==="chiphi") note+="Chi phí <b>không</b> quy đổi ×15/31: số nguồn đã là lũy kế cuối tháng nên so thẳng với <b>định mức cả tháng</b>.<br>";
  if(k.meta&&k.meta.goiGop) note+="Thực đạt BÊN TRONG = đơn hàng bên trong + Gói bán 2025 (target từ tháng 8 đã gồm gói).<br>";
  if(k.meta&&k.meta.bocGoi) note+="Tháng 1–7: target BÊN TRONG CHƯA gồm Gói bán 2025 nên thực đạt cũng KHÔNG cộng gói (gói theo dõi ở dòng riêng).<br>";
  if(k.ed) note+="Ô này <b>sửa tay được</b>: bấm vào số để gõ đè, Enter để lưu.<br>";
  if(k.dir==="down") note+="KPI ĐẢO CHIỀU: thực đạt ≤ target mới là ĐẠT.<br>";
  if(k.tmp)          note+="Số liệu tạm thời — mở bảng Cấu hình để điều chỉnh.<br>";
  if(k.meta&&k.meta.uocTinh) note+=`ƯỚC TÍNH: ${esc(k.meta.phanBo||"phân bổ từ số liệu cấp vùng")}.<br>`;
  if(k.meta&&k.meta.nguon)   note+=esc(k.meta.nguon)+"<br>";
  if(k.reason)       note+=esc(k.reason)+"<br>";
  if(extra)          note+=extra;
  return `<div class="tt">${ic(k.icon||"target",12)}${esc(k.name)}</div>
    ${k.desc?`<div style="color:#C6D6EC">${esc(k.desc)}</div>`:""}
    <dl>${rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>
    ${note?`<div class="note">${note}</div>`:""}`;
}

/* ---------- atoms ---------- */
const STATUS_ICON={good:"check",warn:"alert",bad:"x",none:"minus"};
function badge(k){
  if(!k) return `<span class="badge none">${ic("minus",11)}–</span>`;
  const cls=k.status;
  return `<span class="badge ${cls}">${ic(STATUS_ICON[cls],11)}${esc(k.statusText)}</span>`;
}
function badgeOf(status,text){
  return `<span class="badge ${status}">${ic(STATUS_ICON[status],11)}${esc(text)}</span>`;
}
/* ô "chưa cấu hình" / "chưa có dữ liệu" — KHÔNG BAO GIỜ là số bịa */
function naCell(k){
  const why = (k && k.naLabel) || "chưa có dữ liệu";
  const cfg = k && k.cfgKey && why==="chưa cấu hình";
  return `<span class="dash" ${tipAttr(kpiTip(k))} tabindex="0">–</span>` +
    (cfg?` <button class="cfgpill" data-cfg="${esc(k.cfgKey)}" title="Mở bảng Cấu hình">${ic("settings",9)}${why}</button>`
        :` <span class="badge none" style="font-size:9px">${esc(why)}</span>`);
}
/* Tránh lặp nhãn "chưa cấu hình"/"chưa có dữ liệu" 3 lần trên cùng 1 dòng:
   - cột TARGET  giữ nhãn khi thiếu target (kèm nút mở bảng Cấu hình)
   - cột THỰC ĐẠT giữ nhãn khi thiếu số thực tế mà target ĐÃ có
   - cột TỶ LỆ   chỉ hiển thị "–" (đã có nhãn ở 2 cột trên) */
/* ---------------------------------------------------------------------------
   Ô SỬA TAY: mọi ô số (TARGET và THỰC ĐẠT) của từng tỉnh/kho đều gõ đè được.
   · bấm để sửa · Enter/rời ô = ghi nhận · ESC = huỷ · số sai bị TỪ CHỐI kèm lý do
   · ô đã sửa được ĐÁNH DẤU riêng + tooltip nêu số gốc + nút "hoàn tác"
   · ghi nhận xong -> render() lại toàn bộ: số đi qua LỚP CALC, không ghi thẳng ra DOM
   --------------------------------------------------------------------------- */
function edPack(k,which){
  const e=k&&k.ed; if(!e) return null;
  const key = which==="target"?e.t:e.a; if(!key) return null;
  const pr  = which==="target"?(e.pr||1):1;
  return {key, sc:e.sc||1, pr};
}
function edMark(key){ return DB.edits[key]||null; }
function editable(k,which,inner){
  const p=edPack(k,which);
  if(!p) return inner;
  const ed=edMark(p.key);
  const raw = which==="target"?k.target:k.actual;                 // giá trị đang HIỂN THỊ
  const goc = ed ? (ed.o==null?null:ed.o/p.sc*p.pr) : null;       // số gốc quy về đơn vị hiển thị
  const tipG = ed
    ? `<div class="note"><b>Ô đã sửa tay.</b><br>Số gốc từ Excel: <b>${goc==null?"chưa có":esc(k.fmt(goc))}</b><br>
       Bấm nút ↺ để hoàn tác về số gốc.</div>` : "";
  return `<span class="edc${ed?" edited":""}" data-edcell="${esc(p.key)}" data-edsc="${p.sc}" data-edpr="${p.pr}"
      data-edval="${raw==null?"":raw}" role="button" tabindex="0"
      title="${ed?"Đã sửa tay — bấm để sửa tiếp":"Bấm để sửa số này"}"
      ${tipAttr(kpiTip(k,tipG))}>${inner}</span>`
    + (ed?`<button class="edundo" data-edundo="${esc(p.key)}" title="Hoàn tác về số gốc từ Excel">↺</button>`:"");
}
function valCell(k,which){            // which: "target" | "actual"
  if(!k) return DASH;
  const v = which==="target"?k.target:k.actual;
  if(v==null){
    const na = (which==="target") ? naCell(k)
             : (k.noCfg ? `<span class="dash" ${tipAttr(kpiTip(k))} tabindex="0">–</span>` : naCell(k));
    /* ô trống vẫn phải gõ số vào được (nhập bổ sung số còn thiếu) */
    return edPack(k,which) ? editable(k,which,`<span class="dash">–</span>`)+
      ` <span class="badge none" style="font-size:9px">${esc((k&&k.naLabel)||(which==="target"?"chưa cấu hình":"chưa có dữ liệu"))}</span>` : na;
  }
  return editable(k,which,
      `<span>${k.fmt(v)}${k.tmp&&which==="actual"?' <span class="badge acc" style="font-size:9px">tạm thời</span>':""}</span>`)
    + (which==="actual"?dkChip(k):"");
}
/* "dự kiến cả tháng" — chỉ hiện ở kỳ LŨY KẾ (T8 = 15/31 ngày), ngay cạnh THỰC ĐẠT */
function dkChip(k){
  if(!k||!k.meta||!k.meta.prorate||k.meta.duKien==null) return "";
  return ` <span class="dkc" ${tipAttr(kpiTip(k))} tabindex="0">dự kiến cả tháng ${k.fmt(k.meta.duKien)}</span>`;
}
/* TỶ LỆ DỰ KIẾN ĐẠT — kỳ chưa trọn tháng thì hiện 2 số:
   số LỚN = dự kiến cả tháng / target cả tháng (dùng chấm ĐẠT/KHÔNG ĐẠT)
   số nhỏ = thực đạt hiện tại / target cả tháng (tiến độ thật đến hôm nay)     */
function rateCell(k){
  if(!k||k.rate==null) return `<span class="dash" ${tipAttr(kpiTip(k))} tabindex="0">–</span>`;
  const nho = k.coTienDo ? `<i class="rnow">đến hiện tại ${pc1(k.rateNow)}</i>` : "";
  return `<span ${tipAttr(kpiTip(k))} tabindex="0" class="num rht">${pc1(k.rate)}${nho}</span>`;
}
function meterCell(k){
  if(!k||k.rate==null) return `<div class="mrow"><div class="meter"><i class="none" style="width:0"></i></div>${DASH}</div>`;
  const w=clamp(k.rate*100,2,100);
  return `<div class="mrow" ${tipAttr(kpiTip(k))} tabindex="0">
    <div class="meter"><i class="${k.status}" data-w="${w}" style="width:0"></i></div>
    <b class="num" style="min-width:44px;text-align:right">${pc(k.rate)}</b></div>`;
}
function kpiName(k){
  return `<span class="kico">${k.icon?`<span class="i">${ic(k.icon,14)}</span>`:""}<span>${esc(k.name)}</span></span>`;
}
/* badge gọn cho bảng hẹp (khối 3 cột ở Tổng quan) — vẫn đủ icon + chữ */
const BADGE_SHORT={good:"ĐẠT",warn:"KHÔNG ĐẠT",bad:"KHÔNG ĐẠT",none:"CHƯA CÓ DL"};
function badgeMini(k){
  const st=k?k.status:"none";
  const txt=(k&&k.naLabel==="không áp dụng")?"K.A.D":BADGE_SHORT[st];
  return `<span class="badge ${st}" ${tipAttr(kpiTip(k))} tabindex="0">${ic(STATUS_ICON[st],10)}${esc(txt)}</span>`;
}
/* dòng 4 cột chuẩn của file mẫu: TARGET | THỰC ĐẠT | TỶ LỆ | ĐÁNH GIÁ */
function tplRow(k,nameOverride){
  return `<tr>
    <td>${k.icon?`<span class="kico"><span class="i">${ic(k.icon,14)}</span><span>${esc(nameOverride||k.name)}</span></span>`:esc(nameOverride||k.name)}</td>
    <td>${valCell(k,"target")}</td>
    <td>${valCell(k,"actual")}</td>
    <td>${rateCell(k)}</td>
    <td>${badgeMini(k)}</td></tr>`;
}
function infoI(text){ return `<span class="info" ${tipAttr(`<div class="tt">${ic("info",12)}Giải thích</div>${text}`)} tabindex="0">i</span>`; }

/* =============================================================================
   CHARTS — SVG thuần, viewBox logic 900 rộng, tự co theo container.
   Tuân thủ dataviz: thanh ≤24px, bo 4px đầu dữ liệu, lưới hairline liền nét,
   khoảng trắng 2px giữa các thanh, legend khi ≥2 series, nhãn trực tiếp có chọn lọc,
   text KHÔNG mang màu series, và MỌI biểu đồ đều có "bảng số" đi kèm.
   ============================================================================= */
const CH={W:900, ink:"#0E1A2B", ink2:"#3D4C63", muted:"#6E7D93", grid:"#E7ECF3", axis:"#C8D2E0",
  s1:"#2A78D6", s2:"#EB6834", s3:"#1BAF7A", navy:"#102C50", surface:"#FFFFFF",
  st:{good:"#0CA30C",warn:"#F0A202",bad:"#D03B3B",none:"#94A3B8"}};
let chSeq=0;
function chartCard(o){
  /* o: {title, sub, icon, svg, legend, table, note} */
  const id="ch"+(++chSeq);
  return `<figure class="chart card">
    <header><span class="ci">${ic(o.icon||"trendup",16)}</span>
      <div><h3>${o.lk?lblH(o.lk,o.title):esc(o.title)}</h3>${o.sub?`<span class="sub">${esc(o.sub)}</span>`:""}</div>
      <div class="hr">${o.note?infoI(o.note):""}
        <button class="tbtn" data-tbl="${id}" aria-pressed="false">${ic("table",12)}Bảng số</button></div>
    </header>
    <div class="body">
      ${o.legend||""}
      ${o.svg}
      <div class="tblview" id="${id}">${o.table||""}</div>
    </div></figure>`;
}
function legend(items){
  if(!items||items.length<2) return "";
  return `<div class="legend">${items.map(i=>
    `<span><i class="${i.type||""}" style="background:${i.color}"></i>${esc(i.label)}</span>`).join("")}</div>`;
}
const niceMax=v=>{ if(!isFinite(v)||v<=0) return 1;
  const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p;
  return (n<=1?1:n<=1.5?1.5:n<=2?2:n<=2.5?2.5:n<=3?3:n<=4?4:n<=5?5:n<=7.5?7.5:10)*p; };

/* --- BULLET: Thực đạt (thanh) vs Target (vạch) — dùng cho "Δ so với target" --- */
function chBullet(rows,opt){
  opt=opt||{};
  const W=CH.W, padL=opt.padL||178, padR=112, rowH=34, top=12, bot=26;
  const H=top+rows.length*rowH+bot;
  const maxV=niceMax(Math.max(1,...rows.map(r=>Math.max(r.actual||0,r.target||0)))*1.08);
  const iw=W-padL-padR;
  const x=v=>padL+clamp((v||0)/maxV,0,1)*iw;
  let g="";
  /* gridlines hairline solid */
  for(let i=0;i<=4;i++){ const gx=padL+iw*i/4;
    g+=`<line x1="${gx}" y1="${top-4}" x2="${gx}" y2="${top+rows.length*rowH}" stroke="${CH.grid}" stroke-width="1"/>`;
    g+=`<text x="${gx}" y="${H-8}" font-size="10.5" fill="${CH.muted}" text-anchor="middle">${esc(opt.axisFmt?opt.axisFmt(maxV*i/4):f0(maxV*i/4))}</text>`;
  }
  rows.forEach((r,i)=>{
    const cy=top+i*rowH+rowH/2;
    const col=CH.st[r.status||"none"];
    g+=`<text x="${padL-12}" y="${cy+4}" font-size="11.5" font-weight="700" fill="${CH.ink2}" text-anchor="end">${esc(r.label)}</text>`;
    /* track */
    g+=`<rect x="${padL}" y="${cy-9}" width="${iw}" height="18" rx="3" fill="#F1F4F8"/>`;
    if(r.actual!=null){
      const w=Math.max(3,x(r.actual)-padL);
      g+=`<path class="bar-anim" d="${roundRightRect(padL,cy-9,w,18,4)}" fill="${col}"/>`;
    }
    if(r.target!=null){
      const tx=x(r.target);
      g+=`<rect x="${tx-1.5}" y="${cy-13}" width="3" height="26" rx="1.5" fill="${CH.navy}"/>`;
    }
    const lbl = r.actual==null ? "–" : (opt.fmt?opt.fmt(r.actual):f0(r.actual));
    g+=`<text x="${W-padR+9}" y="${cy+4}" font-size="11.5" font-weight="800" fill="${CH.ink}">${esc(lbl)}</text>`;
    const rl = r.rate==null?"":pc(r.rate);
    if(rl) g+=`<text x="${W-6}" y="${cy+4}" font-size="10.5" font-weight="700" fill="${CH.muted}" text-anchor="end">${esc(rl)}</text>`;
  });
  return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria||"Biểu đồ so sánh target và thực đạt")}">${g}</svg>`;
}
function roundRightRect(x,y,w,h,r){
  r=Math.min(r,w,h/2);
  return `M${x},${y} H${x+w-r} A${r},${r} 0 0 1 ${x+w},${y+r} V${y+h-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} H${x} Z`;
}
function roundTopRect(x,y,w,h,r){
  r=Math.min(r,w/2,h);
  return `M${x},${y+h} V${y+r} A${r},${r} 0 0 1 ${x+r},${y} H${x+w-r} A${r},${r} 0 0 1 ${x+w},${y+r} V${y+h} Z`;
}

/* --- GROUPED COLUMNS (≤3 series) --- */
/* Bề rộng viewBox co theo SỐ NHÓM: ít nhóm -> khung hẹp, nhờ đó khi kéo giãn 100%
   theo container biểu đồ không bị cao lêu nghêu (tránh anti-pattern "khối to, loãng"). */
function chColumns(labels,series,opt){
  opt=opt||{};
  const W=opt.W||clamp(620+labels.length*70,700,CH.W), padL=62, padR=14, padT=18, padB=opt.rot?58:34;
  const H=opt.H||270, iw=W-padL-padR, ih=H-padT-padB;
  const maxV=niceMax(Math.max(1,...series.flatMap(s=>s.data.map(v=>Math.abs(v||0))))*1.08);
  const y=v=>padT+ih-clamp((v||0)/maxV,0,1)*ih;
  const n=labels.length, gw=iw/Math.max(1,n), ns=series.length;
  const bw=Math.min(24,Math.max(5,(gw-14)/ns)), gap=2;
  let g="";
  for(let i=0;i<=4;i++){ const gy=padT+ih*i/4, v=maxV*(1-i/4);
    g+=`<line x1="${padL}" y1="${gy}" x2="${W-padR}" y2="${gy}" stroke="${CH.grid}" stroke-width="1"/>`;
    g+=`<text x="${padL-8}" y="${gy+3.5}" font-size="10" fill="${CH.muted}" text-anchor="end">${esc(opt.axisFmt?opt.axisFmt(v):f0(v))}</text>`;
  }
  g+=`<line x1="${padL}" y1="${padT+ih}" x2="${W-padR}" y2="${padT+ih}" stroke="${CH.axis}" stroke-width="1"/>`;
  labels.forEach((lb,i)=>{
    const cx=padL+i*gw+gw/2, x0=cx-(ns*bw+(ns-1)*gap)/2;
    series.forEach((s,j)=>{
      const v=s.data[i]; if(v==null) return;
      const yy=y(v), h=Math.max(1.5,padT+ih-yy), xx=x0+j*(bw+gap);
      g+=`<path class="bar-anim" d="${roundTopRect(xx,yy,bw,h,4)}" fill="${s.color}"
            ${tipAttr(`<div class="tt">${esc(lb)}</div><dl><dt>${esc(s.name)}</dt><dd>${esc(opt.fmt?opt.fmt(v):f0(v))}</dd></dl>`)}></path>`;
    });
    const ly=padT+ih+14;
    if(opt.rot) g+=`<text transform="translate(${cx},${ly+2}) rotate(-32)" font-size="10" fill="${CH.muted}" text-anchor="end">${esc(lb)}</text>`;
    else g+=`<text x="${cx}" y="${ly}" font-size="10.5" fill="${CH.muted}" text-anchor="middle">${esc(lb)}</text>`;
  });
  /* không phóng to quá ~1.15× khung logic -> chiều cao biểu đồ cột luôn ổn định, không "lêu nghêu" */
  return `<svg class="plot" style="max-width:${Math.round(W*1.15)}px" viewBox="0 0 ${W} ${H}"
    role="img" aria-label="${esc(opt.aria||"Biểu đồ cột")}">${g}</svg>`;
}

/* --- STACKED BAR ngang (part-to-whole) --- */
function chStack(segs,opt){
  opt=opt||{};
  const W=CH.W, H=opt.H||58, padL=0, padR=0, y=14, h=26;
  const tot=segs.reduce((s,x)=>s+(x.value||0),0)||1;
  let g="", x=padL, iw=W-padL-padR;
  segs.forEach((s,i)=>{
    let w=(s.value/tot)*iw; if(w<=0) return;
    const gap = i<segs.length-1 ? 2 : 0;
    const ww=Math.max(2,w-gap);
    g+=`<rect class="bar-anim" x="${x}" y="${y}" width="${ww}" height="${h}" rx="${i===0||i===segs.length-1?4:0}" fill="${s.color}"
        ${tipAttr(`<div class="tt">${esc(s.label)}</div><dl><dt>Số tiêu chí</dt><dd>${f0(s.value)}</dd><dt>Tỷ trọng</dt><dd>${pc(s.value/tot)}</dd></dl>`)}></rect>`;
    if(ww>52) g+=`<text x="${x+ww/2}" y="${y+h/2+4}" font-size="11.5" font-weight="800" fill="#fff" text-anchor="middle">${f0(s.value)}</text>`;
    x+=w;
  });
  return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria||"Cơ cấu")}">${g}</svg>`;
}

/* --- ĐƯỜNG XU HƯỚNG THEO THÁNG ------------------------------------------------
   Theo hướng dẫn dataviz: dùng ĐÚNG 3 slot màu đã thẩm định của app (s1/s2/s3),
   lưới hairline liền nét, nhãn trực tiếp ở điểm cuối mỗi đường (không dựa vào chú
   giải để đọc số), tháng CHƯA CÓ DỮ LIỆU để ĐỨT ĐOẠN + đánh dấu ở trục,
   tháng đang được chọn được tô nền nhạt, và luôn có "Bảng số" đi kèm.            */
function chLine(t,opt){
  opt=opt||{};
  const n=t.labels.length;
  const W=clamp(560+n*46,660,CH.W), padL=64, padR=132, padT=20, padB=42;
  const H=opt.H||286, iw=W-padL-padR, ih=H-padT-padB;
  const vals=t.series.flatMap(s=>s.data).filter(v=>v!=null&&isFinite(v));
  const lo=Math.min(0,...vals), hiRaw=Math.max(1,...vals);
  const maxV=niceMax(hiRaw*1.08);
  const x=i=>padL+(n<=1?iw/2:iw*i/(n-1));
  const y=v=>padT+ih-clamp((v-lo)/((maxV-lo)||1),0,1)*ih;
  const COLS=[CH.s1,CH.s2,CH.s3];
  let g="";
  /* nền cho các tháng ĐANG CHỌN */
  if(t.selected&&t.selected.some(Boolean)&&t.selected.some(v=>!v)){
    const half=n<=1?iw/2:iw/(n-1)/2;
    t.selected.forEach((on,i)=>{ if(!on) return;
      g+=`<rect x="${Math.max(padL,x(i)-half)}" y="${padT-6}" width="${Math.min(half*2,iw)}" height="${ih+6}"
        fill="#FFF6C2" opacity=".55"/>`; });
  }
  for(let i=0;i<=4;i++){ const gy=padT+ih*i/4, v=lo+(maxV-lo)*(1-i/4);
    g+=`<line x1="${padL}" y1="${gy}" x2="${W-padR}" y2="${gy}" stroke="${CH.grid}" stroke-width="1"/>`;
    g+=`<text x="${padL-8}" y="${gy+3.5}" font-size="10" fill="${CH.muted}" text-anchor="end">${esc(t.axisFmt?t.axisFmt(v):f0(v))}</text>`;
  }
  g+=`<line x1="${padL}" y1="${padT+ih}" x2="${W-padR}" y2="${padT+ih}" stroke="${CH.axis}" stroke-width="1"/>`;
  /* các đường — đứt đoạn tại tháng không có số */
  t.series.forEach((s,si)=>{
    const col=COLS[si%3];
    let d="", open=false, last=-1;
    s.data.forEach((v,i)=>{
      if(v==null||!isFinite(v)){ open=false; return; }
      d += (open?" L":" M")+x(i)+","+y(v); open=true; last=i;
    });
    if(d) g+=`<path d="${d.trim()}" fill="none" stroke="${col}" stroke-width="${si===1?2:2.4}"
      stroke-linecap="round" stroke-linejoin="round" ${si===1?'stroke-dasharray="6 4"':""}/>`;
    s.data.forEach((v,i)=>{
      if(v==null||!isFinite(v)) return;
      g+=`<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${CH.surface}" stroke="${col}" stroke-width="2"
        ${tipAttr(`<div class="tt">${esc(t.labels[i])}</div><dl><dt>${esc(s.name)}</dt><dd>${esc(t.fmt?t.fmt(v):f0(v))}</dd></dl>`)}></circle>`;
    });
    /* nhãn trực tiếp ở điểm cuối — không bắt người đọc dò chú giải */
    if(last>=0){
      const vy=y(s.data[last]);
      g+=`<text x="${W-padR+8}" y="${vy-3}" font-size="10.5" font-weight="800" fill="${CH.ink}">${esc(t.fmt?t.fmt(s.data[last]):f0(s.data[last]))}</text>`;
      g+=`<text x="${W-padR+8}" y="${vy+9}" font-size="9.5" fill="${CH.muted}">${esc(s.name)}</text>`;
    }
  });
  /* trục X + dấu "chưa có dữ liệu" */
  const noData=i=>t.series.every(s=>s.data[i]==null||!isFinite(s.data[i]));
  const noneIdx=[];
  t.labels.forEach((lb,i)=>{
    const nd=noData(i); if(nd) noneIdx.push(t.labels[i]);
    g+=`<text x="${x(i)}" y="${padT+ih+15}" font-size="10.5" font-weight="${t.selected&&t.selected[i]?"800":"500"}"
      fill="${nd?CH.st.none:(t.selected&&t.selected[i]?CH.ink:CH.muted)}" text-anchor="middle">${esc(lb)}</text>`;
    if(nd) g+=`<text x="${x(i)}" y="${padT+ih+27}" font-size="8.5" fill="${CH.st.none}" text-anchor="middle">chưa có</text>`;
  });
  const svg=`<svg class="plot" style="max-width:${Math.round(W*1.2)}px" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${esc(opt.aria||"Biểu đồ xu hướng theo tháng")}">${g}</svg>`;
  return {svg, noneIdx};
}
/* thẻ "BIỂU ĐỒ XU HƯỚNG THEO THÁNG" hoàn chỉnh (đường + chú giải + bảng số) */
function trendCard(which,S,o){
  o=o||{};
  const t=trendSeries(which,S);
  const COLS=[CH.s1,CH.s2,CH.s3];
  const L=chLine(t,{aria:o.aria||("Xu hướng theo tháng — "+(o.title||which))});
  const rows=t.labels.map((lb,i)=>[
    `<b>${esc(lb)}</b>${t.selected&&t.selected[i]?' <span class="badge navy" style="font-size:9px">đang chọn</span>':""}`,
    ...t.series.map(s=>s.data[i]==null?'<span class="badge none" style="font-size:9px">chưa có dữ liệu</span>'
      :esc(t.fmt?t.fmt(s.data[i]):f0(s.data[i])))
  ]);
  const nNone=t.labels.filter((_,i)=>t.series.every(s=>s.data[i]==null)).length;
  return chartCard({
    title:o.title||LB("chart.trend","Biểu đồ xu hướng theo tháng"),
    sub:`${t.labels.length} tháng · ${scopeLbl(S)}${nNone?` · ${nNone} tháng chưa có dữ liệu`:""}`,
    icon:o.icon||"trendup",
    legend:legend(t.series.map((s,i)=>({label:s.name,color:COLS[i%3],type:i===1?"tick":""}))),
    svg:L.svg,
    table:chTable(["Tháng",...t.series.map(s=>s.name)],rows),
    note:(o.note||t.note)+" Tháng chưa có số thực đạt được để <b>đứt đoạn</b> và ghi “chưa có dữ liệu”, không vẽ thành 0."
  });
}

/* --- bảng số đi kèm mọi biểu đồ (accessibility twin) --- */
function chTable(head,rows){
  return `<div class="tblwrap"><table class="dt">
    <thead><tr>${head.map((h,i)=>`<th class="${i===0?"l":""}">${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i===0?"l":""}">${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

/* =============================================================================
   BANNER / EXEC CARDS / STATES
   ============================================================================= */
/* Dải thông báo KỲ LŨY KẾ — hiện ở các module có KPI khối lượng/tiền khi tháng
   đang xem chưa hết (T8/2026 = 15/31 ngày). Nêu rõ CÁCH so sánh + dự kiến cả tháng. */
function luyKeBar(S,items){
  const D=M(S); if(!D||!isLuyKe(D)||isYear(S)) return "";
  const q=D.ngayDaQua, n=D.ngayTrongThang;
  const dk=(items||[]).filter(x=>x&&x.k&&x.k.meta&&x.k.meta.duKien!=null)
    .map(x=>`${esc(x.label)} <span class="lkv">${x.k.fmt(x.k.meta.duKien)}</span>`).join(" · ");
  return `<div class="lkbar">${ic("calendar",14)}
    <span><b>T${D.thang}/${D.nam} lũy kế ${q}/${n} ngày:</b> target <b>sản lượng · doanh thu</b> đã quy đổi ×${q}/${n};
    <b>chi phí KHÔNG quy đổi</b> (số đã là lũy kế cuối tháng — so thẳng định mức cả tháng);
    chất lượng &amp; đơn giá là số bình quân nên giữ nguyên.</span>
    ${dk?`<span style="margin-left:auto">Dự kiến cả tháng: ${dk}</span>`:""}</div>`;
}
/* Dải nêu rõ CÁCH GỘP khi đang chọn nhiều tháng — để người xem không hiểu nhầm
   là số của 1 tháng, và biết vì sao ô số tạm thời không sửa tay được. */
function gopBar(S){
  if(!isYear(S)) return "";
  const ms=selMonths(S);
  const dsach = S.ky==="Năm" ? `cả năm ${S.nam} (${ms.length} tháng có dữ liệu)` : `${monthsLabel(ms)}/${S.nam}`;
  const noAct = ms.filter(m=>{const D=DB.ky[kyKey(S.nam,m)];
    return D&&D.tinh&&!Object.keys(D.tinh).some(c=>D.tinh[c].sl&&NB(D.tinh[c].sl.act)!=null);});
  return `<div class="gopbar">${ic("layers",15,"gi")}<span>
    <b>Đang xem GỘP ${ms.length} tháng: ${esc(dsach)}.</b>
    Sản lượng · chi phí · doanh thu <b>cộng dồn</b>, target là <b>tổng target cả tháng</b> của các tháng trong kỳ.
    Chất lượng &amp; đơn giá lấy <b>bình quân gia quyền theo sản lượng</b>.${
    noAct.length?` Tháng ${noAct.map(m=>"T"+m).join(", ")} mới có target nên chỉ góp target, không bị tính là 0 —
      các nhóm cộng dồn hiển thị <b>ĐANG THEO KẾ HOẠCH</b> thay vì chấm ĐẠT/KHÔNG ĐẠT.`:""}
    Muốn sửa tay từng ô số thì chọn lại <b>một tháng</b>.
  </span></div>`;
}
function bannerHTML(title,icon,items){
  return `<div class="banner">
    <div class="bttl">${ic(icon,16)}${esc(title)}</div>
    <div class="bitems">${items.join("")}</div></div>`;
}
function bItem(label,icon,value,unit,meta,hero){
  return `<div class="bitem${hero?" hero":""}">
    <div class="bl">${ic(icon,11)}${esc(label)}</div>
    <div class="bv">${value}${unit?`<span class="u">${esc(unit)}</span>`:""}</div>
    ${meta?`<div class="bm">${meta}</div>`:""}</div>`;
}
function bKpi(label,k,icon,hero){
  const v = k.actual==null ? `<span style="color:#FFD500">–</span>` : k.fmt(k.actual);
  const meta = [
    k.target==null?`TARGET: <b style="color:#FFD500">chưa cấu hình</b>`
                  :`TARGET CẢ THÁNG: ${k.fmt(k.target)}`,
    /* kỳ chưa trọn tháng: nêu cả tiến độ thật đến hôm nay bên cạnh tỷ lệ dự kiến */
    `TỶ LỆ DỰ KIẾN ĐẠT: ${k.rate==null?"–":pc1(k.rate)}`
      + (k.coTienDo?` <span style="opacity:.8">(kết quả đến hiện tại ${pc1(k.rateNow)})</span>`:""),
    (k.meta&&k.meta.prorate&&k.meta.duKien!=null)?`DỰ KIẾN CẢ THÁNG: <b style="color:#FFD500">${k.fmt(k.meta.duKien)}</b>`:""
  ].filter(Boolean).join(" · ");
  return `<div class="bitem${hero?" hero":""}" ${tipAttr(kpiTip(k))} tabindex="0">
    <div class="bl">${ic(icon||k.icon||"target",11)}${esc(label)}</div>
    <div class="bv">${v}${k.unit?`<span class="u">${esc(k.unit)}</span>`:""}</div>
    <div class="bm">${meta}</div></div>`;
}
function stateHTML(kind,title,msg,icon){
  return `<div class="state ${kind==="err"?"err":""}">
    <div class="si">${ic(icon||(kind==="err"?"alert":"file"),22)}</div>
    <h4>${esc(title)}</h4><p>${msg}</p></div>`;
}
function emptyCard(title,msg){ return `<div class="card"><div class="body">${stateHTML("empty",title,msg,"file")}</div></div>`; }

/* ---------- ĐÁNH GIÁ box (auto-sinh, người dùng sửa được, lưu vào kho DL) ---------- */
function evalBox(which,S){
  const e=getEval(which,S), key=evalKey(which,S);
  return `<div class="evalbox" data-evalbox="${esc(key)}" data-which="${which}">
    <div class="eb-h">${ic("clipboardcheck",12)}ĐÁNH GIÁ &amp; NHẬN XÉT
      <span class="r">
        ${e.edited?`<span class="badge navy" style="font-size:9px">đã chỉnh</span>`:`<span class="badge none" style="font-size:9px">tự sinh</span>`}
        <button class="minibtn" data-evaledit="${esc(key)}">Sửa</button>
        ${e.edited?`<button class="minibtn" data-evalreset="${esc(key)}">Khôi phục</button>`:""}
      </span></div>
    <div class="eb-t">${esc(e.text)}</div></div>`;
}

