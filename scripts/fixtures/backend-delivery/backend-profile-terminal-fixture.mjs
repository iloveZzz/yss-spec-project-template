// Synthetic protocol evidence. The receiver policy and consumers come unchanged
// from a real native Backend seed; these records never certify a product.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {terminalReviewFixture} from '../backend-standards/terminal-fixture.mjs';
import {fixture as strategicFixture} from '../strategic-handoff/fixture.mjs';
import {attachArtifactApproval} from './approval-fixture.mjs';
import {exportBundle} from '../../lib/strategic-handoff.mjs';
import {read,hash,files} from '../../lib/strategic-handoff-io.mjs';

export async function backendProfileTerminalFixture({nativeSeed,strategicInput,openapiBytes,environment,localEvidence=false}={}) {
  if(!nativeSeed)throw new Error('backendProfileTerminalFixture requires a real native Backend seed');
  nativeSeed=path.resolve(nativeSeed);
  const metadata=read(path.join(nativeSeed,'.yss.json'));
  if(metadata.profile!=='backend'||metadata.profileId!=='harness.backend-delivery')throw new Error('native seed must be the Backend profile');
  const load=ref=>import(pathToFileURL(path.join(nativeSeed,ref)));
  const nativeReaders={compiler:await load('scripts/lib/implementation-contract-compiler.mjs'),preparation:await load('scripts/lib/slice-contract-preparation.mjs'),slice:await load('scripts/lib/slice-contract.mjs')};
  const f=terminalReviewFixture({nativeSeed,nativeReaders,openapiBytes,specText:'---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-1 | 提交申请并校验必填材料。 |\n## 验收标准\n| ID | 需求引用 | 验收 |\n|---|---|---|\n| AC-1 | FR-1 | 提交成功或返回必填校验失败。 |\n'});
  try {
    const file=ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref)))});
    const producer=await import(pathToFileURL(path.join(f.root,'scripts/lib/backend-delivery.mjs')));
    const terminalModule=await import(pathToFileURL(path.join(f.root,'scripts/lib/backend-delivery-terminal.mjs')));
    const controls=await import(pathToFileURL(path.join(f.root,'scripts/lib/lifecycle-controls.mjs')));
    const registryModule=await import(pathToFileURL(path.join(f.root,'scripts/lib/lifecycle-registry.mjs')));
    const {validateJsonSchemas}=await import(pathToFileURL(path.join(f.root,'scripts/lib/json-schema.mjs')));
    const registry=registryModule.loadRegistry(path.join(f.root,'.template-spec/process/lifecycle-registry.yaml'));
    const rolesDoc=read(path.join(f.root,'.template-spec/agents/digital-human-roles.yaml'));
    let strategic;
    if(localEvidence) { strategic={bundle_digest:null}; }else if(strategicInput) {
      fs.cpSync(strategicInput.delivery,path.join(f.root,'strategy-package'),{recursive:true});
      strategic={bundle_digest:strategicInput.bundle_digest};
    }else {
      const sourceRoot=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-profile-strategic-source-')));
      try {
        await strategicFixture(sourceRoot,{handoffVersion:4,technicalDesign:true});
        strategic=await exportBundle({sourceRoot,handoffRef:'handoff.yaml',output:path.join(f.root,'strategy-package')});
      } finally {fs.rmSync(sourceRoot,{recursive:true,force:true});}
    }
    const api=attachArtifactApproval(f.root,'api.yaml','api.profile','gate.openapi-freeze-confirmed');
    const checkpoint=read(path.join(f.root,f.binding.approval_ref));
    const check=checkpoint.checks['check.design-reviewed'];
    const reviewRef=check.approval_ref;
    check.applicable=true;
    check.evidence={'evidence.contract-approval':[reviewRef],'evidence.approval-record':[reviewRef]};
    check.basis.push({ref:check.subject_ref,digest:file(check.subject_ref).digest.slice(7)},{ref:reviewRef,digest:file(reviewRef).digest.slice(7)});
    Object.assign(checkpoint.gates['gate.slice-contract-approved'],{basis:check.basis,evidence:{'evidence.contract-approval':[reviewRef]}});
    f.write(f.binding.approval_ref,checkpoint);
    controls.assertGateChecks('gate.slice-contract-approved',checkpoint,{root:f.root,registry,rolesDoc});
    f.write('profile-data.md','Synthetic current native Backend deployment data.');
    f.write('profile-deployment.log','Synthetic actual verification protocol; not product deployment.');
    const supporting=new Set(api.supportingFiles);
    for(const ref of f.businessSupportingFiles)supporting.add(ref);
    for(const binding of Object.values(f.contract.basis))if(binding?.ref)supporting.add(binding.ref);
    for(const ref of ['v3-scope.json','v3-review.json','v3-review.log'])supporting.add(ref);
    for(const prefix of ['v3-decision','.template-spec/process/schemas'])for(const ref of files(f.root,prefix))supporting.add(ref);
    for(const ref of ['.template-spec/process/lifecycle-registry.yaml','.template-spec/process/lifecycle-registry-baseline.json'])supporting.add(ref);
    const delivery={schema_version:1,delivery_id:'backend-delivery.profile',version:'v1',status:'verified',
      strategic_bundle_ref:'strategy-package',strategic_bundle_digest:strategic.bundle_digest,strategic_route_id:strategicInput?.route_id || 'route.backend',
      scope:{slice_id:f.contract.slice_id,source_ids:['rule.complete','scenario.submit'],operation_ids:['submitSupplier']},
      openapi:api.binding,slice_contract:f.binding,build:{source_commit:f.git('rev-parse','HEAD'),artifact_digest:`sha256:${'b'.repeat(64)}`},
      environment:{id:'profile-fixture',base_url:'http://127.0.0.1:1',deployment_id:'profile-fixture-v1',revision_path:'/version',revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},...environment,test_data:file('profile-data.md')},verification:{},supporting_files:[...supporting].sort()};
    if(localEvidence) {delivery.delivery_mode='local-evidence';for(const key of ['strategic_bundle_ref','strategic_bundle_digest','strategic_route_id'])delete delivery[key];}
    for(const [key,kind]of [['contract','backend-contract'],['deployment','backend-deployment']]) {
      f.write(`profile-${key}.json`,{schema_version:1,kind,subject_digest:producer.backendDeliveryBasis(delivery),results:[{command:'synthetic-current-native-verification',executed_at:new Date().toISOString(),exit_code:0,evidence:[file('profile-deployment.log')]}],operation_ids:['submitSupplier'],coverage:['success','failure'].map(outcome=>({source_id:'scenario.submit',outcome}))});
      delivery.verification[key]=file(`profile-${key}.json`);
    }
    f.write('profile-delivery.json',delivery);
    const fresh=attachArtifactApproval(f.root,'profile-delivery.json',delivery.delivery_id,'gate.fresh-verification-passed');
    const freshProof=read(path.join(f.root,fresh.binding.approval_ref));
    const freshContext=fresh.binding.approval_context;
    freshContext.basis.push(...Object.values(delivery.verification).map(row=>({ref:row.ref,digest:row.digest.slice(7)})));
    f.write(freshContext.subject_ref,{gate_id:'gate.fresh-verification-passed',...freshContext});
    freshProof.basis=freshContext.basis;freshProof.subject_digest=file(freshContext.subject_ref).digest.slice(7);
    f.write(fresh.binding.approval_ref,freshProof);
    checkpoint.gates['gate.fresh-verification-passed']={status:'approved',...freshContext,approval_ref:fresh.binding.approval_ref,
      subject_digest:freshProof.subject_digest,basis:[...freshContext.basis,{ref:freshContext.subject_ref,digest:freshProof.subject_digest},{ref:fresh.binding.approval_ref,digest:file(fresh.binding.approval_ref).digest.slice(7)}],
      reason:'Synthetic independent current verification approval; not product acceptance.',evidence_refs:[...freshContext.basis.map(row=>row.ref),freshContext.subject_ref,fresh.binding.approval_ref],
      evidence:{'evidence.fresh-verification':Object.values(delivery.verification).map(row=>row.ref),'evidence.test-verification':['profile-contract.json']}};
    const checkpointRef='.work/profile/checkpoint.json',terminalRef='.work/profile/backend-delivery.json';
    Object.assign(checkpoint,{feature_id:'feature.profile',stage:'stage.verification',next_work_unit:'work-unit.verification'});
    const shape=validateJsonSchemas([{value:checkpoint,schemaPath:path.join(f.root,'.template-spec/process/schemas/lifecycle-checkpoint.schema.json'),formatChecker:false}])[0];
    if(!shape.valid)throw new TypeError(`Synthetic native Backend checkpoint shape: ${shape.error}`);
    f.write(checkpointRef,checkpoint);f.write('.work/profile/map.md',`---\ncheckpoint_ref: ${checkpointRef}\n---\n# Synthetic Backend feature\n`);
    f.refreshCoverage();f.save();f.write('profile-review-state.json',f.state);
    const exported=localEvidence?null:await producer.exportBackendDelivery({sourceRoot:f.root,deliveryRef:'profile-delivery.json',output:path.join(f.root,'backend-package')});
    const terminal={checkpoint_ref:checkpointRef,delivery:file('profile-delivery.json'),review_state:file('profile-review-state.json'),...(localEvidence?{delivery_mode:'local-evidence'}:{bundle_ref:'backend-package',bundle_digest:exported.bundle_digest}),
      downstream:{owner:'synthetic-spec-coordinator',ticket_ref:'synthetic-profile-followup',verification_plan:'synthetic full business acceptance',target_version:'v1'}};
    const result=await terminalModule.completeBackendDelivery(f.root,terminal,{checkpointRef});
    return {...f,file,delivery,deliveryRef:'profile-delivery.json',checkpointRef,terminalRef,terminal,result,terminalModule};
  }catch(error){f.cleanup();throw error;}
}
