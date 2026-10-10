import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseDocument} from '../../../../scripts/vendor/yaml.mjs';
import {readProgressionTarget, assertProgressionEntry} from '../../../../scripts/lib/lifecycle-progression.mjs';
import {lifecycleStatus} from '../../../../scripts/lib/lifecycle-status.mjs';
import {ROOT} from '../../../../scripts/lib/lifecycle-registry.mjs';
import {authorizeBackendDelivery} from '../../../../scripts/lib/lifecycle-execution-scope.mjs';
import {assertCheckpointUserDecisions} from '../../../../scripts/lib/approval-record.mjs';
import {enforceFrontendDelivery} from '../../../../scripts/lib/frontend-delivery-boundary.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-progression-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (ref, value) => {fs.mkdirSync(path.dirname(path.join(root, ref)), {recursive: true}); fs.writeFileSync(path.join(root, ref), value);};
  write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  write('.template-spec/agents/issue-tracker.md', '---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
  write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml', 'schema_version: 1\nprogression_target:\n  schema_version: 1\n  required_capabilities: [lifecycle-target-v1]\n  config_file: progression-target.json\n  writer_profiles: [spec]\n  default_target: business-accepted\n  completion_policy:\n    spec-approved:\n      public_name: Spec批准\n      required_gates: [gate.spec-baseline-approved]\n      required_checks: [business-tickets-draft]\n');
  const checkpointRef = '.work/package-one/checkpoint.yaml';
  write(checkpointRef, 'schema_version: 1\nrepository_mode: project-instance\nfeature_id: feature-one\nstatus: completed\ngates:\n  gate.spec-baseline-approved:\n    status: approved\n');
  write('.work/package-one/map.md', `---\ncheckpoint_ref: ${checkpointRef}\n---\n# Feature\n`);
  const config = {schema_version: 1, kind: 'lifecycle-progression-target', feature_id: 'feature-one', checkpoint_ref: checkpointRef, target: 'spec-approved', intent_source: 'user-request', consumers: []};
  return {root, write, checkpointRef, config, configRef: '.work/package-one/progression-target.json'};
}

function nativeProjection(f, changes = {}) {
  const intent = readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef, includeDefault: true});
  const projection = {...intent, policy: undefined, status: 'pending', read_only: true, execution_authorization: 'not-evaluated', inputs_current: true, ...changes};
  const binary = path.join(f.root, 'fake-yss');
  f.write('fake-yss', `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(JSON.stringify({outputVersion: 1, protocolVersion: 1, command: 'lifecycle', status: 'ok', code: 'OK', result: {action: 'target', progression: projection}}))});\n`);
  fs.chmodSync(binary, 0o755);
  return {YSS_NATIVE_BINARY: binary, PATH: ''};
}

