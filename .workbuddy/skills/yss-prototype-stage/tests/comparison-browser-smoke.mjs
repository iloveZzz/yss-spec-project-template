import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { comparisonFixture } from './comparison-fixture.mjs';
import { exportCraftExamples } from '../../yss-design-system/scripts/export-craft-examples.mjs';
const {chromium} = await import(process.env.YSS_PLAYWRIGHT_MODULE || 'playwright');
const temp = await mkdtemp(path.join(os.tmpdir(),'yss-comparison-browser-'));
const f = await comparisonFixture();const prepared = await f.prepare();const portable=path.join(temp,'comparison');await cp(prepared.root,portable,{recursive:true});
const examples = await exportCraftExamples({projectRoot:fileURLToPath(new URL('../../../../',import.meta.url)),output:path.join(temp,'examples')});
await assert.rejects(exportCraftExamples({projectRoot:f.root,output:examples.root}),/拒绝覆盖/);
const browser=await chromium.launch(process.env.YSS_BROWSER_CHANNEL?{channel:process.env.YSS_BROWSER_CHANNEL}:{});
const results=[];
try {
 const context=await browser.newContext({offline:true,deviceScaleFactor:1,reducedMotion:'reduce',locale:'zh-CN',timezoneId:'Asia/Shanghai'});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))errors.push(r.url());});
 const url=pathToFileURL(path.join(portable,'index.html')).href;
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:width===390?844:900});await page.goto(url+'#variant=a&case=retry');
  const frame=()=>page.frameLocator('iframe');
  await frame().locator('#content').fill('失败后必须保留的本地输入');await frame().locator('#save').click();assert.equal(await frame().locator('body').getAttribute('data-state'),'error');
  assert.equal(await frame().locator('#content').inputValue(),'失败后必须保留的本地输入');
  await page.locator('#variant').selectOption('b');await frame().locator('#content').waitFor();assert.equal(await frame().locator('#content').inputValue(),'失败后应保留的输入');
  await frame().locator('#content').fill('改变内容');await page.locator('#reset').click();await frame().locator('#content').waitFor();assert.equal(await frame().locator('#content').inputValue(),'失败后应保留的输入');
  await page.reload();await frame().locator('#content').waitFor();assert.equal(await page.locator('#variant').inputValue(),'b');assert.equal(await page.locator('#case').inputValue(),'retry');
  assert.equal(await page.locator('iframe').evaluate(e=>e.getBoundingClientRect().width),width);
  await page.locator('#variant').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'case');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();
  await page.screenshot({path:path.join(temp,`comparison-${width}.png`),animations:'disabled'});
  await page.goto(url+'#variant=missing&case=retry');assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#error').isVisible(),true);
  await page.goto(url+'#variant=a&case=missing');assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#error').isVisible(),true);
  results.push({kind:'comparison',width,result:'passed'});
  const exampleURL=pathToFileURL(examples.entry).href;
  for(const pair of ['list','form','approval']) {
   const states=[];
   for(const variant of ['before','after']) {
    await page.goto(`${exampleURL}#pair=${pair}&variant=${variant}&scenario=failure`);
    if(pair==='form')await page.locator('#name').fill('用户尚未保存的长中文资料名称');
    await page.locator('#submit').click();await page.getByText('保存失败，当前输入已保留。请重试。',{exact:true}).waitFor();
    if(pair==='form')assert.equal(await page.locator('#name').inputValue(),'用户尚未保存的长中文资料名称');
    await page.locator('#retry').click();await page.getByText('操作成功（本地模拟）。',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'submit');
    await page.locator('#reset').click();
    states.push(await page.locator('#content').innerText());
    if(pair==='list'){await page.getByRole('button',{name:'查看 M-001',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'查看 M-001',exact:true}).evaluate(e=>e===document.activeElement),true);}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(temp,`${pair}-${variant}-${width}.png`),animations:'disabled'});
    await page.locator('#scenario').selectOption('no-permission');assert.equal(await page.locator('#submit').isDisabled(),true);await page.getByText('无操作权限：可以查看资料，请联系负责人。',{exact:true}).waitFor();
    await page.locator('#scenario').selectOption('conflict');await page.locator('#submit').click();if(pair==='form')await page.locator('#name').fill('冲突草稿');page.once('dialog',d=>d.dismiss());await page.locator('#reload').click();if(pair==='form')assert.equal(await page.locator('#name').inputValue(),'冲突草稿');page.once('dialog',d=>d.accept());await page.locator('#reload').click();if(pair==='form'){assert.equal(await page.locator('#name').inputValue(),'服务端最新资料名称');assert.equal(await page.locator('#owner').inputValue(),'最新负责人');assert.equal(await page.locator('#version').textContent(),'2');}await page.locator('#submit').click();await page.getByText('操作成功（本地模拟）。',{exact:true}).waitFor();await page.locator('#reset').click();page.once('dialog',d=>d.accept());await page.locator('#submit').click();await page.locator('#reload').click();await page.getByText('已重新加载，可继续核对和提交。',{exact:true}).waitFor();
   }
   assert.equal(states[0],states[1],'两侧内容必须一致');results.push({kind:'craft',pair,width,result:'passed'});
  }
 }
 assert.deepEqual(errors,[]);const unexpectedErrors=[...errors];
 // Initialization failure must never become a successful load indication.
 const appPath=path.join(portable,'variants/a/app.js'),originalApp=await readFile(appPath,'utf8');
 await writeFile(appPath,'throw new Error("fixture startup failure");\n'+originalApp);
 await page.goto('about:blank');await page.goto(url+'#variant=a&case=normal');await page.locator('#error').filter({hasText:'候选初始化失败'}).waitFor();assert.equal(await page.locator('#status').textContent(),'');
 await writeFile(appPath,'const initial=window.prototypeRuntime.initialize("failure");window.prototypeRuntime.ready(initial.ticket);');
 await page.goto('about:blank');await page.goto(url+'#variant=a&case=normal');await page.locator('#error').filter({hasText:'场景或数据不一致'}).waitFor();
 await writeFile(appPath,'addEventListener("message",e=>{if(e.data?.type==="yss-scenario-request")parent.postMessage({type:"yss-scenario-result",requestId:"stale",status:"error",error:"late"},"*");});\n'+originalApp);
 await page.goto('about:blank');await page.goto(url+'#variant=a&case=normal');await page.getByText('场景已初始化；实际业务行为仍须评审。',{exact:true}).waitFor();assert.equal(await page.locator('#error').isVisible(),false);
 await writeFile(appPath,originalApp);
 const candidateHTML=path.join(portable,'variants/a/index.html'),originalHTML=await readFile(candidateHTML,'utf8');
 await writeFile(candidateHTML,originalHTML.replace('<script src="./scenario-runtime.js"></script>','<script src="./scenario-runtime.js"></script><script src="missing-startup.js"></script>'));
 assert.notEqual(await readFile(candidateHTML,'utf8'),originalHTML);
 await page.goto('about:blank');await page.goto(url+'#variant=a&case=normal');await page.locator('#error').filter({hasText:'候选初始化失败'}).waitFor();assert.equal(await page.locator('#status').textContent(),'');
 await writeFile(candidateHTML,originalHTML);
 // A corrupt entry must show a load error, not a fallback successful candidate.
 const broken=path.join(portable,'variants/a/index.html');await writeFile(broken,'<!doctype html><html><body>broken entry</body></html>');
 await page.goto('about:blank');await page.goto(url+'#variant=a&case=normal');await page.locator('#error').waitFor({state:'visible',timeout:12000});assert.equal(await page.locator('iframe').count(),0);
 const report={result:'passed',scope:'maintenance examples/comparison only; no product approval',browser:browser.version(),delivery:'isolated file:// offline=true',errors:unexpectedErrors,negativeProbeErrors:errors,results,artifacts:temp};
 await writeFile(path.join(temp,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));console.log(path.join(temp,'result.json'));
}finally{await browser.close();}
