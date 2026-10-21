// Use the browser's actual tabs.setZoom API, not CSS zoom or DPR emulation.
import assert from 'node:assert/strict';import{mkdtemp,mkdir,writeFile}from'node:fs/promises';import path from'node:path';import os from'node:os';import{pathToFileURL}from'node:url';
const{chromium}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright');
const root=process.argv[2];if(!root)throw Error('需要已构建的模式目录');
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-zoom-browser-')),extension=path.join(temp,'extension');await mkdir(extension);
await writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local prototype zoom verification',version:'1.0',permissions:['tabs'],background:{service_worker:'worker.js'}}));await writeFile(path.join(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
const context=await chromium.launchPersistentContext(path.join(temp,'profile'),{headless:true,channel:'chromium',viewport:null,args:['--window-size=1440,1000',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const rows=[];
try{await context.setOffline(true);const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const mode of ['list-detail','multi-step','approval','conflict','analysis','component-states','combined-query','owner-validity','workspace']){
  const url=pathToFileURL(path.join(path.resolve(root),mode,'index.html')).href;await page.goto(url);await page.locator('h1').waitFor();
  await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);await chrome.tabs.setZoom(tab.id,1);},url);await page.waitForTimeout(100);const initialWidth=await page.evaluate(()=>innerWidth);
  const zoom=await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);await chrome.tabs.setZoom(tab.id,2);return await chrome.tabs.getZoom(tab.id);},url);assert.equal(zoom,2);await page.waitForFunction(w=>Math.abs(innerWidth-w/2)<=1,initialWidth);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(mode==='list-detail'){await page.getByRole('button',{name:'查看 M-001',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}
  else if(mode==='multi-step'){await page.locator('#name').fill('缩放验证');await page.getByRole('button',{name:'下一步',exact:true}).click();await page.locator('#owner').fill('测试');await page.getByRole('button',{name:'确认提交',exact:true}).click();await page.getByText('提交成功（本地模拟）。',{exact:true}).waitFor();}
  else if(mode==='approval'){await page.getByRole('button',{name:'通过 M-001',exact:true}).click();await page.getByText('已处理 1 项（本地模拟）。',{exact:true}).waitFor();}
  else if(mode==='conflict'){await page.getByRole('button',{name:'编辑 M-001',exact:true}).click();await page.locator('#name').fill('缩放编辑');await page.locator('#save').click();await page.getByText('保存成功（本地模拟）。',{exact:true}).waitFor();}
  else if(mode==='component-states'){await page.getByRole('button',{name:'验证字段',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'catalog-input');await page.locator('#catalog-input').fill('缩放组件');await page.getByRole('button',{name:'打开详情侧栏',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'关闭详情',exact:true}).click();}
  else if(mode==='combined-query'||mode==='owner-validity'){const id=mode==='combined-query'?'query':'form';await page.locator('#'+id+'-range').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('button',{name:'取消',exact:true}).click();}
  else if(mode==='workspace'){await page.getByRole('button',{name:'已打开页面菜单',exact:true}).click();await page.keyboard.press('Escape');}
  else{await page.locator('#keyword').fill('张明');await page.getByRole('button',{name:'定位 M-001',exact:true}).click();await page.getByRole('region',{name:'定位资料',exact:true}).waitFor();}
  await page.screenshot({path:path.join(temp,`${mode}-200.png`),fullPage:true});rows.push({mode,zoom,initialWidth,status:'passed',geometry:await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}))});
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(temp,'result.json'),JSON.stringify({status:'passed',mechanism:'chrome.tabs.setZoom/getZoom in isolated test profile',rows,errors},null,2));console.log(path.join(temp,'result.json'));
}finally{await context.close();}
