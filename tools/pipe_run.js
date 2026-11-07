#!/usr/bin/env node
/* Chạy PIPE.run (bộ xử lý của chính trang, lấy từ app.html) trên các file xlsx.
   node tools/pipe_run.js <thang> <nam> <chot> <ra.json> <file1.xlsx> [file2 ...] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const a = app.indexOf('<script>', app.indexOf('window.__SEED__')) + 8;
const b = app.indexOf("if (typeof module !== 'undefined') module.exports = PIPE;");
const code = app.slice(a, b) + '\n;globalThis.__P = PIPE;';
vm.runInThisContext(code);
const [thang, nam, chot, out, ...files] = process.argv.slice(2);
const cfg = { tinh: 'PYE', tinhName: 'Phú Yên', khoBH: '33286', khoBD: '34290', khoTen: 'Tuy Hòa', thang: +thang, nam: +nam, chot: +chot,
  tg: { bt: '', d11: '', bhmr: '', scn: '' }, kpi: { pv: 3.85, dh: 0.988, tn: 0.9988, s5: 9.9, bhx: 0.70 } };
(async () => {
  const fl = files.map(f => new File([fs.readFileSync(f)], path.basename(f)));
  const r = await globalThis.__P.run(fl, cfg, null);
  fs.writeFileSync(out, JSON.stringify(r));
  if (r.meta.log.length) console.log(r.meta.log.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
