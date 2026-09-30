import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { applyAssets, planAssets } from '../scripts/lib/feature-assets.mjs';

const cli = path.resolve('scripts/feature-assets');
const feature = 'docs/.scratch/example';
function fixture(t) {
  const area = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-assets-test-'));
  const root = path.join(area, 'project'); fs.mkdirSync(root);
  const put = (ref, text) => { const file = path.join(root, ref); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, text); return file; };
  put('yss-project.yaml', 'schema_version: 1\nrepository_mode: project-instance\n');
  put(`${feature}/checkpoint.yaml`, 'schema_version: 1\nrepository_mode: project-instance\nfeature_id: example\nstage: stage.plan\n');
  const call = (...args) => spawnSync(process.execPath, [cli, ...args, '--root', root], {encoding:'utf8'});
  t.after(() => fs.rmSync(area, {recursive:true, force:true}));
  return {area, root, put, call, checkpoint:`${feature}/checkpoint.yaml`};
}
test('explicit draft is archived and restored without changing its bytes or mode; repeated apply is harmless', t => {
  const f=fixture(t), ref=`${feature}/verification/prototype-evidence-draft.yaml`;
  const file=f.put(ref, 'user_confirmation:\n  result: pending\n'); fs.chmodSync(file,0o640);
  f.put(`${feature}/verification/prototype-evidence.yaml`, 'user_confirmation:\n  result: passed\n');
  const p=f.call('plan','--checkpoint',f.checkpoint,'--candidate',ref,'--archive-dir',path.join(f.area,'archive'));
  assert.equal(p.status,0,p.stderr);
  const plan=JSON.parse(p.stdout); assert.equal(plan.actions[0].action,'archive');
  assert.equal(fs.existsSync(file),true,'planning must not remove files');
  const planFile=path.join(f.area,'plan.json'); fs.writeFileSync(planFile,p.stdout);
  const applied=f.call('apply','--plan',planFile); assert.equal(applied.status,0,applied.stderr);
  const receipt=JSON.parse(applied.stdout); assert.equal(fs.existsSync(file),false);
  assert.equal(f.call('apply','--plan',planFile).status,0);
  const restored=f.call('restore','--receipt',receipt.receipt_ref); assert.equal(restored.status,0,restored.stderr);
  assert.equal(fs.readFileSync(file,'utf8'),'user_confirmation:\n  result: pending\n');
  assert.equal(fs.statSync(file).mode&0o777,0o640);
  assert.equal(f.call('restore','--receipt',receipt.receipt_ref).status,0);
});

test('referenced drafts, raw replies, task packages and duplicate handoff sources stay protected', t => {
  const f=fixture(t), draft=`${feature}/verification/prototype-evidence-draft.yaml`;
  f.put(draft,'draft: true\n'); f.put(`${feature}/verification/prototype-evidence.yaml`,'ref: '+draft+'\n');
  const refs=[draft,`${feature}/gates/captures/response.yaml`,`${feature}/task-packages/review.yaml`,`${feature}/handoff/source.yaml`];
  for(const ref of refs.slice(1))f.put(ref,'same: bytes\n');
  const p=f.call('plan','--checkpoint',f.checkpoint,...refs.flatMap(x=>['--candidate',x]),'--archive-dir',path.join(f.area,'archive'));
  assert.equal(p.status,0,p.stderr); assert.ok(JSON.parse(p.stdout).actions.every(a=>a.action==='keep'));
  const inspect=f.call('inspect','--checkpoint',f.checkpoint);assert.equal(inspect.status,0,inspect.stderr);
  assert.ok(JSON.parse(inspect.stdout).duplicates.some(g=>g.includes(refs[1])&&g.includes(refs[3])));
});
test('unresolved dynamic consumers keep the draft; a question referenced by message id is protected',t=>{
  const f=fixture(t),draft=`${feature}/verification/prototype-evidence-draft.yaml`,question=`${feature}/gates/captures/early-question.yaml`;
  f.put(draft,'draft: true\n');f.put(`${feature}/verification/prototype-evidence.yaml`,'result: pending\n');
  f.put('scripts-local/consumer.mjs','readFileSync(`docs/.scratch/example/verification/${name}.yaml`);\n');
  f.put(question,'messages:\n  - id: q-1\n    actor_kind: digital-human\n');
  f.put(`${feature}/gates/reply.yaml`,'reply_to: q-1\n');
  const p=f.call('plan','--checkpoint',f.checkpoint,'--candidate',draft,'--candidate',question,'--archive-dir',path.join(f.area,'archive'));
  assert.equal(p.status,0,p.stderr);assert.ok(JSON.parse(p.stdout).actions.every(a=>a.action==='keep'));
});
test('path escape, symlink, internal archive, changed source and new reference all fail closed',t=>{
  const f=fixture(t),draft=`${feature}/verification/prototype-evidence-draft.yaml`,file=f.put(draft,'draft: true\n');
  f.put(`${feature}/verification/prototype-evidence.yaml`,'result: passed\n');
  const plan=()=>f.call('plan','--checkpoint',f.checkpoint,'--candidate',draft,'--archive-dir',path.join(f.area,'archive'));
  assert.notEqual(f.call('plan','--checkpoint',f.checkpoint,'--candidate','../secret','--archive-dir',path.join(f.area,'archive')).status,0);
  assert.notEqual(f.call('plan','--checkpoint',f.checkpoint,'--candidate',draft,'--archive-dir',path.join(f.root,'archive')).status,0);
  const p=plan(), planFile=path.join(f.area,'plan.json'); fs.writeFileSync(planFile,p.stdout);
  fs.writeFileSync(file,'draft: changed\n'); assert.notEqual(f.call('apply','--plan',planFile).status,0);assert.ok(fs.existsSync(file));
  fs.writeFileSync(file,'draft: true\n');f.put(`${feature}/new-ref.md`,draft);
  assert.notEqual(f.call('apply','--plan',planFile).status,0);assert.ok(fs.existsSync(file));
  fs.unlinkSync(file);fs.symlinkSync(path.join(f.area,'external'),file);assert.notEqual(plan().status,0);
});
test('copy interruption resumes, while restoration refuses subsequent user edits',t=>{
  const f=fixture(t),ref=`${feature}/verification/prototype-evidence-draft.yaml`,file=f.put(ref,'draft: true\n');
  f.put(`${feature}/verification/prototype-evidence.yaml`,'result: passed\n');
  const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});
  assert.throws(()=>applyAssets({root:f.root,plan,onProgress(){throw Error('interrupted');}}),/interrupted/);
  assert.ok(fs.existsSync(file));
  const receipt=applyAssets({root:f.root,plan}); assert.equal(receipt.status,'applied');assert.equal(fs.existsSync(file),false);
  fs.writeFileSync(file,'my later edits\n');
  assert.notEqual(f.call('restore','--receipt',receipt.receipt_ref).status,0);assert.equal(fs.readFileSync(file,'utf8'),'my later edits\n');
});
test('tampered plan cannot turn a protected approval into a delete or archive action',t=>{
  const f=fixture(t),ref=`${feature}/gates/approval.yaml`;f.put(ref,'decision: approved\n');
  const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});
  plan.actions[0].action='archive';
  assert.throws(()=>applyAssets({root:f.root,plan}),/plan/); assert.ok(fs.existsSync(path.join(f.root,ref)));
});

