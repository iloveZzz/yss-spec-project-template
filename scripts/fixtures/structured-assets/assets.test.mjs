import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseAsset, serializeAsset, validateAssetStructure, TOOL_ROOT } from '../../lib/structured-assets.mjs';
import { validateJsonSchema } from '../../lib/json-schema.mjs';
import { planAssetWrite, applyAssetWrite, recoverAssetWrite, assertAssetTransactionIdle, assertCurrentAssetReference } from '../../lib/asset-transactions.mjs';
import { planStageCoverage } from '../../lib/plan-stage-coverage.mjs';
import { planAssetMigration, prepareAssetMigrationWrite } from '../../lib/asset-migration.mjs';

const checkpoint = () => parseAsset(fs.readFileSync(path.join(TOOL_ROOT,'.template-spec/process/templates/lifecycle-checkpoint-template.yaml')));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'asset-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'.template-spec/process'),{recursive:true});
  fs.cpSync(path.join(TOOL_ROOT,'.template-spec/process/schemas'),path.join(root,'.template-spec/process/schemas'),{recursive:true});
  fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');
  fs.mkdirSync(path.join(root,'.template-spec/agents'),{recursive:true});
  fs.writeFileSync(path.join(root,'.template-spec/agents/issue-tracker.md'),'---\ntracker:\n  platform: local-markdown\n  root: docs/.scratch\n---\n');
  return root;
}
const verify = (root, ref, kind) => {validateAssetStructure(parseAsset(fs.readFileSync(path.join(root,ref)),ref),kind,{schemaRoot:root});return {exit_code:0};};
const spec = (ref='docs/checkpoint.json') => ({ref,kind:'checkpoint',value:checkpoint()});

