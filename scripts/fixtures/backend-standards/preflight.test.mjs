import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { approvedFixture } from '../delivery-preflight/approved-execution-fixture.mjs';
import { pilotFixture } from '../slice-contract-v3/pilot-fixture.mjs';
import { inspectSliceContract } from '../../lib/slice-execution-preflight.mjs';
import { inspectFirstSliceArtifacts } from '../../lib/first-slice-artifacts.mjs';

test('reduced historical v2 is readable but never executable', () => {
  const f = approvedFixture();
  try {
    f.write('small.json', { schema_version: 2, status: 'approved', contract_id:'small',contract_version:'v1' });
    const report = inspectSliceContract('small.json', { root:f.root, approval_ref:f.binding.approval_ref }).report;
    assert.equal(report.checks.readable,'passed'); assert.equal(report.checks.structure,'failed');
    assert.equal(report.execution_allowed,false); assert.ok(report.blockers.length);
  } finally { f.cleanup(); }
});
test('v3 verification separates structural reading from real bound approval and freshness', () => {
  const f = pilotFixture();
  try {
    const {binding} = f.approve();
    const before = fs.readFileSync(`${f.root}/${binding.ref}`);
    const readable = inspectSliceContract(binding.ref, {root:f.root}).report;
    assert.equal(readable.execution_allowed,false); assert.equal(readable.checks.approval,'not-checked');
    const approved = inspectSliceContract(binding.ref, {root:f.root,approval_ref:binding.approval_ref}).report;
    assert.equal(approved.execution_allowed,true,JSON.stringify(approved));
    assert.deepEqual(fs.readFileSync(`${f.root}/${binding.ref}`),before);
    f.write('spec.md','stale input');
    assert.throws(() => inspectSliceContract(binding.ref,{root:f.root}),/stale/);
  } finally { f.cleanup(); }
});
test('responsibility bindings accept renamed types and require no unused persistence/page adapter', () => {
  const f = approvedFixture();
  try {
    f.write('project/mod/src/main/java/demo/adapter/web/Login.java','package demo.adapter.web; public class Login {}');
    f.write('project/mod/src/main/java/demo/usecase/Authenticate.java','package demo.usecase; public class Authenticate {}');
    f.write('project/mod/src/test/java/demo/AuthSpec.java','package demo; public class AuthSpec {}');
    const contract = {backend:{affected_layers:['web','application'],first_slice:{artifacts:[
      {role:'web',path:'mod/src/main/java/demo/adapter/web/Login.java',type:'demo.adapter.web.Login'},
      {role:'application',path:'mod/src/main/java/demo/usecase/Authenticate.java',type:'demo.usecase.Authenticate'},
      {role:'test',path:'mod/src/test/java/demo/AuthSpec.java',type:'demo.AuthSpec'}
    ]}}};
    const inspected = inspectFirstSliceArtifacts(contract, `${f.root}/project`);
    assert.deepEqual(inspected.failures,[]); assert.equal(inspected.properties['yss.arch.web'],'demo.adapter.web');
    contract.backend.affected_layers.push('domain');
    assert.ok(inspectFirstSliceArtifacts(contract, `${f.root}/project`).failures.includes('affected-role-empty:domain'));
    contract.backend.first_slice.artifacts[0].path='../slice.json';
    assert.ok(inspectFirstSliceArtifacts(contract, `${f.root}/project`).failures.some(x=>x.includes('relative-path-required')));
  } finally { f.cleanup(); }
});
