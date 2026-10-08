#!/usr/bin/env node
// Exercise the published page structure against a local preview in real Chrome.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const path=require('node:path');
const out=path.resolve(__dirname,'../output/review');fs.mkdirSync(out,{recursive:true});
const base=process.env.SITE_URL || 'http://127.0.0.1:8913';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Use a local site preview');
async function loaded(p){await p.locator('body').evaluate(async()=>{await document.fonts.ready;for(const img of document.images)if(img.getBoundingClientRect().top<innerHeight)await img.decode().catch(()=>{});});}
async function checkImages(p){
 await p.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 for(const image of await p.locator('picture img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(async img=>{await img.decode().catch(()=>{throw Error(`Image failed: ${img.currentSrc}`)})});}
 const records=await p.locator('picture img').evaluateAll(images=>images.map(img=>({src:img.currentSrc,ok:img.complete&&img.naturalWidth>0,link:img.closest('a[data-responsive-image]')?.href})));
 for(const r of records){assert(r.ok,r.src);if(r.link)assert.equal(r.src,r.link);}
 return records;
}

async function checkFit(p){
 const contained=await p.locator('.viewer-canvas').evaluate(canvas=>{const r=canvas.getBoundingClientRect(),i=canvas.querySelector('img').getBoundingClientRect();return i.left>=r.left-1&&i.right<=r.right+1&&i.top>=r.top-1&&i.bottom<=r.bottom+1&&canvas.scrollWidth<=canvas.clientWidth+1&&canvas.scrollHeight<=canvas.clientHeight+1;});
 assert.equal(contained,true,'Fit shows the entire screenshot inside the canvas without scrolling');
}

async function openViewer(p, opener) {
 await opener.scrollIntoViewIfNeeded();
 const source=await opener.evaluate(e=>(e.querySelector('img')||document.querySelector('[data-tour-image]')).currentSrc);
 const point=await opener.evaluate(e=>{const r=e.getBoundingClientRect();return {x:(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y:(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2};});
 const before={url:p.url(),scroll:await p.evaluate(()=>scrollY),pages:p.context().pages().length,overflow:await p.locator('html').evaluate(e=>e.style.overflow)};
 await p.mouse.click(point.x,point.y);
 await p.waitForFunction(()=>document.querySelector('.image-viewer').open);
 await p.waitForFunction(()=>{const i=document.querySelector('.image-viewer img');return !i.hidden&&i.complete&&i.naturalWidth>0});
 assert.equal(await p.locator('.image-viewer img').evaluate(e=>e.currentSrc),source,'Viewer shows the clicked picture variant');
 assert.equal(p.url(),before.url,'Viewer keeps page URL');assert.equal(p.context().pages().length,before.pages,'Viewer opens no new tab');
 assert.equal(await p.locator('[data-viewer-close]').evaluate(e=>e===document.activeElement),true,'Close initially receives focus');
 await checkFit(p);
 return before;
}
async function closeViewer(p,opener,before,method='button'){
 if(method==='escape')await p.keyboard.press('Escape');
 else if(method==='backdrop')await p.mouse.click(2,2);
 else await p.locator('[data-viewer-close]').click();
 await p.waitForFunction(()=>!document.querySelector('.image-viewer').open);
 assert.equal(await opener.evaluate(e=>e===document.activeElement),true,'Closing restores exact opener focus');
 assert(Math.abs((await p.evaluate(()=>scrollY))-before.scroll)<=1,'Closing retains page scroll');
 assert.equal(p.url(),before.url);assert.equal(p.context().pages().length,before.pages);assert.equal(await p.locator('html').evaluate(e=>e.style.overflow),before.overflow,'Closing restores page scrolling');
}
async function inspectViewer(p,opener,file,method){
 const before=await openViewer(p,opener);
 await p.screenshot({animations:'disabled',path:`${out}/${file}-fit.png`});
 const fitWidth=await p.locator('.image-viewer img').evaluate(i=>i.clientWidth);
 await p.locator('[data-viewer-zoom]').click();
 const zoomWidth=await p.locator('.image-viewer img').evaluate(i=>i.clientWidth);
 assert(zoomWidth>fitWidth*1.5,'Zoom provides substantially larger detail');
 const top=await p.locator('.viewer-toolbar').evaluate(e=>e.getBoundingClientRect().top);
 await p.locator('.viewer-canvas').evaluate(e=>e.scrollTo(400,800));
 assert.equal(await p.locator('.viewer-toolbar').evaluate(e=>e.getBoundingClientRect().top),top,'Toolbar stays in place when image scrolls');
 assert.equal(await p.locator('[data-viewer-close]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true,'Close remains visible');
 await p.keyboard.press('Tab');assert.equal(await p.locator('.image-viewer').evaluate(e=>e.contains(document.activeElement)),true,'Focus stays inside modal');
 await p.locator('[data-viewer-zoom]').click();
 await checkFit(p);
 await closeViewer(p,opener,before,method);
}

(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});let count=0;try{
 for(const [width,height,label] of [[1440,1000,'desktop'],[1280,900,'laptop'],[390,844,'phone']]){
  for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height},colorScheme:theme==='dark'?'light':'dark'});
   await context.addInitScript(t=>localStorage.setItem('osauer-theme',t),theme);
   const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   for(const route of ['/','/desk/']){
    const name=route==='/'?'home':'desk';await p.goto(base+route,{waitUntil:'networkidle'});await loaded(p);
    assert.equal(await p.locator('html').getAttribute('data-theme'),theme);assert.equal(await p.locator('html').evaluate(e=>getComputedStyle(e).colorScheme),theme);
    await p.screenshot({animations:'disabled',path:`${out}/${name}-${label}-${theme}-hero.png`});
    const records=await checkImages(p);
    for(const r of records){assert.equal(r.src.includes('-dark.webp'),theme==='dark',r.src);}
    if(route==='/desk/'){
     for(const opener of await p.locator('a[data-responsive-image]').all()){const before=await openViewer(p,opener);await closeViewer(p,opener,before);}
     await p.locator('[aria-labelledby=daily-proof-title]').screenshot({animations:'disabled',path:`${out}/daily-use-${label}-${theme}.png`});
     for(const view of ['performance','decisions','opportunities','cash']){
      await p.locator(`[data-tour-view="${view}"]`).click();await p.waitForFunction(v=>document.querySelector('[data-desk-tour]').dataset.selected===v,view);
      await p.waitForFunction(()=>{const i=document.querySelector('[data-tour-image]');return i.complete&&i.naturalWidth>0&&i.currentSrc===document.querySelector('[data-tour-full]').href});
      const current=await p.locator('[data-tour-image]').evaluate(i=>i.currentSrc);assert(current.includes((width<=760?'phone-':'desk-')+view+(theme==='dark'?'-dark':'')+'.webp'),current);
     const ratio=await p.locator('[data-tour-image]').evaluate(i=>({natural:i.naturalWidth/i.naturalHeight,rendered:i.clientWidth/i.clientHeight}));
     assert(Math.abs(ratio.natural-ratio.rendered)<0.02,'Tour retains screenshot aspect ratio');
      await p.locator('[data-desk-tour]').scrollIntoViewIfNeeded();await p.screenshot({animations:'disabled',path:`${out}/tour-${view}-${label}-${theme}.png`});
      await inspectViewer(p,p.locator('[data-tour-open]'),`viewer-${view}-${label}-${theme}`,view==='decisions'?'escape':view==='opportunities'?'backdrop':'button');
      const before=await openViewer(p,p.locator('[data-tour-full]'));await closeViewer(p,p.locator('[data-tour-full]'),before);count++;
     }
     await p.locator('[data-tour-view="performance"]').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='decisions');
     await p.keyboard.press('End');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='cash');
     await p.keyboard.press('Home');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='performance');
     await p.locator('.rhythm').screenshot({animations:'disabled',path:`${out}/day-structure-${label}-${theme}.png`});
     assert.equal(await p.locator('[data-tour-view=performance]').evaluate(e=>e===document.activeElement),true,'Tour Home key retains focus on its active tab');
    }
    if(route==='/desk/'&&label==='desktop'){await p.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));await p.screenshot({animations:'disabled',fullPage:true,path:`${out}/desk-full-${theme}.png`});}
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} ${label} ${theme} overflow`);
    await p.locator('[data-theme-control]').scrollIntoViewIfNeeded();await p.screenshot({animations:'disabled',path:`${out}/${name}-${label}-${theme}-footer.png`});
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});const p=await context.newPage();
 await p.route('**/desk-decisions.webp*',r=>r.abort());await p.goto(base+'/desk/');await p.locator('[data-tour-view="decisions"]').click();await p.waitForFunction(()=>document.querySelector('[data-tour-status]').textContent.includes('did not load'));
 assert.equal(await p.locator('[data-desk-tour]').getAttribute('data-selected'),'performance');assert.equal(await p.locator('.tour-screen').getAttribute('aria-busy'),null);
 await p.unroute('**/desk-decisions.webp*');await p.locator('[data-tour-view="decisions"]').click();await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='decisions');assert.equal(await p.locator('[data-tour-status]').textContent(),'');
 await p.locator('.theme-control label').filter({hasText:'Dark'}).click();await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc.includes('desk-decisions-dark.webp'));await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc===document.querySelector('[data-tour-full]').href);
 await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc.includes('phone-decisions-dark.webp'));await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc===document.querySelector('[data-tour-full]').href);
 const other=await context.newPage();await other.goto(base+'/');assert.equal(await other.locator('html').getAttribute('data-theme'),'dark');
 await other.locator('.theme-control label').filter({hasText:'Light'}).click();await p.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await p.locator('.theme-control label').filter({hasText:'System'}).click();await p.emulateMedia({colorScheme:'dark'});await p.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await p.locator('input[value=system]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('input[value=dark]').isChecked(),true);await p.keyboard.press('ArrowRight');assert.equal(await p.locator('html').evaluate(e=>getComputedStyle(e).colorScheme),'light');
 await context.close();
 const failed=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'light'});const q=await failed.newPage();
 await q.route('**/desk-research-borrow.webp*',r=>r.abort());await q.goto(base+'/desk/');await q.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 const broken=q.locator('a[data-responsive-image]').filter({has:q.locator('img[src*=research-borrow]')});await broken.scrollIntoViewIfNeeded();await broken.click();
 await q.waitForFunction(()=>document.querySelector('.image-viewer [role=status]').textContent.includes('didn’t load'));
 assert.equal(await q.locator('[data-viewer-retry]').isVisible(),true);assert.equal(await q.locator('[data-viewer-zoom]').isDisabled(),true);
 await q.unroute('**/desk-research-borrow.webp*');
 await q.route('**/desk-research-borrow.webp*',async r=>{await new Promise(resolve=>setTimeout(resolve,120));await r.continue();});
 await q.locator('[data-viewer-retry]').click();await q.keyboard.press('Escape');await q.waitForFunction(()=>!document.querySelector('.image-viewer').open);await broken.click();
 await q.waitForFunction(()=>{const i=document.querySelector('.image-viewer img');return !i.hidden&&i.complete&&i.naturalWidth>0});
 await q.keyboard.press('Escape');await q.waitForFunction(()=>!document.querySelector('.image-viewer').open);assert.equal(await broken.evaluate(e=>e===document.activeElement),true);assert.equal(await q.locator('html').evaluate(e=>e.style.overflow),'','Rapid close/reopen preserves scrolling');await failed.close();
 console.log(`INTEGRATED THEME WITNESS PASS: home + Desk, 1440/1280/390, Light/Dark against opposite OS; ${count} tour combinations; responsive currentSrc/full-size agreement; keyboard arrows/Home/End; tour and viewer failure recovery; rapid close/reopen during load; all screenshot openers stay in page; Close/Escape/backdrop restore focus and scroll; zoom with persistent toolbar; live theme + viewport change; System OS changes; cross-page/cross-tab persistence; native radio keys; no horizontal page overflow or JS errors.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
