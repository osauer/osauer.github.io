#!/usr/bin/env node
// Capture the real Desk UI from an isolated -simulate run. Node 22+, Chrome;
// no provider calls, npm packages or live-account captures.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawn} from "node:child_process";

const out = process.argv[2] || "assets";
const base = process.argv[3] || "http://127.0.0.1:8891/";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw Error("Use a loopback Desk simulation");
fs.mkdirSync(out, {recursive:true});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "desk-capture-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank",
], {stdio:"ignore"});
const sleep = ms => new Promise(r=>setTimeout(r, ms));
let ws;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let n=0; n<100 && !fs.existsSync(portFile); n++) await sleep(100);
  const [port, endpoint] = fs.readFileSync(portFile, "utf8").trim().split("\n");
  ws = new WebSocket("ws://127.0.0.1:" + port + endpoint);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;
  const pending=new Map();
  ws.onmessage=m=>{
    const d=JSON.parse(m.data), p=pending.get(d.id);
    if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}
  };
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const n=++id, timer=setTimeout(()=>{pending.delete(n);reject(Error("Timeout: "+method));},20000);
    pending.set(n,{resolve,reject,timer});
    ws.send(JSON.stringify({id:n,method,params,sessionId}));
  });
  const {targetId}=await send("Target.createTarget",{url:"about:blank"});
  const {sessionId}=await send("Target.attachToTarget",{targetId,flatten:true});
  const s=(method,params)=>send(method,params,sessionId);
  await s("Page.enable");await s("Runtime.enable");
  const evaluate=async expression=>{
    const r=await s("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const waitFor=async expression=>{
    for(let n=0;n<100;n++){if(await evaluate(expression))return;await sleep(200);}
    throw Error("Not ready: "+expression);
  };
  const click=async selector=>{
    await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing control');e.click();return true;})()");
    await sleep(300);
  };
  const capture=async (name, selector, format="webp")=>{
    let clip;
    if(selector){
      clip=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing capture');const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()");
    }
    const {data}=await s("Page.captureScreenshot",{format,quality:88,captureBeyondViewport:!!clip,...(clip?{clip}:{})});
    fs.writeFileSync(path.join(out,name),Buffer.from(data,"base64"));
    console.log(name, clip?Math.round(clip.width)+"x"+Math.round(clip.height):"viewport");
  };
  await s("Emulation.setDeviceMetricsOverride",{width:1600,height:1000,deviceScaleFactor:2,mobile:false});
  await s("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:"light"},{name:"prefers-reduced-motion",value:"reduce"}]});
  await s("Page.navigate",{url:base});
  await waitFor("document.querySelectorAll('.underlying-row').length===6");
  await evaluate("document.fonts.ready.then(()=>true)");
  await click('button[aria-label="Close conversation"]');
  if(!await evaluate("document.querySelector('.sidebar').textContent.includes('SIMULATION')"))throw Error("Capture requires Desk's synthetic simulation");
  await sleep(1000);
  await capture("desk-overview.webp");
  await capture("desk-overview-social.jpg",null,"jpeg");
  await click('[data-state-key="account-tab-performance"]');
  await waitFor("!!document.querySelector('.performance-plot')");
  await capture("desk-performance.webp");
  await click('[data-state-key="performance:view:fx"]');
  await waitFor("!!document.querySelector('.fx-plot')");
  await click('[data-state-key="fx:period:ytd"]');
  await click('[data-state-key="fx:chart:cumulative"]');
  await capture("desk-fx.webp");
  await click('[data-state-key="fx:period:week"]');
  await click('[data-state-key="fx:chart:daily"]');
  await capture("desk-fx-detail.webp", ".fx-panel");
  await click('[data-section="risk"]');
  await capture("desk-risk.webp");
  await capture("desk-cash.webp",".cash-sweep");
  await click('[data-section="market"]');
  await click('[data-state-key="market:view:trends"]');
  await waitFor("document.querySelectorAll('.insight-chart svg').length>=3");
  await capture("desk-market.webp");
  await capture("desk-market-detail.webp",".insight-study");
  await capture("desk-market-price.webp",".insight-chart");
  await capture("desk-market-breadth.webp",".insight-chart + .insight-chart");
  await click('[data-section="decisions"]');
  await capture("desk-decisions.webp");
  await click('[data-section="operations"]');
  await capture("desk-operations.webp");
  await click('[data-section="overview"]');
  await click('[data-state-key="account-tab-account"]');
  await s("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await evaluate("scrollTo(0,0);true");
  await sleep(400);
  await capture("phone-overview.webp");
  await click('[data-state-key="account-tab-performance"]');
  await click('[data-state-key="performance:view:portfolio"]');
  await waitFor("!!document.querySelector('.performance-plot')");
  await capture("phone-performance.webp",".performance-panel");
  await click('[data-state-key="performance:view:fx"]');
  await waitFor("!!document.querySelector('.fx-plot')");
  await click('[data-state-key="fx:period:ytd"]');
  await click('[data-state-key="fx:chart:cumulative"]');
  await capture("phone-fx.webp",".fx-panel");
  await click('[data-section="market"]');
  await click('[data-state-key="market:view:trends"]');
  await waitFor("document.querySelectorAll('.insight-chart svg').length>=3");
  await capture("phone-market.webp",".insight-chart");
  await click('[data-section="decisions"]');
  await capture("phone-decisions.webp");
} finally {
  ws?.close();
  const stopped=new Promise(r=>chrome.once("exit",r));
  chrome.kill();await stopped;
  fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
