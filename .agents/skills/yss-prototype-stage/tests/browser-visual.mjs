import assert from 'node:assert/strict';
export async function visual(page){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow');
 const violations=await page.evaluate(()=>{
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});
  const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];return [...a.slice(0,3),a[3]/255];};
  const blend=(a,b)=>a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3]));
  const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),bad=[];
  for(const el of document.querySelectorAll('body *')){
   if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   if(!r.width||!r.height||s.visibility==='hidden'||el.closest('[hidden],[inert],:disabled,[aria-disabled="true"],[data-disabled],.sr-only')||s.clip!=='auto')continue;
   if(el.tagName==='SCRIPT'||el.tagName==='STYLE')continue;
   const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);let bg=[255,255,255];for(const p of chain)bg=blend(rgba(getComputedStyle(p).backgroundColor),bg);
   const l=[lum(blend(rgba(s.color),bg)),lum(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.666&&+s.fontWeight>=700);
   if(ratio<(large?3:4.5))bad.push({text:el.textContent.slice(0,45),ratio,color:s.color});
  }return bad;
 });assert.deepEqual(violations,[],'computed contrast');
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return s.animationName!=='none'||s.transitionDuration.split(',').some(x=>parseFloat(x)>0);}).map(e=>e.tagName)),[],'computed reduced motion');
 const undersized=await page.evaluate(()=>[...document.querySelectorAll('button,a[href],[role="menuitem"],[role="checkbox"],input:not([type="hidden"]),select,textarea')].filter(el=>{const target=el.matches('input[type=checkbox]')&&el.labels?.length?el.labels[0]:el;const r=target.getBoundingClientRect();return el.checkVisibility()&&r.width&&r.height&&!el.closest('[inert]')&&!el.matches(':disabled,[data-disabled],[aria-disabled="true"]')&&(r.width<24||r.height<24)&&el.getAttribute('data-slot')!=='checkbox';}).map(el=>({tag:el.tagName,name:el.textContent?.slice(0,30),rect:el.getBoundingClientRect().toJSON()})));
 assert.deepEqual(undersized,[],'actual target bounds (checkbox extended hit area checked separately)');
}
