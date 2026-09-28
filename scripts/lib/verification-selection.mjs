import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const verificationCheckId = item => item.id || `check.${hash(`${item.when||''}\0${item.command||item.run}`).slice(0,16)}`;
export function patternMatches(file, pattern) {
  return new RegExp('^'+pattern.split('**').map(part=>part.split('*').map(x=>x.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&')).join('[^/]*')).join('.*')+'$').test(file);
}
export function selectionPolicyDigest(config) {
  const copy=structuredClone(config);if(copy.allowlist)copy.allowlist.qualification_ref=null;
  return hash(JSON.stringify(copy));
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
    const median=values=>{if(!Array.isArray(values)||values.length<3||values.some(x=>!Number.isFinite(x)||x<=0))throw Error('invalid timing');const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
    const evidence=JSON.parse(fs.readFileSync(resolved,'utf8'));
    return evidence.kind==='verification-allowlist-qualification'&&evidence.status==='passed'&&evidence.negative_cases_passed===true&&evidence.related_failures_omitted===0&&evidence.unique_commands.candidate<evidence.unique_commands.baseline&&evidence.timing.candidate_samples.length>=3&&evidence.timing.baseline_samples.length>=3&&median(evidence.timing.candidate_samples)<median(evidence.timing.baseline_samples)&&JSON.stringify(evidence.bindings)===JSON.stringify(selectionBindings(root,config));
  }catch{return false;}
}
function lockOnlyTouchesPilots(root, pilots) {
  try {
    const result=spawnSync('git',['show','HEAD:skills-lock.json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});if(result.status!==0)return false;
    const before=JSON.parse(result.stdout),after=JSON.parse(fs.readFileSync(path.join(root,'skills-lock.json'),'utf8'));
    // The lock's collection shape must be known; unknown metadata changes fall back.
    if(!before.skills||!after.skills||Array.isArray(before.skills))return false;
    if(!before.skills.shared||!after.skills.shared)return false;
    for(const id of pilots){if(!before.skills.shared[id]||!after.skills.shared[id])return false;delete before.skills.shared[id].effectiveHash;delete after.skills.shared[id].effectiveHash;}
    return JSON.stringify(before)===JSON.stringify(after);
  }catch{return false;}
}
function eligible(plan,config,root) {
  if(plan.effective_profile==='release'||!plan.changed_files.length)return false;
  const pilots=config.allowlist?.skills||[];
  return plan.changed_files.every(file=>{
    if(file==='skills-lock.json')return lockOnlyTouchesPilots(root,pilots);
    const match=/^(?:\.agents|\.codex|\.cursor|\.pi)\/skills\/([^/]+)(?:\/(.*))?$/.exec(file);
    if(!match||!pilots.includes(match[1]))return false;
    const suffix=match[2];if(!suffix)return true;
    return suffix==='SKILL.md'||/^(references|assets)\/[^\n]+\.(md|ya?ml)$/.test(suffix)&&!/(schema|approval|routing|generation|release)/i.test(suffix);
  });
}
export function applyVerificationSelection(plan,{selection='legacy',config,root}) {
  if(!['legacy','shadow','allowlist'].includes(selection))throw new TypeError(`未知 selection: ${selection}`);
  const all=new Map();
  for(const [group,value] of Object.entries(config.groups))for(const raw of value.commands){const entry=typeof raw==='string'?{run:raw}:raw;const item={...entry,command:entry.run,group};const id=verificationCheckId(item);if(all.has(id)&&all.get(id).command!==item.command)throw Error(`检查 ID 冲突: ${id}`);all.set(id,{...item,id});}
  const visiting=new Set(),visited=new Set();
  const walk=id=>{if(visiting.has(id))throw Error(`检查依赖循环: ${id}`);if(visited.has(id))return;const item=all.get(id);if(!item)throw Error(`未知检查依赖: ${id}`);visiting.add(id);for(const dependency of item.depends_on||[])walk(dependency);visiting.delete(id);visited.add(id);};
  for(const id of all.keys())walk(id);
  const baseline=plan.commands.map(item=>({...item,id:verificationCheckId(item),depends_on:all.get(verificationCheckId(item)).depends_on||[],selection_reason:'legacy-group'}));
  const canSelect=eligible(plan,config,root),selected=new Set(),reasons=new Map();
  for(const item of baseline){const definition=all.get(item.id);const prune=canSelect&&definition.inputs_complete===true&&Array.isArray(definition.depends_on)&&definition.input_patterns?.length&&!plan.changed_files.some(file=>definition.input_patterns.some(p=>patternMatches(file,p)));
    if(!prune){selected.add(item.id);reasons.set(item.id,!canSelect?'fallback-legacy':definition.inputs_complete&&Array.isArray(definition.depends_on)?'input-match':'incomplete-dependencies-retained');}}
  const addDeps=id=>{for(const dependency of all.get(id).depends_on||[]){if(!selected.has(dependency)){selected.add(dependency);reasons.set(dependency,`dependency-of:${id}`);addDeps(dependency);}}};
  for(const id of [...selected])addDeps(id);
  const candidate=baseline.filter(item=>selected.has(item.id)).map(item=>({...item}));
  for(const id of selected)if(!candidate.some(x=>x.id===id)){const item=all.get(id);candidate.push({group:item.group,command:item.command,when:item.when||null,id,depends_on:item.depends_on||[],...(item.lane?{lane:item.lane}:{}),...(item.resources?{resources:item.resources}:{}),...(item.parallel_unless_env?{parallel_unless_env:item.parallel_unless_env}:{})});}
  candidate.forEach(item=>item.selection_reason=reasons.get(item.id));
  const enabled=canSelect&&qualified(config,root),effective=selection==='allowlist'&&enabled?'allowlist':selection==='legacy'?'legacy':'shadow';
  return {...plan,groups:[...new Set([...plan.groups,...candidate.map(x=>x.group)])],commands:effective==='allowlist'?candidate:baseline,selection:{requested:selection,effective,eligible:canSelect,qualified:enabled,baseline,candidate,omitted:baseline.filter(x=>!selected.has(x.id)).map(x=>({...x,reason:'declared-inputs-unaffected'})),fallback_reason:canSelect?(enabled?null:'qualification-missing-or-stale'):'outside-allowlist-or-full-profile'}};
}
