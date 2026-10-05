import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateBaseline,assertBaselineParameters} from './verification-baseline.mjs';
import {qualificationBindings,validateQualification} from './verification-qualification.mjs';

export const LEGACY_SOURCE_COMMIT = '11d88fb0ae6e4213bff6b4c5af4de03fd1aa2f1c';
export const LEGACY_COVERAGE_DIGEST = '3aa58425b03fda2291ebc78eea62381c602cd4592d4c4db87f197f82da9705f4';
export const verificationHash = value => createHash('sha256').update(value).digest('hex');
export const verificationCheckId = item => item.id || `check.${verificationHash(`${item.when||''}\0${item.command||item.run}`).slice(0,16)}`;
export function verificationPatternMatches(file, pattern) {
  let source='';
  for(let i=0;i<pattern.length;i++) {
    if(pattern[i]==='*'&&pattern[i+1]==='*'){source+='.*';i++;}
    else if(pattern[i]==='*')source+='[^/]*';
    else if(pattern[i]==='?')source+='[^/]';
    else source+=pattern[i].replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
  }
  return new RegExp(`^${source}$`).test(file);
}
export function verificationPolicyDigest(config) {
  const copy=structuredClone(config);
  if(copy.allowlist)copy.allowlist.qualification_ref=null;
  if(copy.gate_policy){copy.gate_policy.qualification_ref=null;delete copy.gate_policy.activation;}
  return verificationHash(JSON.stringify(copy));
}
export function loadLegacyManifest(root) {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'.template-source/process/template-verification-legacy.json'),'utf8'));
  const {coverage_digest,...body}=manifest;
  if(manifest.schema_version!==1||manifest.kind!=='template-verification-legacy-manifest'||manifest.source_commit!==LEGACY_SOURCE_COMMIT||coverage_digest!==LEGACY_COVERAGE_DIGEST||verificationHash(JSON.stringify(body))!==coverage_digest)throw Error('LEGACY_MANIFEST_BINDING_INVALID');
  if(manifest.commands.length!==117||manifest.syntax_files.length!==115||new Set(manifest.commands.map(x=>x.task_id)).size!==117)throw Error('LEGACY_MANIFEST_COVERAGE_INVALID');
  return manifest;
}
export function compileVerificationCheck(raw,{group,profile='release',gateIds=[],taskId}={}) {
  const item=typeof raw==='string'?{run:raw}:raw;
  if(typeof item.run!=='string'||!item.run)throw Error('VERIFICATION_COMMAND_INVALID');
  const sourceProfile=profile==='legacy-full'?'release':profile;
  const command=`${item.run}${item.require_committed_for?.includes(sourceProfile)&&!item.run.endsWith(' --require-committed')?' --require-committed':''}`;
  const result={id:verificationCheckId(item),group:group||item.group,command,when:item.when??null,depends_on:[...(item.depends_on||[])],gate_ids:[...gateIds]};
  if(taskId||item.task_id)result.task_id=taskId||item.task_id;
  for(const field of ['lane','resources','parallel_unless_env'])if(item[field]!==undefined)result[field]=structuredClone(item[field]);
  return result;
}
function checkCycles(items,field,label) {
  const all=new Map(items.map(item=>[item.id,item])),visiting=new Set(),visited=new Set();
  const visit=id=>{if(visiting.has(id))throw Error(`${label}依赖循环: ${id}`);if(visited.has(id))return;const item=all.get(id);if(!item)throw Error(`未知${label}依赖: ${id}`);visiting.add(id);for(const dep of item[field]||[])visit(dep);visiting.delete(id);visited.add(id);};
  for(const id of all.keys())visit(id);
}
export function validateGateConfiguration(config,manifest) {
  validateSupplementalChecks(config,manifest);
  if(!Array.isArray(config.gates)||config.gates.length!==20||config.gates.some((gate,i)=>gate.display_id!==`G${String(i+1).padStart(2,'0')}`||!/^check\.[a-zA-Z0-9._-]+$/.test(gate.id))||new Set(config.gates.map(gate=>gate.id)).size!==20||new Set(config.gates.map(gate=>gate.display_id)).size!==20)throw Error('GATE_REGISTRY_INVALID');
  const gateIds=new Set(config.gates.map(x=>x.id));
  const rows=new Map((config.legacy_coverage||[]).map(row=>[row.old_id,row]));
  if(rows.size!==117||config.legacy_coverage.length!==117)throw Error('LEGACY_COVERAGE_INCOMPLETE');
  for(const item of manifest.commands){const row=rows.get(item.task_id);if(!row||row.check_id!==item.id||row.group!==item.group||row.command!==item.run||!row.gate_ids?.length||row.gate_ids.some(id=>!gateIds.has(id)))throw Error(`LEGACY_COVERAGE_INVALID: ${item.task_id}`);}
  for(const gate of config.gates) {
    if(!['always','impact','four-cli-delivery'].includes(gate.trigger)||typeof gate.inputs_complete!=='boolean'||!Array.isArray(gate.input_patterns)||!Array.isArray(gate.check_ids))throw Error(`GATE_DEFINITION_INVALID: ${gate.id}`);
    const expected=new Set(config.legacy_coverage.filter(row=>row.gate_ids.includes(gate.id)).map(row=>row.check_id));
    if(gate.check_ids.some(id=>!expected.has(id))||[...expected].some(id=>!gate.check_ids.includes(id)))throw Error(`GATE_CHECK_BINDING_INVALID: ${gate.id}`);
  }
  checkCycles(config.gates,'impact_dependencies','Gate影响');checkCycles(config.gates,'depends_on','Gate执行');
  return true;
}
export function validateSupplementalChecks(config,manifest) {
  if(config.supplemental_checks===undefined)return true;
  if(!Array.isArray(config.supplemental_checks))throw Error('SUPPLEMENTAL_CHECK_INVALID');
  const ids=new Set(manifest.commands.map(task=>task.id)),tasks=new Set(manifest.commands.map(task=>task.task_id)),gates=new Set(config.gates?.map(gate=>gate.id)||[]);
  for(const check of config.supplemental_checks) {
    if(!check||!/^check\.[a-zA-Z0-9._-]+$/.test(check.id)||ids.has(check.id)||!/^supplemental\.[a-zA-Z0-9._-]+$/.test(check.task_id)||tasks.has(check.task_id)||typeof check.run!=='string'||!check.run.trim()||typeof check.group!=='string'||!check.group||!Array.isArray(check.gate_ids)||!check.gate_ids.length||new Set(check.gate_ids).size!==check.gate_ids.length||check.gate_ids.some(id=>!gates.has(id))||!Array.isArray(check.depends_on)||check.depends_on.some(id=>typeof id!=='string'||!id)||check.when!=='template-source'||check.source_requirement!=='committed'||check.require_committed_for!==undefined)throw Error('SUPPLEMENTAL_CHECK_INVALID');
    ids.add(check.id);tasks.add(check.task_id);
  }
  const all=[...manifest.commands,...config.supplemental_checks,{id:'check.verification-environment',task_id:'check.verification-environment',depends_on:[]}],taskMap=new Map(all.map(task=>[task.task_id,task]));
  const normalized=all.map(task=>({...task,id:task.task_id,depends_on:(task.depends_on||[]).map(id=>{if(taskMap.has(id))return id;const matches=all.filter(row=>row.id===id);if(matches.length!==1)throw Error('SUPPLEMENTAL_DEPENDENCY_INVALID');return matches[0].task_id;})}));
  checkCycles(normalized,'depends_on','补充检查执行');
  return true;
}

