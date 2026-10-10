import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {verificationHash as hash,verificationCheckId,verificationPatternMatches as patternMatches,verificationPolicyDigest,compileVerificationCheck} from '../../.template-source/scripts/lib/verification-gates.mjs';
import {validateQualification} from '../../.template-source/scripts/lib/verification-qualification.mjs';
export {verificationCheckId,patternMatches};
export function selectionPolicyDigest(config) {
  return verificationPolicyDigest(config);
}
export function selectionBindings(root, config) {
  return {policy_sha256:selectionPolicyDigest(config),files:Object.fromEntries((config.allowlist?.qualification_inputs||[]).map(ref=>[ref,hash(fs.readFileSync(path.join(root,ref)))]))};
}
function qualified(config, root) {
  const ref=config.allowlist?.qualification_ref;
  if(!ref)return false;
  try {
    const resolved=path.resolve(root,ref),relative=path.relative(fs.realpathSync(root),fs.realpathSync(resolved));
    if(relative.startsWith('..')||path.isAbsolute(relative))return false;
    return validateQualification({root,config,reportFile:resolved,scope:'pilot',expectedBindings:selectionBindings(root,config)}).valid;
  }catch{return false;}
}
function lockOnlyTouchesPilots(root, pilots, base) {
  try {
    const result=spawnSync('git',['show',`${base||'HEAD'}:skills-lock.json`],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});if(result.status!==0)return false;
    const before=JSON.parse(result.stdout),after=JSON.parse(fs.readFileSync(path.join(root,'skills-lock.json'),'utf8'));
    // The lock's collection shape must be known; unknown metadata changes fall back.
    if(!before.skills||!after.skills||Array.isArray(before.skills))return false;
    if(!before.skills.shared||!after.skills.shared)return false;
    for(const id of pilots){if(!before.skills.shared[id]||!after.skills.shared[id])return false;delete before.skills.shared[id].effectiveHash;delete after.skills.shared[id].effectiveHash;}
    return JSON.stringify(before)===JSON.stringify(after);
  }catch{return false;}
}
function eligible(plan,config,root,base) {
  if(plan.effective_profile==='release'||!plan.changed_files.length)return false;
  const pilots=config.allowlist?.skills||[];
  return plan.changed_files.every(file=>{
    if(file==='skills-lock.json')return lockOnlyTouchesPilots(root,pilots,base);
    const match=/^(?:\.agents|\.codex|\.cursor|\.pi)\/skills\/([^/]+)(?:\/(.*))?$/.exec(file);
    if(!match||!pilots.includes(match[1]))return false;
    const suffix=match[2];if(!suffix)return true;
    return suffix==='SKILL.md'||/^(references|assets)\/[^\n]+\.(md|ya?ml)$/.test(suffix)&&!/(schema|approval|routing|generation|release)/i.test(suffix);
  });
}
export function applyVerificationSelection(plan,{selection='legacy',config,root,base}) {
  if(!['legacy','shadow','allowlist'].includes(selection))throw new TypeError(`未知 selection: ${selection}`);
  const all=new Map();
  for(const [group,value] of Object.entries(config.groups))for(const raw of value.commands){const entry=typeof raw==='string'?{run:raw}:raw;const compiled=compileVerificationCheck(entry,{profile:plan.requested_profile,group});const item={...entry,...compiled,dependencies_declared:Array.isArray(entry.depends_on)};const id=item.id;const previous=all.get(id);if(previous&&(previous.command!==item.command||previous.when!==item.when||JSON.stringify(previous.depends_on)!==JSON.stringify(item.depends_on)))throw Error(`检查 ID 冲突: ${id}`);all.set(id,item);}
  const visiting=new Set(),visited=new Set();
  const walk=id=>{if(visiting.has(id))throw Error(`检查依赖循环: ${id}`);if(visited.has(id))return;const item=all.get(id);if(!item)throw Error(`未知检查依赖: ${id}`);visiting.add(id);for(const dependency of item.depends_on||[])walk(dependency);visiting.delete(id);visited.add(id);};
  for(const id of all.keys())walk(id);
  const baseline=plan.commands.map(item=>({...item,id:verificationCheckId(item),depends_on:[...new Set([...(item.depends_on||[]),...(all.get(verificationCheckId(item))?.depends_on||[])])],selection_reason:'legacy-group'}));
  const canSelect=eligible(plan,config,root,base),selected=new Set(),reasons=new Map();
  for(const item of baseline){const definition=all.get(item.id);const prune=canSelect&&definition.inputs_complete===true&&definition.dependencies_declared&&definition.input_patterns?.length&&!plan.changed_files.some(file=>definition.input_patterns.some(p=>patternMatches(file,p)));
    if(!prune){selected.add(item.id);reasons.set(item.id,!canSelect?'fallback-legacy':definition.inputs_complete&&Array.isArray(definition.depends_on)?'input-match':'incomplete-dependencies-retained');}}
  const addDeps=id=>{for(const dependency of all.get(id).depends_on||[]){if(!selected.has(dependency)){selected.add(dependency);reasons.set(dependency,`dependency-of:${id}`);addDeps(dependency);}}};
  for(const id of [...selected])addDeps(id);
  const candidate=baseline.filter(item=>selected.has(item.id)).map(item=>({...item}));
  for(const id of selected)if(!candidate.some(x=>x.id===id)){const item=all.get(id);candidate.push(compileVerificationCheck(item,{profile:plan.requested_profile,group:item.group,gateIds:item.gate_ids||[]}));}
  candidate.forEach(item=>item.selection_reason=reasons.get(item.id));
  const enabled=canSelect&&qualified(config,root),effective=selection==='allowlist'&&enabled?'allowlist':selection==='legacy'?'legacy':'shadow';
  return {...plan,groups:[...new Set([...plan.groups,...candidate.map(x=>x.group)])],commands:effective==='allowlist'?candidate:baseline,selection:{requested:selection,effective,eligible:canSelect,qualified:enabled,baseline,candidate,omitted:baseline.filter(x=>!selected.has(x.id)).map(x=>({...x,reason:'declared-inputs-unaffected'})),fallback_reason:canSelect?(enabled?null:'qualification-missing-or-stale'):'outside-allowlist-or-full-profile'}};
}

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
