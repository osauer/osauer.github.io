#!/usr/bin/env node
// Render the editable sheet and web previews with Node 22+, Chrome, Poppler and cwebp.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const month = process.argv[2];
if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month ?? '')) throw new Error('Usage: node tools/render-product-sheet.mjs YYYY-MM');
const name = `canary-desk-product-sheet-${month}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-sheet-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
 '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${tmp}`,
 '--no-first-run', '--no-default-browser-check', 'about:blank',
], {stdio:'ignore'});
let ws;
const sleep = ms => new Promise(r=>setTimeout(r, ms));
try {
 const portFile=path.join(tmp,'DevToolsActivePort');
 for(let i=0;i<100&&!fs.existsSync(portFile);i++) await sleep(100);
 const [port, endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');
 ws=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let id=0;const pending=new Map();
 ws.onmessage=m=>{const d=JSON.parse(m.data);const p=pending.get(d.id);if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(new Error(JSON.stringify(d.error))):p.resolve(d.result);}};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error(`Timeout: ${method}`));},20000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,sessionId}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const s=(method,params)=>send(method,params,sessionId);
 const evaluate=async expression=>{const r=await s('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await s('Page.enable');await s('Runtime.enable');
 await s('Page.navigate',{url:`file://${root}/tools/product-sheet.html`});
 for(let i=0;i<100;i++){if(await evaluate('document.readyState === "complete"'))break;await sleep(100);}
 await s('Emulation.setEmulatedMedia',{media:'print'});
 await evaluate('document.fonts.ready.then(() => true)');
 const layout=await evaluate(`Array.from(document.querySelectorAll('.page')).map(el=>({height:el.getBoundingClientRect().height,scroll:el.scrollHeight,gap:el.querySelector('.foot,.legal').getBoundingClientRect().top-el.querySelector('.features,.access,.control').getBoundingClientRect().bottom}))`);
 if(layout.length!==3||layout.some(x=>x.scroll>x.height+1||x.gap<0))throw new Error(`Clipped sheet: ${JSON.stringify(layout)}`);
 const {data}=await s('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,generateTaggedPDF:true});
 const out=path.join(root,'assets/sheet');fs.mkdirSync(out,{recursive:true});
 const pdf=path.join(out,`${name}.pdf`);fs.writeFileSync(pdf,Buffer.from(data,'base64'));
 const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});if(!/^Pages:\s+3$/m.test(info))throw new Error('Expected three PDF pages');
 for(const width of [640,1240]){
  execFileSync('pdftoppm',['-scale-to-x',String(width),'-scale-to-y','-1','-png',pdf,path.join(tmp,'page')]);
  for(const page of [1,2,3])execFileSync('cwebp',['-quiet','-q','88',path.join(tmp,`page-${page}.png`),'-o',path.join(out,`${name}-p${page}-${width}.webp`)]);
 }
 console.log(`Rendered ${name}: three pages, six previews; footer clearance ${layout.map(x=>Math.round(x.gap)).join('/')} px.`);
} finally {
 ws?.close();const stopped=new Promise(r=>chrome.once('exit',r));chrome.kill();await stopped;
 fs.rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
