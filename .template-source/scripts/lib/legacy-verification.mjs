import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {parseDocument} from '../../../scripts/vendor/yaml.mjs';

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
export async function loadLegacyReferenceRunner(root,manifest) {
  verifyLegacyManifest(root,manifest);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yss-legacy-verification-reference-'));
  const refs=['template-verification-runner.mjs','runtime-store.mjs','command-runner.mjs'],digests={};
  try {
    for(const ref of refs){const code=source(root,manifest.source_commit,`scripts/lib/${ref}`);digests[ref]=hash(code);fs.writeFileSync(path.join(directory,ref),code,{flag:'wx'});}
    const imported=await import(pathToFileURL(path.join(directory,'template-verification-runner.mjs')).href);
    return {runGroups:imported.runGroups,printResults:imported.printResults,binding:{source_commit:manifest.source_commit,runner_sha256:digests['template-verification-runner.mjs'],module_sha256:digests},dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
  }catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error;}
}
