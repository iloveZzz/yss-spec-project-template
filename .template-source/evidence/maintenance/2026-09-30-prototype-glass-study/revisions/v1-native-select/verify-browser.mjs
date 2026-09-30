import assert from 'node:assert/strict';import {mkdtemp,cp,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const {chromium,webkit}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-glass-offline-'));await cp(path.join(here,'comparisons'),path.join(temp,'comparisons'),{recursive:true});
const results=[],errors=[];let active;
function url(page,mode,scene='primary'){return pathToFileURL(path.join(temp,'comparisons',page,'variants',mode,'index.html')).href+'#scenario='+scene;}
async function fit(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow');}
async function ready(p){await p.locator('h1').waitFor();await fit(p);}
async function list(p){
 await p.locator('#keyword').fill('季度');assert.equal(await p.locator('tbody tr').count(),1);await p.getByRole('button',{name:'重置筛选',exact:true}).click();assert.equal(await p.locator('tbody tr').count(),2);
 await p.getByRole('checkbox',{name:'选择 M-001',exact:true}).click();await p.getByText('已选择 1 项',{exact:true}).waitFor();await p.getByRole('button',{name:'下一页',exact:true}).click();await p.getByRole('button',{name:'查看 M-003',exact:true}).waitFor();await p.getByRole('button',{name:'上一页',exact:true}).click();assert.equal(await p.getByRole('checkbox',{name:'选择 M-001',exact:true}).getAttribute('aria-checked'),'true');
 await p.getByRole('button',{name:'更多 M-001',exact:true}).focus();await p.keyboard.press('Enter');await p.getByRole('menu').waitFor();assert.equal(await p.getByRole('menuitem',{name:'导出（未模拟）'}).getAttribute('aria-disabled'),'true');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.id==='more-M-001');
 await p.keyboard.press('Enter');await p.getByRole('menuitem',{name:'查看详情',exact:true}).click();await p.getByRole('dialog').waitFor();await p.getByRole('dialog').getByText('张明',{exact:true}).waitFor();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.id==='more-M-001');await fit(p);
}
async function form(p){
 await p.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await p.evaluate(()=>document.activeElement.id),'name');assert.equal(await p.locator('#name').getAttribute('aria-invalid'),'true');await p.locator('#name').fill('资料核对样例');await p.locator('#note').fill('返回和重试需要保留这段输入。');await p.getByRole('button',{name:'下一步',exact:true}).click();await p.getByRole('button',{name:'确认提交',exact:true}).click();assert.equal(await p.evaluate(()=>document.activeElement.id),'owner');await p.locator('#owner').fill('测试负责人');await p.getByRole('button',{name:'上一步',exact:true}).click();assert.equal(await p.locator('#name').inputValue(),'资料核对样例');assert.equal(await p.locator('#note').inputValue(),'返回和重试需要保留这段输入。');await p.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await p.locator('#owner').inputValue(),'测试负责人');await p.getByRole('button',{name:'确认提交',exact:true}).click();await p.getByRole('alert').getByText('提交失败，所有步骤输入已保留，请重试。',{exact:true}).waitFor();assert.equal(await p.locator('#owner').inputValue(),'测试负责人');await p.getByRole('button',{name:'重试提交',exact:true}).click();await p.getByText('提交成功（本地模拟）。',{exact:true}).waitFor();await fit(p);
}
try{
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch({headless:true});try{
   for(const width of [1440,390])for(const mode of ['standard','glass'])for(const name of ['list-detail','multi-step']){
    active={engine,width,mode,name};const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});if(engine==='chromium')await context.setOffline(true);await context.route(/^https?:/,r=>{errors.push({...active,message:'remote request '+r.request().url()});return r.abort();});
    const p=await context.newPage();p.on('pageerror',e=>errors.push({...active,message:e.message}));p.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push({...active,message:m.text()});});
    await p.goto(url(name,mode,name==='multi-step'?'failure':'primary'));await ready(p);
    const style=await p.evaluate(()=>{const input=document.querySelector('input:not([type=checkbox])'),bar=getComputedStyle(document.querySelector('.workspace-bar')),root=getComputedStyle(document.documentElement);return{body:getComputedStyle(document.body).fontSize,bodyToken:root.getPropertyValue('--yss-typography-body-font-size').trim(),height:(input.closest('[data-slot="input-group"]')||input).getBoundingClientRect().height,innerHeight:input.getBoundingClientRect().height,heightToken:root.getPropertyValue(innerWidth<=576?'--yss-control-height':'--yss-control-height-compact').trim(),radius:getComputedStyle(input).borderRadius,blur:bar.backdropFilter||bar.webkitBackdropFilter,background:bar.backgroundColor};});
    assert.equal(style.body,style.bodyToken);assert.equal(style.height,parseFloat(style.heightToken));assert.equal(style.blur!=='none',mode==='glass');
    if(engine==='chromium')await p.screenshot({path:path.join(here,'screenshots',`${engine}-${name}-${mode}-${width}.png`),fullPage:true});
    if(name==='list-detail')await list(p);else await form(p);
    await p.getByText('评审工具：场景与辅助显示',{exact:true}).click();await p.locator('#reset').click();if(name==='multi-step')assert.equal(await p.locator('#name').inputValue(),'');else await p.getByText('已选择 0 项',{exact:true}).waitFor();
    if(mode==='glass'){await p.locator('#solid-surfaces').check();assert.equal(await p.locator('.workspace-bar').evaluate(el=>getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter),'none');}
    await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('button').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    await p.goto(url(name,mode,'unknown'));await p.getByRole('alert').getByText('未知或缺失的场景，请检查评审链接。',{exact:true}).waitFor();
    results.push({...active,status:'passed',style,offline:engine==='chromium'?'context-offline + http-block':'http-block (file loader limitation)'});await context.close();
   }
  }finally{await browser.close();}
 }
 // Comparison v2 interactions and deep links in offline Chromium.
 const browser=await chromium.launch({headless:true});try{
  for(const name of ['list-detail','multi-step']){
   const c=await browser.newContext({viewport:{width:1440,height:900},offline:true}),p=await c.newPage();p.on('pageerror',e=>errors.push({name,message:e.message}));const entry=pathToFileURL(path.join(temp,'comparisons',name,'index.html')).href;const scene=name==='list-detail'?'primary':'failure';
   await p.goto(entry+`#variant=glass&case=${scene}`);await p.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();const f=p.frameLocator('iframe');if(name==='list-detail')await f.locator('#keyword').fill('季度');else await f.locator('#name').fill('临时草稿');
   await p.locator('#variant').selectOption('standard');await p.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();assert.equal(await p.frameLocator('iframe').locator(name==='list-detail'?'#keyword':'#name').inputValue(),'');assert.equal(await p.locator('#case').inputValue(),scene);
   await p.locator('#reset').click();await p.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();await p.goto(entry+'#variant=missing&case=primary');await p.locator('#error').waitFor({state:'visible'});assert.equal(await p.locator('iframe').count(),0);results.push({name,check:'comparison-reset-switch-deeplink-invalid',status:'passed'});await c.close();
  }
 }finally{await browser.close();}
 assert.deepEqual(errors,[]);
 await writeFile(path.join(here,'evidence/browser.json'),JSON.stringify({status:'passed',copy:temp,results,errors},null,2));console.log(JSON.stringify({status:'passed',checks:results.length,copy:temp}));
}catch(error){await writeFile(path.join(here,'evidence/browser-failure.json'),JSON.stringify({status:'failed',active,error:error.stack,results,errors},null,2));throw error;}
