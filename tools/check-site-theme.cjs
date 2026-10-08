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
     await p.locator('[aria-labelledby=daily-proof-title]').screenshot({animations:'disabled',path:`${out}/daily-use-${label}-${theme}.png`});
     for(const view of ['fx','decisions','opportunities']){
      await p.locator(`[data-tour-view="${view}"]`).click();await p.waitForFunction(v=>document.querySelector('[data-desk-tour]').dataset.selected===v,view);
      await p.waitForFunction(()=>{const i=document.querySelector('[data-tour-image]');return i.complete&&i.naturalWidth>0&&i.currentSrc===document.querySelector('[data-tour-full]').href});
      const current=await p.locator('[data-tour-image]').evaluate(i=>i.currentSrc);assert(current.includes((width<=760?'phone-':'desk-')+view+(theme==='dark'?'-dark':'')+'.webp'),current);
     const ratio=await p.locator('[data-tour-image]').evaluate(i=>({natural:i.naturalWidth/i.naturalHeight,rendered:i.clientWidth/i.clientHeight}));
     assert(Math.abs(ratio.natural-ratio.rendered)<0.02,'Tour retains screenshot aspect ratio');
      await p.locator('[data-desk-tour]').scrollIntoViewIfNeeded();await p.screenshot({animations:'disabled',path:`${out}/tour-${view}-${label}-${theme}.png`});count++;
     }
     await p.locator('[data-tour-view="fx"]').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='decisions');
     await p.keyboard.press('End');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='opportunities');
     await p.keyboard.press('Home');await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='fx');
     assert.equal(await p.locator('[data-tour-view=fx]').evaluate(e=>e===document.activeElement),true,'Tour Home key retains focus on its active tab');
    }
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} ${label} ${theme} overflow`);
    await p.locator('[data-theme-control]').scrollIntoViewIfNeeded();await p.screenshot({animations:'disabled',path:`${out}/${name}-${label}-${theme}-footer.png`});
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});const p=await context.newPage();
 await p.route('**/desk-decisions.webp*',r=>r.abort());await p.goto(base+'/desk/');await p.locator('[data-tour-view="decisions"]').click();await p.waitForFunction(()=>document.querySelector('[data-tour-status]').textContent.includes('did not load'));
 assert.equal(await p.locator('[data-desk-tour]').getAttribute('data-selected'),'fx');assert.equal(await p.locator('.tour-screen').getAttribute('aria-busy'),null);
 await p.unroute('**/desk-decisions.webp*');await p.locator('[data-tour-view="decisions"]').click();await p.waitForFunction(()=>document.querySelector('[data-desk-tour]').dataset.selected==='decisions');assert.equal(await p.locator('[data-tour-status]').textContent(),'');
 await p.locator('.theme-control label').filter({hasText:'Dark'}).click();await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc.includes('desk-decisions-dark.webp'));await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc===document.querySelector('[data-tour-full]').href);
 await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc.includes('phone-decisions-dark.webp'));await p.waitForFunction(()=>document.querySelector('[data-tour-image]').currentSrc===document.querySelector('[data-tour-full]').href);
 const other=await context.newPage();await other.goto(base+'/');assert.equal(await other.locator('html').getAttribute('data-theme'),'dark');
 await other.locator('.theme-control label').filter({hasText:'Light'}).click();await p.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await p.locator('.theme-control label').filter({hasText:'System'}).click();await p.emulateMedia({colorScheme:'dark'});await p.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await p.locator('input[value=system]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('input[value=dark]').isChecked(),true);await p.keyboard.press('ArrowRight');assert.equal(await p.locator('html').evaluate(e=>getComputedStyle(e).colorScheme),'light');
 await context.close();console.log(`INTEGRATED THEME WITNESS PASS: home + Desk, 1440/1280/390, Light/Dark against opposite OS; ${count} tour combinations; responsive currentSrc/full-size agreement; keyboard arrows/Home/End; image failure recovery; live theme + viewport change; System OS changes; cross-page/cross-tab persistence; native radio keys; no horizontal page overflow or JS errors.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
