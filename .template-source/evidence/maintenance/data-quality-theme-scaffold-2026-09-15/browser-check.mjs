import {chromium} from '/Users/zhudaoming/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const results=[];
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text())});
 for(const width of [1440,390]){
 await page.setViewportSize({width,height:width===390?844:900});await page.goto('http://127.0.0.1:4189/');await page.getByText('从这里开始配置应用。').waitFor();
 const measures=()=>page.evaluate(()=>{const root=document.querySelector('.yss-microapp-root'),input=document.querySelector('input'),card=document.querySelector('.ant-card-body');return {height:input.getBoundingClientRect().height,font:getComputedStyle(root).fontSize,background:getComputedStyle(root).backgroundColor,cardPadding:getComputedStyle(card).padding,overflow:document.documentElement.scrollWidth>innerWidth};});
 const light=await measures();assert.equal(light.height,32);assert.equal(light.font,'14px');assert.equal(light.cardPadding,'20px');assert.equal(light.overflow,false);
 await page.screenshot({path:`/tmp/yss-dq-default-${width}.png`});
 await page.getByRole('switch').first().click();await page.waitForTimeout(300);const dark=await measures();assert.notEqual(dark.background,'rgb(255, 255, 255)');assert.notEqual(dark.background,light.background);await page.screenshot({path:`/tmp/yss-dq-dark-${width}.png`});
 await page.getByRole('switch').nth(1).click();await page.waitForTimeout(200);assert(Math.abs((await measures()).height-28)<0.1);results.push({mode:'standalone',width,light,dark,compact:28});
 }
 await page.goto('http://127.0.0.1:4188/dq-demo');const before=await page.evaluate(()=>document.documentElement.getAttribute('style'));
 await page.evaluate(()=>window.mountFixture());await page.getByText('从这里开始配置应用。').waitFor();assert.equal(await page.locator('.app-header').count(),0);
 await page.evaluate(()=>window.updateFixture({mode:{dark:true,compact:true},token:{colorPrimary:'#d32f2f'}}));await page.waitForTimeout(300);assert(Math.abs(await page.getByRole('textbox').evaluate(el=>el.getBoundingClientRect().height)-28)<0.1);
 assert.equal(await page.locator('.yss-microapp-root').evaluate(el=>el.dataset.theme),'dark');assert.equal(await page.locator('.yss-microapp-root').evaluate(el=>el.style.getPropertyValue('--yss-color-primary-6')),'#d32f2f');
 await page.evaluate(()=>window.unmountFixture());assert.equal(await page.locator('.yss-microapp-root').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.getAttribute('style')),before);
 await page.evaluate(()=>window.mountFixture());await page.getByText('从这里开始配置应用。').waitFor();assert.equal(await page.getByRole('textbox').evaluate(el=>el.getBoundingClientRect().height),32);
 await page.evaluate(()=>window.unmountFixture());results.push({mode:'qiankun',host:'qiankun@2.10.16',scenarios:['mount','theme-update','unmount-cleanup','remount-default'],documentThemeUnchanged:true});
 assert.deepEqual(errors,[]);const report={result:'passed',browser:browser.version(),results,consoleWarnings:errors};await writeFile('/tmp/yss-dq-browser-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
