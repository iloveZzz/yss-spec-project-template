import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { terminalReviewFixture } from '../../../../scripts/fixtures/backend-standards/terminal-fixture.mjs';
import { fixture as strategyFixture } from '../../../../scripts/fixtures/strategic-handoff/fixture.mjs';
import { attachArtifactApproval } from '../../../../scripts/fixtures/backend-delivery/approval-fixture.mjs';
import { exportBundle } from '../../../../scripts/lib/strategic-handoff.mjs';
import { exportBackendDelivery, backendDeliveryBasis } from '../../../../scripts/lib/backend-delivery.mjs';
import { completeBackendDelivery, verifyBackendDeliveryTerminal } from '../../../../scripts/lib/backend-delivery-terminal.mjs';
import { hash, read, ROOT } from '../../../../scripts/lib/strategic-handoff-io.mjs';
import { assertScopeWorkUnit } from '../../../../scripts/lib/lifecycle-execution-scope.mjs';

test('real validators close a synthetic backend package, preserve the terminal across resume and reject stale review/source',async t=>{
  const f=terminalReviewFixture();t.after(()=>f.cleanup());
  const source=path.join(f.root,'strategy-source');fs.mkdirSync(source);
  await strategyFixture(source,{handoffVersion:4});
  const strategy=await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output:path.join(f.root,'strategy-package')});
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),'utf8'));
  f.write('.yss-execution-scope.yaml',{schema_version:1,scope_id:'plan-to-backend'});
  const roles=read(path.join(f.root,'docs/agents/digital-human-roles.yaml'));
  // Synthetic source policy for the fixture's existing OpenAPI gate.
  roles.gate_policy.biological_human=roles.gate_policy.biological_human.filter(x=>x!=='gate.openapi-frozen');
  roles.gate_policy.digital_human_review.push({gate:'gate.openapi-frozen',countersigners:['role.product-manager']});
  f.write('docs/agents/digital-human-roles.yaml',roles);
  const api=attachArtifactApproval(f.root,'api.yaml','api.synthetic','gate.openapi-frozen');
  const file=ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref)))});
  f.write('data.md','Synthetic data');f.write('delivery-check.log','Synthetic success/failure evidence. Not real service validation.');
  const delivery={schema_version:1,delivery_id:'backend-delivery.synthetic',version:'v1',status:'verified',strategic_bundle_ref:'strategy-package',strategic_bundle_digest:strategy.bundle_digest,strategic_route_id:'route.backend',scope:{slice_id:f.contract.slice_id,source_ids:['rule.complete','scenario.submit'],operation_ids:['submitSupplier']},openapi:api.binding,slice_contract:f.binding,build:{source_commit:f.git('rev-parse','HEAD'),artifact_digest:`sha256:${'b'.repeat(64)}`},environment:{id:'synthetic-local',base_url:'http://127.0.0.1:1',deployment_id:'synthetic-v1',revision_path:'/version',revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},test_data:file('data.md')},verification:{},supporting_files:[]};
  for(const [name,kind]of [['contract','backend-contract'],['deployment','backend-deployment']]) {
    f.write(`${name}-test.json`,{schema_version:1,kind,subject_digest:backendDeliveryBasis(delivery),results:[{command:'synthetic mechanism verification',exit_code:0,executed_at:new Date().toISOString(),evidence:[file('delivery-check.log')]}],operation_ids:['submitSupplier'],coverage:[{source_id:'scenario.submit',outcome:'success'},{source_id:'scenario.submit',outcome:'failure'}]});
    delivery.verification[name]=file(`${name}-test.json`);
  }
  // Capture every governance dependency used by the real approval and v3 normalizer.
  function all(dir,prefix='') {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const ref=prefix?`${prefix}/${e.name}`:e.name;if(['project','strategy-source','strategy-package'].includes(ref)||e.name==='.git')return[];return e.isDirectory()?all(path.join(dir,e.name),ref):[ref];});}
  delivery.supporting_files=[...all(f.root).filter(ref=>!['coverage.json','review-result.json','checks.log','skills-lock.json'].includes(ref)),'project/mvnw'];
  f.write('delivery.json',delivery);f.write('review-state.json',f.state);
  const exported=await exportBackendDelivery({sourceRoot:f.root,deliveryRef:'delivery.json',output:path.join(f.root,'delivery-package')});
  const input={delivery:file('delivery.json'),review_state:file('review-state.json'),bundle_ref:'delivery-package',bundle_digest:exported.bundle_digest,downstream:{owner:'synthetic-receiver',ticket_ref:'tickets/frontend.md',verification_plan:'receiver tests',target_version:'v1'}};
  for(const ref of ['scripts','docs/process/schemas','docs/process/lifecycle-registry-baseline.json','docs/agents/yss-skill-registry.yaml','.agents/skills','skills-lock.json']) {
    fs.mkdirSync(path.dirname(path.join(f.root,ref)),{recursive:true});fs.cpSync(path.join(ROOT,ref),path.join(f.root,ref),{recursive:true});
  }
  f.refreshCoverage();f.save();f.write('review-state.json',f.state);input.review_state=file('review-state.json');
  const result=await completeBackendDelivery(f.root,input);
  assert.equal(result.result,'backend-delivered');assert.equal(result.business_completed,false);assert.equal(result.live_service_checked,false);
  assert.equal((await verifyBackendDeliveryTerminal(f.root)).bundle_digest,exported.bundle_digest);
  await assert.rejects(completeBackendDelivery(f.root,input),/终点已存在/);
  // Scope entry fails closed after a restart even when the original approval still exists.
  assert.throws(()=>assertScopeWorkUnit('work-unit.slice-implementation',{root:f.root}),/后端交付已完成/);
  f.write('checks.log','stale independent review evidence');
  await assert.rejects(verifyBackendDeliveryTerminal(f.root),/evidence stale|摘要|stale/);
});
