import { fixtureTracker } from './work-layout-fixture.mjs';
// Real browser verification of reusable maintenance starters; never product approval.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {prepareFlowPrototype,validatePrototypeProject} from '../scripts/prototype-contract.mjs';
import {buildShadcnVuePrototype} from '../scripts/build-shadcn-vue-prototype.mjs';
const engines=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');const engine=process.env.YSS_BROWSER_ENGINE||'chromium';const chromium=engines[engine];
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-workbench-browser-'));const source=path.join(temp,'source');await fixtureTracker(source);
await mkdir(path.join(source,'.template-spec/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(new URL(`../../../../${ref}`,import.meta.url),path.join(source,ref));
const results=[];const browser=await chromium.launch(process.env.YSS_BROWSER_CHANNEL?{channel:process.env.YSS_BROWSER_CHANNEL}:{});
try{
 for(const kind of ['native','shadcn']){
  const root=path.join(source,`docs/.scratch/${kind}/design/prototypes`);
  if(kind==='native')await prepareFlowPrototype({projectRoot:source,root,feature:kind,pattern:'workbench'});
  else{await assert.rejects(buildShadcnVuePrototype({projectRoot:source,root,feature:kind}),/toolchain/);await buildShadcnVuePrototype({projectRoot:source,root,feature:kind,toolchain:process.env.YSS_VUE_TOOLCHAIN,config:new URL('../assets/vue-business-patterns/conflict-standard.config.json',import.meta.url).pathname,profile:'H2'});}
  assert.deepEqual((await validatePrototypeProject({root,componentBasis:kind==='shadcn'?'vue-shadcn-prebuilt':'html-css-js'})).errors,[]);
  if(kind==='shadcn'){
   assert((await validatePrototypeProject({root,componentBasis:'html-css-js'})).errors.length);
   const ref=path.join(root,'build-provenance.json'),original=await readFile(ref,'utf8');
   await writeFile(ref,'{broken');assert((await validatePrototypeProject({root})).errors.some(e=>e.includes('有效 JSON')));await writeFile(ref,original);
   const sourceRef=path.join(root,'authoring-source.ts'),sourceBytes=await readFile(sourceRef);
   await writeFile(sourceRef,sourceBytes+'\n// drift');assert((await validatePrototypeProject({root})).errors.some(e=>e.includes('源文件')));await writeFile(sourceRef,sourceBytes);
   await assert.rejects(buildShadcnVuePrototype({projectRoot:source,root,feature:kind,toolchain:process.env.YSS_VUE_TOOLCHAIN}),/已存在内容/);
   assert.deepEqual((await validatePrototypeProject({root})).errors,[]);
  }
  const portable=path.join(temp,kind);await cp(root,portable,{recursive:true});const url=pathToFileURL(path.join(portable,'index.html')).href;
  const context=await browser.newContext({offline:engine==='chromium',deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});
  if(engine==='webkit')await context.route(/^https?:/,route=>route.abort('internetdisconnected'));
  const page=await context.newPage();const failures=[];
  page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))failures.push(m.text());});page.on('requestfailed',r=>failures.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))failures.push(r.url());});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:900});await page.goto('about:blank');await page.goto(url+'#scenario=failure');
   await page.getByRole('button',{name:'查看 M-001',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   if(kind==='shadcn')assert.equal(await page.getByRole('button',{name:'查看 M-001',exact:true}).evaluate(el=>el===document.activeElement),true);
   await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('维护测试：跨部门资料更新');await page.locator('#save').click();await page.getByText('保存失败，输入已保留，请重试。',{exact:true}).waitFor();assert.equal(await page.locator('#name').inputValue(),'维护测试：跨部门资料更新');await page.locator('#retry').click();await page.getByText('保存成功（本地模拟）。',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('.table-scroll, [data-slot="table-container"]').evaluateAll(elements=>elements.forEach(el=>{el.scrollLeft=0;}));await page.evaluate(()=>scrollTo(0,0));
   await page.goto(url+'#scenario=primary');await page.getByRole('button',{name:'查看 M-001',exact:true}).waitFor();
   const screenshot=path.join(temp,`${kind}-${width}.png`);await page.screenshot({path:screenshot,animations:'disabled'});
   await page.locator('summary').click();await page.locator('#reset').click();assert.equal(await page.locator('table').getByText('季度经营分析资料',{exact:true}).count(),1);
   await page.locator('#scenario').selectOption('no-permission');assert.equal(await page.getByRole('button',{name:'编辑 M-001',exact:true}).isDisabled(),true);
   if(kind==='native'){await page.locator('#scenario').selectOption('empty');await page.getByText('暂无符合条件的资料',{exact:true}).waitFor();
   await page.locator('#scenario').selectOption('loading');await page.getByText('正在加载（固定评审状态）',{exact:true}).waitFor();}
   await page.locator('#scenario').selectOption('conflict');await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('冲突时保留的输入');await page.locator('#save').click();assert.equal(await page.locator('#name').inputValue(),'冲突时保留的输入');if(kind==='native'){page.once('dialog',d=>d.dismiss());await page.locator('#reload').click();assert.equal(await page.locator('#name').inputValue(),'冲突时保留的输入');page.once('dialog',d=>d.accept());await page.locator('#reload').click();}else{await page.locator('#reload').click();await page.getByRole('button',{name:'保留草稿',exact:true}).click();assert.equal(await page.locator('#name').inputValue(),'冲突时保留的输入');await page.locator('#reload').click();await page.getByRole('button',{name:'放弃并重新加载',exact:true}).click();assert.equal(await page.locator('#version').textContent(),'2');}assert.equal(await page.locator('#name').inputValue(),'服务端最新资料名称');assert.equal(await page.locator('#version').textContent(),'2');assert.equal(kind==='native'?await page.locator('#owner').inputValue():await page.locator('#owner').textContent(),'最新负责人');
   const control=await page.locator('#save').evaluate(el=>({height:el.getBoundingClientRect().height,color:getComputedStyle(el).backgroundColor}));const token=await page.evaluate(width=>{const el=document.createElement('div');el.style.cssText=`height:var(${width===390?'--yss-control-height':'--yss-control-height-compact'});background:var(--yss-color-primary-control)`;document.body.append(el);const v={height:el.getBoundingClientRect().height,color:getComputedStyle(el).backgroundColor};el.remove();return v;},width);assert.deepEqual(control,token);
   if(kind==='shadcn'){const theme=await page.locator('#name').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));const tokenTheme=await page.evaluate(()=>{const el=document.createElement('div');el.style.cssText='background:var(--brand-color-bg-container);color:var(--brand-color-text)';document.body.append(el);const v={background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color};el.remove();return v;});assert.deepEqual(theme,tokenTheme);}
   if(kind==='shadcn'){
    await page.locator('#name').focus();for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));}
    await page.locator('#owner').focus();await page.keyboard.press('Enter');await page.getByRole('listbox').waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');await page.keyboard.press('Home');await page.waitForFunction(()=>document.activeElement?.textContent==='张明');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.getElementById('owner')?.textContent==='张明');
   }
   await page.locator('#save').click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'查看 M-001',exact:true}).click();await page.getByRole('dialog').getByText('服务端最新资料名称',{exact:true}).waitFor();await page.getByRole('dialog').locator('dd').filter({hasText:/^2$/}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.locator('#scenario').selectOption('primary');await page.locator('#keyword').fill('M-003');await page.getByRole('button',{name:'查询',exact:true}).click();await page.getByRole('button',{name:'查看 M-003',exact:true}).waitFor();
   {
    for(const fragment of ['#scenario=unknown','#scenario=','#bad=primary']){await page.goto(url+fragment);await page.getByRole('alert').filter({hasText:'未知或缺失的场景'}).waitFor();}
    await page.goto(url+'#scenario=primary');await page.getByRole('button',{name:'编辑 M-001',exact:true}).waitFor();
   }
   results.push({kind,width,result:'passed',control,screenshot,scenarios:['query','detail-escape','edit-failure-retry','reset','no-permission',...(kind==='native'?['empty','loading']:[]),'conflict-reload',...(kind==='shadcn'?['select']:[])]});
  }
  assert.deepEqual(failures,[]);await context.close();
 }
 const h1Root=path.join(source,'docs/.scratch/shadcn-h1/design/prototypes');
 await buildShadcnVuePrototype({projectRoot:source,root:h1Root,feature:'shadcn-h1',profile:'H1',toolchain:process.env.YSS_VUE_TOOLCHAIN});
 assert.deepEqual((await validatePrototypeProject({root:h1Root,profile:'H1'})).errors,[]);
 assert((await validatePrototypeProject({root:h1Root,profile:'H2'})).errors.length);
 const h1Copy=path.join(temp,'h1-portable');await cp(h1Root,h1Copy,{recursive:true});
 const h1Context=await browser.newContext({offline:engine==='chromium',viewport:{width:390,height:844}});const h1Page=await h1Context.newPage();const h1Errors=[];h1Page.on('pageerror',e=>h1Errors.push(e.message));
 if(engine==='webkit')await h1Context.route(/^https?:/,route=>route.abort('internetdisconnected'));for(const width of [1440,390]){await h1Page.setViewportSize({width,height:width===390?844:900});await h1Page.goto('about:blank');await h1Page.goto(pathToFileURL(path.join(h1Copy,'index.html')).href);await h1Page.getByRole('button',{name:'查看 M-001',exact:true}).click();if(width>=1200){await h1Page.locator('.inline-detail').waitFor();await h1Page.getByRole('button',{name:'关闭详情',exact:true}).click();}else{await h1Page.getByRole('dialog').waitFor();await h1Page.keyboard.press('Escape');}assert.equal(await h1Page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}assert.deepEqual(h1Errors,[]);await h1Context.close();
 const report={h1:'passed',result:'passed',scope:'maintenance starters only; not product QA or approval',engine,browser:browser.version(),os:process.platform,delivery:engine==='chromium'?'file:// isolated directory offline=true':'file:// HTTP(S) blocked; offline flag exception recorded',results};await writeFile(path.join(temp,'result.json'),JSON.stringify(report,null,2));console.log(path.join(temp,'result.json'));
}finally{await browser.close();}
