
/* =============================================================================
   APP — điều phối: bộ lọc, tab, render, modal, cấu hình, import/export
   ============================================================================= */

/* ---------- modal ---------- */
function openModal(title,icon,bodyHTML,footHTML){
  $("#modal").innerHTML=`<header><span class="i">${ic(icon||"eye",16)}</span><h3>${esc(title)}</h3>
      <button class="x" data-close>${ic("x",15)}</button></header>
    <div class="body">${bodyHTML}</div>
    ${footHTML?`<footer>${footHTML}</footer>`:""}`;
  $("#ov").classList.add("on");
}
function closeModal(){ $("#ov").classList.remove("on"); }
$("#ov").addEventListener("click",e=>{ if(e.target.id==="ov"||e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });

/* =============================================================================
   BỘ LỌC — trong đó có CHỌN NHIỀU THÁNG
   ============================================================================= */
/* các nhóm chọn nhanh; hàm ms() trả danh sách tháng ứng với năm đang xem */
const MPRESETS=[
  {id:"nay",  t:"Tháng này",  ms:()=>{const a=monthsOf(ST.nam); return [a.length?a[a.length-1]:ST.thang]}},
  {id:"78",   t:"T7 & T8",    ms:()=>[7,8]},
  /* --- BÁM KẾ HOẠCH 5 THÁNG CUỐI NĂM: cộng dồn dần từ mốc T8 --- */
  {id:"k89",   t:"T8-9",   kh:1, ms:()=>[8,9]},
  {id:"k8910", t:"T8-10",  kh:1, ms:()=>[8,9,10]},
  {id:"k8911", t:"T8-11",  kh:1, ms:()=>[8,9,10,11]},
  {id:"k8912", t:"T8-12",  kh:1, ms:()=>[8,9,10,11,12]},
  {id:"quy",  t:"Quý",        ms:()=>{const q=Math.floor((ST.thang-1)/3); return [q*3+1,q*3+2,q*3+3]}},
  {id:"6t",   t:"6 tháng",    ms:()=>{const e=ST.thang; return [...Array(6)].map((_,i)=>e-5+i).filter(m=>m>=1&&m<=12)}},
  {id:"nam",  t:"Cả năm",     ms:()=>monthsOf(ST.nam), ky:"Năm"},
  {id:"coso", t:"Các tháng đã có số", ms:()=>monthsOf(ST.nam).filter(m=>hasAct(ST.nam,m))}
];
/* tháng có ÍT NHẤT 1 số thực đạt (dùng cho preset "Cả năm" — không kéo theo tháng kế hoạch) */
function hasAct(nam,m){
  const D=DB.ky[kyKey(nam,m)]; if(!D||!D.tinh) return true;
  return Object.keys(D.tinh).some(c=>{const r=D.tinh[c]; return r&&r.sl&&NB(r.sl.act)!=null});
}
const sameSet=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
function setMonths(ms,silent){
  const clean=[...new Set(ms.map(Number))].filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);
  ST.months = clean.length?clean:[ST.thang];
  ST.thang  = ST.months[ST.months.length-1];       // tháng "đại diện" khi cần 1 mốc
  if(ST.months.length>1 && ST.ky!=="Tháng") ST.ky="Tháng";
  if(!silent){ initFilters(); render(); }
}
function initFilters(){
  const ys=yearsOf();
  $("#fNam").innerHTML=ys.map(y=>`<option value="${y}">Năm ${y}</option>`).join("");
  if(ys.indexOf(ST.nam)<0) ST.nam=ys[ys.length-1];
  $("#fKy").innerHTML=["Tuần 1","Tuần 2","Tuần 3","Tuần 4","Tháng","Năm"].map(v=>
    `<option value="${v}">${v==="Tháng"?"Lũy kế tháng":v==="Năm"?"Cả năm (bình quân / cộng dồn)":v}</option>`).join("");
  $("#fVung").innerHTML=[["TONG","Tổng 2 vùng"],[VTB,VTB],[VDH,VDH]]
    .map(([v,t])=>`<option value="${v}">${t}</option>`).join("");
  const ks=KHO_ORDER.filter(k=>ST.vung==="TONG"||KHOMAP[k].vung===ST.vung);
  if(ST.kho!=="ALL"&&ks.indexOf(ST.kho)<0) ST.kho="ALL";
  $("#fKho").innerHTML=`<option value="ALL">Tất cả tỉnh / kho</option>`+
    ks.map(k=>`<option value="${k}">${KHOMAP[k].tinh} (${k})</option>`).join("");
  $("#fSort").innerHTML=SORTS.map(s=>`<option value="${s.v}">${s.t}</option>`).join("");
  $("#fNam").value=ST.nam; $("#fKy").value=ST.ky;
  $("#fVung").value=ST.vung; $("#fKho").value=ST.kho; $("#fSort").value=ST.sort;
  $$("#fLoai button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===ST.loai)));
  renderMonthPicker();
}
function renderMonthPicker(){
  const have=monthsOf(ST.nam), sel=(ST.ky==="Năm")?have:(ST.months||[ST.thang]);
  $("#fThangs").innerHTML=MO.map((t,i)=>{const m=i+1, on=sel.indexOf(m)>=0, co=have.indexOf(m)>=0;
    return `<button type="button" data-mon="${m}" aria-pressed="${on}"
      class="${co?"has":"nodata"}" title="Tháng ${m}${co?"":" — chưa có dữ liệu"}">${m}</button>`}).join("");
  const cur=(ST.ky==="Năm")?have:selMonths(ST);
  $("#fPreset").innerHTML=MPRESETS.map(p=>{
    let ms=[]; try{ms=p.ms()}catch(_){}
    ms=[...new Set(ms)].filter(m=>m>=1&&m<=12).sort((a,b)=>a-b);
    const on = p.ky==="Năm" ? (ST.ky==="Năm") : (ST.ky!=="Năm" && ms.length>0 && sameSet(ms,cur));
    const tip = p.kh ? `Bám kế hoạch: cộng dồn ${esc(p.t)} — target cộng dồn cả kỳ, thực đạt lấy các tháng đã có số`
                     : `Chọn nhanh: ${esc(p.t)}`;
    return `<button type="button" data-preset="${p.id}" aria-pressed="${on}"${p.kh?' class="khbtn"':""} title="${tip}">${esc(p.t)}</button>`;
  }).join("");
  const n=cur.length;
  $("#fMsum").textContent = ST.ky==="Năm" ? `Cả năm ${ST.nam} · ${n} tháng`
    : n>1 ? `${monthsLabel(cur)} · gộp ${n} tháng` : `${monthsLabel(cur)}/${ST.nam} · 1 tháng`;
}
/* thu / mở thanh bộ lọc (khổ hẹp mặc định THU để nội dung không bị đẩy khỏi màn hình) */
function setFilterOpen(on){
  document.body.classList.toggle("nofilter",!on);
  const b=$("#bFilter"); if(b){ b.setAttribute("aria-expanded",String(on)); b.classList.toggle("acc",!on); }
  syncStickyOffsets();   // thu/mở bộ lọc đổi chiều cao filterbar -> tính lại ngưỡng dính tabbar/banner
}
$("#bFilter").addEventListener("click",()=>setFilterOpen(document.body.classList.contains("nofilter")));
function autoFilterOpen(){ setFilterOpen(innerWidth>820); }

function initTabs(){
  $("#tabbar").innerHTML=MODULES.map((m,i)=>
    `<button class="tab" role="tab" data-tab="${i}" aria-selected="${i===ST.tab}">
      <span class="tnum">${i+1}</span>${ic(m.icon,14)}${esc(LB(m.lk,m.ten))}</button>`).join("");
}
$("#fThangs").addEventListener("click",e=>{
  const b=e.target.closest("[data-mon]"); if(!b) return;
  const m=+b.dataset.mon;
  let cur=(ST.ky==="Năm")?monthsOf(ST.nam).slice():selMonths(ST).slice();
  if(ST.ky==="Năm") ST.ky="Tháng";
  /* Ctrl/Cmd/Shift hoặc bấm vào tháng chưa chọn khi đang chọn nhiều = thêm/bớt;
     bấm thường vào 1 tháng = chọn riêng tháng đó (giữ nguyên hành vi 1 tháng mặc định) */
  const toggle = e.ctrlKey||e.metaKey||e.shiftKey||b.getAttribute("aria-pressed")==="true"&&cur.length>1;
  if(toggle){ const i=cur.indexOf(m); if(i>=0) cur.splice(i,1); else cur.push(m); if(!cur.length) cur=[m]; }
  else cur=[m];
  setMonths(cur);
});
$("#fPreset").addEventListener("click",e=>{
  const b=e.target.closest("[data-preset]"); if(!b) return;
  const p=MPRESETS.find(x=>x.id===b.dataset.preset); if(!p) return;
  const ms=p.ms().filter(m=>m>=1&&m<=12);
  if(p.ky==="Năm"){ ST.ky="Năm"; ST.months=ms.length?ms:[ST.thang];
    ST.thang=ST.months[ST.months.length-1]; initFilters(); render(); }
  else { ST.ky="Tháng"; setMonths(ms.length?ms:[ST.thang]); }
  toast(`Đang xem: ${kyLabel(ST)}`);
});
$("#fNam").addEventListener("change",e=>{ST.nam=+e.target.value;
  const a=monthsOf(ST.nam); if(a.length&&!a.some(m=>ST.months.indexOf(m)>=0)) ST.months=[a[a.length-1]];
  ST.thang=ST.months[ST.months.length-1]; initFilters();render()});
$("#fKy").addEventListener("change",e=>{ST.ky=e.target.value;
  if(ST.ky!=="Tháng"&&ST.ky!=="Năm") ST.months=[ST.thang];
  initFilters();render()});
$("#fVung").addEventListener("change",e=>{ST.vung=e.target.value;ST.drill={level:"vung",vung:null,kho:null};initFilters();render()});
$("#fKho").addEventListener("change",e=>{ST.kho=e.target.value;render()});
$("#fSort").addEventListener("change",e=>{ST.sort=e.target.value;render()});
$("#fLoai").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  ST.loai=b.dataset.v; initFilters(); render()});

/* =============================================================================
   NGƯỠNG DÍNH (STICKY) — đo chiều cao THẬT của appbar/filterbar/tabbar sau mỗi
   lần render() rồi ghi vào biến CSS --stick-1/--stick-2/--stick-3 (dùng làm
   "top" cho filterbar/tabbar/banner TỔNG QUAN). Cần đo động vì filterbar có thể
   xuống 1-2-3 dòng tuỳ số bộ lọc/tháng đang bật và bề rộng màn hình, nên một
   con số cố định sẽ lệch (banner/tabbar dính sai chỗ, đè lên nhau).
   Chỉ CỘNG DỒN chiều cao của thanh nào ĐANG THỰC SỰ dính (position:sticky) —
   ở màn hẹp (xem media query .appbar/.filterbar/.tabbar) các thanh này tự
   chuyển sang tĩnh (position:static) để đỡ chiếm màn hình, khi đó banner sẽ tự
   dính sát lên trên (top:0) hoặc ngay dưới appbar, không cần code riêng cho
   từng khổ máy. */