export function assertQualificationReportParameters({qualificationReport,qualificationReportDigest}={}) {
  const qualificationSupplied=qualificationReport!==undefined||qualificationReportDigest!==undefined;
  if(qualificationSupplied) {
    if(typeof qualificationReport!=='string'||!qualificationReport||typeof qualificationReportDigest!=='string'||!qualificationReportDigest)throw Error('QUALIFICATION_REPORT_PARAMETERS_INCOMPLETE');
    if(!/^[a-f0-9]{64}$/.test(qualificationReportDigest))throw Error('QUALIFICATION_REPORT_DIGEST_INVALID');
    if(!path.isAbsolute(qualificationReport)||fs.realpathSync(qualificationReport)!==path.resolve(qualificationReport)||!fs.lstatSync(qualificationReport).isFile())throw Error('QUALIFICATION_REPORT_PATH_INVALID');
    if(verificationHash(fs.readFileSync(qualificationReport))!==qualificationReportDigest)throw Error('QUALIFICATION_REPORT_DIGEST_MISMATCH');
  }
}
/** The frozen manifest is the safety fallback, independent of release.all_groups. */
export function buildGatePlan(plan,{config,root,base,baselineReport,baselineReportDigest,baselineAssessment,baselineValidator,qualificationReport,qualificationReportDigest}={}) {
  assertBaselineParameters({root,base,baselineReport,baselineReportDigest});
  assertQualificationReportParameters({qualificationReport,qualificationReportDigest});
  const manifest=loadLegacyManifest(root);validateGateConfiguration(config,manifest);
  const policyDigest=verificationPolicyDigest(config), coverage=new Map(config.legacy_coverage.map(row=>[row.old_id,row]));
  const legacyCommands=manifest.commands.map(row=>compileVerificationCheck(row,{profile:plan.requested_profile,group:row.group,gateIds:coverage.get(row.task_id).gate_ids}));
  const selected=new Set(),reasons=new Map();
  for(const gate of config.gates) {
    if(gate.execution_scope!=='template-verification')continue;
    const match=plan.changed_files.some(file=>gate.input_patterns.some(pattern=>verificationPatternMatches(file,pattern)));
    if(gate.trigger==='always'||match||!gate.inputs_complete){selected.add(gate.id);reasons.set(gate.id,gate.trigger==='always'?'always':match?'input-match':'inputs-not-audited');}
  }
  let expanded=true;
  while(expanded){expanded=false;for(const gate of config.gates){if(!selected.has(gate.id)&&(gate.impact_dependencies||[]).some(id=>selected.has(id))){selected.add(gate.id);reasons.set(gate.id,'impact-consumer');expanded=true;}if(selected.has(gate.id))for(const id of gate.depends_on||[])if(!selected.has(id)){selected.add(id);reasons.set(id,`execution-prerequisite:${gate.id}`);expanded=true;}}}
  const candidate=legacyCommands.filter(row=>row.gate_ids.some(id=>selected.has(id))).map(row=>({...row}));
  // Gate prerequisites compile to concrete task occurrences, including duplicated old checks.
  for(const task of candidate) {
    const prerequisiteGates=config.gates.filter(gate=>task.gate_ids.includes(gate.id)).flatMap(gate=>gate.depends_on||[]);
    const prerequisiteTasks=candidate.filter(other=>other.task_id!==task.task_id&&other.gate_ids.some(id=>prerequisiteGates.includes(id)));
    task.depends_on=[...new Set([...task.depends_on,...prerequisiteTasks.map(other=>other.task_id)])];
  }
  checkCycles(candidate.map(task=>({...task,id:task.task_id})),'depends_on','Gate任务执行');
  const fallback=[];
  const core=plan.changed_files.some(file=>(config.core_escalation_patterns||[]).some(pattern=>verificationPatternMatches(file,pattern)));
  if(core)fallback.push('core-policy-change');
  if(config.gates.some(gate=>gate.execution_scope==='template-verification'&&(!gate.inputs_complete||!['passed','conservative-complete'].includes(gate.audit_status)))||config.legacy_coverage.some(row=>!['passed','preserved'].includes(row.audit_status)))fallback.push('gate-input-audit-incomplete');
  const baseline=validateBaseline({root,base,baselineReport,baselineReportDigest,assessment:baselineAssessment,validator:baselineValidator,policyDigest});
  if(baselineReport!==undefined&&!baseline.valid)throw Error(`BASELINE_REPORT_INVALID: ${baseline.reasons.join(', ')}`);
  if(!baseline.valid)fallback.push(...baseline.reasons);
  let qualification={valid:false,reasons:['qualification-missing']};
  if(qualificationReport) {
    try {const bindings=qualificationBindings({root,config,policyDigest,legacyManifestDigest:manifest.coverage_digest});qualification=validateQualification({root,config,reportFile:qualificationReport,expectedBindings:bindings,expectedDigest:qualificationReportDigest});}
    catch(error){qualification={valid:false,reasons:[error.message]};}
  }
  if(!qualification.valid)fallback.push('qualification-missing-or-stale');
  if(config.gate_policy.activation!=='qualified-gates')fallback.push('gate-policy-not-activated');
  if(plan.requested_profile==='legacy-full')fallback.push('explicit-legacy-full');
  const full=fallback.length>0;
  const gates=config.gates.map(gate=>{
    const internal=gate.execution_scope==='template-verification',chosen=internal&&(full||selected.has(gate.id));
    return {...gate,selected:chosen,selection_reason:!internal?`${gate.execution_scope}-owned`:full?'legacy-full-safety':reasons.get(gate.id)||'inputs-unaffected',check_ids:chosen?[...new Set((full?legacyCommands:candidate).filter(row=>row.gate_ids.includes(gate.id)).map(row=>row.id))]:[],task_ids:chosen?(full?legacyCommands:candidate).filter(row=>row.gate_ids.includes(gate.id)).map(row=>row.task_id):[]};
  });
  const notApplicable=gates.filter(gate=>gate.execution_scope==='template-verification'&&!gate.selected).map(gate=>({gate_id:gate.id,reason:'declared-inputs-unaffected',policy_digest:policyDigest}));
  return {...plan,strategy:full?'legacy-full':'qualified-gates',effective_profile:'release',source_requirement:plan.requested_profile==='fast'?'current':'committed',commands:full?legacyCommands:candidate,groups:[...new Set((full?legacyCommands:candidate).map(row=>row.group))],gates,not_applicable:notApplicable,policy_digest:policyDigest,legacy_manifest_digest:manifest.coverage_digest,legacy_source_commit:manifest.source_commit,fallback_reasons:[...new Set(fallback)],baseline,qualification,shadow_commands:candidate,syntax_files:[...new Set([...manifest.syntax_files,...(config.syntax_files||[])])],legacy_syntax_files:manifest.syntax_files,postchecks:manifest.postchecks};
}
