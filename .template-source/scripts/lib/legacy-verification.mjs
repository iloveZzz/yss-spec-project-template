import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseDocument} from '../../../scripts/vendor/yaml.mjs';
import {expandLegacyCoverage} from '../../../scripts/lib/legacy-coverage.mjs';
import {compileVerificationCheck} from './verification-execution-plan.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=(root,commit,ref)=>{const result=spawnSync('git',['show',`${commit}:${ref}`],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw new Error(result.stderr||'legacy reference source unavailable');return result.stdout;};
export function verifyLegacyManifest(root,manifest) {
  if(manifest?.kind!=='template-verification-legacy-manifest'||!/^[a-f0-9]{40}$/.test(manifest.source_commit))throw new TypeError('legacy manifest 必须绑定完整源 SHA');
  const bytes=source(root,manifest.source_commit,'.template-source/process/template-verification-profiles.yaml');
  if(hash(bytes)!==manifest.source_profile_sha256)throw new TypeError('legacy profile 摘要漂移');
  const document=parseDocument(bytes,{uniqueKeys:true});if(document.errors.length)throw new TypeError('legacy profile 无效');
  const config=document.toJS({maxAliasCount:0});
  const expected=Object.entries(config.groups).flatMap(([group,value])=>value.commands.map(raw=>{const row={group,...typeof raw==='string'?{run:raw}:raw};return {...row,id:row.id||`check.${hash(`${row.when||''}\0${row.run}`).slice(0,16)}`};}));
  const fields=['group','run','when','id','require_committed_for','lane','resources','parallel_unless_env'];
  const normalize=row=>Object.fromEntries(fields.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
  if(JSON.stringify(expected.map(normalize))!==JSON.stringify(manifest.commands.map(normalize))||JSON.stringify(config.syntax_files)!==JSON.stringify(manifest.syntax_files))throw new TypeError('legacy manifest 与冻结 profile 不等价');
  return config;
}
export function compileLegacyPlan(manifest,{profile='release'}={}) {
  const commands=manifest.commands.map((raw,index)=>{
    const command=`${raw.run}${raw.require_committed_for?.includes(profile)?' --require-committed':''}`;
    const id=raw.id||`check.${hash(`${raw.when||''}\0${command}`).slice(0,16)}`;
    return {...raw,id,task_id:raw.task_id||`legacy.${String(index).padStart(3,'0')}`,command,when:raw.when||null};
  });
  return {strategy:'legacy-reference',legacy_source_commit:manifest.source_commit,source_requirement:'committed',requested_profile:'legacy-full',effective_profile:'release',groups:[...new Set(commands.map(row=>row.group))],commands,required_files:manifest.required_files||[],syntax_files:manifest.syntax_files,max_concurrency:1,selection:{requested:'legacy',effective:'legacy',omitted:[]},gates:[],not_applicable:[]};
}

export const LEGACY_SOURCE_COMMIT='11d88fb0ae6e4213bff6b4c5af4de03fd1aa2f1c';
export const LEGACY_COVERAGE_DIGEST='3aa58425b03fda2291ebc78eea62381c602cd4592d4c4db87f197f82da9705f4';
export function readHistoricalProfiles(root,commit) {
  if(!/^[a-f0-9]{40}$/.test(commit||''))throw new TypeError('历史策略必须绑定完整 SHA');
  const document=parseDocument(source(root,commit,'.template-source/process/template-verification-profiles.yaml'),{uniqueKeys:true});
  if(document.errors.length)throw new TypeError('历史策略无法解析');
  return expandLegacyCoverage(document.toJS({maxAliasCount:0}));
}
export function loadLegacyManifest(root,commit) {
  if(!/^[a-f0-9]{40}$/.test(commit||''))throw new TypeError('历史台账必须绑定完整 SHA');
  const manifest=JSON.parse(source(root,commit,'.template-source/process/template-verification-legacy.json'));
  const {coverage_digest,...body}=manifest;
  if(manifest.schema_version!==1||manifest.source_commit!==LEGACY_SOURCE_COMMIT||coverage_digest!==LEGACY_COVERAGE_DIGEST||hash(JSON.stringify(body))!==coverage_digest)throw new TypeError('LEGACY_MANIFEST_BINDING_INVALID');
  verifyLegacyManifest(root,manifest);return manifest;
}
/** Reconstruct old complete evidence from Git data only; never load or execute old JavaScript. */
export function compileHistoricalVerificationPlan({root,commit,profile='release',config=readHistoricalProfiles(root,commit),changedFiles=[]}) {
  if(!['release','candidate','legacy-full'].includes(profile))throw new TypeError('历史发布 profile 不支持');
  if(profile==='legacy-full')return compileLegacyPlan(loadLegacyManifest(root,commit));
  const commands=Object.entries(config.groups).flatMap(([group,value])=>value.commands.map(raw=>compileVerificationCheck(raw,{group,profile})));
  const base={source_requirement:'committed',compatibility_required:true,requested_profile:profile,effective_profile:'release',changed_files:changedFiles,unknown_files:[],groups:Object.keys(config.groups),commands,required_files:config.required_files||[],syntax_files:config.syntax_files||[],max_concurrency:config.max_concurrency||4,supplemental_checks:structuredClone(config.supplemental_checks||[]),selection:{requested:'legacy',effective:'legacy',omitted:[]},gates:[],not_applicable:[]};
  if(!config.gate_policy)return base;
  if(config.gate_policy.activation==='qualified-gates')throw new TypeError('HISTORICAL_QUALIFIED_BASELINE_REFUSED');
  const manifest=loadLegacyManifest(root,commit),coverage=new Map(config.legacy_coverage.map(row=>[row.old_id,row]));
  const policy=structuredClone(config);if(policy.allowlist)policy.allowlist.qualification_ref=null;if(policy.gate_policy){policy.gate_policy.qualification_ref=null;delete policy.gate_policy.activation;}
  const full=manifest.commands.map(row=>{const binding=coverage.get(row.task_id);if(!binding?.gate_ids?.length)throw new TypeError('历史覆盖责任缺失');return compileVerificationCheck(row,{profile,group:row.group,gateIds:binding.gate_ids});});
  const gates=config.gates.map(gate=>{const selected=gate.execution_scope==='template-verification';return {...gate,selected,selection_reason:selected?'legacy-full-safety':`${gate.execution_scope}-owned`,check_ids:selected?[...new Set(full.filter(row=>row.gate_ids.includes(gate.id)).map(row=>row.id))]:[],task_ids:selected?full.filter(row=>row.gate_ids.includes(gate.id)).map(row=>row.task_id):[]};});
  return {...base,strategy:'legacy-full',commands:full,groups:[...new Set(full.map(row=>row.group))],gates,policy_digest:hash(JSON.stringify(policy)),legacy_manifest_digest:manifest.coverage_digest,legacy_source_commit:manifest.source_commit,syntax_files:[...new Set([...manifest.syntax_files,...base.syntax_files])],legacy_syntax_files:manifest.syntax_files,postchecks:manifest.postchecks};
}