test('strict JSON and lossless YAML reject ambiguous encodings',()=>{
  for (const source of ['{"a":1,"a":2}','{"a":1,}','{"a":NaN}','{a:1}']) assert.throws(()=>parseAsset(source,'a.json'));
  for (const source of ['a: 1\na: 2','1: value','a: .inf','a: 9007199254740993','a: 9.007199254740993e15','{"a":9007199254740993.0}','a: &x 1\nb: *x','a: !private 1']) assert.throws(()=>parseAsset(source));
  assert.deepEqual(parseAsset('a: 1\nb: ["x", true]'),parseAsset('{"a":1,"b":["x",true]}','a.json'));
});
test('offline schema references work and never fetch missing remote schemas',t=>{
  const root=fixture(t), file=path.join(root,'wrapper.json');
  fs.writeFileSync(path.join(root,'base.json'),JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://example.test/base.json',type:'object',additionalProperties:false,properties:{ok:{const:true}}}));
  fs.writeFileSync(file,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://example.test/wrapper.json',$ref:'base.json'}));
  assert.doesNotThrow(()=>validateJsonSchema({ok:true},file));
  assert.throws(()=>validateJsonSchema({extra:1},file),/Additional properties/);
  fs.writeFileSync(file,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$ref:'https://missing.test/schema'}));
  assert.throws(()=>validateJsonSchema({},file),/OFFLINE/);
});
test('write preflight rejects invalid schema without touching source',t=>{
  const root=fixture(t), candidate=spec();candidate.value.status='bogus';
  assert.throws(()=>planAssetWrite(root,[candidate],{schemaRoot:root,verify}));
  assert.equal(fs.existsSync(path.join(root,candidate.ref)),false);
});
test('write checks fresh input and creates a deterministic JSON receipt',t=>{
  const root=fixture(t), candidate=spec(), plan=planAssetWrite(root,[candidate],{schemaRoot:root,verify});
  const result=applyAssetWrite(root,plan,{verify});
  assert.equal(result.status,'applied');assert.equal(fs.readFileSync(path.join(root,candidate.ref),'utf8'),serializeAsset(candidate.value));
  assert.doesNotThrow(()=>assertAssetTransactionIdle(root));
  assert.throws(()=>applyAssetWrite(root,plan,{verify}),/DRIFT/);
});
test('concurrent dependency changes block before any write',t=>{
  const root=fixture(t),plan=planAssetWrite(root,[spec()],{schemaRoot:root,verify});
  fs.writeFileSync(path.join(root,'CONTEXT.md'),'concurrent change');
  assert.throws(()=>applyAssetWrite(root,plan,{verify}),/DRIFT/);
  assert.equal(fs.existsSync(path.join(root,'docs/checkpoint.json')),false);
});
test('replanning identical content is a no-op',t=>{
  const root=fixture(t), candidate=spec();
  applyAssetWrite(root,planAssetWrite(root,[candidate],{schemaRoot:root,verify}),{verify});
  const second=planAssetWrite(root,[candidate],{schemaRoot:root,verify});
  assert.equal(applyAssetWrite(root,second,{verify}).status,'unchanged');
});
test('failure midway rolls back all owned writes',t=>{
  const root=fixture(t),plan=planAssetWrite(root,[spec(),spec('docs/other.json')],{schemaRoot:root,verify});
  assert.throws(()=>applyAssetWrite(root,plan,{verify,afterWrite(){throw Error('injected crash');}}),/rolled-back/);
  assert.equal(fs.existsSync(path.join(root,'docs/checkpoint.json')),false);
  assert.doesNotThrow(()=>assertAssetTransactionIdle(root));
});
test('rollback never overwrites a concurrent edit; pending state blocks transition',t=>{
  const root=fixture(t),plan=planAssetWrite(root,[spec()],{schemaRoot:root,verify});
  assert.throws(()=>applyAssetWrite(root,plan,{verify,afterWrite(c){fs.writeFileSync(path.join(root,c.ref),'concurrent');throw Error('crash');}}),/recovery-conflict/);
  assert.equal(fs.readFileSync(path.join(root,'docs/checkpoint.json'),'utf8'),'concurrent');
  assert.throws(()=>assertAssetTransactionIdle(root),/PENDING/);
  assert.equal(recoverAssetWrite(root).status,'recovery-conflict');
});
test('migration retains original bytes and requires comment review',t=>{
  const root=fixture(t),ref='docs/checkpoint.yaml';fs.mkdirSync(path.join(root,'docs'));
  const source='# business explanation\n'+serializeAsset(checkpoint());fs.writeFileSync(path.join(root,ref),source);
  const plan=planAssetMigration(root,ref,{schemaRoot:root});
  assert.equal(plan.candidates[0].ref,'docs/checkpoint.json');assert.ok(plan.blockers.some(b=>b.code==='comment-review-required'));
  assert.throws(()=>prepareAssetMigrationWrite(root,plan,undefined,{schemaRoot:root,verify}),/REVIEW_REQUIRED/);
  assert.equal(fs.readFileSync(path.join(root,ref),'utf8'),source);
});
test('migration refuses changed input and duplicate targets',t=>{
  const root=fixture(t),ref='docs/checkpoint.yaml';fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(root,ref),serializeAsset(checkpoint()));
  const plan=planAssetMigration(root,ref,{schemaRoot:root});fs.appendFileSync(path.join(root,ref),'\n');
  assert.throws(()=>prepareAssetMigrationWrite(root,plan,undefined,{schemaRoot:root,verify}),/DRIFT/);
  fs.writeFileSync(path.join(root,'docs/checkpoint.json'),serializeAsset(checkpoint()));
  assert.ok(planAssetMigration(root,ref,{schemaRoot:root}).blockers.some(b=>b.code==='target-exists'));
});
test('migration switches explicit authority while preserving historical bytes',t=>{
  const root=fixture(t),ref='docs/checkpoint.yaml';fs.mkdirSync(path.join(root,'docs'));
  const original=serializeAsset(checkpoint());fs.writeFileSync(path.join(root,ref),original);
  const migration=planAssetMigration(root,ref,{schemaRoot:root});
  const write=prepareAssetMigrationWrite(root,migration,undefined,{schemaRoot:root,verify});
  assert.equal(applyAssetWrite(root,write,{verify}).status,'applied');
  assert.equal(fs.readFileSync(path.join(root,ref),'utf8'),original);
  assert.throws(()=>assertCurrentAssetReference(root,ref),/HISTORICAL_ONLY/);
  assert.doesNotThrow(()=>assertCurrentAssetReference(root,'docs/checkpoint.json'));
});
test('coverage exposes missing IDs and never claims semantic equivalence',t=>{
  const root=fixture(t);fs.mkdirSync(path.join(root,'docs'));
  fs.writeFileSync(path.join(root,'docs/plan.md'),'| 项目 | MVP 非目标 |\n| --- | --- |\n| 国产库 | 非目标 |\n');
  fs.writeFileSync(path.join(root,'docs/decisions.md'),'| ID | 决定 |\n| --- | --- |\n| D10 | 内置调度 |\n| D14 | 排除国产库 |\n');
  fs.writeFileSync(path.join(root,'docs/package.json'),JSON.stringify({confirmed_decisions:[{id:'decision.plan-d10-scheduler',statement:'故意相反的陈述'}],non_goals:['国产库']}));
  const report=planStageCoverage(root,{plan_ref:'docs/plan.md',decisions_ref:'docs/decisions.md',package_ref:'docs/package.json'});
  assert.equal(report.coverage_status,'incomplete');assert.equal(report.semantic_review,'required');
  assert.equal(report.decisions[1].status,'missing-or-ambiguous');assert.equal(report.non_goals[0].status,'unmapped');
});
test('migration atomically rebinds current JSON references without marking them historical',t=>{
  const root=fixture(t);fs.mkdirSync(path.join(root,'docs'));
  const source=checkpoint(),current=checkpoint();
  source.artifacts={'artifact.peer':{status:'draft',ref:'docs/current.json',evidence_refs:[]}};
  current.artifacts={'artifact.peer':{status:'draft',ref:'docs/source.yaml',evidence_refs:[]}};
  fs.writeFileSync(path.join(root,'docs/source.yaml'),serializeAsset(source));
  fs.writeFileSync(path.join(root,'docs/current.json'),serializeAsset(current));
  const plan=planAssetMigration(root,'docs/source.yaml',{schemaRoot:root});
  assert.equal(plan.candidates.length,2);
  applyAssetWrite(root,prepareAssetMigrationWrite(root,plan,undefined,{schemaRoot:root,verify}),{verify});
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'docs/current.json'))).artifacts['artifact.peer'].ref,'docs/source.json');
  assert.doesNotThrow(()=>assertCurrentAssetReference(root,'docs/current.json'));
});
test('writers reject traversal and cannot mint unbound approvals',t=>{
  const root=fixture(t);
  assert.throws(()=>planAssetWrite(root,[spec('docs/../bad.json')],{schemaRoot:root,verify}));
  const value={schema_version:1,gate_id:'check.domain-strategy-approved',decision:'approved',actor_kind:'digital-human',role_id:'role.product-manager',runtime_id:'runtime.generic',principal_ref:'reviewer'};
  assert.throws(()=>planAssetWrite(root,[{ref:'docs/approval.json',kind:'approval-record',value}],{schemaRoot:root,verify}),/REBIND_REQUIRED/);
});
