// Real browser verification of reusable maintenance starters; never product approval.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {prepareFlowPrototype,validatePrototypeProject} from '../scripts/prototype-contract.mjs';
import {buildAntdPrototype} from '../scripts/build-antd-prototype.mjs';
const {chromium}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-workbench-browser-'));const source=path.join(temp,'source');
await mkdir(path.join(source,'docs/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','docs/design/tokens/variables.css'])await cp(new URL(`../../../../${ref}`,import.meta.url),path.join(source,ref));
const results=[];const browser=await chromium.launch(process.env.YSS_BROWSER_CHANNEL?{channel:process.env.YSS_BROWSER_CHANNEL}:{});
try{
 for(const kind of ['native','antd']){
  const root=path.join(source,`docs/.scratch/${kind}/design/prototypes`);
  if(kind==='native')await prepareFlowPrototype({projectRoot:source,root,feature:kind,pattern:'workbench'});
  else{await assert.rejects(buildAntdPrototype({projectRoot:source,root,feature:kind}),/理由/);await buildAntdPrototype({projectRoot:source,root,feature:kind,toolchain:process.env.YSS_ANTD_TOOLCHAIN,reason:'维护测试：复杂表格分页、Select 与日期区间需要真实交互'});}
  assert.deepEqual((await validatePrototypeProject({root,componentBasis:kind==='antd'?'react-antd-prebuilt':'html-css-js'})).errors,[]);
  if(kind==='antd'){
   assert((await validatePrototypeProject({root,componentBasis:'html-css-js'})).errors.length);
   const ref=path.join(root,'build-provenance.json'),original=await readFile(ref,'utf8');
   await writeFile(ref,'{broken');assert((await validatePrototypeProject({root})).errors.some(e=>e.includes('有效 JSON')));await writeFile(ref,original);
   const sourceRef=path.join(root,'authoring-source.jsx'),sourceBytes=await readFile(sourceRef);
   await writeFile(sourceRef,sourceBytes+'\n// drift');assert((await validatePrototypeProject({root})).errors.some(e=>e.includes('源文件')));await writeFile(sourceRef,sourceBytes);
   await assert.rejects(buildAntdPrototype({projectRoot:source,root,feature:kind,toolchain:process.env.YSS_ANTD_TOOLCHAIN,reason:'验证拒绝覆盖'}),/已存在内容/);
   assert.deepEqual((await validatePrototypeProject({root})).errors,[]);
  }
  const portable=path.join(temp,kind);await cp(root,portable,{recursive:true});const url=pathToFileURL(path.join(portable,'index.html')).href;
  const context=await browser.newContext({offline:true,deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});
  const page=await context.newPage();const failures=[];
  page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))failures.push(m.text());});page.on('requestfailed',r=>failures.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))failures.push(r.url());});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:900});await page.goto('about:blank');await page.goto(url+'#scenario=failure');
   await page.getByRole('button',{name:'查看 M-001',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('维护测试：跨部门资料更新');await page.locator('#save').click();await page.getByText('保存失败，输入已保留，请重试。',{exact:true}).waitFor();assert.equal(await page.locator('#name').inputValue(),'维护测试：跨部门资料更新');await page.locator('#retry').click();await page.getByText('保存成功（本地模拟）。',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('.table-scroll, .ant-table-content').evaluateAll(elements=>elements.forEach(el=>{el.scrollLeft=0;}));await page.evaluate(()=>scrollTo(0,0));
   const screenshot=path.join(temp,`${kind}-${width}.png`);await page.screenshot({path:screenshot,animations:'disabled'});
   await page.locator('summary').click();await page.locator('#reset').click();assert.equal(await page.locator('table').getByText('季度经营分析资料',{exact:true}).count(),1);
   await page.locator('#scenario').selectOption('no-permission');assert.equal(await page.getByRole('button',{name:'编辑 M-001',exact:true}).isDisabled(),true);
   await page.locator('#scenario').selectOption('empty');await page.getByText('暂无符合条件的资料',{exact:true}).waitFor();
   await page.locator('#scenario').selectOption('loading');if(kind==='native')await page.getByText('正在加载（固定评审状态）',{exact:true}).waitFor();else assert.equal(await page.locator('.ant-spin-spinning').count(),1);
   await page.locator('#scenario').selectOption('conflict');await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('冲突时保留的输入');await page.locator('#save').click();assert.equal(await page.locator('#name').inputValue(),'冲突时保留的输入');await page.locator('#reload').click();
   const control=await page.locator('#save').evaluate(el=>({height:el.getBoundingClientRect().height,color:getComputedStyle(el).backgroundColor}));assert.equal(control.height,32);assert.equal(control.color,'rgb(36, 91, 219)');
   if(kind==='antd'){const theme=await page.locator('#name').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));assert.equal(theme.background,'rgb(255, 255, 255)');assert.equal(theme.color,'rgba(0, 0, 0, 0.88)');}
   if(kind==='antd'){
    await page.locator('#owner').click();await page.locator('.ant-select-item-option').filter({hasText:'王宁'}).click();
    const date=page.locator('.ant-picker-input input').first();await date.click();await page.locator('.ant-picker-panel-container').waitFor();await page.keyboard.press('Escape');await page.locator('.ant-picker-panel-container').waitFor({state:'hidden'});
   }
   await page.locator('#save').focus();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.locator('#scenario').selectOption('primary');await page.locator('#keyword').fill('M-003');await page.getByRole('button',{name:'查询',exact:true}).click();await page.getByRole('button',{name:'查看 M-003',exact:true}).waitFor();
   results.push({kind,width,result:'passed',control,screenshot,scenarios:['query','detail-escape','edit-failure-retry','reset','no-permission','empty','loading','conflict-reload',...(kind==='antd'?['select','date-panel']:[])]});
  }
  assert.deepEqual(failures,[]);await context.close();
 }
 const report={result:'passed',scope:'maintenance starters only; not product QA or approval',browser:browser.version(),os:process.platform,delivery:'file:// isolated directory offline=true',results};await writeFile(path.join(temp,'result.json'),JSON.stringify(report,null,2));console.log(path.join(temp,'result.json'));
}finally{await browser.close();}
