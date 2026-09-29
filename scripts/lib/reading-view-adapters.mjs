import {readingIdFields} from './reading-view-model.mjs';
import path from 'node:path';
import {readFileSync,existsSync} from './validation-phase.mjs';
import {safe,hash} from './strategic-handoff-io.mjs';

const orders={
 'domain-strategy':['contexts','subdomains','relationships','rule_catalog','scenarios','concept_candidates','invariants','downstream_mapping','status'],
 'stage-decision-package':['problem_statement','target_users','mvp','non_goals','confirmed_decisions','success_criteria','test_seams','assumptions','constraints','unresolved_items','downstream_mapping'],
 checkpoint:['stage','status','next_work_unit','blockers','stage_tracking','artifacts','gates','verification','human_review']
};
export function adaptReading(kind,raw,{root,ref,blockers}){
 if(kind==='tracking-migration')return migration(raw,{root,ref,blockers});
 const order=orders[kind];if(!order)return raw;
 const inspect=(value,collection)=>{
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)&&readingIdFields[collection]){const key=readingIdFields[collection],ids=value.map(x=>x?.[key]).filter(x=>typeof x==='string');if(new Set(ids).size!==ids.length)blockers.push(`duplicate-stable-id: ${collection}.${key}`);}
  for(const [key,child]of Object.entries(value))inspect(child,key);
 };inspect(raw);
 const content=Object.fromEntries([...order,...Object.keys(raw)].filter((key,index,all)=>Object.hasOwn(raw,key)&&all.indexOf(key)===index).map(key=>[key,raw[key]]));
 if(kind==='checkpoint')content.状态阅读说明={源声明:'上面的阶段、状态和工作项进度均为源声明，分别保留。',阻塞登记:Array.isArray(raw.blockers)&&!raw.blockers.length?'未登记阻塞；不等于可执行。':'按源记录检查；缺失不等于无阻塞。',未核验:'批准、完整门禁、Ticket 就绪及外部事实未核验；历史验证记录不能替代本次验证。'};
 return content;
}
const LIMIT=2*1024*1024;
function migration(plan,{root,ref,blockers}){
 const content={...Object.fromEntries(Object.entries(plan).filter(([k])=>!['root','changes','observed','input','plan_id','schema_version'].includes(k))),plan_id:plan.plan_id,执行结果:'proposed（仅为计划；没有验证执行回执）',changes:[]};
 try{
  const {plan_id,...payload}=plan;
  if(plan.schema_version!==1||!Array.isArray(plan.changes)||hash(JSON.stringify(payload)).slice(7)!==plan_id)throw Error('migration-plan-digest-mismatch');
  const base=path.posix.dirname(ref),isPersisted=path.posix.basename(ref)==='plan.json';
  let backups=[];
  if(isPersisted){
   for(const name of ['backup.json','receipt.json','failure.json']){
    const target=`${base}/${name}`,file=safe(root,target,{missing:true});
    if(!existsSync(file))continue;
    const bytes=readFileSync(file);if(bytes.length>LIMIT*4)throw Error(`migration-preview-too-large: ${target}`);
    const value=JSON.parse(bytes);
    content[name.replace('.json','')+'_ref']=target;
    if(name==='backup.json'){if(!Array.isArray(value))throw Error('migration-backup-invalid');backups=value;}
    else if(name==='receipt.json'){if(value.plan_id!==plan_id||value.status!=='applied')throw Error('migration-receipt-conflict');content.执行结果='applied（原事务回执；不表示当前资产仍与历史一致）';content.回执=value;}
    else {content.执行结果='failed（保留恢复冲突；回执不能覆盖失败记录）';content.失败记录=value;}
   }
  }
  for(const change of plan.changes){
   safe(root,change.ref,{missing:true});
   if(typeof change.after!=='string'||Buffer.byteLength(change.after)>LIMIT)throw Error(`migration-preview-too-large-or-invalid: ${change.ref}`);
   if(hash(change.after)!==change.after_digest)throw Error(`migration-after-digest-mismatch: ${change.ref}`);
   let before=change.before?'无法比较旧内容：未提供匹配的历史备份；不读取当前文件冒充旧版本。':'原文件不存在（新增）';
   const matches=backups.filter(row=>row.ref===change.ref);if(matches.length>1)throw Error('migration-backup-duplicate');
   const backup=matches[0];
   if(change.before&&backup){
    if(typeof backup.bytes!=='string'||backup.bytes.length>LIMIT*1.4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(backup.bytes))throw Error('migration-backup-base64-invalid');
    const bytes=Buffer.from(backup.bytes,'base64');
    if(hash(bytes)!==change.before.digest||backup.before?.digest!==change.before.digest||backup.before?.mode!==change.before.mode)throw Error('migration-backup-digest-mismatch');
    before=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   }
   content.changes.push({ref:change.ref,before,after:change.after,before_binding:change.before,after_digest:change.after_digest});
  }
  content.未展开字段={root:'本机位置不参与业务阅读',observed:'原计划中的事务读集；完整值见权威计划',input:'登记输入保留在原计划；不作为当前进度',恢复数据:'Base64 原备份不写回、不执行；上面仅展示经过摘要核对的 UTF-8 内容'};
  content.gaps=plan.gaps;
 }catch(error){blockers.push(error.message);content.诊断=error.message;}
 return content;
}