async function specialistTaskFixture(t, profile) {
  const f = fixture(t), source = path.join(ROOT, `submodules/yss-harness-${profile}-agent`);
  fs.cpSync(source, f.root, {recursive: true, filter: file => !path.relative(source, file).split(path.sep).some(part => ['.git', '.codegraph', 'node_modules'].includes(part))});
  const profileId = profile === 'design' ? 'harness.business-ddd-strategy-handoff' : `harness.${profile}-delivery`, hex = '0'.repeat(64);
  f.write('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  f.write('.yss.json', JSON.stringify({schemaVersion: 1, protocolVersion: 1, profile, profileId, templateSourceState: 'committed', templateCommit: 'a'.repeat(40), snapshotHash: hex, manifestHash: hex, variables: {}, distribution: {}, managedFiles: {}, baselineDigest: createHash('sha256').update('{}').digest('hex')}));
  f.write('.template-spec/agents/issue-tracker.md', '---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
  f.write(f.checkpointRef, JSON.stringify({schema_version: 1, repository_mode: 'project-instance', profile_id: profileId, feature_id: 'feature.specialist', status: 'completed', next_work_unit: profile === 'design' ? 'work-unit.strategic-design-handoff' : 'work-unit.verification'}));
  f.write('.work/package-one/map.md', `---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
  // This transport fixture isolates task admission. Actual frontend receipt and
  // native terminal verification are covered by their separate integration fixtures.
  if (profile === 'frontend') f.write('scripts/verify-frontend-delivery', `process.stdout.write(${JSON.stringify(JSON.stringify({result: 'inputs-verified', ready_for_agent: false}))});\n`);
  const module = await import(path.join(f.root, 'scripts/lib/task-package.mjs'));
  const workUnit = profile === 'design' ? 'work-unit.plan-opportunity' : 'work-unit.harness-entry';
  const pkg = module.generateTaskPackageDefaults(profile === 'design' ? 'role.requirements-manager' : 'role.architecture-agent', {
    task_id: 'task.synthetic-specialist-reentry', work_unit_id: workUnit, actor_id: 'synthetic.drafter', runtime_id: 'runtime.skill-projection',
    checkpoint_ref: f.checkpointRef, stage_id: profile === 'design' ? 'stage.plan' : 'stage.harness-entry', execution_state: 'Drafter', workflow_status: 'active',
    contract: {kind: 'lifecycle-work-unit', contract_id: 'synthetic.reentry', contract_version: 1, status: 'issued', contract_ref: '.template-spec/process/lifecycle-registry.yaml', lifecycle_ref: '.template-spec/process/lifecycle-registry.yaml'},
    inputs: ['CONTEXT.md'], objective: '检查已完成功能的专职写任务准入', allowed_write_paths: ['.work/package-one/outputs/'], forbidden_actions: ['不得扩大职责'],
    expected_outputs: ['当前功能的有界草稿'], expected_evidence_files: ['CONTEXT.md'], verification_commands: ['synthetic-admission-check'], verification_results: [],
    downstream_consumers: ['synthetic.orchestrator'], convergence: {parent_work_unit: workUnit, convergence_ref: 'checkpoint:synthetic', conflict_escalation: '返回主控'},
    ...(profile === 'frontend' ? {slice_id: 'synthetic.slice', frontend_delivery: {acceptance_ref: 'synthetic.frontend-acceptance.json'}} : {}),
  });
  return {...f, module, pkg};
}

for (const profile of ['design', 'backend', 'frontend']) test(`specialist non-Slice ${profile} task admission stops reached/NA writes and retains readonly and legacy paths`, async t => {
  const f = await specialistTaskFixture(t, profile), before = fs.readFileSync(path.join(f.root, f.checkpointRef));
  const binaryBefore = process.env.YSS_NATIVE_BINARY, digestBefore = process.env.YSS_NATIVE_BINARY_SHA256;
  t.after(() => {
    if (binaryBefore === undefined) delete process.env.YSS_NATIVE_BINARY; else process.env.YSS_NATIVE_BINARY = binaryBefore;
    if (digestBefore === undefined) delete process.env.YSS_NATIVE_BINARY_SHA256; else process.env.YSS_NATIVE_BINARY_SHA256 = digestBefore;
  });
  const project = status => {
    process.env.YSS_NATIVE_BINARY = nativeProjection(f, {status}).YSS_NATIVE_BINARY;
    process.env.YSS_NATIVE_BINARY_SHA256 = createHash('sha256').update(fs.readFileSync(process.env.YSS_NATIVE_BINARY)).digest('hex');
  };
  project('pending');
  assert.doesNotThrow(() => f.module.validateTaskPackage(f.pkg));
  for (const status of ['reached', 'not-applicable']) {
    project(status);
    for (const execution_state of ['Drafter', 'Worker']) assert.throws(() => f.module.validateTaskPackage({...f.pkg, execution_state}), /profile-terminal.*已达到.*保留 next/);
    assert.doesNotThrow(() => f.module.validateTaskPackage({...f.pkg, execution_state: 'Reviewer', review_context: {implementation_actor_id: 'synthetic.implementer'}}));
    assert.deepEqual(fs.readFileSync(path.join(f.root, f.checkpointRef)), before);
    assert.equal(fs.existsSync(path.join(f.root, f.configRef)), false);
  }
  const intent = readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef, includeDefault: true});
  const policy = parseDocument(fs.readFileSync(path.join(f.root, intent.contract_ref), 'utf8')).toJS();
  delete policy.progression_target; f.write(intent.contract_ref, JSON.stringify(policy));
  assert.doesNotThrow(() => f.module.validateTaskPackage(f.pkg));
});

test('没有独立意图的旧实例保持原路线，读取不创建默认配置', t => {
  const f = fixture(t);
  assert.equal(readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}), null);
  assert.equal(fs.existsSync(path.join(f.root, f.configRef)), false);
});

test('独立意图按唯一map和同feature checkpoint绑定，改变终点不修改checkpoint', t => {
  const f = fixture(t), before = fs.readFileSync(path.join(f.root, f.checkpointRef));
  f.write(f.configRef, JSON.stringify(f.config));
  const result = readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef});
  assert.equal(result.config_ref, f.configRef);
  assert.equal(result.target, 'spec-approved');
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.checkpointRef)), before);
  f.write('.work/duplicate/map.md', `---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
  assert.throws(() => readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}), /multiple|多/);
});

test('活动map目录仅定位功能包，不把canonical feature ID当slug目录校验', t => {
  const f=fixture(t),directory='.work/feature.supplier',checkpointRef='intake-checkpoint.yaml';
  fs.renameSync(path.join(f.root,'.work/package-one'),path.join(f.root,directory));
  const checkpoint='schema_version: 1\nrepository_mode: project-instance\nfeature_id: feature.supplier\nartifacts:\n  artifact.spec:\n    ref: source/spec.md\n';
  f.write(checkpointRef,checkpoint);
  f.write(`${directory}/map.md`,`---\ncheckpoint_ref: ${checkpointRef}\n---\n`);
  const config={...f.config,feature_id:'feature.supplier',checkpoint_ref:checkpointRef};
  f.write(`${directory}/progression-target.json`,JSON.stringify(config));
  const before=fs.readFileSync(path.join(f.root,checkpointRef));
  for(const options of [{checkpointRef},{assetRef:'source/spec.md'}]) {
    const result=readProgressionTarget({root:f.root,...options,includeDefault:true});
    assert.equal(result.feature_id,'feature.supplier');
    assert.equal(result.checkpoint_ref,checkpointRef);
    assert.equal(result.config_ref,`${directory}/progression-target.json`);
  }
  fs.unlinkSync(path.join(f.root,directory,'progression-target.json'));
  const policyRef='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  f.write(policyRef,fs.readFileSync(path.join(f.root,policyRef),'utf8').replace('default_target: business-accepted','default_target: spec-approved'));
  const result=readProgressionTarget({root:f.root,checkpointRef,includeDefault:true});
  assert.equal(result.config_digest,null);
  assert.equal(result.feature_id,'feature.supplier');
  assert.equal(result.target,'spec-approved');
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),before);
  assert.equal(fs.existsSync(path.join(f.root,directory,'progression-target.json')),false);
});

