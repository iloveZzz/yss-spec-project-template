import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
const root=path.resolve(process.argv[2] ?? path.join(import.meta.dirname,'../../../..'));
const out=realpathSync(mkdtempSync(path.join(tmpdir(),'yss-semantic-distribution-')));console.log('Evidence directory: '+out);
const {parse}=await import(pathToFileURL(root+'/scripts/vendor/yaml.mjs'));
function run(script,args){return new Promise((resolve,reject)=>{const c=spawn(process.execPath,[script,...args],{cwd:root,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';c.stdout.on('data',x=>stdout+=x);c.stderr.on('data',x=>stderr+=x);c.on('error',reject);c.on('close',code=>resolve({code,stdout,stderr}));});}
const profiles=[['spec','create-yss-spec','create-yss-spec.js'],['design','create-yss-strategic-design','create-yss-harness-design.js'],['backend','create-yss-harness-backend','create-yss-harness-backend.js'],['frontend','create-yss-harness-frontend','create-yss-harness-frontend.js']];
const results=[];
for(const [name,repo,bin] of profiles){
 const target=out+'/'+name;
 const init=await run(`${root}/submodules/${repo}/bin/${bin}`,['--project-name','Semantic Presentation Fixture','--business-domain','合成验证','--team-size','1','--target-dir',target,...(name==='spec'?['--agent-runtime','codex']:[])]);
 assert.equal(init.code,0,init.stderr);writeFileSync(out+'/'+name+'-init.log',init.stdout+init.stderr);
 for(const ref of ['scripts/lib/lifecycle-presentation.mjs','.template-spec/process/document-writing.md'])assert.equal(readFileSync(target+'/'+ref,'utf8'),readFileSync(root+'/'+ref,'utf8'),ref);
 const {loadLifecyclePresenter}=await import(pathToFileURL(target+'/scripts/lib/lifecycle-presentation.mjs'));
 const presenter=loadLifecyclePresenter(target);assert.deepEqual(presenter.warnings,[]);
 const registry=parse(readFileSync(target+'/.template-spec/process/lifecycle-registry.yaml','utf8'));
 for(const key of ['stages','gates','checks','artifacts','work_units','evidence'])for(const row of registry[key]||[])assert.equal(presenter.describe(row.id).name,row.public_name??row.name);
 const role=presenter.roleIds[0],stage=registry.stages[0].id,unit=registry.work_units.find(row=>row.scope==='project-instance')?.id??registry.work_units[0].id;
 const checkpoint={schema_version:1,repository_mode:'project-instance',mode:'route',status:'paused-human-gate',stage,next_work_unit:unit,artifacts:{},gates:{},blockers:[],pause:{owner_or_authority:role}};
 writeFileSync(target+'/semantic-checkpoint.json',JSON.stringify(checkpoint));
 const status=await run(target+'/scripts/lifecycle-status',['--root',target,'--checkpoint','semantic-checkpoint.json','--format','text']);
 assert.ok([0,1].includes(status.code));assert.ok(status.stdout.includes(presenter.describe(role).name),status.stdout+status.stderr);assert.ok(status.stdout.includes('未核验完整批准或执行授权'),status.stdout+status.stderr);
 writeFileSync(out+'/'+name+'-status.txt',status.stdout);
 if(name==='spec'){
  const query=await run(target+'/scripts/query-lifecycle-context',['--stage','stage.plan','--work-unit','work-unit.stage-decision']);assert.equal(query.code,0,query.stderr);
  const result=JSON.parse(query.stdout);assert.equal(result.presentation.names['check.stage-decision-package-approved'].name,'方案决策包评审');assert.equal(result.presentation.execution_allowed,false);
 }
 results.push({profile:name,status:'passed',root:target,sourceState:'working-tree',publication:'not-performed'});console.log(name+': generated semantic presentation passed');
}
writeFileSync(out+'/report.json',JSON.stringify(results,null,2)+'\n');
