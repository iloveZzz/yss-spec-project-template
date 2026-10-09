import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify } from '../../vendor/yaml.mjs';
import { assertStageTracking, assertTrackingTransition, parseYaml, binding, refreshTracking, sha256 } from '../../lib/stage-tracking.mjs';
import { planTracking, applyTracking, checkTracking } from '../../lib/stage-tracking-migration.mjs';
const repo = path.resolve(import.meta.dirname, '../../..');
const checkpointRef = 'docs/.scratch/demo/checkpoint.json';
function put(root, ref, value) { const p = path.join(root, ref); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, typeof value === 'string' ? value : ref.endsWith('.json') ? JSON.stringify(value, null, 2) : stringify(value)); }
function fixture({ design = false, enabled = false, platform = 'local-markdown', workRoot = 'docs/.scratch' } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-stage-tracking-'));
  for (const ref of ['.template-spec/process/checkpoint-boundary.yaml', '.template-spec/process/schemas/stage-tracking.schema.json', '.template-spec/process/schemas/lifecycle-checkpoint.schema.json', '.template-spec/process/templates/lifecycle-checkpoint-template.yaml', '.template-spec/process/lifecycle-registry.yaml']) put(root, ref, readFileSync(path.join(repo, ref), 'utf8'));
  put(root, 'yss-project.yaml', { schema_version: 1, repository_mode: 'project-instance' });
  put(root, 'CONTEXT.md', '# 测试词汇');
  put(root, '.template-spec/agents/issue-tracker.md', `---\ntracker:\n  platform: ${platform}\n  root: ${workRoot}\n${enabled ? '  lifecycle_tracking_version: 1\n' : ''}---\n# Tracker\n`);
  if (design) put(root, '.template-spec/process/harness-profile.yaml', { profile_id: 'harness.business-ddd-strategy-handoff', allowed_work_units: ['work-unit.plan-requirements', 'work-unit.spec-synthesis', 'work-unit.prototype-design-v2'] });
  put(root, 'docs/.scratch/demo/plan/input.md', '# 已确认的问题');
  return root;
}
const seed = (id = 'scope') => ({ id, title: '明确导入覆盖规则', stage: 'stage.plan', work_unit: 'work-unit.plan-requirements', owner: '需求负责人', scope: '明确重复数据如何处理', acceptance: ['覆盖规则有明确实例'], source_refs: ['docs/.scratch/demo/plan/input.md'] });
function start(opts = {}, items = [seed()]) {
  const root = fixture(opts), plan = planTracking(root, { checkpoint_ref: checkpointRef, items });
  applyTracking(root, plan); return { root, plan, checkpoint: parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8')) };
}
function complete(root, cp, id = 'scope') {
  const item = cp.stage_tracking.items.find(x => x.id === id);
  put(root, `docs/.scratch/demo/verification/${id}.md`, '规则已逐例验证');
  item.completion = item.acceptance.map(criterion => ({ criterion, evidence_refs: [binding(root, `docs/.scratch/demo/verification/${id}.md`)] })); item.progress = 'completed';
}
function registeredFixture({design=false,workRoot='.work'}={}){
 const root=fixture({design,workRoot}),ref=design?'intake-checkpoint.json':`${workRoot}/demo/checkpoint.json`,base=`${workRoot}/demo`;
 const owner=design?path.join(repo,'submodules/yss-harness-design-agent'):repo;
 if(design)put(root,'.template-spec/process/harness-profile.yaml',readFileSync(path.join(owner,'.template-spec/process/harness-profile.yaml'),'utf8'));
 else put(root,'.template-spec/process/harness-profile.yaml',{schema_version:1,profile_id:'harness.spec-template'});
 const contract=design?'.agents/skills/yss-strategic-design/references/orchestration-contract.yaml':'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
 put(root,contract,readFileSync(path.join(owner,contract),'utf8'));
 const cp=parseYaml(readFileSync(path.join(repo,'.template-spec/process/templates/lifecycle-checkpoint-template.yaml'),'utf8'));cp.feature_id='feature.supplier';cp.stage='stage.plan';cp.next_work_unit='work-unit.plan-requirements';put(root,ref,cp);
 put(root,`${base}/map.md`,`---\ncheckpoint_ref: ${ref}\n---\n# 登记\n`);return {root,ref,base,contract};
}
test('registered current Spec and root Design migration use map directory and preserve original approval fields',()=>{
 for(const options of [{},{design:true},{workRoot:'docs/custom-work'}]){
  const f=registeredFixture(options);try{
   const before=parseYaml(readFileSync(path.join(f.root,f.ref),'utf8'));
   const p=planTracking(f.root,{checkpoint_ref:f.ref,items:[{...seed(),split_reasons:['independent-acceptance']}]});
   assert.equal(applyTracking(f.root,p).status,'applied');
   const cp=parseYaml(readFileSync(path.join(f.root,f.ref),'utf8'));
   assert.equal(cp.feature_id,'feature.supplier');assert.equal(cp.stage_tracking.feature_id,cp.feature_id);
   assert.equal(cp.stage_tracking.entry.ref,options.design?f.ref:`${f.base}/parent-ticket.md`);
   assert.equal(cp.stage_tracking.items[0].definition_ref,`${f.base}/work-items/scope.md`);
   assert.deepEqual(cp.gates,before.gates);assert.deepEqual(cp.human_review,before.human_review);
   assert.equal(checkTracking(f.root,f.ref).status,'valid');assert.equal(applyTracking(f.root,p).status,'unchanged');
   cp.stage_tracking.entry.kind=options.design?'parent-ticket':'checkpoint';assert.throws(()=>assertStageTracking(cp,{root:f.root,checkpointRef:f.ref}),/design-parent-forbidden|parent-required/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 }
});
test('registered Stage rejects missing or conflicting registration and unsupported capabilities',()=>{
 for(const scenario of ['missing','duplicate','wrong-checkpoint','unknown-version','unknown-capability']){
  const f=registeredFixture({design:true});try{
   if(scenario==='missing')rmSync(path.join(f.root,`${f.base}/map.md`));
   if(scenario==='duplicate')put(f.root,'.work/duplicate/map.md',`---\ncheckpoint_ref: ${f.ref}\n---\n`);
   if(scenario==='wrong-checkpoint'){put(f.root,'other.json',readFileSync(path.join(f.root,f.ref),'utf8'));put(f.root,`${f.base}/map.md`,'---\ncheckpoint_ref: other.json\n---\n');}
   if(scenario.startsWith('unknown')){const contract=parseYaml(readFileSync(path.join(f.root,f.contract),'utf8'));if(scenario==='unknown-version')contract.progression_target.schema_version=99;else contract.progression_target.required_capabilities.push('unknown-capability');put(f.root,f.contract,contract);}
   const before=readFileSync(path.join(f.root,f.ref));assert.throws(()=>planTracking(f.root,{checkpoint_ref:f.ref,items:[seed()]}),/registration-not-unique|capability-unsupported/,scenario);assert.deepEqual(readFileSync(path.join(f.root,f.ref)),before);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 }
});
test('duplicate maps before and during current Stage apply fail with original checkpoint restored',()=>{
 for(const late of [false,true]){
  const f=registeredFixture({design:true});try{
   const before=readFileSync(path.join(f.root,f.ref)),p=planTracking(f.root,{checkpoint_ref:f.ref,items:[seed()]});
   const duplicate=()=>put(f.root,'.work/duplicate/map.md',`---\ncheckpoint_ref: ${f.ref}\n---\n`);
   if(!late)duplicate();
   assert.throws(()=>applyTracking(f.root,p,late?{afterWrite:(_,count)=>{if(count===1)duplicate();}}:{}),late?/registration-not-unique.*rollback-complete/:/registration-not-unique/);
   assert.deepEqual(readFileSync(path.join(f.root,f.ref)),before);assert.ok(existsSync(path.join(f.root,'.work/duplicate/map.md')));
   assert.equal(existsSync(path.join(f.root,`${f.base}/parent-ticket.md`)),false);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 }
});
test('new Plan: unique parent, inline item, no slice; check and plan are read-only', () => {
  const root = fixture(); const plan = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
  assert.equal(checkTracking(root, checkpointRef).status, 'missing-checkpoint');
  assert.equal(applyTracking(root, plan).status, 'applied');
  assert.equal(checkTracking(root, checkpointRef).status, 'valid');
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md')), true);
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/work-items')), false);
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/issues')), false);
  assert.equal(applyTracking(root, plan).status, 'unchanged');
  assert.equal(planTracking(root, plan.input).changes.length, 0);
});

test('configured new and custom roots generate one consistent checkpoint, parent and work item', () => {
  for(const workRoot of ['.work','docs/custom-work']) {
    const root=fixture({workRoot}),checkpoint_ref=`${workRoot}/demo/checkpoint.json`;
    put(root,`${workRoot}/demo/plan/input.md`,'明确需求');
    const item={...seed(),source_refs:[`${workRoot}/demo/plan/input.md`],split_reasons:['independent-acceptance']};
    const plan=planTracking(root,{checkpoint_ref,items:[item]});
    assert.equal(applyTracking(root,plan).status,'applied');
    const cp=parseYaml(readFileSync(path.join(root,checkpoint_ref),'utf8'));
    assert.equal(cp.stage_tracking.entry.ref,`${workRoot}/demo/parent-ticket.md`);
    assert.equal(cp.stage_tracking.items[0].definition_ref,`${workRoot}/demo/work-items/scope.md`);
    assert.equal(checkTracking(root,checkpoint_ref).status,'valid');
    assert.throws(()=>planTracking(root,{checkpoint_ref:checkpointRef,items:[item]}),/WORK_LAYOUT_CHECKPOINT/);
  }
});
test('Design entry uses checkpoint and never engineering parent', () => {
  const { root, checkpoint } = start({ design: true });
  assert.equal(existsSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md')), false);
  assert.equal(checkpoint.stage_tracking.entry.kind, 'checkpoint');
  checkpoint.stage_tracking.entry.kind = 'parent-ticket';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /design-parent-forbidden/);
});
test('existing Spec entry preserves approvals and records entry stage, not historical completion', () => {
  const root = fixture(); const cp = parseYaml(readFileSync(path.join(repo, '.template-spec/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
  cp.stage = 'stage.spec-architecture'; cp.human_review = { preserved: '原始批准引用' }; put(root, checkpointRef, cp);
  const item = { ...seed(), stage: cp.stage, work_unit: 'work-unit.spec-synthesis' };
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [item] }));
  const got = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.equal(got.stage_tracking.entry_stage, cp.stage); assert.deepEqual(got.human_review, cp.human_review);
  assert.equal(got.stage_tracking.items[0].progress, 'pending');
});
test('independent item has no duplicate progress; definition drift fails', () => {
  const item = { ...seed(), split_reasons: ['independent-acceptance'] };
  const { root, checkpoint } = start({}, [item]);
  const ref = checkpoint.stage_tracking.items[0].definition_ref;
  assert.ok(ref.endsWith('/work-items/scope.md')); assert.doesNotMatch(readFileSync(path.join(root, ref), 'utf8'), /^progress:|^Status:/m);
  put(root, ref, readFileSync(path.join(root, ref), 'utf8') + '\n篡改验收');
  assert.throws(() => assertStageTracking(checkpoint, { root }), /definition-drift/);
});
test('completion requires mapped, current evidence and frozen source digests', () => {
  const { root, checkpoint } = start(); checkpoint.stage_tracking.items[0].progress = 'completed';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /acceptance-evidence-required/);
  complete(root, checkpoint); assert.equal(assertStageTracking(checkpoint, { root }).status, 'valid');
  put(root, 'docs/.scratch/demo/verification/scope.md', '证据已改变');
  assert.throws(() => assertStageTracking(checkpoint, { root }), /stale-completion/);
});
test('refresh propagates only to dependents and retains previous evidence', () => {
  const { root, checkpoint } = start({}, [seed(), { ...seed('other'), source_refs: ['CONTEXT.md'] }, { ...seed('dependent'), dependencies: ['scope'] }]);
  complete(root, checkpoint); complete(root, checkpoint, 'other'); complete(root, checkpoint, 'dependent');
  const evidence = structuredClone(checkpoint.stage_tracking.items[0].completion);
  put(root, 'docs/.scratch/demo/plan/input.md', '规则变化');
  const next = refreshTracking(root, checkpoint);
  assert.deepEqual(next.stale_item_ids.sort(), ['dependent', 'scope']);
  assert.equal(next.checkpoint.stage_tracking.items[1].progress, 'completed');
  assert.deepEqual(next.checkpoint.stage_tracking.items[0].completion, evidence);
  assert.equal(next.checkpoint.stage_tracking.items[0].progress, 'pending');
});
test('blocked dependency prevents start; unrelated work remains valid', () => {
  const { root, checkpoint } = start({}, [seed(), { ...seed('other'), dependencies: ['scope'] }]);
  checkpoint.stage_tracking.items[1].progress = 'running';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /dependency-blocked/);
  checkpoint.stage_tracking.items[1].progress = 'pending'; checkpoint.stage_tracking.items[0].progress = 'running';
  assert.equal(assertStageTracking(checkpoint, { root }).status, 'valid');
  checkpoint.stage_tracking.items[0].dependencies = ['other'];
  assert.throws(() => assertStageTracking(checkpoint, { root }), /dependency-cycle/);
});
test('missing items block migration instead of inventing owner or acceptance', () => {
  const root = fixture(); const p = planTracking(root, { checkpoint_ref: checkpointRef });
  assert.ok(p.gaps.length); assert.throws(() => applyTracking(root, p), /needs-info/);
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});
test('legacy project accepted; enabled missing checkpoint ref rejected at transition', () => {
  const root = fixture(); assert.equal(assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', {}, { root }).status, 'not-applicable');
  const enabled = fixture({ enabled: true });
  assert.throws(() => assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', {}, { root: enabled }), /checkpoint-ref-required/);
  assert.throws(() => assertStageTracking({ stage: 'stage.plan' }, { root: enabled }), /stage-tracking-required/);
});
test('transition requires current unit closure and persisted state', () => {
  const { root, checkpoint } = start();
  assert.throws(() => assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', { checkpoint_ref: checkpointRef }, { root }), /current-work-incomplete/);
  complete(root, checkpoint); put(root, checkpointRef, checkpoint);
  assert.equal(assertTrackingTransition('work-unit.plan-requirements', 'work-unit.spec-synthesis', { checkpoint_ref: checkpointRef }, { root }).status, 'valid');
});
test('stage item cannot receive implementation readiness', () => {
  const { root, checkpoint } = start(); checkpoint.stage_tracking.items[0].progress = 'ready-for-agent';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /not one of/);
  checkpoint.stage_tracking.items[0].progress = 'pending'; checkpoint.stage_tracking.items[0].kind = 'vertical-slice-ticket';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /stage-work-item/);
});
test('migration rejects source drift and altered plan; failed writes roll back', () => {
  const root = fixture(), p = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  put(root, 'CONTEXT.md', '并发改变'); assert.throws(() => applyTracking(root, p), /plan-stale/);
  const newer = planTracking(root, p.input); newer.changes[0].after += '篡改'; assert.throws(() => applyTracking(root, newer), /digest-mismatch/);
  const next = planTracking(root, p.input), before = readFileSync(path.join(root, '.template-spec/agents/issue-tracker.md'), 'utf8');
  assert.throws(() => applyTracking(root, next, { afterWrite: (_, count) => { if (count === 2) throw new Error('injected-write-failure'); } }), /rollback-complete/);
  assert.equal(readFileSync(path.join(root, '.template-spec/agents/issue-tracker.md'), 'utf8'), before);
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});
test('migration protects symlink paths and profile boundaries', () => {
  const root = fixture(); mkdirSync(path.join(root, 'docs/.scratch/demo/work-items'));
  symlinkSync(path.join(root, 'CONTEXT.md'), path.join(root, 'docs/.scratch/demo/work-items/scope.md'));
  assert.throws(() => planTracking(root, { checkpoint_ref: checkpointRef, items: [{ ...seed(), split_reasons: ['different-owner'] }] }), /symlink/);
});
test('remote tracker stays pending; local requires no remote issue', () => {
  const { root } = start({ platform: 'github' });
  assert.match(readFileSync(path.join(root, 'docs/.scratch/demo/parent-ticket.md'), 'utf8'), /publication: pending\npending_publication_to: github/);
});
test('CLI check/plan/apply roundtrip and meaningful exit codes', () => {
  const root = fixture(), items = path.join(root, 'items.yaml'), planFile = path.join(root, 'plan.json'); put(root, 'items.yaml', [seed()]);
  const run = (...args) => spawnSync(process.execPath, [path.join(repo, 'scripts/stage-tracking'), ...args, '--root', root], { encoding: 'utf8' });
  const p = run('plan', '--checkpoint', checkpointRef, '--items', items); assert.equal(p.status, 0, p.stderr); writeFileSync(planFile, p.stdout);
  const applied = run('apply', '--plan', planFile); assert.equal(applied.status, 0, applied.stderr);
  const checked = run('check', '--checkpoint', checkpointRef); assert.equal(checked.status, 0, checked.stderr);
  assert.equal(run('apply', '--plan', planFile).status, 0);
  assert.equal(run('apply', '--plan', planFile, '--refresh').status, 1);
});

test('deferral needs independent record and remains non-completed', () => {
  const root = fixture(); put(root, 'docs/.scratch/demo/gates/deferral.md', '测试决定引用；不替代阶段批准');
  const item = { ...seed(), deferred: { owner: '负责人', resolve_by: '2099-01-01T00:00:00Z', receiver: '需求接收方', verification_plan: '复验边界', risk: '后续范围不确定', follow_up_ref: 'follow-up-1', decision_ref: 'docs/.scratch/demo/gates/deferral.md' } };
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [item] }));
  const cp = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.ok(cp.stage_tracking.items[0].definition_ref);
  assert.equal(assertStageTracking(cp, { root, currentWorkUnit: 'work-unit.plan-requirements', nextWorkUnit: 'work-unit.spec-synthesis', transition: true }).status, 'valid');
  cp.stage_tracking.items[0].progress = 'completed'; assert.throws(() => assertStageTracking(cp, { root }), /deferred-not-completed/);
  cp.stage_tracking.items[0].progress = 'pending'; cp.stage_tracking.items[0].deferred.resolve_by = '2000-01-01T00:00:00Z'; assert.throws(() => assertStageTracking(cp, { root }), /deferral-expired/);
});
test('public transition entry cannot bypass tracking with a claimed WER', async () => {
  const { validateNextRoute } = await import('../../lib/lifecycle-transition.mjs');
  const root = fixture({ enabled: true });
  const result = validateNextRoute('work-unit.plan-requirements', 'work-unit.spec-synthesis', { result: 'completed' }, { root });
  assert.equal(result.result, 'blocked'); assert.ok(result.blocking_signals.includes('stage-tracking-blocked'));
});
test('dispatch rejects missing registration and permits independent pending work', async () => {
  const { assertTrackingEntry } = await import('../../lib/stage-tracking.mjs');
  const root = fixture({ enabled: true });
  assert.throws(() => assertTrackingEntry('work-unit.plan-requirements', {}, { root }), /entry-checkpoint-required/);
  const active = start();
  assert.doesNotThrow(() => assertTrackingEntry('work-unit.plan-requirements', { checkpoint_ref: checkpointRef }, { root: active.root }));
  assert.throws(() => assertTrackingEntry('work-unit.prototype-design-v2', { checkpoint_ref: checkpointRef }, { root: active.root }), /entry-work-item-required/);
});
test('checkpoint schema embeds the canonical stage tracking schema exactly', () => {
  assert.deepEqual(JSON.parse(readFileSync(path.join(repo, '.template-spec/process/schemas/lifecycle-checkpoint.schema.json'))).properties.stage_tracking, JSON.parse(readFileSync(path.join(repo, '.template-spec/process/schemas/stage-tracking.schema.json'))));
});

test('source changes during apply are detected and preserved while own writes roll back', () => {
  const root = fixture(), p = planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] });
  assert.throws(() => applyTracking(root, p, { afterWrite: (_, count) => { if (count === 1) put(root, 'docs/.scratch/demo/plan/input.md', '并发更新的业务规则'); } }), /concurrent-change.*rollback-complete/);
  assert.equal(readFileSync(path.join(root, 'docs/.scratch/demo/plan/input.md'), 'utf8'), '并发更新的业务规则');
  assert.equal(existsSync(path.join(root, checkpointRef)), false);
});

