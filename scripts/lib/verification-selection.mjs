import path from 'node:path';
import {verificationCheckId,verificationPatternMatches as patternMatches,compileVerificationCheck} from '../../.template-source/scripts/lib/verification-gates.mjs';
export {verificationCheckId,patternMatches};
export function applyDailyVerificationSelection(plan,{selection='allowlist',config}) {
  if(!['legacy','shadow','allowlist'].includes(selection))throw new TypeError(`未知 selection: ${selection}`);
  const definitions=new Map();
  for(const [group,value] of Object.entries(config.groups))for(const raw of value.commands){
    const item=typeof raw==='string'?{run:raw}:raw,id=verificationCheckId(item),previous=definitions.get(id);
    if(previous&&['run','when','depends_on','resources','require_committed_for'].some(field=>JSON.stringify(previous[field])!==JSON.stringify(item[field])))throw new TypeError(`检查 ID 冲突: ${id}`);
    definitions.set(id,{...item,group});
  }
  const checks=new Map();
  for(const raw of config.profiles.fast.checks) {
    const definition=raw.run?raw:definitions.get(raw.id);
    if(!definition)throw new TypeError(`未知日常检查: ${raw.id}`);
    if(!/^check\.[a-zA-Z0-9._-]+$/.test(raw.id)||checks.has(raw.id)||raw.inputs_complete!==true||!Array.isArray(raw.input_patterns)||!raw.input_patterns.length||raw.input_patterns.some(value=>typeof value!=='string'||!value)||!Array.isArray(raw.depends_on)||raw.depends_on.some(value=>typeof value!=='string'||!value)||typeof raw.failure_mode!=='string'||!raw.failure_mode)throw new TypeError(`INCOMPLETE_VERIFICATION_INPUTS: ${raw.id}`);
    checks.set(raw.id,{...definition,...raw});
  }
  const syntaxPackage=file=>path.basename(file)==='package.json'&&(config.syntax_files||[]).some(ref=>ref.startsWith(path.posix.dirname(file)==='.'?'':`${path.posix.dirname(file)}/`));
  const matches=(file,pattern)=>patternMatches(file,pattern)||patternMatches(file.replace(/^\.(codex|cursor|pi)\/skills\//,'.agents/skills/'),pattern);
  const skillTree=/^\.(agents|codex|cursor|pi)\/skills\//;
  const structuralSkillPattern=/^\.(agents|codex|cursor|pi)\/skills\/\*\*$/;
  // A tree identity check cannot declare executable or structured Skill behavior covered.
  const unknown=plan.changed_files.filter(file=>!syntaxPackage(file)&&![...checks.values()].some(item=>item.input_patterns.some(pattern=>matches(file,pattern)&&(!skillTree.test(file)||file.endsWith('.md')||!structuralSkillPattern.test(pattern)))));
  if(unknown.length&&selection==='allowlist')throw new TypeError(`INCOMPLETE_VERIFICATION_INPUTS: 先登记本次行为和消费者: ${unknown.join(', ')}`);
  const visiting=new Set(),visited=new Set();
  const validate=id=>{if(visiting.has(id))throw new TypeError(`检查依赖循环: ${id}`);if(visited.has(id))return;const item=checks.get(id);if(!item)throw new TypeError(`未知检查依赖: ${id}`);visiting.add(id);for(const dep of item.depends_on)validate(dep);visiting.delete(id);visited.add(id);};
  for(const id of checks.keys())validate(id);
  const reasons=new Map();
  const select=(id,reason)=>{if(reasons.has(id))return;const item=checks.get(id);reasons.set(id,reason);for(const dep of item.depends_on)select(dep,`dependency-of:${id} -> ${checks.get(dep).failure_mode}`);};
  for(const item of checks.values()) {
    const matched=plan.changed_files.filter(file=>item.input_patterns.some(pattern=>matches(file,pattern)));
    if(matched.length)select(item.id,`input-match:${matched.join(', ')} -> ${item.failure_mode}`);
  }
  const candidate=[...checks.values()].filter(item=>reasons.has(item.id)).map(item=>({...compileVerificationCheck(item,{group:item.group,profile:'fast',taskId:item.id}),selection_reason:reasons.get(item.id)}));
  const commands=selection==='allowlist'?candidate:plan.commands.map((item,index)=>({...item,task_id:item.task_id||`daily.group.${index+1}`,resources:[...new Set([...(item.resources||[]),...(checks.get(item.id)?.resources||[])])],selection_reason:`explicit-group:${item.group}`}));
  return {...plan,strategy:'daily-necessary',commands,groups:[...new Set(commands.map(item=>item.group))],required_files:[],supplemental_checks:[],gates:[],not_applicable:[],selection:{requested:selection,effective:selection,eligible:!unknown.length,qualified:false,baseline:plan.commands,candidate,omitted:plan.commands.filter(item=>!candidate.some(check=>check.id===item.id)).map(item=>({...item,reason:'outside-daily-inputs'})),fallback_reason:unknown.length?`incomplete-daily-inputs:${unknown.join(', ')}`:null}};
}
