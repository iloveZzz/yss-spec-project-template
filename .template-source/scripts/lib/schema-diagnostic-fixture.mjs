// Fixed synthetic adapter. These test approvals never authorize a real project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {pilotFixture} from '../../../scripts/fixtures/slice-contract-v3/pilot-fixture.mjs';
import {inspectSliceContract} from '../../../scripts/lib/slice-execution-preflight.mjs';
import {installSchemaProbe} from './python-schema-probe.mjs';

export function runSchemaDiagnosticScenario({trace=false,root=path.resolve(import.meta.dirname,'../../..')}={}) {
  const fixture=pilotFixture();
  let probe;
  try {
    assert.equal(fixture.contract.schema_version,3,'诊断只消费当前 Slice v3 fixture');
    const approved=fixture.approve();
    const options={root:fixture.root,approval_ref:approved.binding.approval_ref,work_unit_id:'work-unit.slice-backend'};
    // Setup intentionally precedes instrumentation: every observed validation belongs to a public call.
    probe=trace?installSchemaProbe({root}):null;
    const outcomes=[];
    const call=(id,expected,expectedSignal)=>{
      const invoke=()=>{
        try {
          const inspected=inspectSliceContract(approved.binding.ref,options);
          assert.equal(inspected.raw.schema_version,3);
          return {result:inspected.report.execution_allowed?'allowed':'blocked',blocking_signals:inspected.report.blockers};
        } catch(error) {
          if(error.code==='ERR_ASSERTION')throw error;
          return {result:'blocked',blocking_signals:[String(error.code||error.message).replaceAll(fixture.root,'<synthetic-root>')]};
        }
      };
      const outcome=probe?probe.withOperation({id,entrypoint:'inspectSliceContract'},invoke):invoke();
      assert.equal(outcome.result,expected,id);
      assert.deepEqual(outcome.blocking_signals,expectedSignal?[expectedSignal]:[],`${id}: 必须匹配当前场景的预期阻断原因`);
      outcomes.push({id,entrypoint:'inspectSliceContract',...outcome});
    };
    const start=performance.now();
    call('valid-1','allowed');
    call('valid-2','allowed');
    const spec=path.join(fixture.root,fixture.contract.basis.spec.ref),specBytes=fs.readFileSync(spec);
    fs.unlinkSync(spec);
    try {call('missing-source','blocked',`文件不可读: ${fixture.contract.basis.spec.ref}`);} finally {fs.writeFileSync(spec,specBytes);}
    call('restored-source','allowed');
    fs.appendFileSync(spec,'\n# synthetic source changed after binding\n');
    try {call('changed-source','blocked','slice-contract-invalid: stale: 上游依据 spec 原始字节变化');} finally {fs.writeFileSync(spec,specBytes);}
    call('restored-digest','allowed');
    const approval=path.join(fixture.root,approved.binding.approval_ref),approvalBytes=fs.readFileSync(approval);
    fs.unlinkSync(approval);
    try {call('missing-approval','blocked',`文件不可读: ${approved.binding.approval_ref}`);} finally {fs.writeFileSync(approval,approvalBytes);}
    call('restored-approval','allowed');
    const scenario_wall_ms=performance.now()-start;
    return {fixture:{slice_schema_version:3,kind:'synthetic-current-slice',approval:'synthetic-mechanism-only'},outcomes,scenario_wall_ms,...(probe?{trace:probe.report(),python_costs:probe.measurePython(5)}:{})};
  } finally {probe?.close();fixture.cleanup();}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  const {values}=parseArgs({options:{mode:{type:'string'}},strict:true});
  if(!['baseline','trace'].includes(values.mode))throw new Error('用法: schema-diagnostic-fixture.mjs --mode baseline|trace');
  console.log(JSON.stringify(runSchemaDiagnosticScenario({trace:values.mode==='trace'})));
}