function syncStickyOffsets(){
  const root=document.documentElement.style;
  let offset=0;
  [[".appbar",null],[".filterbar","--stick-1"],[".tabbar","--stick-2"]].forEach(([sel,vout])=>{
    if(vout) root.setProperty(vout, offset+"px");
    const el=$(sel);
    if(el && getComputedStyle(el).position==="sticky") offset+=el.getBoundingClientRect().height;
  });
  root.setProperty("--stick-3", offset+"px");   // banner TỔNG QUAN dính ngay dưới thanh cuối cùng còn dính

  /* Đệm cuối module — position:sticky chỉ dính được trong phạm vi chiều cao của
     khối cha (section.module). Cả CỤM dính (appbar + filterbar + tabbar + banner
     nếu có) đều dùng chung "khối cha" là toàn bộ trang; thanh nào nằm CÀNG THẤP
     trong cụm (top offset càng lớn) thì càng cần nhiều "đất" phía dưới mới giữ
     được vị trí dính tới cuối — nếu không đủ, trình duyệt sẽ tự nhả từng thanh ra
     SỚM DẦN theo thứ tự offset tăng dần (filterbar rồi tabbar rồi appbar…) ngay
     giữa trang dài, dù chưa cuộn hết nội dung thật — đây là hành vi mặc định của
     CSS sticky, không phải lỗi, nhưng không đúng ý "cả cụm đứng yên, không tách
     rời nhau". Khắc phục bằng cách chừa thêm khoảng trống (padding-bottom) ở
     cuối module đang hiển thị, đúng bằng tổng chiều cao cụm dính (offset — tức
     appbar+filterbar+tabbar — cộng thêm banner nếu tab này có) + một chút dư, để
     thanh nằm thấp nhất trong cụm vẫn còn đủ chỗ mà dính cho tới khi cuộn hết nội
     dung thật + phần đệm vô hình này (không ảnh hưởng module khác). */
  const modActive=[...document.querySelectorAll("section.module")].find(el=>!el.hidden);
  if(modActive){
    const b=modActive.querySelector(".banner");
    const need=offset+(b?b.getBoundingClientRect().height:0)+24;
    modActive.style.paddingBottom=need+"px";
  }
}

/* ---------- render orchestration ---------- */
const RENDERERS=[renderM0,renderM1,renderM2,renderM3,renderM4,renderM5,renderM6,renderM7,renderM8,renderM9];
let renderSeq=0;
/* tiêu đề trang — SỬA ĐƯỢC bằng cơ chế "Sửa nhãn" như mọi nhãn khác */
const APP_TITLE_DEF="KẾT QUẢ VẬN HÀNH BHSC CE - VÙNG TRUNG BỘ & DUYÊN HẢI";
function renderTitle(){
  const el=$("#hTitle"); if(!el) return;
  el.innerHTML=lblH("app.title",APP_TITLE_DEF);
  document.title=LB("app.title",APP_TITLE_DEF);
}
function render(){
  const seq=++renderSeq;
  renderTitle();
  const D=M(ST), ms=monthsOf(ST.nam), sel=selMonths(ST);
  /* chip kỳ báo cáo trên header — nêu rõ đang gộp mấy tháng */
  $("#hPeriod").textContent = kyLabel(ST);
  $("#hPeriodSub").textContent = isYear(ST)
    ? (sel.length?`${sel.length} tháng đang gộp · ${scopeLbl(ST)}`:"⚠ Chưa chọn tháng nào có dữ liệu")
    : (D?`${D.chuKy||""} · ${D.ngayDaQua}/${D.ngayTrongThang} ngày · ${scopeLbl(ST)}`:"⚠ Kỳ này chưa có dữ liệu");
  $("#storechips").innerHTML=`<span>Kho dữ liệu ${ST.nam}:</span>`+MO.map((m,i)=>
    `<b class="${ms.indexOf(i+1)>=0?"has":""} ${sel.indexOf(i+1)>=0?"cur":""}" title="Tháng ${i+1}">${i+1}</b>`).join("");
  renderMonthPicker(); updateSaveInd();
  /* tabs */
  $$("#tabbar .tab").forEach(b=>b.setAttribute("aria-selected",String(+b.dataset.tab===ST.tab)));
  MODULES.forEach((m,i)=>{ const el=$("#"+m.id); el.hidden = i!==ST.tab; });
  const host=$("#"+MODULES[ST.tab].id);
  host.classList.add("stale");
  try{
    const html=RENDERERS[ST.tab]();
    if(seq!==renderSeq) return;
    host.innerHTML=html;
  }catch(err){
    console.error("[render]",err);
    host.innerHTML=stateHTML("err","Không dựng được màn hình này",
      `Đã có lỗi khi tính toán: <b>${esc(err.message)}</b>. Thử đổi bộ lọc hoặc bấm nút Tải lại.
       Nếu vẫn lỗi, gửi lại file dữ liệu để kiểm tra.`,"alert");
  }
  host.classList.remove("stale");
  syncStickyOffsets();
  requestAnimationFrame(animate);
}
function animate(){
  $$(".meter i[data-w], .emeter i[data-w]").forEach(el=>{ el.style.width=el.dataset.w+"%"; });
  /* KPI count-up nhẹ cho thẻ điều hành */
  $$(".exec .eval").forEach(el=>{
    if(el._done) return; el._done=true;
    el.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],
      {duration:380,easing:"cubic-bezier(.22,1,.36,1)"});
  });
}
/* =============================================================================
   TỰ LƯU VÀO TRÌNH DUYỆT  (sửa tay + nhãn + ghi chú + cấu hình)
   Mọi lần chạm localStorage đều bọc try/catch: trình duyệt chặn hoặc hết dung
   lượng thì app VẪN CHẠY, chỉ mất phần tự lưu và có cảnh báo rõ ràng.
   ============================================================================= */
const LSKEY="BHSC_CEO_DASHBOARD_v2";
let SAVE={ok:null, at:null, err:""};
function lsGet(){ try{ if(typeof localStorage==="undefined"||!localStorage) return null;
    const s=localStorage.getItem(LSKEY); return s?JSON.parse(s):null; }catch(err){ return null; } }
function lsSet(o){ try{ if(typeof localStorage==="undefined"||!localStorage) throw new Error("Trình duyệt không cho lưu cục bộ");
    localStorage.setItem(LSKEY,JSON.stringify(o)); return true;
  }catch(err){ SAVE.err = /quota|exceed/i.test(err.name+err.message)
      ? "Bộ nhớ trình duyệt đã đầy" : "Trình duyệt không cho lưu cục bộ"; return false; } }
function lsClear(){ try{ localStorage.removeItem(LSKEY); }catch(_){ } }
let saveT=null;
function autoSave(){                                  // gọi sau MỌI thay đổi do người dùng
  clearTimeout(saveT);
  saveT=setTimeout(()=>{
    const ok=lsSet({v:2, ts:Date.now(), edits:DB.edits, labels:DB.labels, notes:DB.notes, config:CONFIG});
    SAVE.ok=ok; SAVE.at=Date.now(); updateSaveInd();
  },700);
}
function updateSaveInd(){
  const el=$("#saveInd"), tx=$("#saveTxt"); if(!el||!tx) return;
  const nE=Object.keys(DB.edits).length, nL=Object.keys(DB.labels).length;
  el.classList.remove("err");
  if(SAVE.ok===false){ el.classList.remove("off"); el.classList.add("err");
    tx.innerHTML=`Không tự lưu được — ${esc(SAVE.err||"trình duyệt chặn")}. Hãy bấm <b>Lưu JSON</b>`;
    el.title="Không dùng được bộ nhớ trình duyệt. Dashboard vẫn chạy bình thường; hãy bấm Lưu JSON để giữ số."; return; }
  if(!nE&&!nL){ el.classList.add("off"); tx.textContent="Chưa có sửa tay"; el.title="Chưa có ô nào được sửa tay."; return; }
  el.classList.remove("off");
  const t=SAVE.at?new Date(SAVE.at):new Date();
  const hh=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");
  tx.innerHTML=`Đã lưu tự động <b>${hh}</b> · ${nE} ô số${nL?` · ${nL} nhãn`:""}`;
  el.title=`Đã tự lưu vào trình duyệt lúc ${hh}. Bấm "Lưu JSON" để có bản sao lưu mang đi được.`;
}
function restoreLocal(){
  const s=lsGet(); if(!s) return false;
  try{
    if(s.edits && typeof s.edits==="object"){ Object.assign(DB.edits,s.edits); }
    if(s.labels&& typeof s.labels==="object"){ Object.assign(DB.labels,s.labels); }
    if(s.notes && typeof s.notes==="object"){ Object.assign(DB.notes,s.notes); }
    if(s.config) Object.assign(CONFIG,deepMerge(CONFIG_DEFAULT,s.config));
    DB.config=CONFIG; bumpEdits(); SAVE.ok=true; SAVE.at=s.ts||Date.now();
    return Object.keys(s.edits||{}).length>0 || Object.keys(s.labels||{}).length>0;
  }catch(err){ console.warn("[restore]",err); return false; }
}

/* =============================================================================
   SỬA TAY TỪNG Ô SỐ — bấm để sửa, Enter/rời ô = ghi, ESC = huỷ
   ============================================================================= */
let edOpen=null;
function fmtForInput(v,sc){
  if(v==null) return "";
  const d = sc===1e6 ? 2 : (sc===0.01 ? 2 : (Math.abs(v)<100?2:0));
  return v.toLocaleString("vi-VN",{minimumFractionDigits:0,maximumFractionDigits:d});
}
function openEdit(cell){
  if(edOpen) closeEdit(false);
  const key=cell.dataset.edcell, sc=+cell.dataset.edsc||1, pr=+cell.dataset.edpr||1;
  const cur=cell.dataset.edval===""?null:+cell.dataset.edval;
  const html=cell.innerHTML;
  const wrap=document.createElement("span");
  wrap.innerHTML=`<input class="edin" type="text" inputmode="decimal" value="${esc(fmtForInput(cur,sc))}"
      aria-label="Sửa giá trị"><span class="edhint">Enter để lưu · ESC để huỷ</span>`;
  cell.innerHTML=""; cell.appendChild(wrap);
  const inp=wrap.querySelector("input"), hint=wrap.querySelector(".edhint");
  edOpen={cell,key,sc,pr,html,inp,hint};
  inp.focus(); inp.select();
  inp.addEventListener("keydown",ev=>{
    if(ev.key==="Enter"){ ev.preventDefault(); commitEdit(); }
    else if(ev.key==="Escape"){ ev.preventDefault(); closeEdit(false); }
  });
  inp.addEventListener("blur",()=>{ setTimeout(()=>{ if(edOpen&&edOpen.inp===inp) commitEdit(); },90); });
}
function closeEdit(rerender){
  if(!edOpen) return;
  const o=edOpen; edOpen=null;
  try{ o.cell.innerHTML=o.html; }catch(_){}
  if(rerender) render();
}
function commitEdit(){
  if(!edOpen) return;
  const o=edOpen, raw=o.inp.value.trim();
  if(raw===""){                                   // để trống = xoá sửa tay ở ô này
    if(DB.edits[o.key]){ delete DB.edits[o.key]; bumpEdits(); autoSave(); edOpen=null; render();
      toast("Đã bỏ sửa tay ở ô này — quay lại số gốc"); return; }
    closeEdit(false); return;
  }
  const v=parseVN(raw);
  if(v==null||!isFinite(v)){                      // SAI -> từ chối, KHÔNG ghi âm thầm
    o.inp.classList.add("bad"); o.hint.classList.add("err");
    o.hint.textContent="Số không hợp lệ — nhập kiểu 1.234,5 hoặc 1234.5";
    o.inp.focus(); o.inp.select();
    toast("Không ghi nhận: “"+raw+"” không phải là số hợp lệ. Nhập kiểu 1.234,5 hoặc 1234.5.");
    return;
  }
  if(v<0){ o.inp.classList.add("bad"); o.hint.classList.add("err");
    o.hint.textContent="Không nhận số âm"; toast("Không ghi nhận: giá trị không được là số âm."); return; }
  /* HIỂN THỊ -> LƯU: bỏ phần quy đổi lũy kế của target rồi nhân hệ số đơn vị */
  const store = v/(o.pr||1)*(o.sc||1);
  const old = DB.edits[o.key] ? DB.edits[o.key].o : readSource(o.key);
  DB.edits[o.key]={v:store, o:old, t:Date.now()};
  bumpEdits(); autoSave();
  edOpen=null; render();
  toast(`Đã ghi nhận số sửa tay — toàn bộ dashboard đã tính lại. Bấm ↺ trên ô để hoàn tác.`);
}
/* đọc SỐ GỐC (từ Excel) của 1 ô, để tooltip và "hoàn tác" luôn có mốc so sánh */
function readSource(key){
  const [mk,code,loai,path]=key.split("|");
  const D=DB.ky[mk]; if(!D||!D.tinh||!D.tinh[code]) return null;
  const base = loai==="kho" ? (D.tinh[code].kho||null) : D.tinh[code];
  const v=base?getPath(base,path):null;
  return NB(v);
}
function undoEdit(key){
  if(!DB.edits[key]) return;
  delete DB.edits[key]; bumpEdits(); autoSave(); render();
  toast("Đã hoàn tác về số gốc từ file Excel");
}
function resetAllEdits(){
  const n=Object.keys(DB.edits).length, nl=Object.keys(DB.labels).length;
  if(!n&&!nl){ toast("Chưa có sửa tay nào để xoá"); return; }
  openModal("Xoá sửa tay, quay lại số gốc","refresh",
    `<p style="font-size:12.5px;line-height:1.7">Thao tác này sẽ xoá <b>${n} ô số</b> đã gõ đè
       và <b>${nl} nhãn</b> đã đổi tên, đưa toàn bộ dashboard về <b>đúng số gốc từ file Excel</b>.</p>
     <p style="font-size:12px;color:var(--muted);margin-top:9px">Ghi chú, đánh giá và cấu hình <b>không</b> bị ảnh hưởng.
       Việc này không thể hoàn tác — nếu cần giữ lại, hãy bấm <b>Lưu JSON</b> trước.</p>`,
    `<button class="btn" data-close>Huỷ</button>
     <button class="btn dan" id="edResetGo">${ic("trash",13)}Xoá hết, quay lại số gốc</button>`);
  $("#edResetGo").onclick=()=>{
    for(const k in DB.edits) delete DB.edits[k];
    for(const k in DB.labels) delete DB.labels[k];
    bumpEdits(); autoSave(); closeModal(); initTabs(); initFilters(); render();
    toast("Đã xoá toàn bộ sửa tay và nhãn — dashboard trở lại số gốc");
  };
}
$("#bEdReset").addEventListener("click",resetAllEdits);

