import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {compileTaskExecution,resolveVerificationSource,verificationSourceIdentities} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
import {assertRequiredFiles,planTemplateVerification} from '../scripts/lib/template-verification.mjs';
import {verificationPatternMatches} from '../.template-source/scripts/lib/verification-gates.mjs';
import {verificationInputDigest} from '../scripts/lib/verification-report.mjs';

const fixture=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-script-retirement-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const put=(root,ref)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'console.log("mapped scenario");\n');return file;};

test('第六批测试辅助库退役旧位置，历史来源和语法执行绑定真实替代文件',t=>{
  const root=fixture(t),pairs=[['scripts/lib/git-submodule-fixtures.mjs','tests/helpers/git-submodule-fixtures.mjs'],['scripts/lib/scenario-checks.mjs','tests/helpers/scenario-checks.mjs']];
  for(const [old,current]of pairs){
    assert.equal(resolveVerificationSource(old),current);
    assert.ok(verificationSourceIdentities(current).includes(old));
    for(const profile of ['fast','candidate','release']){
      const before=planTemplateVerification({profile,changedFiles:[old]}),after=planTemplateVerification({profile,changedFiles:[current]});
      assert.deepEqual([...after.groups].sort(),[...before.groups].sort());
      assert.deepEqual(after.commands.map(row=>row.id),before.commands.map(row=>row.id));
    }
    assert.throws(()=>assertRequiredFiles({required_files:[old]},root),/RETIRED_SCRIPT_TARGET_MISSING/);
    const file=put(root,current);
    assertRequiredFiles({required_files:[old]},root);
    const execution=compileTaskExecution({command:`node --check ${old}`},{root});
    assert.deepEqual(execution.args,['--check',file]);
    assert.equal(spawnSync(execution.file,execution.args,{cwd:root}).status,0);
    fs.unlinkSync(file);fs.symlinkSync(put(fixture(t),'outside.mjs'),file);
    assert.throws(()=>compileTaskExecution({command:`node --check ${old}`},{root}),/RETIRED_SCRIPT_TARGET_INVALID/);
  }
});

test('旧CLI核心检查保留冻结身份，缺失、篡改和链接目标不能执行',t=>{
  const root=fixture(t),source='.template-source/cli-core/tests/*.test.mjs',target='tests/cli-core-retirement.test.mjs',file=put(root,target);
  const task={id:'check.371da192d6338e6d',task_id:'legacy.012',command:`node --test ${source}`},before=structuredClone(task);
  const execution=compileTaskExecution(task,{root});
  assert.deepEqual(task,before);assert.equal(execution.requested_command,task.command);
  assert.equal(execution.file,process.execPath);assert.equal(execution.cwd,root);
  assert.deepEqual(execution.args,['--test','--test-concurrency=1',file]);
  assert.equal(resolveVerificationSource(source),target);assertRequiredFiles({required_files:[source]},root);
  for(const altered of [{...task,id:'check.other'},{...task,task_id:'legacy.999'},{...task,task_id:undefined},{...task,command:'true'},{...task,command:`${task.command} --test-concurrency=2`},{id:'check.other',task_id:'legacy.999',command:`node --test --test-concurrency=2 ${source}`},{id:'check.other',task_id:'legacy.999',command:`node --test "${source}"`}]) {
    assert.throws(()=>compileTaskExecution(altered,{root}),/RETIRED_CHECK_REQUEST_MISMATCH/);
  }
  const current=compileTaskExecution({id:task.id,command:`node --test ${target}`},{root});
  assert.deepEqual(current.args,['--test','--test-concurrency=1',target]);
  fs.unlinkSync(file);assert.throws(()=>compileTaskExecution(task,{root}),/RETIRED_SCRIPT_TARGET_MISSING/);
  const outside=put(fixture(t),'outside.mjs');fs.symlinkSync(outside,file);
  assert.throws(()=>compileTaskExecution(task,{root}),/RETIRED_SCRIPT_TARGET_INVALID/);
});

test('固定迁移映射保持历史请求和检查身份，执行当前场景真实来源',t=>{
  const root=fixture(t),ref='tests/scenarios/verify-context-contract-scenarios.mjs',file=put(root,ref);
  for(const command of ['scripts/verify-context-contract-scenarios','node scripts/verify-context-contract-scenarios']){
    const task={id:'check.context',task_id:'legacy.context',command};
    const before=structuredClone(task),execution=compileTaskExecution(task,{root});
    assert.deepEqual(task,before);
    assert.equal(execution.requested_command,command);assert.equal(execution.file,process.execPath);
    assert.deepEqual(execution.args,[file]);assert.equal(execution.cwd,root);assert.deepEqual(execution.environment,{});
    assert.equal(resolveVerificationSource('scripts/verify-context-contract-scenarios'),ref);
  }
});

