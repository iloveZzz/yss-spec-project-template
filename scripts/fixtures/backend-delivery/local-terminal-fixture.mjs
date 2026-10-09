// Synthetic evidence only; never product approval or delivery certification.
import fs from 'node:fs';
import path from 'node:path';
import {terminalReviewFixture} from '../backend-standards/terminal-fixture.mjs';
import {attachArtifactApproval} from './approval-fixture.mjs';
import * as producer from '../../lib/backend-delivery.mjs';
import {hash,read,ROOT} from '../../lib/strategic-handoff-io.mjs';
import {sliceCheckApplicability} from '../../lib/slice-applicability.mjs';

export function localBackendTerminalFixture({apiRequired = true,mixed = false} = {}) {
  const f=terminalReviewFixture({specText:'# 需求\nFR-1: 提交申请并校验必填材料。\nAC-1: 提交成功或返回必填校验失败。\n',apiRequired,
    refineContract:mixed?(contract,fixture)=>{
      // Synthetic bound inputs exercise backend responsibility in a mixed
      // approved Slice; they do not certify frontend design or acceptance.
      contract.applicability.frontend={status:'required'};
      contract.scope.impacted_areas.push('frontend');
      for(const key of ['requirement_freeze','low_fidelity_review','prototype_review','prototype_profile_decision','prototype_deliverable','prototype_deliverable_verification','prototype_confirmation','visual_baseline','state_matrix'])contract.basis[key]='spec';
      contract.extensions.frontend={visual_baseline_case_ids:['case.synthetic'],component_test_seams:['validate'],e2e_paths:['submit']};
      if(contract.applicability.checks)contract.applicability.checks=sliceCheckApplicability(contract.scope,read(path.join(fixture.root,'.template-spec/process/lifecycle-registry.yaml')));
    }:undefined});
  const file=ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref)))});
  const api=apiRequired?attachArtifactApproval(f.root,'api.yaml','api.local','gate.engineering-contract-approved'):{binding:{mode:'not-applicable',...file('no-api-impact.json'),reason:'Synthetic backend internal behavior has no API change.'},supportingFiles:[]};
  f.write('data.md','Synthetic current local deployment data.');f.write('deployment.log','Synthetic current contract/deployment evidence.');
  f.write('review-state.json',f.state);
  const delivery={schema_version:1,delivery_mode:'local-evidence',delivery_id:'backend-delivery.local',version:'v1',status:'verified',scope:{slice_id:f.contract.slice_id,source_ids:Object.keys(f.contract.acceptance),operation_ids:apiRequired?['submitSupplier']:[]},openapi:api.binding,slice_contract:f.binding,build:{source_commit:f.git('rev-parse','HEAD'),artifact_digest:`sha256:${'b'.repeat(64)}`},environment:{id:'local-fixture',base_url:'http://127.0.0.1:1',deployment_id:'local-fixture-v1',revision_path:'/version',revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},test_data:file('data.md')},verification:{},supporting_files:api.supportingFiles};
  function verification() {
    for(const [key,kind]of [['contract','backend-contract'],['deployment','backend-deployment']]) {
      f.write(`${key}.json`,{schema_version:1,kind,subject_digest:producer.backendDeliveryBasis(delivery),results:[{command:'synthetic-current-verification',executed_at:new Date().toISOString(),exit_code:0,evidence:[file('deployment.log')]}],operation_ids:delivery.scope.operation_ids,coverage:delivery.scope.source_ids.flatMap(source_id=>['success','failure'].map(outcome=>({source_id,outcome})))});
      delivery.verification[key]=file(`${key}.json`);
    }
    f.write('local-delivery.json',delivery);
  }
  verification();
  // Both readers consume the same complete current source assets. No missing
  // policy, schema or signing rule is patched into a receiver after generation.
  for(const ref of ['scripts','.template-spec/process/schemas','.template-spec/process/lifecycle-registry-baseline.json',
    '.template-spec/process/lifecycle-registry-baseline-v1.json','.template-spec/agents/yss-skill-registry.yaml','.agents/skills','skills-lock.json']) {
    fs.mkdirSync(path.dirname(path.join(f.root,ref)),{recursive:true});fs.cpSync(path.join(ROOT,ref),path.join(f.root,ref),{recursive:true});
  }
  if(mixed)f.state.review_input.work_unit_id='work-unit.slice-backend';
  f.refreshCoverage();f.save();f.write('review-state.json',f.state);
  return {...f,file,delivery,verification};
}

export function registerLocalBackendFeature(f,feature='local') {
  const checkpointRef=`.work/${feature}/checkpoint.json`;
  const featureID=`feature.${feature}`;
  f.write('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
  f.write('.yss.json',{schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',cliVersion:'1.3.2',templateVersion:'3.5.12',legacyCliVersion:'3.5.12',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:'b'.repeat(64),manifestHash:'c'.repeat(64),baselineDigest:hash(Buffer.from('{}')).slice(7),variables:{},distribution:{},managedFiles:{}});
  f.write('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(ROOT,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'),'utf8'));
  const profileRef='.template-spec/process/harness-profile.yaml';
  f.write(profileRef,fs.existsSync(path.join(ROOT,profileRef))?fs.readFileSync(path.join(ROOT,profileRef),'utf8'):
    {schema_version:2,profile_id:'harness.spec-template',instantiation:{cli_package:'create-yss-spec',metadata_file:'.yss-template.json',template_source:'github:iloveZzz/yss-spec-project-template'}});
  const checkpoint={...read(path.join(f.root,f.binding.approval_ref)),feature_id:featureID,artifacts:{'artifact.spec':f.file('spec.md')}};
  const check=checkpoint.checks['check.design-reviewed'],reviewRef=check.approval_ref;
  check.applicable=true;check.evidence={'evidence.contract-approval':[reviewRef],'evidence.approval-record':[reviewRef]};
  check.basis=[...check.basis,{ref:check.subject_ref,digest:f.file(check.subject_ref).digest.slice(7)},
    {ref:reviewRef,digest:f.file(reviewRef).digest.slice(7)}];
  Object.assign(checkpoint.gates['gate.slice-contract-approved'],{basis:check.basis,evidence:{'evidence.contract-approval':[reviewRef]}});
  f.write(checkpointRef,checkpoint);
  f.write(`.work/${feature}/map.md`,`---\ncheckpoint_ref: ${checkpointRef}\n---\n# Synthetic feature\n`);
  const target={schema_version:1,kind:'lifecycle-progression-target',feature_id:featureID,checkpoint_ref:checkpointRef,target:'backend-deliverable',intent_source:'Synthetic explicit local milestone',consumers:[]};
  f.write(`.work/${feature}/progression-target.json`,target);
  const terminal={delivery_mode:'local-evidence',checkpoint_ref:checkpointRef,delivery:f.file('local-delivery.json'),review_state:f.file('review-state.json'),downstream:{owner:'synthetic-owner',ticket_ref:'synthetic-followup',verification_plan:'synthetic unified acceptance',target_version:'v1'}};
  return {checkpointRef,target,terminal};
}
