import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const implementation=process.argv[2],kind=process.argv[3];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-generator-perf-')),template=path.join(root,'template'),output=path.join(root,'output');
process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
fs.mkdirSync(template);fs.mkdirSync(path.join(template,'src'));
fs.writeFileSync(path.join(template,'package.json'),JSON.stringify({name:'__APP_NAME__'}));
fs.writeFileSync(path.join(template,'pnpm-lock.yaml'),"lockfileVersion: '9.0'\n");
for(let n=0;n<1000;n++)fs.writeFileSync(path.join(template,'src',n+'.txt'),'__APP_NAME__ / __BASE_ROUTE__\n');
for(const args of [['init','-q'],['config','user.name','Performance fixture'],['config','user.email','fixture@example.invalid'],['remote','add','origin',template],['add','.'],['-c','core.hooksPath=/dev/null','commit','-qm','fixture']]) {const r=spawnSync('git',args,{cwd:template,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:template,encoding:'utf8'}).stdout.trim();
if(kind==='cached'){fs.mkdirSync(path.join(template,'node_modules'));for(let n=0;n<5000;n++)fs.writeFileSync(path.join(template,'node_modules',n+'.txt'),'x'.repeat(2048));}
const contract = {
  schema_version: 4, kind: "project-scaffold-contract", contract_id: "frontend.demo.v1", contract_version: "1", status: "approved", persisted_ref: "docs/.scratch/demo/scaffold-contract.json", current_version: true,
  delivery_role: "frontend", scaffold_kind: "frontend-yss-vue3", generator_skill: "yss-frontend-scaffold-generator", implementation_repository: output, target_output_dir: output, repository_scope: "external-repository", init_git: false,
  frontend: { app_name: "demo-app", microapp_name: "demo", base_route: "/demo", package_manager: "pnpm", template: { repository: template, commit }, openapi_impact: "not-applicable", openapi_not_applicable_reason: "static-only" },
  allowed_write_paths: [output], expected_evidence_files: [".yss/scaffold-generation.json"], verification_commands: ["pnpm install --frozen-lockfile", "pnpm lint", "pnpm type-check", "pnpm build"], approval: { approval_ref: "decision://frontend", approver: "user" }, generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
};

const {generate}=await import(pathToFileURL(path.join(implementation,'.agents/skills/yss-frontend-scaffold-generator/scripts/generate_scaffold.mjs')));
const rows=[];
for(let sample=0;sample<5;sample++){
 const target=path.join(root,'output-'+sample);contract.implementation_repository=target;contract.target_output_dir=target;contract.allowed_write_paths=[target];
 const file=path.join(root,'contract.json');fs.writeFileSync(file,JSON.stringify(contract));
 const start=performance.now();const manifest=generate({contractFile:file,templateCheckout:template,outputDir:target});const duration_ms=performance.now()-start;
 assert.equal(JSON.parse(fs.readFileSync(path.join(target,'package.json'))).name,'demo-app');
 rows.push({sample,duration_ms,generated_files:manifest.generated_files.length,copied_untracked_cache:fs.existsSync(path.join(target,'node_modules')),untracked_bytes:kind==='cached'?5000*2048:0});
 fs.rmSync(target,{recursive:true,force:true});
}
console.log(JSON.stringify({implementation,kind,fixture_tracked_files:1002,samples:rows}));
