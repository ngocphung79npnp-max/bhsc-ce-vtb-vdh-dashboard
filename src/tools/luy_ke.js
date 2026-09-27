#!/usr/bin/env node
/* luy_ke.js — đổi MỐC LŨY KẾ của 1 kỳ và quy đổi thực đạt theo mốc mới.
   Dùng:  node src/tools/luy_ke.js <db.json> <kỳ> <ngàyMới> [--khong-quy-doi]

   Ví dụ:  node src/tools/luy_ke.js src/db.json 2026-09 14
   · Nhân thực đạt SẢN LƯỢNG + DOANH THU theo tỷ lệ ngàyMới/ngàyCũ
     -> dự kiến cuối tháng và %HT GIỮ NGUYÊN, chỉ đổi mốc hiển thị.
   · KHÔNG đụng: gói bán 2025 (đã hoàn tất 100%), đơn giá, chi phí, chất lượng
     — đúng quy ước của web (2 mục sau không quy đổi lũy kế).
   · --khong-quy-doi : chỉ đổi mốc, giữ nguyên số thực đạt (%HT sẽ tụt).      */
const fs=require('fs');
const [,,f,ky,ngayS,...rest]=process.argv;
if(!f||!ky||!ngayS){ console.error('Dùng: node src/tools/luy_ke.js <db.json> <kỳ> <ngàyMới> [--khong-quy-doi]'); process.exit(1); }
const ngay=+ngayS, noScale=rest.includes('--khong-quy-doi');
const db=JSON.parse(fs.readFileSync(f,'utf8'));
const K=db.ky[ky];
if(!K){ console.error('Không có kỳ',ky); process.exit(1); }
const cu=K.ngayDaQua, hs=ngay/cu;
const BO=new Set(['goi']);                      // gói bán 2025: không quy đổi
let nSL=0,nDT=0;
const doiDV=u=>{
  const sl=u.sl||{}, cats=sl.cats||{};
  if(!noScale){
    for(const [c,o] of Object.entries(cats)){ if(BO.has(c))continue;
      if(typeof o.act==='number'){ o.act*=hs; nSL++; } }
    if(typeof sl.act==='number') sl.act*=hs;
    const A=Object.values(cats).filter(o=>typeof o.act==='number').map(o=>o.act);
    const T=Object.values(cats).filter(o=>typeof o.target==='number').map(o=>o.target);
    if(Object.keys(cats).length) sl.tongTatCa={target:T.length?T.reduce((a,b)=>a+b,0):null,
                                               act:A.length?A.reduce((a,b)=>a+b,0):null};
    for(const [c,o] of Object.entries(u.dt||{})){ if(BO.has(c)||typeof o!=='object')continue;
      for(const k of ['act','actDH']) if(typeof o[k]==='number') o[k]*=hs;
      nDT++; }
  }
};
for(const u of Object.values(K.tinh)){ doiDV(u); if(u.kho) doiDV(u.kho); }
K.ngayDaQua=ngay; K.luyKe = ngay < K.ngayTrongThang;
const dd=String(ngay).padStart(2,'0'), mm=String(K.thang).padStart(2,'0');
K.chuKy = K.luyKe ? `Lũy kế đến ngày ${dd}/${mm}/${K.nam} (${ngay}/${K.ngayTrongThang} ngày)`
                  : `Cả tháng ${K.thang}/${K.nam}`;
fs.writeFileSync(f, JSON.stringify(db), 'utf8');
console.log(`${ky}: mốc ${cu} -> ${ngay} ngày` + (noScale?' (giữ nguyên thực đạt)':` · hệ số ${hs.toFixed(4)} · SL ${nSL} ô · DT ${nDT} nhóm`));
console.log('chuKy:', K.chuKy);
