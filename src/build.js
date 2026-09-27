#!/usr/bin/env node
/* build.js — template + thư viện + dữ liệu  ->  github/index.html (+ data.json, vuottroi.json)
   Chạy: node src/build.js [db.json] [vuottroi.json]
   Mặc định đọc src/db.json và src/vuottroi.json                                   */
const fs=require('fs'), p=require('path');
const D=__dirname, R=p.join(D,'..'), GH=p.join(R,'github');
const dbPath = process.argv[2] || p.join(D,'db.json');
const vtPath = process.argv[3] || p.join(D,'vuottroi.json');

let tpl=fs.readFileSync(p.join(D,'app.template.html'),'utf8');
const need=['__LIB_XLSX__','__LIB_PPTX__','__VT_EMBED__','__DB__'];
for(const k of need) if(!tpl.includes(k)){ console.error('THIẾU chỗ giữ chỗ:',k); process.exit(1); }

const dbTxt=fs.readFileSync(dbPath,'utf8');
let DB; try{ DB=JSON.parse(dbTxt) }catch(e){ console.error('db.json KHÔNG hợp lệ:',e.message); process.exit(1) }
let vtTxt=null, vtRaw='null';
if(fs.existsSync(vtPath)){
  vtTxt=fs.readFileSync(vtPath,'utf8');
  try{ vtRaw=JSON.stringify(JSON.parse(vtTxt)) }catch(e){ console.error('vuottroi.json KHÔNG hợp lệ:',e.message); process.exit(1) }
}
const dbStr=JSON.stringify(DB);

tpl = tpl.replace('__LIB_XLSX__', ()=>fs.readFileSync(p.join(D,'lib','xlsx.js'),'utf8'))
         .replace('__LIB_PPTX__', ()=>fs.readFileSync(p.join(D,'lib','pptxgen.js'),'utf8'))
         .replace('__VT_EMBED__', ()=>vtRaw)
         .replace('__DB__',       ()=>dbStr);

fs.mkdirSync(GH,{recursive:true});
fs.writeFileSync(p.join(GH,'index.html'), tpl,   'utf8');
fs.writeFileSync(p.join(GH,'data.json'),  dbStr, 'utf8');
if(vtTxt!==null) fs.writeFileSync(p.join(GH,'vuottroi.json'), vtTxt, 'utf8');
console.log('→ github/index.html', tpl.length, 'ký tự');
console.log('→ github/data.json ', dbStr.length, 'ký tự  ·  số kỳ:', Object.keys(DB.ky||{}).length);
