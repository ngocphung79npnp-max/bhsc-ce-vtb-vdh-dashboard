#!/usr/bin/env node
/* assemble.js — ghép parts/ thành app.template.html
   Chạy: node src/assemble.js
   Template vẫn còn 4 chỗ giữ chỗ: __LIB_XLSX__ __LIB_PPTX__ __VT_EMBED__ __DB__  */
const fs=require('fs'), p=require('path');
const D=__dirname, PT=p.join(D,'parts');
const M=JSON.parse(fs.readFileSync(p.join(PT,'_manifest.json'),'utf8'));
const rd=f=>fs.readFileSync(p.join(PT,f),'utf8');
let out=rd(M.head);
M.blocks.forEach((b,i)=>{
  out += M.seps[i] + b.tag + (b.lib ? b.lib : rd(b.file)) + '</script>';
});
out += rd(M.tail);
fs.writeFileSync(p.join(D,'app.template.html'), out, 'utf8');
console.log('→ app.template.html', out.length, 'ký tự');
