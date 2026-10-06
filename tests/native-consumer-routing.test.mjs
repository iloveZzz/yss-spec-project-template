import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {consumerEntry} from '../scripts/lib/strategic-handoff-routing.mjs';

test('native Spec uses lifecycle authority and preserves explicit backend scope',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'native-route-'));
 const write=(ref,data)=>{const p=path.join(root,ref);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,typeof data==='string'?data:JSON.stringify(data));};
 try {
  const digest=createHash('sha256').update('{}').digest('hex');
  const profile={schema_version:2,profile_id:'harness.spec-template',instantiation:{cli_package:'yss',native_profile:'spec'}};
  const metadata={schemaVersion:2,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:'b'.repeat(64),manifestHash:'c'.repeat(64),bundleSchemaVersion:2,bundleHash:'d'.repeat(64),cliSourceState:'working-tree',variables:{},distribution:{},managedFiles:{},baselineDigest:digest};
  const route={source_work_unit:'work-unit.technical-design',target_work_unit:'work-unit.technical-analysis'};
  write('.yss.json',metadata);write('.template-spec/process/harness-profile.yaml',profile);
  write('.template-spec/process/lifecycle-registry.yaml',{work_units:[{id:route.target_work_unit}]});
  write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',{consumer_entry_routes:{'yss-full-lifecycle':{'backend-technical-design':route},'plan-to-backend':{'backend-technical-design':route}},execution_scopes:{'plan-to-backend':{allowed_work_units:[route.target_work_unit]}}});
  assert.equal(consumerEntry(root,'backend-technical-design',route.source_work_unit).target_profile,'yss-full-lifecycle');
  write('.yss-execution-scope.yaml',{schema_version:1,scope_id:'plan-to-backend'});
  assert.equal(consumerEntry(root,'backend-technical-design',route.source_work_unit).target_profile,'plan-to-backend');
  write('.yss.json',{...metadata,profile:'backend',profileId:'harness.backend-delivery'});
  assert.throws(()=>consumerEntry(root,'backend-technical-design',route.source_work_unit),/invalid-spec-profile/);
  write('.yss.json',metadata);write('.template-spec/process/harness-profile.yaml',{...profile,profile_id:'harness.unknown'});
  assert.throws(()=>consumerEntry(root,'backend-technical-design',route.source_work_unit),/invalid-profile/);
  write('.template-spec/process/harness-profile.yaml',{...profile,profile_id:'harness.backend-delivery',lifecycle:{allowed_work_units:[]}});
  assert.throws(()=>consumerEntry(root,'backend-technical-design',route.source_work_unit),/outside-profile/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
