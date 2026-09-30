// Real local preview outputs: root + both profiles. Does not validate historical dark theme.
import assert from 'node:assert/strict';import{readFile,mkdtemp,writeFile}from'node:fs/promises';import path from'node:path';import os from'node:os';import{pathToFileURL}from'node:url';
import {parseDocument} from '../vendor-entry-yaml.mjs';
const {chromium}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright'),root=process.cwd(),out=await mkdtemp(path.join(os.tmpdir(),'yss-design-preview-')),report={result:'running',cases:[]};
const browser=await chromium.launch(),context=await browser.newContext({offline:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});
try{
 for(const base of [root,path.join(root,'submodules/yss-harness-design-agent'),path.join(root,'submodules/yss-harness-frontend-agent')]){
  const md=await readFile(path.join(base,'DESIGN.md'),'utf8'),spec=parseDocument(md.slice(4,md.indexOf('\n---',4))).toJS();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:900});await page.goto(pathToFileURL(path.join(base,'.template-source/design/preview.html')).href);
   for(const density of ['compact','comfortable']){
    await page.locator('#density').selectOption(density);
    assert.equal(await page.locator('#keyword').evaluate(e=>e.getBoundingClientRect().height),parseFloat(spec.components[density==='compact'&&width===1440?'button-compact':'button-primary'].height));
    assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),spec.typography.body.fontSize);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const contrastFailures=await page.evaluate(()=>{
      const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
      const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];return [...a.slice(0,3),a[3]/255];},blend=(a,b)=>a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3]));
      const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),bad=[];
      for(const el of document.querySelectorAll('body *')){if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const style=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||!r.height||style.visibility==='hidden'||style.clip!=='auto'||el.closest('[hidden],[inert],:disabled,[aria-disabled="true"]')||['SCRIPT','STYLE'].includes(el.tagName))continue;
      const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);let bg=[255,255,255];for(const p of chain)bg=blend(rgba(getComputedStyle(p).backgroundColor),bg);const l=[lum(blend(rgba(style.color),bg)),lum(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05),large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.666&&+style.fontWeight>=700);if(ratio<(large?3:4.5))bad.push({text:el.textContent.slice(0,40),ratio,foreground:style.color,background:bg});}return bad;
    });assert.deepEqual(contrastFailures,[],'preview computed text contrast');
    await page.locator('#keyword').fill('YSS-1026');await page.getByRole('button',{name:'查询',exact:true}).click();await page.getByText('1 条记录',{exact:true}).waitFor();await page.getByRole('button',{name:'重试',exact:true}).click();assert(await page.getByRole('button',{name:'处理中',exact:true}).isDisabled());
    await page.getByRole('button',{name:'演示提交',exact:true}).click();assert(await page.getByRole('button',{name:'演示完成',exact:true}).isDisabled());
    await page.getByRole('button',{name:'新建任务',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.textContent==='新建任务');
    await page.getByRole('button',{name:'新建任务',exact:true}).click();await page.getByRole('button',{name:'完成演示',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);
    assert(await page.getByRole('button',{name:'导出（未模拟）',exact:true}).isDisabled());
    await page.getByRole('button',{name:'重置',exact:true}).click();await page.getByText('3 条记录',{exact:true}).waitFor();assert.equal(await page.locator('#keyword').inputValue(),'');assert.equal(await page.locator('#density').inputValue(),'compact');assert(await page.getByRole('button',{name:'重试',exact:true}).isEnabled());assert(await page.getByRole('button',{name:'演示提交',exact:true}).isEnabled());
    report.cases.push({base,width,density,result:'passed',checks:['resources','computed-density-body','computed-text-contrast','filter','retry','full-reset','modal-focus','disabled-actions']});
   }
   await page.screenshot({path:path.join(out,`${path.basename(base)}-${width}.png`)});
  }
  await page.goto(pathToFileURL(path.join(base,'.template-source/design/preview-dark.html')).href);await page.getByText(/历史快照：未完成当前规范验证/).waitFor();
  assert(await page.locator('link[href*="variables.dark.css"]').count());
  assert.notEqual(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 242, 245)');
  report.cases.push({base,dark:'historical source loaded; current conformance explicitly unverified'});
 }
 assert.deepEqual(errors,[]);report.result='passed';
}catch(e){report.result='failed';report.failure=e.stack;throw e;}finally{await browser.close();await writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(path.join(out,'result.json'));}
