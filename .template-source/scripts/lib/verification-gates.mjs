import {createHash} from 'node:crypto';
import {compileVerificationCheck,verificationCheckId,verificationSourceIdentities} from './verification-execution-plan.mjs';
export {compileVerificationCheck,verificationCheckId};
export const verificationHash = value => createHash('sha256').update(value).digest('hex');
export function verificationPatternMatches(file, pattern) {
  let source='';
  for(let i=0;i<pattern.length;i++) {
    if(pattern[i]==='*'&&pattern[i+1]==='*'){source+='.*';i++;}
    else if(pattern[i]==='*')source+='[^/]*';
    else if(pattern[i]==='?')source+='[^/]';
    else source+=pattern[i].replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
  }
  const expression=new RegExp(`^${source}$`);
  return verificationSourceIdentities(file).some(ref=>expression.test(ref));
}
export const verificationPolicyDigest = config => verificationHash(JSON.stringify(config));
function checkCycles(items,field,label) {
  const all=new Map(items.map(item=>[item.id,item])),visiting=new Set(),visited=new Set();
  const visit=id=>{if(visiting.has(id))throw Error(`${label}依赖循环: ${id}`);if(visited.has(id))return;const item=all.get(id);if(!item)throw Error(`未知${label}依赖: ${id}`);visiting.add(id);for(const dep of item[field]||[])visit(dep);visiting.delete(id);visited.add(id);};
  for(const id of all.keys())visit(id);
}

export function validateGateConfiguration(config) {
  const gates=config.gates||[],ids=new Set(),display=new Set();
  const checks=Object.entries(config.groups||{}).flatMap(([group,value])=>value.commands.map(raw=>compileVerificationCheck(raw,{group,profile:'release'}))),known=new Set([...checks.map(check=>check.id),...(config.profiles.fast.checks||[]).map(check=>check.id)]);
  for(const gate of gates) {
    if(!/^check\.[a-zA-Z0-9._-]+$/.test(gate.id)||ids.has(gate.id)||!/^G\d{2}$/.test(gate.display_id)||display.has(gate.display_id)||!Array.isArray(gate.check_ids)||!Array.isArray(gate.depends_on)||!Array.isArray(gate.impact_dependencies)||!['template-verification','release-integration','compatibility'].includes(gate.execution_scope)||new Set(gate.check_ids).size!==gate.check_ids.length||gate.check_ids.some(id=>!known.has(id)))throw Error('GATE_REGISTRY_INVALID');
    ids.add(gate.id);display.add(gate.display_id);
  }
  if(gates.length&&checks.some(check=>!gates.some(gate=>gate.execution_scope==='template-verification'&&gate.check_ids.includes(check.id))))throw Error('GATE_CHECK_BINDING_MISSING');
  for(const key of ['depends_on','impact_dependencies'])checkCycles(gates,key,'Gate');
  return true;
}
export function validateSupplementalChecks(config,plan={commands:[]}) {
  const ids=new Set([...plan.commands.map(task=>task.id),...Object.values(config.groups||{}).flatMap(group=>group.commands.map(verificationCheckId)),...(config.profiles?.fast?.checks||[]).map(check=>check.id)]),tasks=new Set(plan.commands.map(task=>task.task_id)),gates=new Set((config.gates||[]).map(gate=>gate.id));
  for(const check of config.supplemental_checks||[]) {
    if(!check||!/^check\.[a-zA-Z0-9._-]+$/.test(check.id)||ids.has(check.id)||!/^supplemental\.[a-zA-Z0-9._-]+$/.test(check.task_id)||tasks.has(check.task_id)||typeof check.run!=='string'||!check.run.trim()||typeof check.group!=='string'||!check.group||!Array.isArray(check.gate_ids)||!check.gate_ids.length||new Set(check.gate_ids).size!==check.gate_ids.length||check.gate_ids.some(id=>!gates.has(id))||!Array.isArray(check.depends_on)||check.depends_on.some(id=>typeof id!=='string'||!id)||check.when!=='template-source'||check.source_requirement!=='committed'||check.require_committed_for!==undefined)throw Error('SUPPLEMENTAL_CHECK_INVALID');
    ids.add(check.id);tasks.add(check.task_id);
  }
  const all=[...plan.commands,...(config.supplemental_checks||[]),{id:'check.verification-environment',task_id:'check.verification-environment',depends_on:[]}],byTask=new Map(all.map(task=>[task.task_id,task]));
  const normalized=all.map(task=>({...task,id:task.task_id,depends_on:(task.depends_on||[]).map(id=>{if(byTask.has(id))return id;const matches=all.filter(row=>row.id===id);if(matches.length!==1)throw Error('SUPPLEMENTAL_DEPENDENCY_INVALID');return matches[0].task_id;})}));
  checkCycles(normalized,'depends_on','检查执行');return true;
}
/** Release covers the complete change set; installation and source checks stay mandatory. */
export function buildReleasePlan(plan,{config}) {
  if(config.profiles.release.selection!=='impact'||config.profiles.release.all_groups===true)throw Error('RELEASE_REQUIRES_IMPACT_SELECTION');
  const definitions=new Map();
  for(const task of Object.entries(config.groups).flatMap(([group,value])=>value.commands.map(raw=>compileVerificationCheck(raw,{group,profile:'release'})))){const {group,task_id,...definition}=task,previous=definitions.get(task.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(definition))throw Error(`检查 ID 冲突: ${task.id}`);definitions.set(task.id,definition);}
  validateGateConfiguration(config);
  const required=new Set(config.profiles.release.required_checks||[]);
  const commands=plan.commands.map((task,index)=>({...task,task_id:task.task_id||`release.${index}`,gate_ids:(config.gates||[]).filter(gate=>gate.check_ids.includes(task.id)).map(gate=>gate.id),...(required.has(task.id)?{source_requirement:'committed'}:{})}));
  const gates=(config.gates||[]).map(gate=>({...gate,selected:gate.execution_scope==='template-verification'&&commands.some(task=>task.gate_ids.includes(gate.id)),selection_reason:gate.execution_scope==='template-verification'?'release-inputs-and-required':`${gate.execution_scope}-owned`,check_ids:[...gate.check_ids],task_ids:commands.filter(task=>task.gate_ids.includes(gate.id)).map(task=>task.task_id)}));
  for(const task of commands) {
    const deps=gates.filter(gate=>task.gate_ids.includes(gate.id)).flatMap(gate=>gate.depends_on);
    task.depends_on=[...new Set([...task.depends_on,...commands.filter(other=>other.task_id!==task.task_id&&other.gate_ids.some(id=>deps.includes(id))).map(other=>other.task_id)])];
  }
  validateSupplementalChecks(config,{commands});
  return {...plan,strategy:'release',source_requirement:'committed',effective_profile:'release',commands,gates,not_applicable:[],policy_digest:verificationPolicyDigest(config),fallback_reasons:[],selection:plan.selection};
}
