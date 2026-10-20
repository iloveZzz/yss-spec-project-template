// managed 阅读视图的渲染、校验与启用在固定的 yss 中完成（yss reading render|check-views|plan-enable|apply-enable|affected）。
// 本模块只保留原导出名与调用约定：manual 实例在这里短路，不协商令牌也不调用 yss；managed 实例缺少能力时拒绝并提示升级 yss，不回退到 Node 实现。
import fs from 'node:fs';
import path from 'node:path';
import {readFileSync,existsSync} from './validation-phase.mjs';
import {safe,hash,ROOT} from './strategic-handoff-io.mjs';
import {parseSliceYaml} from './slice-contract.mjs';
import {readingPolicy,managedReading,readingLocation} from './reading-view-policy.mjs';
import {nativeInvoke,NEEDS} from './native-evidence.mjs';
const json=value=>JSON.stringify(value,null,2)+'\n';
const bytes=(root,ref)=>{const file=safe(root,ref,{missing:true});return existsSync(file)?readFileSync(file):null;};
function identity(root){const id=parseSliceYaml(bytes(root,'yss-project.yaml'));if(![1,2].includes(id?.schema_version)||id.repository_mode!=='project-instance')throw Error('reading-project-instance-required');}
// 业务拒绝（退出码 1、2）原样带回 yss 的错误码；协议、中断与能力缺失由 nativeInvoke 抛出。
function reading(root,sub,args,needs){return nativeInvoke({root,args:['reading',sub,'--root',root,...args],needs});}
const refused=result=>Object.assign(new Error(`${result.code}: ${result.message}`),{code:result.code,native:true});
const renderRecovery=checkpoint=>`scripts/contract render --checkpoint ${checkpoint}`;
export function renderReadingBundle(root,checkpoint){
 root=path.resolve(root);identity(root);
 const result=reading(root,'render',['--checkpoint',checkpoint],NEEDS.readingRender);
 if(result.exitCode!==0)throw refused(result);
 return result.result;
}
export function checkReadingViews(root,checkpoint,{required=false}={}){
 root=path.resolve(root);identity(root);
 if(!required&&!managedReading(root,checkpoint))return {status:'manual',read_only:true,execution_allowed:false,blockers:[]};
 const stale=message=>({status:'stale',read_only:true,execution_allowed:false,blockers:[message],recovery:renderRecovery(checkpoint)});
 try{
  const result=reading(root,'check-views',['--checkpoint',checkpoint,...(required?['--required']:[])],NEEDS.readingViews);
  // 过期时 yss 以 READING_STALE 返回完整报告；其余拒绝（身份、布局、来源）同样不放行。
  if(result.exitCode===0||result.code==='READING_STALE')return result.result;
  return stale(`${result.code}: ${result.message}`);
 }catch(error){return stale(error.message);}
}
// 计划由 yss 写出并绑定摘要；output 是项目内尚不存在的新文件。
export function planEnableReading(root,checkpoint,{output}={}){
 root=path.resolve(root);identity(root);
 const result=reading(root,'plan-enable',['--checkpoint',checkpoint,...(output?['--output',output]:[])],NEEDS.readingEnable);
 if(result.exitCode!==0)throw refused(result);
 return result.result;
}
// plan 是 plan-enable 写出的计划文件（项目内相对路径）；yss 重新规划并要求摘要一致，策略与阅读文件在同一事务写入。
export function applyEnableReading(root,plan){
 root=path.resolve(root);identity(root);
 if(typeof plan!=='string'||!plan)throw Error('reading-enable-plan-file-required');
 const result=reading(root,'apply-enable',[path.relative(root,safe(root,plan)).split(path.sep).join('/')],NEEDS.readingEnable);
 if(result.exitCode!==0)throw refused(result);
 return result.result;
}
export function finalizeReading(root,checkpoint,sourceOperation){
 try{if(!managedReading(root,checkpoint))return {...sourceOperation,source_operation:sourceOperation.status,reading_update:{status:'manual'}};
  return {...sourceOperation,source_operation:sourceOperation.status,reading_update:renderReadingBundle(root,checkpoint)};
 }catch(error){return {...sourceOperation,source_operation:sourceOperation.status,reading_update:{status:'failed',error:error.message,recovery:renderRecovery(checkpoint)}};}
}
export function readingCheckpointsForAsset(root,ref,kind){
 if(!['domain-strategy','stage-decision-package','checkpoint','tracking-migration'].includes(kind))return [];
 const policy=readingPolicy(root);if(policy.mode!=='managed'||!policy.checkpoints.length)return [];
 const result=reading(path.resolve(root),'affected',['--asset',ref,'--kind',kind],NEEDS.readingViews);
 if(result.exitCode!==0)throw refused(result);
 return result.result.checkpoints;
}
export function assertReadingTransition(root,decisionState,currentWorkUnit){
 const ref=decisionState?.checkpoint_ref||decisionState?.checkpoint?.ref;
 if(!ref){const policy=readingPolicy(root);if(policy.mode==='managed'&&policy.checkpoints.length&&['work-unit.plan-requirements','work-unit.domain-strategy-design','work-unit.stage-decision-package','work-unit.spec-synthesis'].includes(currentWorkUnit))throw Error('reading-checkpoint-ref-required');return {status:'not-applicable'};}
 if(!managedReading(root,ref))return {status:'manual'};
 const result=checkReadingViews(root,ref);if(result.blockers.length)throw Error(`reading-views-stale: ${result.blockers.join('; ')}`);return result;
}
// 正式差异记录仍由 Node 的 contract diff 生成（阶段三才迁移），其文件名绑定这份调用闭包。
function toolClosure(){
 const found=new Map();
 const visit=ref=>{if(found.has(ref))return;const file=safe(ROOT,ref),content=readFileSync(file);found.set(ref,hash(content));
  if(/\.(mjs|js)$/.test(ref))for(const match of content.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(path.posix.normalize(path.posix.join(path.posix.dirname(ref),match[1])));
 };
 for(const ref of ['scripts/lib/reading-view-bundle.mjs','scripts/contract'])visit(ref);
 return Object.fromEntries([...found].sort(([a],[b])=>a.localeCompare(b)));
}
export function saveReadingComparison(root,checkpoint,result){
 const loc=readingLocation(root,checkpoint);
 if(result.blockers?.length||!result.diff||!result.diff.markdown)throw Error('reading-comparison-source-invalid');
 const report=result.diff.markdown+'\n批准有效性：not-checked；原决定及语义审阅仍按准备结果处理。\n';
 const id=hash(json({before:result.before,after:result.after,report,renderer:toolClosure()})).slice(7),ref=`${loc.directory}/changes/${id}.md`,file=safe(root,ref,{missing:true});
 if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')!==report)throw Error('reading-comparison-conflict');return {ref,digest:hash(report),status:'unchanged'};}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,report,{flag:'wx'});return {ref,digest:hash(report),status:'saved'};
}
