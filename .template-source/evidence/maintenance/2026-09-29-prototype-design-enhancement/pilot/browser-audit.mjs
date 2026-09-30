import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const E='/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/evidence/maintenance/2026-09-29-prototype-design-enhancement';
const P=path.join(E,'pilot');
const {chromium}=await import('/Users/zhudaoming/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const observations=JSON.parse(await readFile(path.join(P,'observations.json')));
const scenarios={'list-detail':['primary','no-permission'],'multi-step':['primary','failure'],'approval-permission':['primary','no-permission'],'conflict-recovery':['primary','failure','conflict'],'dense-analysis':['primary'],'preserve-small-change':['primary']};
const browser=await chromium.launch();const report=[];
try{
for(const row of observations){
 const dir=path.join(P,'ab',row.task,row.side);const output=path.join(dir,'browser-audit.json');
 if(!row.html_exists){report.push({task:row.task,side:row.side,status:'missing-html',behavior_coverage:'unverified'});continue;}
 const html=await readFile(path.join(dir,'index.html'),'utf8');const htmlHash=createHash('sha256').update(html).digest('hex');
 try{const cached=JSON.parse(await readFile(output));if(cached.html_sha256===htmlHash){report.push(cached);continue;}}catch{}
 const context=await browser.newContext({offline:true,reducedMotion:'reduce',locale:'zh-CN',timezoneId:'Asia/Shanghai',deviceScaleFactor:1});const page=await context.newPage();
 const record={task:row.task,side:row.side,status:'inspected-partial-output',html_sha256:htmlHash,browser:browser.version(),delivery:'file:// offline=true',turn_completed:row.turn_completed,missing_resources:[],observations:[],behavior_coverage:'unverified; loading a partial page does not prove business behavior'};
 for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
  const ref=match[1].split(/[?#]/)[0];if(!ref||!(/\.(?:css|js)$/.test(ref)))continue;
  try{if(!ref.startsWith('http')&&!(await stat(path.join(dir,ref))).isFile())throw Error();}catch{record.missing_resources.push(ref);}
 }
 let issues=[];page.on('pageerror',e=>issues.push({type:'pageerror',message:e.message}));page.on('console',m=>{if(['error','warning'].includes(m.type()))issues.push({type:m.type(),message:m.text()});});page.on('requestfailed',r=>issues.push({type:'requestfailed',url:r.url(),failure:r.failure()}));page.on('request',r=>{if(/^https?:/.test(r.url()))issues.push({type:'network-request',url:r.url()});});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});
  for(const scene of scenarios[row.task]){
   issues=[];await page.goto(pathToFileURL(path.join(dir,'index.html')).href+'#scenario='+scene);await page.waitForTimeout(100);
   const observed=await page.evaluate(()=>({text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth,body_attributes:Object.fromEntries([...document.body.attributes].map(a=>[a.name,a.value])),controls:[...document.querySelectorAll('input,button,select,textarea')].map(e=>({tag:e.tagName,id:e.id,text:e.innerText||e.getAttribute('aria-label')||'',disabled:e.disabled,readOnly:e.readOnly,value:e.value})).slice(0,80)}));
   await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outlineStyle}));
   let reset='not-tested';
   if(!record.missing_resources.length&&!issues.length){
    const button=page.getByRole('button',{name:'重置场景',exact:true});
    if(await button.count()===1){const field=page.locator('input:not([readonly]):not([disabled]):not([type=checkbox]):not([type=radio])').first();if(await field.count()&&await field.isVisible()){
     await field.fill('probe-unsaved');await button.click();reset=(await field.inputValue())==='probe-unsaved'?'did-not-reset-input':'input-restored';
    }else{await button.click();reset='clicked; no editable input available';}}
    else reset='missing-or-ambiguous-control';
   }
   const shot=`${scene}-${width}.png`;await page.screenshot({path:path.join(dir,shot),animations:'disabled'});
   record.observations.push({scene,width,height:width===1440?900:844,...observed,focus,reset,issues:[...issues],screenshot:shot});
  }
 }
 await context.close();await writeFile(output,JSON.stringify(record,null,2)+'\n');report.push(record);
}
await writeFile(path.join(P,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({records:report.length,missing_html:report.filter(x=>x.status==='missing-html').length,missing_resource_pages:report.filter(x=>x.missing_resources?.length).length}));
}finally{await browser.close();}
