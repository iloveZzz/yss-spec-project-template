import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {visual} from './browser-visual.mjs';
export const bundle=path.resolve(process.argv[2]||'.');
export const entry=(mode,scene='primary',page='')=>pathToFileURL(path.join(bundle,mode,'index.html')).href+(page?'?page='+page:'')+'#scenario='+scene;
export async function reset(page){const panel=page.locator('.prototype-review-panel details');if(!await page.locator('#reset').isVisible())await page.locator('summary').click();await page.locator('#reset').click();}
export async function layout(page){
 await visual(page);
 for(const popover of await page.locator('[data-slot="popover-content"],[data-slot="combobox-list"]').all())assert(await popover.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'overlay content must reflow, not hide a horizontal overflow');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page reflow');
 const sizes=await page.evaluate(()=>[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=option]')].filter(e=>e.checkVisibility()&&!e.closest('[inert]')&&!e.matches(':disabled,[data-disabled],[aria-disabled=true]')).map(e=>{const hit=e.matches('input[type=checkbox]')&&e.labels?.length?e.labels[0]:e;const r=hit.getBoundingClientRect();if(e.getAttribute('data-slot')==='checkbox'){const p=getComputedStyle(e,'::after');r.width-=parseFloat(p.left)+parseFloat(p.right);r.height-=parseFloat(p.top)+parseFloat(p.bottom)}return {label:e.getAttribute('aria-label')||e.id||e.textContent?.slice(0,30),width:r.width,height:r.height}}).filter(r=>r.width&&r.height&&(r.width<24||r.height<24)));
 assert.deepEqual(sizes,[],'visible controls have at least 24 CSS px targets');
}
export async function keyboardReach(page,selector){
 await page.locator('main').focus();for(let i=0;i<100;i++){await page.keyboard.press('Tab');if(await page.locator(selector).evaluate(e=>e===document.activeElement)){const r=await page.locator(selector).boundingBox();assert(r&&r.y>=0&&r.y+r.height<=await page.evaluate(()=>innerHeight),'focused action is not clipped');assert(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'focused action is not obscured');return;}}
 throw Error('Tab 无法到达 '+selector);
}
export async function browserHarness(name,exercise,{timezones=['Asia/Shanghai']}={}){
 const {chromium,webkit}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
 const output=await mkdtemp(path.join(os.tmpdir(),`yss-${name}-`)),report={status:'running',output,package_root:bundle,package_manifests:{},cases:[],errors:[],screenshots:[],limitations:['维护者自动操作；不代表读屏结果或真实用户观察。首次截图待审，不与自身比较。']};
 for(const mode of ['workspace','combined-query','owner-validity']){const file=path.join(bundle,mode,'yss-prototype-adapter.json');report.package_manifests[mode]='sha256:'+createHash('sha256').update(await readFile(file)).digest('hex');}
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();try{for(const width of engine==='chromium'?[1440,1024,390,320]:[1440,390])for(const timezoneId of timezones){
   const context=await browser.newContext({viewport:{width,height:900},locale:'zh-CN',timezoneId,reducedMotion:'reduce',offline:engine==='chromium'});
   if(engine==='webkit')await context.route(/^https?:/,r=>r.abort('internetdisconnected'));
   const page=await context.newPage();page.setDefaultTimeout(8000);const runtime=[];
   page.on('pageerror',e=>runtime.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))runtime.push(m.text());});page.on('requestfailed',r=>runtime.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))runtime.push('unexpected network '+r.url());});
   async function capture(id){const screenshot=path.join(output,`${engine}-${width}-${timezoneId.replaceAll('/','_')}-${id}.png`);await page.screenshot({path:screenshot,animations:'disabled'});report.screenshots.push(screenshot);return screenshot;}
   async function check(id,fn){const row={id,engine,version:browser.version(),width,timezoneId,status:'running'};try{await fn();row.status='passed';}catch(e){row.status='failed';row.error=e.stack;row.screenshot=await capture(id+'-failed');}report.cases.push(row);await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));}
   try{await exercise({page,width,engine,check,capture});}catch(e){report.errors.push(e.stack);await capture('unhandled');}
   if(runtime.length)report.errors.push({engine,width,runtime});await context.close();
  }}finally{await browser.close();}
 }
 report.status=report.errors.length||report.cases.some(c=>c.status!=='passed')?'failed':'passed';report.counts={passed:report.cases.filter(c=>c.status==='passed').length,failed:report.cases.filter(c=>c.status==='failed').length};
 await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(path.join(output,'result.json'));assert.equal(report.status,'passed',`${name} browser checks failed; inspect report`);
}
