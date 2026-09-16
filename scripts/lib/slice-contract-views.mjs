import fs from 'node:fs';
import { safe, hash, digest } from './strategic-handoff-io.mjs';
import { selectSliceWorkUnit, readSliceContract, readSliceSources, sliceAcceptanceText, parseSliceYaml, sourceSliceContract } from './slice-contract.mjs';

function sections(text) {
  const result={};let name='正文';
  for(const line of text.split('\n')) {
    const heading=/^#{1,3}\s+(.+)/.exec(line);
    if(heading)name=heading[1];
    else (result[name]??=[]).push(line);
  }
  return Object.fromEntries(Object.entries(result).filter(([name])=>!/验收/.test(name)).map(([name,lines])=>[name,lines.join('\n').trim()]));
}
export function renderSliceContractView(ref,{root=process.cwd(),unit_id}={}) {
  const {contract,raw,binding,sources}=readSliceContract(ref,{root,diagnostic:true});
  if(raw.status==='blocked') {
    let report;try{report=JSON.parse(fs.readFileSync(safe(root,`${ref}.preparation.json`),'utf8'));if(report.binding.digest!==binding.digest)report=undefined;}catch{}
    const blockers=report?.blockers||[{code:'SLICE_DIAGNOSTICS_UNAVAILABLE',reason:'未找到绑定当前字节的准备报告，需重新准备'}];
    return {read_only:true,diagnostic_only:true,binding,status:'blocked',approval_validity:'阻断草案不可批准或执行',blockers,markdown:`# Slice 诊断\n\n${ref} · ${binding.digest}\n\n阻断草案不可批准或执行。\n\n`+blockers.map(b=>`- ${b.code} · ${b.field||'slice'}：${b.reason}；${b.recovery||'重新准备'}`).join('\n')};
  }

  const displayed=unit_id?selectSliceWorkUnit(contract,unit_id):contract;
  const task=unit_id?contract.work_units?.filter(u=>u.id===unit_id):null;
  if(task&&task.length!==1)throw new TypeError(`工作单元缺失或不唯一: ${unit_id}`);
  const view={ticket_state:raw.ticket_policy?{owner:raw.ticket_policy.state_owner,frozen_status:/^---\r?\n([\s\S]*?)\r?\n---/.test(sources.ticket.text)?parseSliceYaml(/^---\r?\n([\s\S]*?)\r?\n---/.exec(sources.ticket.text)[1]).status||'未记录':'未记录',current_status:'请读取主 tracker 或当前任务包',requirement_version:sources.ticket.version}:{owner:'legacy-ticket'},read_only:true,view_kind:unit_id?'work-unit':'review',binding,status:raw.status,approval_validity:'未核验；本视图不授予执行权限',sources:Object.fromEntries(Object.entries(sources).map(([k,{text,...b}])=>[k,b])),acceptance:raw.schema_version===3?sliceAcceptanceText(raw,sources):{},summary:sources.ticket?sections(sources.ticket.text.replace(/^---\n[\s\S]*?\n---\n/,'')):{说明:'v2 原合同未提供统一摘要来源'},constraints:displayed.common,extensions:{frontend:displayed.frontend,backend:displayed.backend,api:displayed.contract,cross_repo:displayed.cross_repo},...(task?{task:task[0].work_unit||task[0]}:{})};
  const lines=[`# Slice ${raw.slice_id}`,`权威合同：${ref} · ${raw.contract_version} · ${binding.digest}`,`状态：${raw.status}；${view.approval_validity}`];
  for(const [name,pattern]of [['交付目标',/目标|构建/],['关键取舍',/取舍/],['风险',/风险/],['待决定事项',/待|决定/]]) { const rows=Object.entries(view.summary).filter(([key])=>pattern.test(key)&&!/^非目标/.test(key));lines.push(`## ${name}`,rows.map(([,text])=>text).filter(Boolean).join('\n')||'未提供说明，需在审查时核实。'); }
  lines.push('## 实施范围',Object.entries(view.summary).filter(([name])=>/范围|非目标/.test(name)).map(([name,text])=>`${name}：${text}`).join('\n')||'未提供业务范围说明，需核对目标、工作单元与写边界。',`工程：${displayed.common?.project_roots?.join(', ') || '见原合同'}`,`允许写入：${displayed.common?.allowed_write_paths?.join(', ') || '见原合同'}`);
  lines.push('## 验收',...Object.entries(view.acceptance).map(([id,text])=>`- ${id}: ${text}`));
  if(raw.ticket_policy)lines.push('## 状态来源',`需求版本：${view.ticket_state.requirement_version}；冻结时状态：${view.ticket_state.frozen_status}。当前执行状态：${view.ticket_state.current_status}。`);
  if(view.task)lines.push('## 当前任务',`行为：${view.task.behavior}`,`写范围：${view.task.allowed_write_paths.join(', ')}`,`验证：${view.task.verification_commands.join('; ')}`);
  lines.push('## 执行停止条件','来源或批准过期、越界、缺少证据、验证失败、drift / violation / new_impacts 时停止并回交。','<details><summary>完整工程约束与来源</summary>','', '```json',JSON.stringify({constraints:view.constraints,extensions:view.extensions,task:view.task,sources:view.sources},null,2),'```','</details>');
  view.markdown=lines.join('\n\n');
  return view;
}
export function diffSliceContracts(beforeRef,afterRef,{root=process.cwd(),beforeRoot=root}={}) {
  const read=(base,ref)=>{const bytes=fs.readFileSync(safe(base,ref));return{raw:sourceSliceContract(parseSliceYaml(bytes)),binding:{ref,digest:hash(bytes)}};};
  const before=read(beforeRoot,beforeRef),after=read(root,afterRef),changes=[];
  function walk(a,b,p) {
    if(digest(a??null)===digest(b??null)&&((a===undefined)===(b===undefined)))return;
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)) {
      for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],p?`${p}.${key}`:key);
    }else changes.push({path:p,before:a??null,after:b??null,category:/^(scope\.(allowed_write_paths|project_roots)|work_units)/.test(p)?'scope':/^acceptance/.test(p)?'acceptance':/^(ticket_policy|basis\.ticket|contract_version|status)/.test(p)?'authorization':'engineering-detail',evidence:{before:before.binding,after:after.binding},decision_impact:'待独立专业审查判定'});
  }
  walk(before.raw,after.raw,'');
  const sourceChecks=[];
  for(const [label,entry,base]of [['before',before,beforeRoot],['after',after,root]]) {
    try {if(entry.raw.schema_version!==3)throw new Error('v2 未冻结统一来源快照');readSliceSources(entry.raw,{root:base});sourceChecks.push({side:label,result:'current'});}
    catch(error){sourceChecks.push({side:label,result:'unknown-or-stale',reason:error.message});}
  }
  return {read_only:true,before:before.binding,after:after.binding,bytes_changed:before.binding.digest!==after.binding.digest,category:changes.length?'requires-review':sourceChecks.some(x=>x.result!=='current')?'unknown-or-stale':before.binding.digest===after.binding.digest?'unchanged':'presentation-only',changes,source_checks:sourceChecks,approval_reusable:false,explanation:'字节变化后须重新绑定；用户确认是否延续由现有协议和独立专业审查裁决。'};
}
