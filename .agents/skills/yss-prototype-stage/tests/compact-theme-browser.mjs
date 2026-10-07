import { fixtureTracker } from './work-layout-fixture.mjs';
// Maintainer check against the normative source, not a visual approval.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
import {parseDocument} from '../../../../scripts/vendor/yaml.mjs';
import {buildShadcnVuePrototype} from '../scripts/build-shadcn-vue-prototype.mjs';
const {chromium}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const projectRoot=new URL('../../../../',import.meta.url).pathname,patterns=path.resolve(process.argv[2]);
const source=await readFile(path.join(projectRoot,'DESIGN.md'),'utf8'),spec=parseDocument(source.slice(4,source.indexOf('\n---',4))).toJS();
const output=await mkdtemp(path.join(os.tmpdir(),'yss-compact-theme-check-')),browser=await chromium.launch(),report={result:'passed',source:'DESIGN.md',cases:[],artifacts:output};
const resolve=v=>v.replace(/\{(\w+)\.([\w-]+)\}/g,(_,g,k)=>spec[g][k]);
try{
 const context=await browser.newContext({offline:true}),page=await context.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const mode of ['list-detail','multi-step','approval','conflict','analysis']){
   await page.goto(pathToFileURL(path.join(patterns,mode,'index.html')).href);await page.locator('h1').waitFor();
   const actual=await page.evaluate(()=>{
    const get=(selector,property)=>getComputedStyle(document.querySelector(selector))[property];
    const button=document.querySelector('[data-slot="button"]');
    return {density:document.documentElement.dataset.density,body:get('body','fontSize'),h1:get('h1','fontSize'),headingLine:get('h1','lineHeight'),control:button.getBoundingClientRect().height,surface:get(document.querySelector('.form-body')?'.form-body':'.surface','paddingTop'),radius:get('.surface','borderTopLeftRadius')};
   });
   assert.equal(actual.density,'compact');assert.equal(actual.body,spec.typography.body.fontSize);assert.equal(actual.h1,spec.typography[spec.components['workspace-title'].typography.match(/typography\.([^}]+)/)[1]].fontSize);
   assert(Math.abs(parseFloat(actual.headingLine)-parseFloat(spec.typography[spec.components['workspace-title'].typography.match(/typography\.([^}]+)/)[1]].fontSize)*Number(spec.typography[spec.components['workspace-title'].typography.match(/typography\.([^}]+)/)[1]].lineHeight))<.02);
   assert.equal(actual.control,parseFloat(spec.components[width===390?'button-primary':'button-compact'].height));
   assert.equal(actual.surface,width===390?spec.spacing.sm:resolve(spec.components['card-compact'].padding));assert.equal(actual.radius,spec.rounded.lg);
   report.cases.push({mode,width,actual,result:'passed'});
  }
  await page.goto(pathToFileURL(path.join(patterns,'list-detail/index.html')).href);await page.getByRole('checkbox',{name:'选择 M-001',exact:true}).click();
  const row=page.locator('tr[data-state="selected"]');assert.equal(await row.count(),1);
  async function color(locator,property,value){const expected=await page.evaluate(({p,v})=>{const el=document.createElement('i');el.style[p]=v;document.body.append(el);const result=getComputedStyle(el)[p];el.remove();return result;},{p:property,v:value});await locator.evaluate((el,{property,expected})=>new Promise((resolve,reject)=>{const started=performance.now();function check(){if(getComputedStyle(el)[property]===expected)return resolve();if(performance.now()-started>1000)return reject(Error(`${property}: ${getComputedStyle(el)[property]} != ${expected}`));requestAnimationFrame(check);}check();}),{property,expected});}
  await color(row,'backgroundColor',spec.colors['primary-bg']);
  await page.getByRole('button',{name:'查看 M-001',exact:true}).click();const dialog=width>=1200?page.locator('.inline-detail'):page.getByRole('dialog');
  if(width<1200){assert.equal(await dialog.evaluate(el=>getComputedStyle(el).paddingTop),'0px');assert.equal(await page.locator('[data-slot=sheet-header]').evaluate(el=>getComputedStyle(el).paddingTop),spec.spacing.lg);assert.equal(await dialog.locator('dl').evaluate(el=>getComputedStyle(el).paddingTop),spec.spacing.md);await page.keyboard.press('Escape');}else{assert.equal(await dialog.evaluate(e=>e.getBoundingClientRect().width),384);await page.getByRole('button',{name:'关闭详情',exact:true}).click();}
  await page.goto(pathToFileURL(path.join(patterns,'multi-step/index.html')).href);const next=page.getByRole('button',{name:'下一步',exact:true});
  await next.hover();await page.waitForTimeout(150);await color(next,'backgroundColor',spec.colors['primary-control-hover']);
  await page.mouse.down();await page.waitForTimeout(150);await color(next,'backgroundColor',spec.colors['primary-active']);await page.mouse.up();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'name');
  await color(page.locator('[data-slot="input-group"]'),'borderTopColor','var(--brand-color-error-active)');
  await page.locator('#name').focus();const focus=await page.locator('[data-slot="input-group"]').evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));assert.equal(focus.style,'solid');assert(parseFloat(focus.width)>0);
  await page.screenshot({path:path.join(output,`form-invalid-${width}.png`)});
  report.cases.push({width,checks:['selected-row','modal-padding','primary-hover-active','error-focus'],result:'passed'});
 }
 // A preserved comfortable density is an explicit author choice.
 const feature='comfortable',root=path.join(output,`docs/.scratch/${feature}/design/prototypes`);
 const {mkdir,cp}=await import('node:fs/promises');await mkdir(path.join(output,'.template-spec/design/tokens'),{recursive:true});
 for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(projectRoot,ref),path.join(output,ref));
 await fixtureTracker(output);
 await buildShadcnVuePrototype({projectRoot:output,root,feature,toolchain:process.env.YSS_VUE_TOOLCHAIN,density:'comfortable'});
 await page.setViewportSize({width:1440,height:900});await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.locator('#keyword').waitFor();
 assert.equal(await page.locator('#keyword').evaluate(el=>el.getBoundingClientRect().height),parseFloat(spec.components['button-primary'].height));
 report.cases.push({density:'comfortable',result:'passed'});await context.close();
}finally{await browser.close();}
await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(path.join(output,'result.json'));
