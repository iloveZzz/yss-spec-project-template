// Synthetic mechanism fixture. No test approval is a real user or professional decision.
import fs from 'node:fs';
import path from 'node:path';
import { approvedFixture } from '../delivery-preflight/approved-execution-fixture.mjs';
import { buildDecisionFixture } from '../user-decision/build-fixture.mjs';
import { prepareSliceImplementationContract } from '../../lib/slice-contract-preparation.mjs';
import { normalizeSliceContract } from '../../lib/slice-contract.mjs';
import { stringify } from '../../vendor/yaml.mjs';
import { hash } from '../../lib/strategic-handoff-io.mjs';
import {read} from '../../lib/strategic-handoff-io.mjs';
import {countersignRuleForGate} from '../../lib/digital-human-roles.mjs';

export function pilotFixture({specText,apiRequired = true,nativeSeed,nativeReaders} = {}) {
  const f=approvedFixture('layered-mvc',{specText,nativeSeed,nativeReaders});
  const ticket=f.contract.lifecycle_refs.ticket;
  if(!nativeSeed) {
    f.write('.template-spec/process/lifecycle-registry.yaml',fs.readFileSync(new URL('../../../.template-spec/process/lifecycle-registry.yaml',import.meta.url),'utf8'));
    f.write('.template-spec/process/harness-process-tailoring.md',fs.readFileSync(new URL('../../../.template-spec/process/harness-process-tailoring.md',import.meta.url),'utf8'));
  }
  f.write(ticket,'# 提交申请\n\n## 要构建什么\n提交完整材料并保存申请。\n\n## 非目标\n无新增审批规则。\n\n## 验收标准\n- [ ] AC-1 完整材料提交成功，缺失材料拒绝。\n');
  let businessSupportingFiles=[];
  if(nativeSeed) {
    // Native consumers require the current formal business lineage. Keep the
    // installed policy intact and bind a typed implementation ticket to it.
    const setRef='.work/profile/business-ticket-set.yaml',businessRef='.work/profile/business-tickets/BT-1.md';
    const versioned=ref=>({ref,version:'v1',digest:hash(fs.readFileSync(path.join(f.root,ref)))});
    const business={schema_version:1,kind:'business-ticket',id:'BT-1',version:'v1',status:'ready-for-human',spec:versioned('spec.md'),requirement_refs:['FR-1'],acceptance_refs:['AC-1'],dependencies:[],source_refs:[],open_questions:[]};
    f.write(businessRef,`---\n${stringify(business)}---\n# 提交申请\n## 业务结果\n申请保存后进入审核。\n## 范围\n提交材料并校验完整性。\n## 非目标\n无支付变化。\n## 验收\nAC-1：完整材料提交成功，缺失材料拒绝。\n## 风险\n校验失败保留输入。\n`);
    const reviewRef='.work/profile/business-review.json',evidenceRef='.work/profile/business-review.log';
    f.write(setRef,{schema_version:1,kind:'business-ticket-set',id:'business-ticket-set.profile',version:'v1',status:'ready-for-human',spec:business.spec,tickets:[{id:business.id,...versioned(businessRef)}],coverage_deferred:[],review_ref:reviewRef});
    f.write(evidenceRef,'Synthetic independent scope/acceptance review, not a product approval.\n');
    f.write(reviewRef,{schema_version:1,kind:'business-ticket-review',result:'passed',subject_ref:setRef,subject_digest:versioned(setRef).digest,reviewer:'synthetic.business-reviewer',drafter:'synthetic.business-drafter',evidence:[versioned(evidenceRef)]});
    f.write(ticket,`---\n${stringify({kind:'vertical-slice-ticket',status:'ready-for-human',requirement_version:'v1',business_ticket_set_ref:setRef,business_ticket_refs:[business.id],acceptance_refs:['AC-1']})}---\n## 验收标准\n- AC-1 完整材料提交成功，缺失材料拒绝。\n`);
    businessSupportingFiles=[setRef,businessRef,reviewRef,evidenceRef];
  }
  f.write('api.yaml','openapi: 3.1.0\ninfo: {title: fixture, version: v1}\npaths: {}\n');
  f.write('project/mvnw','# synthetic wrapper reference; tests do not execute this file\n');
  const sources={ticket:{ref:ticket,version:'v1'},spec:{ref:'spec.md'},engineering_baseline:f.bindings.engineering_baseline,implementation_repository:f.bindings.repository_registration,repository_registration:'implementation_repository',manifest:f.bindings.manifest,technical_design:f.technical_design,architecture_review:{ref:'review.json'},build_architecture_checklist:{ref:'review.md'},backend_repository:'implementation_repository',maven_wrapper:{ref:'project/mvnw'},openapi_freeze:{ref:'api.yaml'}};
  if(nativeSeed)sources.business_ticket_set={ref:businessSupportingFiles[0]};
  // No duplication of commands, paths, or Skill closure across frontend/backend/task sections.
  const refinements={contract_id:f.contract.contract_id,contract_version:'v3-pilot',slice_id:f.contract.slice_id,scope:{impacted_areas:['backend','api'],implementation_path_policy:'external-repository-native',allowed_write_paths:['src/main/java'],forbidden_patterns:['不得绕过持久化约束']},applicability:{frontend:{status:'not-applicable',reason:'无 UI 变化'},backend:{status:'required'},api:{status:'required'},cross_repo:{status:'not-applicable',reason:'单个后端工程'}},recipe_ids:['backend.mvc-service-behavior','backend.mvc-http-api'],verification:{test:{command:'./mvnw test',cwd:f.project,expected_evidence:['results/test.log'],test_seams:['test-seam.success','test-seam.failure'],acceptance_refs:['AC-1']}},work_units:[{id:'work-unit.slice-backend',behavior:'提交申请并校验必填材料',role_id:'role.backend-engineer',primary_skill:'yss-web-controller',supporting_skills:['yss-application'],tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}],extensions:{backend:{affected_layers:['application','web'],component_impacts:[],design_refs:['pointer:/design']},api:{contract_tests:['test-seam.success','test-seam.failure']}}};
  if(!apiRequired) {
    const reason='Synthetic backend internal behavior has no API change.';
    sources.no_api_impact_record=f.write('no-api-impact.json',{status:'not-applicable',slice_id:refinements.slice_id,reason});
    delete sources.openapi_freeze;delete refinements.extensions.api;
    refinements.applicability.api={status:'not-applicable',reason};refinements.scope.impacted_areas=['backend'];
  }
  const prepared=(nativeReaders?.preparation.prepareSliceImplementationContract || prepareSliceImplementationContract)({root:f.root,ticket_ref:ticket,sources,refinements});
  if(prepared.report.blockers.length){f.cleanup();throw new Error(JSON.stringify(prepared.report.blockers));}
  const contract=prepared.slice_contract;
  function approve() {
    contract.status='approved';
    const binding={...f.write('slice-v3.yaml',stringify({slice_contract:contract})),id:contract.contract_id,version:contract.contract_version,approval_ref:'v3-checkpoint.json'};
    const n=(nativeReaders?.slice.normalizeSliceContract || normalizeSliceContract)(contract,{root:f.root});
    const scope={kind:'implementation-scope',slices:[{ticket_ref:ticket,contract:{ref:binding.ref,version:binding.version,digest:binding.digest},repositories:n.common.project_roots,allowed_write_paths:n.common.allowed_write_paths,baselines:[{...f.bindings.engineering_baseline,version:'v1'}]}]};
    f.write('v3-scope.json',scope);
    const decision=buildDecisionFixture(path.join(f.root,'v3-decision'),{boundary:'implementation-scope',scope:[ticket],subjectRef:path.join(f.root,'v3-scope.json')});
    const evidence=f.write('v3-review.log','Synthetic independent engineering review; never real pilot evidence.');
    const basis=[{ref:evidence.ref,digest:evidence.digest.slice(7)},{ref:ticket,digest:hash(fs.readFileSync(path.join(f.root,ticket))).slice(7)},{ref:f.bindings.engineering_baseline.ref,digest:f.bindings.engineering_baseline.digest.slice(7)}];
    const current={subject_ref:binding.ref,subject_digest:binding.digest.slice(7),approval_scope:[contract.slice_id],basis,drafter_principal_ref:'synthetic.slice-drafter',approval_ref:'v3-review.json'};
    const reviewRole=countersignRuleForGate(read(path.join(f.root,'.template-spec/agents/digital-human-roles.yaml')).gate_policy,'check.design-reviewed').countersigners.at(-1);
    const review={schema_version:1,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'digital-human',role_id:reviewRole,runtime_id:'runtime.generic',principal_ref:'synthetic.slice-reviewer',drafter_principal_ref:current.drafter_principal_ref,subject_ref:binding.ref,subject_digest:binding.digest.slice(7),approval_scope:current.approval_scope,basis,artifact_bindings:[{id:binding.id,version:binding.version,digest:binding.digest}],findings:[]};
    f.write('v3-review.json',review);
    const checkpoint={...structuredClone(f.checkpoint),checks:{'check.design-reviewed':{status:'approved',...current,evidence_refs:[evidence.ref]}},gates:{'gate.slice-contract-approved':{status:'approved',reason:'Synthetic v3 mechanism approval only',subject_ref:binding.ref,evidence_refs:['v3-review.json']}},human_review:{implementation:{slice_contract_ref:binding.ref,vertical_slice_ticket_ref:ticket},user_decisions:[decision.requirement]}};
    f.write(binding.approval_ref,checkpoint);
    return {binding,review,checkpoint,decision,scope};
  }
  return {...f,contract,prepared,sources,refinements,ticket,approve,businessSupportingFiles};
}
