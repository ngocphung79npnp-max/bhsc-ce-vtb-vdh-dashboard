#!/usr/bin/env node
/* kiemtra.js — quét toàn bộ tab × kỳ: lỗi render, NaN/undefined lọt ra màn hình,
   chữ hướng dẫn nội bộ, tab 10 VƯỢT TRỘI còn nguyên.
   Dùng: node src/tools/kiemtra.js                                            */
const {chromium}=require('playwright'); const {serve}=require('./_srv');
const RO=[/TODO/i,/FIXME/i,/placeholder/i,/lorem ipsum/i,/\bXXX\b/];
(async()=>{
  const s=await serve();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const pg=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push('P:'+e.message));
  pg.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});
  await pg.goto(`http://127.0.0.1:${s.port}/github/index.html`); await pg.waitForTimeout(2500);
  const r=await pg.evaluate((ro)=>{
    const loi=[], nam=[...new Set(Object.keys(DB.ky).map(k=>+k.slice(0,4)))].sort();
    let vt=null, n=0;
    for(const y of nam) for(const m of [1,6,8,9,12]) {
      if(!DB.ky[`${y}-${String(m).padStart(2,'0')}`]) continue;
      for(let tab=0;tab<10;tab++){
        Object.assign(ST,{nam:y,thang:m,months:[m],ky:'Tháng',tab,vung:'TONG',kho:'ALL',loai:'ALL'});
        try{ render(); n++; }catch(e){ loi.push(`${y}-${m} tab${tab}: ${e.message}`); continue; }
        const t=document.body.innerText;
        if(/NaN|undefined|Infinity/.test(t)) loi.push(`${y}-${m} tab${tab}: NaN/undefined trên màn hình`);
        for(const re of ro) if(new RegExp(re.source,re.flags).test(t)) loi.push(`${y}-${m} tab${tab}: chữ nội bộ ${re.source}`);
        if(tab===9 && !vt) vt=(document.querySelector('#m9')||{}).innerText||'';
      }
    }
    return {loi, n, soKy:Object.keys(DB.ky).length, nam, tab10ok:/VƯỢT TRỘI/.test(vt||'')};
  }, RO.map(r=>({source:r.source,flags:r.flags})));
  console.log('Số lần render :', r.n, `(${r.soKy} kỳ · các năm ${r.nam.join(', ')})`);
  console.log('Lỗi render    :', r.loi.length?r.loi.slice(0,8):'không có');
  console.log('Tab 10 VƯỢT TRỘI:', r.tab10ok?'còn nguyên':'!!! MẤT');
  console.log('Lỗi trang     :', errs.length?[...new Set(errs)].slice(0,3):'không có');
  const ok = !r.loi.length && r.tab10ok && !errs.length;
  console.log(ok?'\n>>> ĐẠT':'\n>>> CẦN XEM LẠI');
  await b.close(); s.close(); process.exit(ok?0:1);
})();
