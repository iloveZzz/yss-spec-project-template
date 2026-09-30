import { chromium } from '/Users/zhudaoming/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)), root='/Users/zhudaoming/Projects/yss-spec-project-template';
const browser=await chromium.launch({headless:true});const rows=[];
for(const mode of ['preview','preview-dark'])for(const size of [{width:1440,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport:size});const errors=[],failed=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
 await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+root+'/.template-source/design/'+mode+'.html');
 const styles=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement),body=getComputedStyle(document.body),button=getComputedStyle(document.querySelector('[data-primary-action]'));return{bgToken:root.getPropertyValue('--brand-color-bg-layout'),textToken:root.getPropertyValue('--brand-color-text'),bodyBg:body.backgroundColor,font:body.font,fontSize:body.fontSize,buttonBg:button.backgroundColor,buttonHeight:button.height,overflow:document.documentElement.scrollWidth>innerWidth,densityText:document.querySelector('.density-chip')?.textContent}});
 await page.screenshot({path:path.join(out,mode+'-'+size.width+'.png'),fullPage:true});rows.push({mode,viewport:size,styles,failed,errors});await page.close();
}
await browser.close();fs.writeFileSync(path.join(out,'preview-browser.json'),JSON.stringify({scope:'read-only legacy preview diagnostic; not full QA',rows},null,2));console.log(JSON.stringify(rows,null,2));