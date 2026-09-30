// Deterministic maintenance exercise, not a product approval or Agent effectiveness result.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
import {exportBusinessPatterns} from '../scripts/export-business-patterns.mjs';
import {exportLowFidelityExercise} from '../scripts/export-low-fidelity-exercise.mjs';
const {chromium,webkit}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-patterns-browser-'));
const source=new URL('../../../../',import.meta.url).pathname;
const exported=process.argv[2]?{root:path.resolve(process.argv[2]),patterns:['list-detail','multi-step','approval','conflict','analysis']}:await exportBusinessPatterns({projectRoot:source,output:path.join(temp,'patterns'),toolchain:process.env.YSS_VUE_TOOLCHAIN});
const lowfi=await exportLowFidelityExercise({projectRoot:source,output:path.join(temp,'low-fidelity')});
const report={scope:'maintenance fixtures',result:'passed',engines:[],cases:[],artifacts:temp};
async function checkPage(page){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'whole-page overflow');
 const failures=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];return [...a.slice(0,3),a[3]/255];},blend=(front,back)=>{const a=front[3]??1;return front.slice(0,3).map((v,i)=>v*a+back[i]*(1-a));};
  const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const failures=[];
  for(const el of document.querySelectorAll('h1,h2,p,label,button,td,th,[role="tab"]')){
   const rect=el.getBoundingClientRect();if(!rect.width||!rect.height||!el.textContent.trim()||el.matches(':disabled,[aria-disabled="true"]')||el.closest('[hidden],[inert]'))continue;
   const style=getComputedStyle(el);if(style.visibility==='hidden')continue;
   const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);
   let bg=[255,255,255];for(const p of chain)bg=blend(rgba(getComputedStyle(p).backgroundColor),bg);
   const fg=blend(rgba(style.color),bg),l=[luminance(fg),luminance(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05),large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.666&&Number(style.fontWeight)>=700);
   if(ratio<(large?3:4.5))failures.push({text:el.textContent.slice(0,50),ratio,foreground:style.color,background:bg});
  }return failures;
 });
 assert.deepEqual(failures,[],'computed text contrast');
 const motion=await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return s.animationName!=='none'||s.transitionDuration.split(',').some(x=>parseFloat(x)>0);}).map(e=>e.tagName));assert.deepEqual(motion,[],'reduced motion applied');
}
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();report.engines.push({engine,version:browser.version()});
 try{const context=await browser.newContext({offline:engine==='chromium',reducedMotion:'reduce',locale:'zh-CN'}),page=await context.newPage(),errors=[];
 if(engine==='webkit')await context.route(/^https?:/,route=>route.abort('internetdisconnected'));
 report.engines.at(-1).network=engine==='chromium'?'offline=true':'HTTP(S) blocked by routing; WebKit offline flag rejects file navigation';
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))errors.push(r.url());});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const mode of exported.patterns){
   const url=pathToFileURL(path.join(exported.root,mode,'index.html')).href;
   await page.goto(url+'#scenario=primary');await page.locator('h1').waitFor();await checkPage(page);
   if(mode==='list-detail'){
    await page.getByRole('button',{name:'下一页',exact:true}).click();await page.getByRole('button',{name:'查看 M-003',exact:true}).click();if(width>=1200){await page.locator('.inline-detail').waitFor();await page.getByRole('button',{name:'关闭详情',exact:true}).click();}else{await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='查看 M-003');
    await page.locator('#keyword').fill('M-001');await page.getByRole('checkbox',{name:'选择 M-001',exact:true}).focus();await page.keyboard.press('Space');await page.getByText('已选择 1 项',{exact:true}).waitFor();await page.locator('#keyword').fill('不存在');await page.getByText('暂无符合条件的资料',{exact:true}).waitFor();
   }else if(mode==='multi-step'){
    await page.goto(url+'#scenario=failure');await page.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'name');await page.locator('#name').fill('分步资料');await page.locator('#note').fill('保留的说明');await page.getByRole('button',{name:'下一步',exact:true}).click();await page.locator('#owner').fill('测试负责人');await page.getByRole('button',{name:'上一步',exact:true}).click();assert.equal(await page.locator('#note').inputValue(),'保留的说明');await page.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await page.locator('#owner').inputValue(),'测试负责人');await page.getByRole('button',{name:'确认提交',exact:true}).click();await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'重试提交',exact:true}).click();await page.getByText('提交成功（本地模拟）。',{exact:true}).waitFor();
   }else if(mode==='approval'){
    await page.goto(url+'#scenario=failure');assert(await page.getByRole('button',{name:'通过 M-002',exact:true}).isDisabled());for(const id of ['M-001','M-003'])await page.getByRole('checkbox',{name:`选择 ${id}`,exact:true}).click();await page.getByRole('button',{name:'批量通过',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'通过 M-001',exact:true}).count(),0);await page.getByRole('button',{name:'批量通过',exact:true}).click();assert.equal(await page.getByRole('button',{name:'通过 M-003',exact:true}).count(),0);
   }else if(mode==='conflict'){
    await page.goto(url+'#scenario=conflict');await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('保留草稿');await page.locator('#save').click();await page.locator('#reload').click();await page.getByRole('button',{name:'保留草稿',exact:true}).click();assert.equal(await page.locator('#name').inputValue(),'保留草稿');await page.locator('#reload').click();await page.getByRole('button',{name:'放弃并重新加载',exact:true}).click();assert.equal(await page.locator('#name').inputValue(),'服务端最新资料名称');assert.equal(await page.locator('#version').textContent(),'2');await page.locator('#save').click();await page.getByText('保存成功（本地模拟）。',{exact:true}).waitFor();
   }else{
    await page.locator('#keyword').fill('张明');assert.equal(await page.locator('.metric-value').first().textContent(),'8');await page.getByRole('button',{name:'定位 M-001',exact:true}).click();await page.getByRole('region',{name:'定位资料',exact:true}).waitFor();await page.getByRole('tab',{name:'概览',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('tabpanel').filter({hasText:'表格可横向滚动'}).waitFor();assert.equal(await page.locator('tbody tr').count(),8);if(width===390){await page.locator('.dense-region').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.dense-region').scrollLeft>0);}
   }
   await checkPage(page);
   const scenes=JSON.parse(await readFile(path.join(exported.root,mode,'scenarios.json'),'utf8')).scenarios;
   for(const scene of scenes){
    await page.goto(url+'#scenario='+scene.id);await page.locator('h1').waitFor();await checkPage(page);
    if(scene.id==='no-permission'){
     if(mode==='list-detail'){assert(await page.getByRole('checkbox').first().isDisabled());await page.getByRole('button',{name:'查看 M-001',exact:true}).click();if(width>=1200){await page.locator('.inline-detail').waitFor();await page.getByRole('button',{name:'关闭详情',exact:true}).click();}else{await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}}
     if(mode==='multi-step'){assert(await page.locator('#name').isDisabled());assert(await page.getByRole('button',{name:'下一步',exact:true}).isDisabled());}
     if(mode==='approval'){assert(await page.getByRole('button',{name:'批量通过',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'通过 M-001',exact:true}).isDisabled());}
     if(mode==='conflict')assert(await page.getByRole('button',{name:'编辑 M-001',exact:true}).isDisabled());
    }
    if(scene.id==='empty')await page.getByText(/暂无符合条件|当前没有待处理/).waitFor();
    if(scene.id==='loading')await page.getByText('正在加载（固定评审状态）',{exact:true}).waitFor();
    const reset=page.locator('#reset');if(!await reset.isVisible())await page.locator('summary').click();await reset.click();await reset.click();await checkPage(page);
    report.cases.push({engine,mode,width,scenario:scene.id,status:'passed',checks:['declared-state','repeated-reset','contrast','reduced-motion','layout']});
   }
   await page.goto(url+'#scenario=unknown');await page.getByRole('alert').filter({hasText:'未知或缺失'}).waitFor();
   await page.goto(url+'#scenario=primary');await page.locator('h1').filter({hasText:'场景入口错误'}).waitFor({state:'hidden'});
   await page.goto('about:blank');await page.goto(url);await page.locator('h1').waitFor();await page.screenshot({path:path.join(temp,`${engine}-${mode}-${width}.png`),animations:'disabled'});report.cases.push({engine,mode,width,status:'passed',checks:['state-results','keyboard','contrast','reduced-motion','layout']});
  }
  const url=pathToFileURL(lowfi.entry).href;
  for(const variant of ['single','batch','queue']){
   await page.goto(`${url}#variant=${variant}&case=retry`);await page.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();const frame=page.frameLocator('iframe');
   if(variant==='batch')await frame.getByRole('button',{name:'选择全部',exact:true}).click();
   const action=()=>frame.getByRole('button',{name:variant==='batch'?'通过所选':variant==='single'?'通过 M-001':'通过并继续',exact:true}).click();await action();await frame.getByText('处理失败，选择与资料已保留，请重试。',{exact:true}).waitFor();await action();if(variant==='batch')await frame.getByText('全部资料已处理。',{exact:true}).waitFor();else if(variant==='single'){for(const id of ['M-002','M-003'])await frame.getByRole('button',{name:`通过 ${id}`,exact:true}).click();}else{await action();await action();}await frame.getByText('全部资料已处理。',{exact:true}).waitFor();await page.locator('#reset').click();await page.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();report.cases.push({engine,mode:`lowfi-${variant}`,width,status:'passed'});
  }
 }
 assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
}
await writeFile(path.join(temp,'result.json'),JSON.stringify(report,null,2));console.log(path.join(temp,'result.json'));