test('活动map定位仍拒绝符号链接逃逸多重登记及未知政策', t => {
  for(const variant of ['directory-link','map-link','checkpoint-link','escape','duplicate','policy-version','capability']) {
    const f=fixture(t);f.write(f.configRef,JSON.stringify(f.config));
    if(variant==='directory-link')fs.symlinkSync(path.join(f.root,'.work/package-one'),path.join(f.root,'.work/linked-feature'),'dir');
    if(variant==='map-link') {
      fs.renameSync(path.join(f.root,'.work/package-one/map.md'),path.join(f.root,'registered-map.md'));
      fs.symlinkSync(path.join(f.root,'registered-map.md'),path.join(f.root,'.work/package-one/map.md'));
    }
    if(variant==='checkpoint-link') {
      fs.renameSync(path.join(f.root,f.checkpointRef),path.join(f.root,'checkpoint.yaml'));
      fs.symlinkSync(path.join(f.root,'checkpoint.yaml'),path.join(f.root,f.checkpointRef));
    }
    if(variant==='escape')f.write('.work/package-one/map.md','---\ncheckpoint_ref: ../outside.yaml\n---\n');
    if(variant==='duplicate')f.write('.work/feature.supplier/map.md',`---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
    if(['policy-version','capability'].includes(variant)) {
      const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',source=fs.readFileSync(path.join(f.root,ref),'utf8');
      f.write(ref,variant==='policy-version'?source.replace('  schema_version: 1','  schema_version: 2'):source.replace('lifecycle-target-v1','unknown-target-v9'));
    }
    assert.throws(()=>readProgressionTarget({root:f.root,checkpointRef:f.checkpointRef,includeDefault:true}),/符号|symbolic|治理引用|多重|CAPABILITY/);
  }
});

test('封存交付包的深层map不会成为活动功能登记', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify(f.config));
  f.write('.work/package-one/delivery/payload/map.md', `---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
  f.write('.work/archive/payload/map.md', '---\ncheckpoint_ref: missing-source-checkpoint.yaml\n---\n');
  assert.equal(readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}).config_ref, f.configRef);
});

test('目标不能携带阶段或完成自述，消费者必须显式同feature checkpoint', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify({...f.config, completed: true}));
  assert.throws(() => readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}), /schema|字段/);
  f.write(f.configRef, JSON.stringify({...f.config, consumers: [{profile: 'backend', root: f.root}]}));
  assert.throws(() => readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}), /consumer|消费者/);
  f.write(f.configRef, JSON.stringify({...f.config, consumers: [{profile: 'backend', root: f.root, checkpoint_ref: 'one.yaml'}, {profile: 'backend', root: path.dirname(f.root), checkpoint_ref: 'two.yaml'}]}));
  assert.throws(() => readProgressionTarget({root: f.root, checkpointRef: f.checkpointRef}), /Profile.*重复/);
});

test('记录为approved或completed不能放行目标准入，缺原生能力须停止写入', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify(f.config));
  assert.throws(() => assertProgressionEntry('work-unit.technical-analysis', {root: f.root, checkpointRef: f.checkpointRef, env: {PATH: ''}}), /progression.*blocked|TARGET|CAPABILITY/);
});

test('当前实际核验到达目标时阻止下游派发，并保留记录next及批准原bytes', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify(f.config));
  const before = fs.readFileSync(path.join(f.root, f.checkpointRef));
  const env = nativeProjection(f, {status: 'reached'});
  assert.throws(() => assertProgressionEntry('work-unit.technical-analysis', {root: f.root, checkpointRef: f.checkpointRef, env}), /已达到.*保留 next/);
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.checkpointRef)), before);
});

test('尚未到达只通过目标限制，不授予其他实施准入', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify(f.config));
  const result = assertProgressionEntry('work-unit.spec-synthesis', {root: f.root, checkpointRef: f.checkpointRef, env: nativeProjection(f)});
  assert.equal(result.status, 'pending');
  assert.equal(result.execution_authorization, 'not-evaluated');
});

test('错根或旧输入的原生成功响应不能被复用', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify(f.config));
  assert.throws(() => assertProgressionEntry('work-unit.spec-synthesis', {root: f.root, checkpointRef: f.checkpointRef, env: nativeProjection(f, {root: '/different-root'})}), /绑定/);
  assert.throws(() => assertProgressionEntry('work-unit.spec-synthesis', {root: f.root, checkpointRef: f.checkpointRef, env: nativeProjection(f, {config_digest: `sha256:${'0'.repeat(64)}`})}), /摘要不一致/);
  assert.throws(() => assertProgressionEntry('work-unit.spec-synthesis', {root: f.root, checkpointRef: f.checkpointRef, env: nativeProjection(f, {inputs_current: false})}), /当前输入/);
});