/* =============================================================================
   SỬA NHÃN — bấm đúp vào nhãn, hoặc bật nút "Sửa nhãn" rồi gõ trực tiếp
   ============================================================================= */
function setLabelMode(on){
  LBLMODE=!!on;
  document.body.classList.toggle("lblmode",LBLMODE);
  /* bỏ nội dung cũ của các module đang ẩn -> mở tab nào là dựng mới tab đó theo chế độ hiện hành */
  MODULES.forEach((m,i)=>{ if(i!==ST.tab){ const el=$("#"+m.id); if(el) el.innerHTML=""; } });
  $("#bLbl").setAttribute("aria-pressed",String(LBLMODE));
  $("#bLbl").classList.toggle("acc",LBLMODE);
  initTabs(); render();
  toast(LBLMODE?"Đã bật Sửa nhãn — gõ trực tiếp lên tiêu đề/nhãn, xong bấm lại để tắt"
               :"Đã tắt Sửa nhãn");
}
$("#bLbl").addEventListener("click",()=>setLabelMode(!LBLMODE));
function saveLabel(el){
  const key=el.dataset.lbl, def=el.dataset.lbldef||"", val=el.textContent.trim();
  if(val===""||val===def){ if(DB.labels[key]!=null){ delete DB.labels[key]; autoSave(); } }
  else if(DB.labels[key]!==val){ DB.labels[key]=val; autoSave(); }
}
document.addEventListener("dblclick",e=>{
  const l=e.target.closest("[data-lbl]"); if(!l||LBLMODE) return;
  l.setAttribute("contenteditable","true"); l.focus();
  const r=document.createRange(); r.selectNodeContents(l);
  const s=getSelection(); s.removeAllRanges(); s.addRange(r);
});
document.addEventListener("keydown",e=>{
  const l=e.target.closest&&e.target.closest("[data-lbl][contenteditable='true']"); if(!l) return;
  if(e.key==="Enter"){ e.preventDefault(); l.blur(); }
  if(e.key==="Escape"){ e.preventDefault(); l.textContent=LB(l.dataset.lbl,l.dataset.lbldef); l.blur(); }
});
document.addEventListener("blur",e=>{
  const l=e.target&&e.target.closest&&e.target.closest("[data-lbl]"); if(!l) return;
  saveLabel(l);
  if(!LBLMODE){ l.removeAttribute("contenteditable"); render(); }
},true);

/* ---------- ô tick "Hiện thêm tiêu chí phụ" (sheet CHẤT LƯỢNG) ----------
   Lưu vào CONFIG.hienThi -> đi cùng localStorage và file JSON như mọi tuỳ chọn khác. */
document.addEventListener("change",e=>{
  const c=e.target.closest("#clPhuChk"); if(!c) return;
  CONFIG.hienThi = CONFIG.hienThi || {};
  CONFIG.hienThi.clTieuChiPhu = !!c.checked;
  DB.config = CONFIG; autoSave(); render();
  toast(c.checked ? "Đã hiện thêm các tiêu chí phụ (Phục vụ 5 sao tại kho · Trả NCC + chuyển ĐSD · Hàng hủy · Gói bảo hành)"
                  : "Đã ẩn tiêu chí phụ — sheet Chất lượng chấm đúng 7 tiêu chí như Tổng quan");
});
/* ---------- ô tick "Hiện so sánh Target Vượt Trội" (sheet DOANH THU) ---------- */
document.addEventListener("change",e=>{
  const c=e.target.closest("#dtVtChk"); if(!c) return;
  CONFIG.hienThi = CONFIG.hienThi || {};
  CONFIG.hienThi.dtVuotTroi = !!c.checked;
  DB.config = CONFIG; autoSave(); render();
  toast(c.checked ? "Đã hiện cụm so sánh Target Vượt Trội của nhóm Sửa chữa khách lẻ"
                  : "Đã ẩn cụm so sánh Target Vượt Trội");
});

/* ---------- delegated events ---------- */
document.addEventListener("click",e=>{
  const ec=e.target.closest("[data-edcell]");
  if(ec&&!e.target.closest(".edin")){ e.preventDefault(); openEdit(ec); return; }
  const eu=e.target.closest("[data-edundo]"); if(eu){ e.preventDefault(); undoEdit(eu.dataset.edundo); return; }
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ") return;
  const ec=e.target.closest&&e.target.closest("[data-edcell]");
  if(ec&&!edOpen){ e.preventDefault(); openEdit(ec); }
});
document.addEventListener("click",e=>{
  const t=e.target;
  const tab=t.closest("[data-tab]"); if(tab){ ST.tab=+tab.dataset.tab; render(); return; }
  const go=t.closest("[data-gotab]"); if(go){ ST.tab=+go.dataset.gotab; render();
    window.scrollTo({top:0,behavior:"smooth"}); return; }
  const tbl=t.closest("[data-tbl]"); if(tbl){
    const box=document.getElementById(tbl.dataset.tbl); const on=box.dataset.on==="1";
    box.dataset.on=on?"0":"1"; tbl.setAttribute("aria-pressed",String(!on)); return; }
  const dk=t.closest("[data-drillkpi]"); if(dk){ drillKpi(dk.dataset.drillkpi); return; }
  const dr=t.closest("[data-drill]"); if(dr){
    const v=dr.dataset.drill;
    if(v==="vung") ST.drill={level:"vung",vung:null,kho:null};
    else if(v.startsWith("tinh:")) ST.drill={level:"tinh",vung:v.slice(5),kho:null};
    else if(v.startsWith("kho:")) ST.drill={level:"kho",vung:ST.drill.vung||vungOf(v.slice(4)),kho:v.slice(4)};
    render(); return; }
  const pg=t.closest("[data-page]"); if(pg){
    const [k,n]=pg.dataset.page.split(":"); ST.page[k]=Math.max(0,+n); render(); return; }
  const cfg=t.closest("[data-cfg]"); if(cfg){ openConfig(cfg.dataset.cfg); return; }
  const ee=t.closest("[data-evaledit]"); if(ee){ editEval(ee.dataset.evaledit); return; }
  const er=t.closest("[data-evalreset]"); if(er){ delete NOTES[er.dataset.evalreset]; autoSave(); render(); toast("Đã khôi phục đánh giá tự sinh"); return; }
  const ad=t.closest("[data-actdel]"); if(ad){ delAction(ad.dataset.actdel); return; }
  if(t.closest("#actAdd")){ addAction(); return; }
});

/* =============================================================================
   HỎI ĐÁP (tab riêng) — trả lời bằng số thật, tính lại qua calcQAAnswer()
   ============================================================================= */
function submitQA(qtext){
  const q=String(qtext||"").trim(); if(!q) return;
  const ans=calcQAAnswer(q,ST);
  ST.qa=ST.qa||{history:[]};
  ST.qa.history=(ST.qa.history||[]).concat([{q,scopeTxt:ans.scopeTxt,html:ans.html}]).slice(-30);
  render();
  const el=$("#qaIn"); if(el) el.focus();
  toast(ans.ok?"Đã trả lời — xem bên dưới ô hỏi":"Chưa có dữ liệu phù hợp cho câu hỏi này");
}
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter") return;
  if(e.target&&e.target.id==="qaIn"){ e.preventDefault(); submitQA(e.target.value); }
});
document.addEventListener("click",e=>{
  const qb=e.target.closest("#qaGo"); if(qb){ const el=$("#qaIn"); if(el) submitQA(el.value); return; }
  const qc=e.target.closest("[data-qasample]"); if(qc){ submitQA(qc.dataset.qasample); return; }
});
/* ô ĐÁNH GIÁ — sửa tại chỗ */
function editEval(key){
  const box=document.querySelector(`[data-evalbox="${CSS.escape(key)}"]`); if(!box) return;
  const which=box.dataset.which, cur=getEval(which,ST).text;
  const t=box.querySelector(".eb-t");
  t.outerHTML=`<textarea class="eb-edit">${esc(cur)}</textarea>
    <div style="display:flex;gap:6px;margin-top:6px"><button class="minibtn" data-evalsave="${esc(key)}">Lưu</button>
    <button class="minibtn" data-evalcancel="1">Huỷ</button></div>`;
  box.querySelector("textarea").focus();
  box.addEventListener("click",ev=>{
    if(ev.target.closest("[data-evalsave]")){
      NOTES[key]={text:box.querySelector("textarea").value}; autoSave();
      render(); toast("Đã lưu đánh giá (tự lưu vào trình duyệt) — bấm Lưu JSON để có bản sao lưu");
    }else if(ev.target.closest("[data-evalcancel]")) render();
  });
}
/* Action Center — chỉnh sửa / thêm / xoá */
function setNote(id,f,v){ NOTES[id]=NOTES[id]||{}; NOTES[id][f]=v; autoSave(); }
document.addEventListener("input",e=>{
  const el=e.target.closest("[data-act]"); if(!el) return;
  setNote(el.dataset.act, el.dataset.f, el.tagName==="DIV"?el.textContent:el.value);
});
document.addEventListener("change",e=>{
  const el=e.target.closest("[data-act]"); if(!el) return;
  setNote(el.dataset.act, el.dataset.f, el.value);
  if(el.dataset.f==="tinhTrang"||el.dataset.f==="progress"||el.dataset.f==="ngayHT") render();
});
document.addEventListener("blur",e=>{
  const el=e.target&&e.target.closest&&e.target.closest("[data-act]"); if(!el) return;
  if(el.dataset.f==="tyle"||el.dataset.f==="kpi"||el.dataset.f==="thucDat") render();
},true);
function addAction(){
  const K=actKey(ST), list=manualList(K);
  const id=`${K}|man|${Date.now()}`;
  list.push({id,auto:false,tieuChi:"",noi:"",nguyenNhan:"",hanhDong:"",kpi:"",thucDat:"",rate:null,nhom:""});
  autoSave(); render(); toast("Đã thêm 1 dòng — điền thông tin rồi bấm Lưu JSON");
}
function delAction(id){
  const K=actKey(ST), list=manualList(K), i=list.findIndex(r=>r.id===id);
  if(i>=0) list.splice(i,1); else setNote(id,"deleted",true);
  autoSave(); render(); toast("Đã xoá dòng");
}