test('旧新task-package场景映射到同一真实case，旧Node实现映射公开入口',t=>{
  const root=fixture(t),scenario='tests/scenarios/verify-digital-human-task-package-scenarios.mjs';put(root,scenario);
  const old=compileTaskExecution({command:'scripts/verify-subagent-task-package-scenarios'},{root});
  const canonical=compileTaskExecution({command:'scripts/verify-digital-human-task-package-scenarios'},{root});
  assert.deepEqual(old.args,canonical.args);
  for(const [ref,target]of [['scripts/node-verify-lifecycle-registry.mjs','scripts/verify-lifecycle-registry'],['scripts/node-generate-lifecycle-artifacts.mjs','scripts/generate-lifecycle-artifacts']]){
    put(root,target);const execution=compileTaskExecution({command:`node ${ref} --check`},{root});
    assert.deepEqual(execution.args,[path.join(root,target),'--check']);assert.equal(resolveVerificationSource(ref),target);
  }
});

test('未知迁移、缺失真实目标和链接逃逸不能回落到已退役命令',t=>{
  const root=fixture(t);
  assert.throws(()=>compileTaskExecution({command:'scripts/verify-unregistered-scenarios'},{root}),/RETIRED_SCRIPT_MAPPING_MISSING/);
  assert.throws(()=>compileTaskExecution({command:'scripts/verify-context-contract-scenarios'},{root}),/RETIRED_SCRIPT_TARGET_MISSING/);
  const outside=fixture(t),file=put(outside,'scenario.mjs');fs.mkdirSync(path.join(root,'tests/scenarios'),{recursive:true});fs.symlinkSync(file,path.join(root,'tests/scenarios/verify-context-contract-scenarios.mjs'));
  assert.throws(()=>compileTaskExecution({command:'scripts/verify-context-contract-scenarios'},{root}),/RETIRED_SCRIPT_TARGET_INVALID/);
});

test('冻结legacy清单和覆盖身份不因入口迁移被改写',()=>{
  const ref=new URL('../.template-source/process/template-verification-legacy.json',import.meta.url),manifest=JSON.parse(fs.readFileSync(ref));
  const {coverage_digest,...body}=manifest;
  assert.equal(createHash('sha256').update(JSON.stringify(body)).digest('hex'),coverage_digest);
  assert.equal(coverage_digest,'3aa58425b03fda2291ebc78eea62381c602cd4592d4c4db87f197f82da9705f4');
  const rows=manifest.commands.filter(row=>/scripts\/verify-[^\s]*-scenarios/.test(row.run));
  assert.ok(rows.length>0);assert.ok(rows.every(row=>row.id&&row.task_id));
});

test('历史required和syntax来源独立映射，缺失源仍阻断',t=>{
  const root=fixture(t),old='scripts/verify-context-contract-scenarios',current=resolveVerificationSource(old);
  const plan={required_files:[old]};
  assert.throws(()=>assertRequiredFiles(plan,root),/RETIRED_SCRIPT_TARGET_MISSING/);
  put(root,current);assertRequiredFiles(plan,root);
  const command=`node --check '${old}'`,execution=compileTaskExecution({command},{root});
  assert.equal(execution.requested_command,command);assert.deepEqual(execution.args,['--check',path.join(root,current)]);
  assert.deepEqual(plan.required_files,[old]);
});