test('专职身份不能通过手工目标配置扩大成综合Spec后端交付', t => {
  const f = fixture(t);
  f.write(f.configRef, JSON.stringify({...f.config, consumers: [{profile: 'backend', root: path.dirname(f.root), checkpoint_ref: 'checkpoint.yaml'}]}));
  const hex = '0'.repeat(64);
  f.write('.yss.json', JSON.stringify({schemaVersion: 1, protocolVersion: 1, profile: 'frontend', profileId: 'harness.frontend-delivery', templateSourceState: 'committed', templateCommit: 'a'.repeat(40), snapshotHash: hex, manifestHash: hex, variables: {}, distribution: {}, managedFiles: {}, baselineDigest: createHash('sha256').update('{}').digest('hex')}));
  assert.throws(() => authorizeBackendDelivery({root: f.root, checkpointRef: f.checkpointRef}), /真实 native Spec/);
});

test('旧Backend合同本端交付绑定明确功能，未声明能力不能生成本地证据终点', t => {
  const f = fixture(t), hex = '0'.repeat(64);
  f.write('.yss.json', JSON.stringify({schemaVersion: 1, protocolVersion: 1, profile: 'backend', profileId: 'harness.backend-delivery', templateSourceState: 'committed', templateCommit: 'a'.repeat(40), snapshotHash: hex, manifestHash: hex, variables: {}, distribution: {}, managedFiles: {}, baselineDigest: createHash('sha256').update('{}').digest('hex')}));
  f.write('.template-spec/process/harness-profile.yaml', 'schema_version: 1\nprofile_id: harness.backend-delivery\n');
  f.write('.agents/skills/harness-orchestrator/references/orchestration-contract.yaml', 'schema_version: 1\nprogression_target:\n  schema_version: 1\n  required_capabilities: [lifecycle-target-v1]\n  config_file: progression-target.json\n  writer_profiles: []\n  default_target: profile-terminal\n  completion_policy:\n    profile-terminal:\n      required_gates: [gate.slice-contract-approved]\n      required_checks: [backend-delivery]\n');
  f.write('.work/another/checkpoint.yaml', 'feature_id: feature-two\n');
  f.write('.work/another/map.md', '---\ncheckpoint_ref: .work/another/checkpoint.yaml\n---\n');
  assert.deepEqual(authorizeBackendDelivery({root: f.root, checkpointRef: f.checkpointRef}), {mode: 'backend-profile', checkpoint_ref: f.checkpointRef, terminal_ref: '.work/package-one/backend-delivery.json'});
  assert.equal(fs.existsSync(path.join(f.root, f.configRef)), false);
  assert.throws(() => authorizeBackendDelivery({root: f.root}), /明确.*checkpoint/);
  assert.throws(() => authorizeBackendDelivery({root: f.root, checkpointRef: f.checkpointRef, deliveryMode: 'local-evidence'}), /当前后端合同未支持本地业务交付证据/);
  const checkpoint = fs.readFileSync(path.join(f.root, f.checkpointRef), 'utf8');
  f.write(f.checkpointRef, `${checkpoint}profile_id: harness.frontend-delivery\n`);
  assert.throws(() => authorizeBackendDelivery({root: f.root, checkpointRef: f.checkpointRef}), /checkpoint Profile/);
  f.write(f.checkpointRef, checkpoint);
  f.write('.work/duplicate/map.md', `---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
  assert.throws(() => authorizeBackendDelivery({root: f.root, checkpointRef: f.checkpointRef}), /多重登记/);
});

test('已登记Backend本端目标达到或不适用时停止同feature写入，保留next与checkpoint原bytes', t => {
  for (const status of ['reached', 'not-applicable']) {
    const f = fixture(t), hex = '0'.repeat(64);
    f.write('.yss.json', JSON.stringify({schemaVersion: 1, protocolVersion: 1, profile: 'backend', profileId: 'harness.backend-delivery', templateSourceState: 'committed', templateCommit: 'a'.repeat(40), snapshotHash: hex, manifestHash: hex, variables: {}, distribution: {}, managedFiles: {}, baselineDigest: createHash('sha256').update('{}').digest('hex')}));
    f.write('.template-spec/process/harness-profile.yaml', 'schema_version: 1\nprofile_id: harness.backend-delivery\n');
    const policyRef = '.agents/skills/harness-orchestrator/references/orchestration-contract.yaml';
    f.write(policyRef, 'schema_version: 1\nprogression_target:\n  schema_version: 1\n  required_capabilities: [lifecycle-target-v1]\n  config_file: progression-target.json\n  writer_profiles: []\n  default_target: profile-terminal\n  completion_policy:\n    profile-terminal:\n      required_gates: [gate.slice-contract-approved]\n      required_checks: [backend-delivery]\n');
    f.write(f.checkpointRef, `${fs.readFileSync(path.join(f.root, f.checkpointRef), 'utf8')}profile_id: harness.backend-delivery\nnext_work_unit: work-unit.verification\n`);
    const before = fs.readFileSync(path.join(f.root, f.checkpointRef));
    assert.throws(() => assertProgressionEntry('work-unit.slice-implementation', {root: f.root, checkpointRef: f.checkpointRef, env: nativeProjection(f, {status, reached: true})}), /profile-terminal.*已达到.*保留 next/);
    assert.deepEqual(fs.readFileSync(path.join(f.root, f.checkpointRef)), before);
    assert.equal(fs.existsSync(path.join(f.root, f.configRef)), false);
    fs.rmSync(path.join(f.root, '.work/package-one/map.md'));
    assert.equal(assertProgressionEntry('work-unit.slice-implementation', {root: f.root, checkpointRef: f.checkpointRef, env: {PATH: ''}}), null);
    f.write('.work/package-one/map.md', `---\ncheckpoint_ref: ${f.checkpointRef}\n---\n`);
    f.write(policyRef, 'schema_version: 1\n');
    assert.equal(assertProgressionEntry('work-unit.slice-implementation', {root: f.root, checkpointRef: f.checkpointRef, env: {PATH: ''}}), null);
  }
});

test('Spec条件战略交接门禁的注册不会把整体完成门禁降为战略交接', t => {
  const f = fixture(t);
  const checkpoint = {repository_mode: 'project-instance', status: 'completed', blockers: [], gates: {'gate.strategic-design-handoff-approved': {status: 'approved'}}};
  assert.throws(() => assertCheckpointUserDecisions(checkpoint, {root: f.root}), /当前交付或战略交接验收/);
  checkpoint.gates['gate.delivery-accepted'] = {status: 'approved'};
  assert.doesNotThrow(() => assertCheckpointUserDecisions(checkpoint, {root: f.root}));
});


test('当前无UI影响证据核验为不适用时正常停止，保留next和批准bytes', t => {
  const f=fixture(t);
  const policyRef='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  f.write(policyRef,fs.readFileSync(path.join(ROOT,policyRef)));
  for(const ref of ['.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/digital-human-roles.yaml']) f.write(ref,fs.readFileSync(path.join(ROOT,ref)));
  const checkpoint={schema_version:1,repository_mode:'project-instance',feature_id:f.config.feature_id,stage:'stage.product-design',status:'routing',blockers:[],gates:{},artifacts:{},next_work_unit:'work-unit.technical-analysis'};
  f.write(f.checkpointRef,JSON.stringify(checkpoint));
  f.config.target='product-design-completed'; f.write(f.configRef,JSON.stringify(f.config));
  const before=fs.readFileSync(path.join(f.root,f.checkpointRef)),env=nativeProjection(f,{status:'not-applicable',reached:true});
  assert.throws(()=>assertProgressionEntry('work-unit.technical-analysis',{root:f.root,checkpointRef:f.checkpointRef,env}),/已达到.*保留 next/);
  const status=lifecycleStatus({root:f.root,checkpointRef:f.checkpointRef,env});
  assert.equal(status.next_step.action_type,'stop');
  assert.match(status.next_action,/本次推进目标已达成/);
  assert.doesNotMatch(status.next_action,/尚不可验证|修复/);
  assert.equal(status.work_unit,checkpoint.next_work_unit);
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.checkpointRef)),before);
});

test('Spec本地终点不能消费其他Profile的当前checkpoint', t => {
  const f=fixture(t),hex='0'.repeat(64);
  f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
  f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.spec-template\n');
  f.write(f.configRef,JSON.stringify(f.config));
  const checkpoint=fs.readFileSync(path.join(f.root,f.checkpointRef),'utf8');
  f.write(f.checkpointRef,`${checkpoint}profile_id: harness.frontend-delivery\n`);
  assert.throws(()=>authorizeBackendDelivery({root:f.root,checkpointRef:f.checkpointRef,deliveryMode:'local-evidence'}),/checkpoint Profile.*Spec/);
});


test('已同步新政策的真实native Spec正式写入缺活动map绑定必须停止', t => {
  for(const variant of ['missing-map','foreign-map','missing-tracker','unregistered-asset']) {
    const f=fixture(t),hex='0'.repeat(64);
    f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
    if(variant==='missing-map')fs.rmSync(path.join(f.root,'.work/package-one/map.md'));
    if(variant==='foreign-map') {
      f.write('.work/other/checkpoint.yaml','feature_id: feature.other\n');
      f.write('.work/package-one/map.md','---\ncheckpoint_ref: .work/other/checkpoint.yaml\n---\n');
    }
    if(variant==='missing-tracker')fs.rmSync(path.join(f.root,'.template-spec/agents/issue-tracker.md'));
    const options=variant==='unregistered-asset'?{root:f.root,assetRef:'unregistered/slice.yaml',env:{PATH:''}}:{root:f.root,checkpointRef:f.checkpointRef,env:{PATH:''}};
    const before=fs.readFileSync(path.join(f.root,f.checkpointRef));
    assert.throws(()=>assertProgressionEntry('work-unit.slice-implementation',options),/活动.*map.*绑定|feature.*登记/);
    assert.deepEqual(fs.readFileSync(path.join(f.root,f.checkpointRef)),before);
    assert.equal(fs.existsSync(path.join(f.root,f.configRef)),false);
  }
});

test('未支持新政策的旧native实例和template-source不因缺map改变原准入', t => {
  const f=fixture(t),hex='0'.repeat(64);
  f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
  fs.rmSync(path.join(f.root,'.work/package-one/map.md'));
  const policy='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',current=fs.readFileSync(path.join(f.root,policy));
  f.write(policy,'schema_version: 1\n');
  assert.equal(assertProgressionEntry('work-unit.slice-implementation',{root:f.root,checkpointRef:f.checkpointRef,env:{PATH:''}}),null);
  f.write(policy,current);f.write('yss-project.yaml','schema_version: 1\nrepository_mode: template-source\n');
  assert.equal(assertProgressionEntry('work-unit.slice-implementation',{root:f.root,checkpointRef:f.checkpointRef,env:{PATH:''}}),null);
});

test('native Spec已声明非法目标政策不能按legacy跳过正式准入', async t => {
  const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const original=parseDocument(fs.readFileSync(path.join(ROOT,ref),'utf8')).toJS();
  for(const mapped of [true,false]) for(const [name,value] of [
    ['null',null],['false',false],['empty',{}],
    ['version',{...original.progression_target,schema_version:2}],
    ['unknown-capability',{...original.progression_target,required_capabilities:['unknown-target-v9']}],
    ['additional-unknown-capability',{...original.progression_target,required_capabilities:['lifecycle-target-v1','unknown-target-v9']}],
  ]) await t.test(`${name}/${mapped?'mapped':'missing-map'}`,t=>{
    const f=fixture(t),hex='0'.repeat(64);
    f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
    f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.spec-template\n');
    if(!mapped)fs.rmSync(path.join(f.root,'.work/package-one/map.md'));
    f.write(ref,JSON.stringify({...original,progression_target:value}));
    const before=fs.readFileSync(path.join(f.root,f.checkpointRef));
    if(mapped)assert.throws(()=>readProgressionTarget({root:f.root,checkpointRef:f.checkpointRef,includeDefault:true}),/CAPABILITY:/,name);
    assert.throws(()=>assertProgressionEntry('work-unit.slice-implementation',{root:f.root,checkpointRef:f.checkpointRef,env:{PATH:''}}),/CAPABILITY:/,`${name}/${mapped?'mapped':'missing-map'}`);
    assert.deepEqual(fs.readFileSync(path.join(f.root,f.checkpointRef)),before);
    assert.equal(fs.existsSync(path.join(f.root,f.configRef)),false);
  });
  for(const mapped of [true,false]) {
    const f=fixture(t),hex='0'.repeat(64);
    f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
    f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.spec-template\n');
    if(!mapped)fs.rmSync(path.join(f.root,'.work/package-one/map.md'));
    const {progression_target,...legacy}=original;f.write(ref,JSON.stringify(legacy));
    assert.equal(assertProgressionEntry('work-unit.slice-implementation',{root:f.root,checkpointRef:f.checkpointRef,env:{PATH:''}}),null);
  }
});


test('真实批准执行入口只读可核验，正式执行缺当前活动feature绑定仍拒绝', async t => {
  const {approvedFixture}=await import('../../../../scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs');
  const {createApprovedExecutionContext}=await import('../../../../scripts/lib/approved-execution-context.mjs');
  const f=approvedFixture('layered-mvc'),hex='0'.repeat(64);
  t.after(()=>f.cleanup());
  f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),'utf8'));
  assert.doesNotThrow(()=>createApprovedExecutionContext(f.binding,{root:f.root,contract:f.contract,readOnly:true}));
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root,contract:f.contract}),/正式 feature.*活动 map.*绑定/);
});

test('Slice 批准 checkpoint 与活动推进 checkpoint 分别核验，目标续推不改原批准', async t => {
  const {approvedFixture}=await import('../../../../scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs');
  const {createApprovedExecutionContext,createApprovedRecompilationContext,assertApprovedExecutionContext}=await import('../../../../scripts/lib/approved-execution-context.mjs');
  const f=approvedFixture('layered-mvc'),hex='0'.repeat(64),checkpointRef='.work/current/checkpoint.json';
  t.after(()=>f.cleanup());
  f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),'utf8'));
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
  f.write(checkpointRef,{...f.checkpoint,feature_id:'feature.current'});
  f.write('.work/current/map.md',`---\ncheckpoint_ref: ${checkpointRef}\n---\n`);
  const configRef='.work/current/progression-target.json',config={schema_version:1,kind:'lifecycle-progression-target',feature_id:'feature.current',checkpoint_ref:checkpointRef,target:'spec-approved',intent_source:'synthetic.transport-test',consumers:[]};
  f.write(configRef,config);
  const originalApproval=fs.readFileSync(path.join(f.root,f.binding.approval_ref)),originalCheckpoint=fs.readFileSync(path.join(f.root,checkpointRef));
  const binaryBefore=process.env.YSS_NATIVE_BINARY,digestBefore=process.env.YSS_NATIVE_BINARY_SHA256;
  t.after(()=>{if(binaryBefore===undefined)delete process.env.YSS_NATIVE_BINARY;else process.env.YSS_NATIVE_BINARY=binaryBefore;if(digestBefore===undefined)delete process.env.YSS_NATIVE_BINARY_SHA256;else process.env.YSS_NATIVE_BINARY_SHA256=digestBefore;});
  const project=status=>{process.env.YSS_NATIVE_BINARY=nativeProjection({...f,checkpointRef},{status}).YSS_NATIVE_BINARY;process.env.YSS_NATIVE_BINARY_SHA256=createHash('sha256').update(fs.readFileSync(process.env.YSS_NATIVE_BINARY)).digest('hex');};
  project('pending');
  const execution=createApprovedExecutionContext(f.binding,{root:f.root});
  assert.doesNotThrow(()=>createApprovedRecompilationContext(f.binding,{root:f.root}));
  assert.doesNotThrow(()=>assertApprovedExecutionContext(execution,{root:f.root}));
  project('reached');
  for(const create of [createApprovedExecutionContext,createApprovedRecompilationContext])assert.throws(()=>create(f.binding,{root:f.root}),/已达到.*保留 next/);
  assert.throws(()=>assertApprovedExecutionContext(execution,{root:f.root}),/已达到.*保留 next/);
  f.write(configRef,{...config,target:'business-accepted'});project('pending');
  assert.doesNotThrow(()=>assertApprovedExecutionContext(execution,{root:f.root}));
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.binding.approval_ref)),originalApproval);
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),originalCheckpoint);
  f.write('.work/duplicate/map.md',`---\ncheckpoint_ref: ${checkpointRef}\n---\n`);
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/多重登记/);
  fs.rmSync(path.join(f.root,'.work/duplicate'),{recursive:true});
  f.write(checkpointRef,{schema_version:1,repository_mode:'project-instance',feature_id:'feature.current',artifacts:{},gates:{}});
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/登记资产引用|活动 map.*绑定/);
  fs.writeFileSync(path.join(f.root,checkpointRef),originalCheckpoint);
  f.write(f.binding.approval_ref,{...f.checkpoint,gates:{}});
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/EXECUTION_APPROVAL_SCOPE/);
});


test('功能包外的当前Slice由checkpoint显式绑定定位，目录位置不能猜功能', t => {
  const f=fixture(t),outside='approved/compiled-slice.yaml';
  f.write(outside,'schema_version: 3\n'); f.write(f.configRef,JSON.stringify(f.config));
  const checkpoint=fs.readFileSync(path.join(f.root,f.checkpointRef),'utf8');
  for(const binding of [{artifacts:{'artifact.slice-implementation-contract':{ref:outside}}},{human_review:{implementation:{slice_contract_ref:outside}}}]) {
    f.write(f.checkpointRef,JSON.stringify({schema_version:1,repository_mode:'project-instance',feature_id:f.config.feature_id,...binding}));
    assert.equal(readProgressionTarget({root:f.root,assetRef:outside}).checkpoint_ref,f.checkpointRef);
    assert.equal(assertProgressionEntry('work-unit.slice-implementation',{root:f.root,assetRef:outside,env:nativeProjection(f)}).status,'pending');
  }
  f.write(f.checkpointRef,checkpoint);
  assert.throws(()=>readProgressionTarget({root:f.root,assetRef:'.work/package-one/unbound-slice.yaml'}),/显式 feature checkpoint|登记资产/);
});

function localFrontendTransport(t, changes = {}, mutate = '') {
  const f=fixture(t),hex='0'.repeat(64),specRef='.work/package-one/spec.md';
  f.root=fs.realpathSync(f.root);
  f.write('.yss.json',JSON.stringify({schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:hex,manifestHash:hex,variables:{},distribution:{},managedFiles:{},baselineDigest:createHash('sha256').update('{}').digest('hex')}));
  f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.spec-template\n');
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml')));
  f.write(f.checkpointRef,JSON.stringify({schema_version:1,repository_mode:'project-instance',feature_id:f.config.feature_id,spec_ref:specRef}));
  f.write(specRef,'# Transport fixture; semantic approval is verified by native integration tests.\n');
  const coverage={result:'inputs-verified',delivery_mode:'local-approved-assets',root:f.root,checkpoint_ref:f.checkpointRef,spec_ref:specRef,slice_contract_ref:null,slice_id:null,phase:'verification',inputs_current:true,ready_for_agent:false,...changes.coverage};
  const result={kind:'governance-semantic-verification',status:'passed',read_only:true,approval_created:false,execution_authorization:'not-evaluated',...changes.report,coverage};
  f.write('fake-yss',`#!${process.execPath}\nimport fs from 'node:fs';\n${mutate}\nprocess.stdout.write(${JSON.stringify(JSON.stringify({command:'contract',status:'ok',code:'OK',outputVersion:1,protocolVersion:1,result}))});\n`);
  fs.chmodSync(path.join(f.root,'fake-yss'),0o755);
  const oldBinary=process.env.YSS_NATIVE_BINARY,oldDigest=process.env.YSS_NATIVE_BINARY_SHA256;
  t.after(()=>{if(oldBinary===undefined)delete process.env.YSS_NATIVE_BINARY;else process.env.YSS_NATIVE_BINARY=oldBinary;if(oldDigest===undefined)delete process.env.YSS_NATIVE_BINARY_SHA256;else process.env.YSS_NATIVE_BINARY_SHA256=oldDigest;});
  process.env.YSS_NATIVE_BINARY=path.join(f.root,'fake-yss');
  process.env.YSS_NATIVE_BINARY_SHA256=createHash('sha256').update(fs.readFileSync(process.env.YSS_NATIVE_BINARY)).digest('hex');
  return {...f,specRef};
}

test('本地前端验证 transport 从当前登记Spec定位功能，不能跳为NA或授予实施',t=>{
  const f=localFrontendTransport(t),before=fs.readFileSync(path.join(f.root,f.checkpointRef));
  const result=enforceFrontendDelivery({kind:'verification',spec_ref:f.specRef},{root:f.root,phase:'verification'});
  assert.equal(result.delivery_mode,'local-approved-assets');assert.equal(result.ready_for_agent,false);
  assert.equal(enforceFrontendDelivery({kind:'verification'},{root:f.root,checkpointRef:f.checkpointRef,phase:'verification'}).delivery_mode,'local-approved-assets');
  assert.equal(enforceFrontendDelivery({contract:{lifecycle_ref:'.template-spec/process/lifecycle-registry.yaml'}},{root:f.root,checkpointRef:f.checkpointRef,phase:'verification'}).delivery_mode,'local-approved-assets');
  assert.equal(enforceFrontendDelivery({contract:{lifecycle_ref:f.checkpointRef}},{root:f.root,phase:'verification'}).delivery_mode,'local-approved-assets');
  assert.throws(()=>enforceFrontendDelivery({checkpoint_ref:'other-checkpoint.yaml'},{root:f.root,checkpointRef:f.checkpointRef,phase:'verification'}),/checkpoint绑定冲突/);
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.checkpointRef)),before);
  assert.equal(fs.existsSync(path.join(f.root,f.configRef)),false);
  assert.throws(()=>enforceFrontendDelivery({kind:'verification'},{root:f.root,phase:'verification'}),/checkpoint|登记|绑定/);
  assert.throws(()=>enforceFrontendDelivery({kind:'verification',spec_ref:'unregistered-spec.md'},{root:f.root,phase:'verification'}),/checkpoint|登记|绑定/);
});

