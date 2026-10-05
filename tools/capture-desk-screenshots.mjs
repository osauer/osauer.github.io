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
// Contract ids and quotes come from the synthetic book, so every view agrees.
let quotes={};
const stock=symbol=>({symbol,con_id:quotes[symbol]?.con_id||0,sec_type:'STK',currency:'USD',exchange:'SMART'});
// The current /api/opportunities shape (Desk d199701): spike-keyed candidate ids
// inside a stable episode, the owner's research mark, and My stocks lending rows.
// One watched name matched (volume spike, then a rising bar); one spiked and is
// waiting for price; one has no spike. Canary's evaluator states and reason codes.
function opportunities(){
 const contracts=['NVDA','AMD','MSFT'].map(stock);
 const shapes={NVDA:{scale:1,match:true,closes:[118.61,118.55,118.62,118.47,118.4,118.36,118.31,118.37,118.25,118.21,118.6],volume:[182000,143000,171000,122000,160000,137000,149000,128000,548000,267000]},
  AMD:{scale:151.24/150.36,match:'pending',closes:[150.31,150.42,150.38,150.55,150.61,150.58,150.66,150.74,150.81,150.48,150.36],volume:[211000,176000,190000,168000,181000,172000,169000,177000,694000,402000]},
  MSFT:{scale:423.18/423.05,match:false,closes:[422.4,422.61,422.55,422.83,422.71,422.9,422.86,423.02,422.95,423.11,423.05],volume:[96000,88000,91000,84000,90000,87000,83000,89000,94000,86000]}};
 const rows=contracts.map(contract=>{
  const s=shapes[contract.symbol], closes=s.closes.map(x=>+(x*s.scale).toFixed(2));
  const bars=closes.slice(1).map((close,i)=>({start:at(i*5),end:at((i+1)*5),open:closes[i],high:+(Math.max(close,closes[i])+.08).toFixed(2),low:+(Math.min(close,closes[i])-.09).toFixed(2),close,volume:s.volume[i]}));
  const spike=s.match!==false, confirmed=s.match===true, average={NVDA:152000,AMD:183000,MSFT:89000}[contract.symbol];
  const evidence={version:1,spec:{version:1,template:'volume_turn_v1',revision:'synthetic-public',spike_multiple:3,response_bars:2,baseline_sessions:20},contract,evaluated_at:frozen,observed_at:frozen,session_date:'2026-10-02',evidence_kind:'current_observation',
   setup_match:confirmed,state:confirmed?'confirmed':spike?'pending':'watching',reasons:confirmed?[]:[spike?'volume_spike_waiting_for_price':'no_volume_spike'],
   ...(spike?{spike_at:at(45)}:{}),...(confirmed?{first_confirmed_at:at(50),first_available_at:at(50),confirmation_type:'rising'}:{}),...(spike?{valid_until:at(56)}:{}),baseline_sessions:20,
   features:spike?{slot_volume:s.volume[8],slot_average:average,spike_multiple:+(s.volume[8]/average).toFixed(2),price_change_pct:+((closes[10]/closes[9]-1)*100).toFixed(2)}:{},
   bars,baseline:[],input_hash:'synthetic-public-'+contract.symbol,price_basis:'unadjusted',volume_basis:'ibkr_historical_trades'};
  return {id:'synthetic-candidate-'+contract.symbol+'-1015',episode_id:'synthetic-episode-'+contract.symbol,contract,state:evidence.state,setup_match:confirmed,reason:confirmed?'volume_spike_price_rising':evidence.reasons[0],eligible:confirmed,hold_reasons:[],evidence,
   ...(contract.symbol==='NVDA'?{disposition:{value:'worth_a_look',at:frozen}}:{})};
 });
 return {lending:lendingMine(),lending_discovery:{rows:[],threshold:50,checked_at:recent,valid_until:new Date(now+180000).toISOString()},
  settings:{revision:1,watchlist_revision:1,watchlist_available:true,mode:'on',symbols:contracts,spike_multiple:3,response_bars:2,allowed_stages:[]},rows,suggested_symbols:[],checked_at:frozen};
}
// Lending → My stocks: the book's USD stocks plus the watchlist, with invented
// but ordinary large-cap borrowing fees. None reaches the 50% research threshold.
function lendingMine(){
 const extra={AAPL:[14.2,.3,'Holding'],AMD:[22.6,.4,'Watchlist'],MSFT:[9.8,.3,'Holding · watchlist'],NVDA:[-6.4,.3,'Holding · watchlist'],SPY:[11.3,.3,'Holding'],TLT:[3.1,.5,'Holding']};
 const days=['2026-09-30','2026-10-01','2026-10-02'];
 const rows=Object.entries(extra).map(([symbol,[ytd,rate,origin]])=>{
  const q=quotes[symbol]||{};
  return {symbol,origin,rate,as_of:'2026-10-02T13:00:00Z',state:'ordinary',high_dates:0,history:days.map((day,i)=>({as_of:day+'T13:00:00Z',rate:+(rate+[.02,-.01,0][i]).toFixed(2)})),
   market:{symbol,contract:stock(symbol),status:'available',checked_at:recent,valid_until:new Date(now+300000).toISOString(),price:q.quote_price,price_at:recent,price_kind:'intraday',day_change_pct:q.regular_change_pct,volume:q.volume,volume_date:'2026-10-02',
    avg_dollar_volume_20d:Math.round(q.quote_price*q.avg_volume),liquidity_as_of:'2026-10-01',ytd_change_pct:ytd,ytd_base_date:'2025-12-31',ytd_as_of:'2026-10-01'}};
 }).sort((a,b)=>b.rate-a.rate||a.symbol.localeCompare(b.symbol));
 return {rows,threshold:50,checked_at:recent,valid_until:new Date(now+180000).toISOString()};
}
// FINRA short interest: recognisable large caps outside the book and watchlist,
// invented but plausible counts, the 15 September settlement (published before
// the frozen session) and ordinary borrowing fees. Canary filters and sorts.
const SHORT=[
 ['F','Ford Motor Company','N',152640118,158102334,61020000,11.42,-.4,13.1e6,.702e9,14.9,.25],
 ['INTC','Intel Corporation','Q',128413902,121937215,58240000,22.85,1.1,14.6e6,1.38e9,-8.6,.26],
 ['PFE','Pfizer Inc.','N',96302771,92711480,37480000,25.1,-.3,8.4e6,.902e9,-5.2,.25],
 ['TSLA','Tesla, Inc.','Q',84118256,86902413,92400000,251.3,2.4,21.7e6,23.4e9,6.1,.3],
 ['BAC','Bank of America Corporation','N',71806334,69402118,38900000,41.05,.6,8.9e6,1.55e9,12.4,.25],
 ['T','AT&T Inc.','N',68214590,70022871,33100000,27.6,.2,7.6e6,.87e9,18.7,.25],
 ['PLTR','Palantir Technologies Inc.','Q',58742006,61215390,64300000,44.2,3.1,15.2e6,2.71e9,28.3,.28],
 ['VZ','Verizon Communications Inc.','N',49611872,47980215,21400000,43.1,-.2,5.1e6,.86e9,7.4,.25],
 ['XOM','Exxon Mobil Corporation','N',41327660,39118402,15800000,117.4,-.8,3.6e6,1.79e9,9.1,.25],
 ['CSCO','Cisco Systems, Inc.','Q',30915447,32604918,19700000,57.3,.5,4.3e6,1.08e9,4.8,.25],
 ['KO','The Coca-Cola Company','N',22408119,21377006,14600000,68.9,.1,3.2e6,.94e9,10.6,.25],
];
function shortInterest(params){
 const query={kind:'short_interest',sort:params.get('sort')||'short_interest_shares',direction:params.get('direction')==='asc'?'asc':'desc',liquid:params.has('liquid'),price:params.has('price'),persistent:false,listed:params.has('listed'),cover:params.has('cover')};
 const settlement='2026-09-15';
 let rows=SHORT.map(([symbol,name,market,shares,previous,average,price,day,volume,dollars,ytd,fee])=>({symbol,name,market,short_interest_shares:shares,previous_short_interest_shares:previous,average_daily_volume:average,
  days_to_cover:Math.max(1,+(shares/average).toFixed(1)),change_pct:+((shares/previous-1)*100).toFixed(1),settlement_date:settlement,split:false,revised:false,fee_rate:fee,fee_as_of:'2026-10-02T13:00:00Z',
  market_context:{symbol,contract:{symbol,con_id:0,sec_type:'STK',currency:'USD',exchange:'SMART'},status:'available',checked_at:recent,valid_until:new Date(now+300000).toISOString(),price,price_at:'2026-10-02T14:05:00Z',price_kind:'delayed',day_change_pct:day,volume:Math.round(volume),volume_date:'2026-10-02',avg_dollar_volume_20d:dollars,liquidity_as_of:'2026-10-01',ytd_change_pct:ytd,ytd_base_date:'2025-12-31',ytd_as_of:'2026-10-01'}}));
 rows=rows.filter(r=>(!query.liquid||r.market_context.avg_dollar_volume_20d>=1e7)&&(!query.price||r.market_context.price>=5)&&(!query.cover||r.days_to_cover>=3));
 const value=r=>query.sort==='symbol'?r.symbol:query.sort==='fee_rate'?r.fee_rate:query.sort in r?r[query.sort]:r.market_context[query.sort];
 rows.sort((a,b)=>{const av=value(a),bv=value(b),v=typeof av==='string'?av.localeCompare(bv):av-bv;return (query.direction==='desc'?-v:v)||a.symbol.localeCompare(b.symbol);});
 return {query,coverage:{candidates:rows.length,covered:rows.length,pending:0,unavailable:0,complete:true},rows,status:'available',source:'Synthetic FINRA-style fixture',source_url:'https://www.finra.org/finra-data/browse-catalog/equity-short-interest',
  settlement_date:settlement,fetched_at:'2026-10-02T13:00:00Z',checked_at:recent,valid_until:new Date(now+180000).toISOString(),total:rows.length,matching:rows.length,truncated:false};
}
// The trade ticket's option discovery for the matched NVDA setup: listed
// expiries, unpriced call strikes, then Canary's one quote for the exact call.
// It answers discovery only; preview, authorisation and submission are refused.
function optionChain(request){
 const underlying={con_id:quotes.NVDA.con_id,symbol:'NVDA',sec_type:'STK',currency:'USD',exchange:'SMART'}, base={version:1,underlying,as_of:'2026-10-02T14:19:50Z',expiries:[],calls:[]};
 if(!request.expiry)return {...base,expiries:['20261009','20261016','20261023','20261030','20261120','20261218'].map(date=>({date}))};
 if(request.strike==null)return {...base,expiry:request.expiry,calls:[105,110,115,120,125,130,135].map(strike=>({strike,status:'not_requested'}))};
 const strike=request.strike, code=String(Math.round(strike*1000)).padStart(8,'0');
 return {...base,expiry:request.expiry,contract:{con_id:880120016,symbol:'NVDA',sec_type:'OPT',exchange:'SMART',currency:'USD',local_symbol:'NVDA  '+request.expiry.slice(2)+'C'+code,trading_class:'NVDA',expiry:request.expiry,right:'C',strike,multiplier:100},
  quote:{bid:3.45,ask:3.55,as_of:'2026-10-02T14:19:52Z',data_type:'delayed',status:'quoted'}};
}
// Only the trade-ticket capture enables Desk's trading capability, so every other
// view renders exactly as the simulation (trading off) does.
let tradingFixture=false;
const trading=origin=>({enabled:true,device_registered:true,companion_enrolled:false,companion_name:'',origin,orders:'DAY limit orders and exact Canary proposals',confirmation:'required for each exact order: paired companion (Touch ID or Apple Watch) or passkey',recent_refusals:[]});

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
 if(url.pathname==='/api/research/screen'&&url.searchParams.get('kind')==='short_interest'){
  await route.fulfill({contentType:'application/json',body:JSON.stringify(shortInterest(url.searchParams))});return;
 }
 if(url.pathname.startsWith('/api/trading/')){
  const step=url.pathname.slice('/api/trading/'.length);
  if(tradingFixture&&step==='status'){await route.fulfill({contentType:'application/json',json:trading(new URL(base).origin)});return;}
  if(tradingFixture&&step==='opportunity-options'){await route.fulfill({contentType:'application/json',json:optionChain(route.request().postDataJSON()||{})});return;}
  await route.fulfill({status:403,contentType:'application/json',json:{error:'The capture fixture answers option discovery only; no order is previewed or sent.'}});return;
 }
 const response=await route.fetch();
 if(!response.headers()['content-type']?.includes('json')){await route.fulfill({response});return;}
 let data=await response.json();
 if(url.pathname==='/api/snapshot'){
  if(data.meta?.simulated!==true)throw Error('Refusing a non-simulation source');
  sourceRevision=data.meta.build.revision;
 }
 data=normalize(data);
 if(url.pathname==='/api/snapshot'){
  snapshot=data=seedBrief(data);
  const positions=data.view.components.find(c=>c.id==='observer:positions')?.observation?.data;
  for(const row of positions?.by_underlying||[])if(row.underlying_quote?.symbol)quotes[row.underlying_quote.symbol]=row.underlying_quote;
  if(tradingFixture)data.meta.trading=trading(new URL(base).origin);
 }
 if(url.pathname==='/api/market/tape')data=marketFixture(data);
 await route.fulfill({response,json:data});
});
const settle=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);};
const click=async selector=>{await page.locator(selector).click();await settle();};
const captured=[];
// `until` ends the clip at a child's top edge, keeping its 1px rule as the bottom border.
const capture=async(name,selector,until)=>{
 await settle();

 await page.evaluate(()=>scrollTo(0,0));
 let clip;
 if(selector)clip=await page.locator(selector).first().evaluate((e,until)=>{const r=e.getBoundingClientRect(),stop=until&&e.querySelector(until);return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:stop?stop.getBoundingClientRect().top-r.top+1:r.height}},until);
 await page.screenshot({path:path.join(out,name.replace(/\.(webp|jpg)$/,'.png')),...(clip?{clip,fullPage:true}:{}),animations:'disabled'});
 captured.push(name);console.log(name,selector||'viewport');
};
const open=async(query='')=>{
 await page.goto(new URL(query,base).href);await page.locator('#page-subnav').waitFor({state:'attached'});await settle();
 const close=page.getByRole('button',{name:'Close conversation',exact:true});if(await close.isVisible())await close.click();await settle();
};
// The trade ticket: the matched setup, then one listed expiry and call strike.
// Canary's one dated quote for the exact call appears beside the owner's own
// premium arithmetic. Nothing is previewed, authorised or sent.
const chooseCall=async(name,phone)=>{
 tradingFixture=true;
 // The ticket scrolls inside 90vh; a taller phone viewport shows it whole.
 if(phone)await page.setViewportSize({width:390,height:1200});
 await open('?view=market&tab=opportunities');await page.locator('.opportunity-chart').waitFor();
 await click('[data-state-key="opportunity:choose:option"]');
 const ticket=page.locator('dialog.trading-dialog');
 await ticket.locator('select[aria-label="Expiry"] option[value="20261016"]').waitFor({state:'attached'});
 await ticket.locator('select[aria-label="Expiry"]').selectOption('20261016');
 await ticket.locator('select[aria-label="Call strike"] option[value="120"]').waitFor({state:'attached'});
 await ticket.locator('select[aria-label="Call strike"]').selectOption('120');
 await ticket.getByText('Bid 3.45 / ask 3.55',{exact:false}).waitFor();
 await ticket.getByLabel('Contracts to buy').fill('2');await ticket.getByLabel('Limit premium per unit (USD)').fill('3.50');
 await page.evaluate(()=>document.activeElement?.blur());
 await capture(name,'dialog.trading-dialog');
 tradingFixture=false;
};
async function pass(device){
 const phone=device==='phone', name=n=>(phone?'phone-':'desk-')+n+'.webp';
 await page.setViewportSize(phone?{width:390,height:1080}:{width:1440,height:1000});
 await open();await page.locator('.underlying-row').first().waitFor();
 // Opening the actual brief disclosure displays the seeded synthetic narrative.
 // Keep the populated brief folded so holdings remain visible.
 await capture(name('overview'));
 if(phone)await page.setViewportSize({width:390,height:844});
 // FX contribution now opens from Portfolio → Performance: FX overlay → FX details.
 await click('#page-subnav a:text-is("Performance")');
 await click('[data-state-key="performance:overlay:fx"]');await click('[data-state-key="performance:fx-details"] > summary');
 await page.locator('.fx-plot').waitFor();
 await click('[data-state-key="fx:period:week"]');await click('[data-state-key="fx:chart:daily"]');
 await capture(name('fx'),'.fx-panel');await capture(name('fx-detail'),'.fx-panel');
 // Account value includes transfers. Year to date holds the synthetic book's
 // withdrawal marker; focusing it opens Desk's own tooltip. (The deposit falls on
 // the first day of the 1Y window, where its tooltip covers the line.)
 await click('[data-state-key="performance:overlay:fx"]');
 await click('[data-state-key="performance:basis:account"]');await click('[data-state-key="performance:period:ytd"]');
 await page.locator('.performance-flow').first().focus();
 // Securities lending sits under the chart in the same panel and is not part of this story.
 await capture(name('account-value'),'.portfolio-performance-panel','.lending-panel');
 await click('[data-section="decisions"]');
 if(!phone)fs.writeFileSync(path.join(out,'decisions-dom.txt'),await page.locator('body').innerText());
 await capture(name('decisions'),'.advice-card');
 await click('[data-section="risk"]');
 if(!phone)fs.writeFileSync(path.join(out,'risk-dom.txt'),await page.locator('body').innerText());
 await capture(name('risk'),'.risk-lead');
 if(phone){await page.getByText('Current sweep details',{exact:true}).click();await capture(name('cash'),'details.source-details:has(> summary:text-is("Current sweep details"))');}
 else await capture(name('cash'),'.cash-sweep');
 await open('?view=market&tab=trends');await page.locator('.insight-chart svg').first().waitFor();
 await capture(name('market-price'),'.insight-chart');await capture(name('market-breadth'),'.insight-chart + .insight-chart');
 await open('?view=market&tab=opportunities');await page.locator('.opportunity-chart').waitFor();
 await capture(name('opportunities'),'.opportunity-story');
 // On a phone the comparison table scrolls sideways and the borrow column is
 // off-screen, so only the desktop capture of My stocks is kept.
 if(!phone){
  await open('?view=market&tab=opportunities&research=lending&lending_scope=mine');await page.locator('.lending-research .lending-candidate').first().waitFor();
  await capture(name('research-borrow'),'.lending-research');
 }
 await open('?view=market&tab=opportunities&research=short_interest');await page.locator('.short-interest .lending-candidate').first().waitFor();
 await capture(name('research-short-interest'),'.short-interest');
 await chooseCall(name('opportunity-call'),phone);
}
try{
 await pass('desk');
 await pass('phone');
 fs.writeFileSync(path.join(out,'capture-receipt.json'),JSON.stringify({sourceRevision,frozen,synthetic:true,captured,
  fixtures:['snapshot: -simulate book, brief and market tape (normalized)','opportunities: synthetic volume-turn rows, NVDA marked worth a look','lending My stocks: invented ordinary borrow fees','short interest: invented FINRA-style rows, settlement 2026-09-15','trade ticket: option discovery and one delayed quote only; preview and submission refused'],errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