test('rehashed forged action is rejected by reclassification',t=>{
  const f=fixture(t),ref=`${feature}/gates/approval.yaml`;f.put(ref,'decision: approved\n');
  const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});
  plan.actions[0].action='archive';const {plan_id,...payload}=plan;
  plan.plan_id=createHash('sha256').update(JSON.stringify(payload,null,2)+'\n').digest('hex');
  assert.throws(()=>applyAssets({root:f.root,plan}),/plan-no-longer-current/);
});
test('open cache is retained, missing occupancy tools retain it, free cache can resume interrupted deletion',async t=>{
  const f=fixture(t),ref=`${feature}/verification/browser/.chrome-profile`;
  const file=f.put(ref+'/Preferences','cache');f.put(ref+'/remaining','more cache');
  const child=spawn(process.execPath,['-e',`require('fs').openSync(process.argv[1],'r');console.log('ready');setInterval(()=>{},1000)`,file],{stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());await once(child.stdout,'data');
  const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});
  assert.equal(applyAssets({root:f.root,plan}).status,'partial');assert.ok(fs.existsSync(file));
  child.kill();await once(child,'exit');
  const oldPath=process.env.PATH;try {process.env.PATH='/nonexistent-feature-assets-test';assert.equal(applyAssets({root:f.root,plan}).status,'partial');}finally{process.env.PATH=oldPath;}
  assert.throws(()=>applyAssets({root:f.root,plan,onProgress(){fs.unlinkSync(file);throw Error('interrupt-delete');}}),/interrupt-delete/);
  const receipt=applyAssets({root:f.root,plan});assert.equal(receipt.status,'applied');assert.equal(fs.existsSync(path.join(f.root,ref)),false);
  assert.equal(f.call('restore','--receipt',receipt.receipt_ref).status,0);assert.equal(fs.existsSync(path.join(f.root,ref)),false);
});
test('corrupt archive never removes original or overwrites recovery target',t=>{
  const f=fixture(t),ref=`${feature}/verification/prototype-evidence-draft.yaml`,file=f.put(ref,'draft: true\n');f.put(`${feature}/verification/prototype-evidence.yaml`,'result: passed\n');
  const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});
  assert.throws(()=>applyAssets({root:f.root,plan,onProgress(){throw Error('interrupted');}}),/interrupted/);
  fs.writeFileSync(path.join(plan.archive_dir,'files',ref),'bad copy');
  assert.throws(()=>applyAssets({root:f.root,plan}),/archive-verification-failed/);assert.equal(fs.readFileSync(file,'utf8'),'draft: true\n');
});

test('new consumers inside tool and canonical skill directories are not ignored',t=>{
 const f=fixture(t),ref=`${feature}/verification/prototype-evidence-draft.yaml`;f.put(ref,'draft: true\n');f.put(`${feature}/verification/prototype-evidence.yaml`,'result: passed\n');
 for(const consumer of ['scripts/custom-consumer.mjs','.agents/skills/custom/SKILL.md','.template-spec/custom.md'])f.put(consumer,ref);
 const plan=planAssets({root:f.root,checkpoint:f.checkpoint,candidates:[ref],archiveDir:path.join(f.area,'archive')});assert.equal(plan.actions[0].action,'keep');assert.equal(plan.actions[0].incoming.length,3);
});
