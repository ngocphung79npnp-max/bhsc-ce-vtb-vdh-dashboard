#!/usr/bin/env node
/* nap_kho.js — nạp file KHO DỮ LIỆU (bản Excel 9 sheet do chính web xuất ra,
   cùng bố cục với Google Sheet nguồn) trở lại thành db.json, đi ĐÚNG luồng
   import của web (#fIn -> #impGo) nên mọi quy tắc nghiệp vụ do web tự áp.

   Dùng:  node src/tools/nap_kho.js <file.xlsx> [db-ra.json]
   Mặc định ghi ra src/db.json (build.js đọc file này).

   LƯU Ý: import của web GIỮ NGUYÊN mốc lũy kế (ngayDaQua/chuKy) và các kỳ
   KHÔNG có trong file (ví dụ 2027). Muốn đổi mốc lũy kế dùng tools/luy_ke.js  */
const {chromium}=require('playwright');
const path=require('path'), fs=require('fs'), http=require('http');
const SRCDIR=path.join(__dirname,'..','..');           // /home/claude/bc
const SRC=process.argv[2];
const OUT=process.argv[3]||path.join(__dirname,'..','db.json');
if(!SRC||!fs.existsSync(SRC)){ console.error('Thiếu file nguồn. Dùng: node src/tools/nap_kho.js <file.xlsx>'); process.exit(1); }

const MIME={'.html':'text/html; charset=utf-8','.json':'application/json',
            '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const srv=http.createServer((q,s)=>{
  const fp=path.join(SRCDIR,decodeURIComponent(q.url.split('?')[0]));
  if(!fp.startsWith(SRCDIR)||!fs.existsSync(fp)){s.writeHead(404);return s.end('404')}
  s.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
  fs.createReadStream(fp).pipe(s);
});
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const P=srv.address().port;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const pg=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push('P:'+e.message));
  pg.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});

  await pg.goto(`http://127.0.0.1:${P}/github/index.html`);
  await pg.waitForTimeout(2500);
  const truoc=await pg.evaluate(()=>Object.keys(DB.ky).length);

  await pg.setInputFiles('#fIn', SRC);
  await pg.waitForTimeout(2000);
  const nut=await pg.$('#impGo');
  if(!nut){ console.error('KHÔNG thấy nút "Nhập vào kho dữ liệu" — file nguồn sai định dạng.'); await b.close(); process.exit(2); }
  await nut.click();
  await pg.waitForTimeout(9000);

  const db=await pg.evaluate(()=>JSON.parse(JSON.stringify(DB)));
  fs.writeFileSync(OUT, JSON.stringify(db), 'utf8');
  console.log('Nguồn    :', path.basename(SRC));
  console.log('Số kỳ    :', truoc, '->', Object.keys(db.ky).length);
  console.log('Các năm  :', [...new Set(Object.keys(db.ky).map(k=>k.slice(0,4)))].sort().join(', '));
  console.log('Ghi ra   :', OUT, `(${(fs.statSync(OUT).size/1024).toFixed(0)} KB)`);
  console.log('Lỗi trang:', errs.length?JSON.stringify([...new Set(errs)].slice(0,3)):'không có');
  await b.close(); srv.close();
})();
