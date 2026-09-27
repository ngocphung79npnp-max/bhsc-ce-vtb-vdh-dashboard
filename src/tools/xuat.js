#!/usr/bin/env node
/* xuat.js — bấm nút xuất trên web, lưu file ra /tmp để kiểm tra.
   Dùng: node src/tools/xuat.js [excel|ppt] [kỳ]   ví dụ: node src/tools/xuat.js ppt 2026-09 */
const {chromium}=require('playwright'); const {serve}=require('./_srv'); const fs=require('fs');
const loai=(process.argv[2]||'excel').toLowerCase(), ky=process.argv[3]||'2026-09';
(async()=>{
  const s=await serve();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const pg=await (await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true})).newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${s.port}/github/index.html`); await pg.waitForTimeout(2500);
  const [y,m]=ky.split('-').map(Number);
  await pg.evaluate(([y,m])=>{Object.assign(ST,{nam:y,thang:m,months:[m],ky:'Tháng'});render();},[y,m]);
  await pg.waitForTimeout(800);
  const sel = loai==='ppt' ? '#bPpt, [data-act="ppt"], button:has-text("PowerPoint")' : '#bXlsOut';
  try{
    const dl=pg.waitForEvent('download',{timeout:120000});
    await pg.click(sel); const d=await dl; const out='/tmp/xuat_'+loai+'.'+(loai==='ppt'?'pptx':'xlsx');
    await d.saveAs(out);
    console.log('OK ->', d.suggestedFilename(), fs.statSync(out).size, 'byte  ·  lưu tại', out);
  }catch(e){ console.log('LỖI:', e.message.split('\n')[0]); }
  console.log('Lỗi trang:', errs.length?errs.slice(0,2):'không có');
  await b.close(); s.close();
})();
