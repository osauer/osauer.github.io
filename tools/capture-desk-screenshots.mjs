#!/usr/bin/env node
// Capture real Desk components with an explicitly synthetic, frozen data fixture.
// Run only against an isolated -simulate instance. No live accounts or providers.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=path.resolve(process.argv[2] || 'output/desk-captures');
const base=process.argv[3] || 'http://127.0.0.1:8891/';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Loopback simulation required');
fs.mkdirSync(out,{recursive:true});
const frozen='2026-10-02T14:20:00.000Z', now=Date.parse(frozen), recent=new Date(now-15000).toISOString();
const today=new Date().toISOString().slice(0,10);
// This changes fixture data, never rendered labels, HTML, CSS, or warning elements.
function normalize(v,key=''){
 if(Array.isArray(v))return v.map(x=>normalize(x,key));
 if(v&&typeof v==='object'){
  const x=Object.fromEntries(Object.entries(v).map(([k,value])=>[k,normalize(value,k)]));
  if(Array.isArray(x.points)&&x.points.length>10&&x.points[0]?.at&&x.points[0].at.startsWith('2026-10-02')){
   x.points.forEach((p,i)=>{if(p.at)p.at=new Date(Date.parse('2026-10-02T13:30:00Z')+i/Math.max(1,x.points.length-1)*50*60000).toISOString()});
   for(const k of ['session_open','session_start','from'])if(k in x)x[k]='2026-10-02T13:30:00Z';
   for(const k of ['session_close','session_end','to'])if(k in x)x[k]='2026-10-02T20:00:00Z';
   if(x.reference_at)x.reference_at='2026-10-01T20:00:00Z';
  }
  return x;
 }
 if(typeof v==='string'){
  if(key==='regular_close_at')return '2026-10-01T20:00:00Z';
  v=v.replace(/21 days to expiry/g,'14 days to expiry').replace(/21 sessions from expiry/g,'14 days from expiry');
  v=v.replace(/\bCCC\b/g,'AMD').replace(/\bDDD\b/g,'MSFT').replace(/\bSYNX\b/g,'SPY').replace(/\bAAA\b/g,'INTC');
  if(/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))){
   if(/^(open|close|start|end|resume)$/.test(key)&&v.startsWith(today))return v.replace(today,'2026-10-02');
   if(v.startsWith(today))return /valid_until|expires|cutoff|deadline/.test(key)?'2026-10-02T20:00:00Z':recent;
  }
  if(v===today)return '2026-10-02';
  if(v.startsWith('desk:')&&v.includes(today))return v.replaceAll(today,'2026-10-02');
 }
 return v;
}
function seedBrief(snapshot){
 snapshot.read_at=frozen;
 for(const issue of snapshot.operations.human_issues||[]){if(issue.source==='proposals'){issue.title='Canary advises reviewing the AMD put';issue.subjects=issue.subjects.filter(s=>s.contract_id===2000);}}
 // This example exercises concentration and expiry; unrelated stress scenarios
 // in the general demo fixture do not describe this book.
 const rules=snapshot.view.components.find(c=>c.id==='observer:rules')?.observation?.data;
 if(rules){rules.rules=rules.rules.filter(r=>['single_name_exposure','expiry_runway'].includes(r.id));rules.ranked=[0,1];rules.breach_counts={act:2,watch:0};rules.sell_only={active:false,rules:[]};for(const r of rules.rules)if(r.id==='expiry_runway'){r.observed=14;for(const o of r.offenders||[])o.observed=14;}}

 const proposals=snapshot.view.components.find(c=>c.id==='observer:proposals')?.observation?.data;
 if(proposals){
  delete proposals.budget_reduction;
  proposals.proposals=proposals.proposals.filter(p=>p.bucket!=='budget_reduction');
  for(const p of proposals.proposals){if(p.option_exit)p.option_exit.dte=14;for(const b of p.blockers||[])if(b.code==='option_rth_closed'){b.code='live_option_quote_required';b.message='option exit requires live option market data';}}
 }
 if(proposals?.cash_sweep){
  const sweep=proposals.cash_sweep;
  sweep.reserve_state='hold';sweep.reserve_reason='reserve_calibration_required: Funding reserve needs owner calibration.';
  sweep.currencies=sweep.currencies.filter(c=>c.currency==='USD');
  const usd=sweep.currencies[0];
  if(usd){usd.settled_cash=null;usd.settled_cash_source='unavailable';usd.trade_date_cash=96475;usd.free=0;if(usd.bill)usd.bill.days_to_maturity=33;usd.cash=96475;usd.cash_equivalents=9900;usd.cash_like=106375;usd.state='settlement_unknown';usd.reason='96,475 USD cash and 9,900 USD in bills. Complete settled-cash coverage and a calibrated funding reserve are required before another purchase.';}
 }

 snapshot.operations.reviews=[{id:'desk:requested:2026-10-02',run_id:'synthetic-public-brief',state:'completed',at:'2026-10-02T14:15:00Z',briefing_ready:true,text:'## Your book today\n\nThe synthetic portfolio is up **991 USD** since the prior close. Cash is **96,475 USD** and margin headroom is **170,000 USD**.\n\n**Review concentration.** MSFT represents 27.1% of net liquidation, above the configured 25% limit. Review the proposed reduction before adding exposure.\n\n**Keep the reserve.** The cash plan is held pending complete settlement evidence. A quote alone does not authorise a purchase.',briefing:{quiet:false,headlines:[]}}];
 return snapshot;
}
const at=m=>new Date(Date.parse('2026-10-02T13:30:00Z')+m*60000).toISOString();
function opportunities(){
 const contracts=['NVDA','AMD','MSFT'].map((symbol,i)=>({symbol,con_id:1001+i,sec_type:'STK',currency:'USD',exchange:'SMART'}));
 return {settings:{revision:1,watchlist_revision:1,watchlist_available:true,mode:'on',symbols:contracts,spike_multiple:3,response_bars:2,allowed_stages:[]},checked_at:frozen,suggested_symbols:[],rows:contracts.map((contract,index)=>{
 const closes=[118.61,118.55,118.62,118.47,118.4,118.36,118.31,118.37,118.25,118.21,118.6].map(x=>+(x*(index===1?151.24/118.6:index===2?423.18/118.6:1)).toFixed(2));
 const bars=closes.slice(1).map((close,i)=>({start:at(i*5),end:at((i+1)*5),open:closes[i],high:Math.max(close,closes[i])+.08,low:Math.min(close,closes[i])-.09,close,volume:[182000,143000,171000,122000,160000,137000,149000,128000,548000,267000][i]}));
 return {id:'synthetic-'+contract.symbol,contract,state:'confirmed',setup_match:true,reason:'volume_spike_price_rising',eligible:false,hold_reasons:['Observation only in this preview. Order authority is separate.'],evidence:{version:1,spec:{rule_id:'volume_turn_v1',spike_multiple:3,response_bars:2},contract,evaluated_at:frozen,observed_at:frozen,session_date:'2026-10-02',evidence_kind:'current_observation',setup_match:true,state:'confirmed',reasons:[],spike_at:at(45),first_confirmed_at:at(50),first_available_at:at(50),confirmation_type:'rising',valid_until:at(56),baseline_sessions:20,features:{slot_volume:548000,slot_average:152000,spike_multiple:3.61,price_change_pct:.33},bars,baseline:[],input_hash:'synthetic-public-'+contract.symbol,price_basis:'unadjusted',volume_basis:'ibkr_historical_trades'}};
 })};
}

