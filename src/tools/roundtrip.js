#!/usr/bin/env node
/* roundtrip.js — bấm "Xuất Excel" rồi nhập lại chính file đó, đối chiếu DB.ky
   trước/sau phải khớp tuyệt đối (bỏ qua actDH/goiGop là khoá sổ sách tạm).
   Dùng: node src/tools/roundtrip.js                                          */
const {chromium}=require('playwright'); const {serve}=require('./_srv');
(async()=>{
  const s=await serve();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1600,height:900},acceptDownloads:true});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${s.port}/github/index.html`); await pg.waitForTimeout(2500);
  const norm=()=>pg.evaluate(()=>{
    const f=(o,k)=>{ if(!o||typeof o!=='object') return o;
      if(Array.isArray(o)) return o.map(x=>f(x));
      if(k==='trong'&&'act' in o){ const eff=(o.goiGop&&o.actDH!=null)?o.actDH:o.act;
        const r={}; for(const j in o){ if(j==='actDH'||j==='goiGop')continue; r[j]= j==='act'?eff:f(o[j],j);} return r; }
      const r={}; for(const j in o){ if(j==='actDH'||j==='goiGop')continue; r[j]=f(o[j],j);} return r; };
    return f(DB.ky);
  });
  const truoc=await norm();
  const dl=pg.waitForEvent('download',{timeout:120000});
  await pg.click('#bXlsOut'); const d=await dl; await d.saveAs('/tmp/_rt.xlsx');
  await pg.setInputFiles('#fIn','/tmp/_rt.xlsx'); await pg.waitForTimeout(2000);
  const nut=await pg.$('#impGo'); if(!nut){ console.log('!!! không thấy nút nhập'); process.exit(1); }
  await nut.click(); await pg.waitForTimeout(9000);
  const sau=await norm();
  const d2=[]; (function w(x,y,p){ if(d2.length>30) return;
    const a=x&&typeof x==='object', c=y&&typeof y==='object';
    if(a&&c){ for(const k of new Set([...Object.keys(x),...Object.keys(y)])) w(x[k],y[k],p+'/'+k); }
    else if(JSON.stringify(x)!==JSON.stringify(y)){
      if(typeof x==='number'&&typeof y==='number'&&Math.abs(x-y)<0.01) return;
      d2.push(`${p}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`); } })(truoc,sau,'');
  console.log('File xuất :', d.suggestedFilename());
  console.log('Số điểm khác:', d2.length); d2.slice(0,10).forEach(x=>console.log('  ',x));
  console.log('Lỗi trang :', errs.length?errs.slice(0,2):'không có');
  console.log(d2.length?'\n>>> CẦN XEM LẠI':'\n>>> VÒNG KHÉP KÍN ĐẠT');
  await b.close(); s.close(); process.exit(d2.length?1:0);
})();