test('Python场景保留原运行时语义，syntax使用AST且不生成缓存',t=>{
  const root=fixture(t),ref='scripts/verify-scaffold-generator-scenarios',target=resolveVerificationSource(ref),file=put(root,target);
  fs.writeFileSync(file,'print("Python current case")\n');
  const execution=compileTaskExecution({command:ref},{root});
  assert.ok(path.isAbsolute(execution.file));assert.match(path.basename(execution.file),/^python3/);
  assert.deepEqual(execution.args,[file]);assert.equal(execution.requested_command,ref);
  const result=spawnSync(execution.file,execution.args,{cwd:execution.cwd,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Python current case/);
  const syntax=compileTaskExecution({command:`node --check ${ref}`},{root});
  assert.equal(spawnSync(syntax.file,syntax.args,{cwd:root}).status,0);assert.equal(fs.existsSync(path.join(root,'tests/scenarios/__pycache__')),false);
  fs.writeFileSync(file,'def invalid(:\n');assert.notEqual(spawnSync(syntax.file,syntax.args,{cwd:root}).status,0);
});

test('当前输入摘要同时观察固定mapping来源和迁移后的真实case字节',t=>{
  const root=fixture(t);
  for(const args of [['init','-q'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','fixture']])assert.equal(spawnSync('git',args,{cwd:root}).status,0);
  const source=put(root,'.template-source/scripts/lib/verification-execution-plan.mjs'),target=put(root,resolveVerificationSource('scripts/verify-context-contract-scenarios'));
  const before=verificationInputDigest(root);
  fs.appendFileSync(source,'// changed fixed mapping policy\n');const policyChanged=verificationInputDigest(root);assert.notEqual(policyChanged,before);
  fs.appendFileSync(target,'// changed actual scenario\n');assert.notEqual(verificationInputDigest(root),policyChanged);
});

test('全部迁移场景在fast/candidate/release严格保留原影响组和检查身份',()=>{
  const scenarios=fs.readdirSync(new URL('./scenarios/',import.meta.url)).filter(name=>/^verify-.+-scenarios\.(?:mjs|py)$/.test(name));
  assert.equal(scenarios.length,40);
  const mappings=scenarios.map(name=>[`scripts/${name.replace(/\.(?:mjs|py)$/,'')}`,`tests/scenarios/${name}`]);
  mappings.push(['scripts/verify-subagent-task-package-scenarios',resolveVerificationSource('scripts/verify-subagent-task-package-scenarios')]);
  const identities=checks=>(checks||[]).map(check=>`${check.task_id||''}:${check.id}`).sort();
  for(const [source,target]of mappings)for(const profile of ['fast','candidate','release']){
    const old=planTemplateVerification({profile,changedFiles:[source]}),current=planTemplateVerification({profile,changedFiles:[target]}),label=`${profile}: ${source}`;
    assert.deepEqual([...current.groups].sort(),[...old.groups].sort(),`${label} must preserve exact impact groups`);
    assert.deepEqual(identities(current.commands),identities(old.commands),`${label} must preserve selected checks`);
    assert.deepEqual(identities(current.shadow_commands),identities(old.shadow_commands),`${label} must preserve Gate impact checks before fallback`);
    assert.deepEqual(current.changed_files,[target]);assert.equal(verificationPatternMatches(target,source),true);assert.equal(current.effective_profile,old.effective_profile);
  }
});

test('迁移场景只按历史身份匹配，现役入口及新增回归保留实际路径规则',()=>{
  const scenario='tests/scenarios/verify-context-contract-scenarios.mjs';
  assert.deepEqual(verificationSourceIdentities(scenario),['scripts/verify-context-contract-scenarios']);
  assert.equal(verificationPatternMatches(scenario,'tests/**'),false);
  for(const ref of ['scripts/verify-lifecycle-registry','scripts/generate-lifecycle-artifacts','scripts/verify-digital-human-task-package','tests/cli-retirement.test.mjs','tests/verification-script-retirement.test.mjs'])assert.ok(verificationSourceIdentities(ref).includes(ref),`${ref} retains current source identity`);
  assert.equal(verificationPatternMatches('tests/verification-script-retirement.test.mjs','tests/**'),true);
});

test('第三批兼容壳固定指向核心库或canonical原型入口，保留历史请求',t=>{
  const root=fixture(t);
  const rows=[
    ['scripts/implementation-path-policy','scripts/lib/implementation-path-policy.mjs'],
    ['scripts/repository-scope-policy','scripts/lib/repository-scope-policy.mjs'],
    ['scripts/verify-prototype-design','.agents/skills/yss-prototype-stage/scripts/verify-prototype-design.mjs'],
  ];
  for(const [old,current]of rows){
    assert.equal(resolveVerificationSource(old),current);
    assert.throws(()=>assertRequiredFiles({required_files:[old]},root),/RETIRED_SCRIPT_TARGET_MISSING/);
    const target=put(root,current);
    assertRequiredFiles({required_files:[old]},root);
    for(const command of [old,`node ${old}`,`node --check ${old}`]){
      const task={id:'check.retired-entry',task_id:'historical.retired-entry',command};
      const before=structuredClone(task),execution=compileTaskExecution(task,{root});
      assert.deepEqual(task,before);assert.equal(execution.requested_command,command);
      assert.equal(execution.cwd,root);assert.equal(execution.file,process.execPath);
      assert.deepEqual(execution.args,command.includes('--check')?['--check',target]:[target]);
    }
    fs.unlinkSync(target);const outside=put(fixture(t),'outside.mjs');fs.symlinkSync(outside,target);
    assert.throws(()=>compileTaskExecution({command:old},{root}),/RETIRED_SCRIPT_TARGET_INVALID/);
  }
});

test('第三批分发保留替代核心库并且当前阶段直接安装新路径',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const read=ref=>JSON.parse(fs.readFileSync(path.join(root,ref),'utf8'));
  for(const ref of ['submodules/yss-harness-design-agent/.template-source/distribution/bundle-profile.json','submodules/yss-cli/internal/bundle/rules/design.json']){
    const policy=read(ref);
    for(const name of ['implementation-path-policy','repository-scope-policy']){
      assert.ok(!policy.manifest.excludePaths.includes(`scripts/lib/${name}.mjs`),`${ref} must retain the replacement library`);
      assert.ok(!policy.manifest.excludePaths.includes(`scripts/${name}`),`${ref} must not require the retired shell`);
    }
  }
  const manifest=fs.readFileSync(path.join(root,'submodules/yss-harness-design-agent/.template-spec/process/instance-distribution-manifest.yaml'),'utf8');
  for(const name of ['implementation-path-policy','repository-scope-policy']) assert.ok(!manifest.includes(`- scripts/lib/${name}.mjs`),'Design instance manifest must retain replacement libraries');
  for(const ref of ['.template-source/distribution/bundle-profile.json','submodules/yss-cli/internal/bundle/rules/spec.json']){
    const policy=read(ref);
    assert.ok(policy.stages['stage.system-data-engineering'].scripts.includes('scripts/lib/repository-scope-policy.mjs'));
    assert.ok(policy.stages['stage.vertical-slice-implementation'].scripts.includes('scripts/lib/implementation-path-policy.mjs'));
  }
});


test('第四批design-md只允许三个固定旧来源合流，执行与必需文件绑定canonical',t=>{
  const root=fixture(t),target='.agents/skills/yss-design-system/scripts/design-md.mjs';
  const file=put(root,target);
  const aliases=['scripts/design-md','scripts/lib/design-md.mjs','.template-source/tooling/node/scripts/design-md.mjs'];
  for(const ref of aliases){
    assert.equal(resolveVerificationSource(ref),target);
    assert.ok(verificationSourceIdentities(target).includes(ref));
    for(const command of [`node ${ref} drift`,`node --check ${ref}`,...(ref==='scripts/design-md'?[`${ref} drift`]:[])]){
      const task={id:'check.design',task_id:'legacy.design',command},before=structuredClone(task);
      const execution=compileTaskExecution(task,{root});assert.deepEqual(task,before);
      assert.equal(execution.requested_command,command);assert.equal(execution.cwd,root);
      assert.deepEqual(execution.args,command.includes('--check')?['--check',file]:[file,'drift']);
    }
    assertRequiredFiles({required_files:[ref]},root);
  }
  fs.unlinkSync(file);
  for(const ref of aliases){
    assert.throws(()=>assertRequiredFiles({required_files:[ref]},root),/RETIRED_SCRIPT_TARGET_MISSING/);
    assert.throws(()=>compileTaskExecution({command:`node ${ref} drift`},{root}),/RETIRED_SCRIPT_TARGET_MISSING/);
  }
});


test('第五批维护工具与库内测试保留历史命令，迁移失败必须拒绝',t=>{
  const root=fixture(t),pairs=[['scripts/sync-harness-upgrade','.template-source/scripts/sync-harness-upgrade.mjs'],['scripts/lib/api-contract-decision.test.mjs','tests/api-contract-decision.test.mjs'],['scripts/lib/legacy-backend-scaffold-audit.test.mjs','tests/legacy-backend-scaffold-audit.test.mjs']];
  for(const [old,current]of pairs){
    assert.equal(resolveVerificationSource(old),current);
    const command=old.endsWith('.test.mjs')?`node --test ${old}`:`${old} --check`;
    assert.throws(()=>compileTaskExecution({command},{root}),/RETIRED_SCRIPT_TARGET_MISSING/);
    const file=put(root,current),before={id:'check.fixed',task_id:'legacy.fixed',command};
    const execution=compileTaskExecution(before,{root});
    assert.equal(execution.requested_command,command);assert.equal(execution.cwd,root);assert.ok(execution.args.includes(file));assert.equal(before.command,command);
    assert.ok(verificationSourceIdentities(current).includes(old));assertRequiredFiles({required_files:[old]},root);
    const syntax=compileTaskExecution({command:`node --check ${old}`},{root});assert.deepEqual(syntax.args,['--check',file]);
    fs.unlinkSync(file);assert.throws(()=>assertRequiredFiles({required_files:[old]},root),/RETIRED_SCRIPT_TARGET_MISSING/);
  }
});
