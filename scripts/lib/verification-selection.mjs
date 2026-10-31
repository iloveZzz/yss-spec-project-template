import path from 'node:path';
import {verificationCheckId,verificationPatternMatches as patternMatches,compileVerificationCheck} from '../../.template-source/scripts/lib/verification-gates.mjs';
import {verificationToolRequirements} from '../../.template-source/scripts/lib/verification-preflight.mjs';
export {verificationCheckId,patternMatches};

export function selectCiOffline(plan) {
  const byId=new Map(plan.commands.map(item=>[item.id,item])), deferred=new Map();
  function reason(item) {
    if(deferred.has(item.id))return deferred.get(item.id);
    const needs=verificationToolRequirements({strategy:'daily-necessary',commands:[item]});
    const resources=['native_cli','plugin_candidate','go','tooling','vue','design_vue'].filter(name=>needs[name]);
    if(item.resources?.includes('plugin-committed'))resources.push('plugin-committed');
    let why=resources.length?`tools:${resources.join(',')}`:null;
    if(!why)for(const id of item.depends_on||[]){const dependency=byId.get(id);if(dependency&&reason(dependency)){why=`dependency:${id}`;break;}}
    deferred.set(item.id,why);return why;
  }
  const kept=plan.commands.filter(item=>!reason(item));
  const omitted=plan.commands.filter(item=>reason(item)).map(item=>({...item,reason:'deferred-ci-offline',deferred_reason:reason(item)}));
  return {...plan,commands:kept,groups:[...new Set(kept.map(item=>item.group))],selection:{...plan.selection,ci_offline:true,candidate:kept,omitted:[...plan.selection.omitted,...omitted]}};
}
// tier: slow 的日常检查在 fast 中延后：命中也不执行，记入 selection.omitted（报告列为未执行）；includeSlow 或 release 时照常执行。
export function applyDailyVerificationSelection(plan,{selection='allowlist',config,profile='fast',mandatoryChecks=[],mandatoryReason='release-required',includeSlow=false}) {
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
    if(raw.tier!==undefined&&raw.tier!=='slow')throw new TypeError(`日常检查 tier 只能为 slow: ${raw.id}`);
    checks.set(raw.id,{...definition,...raw});
  }
  const syntaxPackage=file=>path.basename(file)==='package.json'&&(config.syntax_files||[]).some(ref=>ref.startsWith(path.posix.dirname(file)==='.'?'':`${path.posix.dirname(file)}/`));
  // The retired root remains an impact input for deleting its generated projection.
  const matches=(file,pattern)=>patternMatches(file,pattern)||patternMatches(file.replace(/^\.(codex|cursor|pi|codebuddy|workbuddy)\/skills\//,'.agents/skills/'),pattern);
  const skillTree=/^\.(agents|codex|cursor|pi|codebuddy|workbuddy)\/skills\//;
  const structuralSkillPattern=/^\.(agents|codex|cursor|pi|codebuddy|workbuddy)\/skills\/\*\*(?:\/\*\.(?:mjs|js))?$/;
  // A tree identity check cannot declare executable or structured Skill behavior covered.
  const unknown=plan.changed_files.filter(file=>!syntaxPackage(file)&&![...checks.values()].some(item=>item.input_patterns.some(pattern=>matches(file,pattern)&&(!skillTree.test(file)||file.endsWith('.md')||!structuralSkillPattern.test(pattern)))));
  if(unknown.length&&selection==='allowlist')throw new TypeError(`INCOMPLETE_VERIFICATION_INPUTS: 先登记本次行为和消费者: ${unknown.join(', ')}`);
  const visiting=new Set(),visited=new Set();
  const validate=id=>{if(visiting.has(id))throw new TypeError(`检查依赖循环: ${id}`);if(visited.has(id))return;const item=checks.get(id);if(!item)throw new TypeError(`未知检查依赖: ${id}`);visiting.add(id);for(const dep of item.depends_on)validate(dep);visiting.delete(id);visited.add(id);};
  for(const id of checks.keys())validate(id);
  const reasons=new Map();
  const select=(id,reason)=>{if(reasons.has(id))return;let item=checks.get(id);if(!item){const definition=definitions.get(id);if(!definition)throw new TypeError(`未知检查依赖: ${id}`);item={...definition,depends_on:definition.depends_on||[]};checks.set(id,item);}reasons.set(id,reason);for(const dep of item.depends_on)select(dep,`dependency-of:${id} -> ${checks.get(dep).failure_mode}`);};
  const deferred=[];
  // includeSlow==='only'：定时/按需运行只执行全部 tier: slow 检查，不看变化路径。
  if(profile==='fast'&&includeSlow==='only')for(const item of checks.values()){if(item.tier==='slow')select(item.id,`slow-tier: ${item.failure_mode}`);}
  else for(const item of checks.values()) {
    const matched=plan.changed_files.filter(file=>item.input_patterns.some(pattern=>matches(file,pattern)));
    if(!matched.length)continue;
    const reason=`input-match:${matched.join(', ')} -> ${item.failure_mode}`;
    if(profile==='fast'&&item.tier==='slow'&&!includeSlow){deferred.push({...compileVerificationCheck(item,{group:item.group,profile,taskId:item.id}),selection_reason:reason,reason:'deferred-slow-check'});continue;}
    select(item.id,reason);
  }
  for(const id of mandatoryChecks){if(!checks.has(id)){const definition=definitions.get(id);if(!definition)throw new TypeError(`未知发行必需检查: ${id}`);checks.set(id,{...definition,depends_on:definition.depends_on||[]});}if(mandatoryReason==='ci-required'&&reasons.has(id))reasons.set(id,mandatoryReason);else select(id,mandatoryReason);}
  if(profile==='release') {
    const gates=new Map((config.gates||[]).map(gate=>[gate.id,gate])),expanded=new Set();
    const expand=gate=>{if(expanded.has(gate.id))return;expanded.add(gate.id);for(const id of [...gate.depends_on,...gate.impact_dependencies]){const dependency=gates.get(id);if(!dependency)throw new TypeError(`未知 Gate 依赖: ${id}`);for(const check of dependency.check_ids)select(check,`gate-dependency:${gate.id}`);expand(dependency);}};
    for(const gate of gates.values())if(gate.check_ids.some(id=>reasons.has(id)))expand(gate);
  }
  const candidate=[...checks.values()].filter(item=>reasons.has(item.id)).map(item=>({...compileVerificationCheck(item,{group:item.group,profile,taskId:item.id}),selection_reason:reasons.get(item.id)}));
  if(profile==='release')return {...plan,commands:candidate,groups:[...new Set(candidate.map(item=>item.group))],selection:{requested:'impact',effective:'impact',eligible:true,qualified:false,omitted:plan.commands.filter(item=>!candidate.some(check=>check.id===item.id)).map(item=>({id:item.id,reason:'outside-release-inputs'}))}};
  const commands=selection==='allowlist'?candidate:plan.commands.map((item,index)=>({...item,task_id:item.task_id||`daily.group.${index+1}`,resources:[...new Set([...(item.resources||[]),...(checks.get(item.id)?.resources||[])])],selection_reason:`explicit-group:${item.group}`}));
  return {...plan,strategy:'daily-necessary',commands,groups:[...new Set(commands.map(item=>item.group))],required_files:[],supplemental_checks:[],gates:[],not_applicable:[],selection:{requested:selection,effective:selection,eligible:!unknown.length,qualified:false,baseline:plan.commands,candidate,omitted:[...plan.commands.filter(item=>!candidate.some(check=>check.id===item.id)&&!deferred.some(check=>check.id===item.id)).map(item=>({...item,reason:'outside-daily-inputs'})),...deferred.filter(item=>!candidate.some(check=>check.id===item.id))],fallback_reason:unknown.length?`incomplete-daily-inputs:${unknown.join(', ')}`:null}};
}
