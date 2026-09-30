import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
const root = process.cwd();
const { parseContent } = await import(path.join(root,'scripts/lib/plan-spec-markdown.mjs'));
const { inspectPlanSpec } = await import(path.join(root,'scripts/lib/plan-spec-quality.mjs'));
const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'plan-spec-formats-')));
const fixture='.template-spec/templates/examples/plan-spec';
fs.cpSync(path.join(root,fixture),path.join(dir,fixture),{recursive:true});
fs.mkdirSync(path.join(dir,'before'));
const result={kind:'synthetic-format-comparison',limitations:['前版表达由相同虚构规则机械转换，非真实用户写作试验。','时间为诊断运行耗时，不是填写或审阅时间；不计算 Token 和效率提升。'],rows:[]};
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const family of ['ordinary','complex','high-risk'])for(const variant of ['valid','defective']){
 const after=`${fixture}/${family}-${variant}.md`, text=fs.readFileSync(path.join(dir,after),'utf8'), doc=parseContent(text,after);
 let old='# 前版格式对照\n\n> 虚构输入的表达兼容试验。原表字段内容全部保留在前版正文；不是历史批准或真实产品基线。\n\n## 功能需求\n\n| ID | 需求 | 优先级 | 备注 |\n|---|---|---|---|\n';
 for(const e of doc.entries.filter(e=>e.kind==='FR')) old+=`| ${e.id} | ${e.fields['需求']} | ${e.fields['优先级']} | 来源：${e.fields['来源引用']}；验收：${e.fields['验收引用']}；未决项：${e.fields['未决项']} |\n`;
 for(const [kind,title] of [['NFR','非功能需求'],['AC','验收标准'],['Q','未决项']]){
  old+=`\n## ${title}\n\n`;
  for(const section of doc.sections.filter(s=>s.kind===kind))if(section.text)old+=section.text+'\n';
  for(const e of doc.entries.filter(e=>e.kind===kind))old+=Object.entries(e.fields).map(([k,v])=>`${k}：${v}`).join('；')+'\n\n';
 }
 old+='\n## 原始范围与限制\n\n'+text.slice(text.indexOf('## 非目标范围')+'## 非目标范围'.length);
 // Every extracted field must survive verbatim, including negative and unknown values.
 const preserved=doc.entries.every(e=>Object.values(e.fields).every(v=>old.includes(v)));
 if(!preserved)throw new Error('转换丢失字段内容');
 const before=`before/${family}-${variant}.md`;fs.writeFileSync(path.join(dir,before),old);
 const start=performance.now(), a=await inspectPlanSpec({root:dir,command:'check',spec:before}), middle=performance.now(), b=await inspectPlanSpec({root:dir,command:'check',spec:after}), end=performance.now();
 if(hash(fs.readFileSync(path.join(dir,before)))!==hash(old)||hash(fs.readFileSync(path.join(dir,after)))!==hash(text))throw new Error('输入被修改');
 result.rows.push({family,variant,before,after,preserved_field_values:preserved,before_sha256:hash(old),after_sha256:hash(text),before:{exit_code:a.exitCode,findings:a.report.findings,unevaluated:a.report.unevaluated,diagnostic_ms:middle-start},after:{exit_code:b.exitCode,findings:b.report.findings,unevaluated:b.report.unevaluated,diagnostic_ms:end-middle}});
}
result.status='passed';result.scratch=dir;fs.writeFileSync('/tmp/plan-spec-format-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,samples:result.rows.length,scratch:dir}));
