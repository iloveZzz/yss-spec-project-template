import { fixtureTracker } from './work-layout-fixture.mjs';
// Real browser checks for the maintenance catalog and enhanced patterns; no user approval.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,mkdir} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
import {parseDocument} from '../../../../scripts/vendor/yaml.mjs';
import {buildShadcnVuePrototype} from '../scripts/build-shadcn-vue-prototype.mjs';
const {chromium,webkit}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../../../../',import.meta.url).pathname,patterns=path.resolve(process.argv[2]),out=await mkdtemp(path.join(os.tmpdir(),'yss-components-check-'));
const md=await readFile(path.join(root,'DESIGN.md'),'utf8'),spec=parseDocument(md.slice(4,md.indexOf('\n---',4))).toJS();
const report={result:'running',cases:[],output:out},errors=[];
const go=(page,mode,scene='primary')=>page.goto(pathToFileURL(path.join(patterns,mode,'index.html')).href+'#scenario='+scene);
import {visual} from './browser-visual.mjs';

try{
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{
 const context=await browser.newContext({offline:engine==='chromium',reducedMotion:'reduce',locale:'zh-CN'});
 if(engine==='webkit')await context.route(/^https?:/,r=>r.abort('internetdisconnected'));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});await go(page,'component-states');await page.locator('#catalog-input').waitFor();await visual(page);
  const expected=parseFloat(spec.components[width===390?'button-primary':'button-compact'].height);
  const group=page.locator('[data-slot="input-group"]'),input=page.locator('#catalog-input');
  assert.equal(await group.evaluate(e=>e.getBoundingClientRect().height),expected);
  assert.equal(await input.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');assert.equal(await input.evaluate(e=>getComputedStyle(e).fontSize),spec.typography.body.fontSize);
  await page.getByRole('button',{name:'验证字段',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'catalog-input');assert.equal(await input.getAttribute('aria-describedby'),'catalog-help catalog-error');await page.locator('#catalog-error').waitFor();
  await input.fill('临时资料');await page.getByRole('button',{name:'清除资料标记',exact:true}).click();assert.equal(await input.inputValue(),'');await input.fill('保留输入');
  await page.locator('#catalog-select').focus();await page.keyboard.press('Space');await page.getByRole('listbox').waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');await page.keyboard.press('End');await page.waitForFunction(()=>document.activeElement?.textContent==='选中');await page.keyboard.press('Enter');await page.getByRole('combobox').filter({hasText:'选中'}).waitFor();
  await page.locator('#catalog-check').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#catalog-check').getAttribute('data-state'),'checked');
  const check=await page.locator('#catalog-check').evaluate(el=>{const r=el.getBoundingClientRect(),p=getComputedStyle(el,'::after');return {w:r.width-parseFloat(p.left)-parseFloat(p.right),h:r.height-parseFloat(p.top)-parseFloat(p.bottom),x:r.x-parseFloat(p.left),y:r.y-parseFloat(p.top)};});assert(check.w>=24&&check.h>=24);
  const menu=page.getByRole('button',{name:'更多操作',exact:true});await menu.focus();await page.keyboard.press('Enter');await page.getByRole('menu').waitFor();await visual(page);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.textContent==='更多操作');await menu.click();assert.equal(await page.getByRole('menuitem',{name:'导出（未模拟）'}).getAttribute('data-disabled'),'');await page.getByRole('menuitem',{name:'执行本地演示'}).click();await page.getByText('菜单演示完成',{exact:true}).waitFor();
  for(const [trigger,title,close] of [['打开详情侧栏','演示详情','关闭详情'],['打开对话框','演示对话框','关闭对话框']]){
   await page.getByRole('button',{name:trigger,exact:true}).click();await page.getByRole('dialog',{name:title,exact:true}).waitFor();await visual(page);await page.keyboard.press('Escape');await page.waitForFunction(t=>document.activeElement?.textContent===t,trigger);
   await page.getByRole('button',{name:trigger,exact:true}).click();await page.getByRole('button',{name:close,exact:true}).click();await page.waitForFunction(t=>document.activeElement?.textContent===t,trigger);
  }
  for(let tab=0;tab<30;tab++){await page.keyboard.press('Tab');if(await page.getByRole('button',{name:'帮助说明',exact:true}).evaluate(el=>el===document.activeElement))break;}assert(await page.getByRole('button',{name:'帮助说明',exact:true}).evaluate(el=>el===document.activeElement));await page.locator('[data-slot=tooltip-content]').waitFor();const description=await page.getByRole('button',{name:'帮助说明',exact:true}).getAttribute('aria-describedby');assert(description);assert.equal(await page.locator(`[id="${description}"]`).textContent(),'提示补充说明，关键操作无需依赖提示。');await page.keyboard.press('Escape');await page.locator('[data-slot=tooltip-content]').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'确认动作演示',exact:true}).click();await page.getByRole('alertdialog').waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await input.inputValue(),'保留输入');
  await menu.click();await page.evaluate(()=>location.hash='scenario=no-permission');await page.waitForFunction(()=>!document.querySelector('[role="menu"]'));assert.equal(await input.inputValue(),'');assert.equal(await page.locator('#catalog-check').getAttribute('data-state'),'unchecked');
  await page.getByRole('button',{name:'打开详情侧栏',exact:true}).click();await page.evaluate(()=>location.hash='scenario=primary');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  await page.locator('summary').click();await page.locator('#reset').click();await page.locator('#reset').click();await visual(page);
  await page.screenshot({path:path.join(out,`${engine}-catalog-${width}.png`),fullPage:true});
  await go(page,'list-detail');await page.getByRole('checkbox',{name:'选择 M-001',exact:true}).click();await page.getByRole('button',{name:'下一页',exact:true}).click();await page.getByRole('checkbox',{name:'选择 M-003',exact:true}).click();await page.getByText('已选择 2 项',{exact:true}).waitFor();await page.locator('#keyword').fill('不存在');assert(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'上一页',exact:true}).isDisabled());await page.getByText('第 1 页 / 共 1 页',{exact:true}).waitFor();await page.getByRole('button',{name:'重置筛选',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'选择 M-001',exact:true}).getAttribute('data-state'),'checked');
  await page.getByRole('button',{name:'更多 M-001',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('menu').waitFor();await page.getByRole('menuitem',{name:'查看详情'}).focus();await page.keyboard.press('Enter');if(width>=1200){await page.locator('.inline-detail').waitFor();await page.getByRole('button',{name:'关闭详情',exact:true}).click();}else{await page.getByRole('dialog',{name:'资料详情'}).waitFor();await page.keyboard.press('Escape');}await page.waitForFunction(()=>document.activeElement?.id==='more-M-001');await visual(page);
  report.cases.push({engine,version:browser.version(),width,status:'passed',checks:['catalog-27-components','field-association-focus','input-group-computed-style','keyboard-select-menu-tooltip','overlay-escape-close-focus','pagination-selection-empty','hash-clears-overlays-and-input','repeated-reset','target-bounds','contrast','reduced-motion','offline']});
 }
 await context.close();}finally{await browser.close();}
}
// Comfortable is built through the supported author configuration, not patched CSS.
const fixture=path.join(out,'comfortable-fixture');await mkdir(path.join(fixture,'.template-spec/design/tokens'),{recursive:true});
for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(root,ref),path.join(fixture,ref));
const comfortable=path.join(fixture,'docs/.scratch/catalog/design/prototypes');
await fixtureTracker(fixture);
await buildShadcnVuePrototype({projectRoot:fixture,root:comfortable,feature:'catalog',toolchain:process.env.YSS_VUE_TOOLCHAIN,config:path.join(root,'.agents/skills/yss-prototype-stage/assets/vue-business-patterns/component-states-standard.config.json'),density:'comfortable'});
const browser=await chromium.launch();try{const context=await browser.newContext({offline:true,reducedMotion:'reduce'}),page=await context.newPage();
for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:900});await page.goto(pathToFileURL(path.join(comfortable,'index.html')).href);await page.locator('#catalog-input').waitFor();
assert.equal(await page.locator('[data-slot="input-group"]').evaluate(e=>e.getBoundingClientRect().height),parseFloat(spec.components['button-primary'].height));
assert.equal(await page.locator('[data-slot="card"]').first().evaluate(e=>getComputedStyle(e).paddingTop),width===390?spec.spacing.sm:spec.spacing.card);
assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),spec.typography.body.fontSize);await visual(page);report.cases.push({engine:'chromium',width,density:'comfortable',status:'passed',checks:['author-config-build','computed-control-card-body','contrast','target-bounds','reduced-motion']});}
}finally{await browser.close();}
assert.deepEqual(errors,[]);report.result='passed';
}catch(error){report.result='failed';report.failure=error.stack;throw error;}finally{await writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(path.join(out,'result.json'));}