test('本地前端输入 transport 拒绝错阶段、旧输入和批准能力伪装',t=>{
  for(const changes of [{coverage:{phase:'contract'}},{coverage:{root:'/another-feature'}},{coverage:{spec_ref:'other-spec.md'}},{coverage:{inputs_current:false}},{coverage:{ready_for_agent:true}},{report:{read_only:false}},{report:{approval_created:true}},{report:{execution_authorization:'ready-for-agent'}}]) {
    const f=localFrontendTransport(t,changes);
    assert.throws(()=>enforceFrontendDelivery({spec_ref:f.specRef},{root:f.root,phase:'verification'}),/原生前端输入/);
  }
});

test('明确checkpoint不能让另一功能资产复用当前前端成功响应',t=>{
  const f=localFrontendTransport(t),other='.work/other/spec.md',cp='.work/other/checkpoint.yaml';
  f.write(other,'# Another feature\n');
  f.write(cp,JSON.stringify({schema_version:1,repository_mode:'project-instance',feature_id:'feature.other',spec_ref:other}));
  f.write('.work/other/map.md',`---\ncheckpoint_ref: ${cp}\n---\n`);
  assert.throws(()=>enforceFrontendDelivery({spec_ref:other},{root:f.root,checkpointRef:f.checkpointRef,phase:'verification'}),/资产与明确checkpoint不属于同一当前功能/);
});

