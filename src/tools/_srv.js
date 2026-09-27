/* máy chủ tĩnh dùng chung cho các script kiểm tra */
const path=require('path'), fs=require('fs'), http=require('http');
const ROOT=path.join(__dirname,'..','..');
const MIME={'.html':'text/html; charset=utf-8','.json':'application/json',
            '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
module.exports.serve=()=>new Promise(res=>{
  const s=http.createServer((q,r)=>{
    const fp=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));
    if(!fp.startsWith(ROOT)||!fs.existsSync(fp)){r.writeHead(404);return r.end('404')}
    r.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
    fs.createReadStream(fp).pipe(r);
  });
  s.listen(0,'127.0.0.1',()=>res({port:s.address().port, close:()=>s.close()}));
});
module.exports.ROOT=ROOT;
