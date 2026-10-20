import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../scripts/vendor/yaml.mjs';
import { validateJsonSchemas } from '../scripts/lib/json-schema.mjs';
import { assetSchema } from '../scripts/lib/structured-assets.mjs';

const root = path.resolve(import.meta.dirname, '..');
const schema = name => path.join(root, '.template-spec/process/schemas', name + '.schema.json');
const gates = ['gate.delivery-accepted','gate.implementation-admitted','gate.plan-approved','gate.spec-baseline-approved'];
const asset = {ref:'plan.json',digest:'a'.repeat(64)};
const record = {schema_version:1,kind:'stage-result',feature_id:'feature.demo',gate_id:'gate.plan-approved',scope:['feature.demo'],assets:[asset],checks:[{id:'check.domain-strategy-approved',result:'passed',inputs:[asset],evidence:[{ref:'check.json',digest:'b'.repeat(64)}]}],outcome:'approved',blocking_findings:[],provenance:{tool:'node',execution_ref:'check.json'},authorization:{kind:'user-decision',ref:'decision.json',digest:'c'.repeat(64)}};

test('Spec stage contract exposes exactly four exits and checks without approval fields', () => {
  const policy = parse(fs.readFileSync(path.join(root,'.template-spec/process/orchestration/domain/stage-gates.yaml'),'utf8')).stage_gates;
  assert.deepEqual(policy.gates.map(g=>g.id).sort(),gates);
  assert.equal(policy.capability,'stage-gates-v1');
  const forbidden = ['approval_ref','approver','role_id','countersigner_role_ids'];
  const cases = [record,...forbidden.map(key=>({...record,checks:[{...record.checks[0],[key]:'forbidden'}]})),{...record,checks:[{...record.checks[0],result:'approved'}]},{...record,schema_version:99},{...record,authorization:undefined}];
  const results = validateJsonSchemas(cases.map(value=>({value,schemaPath:schema('stage-result')})));
  assert.equal(results[0].valid,true,results[0].error);
  for(const r of results.slice(1))assert.equal(r.valid,false);
});

test('checkpoint2 selects stage references and rejects malformed digests and child approvals', () => {
  const value={schema_version:2,repository_mode:'project-instance',feature_id:'feature.demo',mode:'orchestrate',status:'running',stage:'stage.plan',artifacts:{},gates:{'gate.plan-approved':{record_ref:'stages/plan/result.json',record_digest:'a'.repeat(64)}},context_reconciliation:{status:'pending',ref:null,evidence_refs:[]},next_work_unit:'work-unit.spec-synthesis',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]};
  assert.equal(assetSchema('checkpoint',value),schema('lifecycle-checkpoint-v2'));
  const bad=structuredClone(value);bad.gates['gate.plan-approved'].record_digest='invalid';
  const child={...value,checks:{'check.domain-strategy-approved':{approval_ref:'child.json'}}};
  const results=validateJsonSchemas([value,bad,child].map(value=>({value,schemaPath:schema('lifecycle-checkpoint-v2')})));
  assert.equal(results[0].valid,true,results[0].error);assert.equal(results[1].valid,false);assert.equal(results[2].valid,false);
});

test('content4 schemas accept unapproved business content without embedded approval', () => {
  for(const kind of ['domain-strategy','stage-decision-package']) {
    const actual=assetSchema(kind,{schema_version:4});
    assert.match(actual,new RegExp(kind+'-v4\\.schema\\.json$'));
    const s=JSON.parse(fs.readFileSync(actual));assert.equal(s.properties.schema_version.const,4);assert.ok(!s.required.includes('approval'));assert.equal(s.properties.approval,false);
  }
});
