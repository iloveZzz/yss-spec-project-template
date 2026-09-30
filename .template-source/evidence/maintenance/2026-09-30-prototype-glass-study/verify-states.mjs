import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),{chromium}=await import(process.env.YSS_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true}),rows=[];
try{const c=await browser.newContext({viewport:{width:390,height:844},offline:true}),p=await c.newPage();
for(const mode of ['standard','glass'])for(const page of ['list-detail','multi-step']){
 const scenes=JSON.parse(await readFile(path.join(here,'authoring',page+'.scenarios.json'),'utf8')).scenarios;
 for(const scene of scenes){await p.goto(pathToFileURL(path.join(here,'comparisons',page,'variants',mode,'index.html')).href+'#scenario='+scene.id);await p.locator('h1').waitFor();
 if(scene.id==='no-permission'){if(page==='list-detail'){assert(await p.getByRole('checkbox').first().isDisabled());await p.getByRole('button',{name:'查看 M-001',exact:true}).click();await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');}else assert(await p.getByRole('button',{name:'下一步',exact:true}).isDisabled());}
 if(scene.id==='empty')await p.getByText('暂无符合条件的资料',{exact:true}).waitFor();
 if(scene.id==='loading')await p.getByText('正在加载（固定评审状态）',{exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);rows.push({page,mode,scene:scene.id,status:'passed'});
 }
 if(mode==='glass'&&page==='list-detail'){
 await p.goto(pathToFileURL(path.join(here,'comparisons',page,'variants',mode,'index.html')).href);await p.locator('#keyword').fill('季度');await p.getByRole('button',{name:'重置筛选',exact:true}).click();await p.evaluate(()=>scrollTo(0,260));await p.screenshot({path:path.join(here,'screenshots','glass-narrow-scrolled.png')});
 const session=await c.newCDPSession(p);await session.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});assert.equal(await p.locator('.workspace-bar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');rows.push({check:'system-reduced-transparency-computed',status:'passed'});await session.send('Emulation.setEmulatedMedia',{features:[]});await session.detach();
 }
}
await p.goto(pathToFileURL(path.join(here,'index.html')).href);const bad=[];for(const ref of await p.locator('a[href],img[src],link[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')||e.getAttribute('src')))){if(!ref||ref.startsWith('#'))continue;try{await readFile(path.join(here,ref.split('#')[0]));}catch{bad.push(ref);}}// report is written after this check; exclude that deferred document only.
assert.deepEqual(bad.filter(x=>x!=='report.md'),[]);rows.push({check:'landing-assets',status:'passed'});await writeFile(path.join(here,'evidence/states.json'),JSON.stringify({status:'passed',rows},null,2));console.log(JSON.stringify({status:'passed',checks:rows.length}));
}finally{await browser.close();}