function marketFixture(data){
 let seed=20261002;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const changes=[0,0,0];
 for(const [i,row] of (data.sessions||[]).entries()){
  const shared=(rand()-.48)*1.1;
  for(const [j,series] of [row.spy,row.qqq,row.leaders?.price].entries()){
   if(!series)continue;
   const move=shared*(1+j*.2)+(rand()-.48)*.6;
   changes[j]+=move;series.window_change_pct=i?+changes[j].toFixed(2):0;
   series.change_pct=+move.toFixed(2);series.relative_volume_20=+(0.7+rand()*.8).toFixed(2);
  }
  if(row.breadth)row.breadth.pct_above_50dma=+(46+rand()*14).toFixed(1);
  if(row.leaders?.companies)row.leaders.companies.pct_above_50dma=[60,70,80,90][Math.floor(rand()*4)];
 }
 return data;
}

const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2,reducedMotion:'reduce',colorScheme:'light'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date(frozen));
let snapshot, sourceRevision;

// The capture fixture supplies a connected synthetic stream. It carries the
// same validated snapshot as the read route; no rendered status is altered.
await page.addInitScript({content:`{
 const original=window.fetch.bind(window);let fixture;
 window.fetch=async(...args)=>{
  const url=String(args[0]);
  if(url.includes('/api/live')&&fixture?.meta?.simulated){
   const encoder=new TextEncoder();let timer;
   return new Response(new ReadableStream({start(controller){const send=()=>controller.enqueue(encoder.encode('event: snapshot\\ndata: '+JSON.stringify(fixture)+'\\n\\n'));send();timer=setInterval(send,1000);args[1]?.signal?.addEventListener('abort',()=>{clearInterval(timer);controller.close();},{once:true});},cancel(){clearInterval(timer);}}),{headers:{'Content-Type':'text/event-stream'}});
  }
  const response=await original(...args);
  if(url.includes('/api/snapshot')&&response.ok)fixture=await response.clone().json();
  return response;
 };
}`});
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/api/live'){
  await route.continue(); return;
 }
 if(url.pathname==='/api/settings/cash-priority'){
  await route.fulfill({contentType:'application/json',json:{revision:1,effective_priority:'usd_first',currency_priority:'usd_first',source:'synthetic fixture',as_of:recent,writable:false,reason:'Read-only synthetic preview; no preference changes.'}});return;
 }
 if(url.pathname==='/api/opportunities'){
  await route.fulfill({contentType:'application/json',body:JSON.stringify(opportunities())});return;
 }
 const response=await route.fetch();
 if(!response.headers()['content-type']?.includes('json')){await route.fulfill({response});return;}
 let data=await response.json();
 if(url.pathname==='/api/snapshot'){
  if(data.meta?.simulated!==true)throw Error('Refusing a non-simulation source');
  sourceRevision=data.meta.build.revision;
 }
 data=normalize(data);
 if(url.pathname==='/api/snapshot')snapshot=data=seedBrief(data);
 if(url.pathname==='/api/market/tape')data=marketFixture(data);
 await route.fulfill({response,json:data});
});
const settle=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);};
const click=async selector=>{await page.locator(selector).click();await settle();};
const capture=async(name,selector)=>{
 await settle();

 await page.evaluate(()=>scrollTo(0,0));
 let clip;
 if(selector)clip=await page.locator(selector).first().evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}});
 await page.screenshot({path:path.join(out,name.replace(/\.(webp|jpg)$/,'.png')),...(clip?{clip,fullPage:true}:{}),animations:'disabled'});
 console.log(name,selector||'viewport');
};
try{
 await page.goto(base);await page.locator('.underlying-row').first().waitFor();await settle();
 const close=page.getByRole('button',{name:'Close conversation',exact:true});if(await close.isVisible())await close.click();await settle();
 // Opening the actual brief disclosure displays the seeded synthetic narrative.
 // Keep the populated brief folded so holdings remain visible.
 await capture('desk-overview.webp');
 await click('[data-state-key="account-tab-performance"]');
 await click('[data-state-key="performance:view:fx"]');
 await page.locator('.fx-plot').waitFor();
 await click('[data-state-key="fx:period:week"]');await click('[data-state-key="fx:chart:daily"]');
 await capture('desk-fx.webp','.fx-panel');await capture('desk-fx-detail.webp','.fx-panel');
 await click('[data-section="decisions"]');
 fs.writeFileSync(path.join(out,'decisions-dom.txt'),await page.locator('body').innerText());
 await capture('desk-decisions.webp','.advice-card');
 await click('[data-section="risk"]');
 fs.writeFileSync(path.join(out,'risk-dom.txt'),await page.locator('body').innerText());
 await capture('desk-risk.webp','.risk-lead');
 await capture('desk-cash.webp','.cash-sweep');
 await page.goto(new URL('?view=market&tab=trends',base).href);await settle();
 await page.locator('.insight-chart svg').first().waitFor();
 await capture('desk-market-price.webp','.insight-chart');await capture('desk-market-breadth.webp','.insight-chart + .insight-chart');
 await page.goto(new URL('?view=market&tab=opportunities',base).href);await settle();await page.locator('.opportunity-chart').waitFor();
 await capture('desk-opportunities.webp','.opportunity-story');
 await page.setViewportSize({width:390,height:844});
 await click('[data-section="overview"]');await click('[data-state-key="account-tab-account"]');
 await page.evaluate(()=>scrollTo(0,0));await page.setViewportSize({width:390,height:1080});await capture('phone-overview.webp');await page.setViewportSize({width:390,height:844});
 await click('[data-state-key="account-tab-performance"]');await click('[data-state-key="performance:view:fx"]');
 await click('[data-state-key="fx:period:week"]');await click('[data-state-key="fx:chart:daily"]');
 await capture('phone-fx.webp','.fx-panel');await capture('phone-fx-detail.webp','.fx-panel');
 await click('[data-section="decisions"]');await capture('phone-decisions.webp','.advice-card');
 await click('[data-section="risk"]');await capture('phone-risk.webp','.risk-lead');await page.getByText('Current sweep details',{exact:true}).click();await capture('phone-cash.webp','details.source-details:has(> summary:text-is("Current sweep details"))');
 await page.goto(new URL('?view=market&tab=trends',base).href);await settle();
 await capture('phone-market-price.webp','.insight-chart');await capture('phone-market-breadth.webp','.insight-chart + .insight-chart');
 await page.goto(new URL('?view=market&tab=opportunities',base).href);await settle();await capture('phone-opportunities.webp','.opportunity-story');
 fs.writeFileSync(path.join(out,'capture-receipt.json'),JSON.stringify({sourceRevision,frozen,synthetic:true,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
