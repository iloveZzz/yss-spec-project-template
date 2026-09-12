import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const frontend='/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/frontend';
const require=createRequire(path.join(frontend,'package.json'));
const {chromium}=require('@playwright/test');
const out=path.join(import.meta.dirname,process.argv[2]||'initial');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Users/zhudaoming/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const evidence={started_at:new Date().toISOString(),browser_version:browser.version(),console:[],requests:[],external_requests_blocked:[]};
await context.route('**/*',async route=>{const u=new URL(route.request().url()); if(['http:','https:'].includes(u.protocol)&&!['127.0.0.1','localhost','[::1]'].includes(u.hostname)){evidence.external_requests_blocked.push(u.origin+u.pathname);await route.abort('blockedbyclient');}else await route.continue();});
const page=await context.newPage();
page.on('console',x=>evidence.console.push({type:x.type(),text:x.text()}));page.on('pageerror',x=>evidence.console.push({type:'pageerror',text:x.message}));
const pending=[];
page.on('response',res=>{if(res.url().includes('/api/'))pending.push((async()=>{evidence.requests.push({url:res.url(),method:res.request().method(),status:res.status(),content_type:res.headers()['content-type'],body:(await res.text().catch(()=>'<unreadable>')).slice(0,25000)});})());});
try{
 await page.goto('http://127.0.0.1:61112/transfer/file-sync',{waitUntil:'networkidle',timeout:20000});
 evidence.url=page.url();evidence.body=await page.locator('body').innerText();evidence.buttons=await page.getByRole('button').allTextContents();evidence.rows=await page.getByRole('row').allTextContents();evidence.trs=await page.locator('tr').allTextContents();
 await page.screenshot({path:path.join(out,'page.png'),fullPage:true});
}catch(e){evidence.error=String(e);await page.screenshot({path:path.join(out,'page.png'),fullPage:true}).catch(()=>{});}
await Promise.allSettled(pending);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');await browser.close();
console.log(JSON.stringify({browser:evidence.browser_version,error:evidence.error,rows:evidence.rows,trs:evidence.trs,requests:evidence.requests.map(x=>({url:x.url,status:x.status})),console_errors:evidence.console.filter(x=>['error','pageerror'].includes(x.type)),output:out},null,2));