/* =============================================================================
   BẢNG CẤU HÌNH — nơi khai báo mọi chỉ tiêu KHÔNG có trong dữ liệu nguồn
   ============================================================================= */
function openConfig(focus){
  const units=[...KHOKHO.map(c=>[c,"kho"]),...KHO_ORDER.map(c=>[c,"nha"])];
  const numIn=(path,val,ph)=>`<input type="number" step="any" data-cfgpath="${esc(path)}"
    value="${val==null?"":val}" placeholder="${esc(ph||"chưa cấu hình")}">`;
  const body=`
  <div class="cfgsec" ${focus==="donGia"?'style="outline:2px solid var(--accent);outline-offset:6px;border-radius:8px"':""}>
    <h4>${ic("coins",15)}ĐƠN GIÁ TRUNG BÌNH — GHI ĐÈ (tuỳ chọn)</h4>
    <p>Từ bản dữ liệu <b>T1-T12/2026</b>, target &amp; thực đạt đơn giá đã có <b>số thật theo từng tỉnh/kho</b>
       trong file nguồn. Các ô dưới đây chỉ dùng khi muốn <b>ghi đè</b> mức chung theo loại hình —
       <b>bỏ trống = dùng số từ file</b> (khuyến nghị).</p>
    <table class="cfgtbl"><thead><tr><th>Loại hình</th><th style="width:150px">THỰC ĐẠT (đ/đơn)</th><th style="width:150px">TARGET (đ/đơn)</th></tr></thead>
      <tbody>
        <tr><td>Bảo hành tại nhà</td><td>${numIn("donGia.thucDatNha",CONFIG.donGia.thucDatNha)}</td>
            <td>${numIn("donGia.targetNha",CONFIG.donGia.targetNha)}</td></tr>
        <tr><td>Bảo hành tại kho</td><td>${numIn("donGia.thucDatKho",CONFIG.donGia.thucDatKho)}</td>
            <td>${numIn("donGia.targetKho",CONFIG.donGia.targetKho)}</td></tr>
      </tbody></table>
    <label style="display:flex;align-items:center;gap:7px;margin-top:8px;font-size:11.5px;font-weight:700;cursor:pointer">
      <input type="checkbox" data-cfgpath="donGia.tamThoi" ${CONFIG.donGia.tamThoi?"checked":""} style="accent-color:var(--navy-700)">
      Đánh dấu đơn giá là “tạm thời” trên toàn dashboard</label>
  </div>

  <div class="cfgsec" ${focus==="sanLuong"?'style="outline:2px solid var(--accent);outline-offset:6px;border-radius:8px"':""}>
    <h4>${ic("pkg",15)}TARGET SẢN LƯỢNG (ĐƠN HÀNG) — GHI ĐÈ (tuỳ chọn)</h4>
    <p>Target &amp; thực đạt sản lượng T1-T12/2026 đã có <b>số thật theo từng tỉnh/kho</b> từ file dữ liệu
       nguồn T1–T12/2026. Chỉ nhập ở đây khi muốn <b>ghi đè</b>; bỏ trống = dùng số từ file.</p>
    <table class="cfgtbl"><thead><tr><th>Cấp</th><th style="width:170px">TARGET (đơn)</th><th>Ghi chú</th></tr></thead><tbody>
      <tr><td><b>Tổng — Bảo hành tại nhà</b></td><td>${numIn("sanLuongTarget.tongNha",CONFIG.sanLuongTarget.tongNha)}</td>
          <td style="font-size:10.5px;color:var(--muted)">Bỏ trống → tự cộng target 12 tỉnh nếu điền đủ</td></tr>
      <tr><td><b>Tổng — Bảo hành tại kho</b></td><td>${numIn("sanLuongTarget.tongKho",CONFIG.sanLuongTarget.tongKho)}</td>
          <td style="font-size:10.5px;color:var(--muted)">Bỏ trống → tự cộng target 2 kho nếu điền đủ</td></tr>
      ${units.map(([c,loai])=>`<tr><td>${esc(tinhOf(c))} <span style="color:var(--muted);font-size:10px">${esc(c)} · ${loai==="kho"?"BH tại kho":"BH tại nhà"}</span></td>
        <td>${numIn("sanLuongTarget.byKho."+c,CONFIG.sanLuongTarget.byKho[c])}</td>
        <td style="font-size:10.5px;color:var(--muted)">Bỏ trống = dùng target thật từ file T1-T8</td></tr>`).join("")}
    </tbody></table>
  </div>

  <div class="cfgsec">
    <h4>${ic("scale",15)}PHÂN BỔ TARGET DOANH THU &amp; CHI PHÍ XUỐNG TỈNH</h4>
    <p>Nguồn chỉ có target ở <b>cấp vùng</b>. Để hiển thị theo tỉnh, dashboard phải phân bổ — đây là
       <b>ước tính có công bố</b>, mọi ô ước tính đều có dấu ⓘ. Chọn cách phân bổ:</p>
    <div class="radiorow">
      ${Object.entries(PHANBO_LABEL).map(([v,t])=>`<label>
        <input type="radio" name="phanbo" data-cfgpath="phanBo.mode" value="${v}" ${CONFIG.phanBo.mode===v?"checked":""}>
        <span><b>${esc(t)}</b>
        <span>${v==="donhang"?"Mặc định — giống bản dashboard đã duyệt các vòng trước."
          :v==="chiphi"?"Dùng chi phí thực tế của tỉnh làm tỷ trọng — hợp khi so sánh hiệu quả chi phí."
          :"Chia đều — chỉ nên dùng khi chưa có cơ sở phân bổ nào khác."}</span></span></label>`).join("")}
    </div>
  </div>

  <div class="cfgsec">
    <h4>${ic("target",15)}NGƯỠNG TRẠNG THÁI KPI</h4>
    <p>Chỉ có <b>2 mức</b>: XANH = ĐẠT · ĐỎ = KHÔNG ĐẠT (XÁM = chưa có dữ liệu / chưa đo).
       Không còn mức trung gian. Chi phí là KPI đảo chiều nên có ngưỡng riêng.</p>
    <table class="cfgtbl"><thead><tr><th>Ngưỡng</th><th style="width:140px">Giá trị (tỷ lệ)</th><th>Ý nghĩa</th></tr></thead><tbody>
      <tr><td>ĐẠT từ</td><td>${numIn("nguong.datTu",CONFIG.nguong.datTu)}</td><td style="font-size:10.5px;color:var(--muted)">1 = 100% · dưới mức này là KHÔNG ĐẠT (đỏ)</td></tr>
      <tr><td>Chi phí — ĐẠT đến</td><td>${numIn("nguong.cpDatDen",CONFIG.nguong.cpDatDen)}</td><td style="font-size:10.5px;color:var(--muted)">Thực chi / định mức ≤ mức này = ĐẠT · trên là VƯỢT ĐỊNH MỨC (đỏ)</td></tr>
    </tbody></table>
  </div>

  <div class="cfgsec">
    <h4>${ic("medal",15)}TRỌNG SỐ PERFORMANCE SCORE</h4>
    <p>Chỉ ảnh hưởng đến điểm xếp hạng ở màn TỈNH/KHO. <b>Không</b> làm thay đổi bất kỳ KPI gốc nào.</p>
    <table class="cfgtbl"><thead><tr><th>Nhóm</th><th style="width:120px">Trọng số</th>
      <th>Nhóm</th><th style="width:120px">Trọng số</th></tr></thead><tbody>
      <tr><td>Chất lượng</td><td>${numIn("scoreWeight.chatLuong",CONFIG.scoreWeight.chatLuong)}</td>
          <td>Sản lượng</td><td>${numIn("scoreWeight.sanLuong",CONFIG.scoreWeight.sanLuong)}</td></tr>
      <tr><td>Đơn giá</td><td>${numIn("scoreWeight.donGia",CONFIG.scoreWeight.donGia)}</td>
          <td>Chi phí</td><td>${numIn("scoreWeight.chiPhi",CONFIG.scoreWeight.chiPhi)}</td></tr>
      <tr><td>Doanh thu</td><td>${numIn("scoreWeight.doanhThu",CONFIG.scoreWeight.doanhThu)}</td><td></td><td></td></tr>
    </tbody></table>
  </div>`;
  openModal("BẢNG CẤU HÌNH — chỉ tiêu không có trong dữ liệu nguồn","settings",body,
    `<button class="btn" data-cfgreset>${ic("refresh",13)}Khôi phục mặc định</button>
     <button class="btn" data-close>Đóng</button>
     <button class="btn acc" data-cfgsave>${ic("save",13)}Áp dụng &amp; lưu vào kho dữ liệu</button>`);
  const modal=$("#modal");
  modal.addEventListener("input",e=>{ const el=e.target.closest("[data-cfgpath]"); if(el) applyCfg(el); });
  modal.addEventListener("change",e=>{ const el=e.target.closest("[data-cfgpath]"); if(el) applyCfg(el); });
  modal.addEventListener("click",e=>{
    if(e.target.closest("[data-cfgsave]")){ DB.config=CONFIG; closeModal(); render();
      toast("Đã áp dụng cấu hình — bấm Lưu JSON để ghi vào kho dữ liệu"); }
    if(e.target.closest("[data-cfgreset]")){
      Object.assign(CONFIG,deepMerge(CONFIG_DEFAULT,{})); DB.config=CONFIG;
      closeModal(); render(); toast("Đã khôi phục cấu hình mặc định"); }
  });
  if(focus){ const el=modal.querySelector(`[data-cfgpath^="${focus}"]`); if(el) setTimeout(()=>el.focus(),120); }
}
function applyCfg(el){
  const path=el.dataset.cfgpath.split("."), last=path.pop();
  let o=CONFIG; for(const p of path){ o[p]=o[p]||{}; o=o[p]; }
  if(el.type==="checkbox") o[last]=el.checked;
  else if(el.type==="radio"){ if(el.checked) o[last]=el.value; }
  else { const v=el.value.trim(); o[last] = v===""?null:(isFinite(+v)?+v:v); }
  DB.config=CONFIG; autoSave();
  clearTimeout(applyCfg._t); applyCfg._t=setTimeout(render,220);   // đổi config -> render lại ngay
}
$("#bCfg").addEventListener("click",()=>openConfig(null));

/* =============================================================================
   KHO DỮ LIỆU — lưu / nạp JSON
   ============================================================================= */