test('本地前端输入核验期间checkpoint漂移不能复用成功响应',t=>{
  const f=localFrontendTransport(t,{},"const cp=process.argv[process.argv.indexOf('--checkpoint')+1];fs.appendFileSync(cp,'\\n');");
  assert.throws(()=>enforceFrontendDelivery({spec_ref:f.specRef},{root:f.root,phase:'verification'}),/漂移/);
});

test('显式外部前端绑定保留原inputs阶段，不回退本地或新增preflight要求',t=>{
  const f=localFrontendTransport(t);
  assert.throws(()=>enforceFrontendDelivery({slice_id:'slice.transport',frontend_delivery:{acceptance_ref:'missing-external.json'}},{root:f.root,phase:'inputs',localPhase:'design'}),error=>/frontend-delivery-blocked/.test(error.message)&&!/frontend-preflight-required/.test(error.message));
});

test('本地前端入口拒绝错误Profile、未知政策版本和缺Receipt的显式Frontend消费者',t=>{
  const f=localFrontendTransport(t);
  f.write(f.configRef,JSON.stringify({...f.config,consumers:[{profile:'frontend',root:path.dirname(f.root),checkpoint_ref:'external-checkpoint.yaml'}]}));
  assert.throws(()=>enforceFrontendDelivery({spec_ref:f.specRef},{root:f.root,phase:'inputs',localPhase:'verification'}),/显式外部前端消费者.*接收绑定/);
  f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.frontend-delivery\n');
  assert.throws(()=>enforceFrontendDelivery({spec_ref:f.specRef},{root:f.root,phase:'verification'}),/native Spec 与 Harness Profile/);
  f.write('.template-spec/process/harness-profile.yaml','schema_version: 1\nprofile_id: harness.spec-template\n');
  const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',policy=parseDocument(fs.readFileSync(path.join(f.root,ref),'utf8')).toJS();
  policy.progression_target.schema_version=2;f.write(ref,JSON.stringify(policy));
  assert.throws(()=>enforceFrontendDelivery({spec_ref:f.specRef},{root:f.root,phase:'verification'}),/CAPABILITY.*本地前端输入政策/);
});