test('migration preserves existing stable feature IDs independently of folder slugs', () => {
  const root = fixture(), cp = parseYaml(readFileSync(path.join(repo, '.template-spec/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8'));
  cp.feature_id = 'feature.demo'; cp.stage = 'stage.plan'; put(root, checkpointRef, cp);
  applyTracking(root, planTracking(root, { checkpoint_ref: checkpointRef, items: [seed()] }));
  const saved = parseYaml(readFileSync(path.join(root, checkpointRef), 'utf8'));
  assert.equal(saved.feature_id, 'feature.demo'); assert.equal(saved.stage_tracking.feature_id, 'feature.demo');
  assert.equal(checkTracking(root, checkpointRef).status, 'valid');
});
test('a quoted stage-work-item moved under issues still cannot become an implementation ticket', async () => {
  const { validateTicketFormalization } = await import('../../lib/lifecycle-transition.mjs');
  const root = fixture(), slice = 'docs/.scratch/demo/issues/01-fake.md', resultRef = 'docs/.scratch/demo/verification/decomposition.yaml';
  put(root, slice, '---\nkind: "stage-work-item"\n---\n# 设计工作\n');
  put(root, resultRef, { result_schema: 'workflow-execution-result-v1', work_unit: 'work-unit.ticket-decomposition', result: 'completed', evidence_refs: [resultRef] });
  const state = { tracker_kind: 'local-markdown', ticket_decomposition_result_ref: resultRef, ticket_decomposition_result: { result: 'completed', evidence_refs: [resultRef] }, vertical_slice_ticket_ref: slice, vertical_slice_ticket_role: 'ready-for-agent', vertical_slice_ticket_kind: 'vertical-slice-ticket', vertical_slice_ticket: { ref: slice, role: 'ready-for-agent', kind: 'vertical-slice-ticket' }, slice_contract: { ticket_ref: slice, status: 'approved', persisted: true, current_version: true } };
  const result = validateTicketFormalization(state, { exists: ref => existsSync(path.join(root, ref)), read: ref => readFileSync(path.join(root, ref), 'utf8') });
  assert.ok(result.blocking_signals.includes('stage-work-item-not-implementable'));
});


test('manual checkpoint edits cannot bypass required owner splitting', () => {
  const { root, checkpoint } = start({}, [seed(), seed('second')]);
  checkpoint.stage_tracking.items[1].owner = '另一位负责人';
  assert.throws(() => assertStageTracking(checkpoint, { root }), /independent-item-required/);
});
