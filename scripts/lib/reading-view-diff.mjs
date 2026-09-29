import {readingIdFields} from './reading-view-model.mjs';
import {renderReadingValue} from './reading-view-markdown.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const identity=(value,pointer)=>{const key=readingIdFields[pointer.split('/').at(-1)]||'id';return object(value)&&typeof value[key]==='string'?key:undefined;};
const part=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
const bindings=new Set(['schema_version','digest','subject_digest','document_digest','referenced_terms_digest','ref','context_ref','persisted_ref']);
const business=new Set(['responsibilities','non_responsibilities','rules','failure_results','success_results','statement','constraints','status','acceptance','progress','scope','preconditions','blockers','owner','deferred']);
export function readingDiff(before,after){
 const changes=[];
 const walk=(a,b,p,category='unclassified')=>{
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(object(a)&&object(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],`${p}/${part(key)}`,bindings.has(key)?'binding-change':business.has(key)?'business-change':category);return;}
  if(Array.isArray(a)&&Array.isArray(b)&&a.length&&b.length){
   const key=identity(a[0],p);if(key&&[...a,...b].every(x=>object(x)&&typeof x[key]==='string')){
    const left=a.map(x=>x[key]),right=b.map(x=>x[key]);
    if(new Set(left).size!==left.length||new Set(right).size!==right.length){changes.push({path:p,category:'unclassified',diagnostic:'duplicate-stable-id',before:a,after:b});return;}
    if(JSON.stringify(left)!==JSON.stringify(right))changes.push({path:p,category:'business-change',change:'order-or-membership',before:left,after:right});
    for(const id of new Set([...left,...right]))walk(a.find(x=>x[key]===id),b.find(x=>x[key]===id),`${p}/@${part(id)}`,category);return;
   }
  }
  changes.push({path:p,category,before:a===undefined?{absent:true}:a,after:b===undefined?{absent:true}:b});
 };
 walk(before,after,'');return changes;
}
export function renderReadingDiff(result){
 const changes=result.semantic_changes||result.changes;
 return ['# 合同差异审阅','本报告不认定语义等价，不授予批准沿用或执行权限。',`旧来源：${result.before.ref}；${result.before.digest}`,`新来源：${result.after.ref}；${result.after.digest}`,
 ...changes.flatMap(row=>[`## ${row.path||'/'}`,`分类：${row.category}（仍需按实际影响审阅）`,renderReadingValue({before:row.before,after:row.after,...(row.change?{change:row.change}:{})})]),...(!changes.length?[result.bytes_changed?'presentation-change：解析内容相同，原字节不同；原绑定仍需核验。':'没有检测到差异；批准有效性未核验。']:[])].join('\n\n')+'\n';
}