$("#bDbSave").addEventListener("click",()=>{
  DB.config=CONFIG;                       /* kho JSON mang theo: dữ liệu + cấu hình + ghi chú + SỬA TAY + NHÃN */
  const blob=new Blob([JSON.stringify(DB,null,1)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`KHO-DU-LIEU-BHSC-${ST.nam}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast(`Đã lưu: ${Object.keys(DB.ky).length} kỳ · cấu hình · ${Object.keys(NOTES).length} ghi chú · `
    +`${Object.keys(DB.edits).length} ô sửa tay · ${Object.keys(DB.labels).length} nhãn`);
});
$("#bDbLoad").addEventListener("click",()=>$("#jIn").click());
$("#jIn").addEventListener("change",async e=>{const f=e.target.files[0]; if(f) await loadDbFile(f); e.target.value="";});
async function loadDbFile(f){
  try{
    const j=JSON.parse(await f.text());
    if(!j.ky) throw new Error("không đúng định dạng kho dữ liệu");
    Object.assign(DB.ky,j.ky);
    Object.assign(DB.notes,j.notes||{});
    if(j.config) Object.assign(CONFIG,deepMerge(CONFIG_DEFAULT,j.config));
    /* SỬA TAY + NHÃN đi cùng file JSON -> lưu ra rồi nạp lại là giữ nguyên mọi chỉnh sửa */
    if(j.edits && typeof j.edits==="object"){ for(const k in DB.edits) delete DB.edits[k]; Object.assign(DB.edits,j.edits); }
    if(j.labels&& typeof j.labels==="object"){ for(const k in DB.labels) delete DB.labels[k]; Object.assign(DB.labels,j.labels); }
    DB.config=CONFIG; bumpEdits(); autoSave();
    initTabs(); initFilters(); render();
    toast(`Đã nạp kho dữ liệu: ${Object.keys(j.ky).length} kỳ${j.config?" + cấu hình":""}`
      +`${j.edits?` + ${Object.keys(j.edits).length} ô sửa tay`:""}${j.labels?` + ${Object.keys(j.labels).length} nhãn`:""}`);
  }catch(err){ console.error(err); toast("File kho dữ liệu không hợp lệ: "+err.message); }
}

/* =============================================================================
   ĐỌC 7 FILE EXCEL NGUỒN  (port nguyên từ bản trước)
   ============================================================================= */
const G =(ws,r,c)=>{const x=ws[XLSX.utils.encode_cell({r,c})];return x?x.v:null};
const GS=(ws,r,c)=>{const v=G(ws,r,c);return v==null?"":String(v).trim()};
const GN=(ws,r,c)=>{const v=G(ws,r,c);return typeof v==="number"&&isFinite(v)?v:null};
const dims=ws=>XLSX.utils.decode_range(ws["!ref"]||"A1");
function parseWorkbooks(wbs){
  /* NGUỒN MỚI: 1 file duy nhất gồm 9 sheet (DATA_UP_WEB — cũng là cấu trúc của
     bản "Xuất Excel"). Nhận diện xong thì giao hẳn cho bộ đọc v2 ở module xuất/nhập
     Excel; nhánh 7 file cũ bên dưới giữ nguyên, không đụng tới. */
  if(typeof xoLaV2==="function" && xoLaV2(wbs)) return xoDocV2(wbs[0].wb);
  const out={clNhaVung:{},clNhaKho:{},bhTaiKho:[],cpVung:{},cpKhoBH:[],cpNhaKho:[],
    loiNhuan:{},nganhHang:[],doanhThu:{},thiPhanVung:{},thiPhanTinh:[],jobKho:{},targetCP12T:{},
    ngayTrongThang:31,ngayDaQua:null,chuKy:""};
  const find=(...k)=>wbs.find(o=>k.every(x=>o.name.toUpperCase().indexOf(x)>=0));
  const sh=(o,ns)=>{if(!o)return null;for(const n of ns) if(o.wb.Sheets[n])return o.wb.Sheets[n];return null};

  const q=find("CHẤT LƯỢNG"),wq=sh(q,["BCCL_BHTN"]);
  if(wq){const R=dims(wq);
    const rec=r=>({dungHen:{don:GN(wq,r,4),loi:GN(wq,r,5),tyle:GN(wq,r,6),kpi:GN(wq,r,7),ht:GN(wq,r,8),dg:GS(wq,r,9)},
      tayNghe:{don:GN(wq,r,10),loi:GN(wq,r,11),tyle:GN(wq,r,12),kpi:GN(wq,r,13),ht:GN(wq,r,14),dg:GS(wq,r,15)},
      xldd:{don:GN(wq,r,16),loi:GN(wq,r,17),tyle:GN(wq,r,18),kpi:GN(wq,r,19),ht:GN(wq,r,20),dg:GS(wq,r,21)},
      sao:{tyle:GN(wq,r,22),kpi:GN(wq,r,23),ht:GN(wq,r,24),dg:GS(wq,r,25)},
      s5:{don:GN(wq,r,26),loi:GN(wq,r,27),tyle:GN(wq,r,28),kpi:GN(wq,r,29),ht:GN(wq,r,30),dg:GS(wq,r,31)},
      chung:GS(wq,r,32)});
    for(let r=0;r<=R.e.r;r++){const ky=GS(wq,r,1),v=GS(wq,r,2),k=GS(wq,r,3);if(!ky)continue;
      if((v===VTB||v===VDH)&&!k){out.clNhaVung[v]=out.clNhaVung[v]||{};out.clNhaVung[v][ky]=rec(r)}
      if(/^(VTB|VDH)_/.test(k)){out.clNhaKho[k]=out.clNhaKho[k]||{vung:v,ky:{}};out.clNhaKho[k].ky[ky]=rec(r)}}}

  const bk=find("BẢO HÀNH TẠI KHO"),wk=bk?bk.wb.Sheets[bk.wb.SheetNames[0]]:null;
  if(wk){const R=dims(wk);let cur=null;
    for(let r=0;r<=R.e.r;r++){const a=GS(wk,r,1),m=a.match(/^\s*\d\.\s*(.+)$/);
      if(m){cur={ten:m[1].trim(),kho:[],tong:null};out.bhTaiKho.push(cur);continue}
      if(!cur)continue;
      const nm=GS(wk,r,2);
      if(/^(VTB|VDH)_/.test(nm)) cur.kho.push({ten:nm,
        thang:{target:GN(wk,r,3),kq:GN(wk,r,4),tyle:GN(wk,r,5),dg:GS(wk,r,6)},
        t1:{target:GN(wk,r,7),kq:GN(wk,r,8),tyle:GN(wk,r,9),dg:GS(wk,r,10)},
        t2:{target:GN(wk,r,11),kq:GN(wk,r,12),tyle:GN(wk,r,13),dg:GS(wk,r,14)},
        hanhdong:GS(wk,r,22),nguoi:GS(wk,r,23),tg:GS(wk,r,24)});
      if(a.indexOf("TỔNG")===0&&!cur.tong) cur.tong={target:GN(wk,r,3),kq:GN(wk,r,4),tyle:GN(wk,r,5),dg:GS(wk,r,6)}}}

  const cp=find("CP BẢO HÀNH"),wcp=sh(cp,["TK CHI PHÍ"]),wdt=sh(cp,["TK DOANH THU"]),wdb=sh(cp,["DB TỔNG QUAN"]);
  if(wcp){const R=dims(wcp);let sec=0;
    for(let r=0;r<=R.e.r;r++){const a1=GS(wcp,r,1);
      if(a1.indexOf("BẢO HÀNH TẠI KHO")===0){sec=1;continue}
      if(a1.indexOf("BẢO HÀNH TẠI NHÀ")===0){sec=2;continue}
      if(sec===0&&(a1===VTB||a1===VDH||a1==="TOÀN QUỐC"))
        out.cpVung[a1]={target:GN(wcp,r,3),dukien:GN(wcp,r,4),tyle:GN(wcp,r,5),tongcp:GN(wcp,r,6),
          bhTaiNha:GN(wcp,r,7),bhTaiKho:GN(wcp,r,8),tuan:[GN(wcp,r,11),GN(wcp,r,12),GN(wcp,r,13),GN(wcp,r,14)]};
      const v=GS(wcp,r,1),k=GS(wcp,r,2);
      if((v===VTB||v===VDH)&&/^(VTB|VDH)_/.test(k)){
        if(sec===1) out.cpKhoBH.push({vung:v,kho:k,tongcp:GN(wcp,r,3),nhansu:GN(wcp,r,4),cpn:GN(wcp,r,5),
          thuekho:GN(wcp,r,6),thuexe:GN(wcp,r,7),diennuoc:GN(wcp,r,8),vpp:GN(wcp,r,9),
          tuan:[GN(wcp,r,11),GN(wcp,r,12),GN(wcp,r,13),GN(wcp,r,14)]});
        if(sec===2) out.cpNhaKho.push({vung:v,kho:k,tongcp:GN(wcp,r,3),thuong:GN(wcp,r,4),bhxh:GN(wcp,r,5),
          cpql:GN(wcp,r,6),tuan:[GN(wcp,r,11),GN(wcp,r,12),GN(wcp,r,13),GN(wcp,r,14)]});}}}
  if(wdt){const R=dims(wdt);
    for(let r=0;r<=R.e.r;r++){const a=GS(wdt,r,0);
      if((a===VTB||a===VDH||a==="TOÀN QUỐC")&&!out.loiNhuan[a])
        out.loiNhuan[a]={dk:{dt:GN(wdt,r,2),cp:GN(wdt,r,3),ln:GN(wdt,r,4),tyle:GN(wdt,r,5)},
          tt:{dt:GN(wdt,r,6),cp:GN(wdt,r,7),ln:GN(wdt,r,8),tyle:GN(wdt,r,9)},
          chitiet:{dt_nha:GN(wdt,r,12),dt_kho:GN(wdt,r,13),cp_nha:GN(wdt,r,15),cp_kho:GN(wdt,r,16),
            ln_nha:GN(wdt,r,18),ln_kho:GN(wdt,r,19)}}}}
  if(wdb){const R=dims(wdb);
    for(let r=0;r<=R.e.r;r++){const t=GS(wdb,r,12);
      if(t&&t!=="TỔNG"&&t!=="NGÀNH HÀNG"&&GN(wdb,r,14)!=null)
        out.nganhHang.push({ten:t,sl:GN(wdb,r,14),dt:GN(wdb,r,15),cp:GN(wdb,r,16),ln:GN(wdb,r,17),tyle:GN(wdb,r,18)})}
    out.nganhHang=out.nganhHang.slice(0,12)}

  const dv=find("DOANH THU BHSC"),wtq=sh(dv,["TỔNG QUAN"]);
  if(wtq){const R=dims(wtq),CAT=DT_CATS.map(c=>c[0]);let cat=null;
    const nd=GN(wtq,1,2),ndq=GN(wtq,1,3);
    if(nd)out.ngayTrongThang=nd; if(ndq)out.ngayDaQua=ndq;
    for(let r=0;r<=R.e.r;r++){const a=GS(wtq,r,0);
      if(CAT.indexOf(a)>=0){cat=a;continue}
      if(["ĐMX","Ngoài MWG","Các gói BH","Tổng đài - điều phối","Điều phối SC hàng ĐMX"].indexOf(a)>=0){cat=null;continue}
      if(cat&&(a===VTB||a===VDH)){out.doanhThu[a]=out.doanhThu[a]||{};
        out.doanhThu[a][cat]={loai:(DT_CATS.find(c=>c[0]===cat)||[])[1]||"trong",
          target:GN(wtq,r,1),dukien:GN(wtq,r,2),
          tuan:[GN(wtq,r,5),GN(wtq,r,8),GN(wtq,r,11),GN(wtq,r,14)],
          target_tuan:[GN(wtq,r,4),GN(wtq,r,7),GN(wtq,r,10),GN(wtq,r,13)]}}}}

  const mr=find("DOANH THU BHMR"),wss=sh(mr,["SS DOANH THU"]);
  if(wss){const R=dims(wss);
    for(let r=0;r<=R.e.r;r++){const a=GS(wss,r,0),b=GS(wss,r,1);
      if((a===VTB||a===VDH||a==="TOÀN QUỐC")&&!b&&!out.thiPhanVung[a])
        out.thiPhanVung[a]={tong:GN(wss,r,2),tho:GN(wss,r,3),khac:GN(wss,r,4),pvi:GN(wss,r,5),
          mic:GN(wss,r,6),lg:GN(wss,r,7),buudien:GN(wss,r,8),thiphan:GN(wss,r,9)};
      if((a===VTB||a===VDH)&&b) out.thiPhanTinh.push({vung:a,tinh:b,tong:GN(wss,r,2),tho:GN(wss,r,3),
        pvi:GN(wss,r,5),mic:GN(wss,r,6),thiphan:GN(wss,r,9)})}}

  const ck=find("CHI PHÍ BH KHO"),wbc=sh(ck,["BÁO CÁO"]),wtg=sh(ck,["TARGET"]);
  if(wbc){const R=dims(wbc);
    /* Sheet "BÁO CÁO" xếp 5 khối nối tiếp nhau: khối ĐẦU TIÊN là LŨY KẾ THÁNG — và chỉ
       khối này có cột "SL JOB TRẢ" (12) + "CHI PHÍ TB/JOB" (13); sau đó là 4 khối
       "Tuần 1..4" (cột B của dòng nhãn) chỉ có chi phí, không có SL JOB.
       Phải DỪNG ở nhãn "Tuần 1", nếu không các khối tuần ghi đè khối lũy kế và
       sljob/cptb bị null → thẻ KPI SẢN LƯỢNG hiện "–" dù nguồn có số. */
    let endR=R.e.r;
    for(let r=0;r<=R.e.r;r++) if(/^Tuần\s*\d/i.test(GS(wbc,r,1))){endR=r-1;break}
    for(let r=0;r<=endR;r++){const tp=GS(wbc,r,0),k=GS(wbc,r,2);
      if(tp.indexOf("25634")===0&&/^(VTB|VDH)_/.test(k)&&!out.jobKho[k])
        out.jobKho[k]={vung:GS(wbc,r,1),tongcp:GN(wbc,r,4),sljob:GN(wbc,r,12),cptb:GN(wbc,r,13)}}
    const t=GS(wbc,3,0)||GS(wbc,3,1); if(t) out.chuKy=t}
  if(wtg){const R=dims(wtg);
    for(let r=0;r<=R.e.r;r++){const a=GS(wtg,r,0);
      if((a===VTB||a===VDH||a==="TOÀN QUỐC")&&GN(wtg,r,2)!=null&&!out.targetCP12T[a])
        out.targetCP12T[a]={nam:GN(wtg,r,1),thang:[...Array(12)].map((_,i)=>GN(wtg,r,2+i))}}}

  if(out.ngayDaQua==null) out.ngayDaQua=out.ngayTrongThang;
  const ok=Object.keys(out.clNhaVung).length||Object.keys(out.doanhThu).length||Object.keys(out.cpVung).length;
  return ok?out:null;
}
function guessMonth(names){
  for(const n of names){
    let m=n.match(/TH[ÁA]NG\s*0?(\d{1,2})/i)||n.match(/[-_ ]T\s*0?(\d{1,2})\b/i);
    if(m){const v=+m[1];if(v>=1&&v<=12)return v}
  }
  return null;
}
/* ---------- Overlay tiến trình: chặn thao tác NHƯNG vẫn để trình duyệt vẽ lại ---------- */
function busyShow(title,sub,pct){
  const b=$("#busy"); if(!b) return;
  $("#busyTitle").textContent = title || "Đang xử lý…";
  $("#busySub").textContent   = sub || "";
  $("#busyBar").style.width   = (pct==null?0:clamp(pct,0,100))+"%";
  b.classList.add("on");
}
function busyUpdate(sub,pct,title){
  const b=$("#busy"); if(!b||!b.classList.contains("on")) return;
  if(title!=null) $("#busyTitle").textContent=title;
  if(sub!=null)   $("#busySub").textContent=sub;
  if(pct!=null)   $("#busyBar").style.width=clamp(pct,0,100)+"%";
}
function busyHide(){ const b=$("#busy"); if(!b) return; b.classList.remove("on"); $("#busyBar").style.width="0%"; }
/* nhường luồng vẽ THẬT SỰ: rAF (chạy trước khi vẽ) + setTimeout (chạy sau khi đã vẽ) */
const paintYield=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
function fsize(n){
  if(n==null) return "";
  return n>=1048576 ? (n/1048576).toFixed(n>=10485760?0:1)+" MB" : Math.max(1,Math.round(n/1024))+" KB";
}
async function handleFiles(files){
  const xs=[...files].filter(f=>/\.xls[xm]$/i.test(f.name));
  const js=[...files].filter(f=>/\.json$/i.test(f.name));
  if(js.length){await loadDbFile(js[0]); if(!xs.length) return;}
  if(!xs.length) return;
  if(typeof XLSX==="undefined"){toast("Thiếu thư viện đọc Excel trong file");return}
  const wbs=[];
  busyShow("Đang đọc file Excel…",`Chuẩn bị đọc ${xs.length} file…`,1);
  await paintYield();
  try{
    for(let i=0;i<xs.length;i++){
      const f=xs[i];
      busyUpdate(`Đang đọc file ${i+1}/${xs.length} — ${f.name} (${fsize(f.size)})…`, 2+i/xs.length*95);
      /* bắt buộc: chờ trình duyệt vẽ xong khung hình mới rồi mới chạy XLSX.read (đồng bộ, nặng) */
      await paintYield();
      try{
        const buf=await f.arrayBuffer();
        await paintYield();
        wbs.push({name:f.name,wb:XLSX.read(buf,{type:"array"})});
      }catch(_){ toast("Không đọc được: "+f.name); }
    }
    busyUpdate(`Đã đọc xong ${wbs.length}/${xs.length} file.`,100);
    await paintYield();
  }finally{ busyHide(); }
  if(!wbs.length) return;
  const m=guessMonth(wbs.map(w=>w.name))||ST.thang;
  const nEd=Object.keys(DB.edits).length;
  /* nhập lại Excel KHÔNG được âm thầm xoá số sửa tay — hỏi rõ và để người dùng chọn */
  const warnEd = nEd ? `<div class="card" style="border-color:var(--warn);background:var(--warn-bg);margin-bottom:10px">
      <div class="body" style="display:flex;gap:10px;align-items:flex-start">
        <span style="color:var(--warn-tx);flex:none">${ic("alert",20)}</span>
        <div style="font-size:11.5px;line-height:1.6;color:var(--warn-tx)">
          <b>Bạn đang có ${nEd} ô số sửa tay.</b> Dữ liệu Excel mới sẽ thay số gốc của kỳ được chọn.
          Hãy chọn cách xử lý phần sửa tay:
          <div class="radiorow" style="margin-top:7px">
            <label><input type="radio" name="edkeep" value="keep" checked>
              <span><b>Giữ lại sửa tay</b><span>Số đã gõ vẫn được áp lên dữ liệu mới (khuyến nghị nếu chỉ nhập bù tháng khác).</span></span></label>
            <label><input type="radio" name="edkeep" value="drop">
              <span><b>Xoá sửa tay của kỳ được nhập</b><span>Dùng nguyên số từ file Excel mới cho kỳ đó; các kỳ khác giữ nguyên.</span></span></label>
          </div>
        </div></div></div>` : "";
  openModal("Nhập dữ liệu Excel vào kho","upload",
    warnEd+
    `<p style="font-size:12px;margin-bottom:10px">Đã đọc <b>${wbs.length}</b> file: ${wbs.map(w=>esc(w.name)).join(" · ")}</p>
     ${(typeof xoLaV2==="function"&&xoLaV2(wbs))
        ? `<p style="font-size:12px;margin-bottom:10px"><b>Đây là file kho dữ liệu 9 sheet.</b>
             Mọi tháng có trong file sẽ được nạp cùng lúc — ô chọn tháng bên dưới chỉ dùng để xác định năm.</p>`
        : ""}
     <p style="font-size:12px;margin-bottom:10px">Dữ liệu này thuộc kỳ nào?</p>
     <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
       <select class="sel" id="impNam">${[2025,2026,2027].map(y=>`<option ${y===ST.nam?"selected":""}>${y}</option>`).join("")}</select>
       <select class="sel" id="impThang">${MO.map((t,i)=>`<option value="${i+1}" ${i+1===m?"selected":""}>Tháng ${i+1}</option>`).join("")}</select>
       <button class="btn acc" id="impGo">${ic("upload",13)}Nhập vào kho dữ liệu</button>
       <span style="font-size:11px;color:var(--muted)">Kỳ đã có sẽ bị ghi đè.</span></div>`);
  $("#impGo").onclick=async()=>{
    const y=+$("#impNam").value, mm=+$("#impThang").value;
    const keepSel=$("#modal input[name='edkeep']:checked");
    if(keepSel&&keepSel.value==="drop"){
      const pre=kyKey(y,mm)+"|"; let n=0;
      for(const k in DB.edits) if(k.indexOf(pre)===0){ delete DB.edits[k]; n++; }
      if(n){ bumpEdits(); autoSave(); toast(`Đã xoá ${n} ô sửa tay của kỳ ${mm}/${y} theo lựa chọn đã chọn`); }
    }
    busyShow("Đang phân tích dữ liệu…",`Tổng hợp ${wbs.length} file cho kỳ tháng ${mm}/${y}…`,30);
    await paintYield();
    try{
      const d=parseWorkbooks(wbs);
      /* không đọc được thì đóng hộp thoại hẳn, không để lớp phủ treo lại trên màn hình */
      if(!d){ closeModal();
        toast("Không nhận diện được cấu trúc file — cần đúng bộ file nguồn theo tên, "
             +"hoặc 1 file kho dữ liệu 9 sheet (DATA_UP_WEB)"); return; }
      busyUpdate("Đang dựng lại dashboard…",85,"Đang phân tích dữ liệu…");
      await paintYield();
      if(d.v2){
        /* File 9 sheet mang ĐỦ các tháng -> nạp hết một lượt; ô chọn tháng ở trên
           chỉ dùng để xác định NĂM của các kỳ được nhập. */
        if(keepSel&&keepSel.value==="drop"){
          let n=0;
          for(const m2 of d.thang){ const p2=kyKey(y,m2)+"|";
            for(const k in DB.edits) if(k.indexOf(p2)===0){ delete DB.edits[k]; n++; } }
          if(n){ autoSave(); toast(`Đã xoá thêm ${n} ô sửa tay của các kỳ được nhập theo lựa chọn đã chọn`); }
        }
        const r=xoNapV2(d,y);
        ST.nam=r.nam; ST.thang=r.months[r.months.length-1]; ST.months=[ST.thang]; ST.ky="Tháng"; bumpEdits();
        closeModal(); initFilters(); render();
        toast(`Đã nhập ${r.months.length} kỳ (T${r.months.join(", T")}) / ${r.nam}`
             +` · kho hiện có ${Object.keys(DB.ky).length} kỳ. Nhớ bấm Lưu JSON.`);
        return;
      }
      d.nam=y; d.thang=mm; DB.ky[kyKey(y,mm)]=d;
      ST.nam=y; ST.thang=mm; ST.months=[mm]; ST.ky="Tháng"; bumpEdits();
      closeModal(); initFilters(); render();
      toast(`Đã nhập tháng ${mm}/${y} · kho hiện có ${Object.keys(DB.ky).length} kỳ. Nhớ bấm Lưu JSON.`);
    }catch(err){console.error(err);toast("Lỗi khi đọc: "+err.message)}
    finally{ busyHide(); }
  };
}
$("#bXls").addEventListener("click",()=>$("#fIn").click());
$("#fIn").addEventListener("change",e=>{handleFiles(e.target.files); e.target.value="";});
let dragN=0;
window.addEventListener("dragenter",e=>{e.preventDefault();dragN++;$("#drop").classList.add("on")});
window.addEventListener("dragover",e=>e.preventDefault());
window.addEventListener("dragleave",()=>{dragN--;if(dragN<=0){dragN=0;$("#drop").classList.remove("on")}});
window.addEventListener("drop",e=>{e.preventDefault();dragN=0;$("#drop").classList.remove("on");
  handleFiles(e.dataTransfer.files||[])});

/* ---------- Xuất Excel / PDF / Refresh ---------- */
$("#bXlsOut").addEventListener("click",()=>{ exportXlsx(); });
$("#bPdf").addEventListener("click",()=>{
  toast("Đang chuẩn bị bản in PDF…");
  const cur=ST.tab;
  /* render tất cả module để bản in đầy đủ các trang */
  MODULES.forEach((m,i)=>{ if(i===cur) return;
    try{ $("#"+m.id).innerHTML=RENDERERS[i](); }catch(err){ console.warn("print",i,err); }
    $("#"+m.id).hidden=false; });
  setTimeout(()=>{ window.print();
    setTimeout(()=>{ MODULES.forEach((m,i)=>{ $("#"+m.id).hidden = i!==cur; }); },300); },260);
});
$("#bRefresh").addEventListener("click",()=>{ initFilters(); render(); toast("Đã tải lại dashboard từ kho dữ liệu"); });
window.addEventListener("beforeprint",()=>{});
let rz; window.addEventListener("resize",()=>{clearTimeout(rz);rz=setTimeout(()=>{autoFilterOpen();render()},250)});

/* =============================================================================
   XUẤT POWERPOINT — dựng từ ĐÚNG mô hình slide của module TRÌNH CHIẾU,
   nên bản .pptx luôn khớp bản xem trước (kể cả nhận xét vừa nhập).
   ============================================================================= */
/* ---------------------------------------------------------------------------
   Bố cục .pptx theo ĐÚNG khổ biểu mẫu: 13,333 × 7,5 inch (16:9 · 12192000 EMU).
   Phong cách học từ TRANG BÌA: nền ảnh gradient + sóng chấm, tiêu đề Arial đậm
   trắng / vàng, logo Thợ ĐMX góc phải, số slide "01" nền vàng, bảng & thẻ số đặt
   trên nền sáng. Mô hình slide dùng CHUNG với bản xem trước (slideModel).
   --------------------------------------------------------------------------- */
const PW=13.333, PH=7.5, MX=0.42, AVW=PW-MX*2;
const PPT={YEL:"FFD500", WH:"FFFFFF", NAVY:"0B2E63", HDR:"123E7C", BOX:"123E7C",
  PANEL:"FFFFFF", ALT:"EAF6FD", SUM:"FFF3CC", INK:"14243F", MUT:"4E648A",
  SUB:"BFD3EE", HAIR:"D3E4F5",
  GOOD:"0CA30C", BAD:"D03B3B", WARN:"FAB219",
  GOODT:"006300", BADT:"C0272D", WARNT:"8A5A00", NONET:"5C708F"};
const pptTxt =c=>({sg:PPT.GOODT,sw:PPT.WARNT,sb:PPT.BADT,sn:PPT.NONET}[c]||PPT.INK);
const pptFill=c=>({sg:PPT.GOOD ,sw:PPT.WARN ,sb:PPT.BAD ,sn:"8FA3C2"}[c]||"8FA3C2");
const FONT="Arial";
const DA=(typeof DECK_ASSETS!=="undefined")?DECK_ASSETS:null;

async function exportDeck(){
  if(!window.PptxGenJS){ toast("Thiếu thư viện PowerPoint trong file"); return; }
  const S=ST, SL=slideModel(S);
  busyShow("Đang tạo file PowerPoint…",`Dựng ${SL.length} slide theo bộ lọc hiện tại…`,8);
  await paintYield();
  try{
    const p=new PptxGenJS();
    p.defineLayout({name:"DECK169", width:PW, height:PH});
    p.layout="DECK169";
    p.author="Nguyễn Duy Thu (25634)"; p.company="BHSC CE — Thợ Điện Máy Xanh";
    p.title=LB("ppt.title.p","BÁO CÁO ĐIỀU HÀNH BẢO HÀNH & SỬA CHỮA");
    for(let n=0;n<SL.length;n++){
      busyUpdate(`Slide ${n+1}/${SL.length} — ${SL[n].title}`, 8+(n/SL.length)*84);
      if(n%3===0) await paintYield();
      pptSlide(p,SL[n],n,SL.length,S);
    }
    busyUpdate("Đang đóng gói file .pptx…",96);
    await paintYield();
    const nameKy = S.ky==="Năm" ? `Nam-${S.nam}`
      : `${monthsLabel(selMonths(S)).replace(/[^0-9TT→+]/g,"").replace(/[→+]/g,"-")}-${S.nam}`;
    await p.writeFile({fileName:`Bao-cao-dieu-hanh-BHSC-CE-${nameKy}.pptx`});
    toast(`Đã xuất PowerPoint ${SL.length} slide (kèm nhận xét đã gõ)`);
  }catch(err){ console.error(err); toast("Lỗi xuất PowerPoint: "+err.message); }
  finally{ busyHide(); }
}

/* nền + logo + chân trang dùng chung cho MỌI slide (đúng phong cách trang bìa) */
function pptChrome(p,s,idx,tot,isCover){
  if(DA&&DA.bg){ try{ s.addImage({data:DA.bg,x:0,y:0,w:PW,h:PH}); }catch(_){ s.background={color:PPT.NAVY}; } }
  else s.background={color:PPT.NAVY};
  if(DA&&DA.tho){
    const bw=1.86,bh=.62,bx=isCover?PW-.35-bw:PW-MX-bw, by=isCover?.28:.22;
    try{
      s.addShape(p.ShapeType.roundRect,{x:bx,y:by,w:bw,h:bh,fill:{color:"0A2350"},rectRadius:.08,
        line:{color:"27508C",width:.75}});
      s.addImage({data:DA.tho,x:bx+.22,y:by+.115,w:bw-.44,h:(bw-.44)/3.35});
    }catch(_){}
  }
  if(isCover && DA&&DA.dmx){ try{ s.addImage({data:DA.dmx,x:.72,y:.36,w:1.52,h:.40}); }catch(_){} }
  /* chân trang */
  /* lớp phủ tối ở đáy để chữ chân trang / ô nhận xét luôn đọc rõ trên dải sóng chấm */
  s.addShape(p.ShapeType.rect,{x:0,y:PH-1.85,w:PW,h:1.85,fill:{color:"061A3A",transparency:38},line:{width:0}});
  s.addShape(p.ShapeType.line,{x:MX,y:PH-.52,w:AVW,h:0,line:{color:"5C7FB0",width:.75}});
  s.addText("Thợ Điện Máy Xanh · BHSC CE · Vùng Trung Bộ – Vùng Duyên Hải",
    {x:MX,y:PH-.48,w:AVW-1.4,h:.28,fontSize:8.5,fontFace:FONT,color:"9FBBE0"});
  s.addText(`${idx+1} / ${tot}`,{x:PW-MX-1.4,y:PH-.48,w:1.4,h:.28,fontSize:8.5,fontFace:FONT,
    color:PPT.YEL,bold:true,align:"right"});
}
/* ô nhận xét — luôn nằm sát trên chân trang */
function pptNote(p,s,noteTxt,wMax){
  if(!noteTxt) return 0;
  const w=wMax||AVW;
  const h=Math.min(1.0,.42+Math.ceil(noteTxt.length/(w>9?150:80))*.18);
  const y=PH-.62-h;
  s.addShape(p.ShapeType.roundRect,{x:MX,y,w,h,fill:{color:"15315F"},rectRadius:.04,
    line:{color:PPT.YEL,width:1}});
  s.addText("NHẬN XÉT / KẾT LUẬN",{x:MX+.14,y:y+.03,w:3,h:.18,fontSize:7,fontFace:FONT,bold:true,color:PPT.YEL});
  s.addText(noteTxt,{x:MX+.14,y:y+.21,w:w-.28,h:h-.26,fontSize:9.2,fontFace:FONT,color:"F2F7FF",valign:"top",fit:"shrink"});
  return h+.14;
}

function pptSlide(p,sl,idx,tot,S){
  const s=p.addSlide();
  const noteTxt=slideNote(sl.id,S);
  pptChrome(p,s,idx,tot,sl.kind==="cover");

  /* ------------------------------- TRANG BÌA ------------------------------- */
  if(sl.kind==="cover"){
    if(DA&&DA.tech){ try{ s.addImage({data:DA.tech,x:7.32,y:.91,w:5.10,h:6.64}); }catch(_){} }
    s.addText(sl.h1a,{x:.75,y:1.24,w:7.9,h:.78,fontSize:40,fontFace:FONT,bold:true,color:PPT.WH,
      valign:"middle",fit:"shrink"});
    s.addText(sl.h1b,{x:.75,y:2.02,w:7.9,h:.78,fontSize:40,fontFace:FONT,bold:true,color:PPT.YEL,
      valign:"middle",fit:"shrink"});
    s.addShape(p.ShapeType.line,{x:.78,y:2.98,w:7.4,h:0,line:{color:"FFFFFF",width:1}});
    s.addText(sl.sub1,{x:.78,y:3.16,w:7.3,h:.38,fontSize:19,fontFace:FONT,italic:true,bold:true,color:PPT.WH,fit:"shrink"});
    s.addText(sl.sub2,{x:.78,y:3.60,w:7.3,h:.38,fontSize:19,fontFace:FONT,italic:true,bold:true,color:PPT.YEL,fit:"shrink"});
    const cw=Math.max(2.0,Math.min(5.2,.105*String(sl.chip).length+.9));
    s.addShape(p.ShapeType.roundRect,{x:.78,y:4.24,w:cw,h:.46,fill:{color:PPT.YEL},rectRadius:.23});
    s.addText(sl.chip,{x:.78,y:4.24,w:cw,h:.46,fontSize:13,fontFace:FONT,bold:true,color:PPT.NAVY,
      align:"center",valign:"middle",fit:"shrink"});
    s.addText(sl.foot,{x:.78,y:4.86,w:6.4,h:.3,fontSize:10,fontFace:FONT,color:PPT.SUB});
    pptNote(p,s,noteTxt,6.4);
    s.addNotes(noteTxt||"");
    return;
  }

  /* --------------------------- ĐẦU SLIDE (số + tiêu đề) --------------------------- */
  s.addShape(p.ShapeType.roundRect,{x:MX,y:.30,w:.66,h:.46,fill:{color:PPT.YEL},rectRadius:.06});
  s.addText(String(sl.n).padStart(2,"0"),{x:MX,y:.30,w:.66,h:.46,fontSize:19,fontFace:FONT,bold:true,
    color:PPT.NAVY,align:"center",valign:"middle"});
  s.addText(LB("ppt.sl."+sl.id,sl.title),{x:1.20,y:.26,w:PW-1.20-2.5,h:.46,fontSize:22,fontFace:FONT,
    bold:true,color:PPT.WH,valign:"middle",fit:"shrink"});
  s.addText(sl.sub,{x:1.22,y:.74,w:PW-1.22-2.5,h:.26,fontSize:9.5,fontFace:FONT,color:PPT.SUB,fit:"shrink"});

  const noteH=pptNote(p,s,noteTxt,AVW);
  const yTop=1.14, yBot=PH-.74-noteH;
  /* --- đo chiều cao các khối cố định, phần còn lại chia cho bảng --- */
  const fixed=b=>{
    if(b.kind==="cap")   return .24;
    if(b.kind==="note")  return .20+Math.floor(String(b.t).length/165)*.16;
    if(b.kind==="five")  return .92;
    if(b.kind==="cards") return b.cards.some(c=>c.big)?1.16:1.06;
    /* dải hành động MỎNG (slide đã kín bảng) thấp hơn hẳn hộp thường */
    if(b.kind==="boxes"&&b.slim) return Math.max(.62, .26+Math.max(...b.boxes.map(x=>x.items.length))*.155);
    if(b.kind==="boxes") return Math.max(.95, .40+Math.max(...b.boxes.map(x=>x.items.length))*.235);
    if(b.kind==="strip") return 1.06;
    return null;
  };
  const gap=.12;
  const tbls=sl.blocks.filter(b=>fixed(b)===null);
  const used=sl.blocks.reduce((a,b)=>a+(fixed(b)||0),0)+gap*(sl.blocks.length-1);
  const tblRoom=Math.max(.6,(yBot-yTop-used));
  /* chia không gian bảng theo số dòng để bảng dài được nhiều chỗ hơn */
  const wTot=tbls.reduce((a,b)=>a+b.body.length+1.6,0)||1;
  let y=yTop;
  for(const b of sl.blocks){
    const fh=fixed(b);
    if(fh===null){ y+=pptTable(p,s,b, y, tblRoom*((b.body.length+1.6)/wTot))+gap; }
    else { pptBlock(p,s,b,y,fh); y+=fh+gap; }
  }
  s.addNotes(noteTxt||"");
}

function pptBlock(p,s,b,y,h){
  if(b.kind==="cap"){
    s.addText(b.t,{x:MX,y,w:AVW,h:.22,fontSize:9.5,fontFace:FONT,italic:true,bold:true,color:PPT.SUB});
    return;
  }
  if(b.kind==="note"){
    s.addText(String(b.t).replace(/<[^>]+>/g,""),{x:MX,y,w:AVW,h,fontSize:8.4,fontFace:FONT,
      color:"AFC6E6",valign:"top",fit:"shrink"});
    return;
  }
  if(b.kind==="five"){
    s.addShape(p.ShapeType.roundRect,{x:MX,y,w:AVW,h,fill:{color:"163C74"},rectRadius:.06,
      line:{color:"3A6098",width:.75}});
    if(b.title) s.addText(b.title,{x:MX+.14,y:y+.05,w:AVW-.28,h:.2,fontSize:8.5,fontFace:FONT,
      bold:true,color:PPT.YEL,fit:"shrink"});
    /* CHIA ĐỀU THEO SỐ Ô THẬT (5 hoặc 6) — cắm cứng 5 sẽ làm ô cuối tràn ra ngoài
       khung khi dải có thêm cột "KẾT QUẢ ĐẾN HIỆN TẠI".                        */
    const n6=Math.max(1,b.items.length), g=.12;
    const iw=(AVW-.28-g*(n6-1))/n6, iy=y+.28, ih=h-.36;
    const fsV=n6>=6?11.2:12.5, fsL=n6>=6?6.1:6.6;
    b.items.forEach((x,i)=>{
      const ix=MX+.14+i*(iw+g);
      s.addShape(p.ShapeType.roundRect,{x:ix,y:iy,w:iw,h:ih,fill:{color:PPT.PANEL},rectRadius:.04});
      s.addText(x.l,{x:ix+.07,y:iy+.03,w:iw-.14,h:.20,fontSize:fsL,fontFace:FONT,bold:true,color:PPT.MUT,fit:"shrink"});
      s.addText(x.v,{x:ix+.07,y:iy+.22,w:iw-.14,h:ih-.26,fontSize:fsV,fontFace:FONT,bold:true,
        color:x.c?pptTxt(x.c):PPT.INK,valign:"middle",fit:"shrink"});
    });
    return;
  }
  if(b.kind==="cards"){
    const n=b.cards.length, g=.13, w=(AVW-g*(n-1))/n;
    b.cards.forEach((c,i)=>{
      const x=MX+i*(w+g);
      s.addShape(p.ShapeType.roundRect,{x,y,w,h,fill:{color:PPT.PANEL},rectRadius:.05});
      s.addShape(p.ShapeType.rect,{x,y:y+.04,w:.075,h:h-.08,fill:{color:PPT.YEL}});
      s.addText(c.l,{x:x+.17,y:y+.05,w:w-.28,h:.20,fontSize:7.6,fontFace:FONT,bold:true,color:PPT.MUT,fit:"shrink"});
      s.addText(c.v,{x:x+.17,y:y+.24,w:w-.28,h:.38,fontSize:c.big?19:16,fontFace:FONT,bold:true,
        color:PPT.NAVY,valign:"middle",fit:"shrink"});
      if(c.sub) s.addText(c.sub,{x:x+.17,y:y+.62,w:w-.28,h:.26,fontSize:6.8,fontFace:FONT,color:PPT.MUT,
        valign:"top",fit:"shrink"});
      if(c.dg){
        const cls=dkCls(c.st), pw=Math.min(w-.34,.055*c.dg.length+.34), py=y+h-.28;
        s.addShape(p.ShapeType.roundRect,{x:x+.17,y:py,w:pw,h:.21,fill:{color:pptFill(cls)},rectRadius:.105});
        s.addText(c.dg,{x:x+.17,y:py,w:pw,h:.21,fontSize:7,fontFace:FONT,bold:true,color:PPT.WH,
          align:"center",valign:"middle",fit:"shrink"});
      }
    });
    return;
  }
  if(b.kind==="boxes"){
    const n=b.boxes.length, g=.16, w=(AVW-g*(n-1))/n;
    b.boxes.forEach((bx,i)=>{
      const x=MX+i*(w+g);
      s.addShape(p.ShapeType.roundRect,{x,y,w,h,fill:{color:PPT.BOX},rectRadius:.05,
        line:{color:"3A6098",width:.75}});
      const fsT=b.slim?8.4:9.5, fsI=b.slim?7.1:8, padT=b.slim?.04:.06, yI=b.slim?.24:.30;
      s.addText(bx.t,{x:x+.16,y:y+padT,w:w-.32,h:b.slim?.18:.22,fontSize:fsT,fontFace:FONT,bold:true,color:PPT.YEL,fit:"shrink"});
      s.addText(bx.items.map(t=>({text:String(t),options:{bullet:{code:"25AA"},breakLine:true}})),
        {x:x+.20,y:y+yI,w:w-.38,h:h-yI-.06,fontSize:fsI,fontFace:FONT,color:"E7EFFA",
         lineSpacingMultiple:b.slim?1.06:1.12,valign:"top",fit:"shrink"});
    });
    return;
  }
  if(b.kind==="strip"){
    const n=b.cards.length||1, g=.11, w=(AVW-g*(n-1))/n;
    b.cards.forEach((c,i)=>{
      const x=MX+i*(w+g);
      s.addShape(p.ShapeType.roundRect,{x,y,w,h,fill:{color:PPT.PANEL},rectRadius:.04});
      s.addShape(p.ShapeType.rect,{x,y,w,h:.055,fill:{color:PPT.YEL}});
      s.addText(`${c.n}. ${c.t}`,{x:x+.10,y:y+.09,w:w-.20,h:.26,fontSize:7.4,fontFace:FONT,bold:true,
        color:PPT.NAVY,valign:"top",fit:"shrink"});
      s.addText(c.lines.map(l=>({text:`${l[0]}: ${l[1]}`,options:{breakLine:true,
        color: l[0]==="HIỆN TRẠNG"?PPT.BADT:"3A4E70"}})),
        {x:x+.10,y:y+.36,w:w-.20,h:h-.44,fontSize:6.1,fontFace:FONT,color:"3A4E70",
         lineSpacingMultiple:1.05,valign:"top",fit:"shrink"});
    });
    return;
  }
}

/* ---- bảng: đầu bảng navy, thân trắng / xanh nhạt, dòng TỔNG nền vàng nhạt ---- */
function pptTable(p,s,b,y,room){
  const nHead=(b.group?1:0)+1;
  const nRow=b.body.length;
  const rowH=clamp((room-nHead*.30)/Math.max(1,nRow), .132, b.tall?.54:.30);
  const headH=b.tall?.36:(b.small?.25:.27);
  /* cột: chuẩn hoá về đúng bề rộng khả dụng */
  let cw=(b.w&&b.w.length===b.head.length)?b.w.slice():b.head.map(()=>1);
  const sum=cw.reduce((a,c)=>a+c,0); cw=cw.map(c=>c*AVW/sum);
  /* co chữ theo chiều cao dòng thực tế để không dòng nào tràn ô */
  const shrink=clamp(rowH/(b.tall?.34:.24),.72,1);
  const fs = Math.max(5.4,(b.small?6.6:8.2)*shrink), hfs=Math.max(5.2,(b.small?6.4:7.8)*shrink);
  const rows=[];
  if(b.group){
    const gr=[]; let gi=0;
    for(const g of b.group){
      gr.push({text:g.t,options:{colspan:g.n,bold:true,color:PPT.YEL,fill:{color:PPT.NAVY},
        align:"center",valign:"middle",fontSize:hfs,fontFace:FONT}});
      gi+=g.n;
    }
    rows.push(gr);
  }
  rows.push(b.head.map((h,i)=>({text:h,options:{bold:true,color:PPT.WH,fill:{color:PPT.HDR},
    align:(i>0&&!b.lalign)?"center":"left",valign:"middle",fontSize:hfs,fontFace:FONT}})));
  b.body.forEach((r,ri)=>{
    const isSum=!!(r&&r.sum), cells=isSum?r.cells:r;
    rows.push(cells.map((c,i)=>{
      const cls=cellCls(c), lv=cellLv(c);
      return {text:cellTxt(c), options:{
        color: isSum?PPT.NAVY:(cls?pptTxt(cls):PPT.INK),
        bold: isSum || !!cls || lv===0 || lv===1,
        fill: {color: isSum?PPT.SUM:(ri%2?PPT.ALT:PPT.PANEL)},
        align: (i>0&&!b.lalign)?"center":"left",
        valign:"middle", fontSize:fs, fontFace:FONT,
        margin: lv===2?[1,2,1,7]:[1,2,1,2]
      }};
    }));
  });
  s.addTable(rows,{x:MX,y,w:AVW,colW:cw,rowH,
    border:{type:"solid",color:PPT.HAIR,pt:.4},valign:"middle",fontFace:FONT,autoPage:false});
  /* Ô có xuống dòng thì PowerPoint tự cao thêm — ước lượng lại chiều cao THẬT của bảng
     để khối phía dưới (ghi chú / hộp) không bị bảng đè lên.                          */
  let bodyH=nRow*rowH;
  if(b.wrap){
    const lineH=fs/72*1.42;
    bodyH=0;
    for(const r of b.body){
      const cells=(r&&r.sum)?r.cells:r;
      let ln=1;
      cells.forEach((c,i)=>{
        const t=cellTxt(c); if(!t) return;
        const per=Math.max(4,Math.floor((cw[i]-.10)/(fs*.0072)));
        ln=Math.max(ln,Math.ceil(t.length/per));
      });
      bodyH+=Math.max(rowH, ln*lineH+.10);
    }
  }
  return nHead*headH+bodyH+.10;
}
$("#bPpt").addEventListener("click",()=>{ ST.tab=7; render(); exportDeck(); });

/* =============================================================================
   BOOT
   ============================================================================= */
(function boot(){
  let restored=false;
  try{
    $("#logoImg").src = LOGO_SRC;
    restored = restoreLocal();                 // nạp lại sửa tay / nhãn đã tự lưu
    initTabs(); initFilters(); autoFilterOpen();
    const ms=monthsOf(ST.nam);
    if(ms.length && ms.indexOf(ST.thang)<0) ST.thang=ms[ms.length-1];
    ST.months=[ST.thang];
    render();
    if(restored) setTimeout(()=>toast(
      `Đã khôi phục ${Object.keys(DB.edits).length} ô số sửa tay và ${Object.keys(DB.labels).length} nhãn đã lưu tự động trong trình duyệt`),700);
  }catch(err){
    console.error("[boot]",err);
    $("#main").innerHTML=stateHTML("err","Không khởi tạo được dashboard",esc(err.message),"alert");
  }finally{
    setTimeout(()=>$("#loading").classList.add("off"),260);
  }
  /* GitHub Pages: tự nạp data.json cạnh index.html */
  (async()=>{
    if(!/^https?:$/.test(location.protocol)) return;
    try{
      const r=await fetch("data.json",{cache:"no-store"}); if(!r.ok) return;
      const j=await r.json(); if(!j.ky) return;
      Object.assign(DB.ky,j.ky); Object.assign(DB.notes,j.notes||{});
      if(j.config) Object.assign(CONFIG,deepMerge(CONFIG_DEFAULT,j.config));
      initFilters(); render();
      toast(`Đã nạp kho dữ liệu từ máy chủ: ${Object.keys(j.ky).length} kỳ`);
    }catch(_){}
  })();
})();

