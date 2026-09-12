import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {syncCore,syncTemplate,verifyCore} from '../build.mjs';
import {loadBundle} from '../bundle.mjs';
const put=(root,ref,bytes)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),bytes);};
test('战略 YAML 清单投影、固定来源与 WORKTREE 仅在临时副本构建',t=>{
 const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'harness-build-')));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const source=path.join(tmp,'source'),pkg=path.join(tmp,'package');
 fs.mkdirSync(source);put(pkg,'package.json',JSON.stringify({name:'create-yss-harness-design',version:'0.6.0'}));
 fs.cpSync(path.resolve(import.meta.dirname,'..'),path.join(source,'.template-source/cli-core'),{recursive:true});
 for(const name of ['README.md','AGENTS.md','CONTEXT.md','DESIGN.md'])put(source,name,name+'\n');
 put(source,'yss-project.yaml','schema_version: 1\nrepository_mode: template-source\n');
 put(source,'docs/process/harness-profile.yaml','schema_version: 2\nprofile_id: harness.business-ddd-strategy-handoff\n');
 put(source,'docs/user-guide/retired.md','retired handbook\n');
 put(source,'docs/user-guide/current.md','current handbook v1\n');
 put(source,'docs/process/instance-distribution-manifest.yaml',`schema_version: 1
profile_id: harness.business-ddd-strategy-handoff
cli_package: create-yss-harness-design
template_source: github:iloveZzz/yss-harness-design-agent
allow_root_entries: [docs]
allow_root_files: [README.md, AGENTS.md, CONTEXT.md, DESIGN.md, yss-project.yaml]
exclude_root_entries: [.git, .template-source]
render_paths: [README.md, AGENTS.md, yss-project.yaml]
`);
 const git=(...args)=>{const r=spawnSync('git',['-C',source,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','--initial-branch=main');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','fixture');
 const ref=git('rev-parse','HEAD');syncCore(source,ref,pkg);syncTemplate(source,ref,pkg);verifyCore(pkg);loadBundle(pkg);
 const before=fs.readFileSync(path.join(pkg,'template.snapshot.json'));
 put(source,'DESIGN.md','worktree changes\n');syncTemplate(source,ref,pkg,true);assert.deepEqual(fs.readFileSync(path.join(pkg,'template.snapshot.json')),before);
 fs.rmSync(path.join(source,'docs/user-guide/retired.md'));
 put(source,'docs/user-guide/current.md','current handbook v2\n');
 syncTemplate(source,'WORKTREE',pkg);const worktreeBundle=loadBundle(pkg);assert.equal(worktreeBundle.snapshot.sourceState,'working-tree');
 assert.equal(worktreeBundle.retiredFiles['docs/user-guide/retired.md'].digest.length,64);
 assert.equal(worktreeBundle.transitionBaselines['docs/user-guide/current.md'].digest.length,64);
 assert.throws(()=>syncTemplate(source,ref,pkg,true),/漂移/);
});
