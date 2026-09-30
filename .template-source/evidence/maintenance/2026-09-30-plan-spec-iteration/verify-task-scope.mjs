import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../../../..'),out=process.argv[2];
if(!out||path.resolve(out).startsWith(root+path.sep)||fs.existsSync(out))throw new Error('需要新的仓库外报告目录');
fs.mkdirSync(out,{recursive:true});
const report={kind:'plan-spec-task-scope-fresh-verification',started_at:new Date().toISOString(),status:'running',scope:'explicit task source and distribution inputs; not complete-candidate verification',release_ready:false,source_state:'working-tree',excluded:['.codegraph runtime caches','unrelated .template-source/evidence','node_modules and interpreter caches'],results:[]};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const projections=['.codex/skills','.cursor/skills','.pi/skills'];
const prefixes=['.agents/skills',...projections,'.template-spec','scripts','.template-source/tooling/node','.template-source/cli-core','.template-source/process','.template-source/agents','.template-source/scripts','.template-source/plugins','.template-source/distribution','.template-source/profile-skill-sync.json','AGENTS.md','CONTEXT.md','yss-project.yaml','skills-lock.json'];
for(const name of ['yss-harness-design-agent','yss-harness-backend-agent','yss-harness-frontend-agent'])for(const ref of ['.agents/skills',...projections,'.template-spec','scripts','skills-lock.json','yss-project.yaml','AGENTS.md','CONTEXT.md','.template-source/tooling/node','.template-source/distribution/strategic-handoff-tools.lock.json'])prefixes.push(`submodules/${name}/${ref}`);
for(const name of ['create-yss-spec','create-yss-strategic-design','create-yss-harness-backend','create-yss-harness-frontend'])for(const ref of ['bin','src','scripts','tests','vendor','package.json','cli-core.lock.json','template','template.snapshot.json','template.manifest.json','config'])prefixes.push(`submodules/${name}/${ref}`);
prefixes.push(path.relative(root,import.meta.filename),'.template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/distribution-smoke.mjs');
function inventory(){
 const files={};
 const walk=ref=>{const file=path.join(root,ref);let s;try{s=fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}
  if(s.isSymbolicLink()){files[ref]={link:fs.readlinkSync(file)};return;}
  if(s.isDirectory()){for(const entry of fs.readdirSync(file).sort())if(!['node_modules','__pycache__','.DS_Store'].includes(entry))walk(`${ref}/${entry}`);return;}
  files[ref]={sha256:sha(fs.readFileSync(file)),mode:s.mode&0o777};
 };
 for(const ref of prefixes)walk(ref);
 return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}
const before=inventory();report.input_sha256=sha(JSON.stringify(before));report.input_count=Object.keys(before).length;
fs.writeFileSync(path.join(out,'inputs.json'),JSON.stringify(before,null,2)+'\n');
const commands=[
 ['node',['--test','.template-source/tooling/node/test/plan-spec-quality.test.mjs']],
 ['pnpm',['--dir','.template-source/tooling/node','check:vendor']],
 ['node',['scripts/verify-plan-spec-entry-scenarios']],
 ['node',['scripts/verify-plan-requirements-context-scenarios']],
 ['node',['scripts/verify-context-reconciliation-scenarios']],
 ['node',['scripts/verify-user-decision-scenarios']],
 ['node',['scripts/sync-profile-skills','--profile','all','--check']],
 ['node',['scripts/sync-strategic-handoff-tools','--check']],
 ['node',['scripts/sync-skills','--check']],
 ['node',['scripts/verify-upstream-skill-source','--source=iloveZzz/yss-harness-design-agent','--source-root=submodules/yss-harness-design-agent']],
 ['node',['.agents/skills/i-have-adhd/tests/verify-integration.mjs']],
 ['node',['--test','--test-concurrency=1','tests/plan-spec-distribution.test.js','tests/init-cli.test.js','tests/sync-command-modular.test.js','tests/cli-entrypoint.test.js'],'submodules/create-yss-spec'],
 ['node',[path.relative(root,path.join(import.meta.dirname,'distribution-smoke.mjs')),path.join(out,'distribution.json')]],
 ['node',['scripts/test-with-plugin-clis.mjs','test/plugin-build.test.mjs'],'.template-source/tooling/node'],
 ['git',['diff','--check','--','.agents/skills/to-spec','.agents/skills/yss-stage-decision','.agents/skills/yss-product-lifecycle/references/plan-requirements.md','.template-spec/plan/templates/plan-template.md','.template-spec/templates/spec-template.md','.template-spec/templates/spec-delta-template.md','.template-spec/templates/examples/lifecycle-writing-examples.md','.template-source/tooling/node','.template-source/agents/strategic-design-skills-integration.md','scripts/sync-strategic-handoff-tools','scripts/vendor']]
];
try{
 for(const [command,args,cwd='.'] of commands){
  const start=performance.now(),r=spawnSync(command,args,{cwd:path.join(root,cwd),encoding:'utf8',maxBuffer:32*1024*1024,timeout:240000});
  const index=report.results.length;fs.writeFileSync(path.join(out,`${index}.stdout`),r.stdout??'');fs.writeFileSync(path.join(out,`${index}.stderr`),r.stderr??'');
  report.results.push({command,args,cwd,exit_code:r.status??2,duration_ms:performance.now()-start,error:r.error?.message??null});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${r.status===0?'PASS':'FAIL'} ${command} ${args.join(' ')}`);
 }
 const after=inventory();report.input_after_sha256=sha(JSON.stringify(after));report.input_drift=report.input_sha256!==report.input_after_sha256;
 report.changed_inputs=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(ref=>JSON.stringify(before[ref])!==JSON.stringify(after[ref]));
 report.status=report.results.every(x=>x.exit_code===0)&&!report.input_drift?'passed':'failed';
}catch(error){report.status='failed';report.error=error.message;}
finally{report.finished_at=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');process.exitCode=report.status==='passed'?0:1;}
