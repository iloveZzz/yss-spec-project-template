// Synthetic mechanism fixture. No test approval is a real user or professional decision.
import fs from 'node:fs';
import path from 'node:path';
import { approvedFixture } from '../delivery-preflight/approved-execution-fixture.mjs';
import { buildDecisionFixture } from '../user-decision/build-fixture.mjs';
import { prepareSliceImplementationContract } from '../../lib/slice-contract-preparation.mjs';
import { normalizeSliceContract } from '../../lib/slice-contract.mjs';
import { stringify } from '../../vendor/yaml.mjs';

export function pilotFixture() {
  const f=approvedFixture();
  const ticket=f.contract.lifecycle_refs.ticket;
  f.write('.template-spec/process/lifecycle-registry.yaml',fs.readFileSync(new URL('../../../.template-spec/process/lifecycle-registry.yaml',import.meta.url),'utf8'));
  f.write('.template-spec/process/harness-process-tailoring.md',fs.readFileSync(new URL('../../../.template-spec/process/harness-process-tailoring.md',import.meta.url),'utf8'));
  f.write(ticket,'# 提交申请\n\n## 要构建什么\n提交完整材料并保存申请。\n\n## 非目标\n无新增审批规则。\n\n## 验收标准\n- [ ] AC-1 完整材料提交成功，缺失材料拒绝。\n');
  f.write('api.yaml','openapi: 3.1.0\ninfo: {title: fixture, version: v1}\npaths: {}\n');
  f.write('project/mvnw','# synthetic wrapper reference; tests do not execute this file\n');
  const sources={ticket:{ref:ticket,version:'v1'},spec:{ref:'spec.md'},engineering_baseline:f.bindings.engineering_baseline,implementation_repository:f.bindings.repository_registration,repository_registration:'implementation_repository',manifest:f.bindings.manifest,technical_design:f.technical_design,architecture_review:{ref:'review.json'},build_architecture_checklist:{ref:'review.md'},backend_repository:'implementation_repository',maven_wrapper:{ref:'project/mvnw'},openapi_freeze:{ref:'api.yaml'}};
  // No duplication of commands, paths, or Skill closure across frontend/backend/task sections.
  const refinements={contract_id:f.contract.contract_id,contract_version:'v3-pilot',slice_id:f.contract.slice_id,scope:{impacted_areas:['backend','api'],implementation_path_policy:'external-repository-native',allowed_write_paths:['src/main/java'],forbidden_patterns:['不得绕过持久化约束']},applicability:{frontend:{status:'not-applicable',reason:'无 UI 变化'},backend:{status:'required'},api:{status:'required'},cross_repo:{status:'not-applicable',reason:'单个后端工程'}},recipe_ids:['backend.mvc-service-behavior','backend.mvc-http-api'],verification:{test:{command:'./mvnw test',cwd:f.project,expected_evidence:['results/test.log'],test_seams:['test-seam.success','test-seam.failure'],acceptance_refs:['AC-1']}},work_units:[{id:'work-unit.slice-backend',behavior:'提交申请并校验必填材料',role_id:'role.backend-engineer',primary_skill:'yss-web-controller',supporting_skills:['yss-application'],tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}],extensions:{backend:{affected_layers:['application','web'],component_impacts:[],design_refs:['pointer:/design']},api:{contract_tests:['test-seam.success','test-seam.failure']}}};
  const prepared=prepareSliceImplementationContract({root:f.root,ticket_ref:ticket,sources,refinements});
  if(prepared.report.blockers.length){f.cleanup();throw new Error(JSON.stringify(prepared.report.blockers));}
  const contract=prepared.slice_contract;
  function approve() {
    contract.status='approved';
    const binding={...f.write('slice-v3.yaml',stringify({slice_contract:contract})),id:contract.contract_id,version:contract.contract_version,approval_ref:'v3-checkpoint.json'};
    const n=normalizeSliceContract(contract,{root:f.root});
    const scope={kind:'implementation-scope',slices:[{ticket_ref:ticket,contract:{ref:binding.ref,version:binding.version,digest:binding.digest},repositories:n.common.project_roots,allowed_write_paths:n.common.allowed_write_paths,baselines:[{...f.bindings.engineering_baseline,version:'v1'}]}]};
    f.write('v3-scope.json',scope);
    const decision=buildDecisionFixture(path.join(f.root,'v3-decision'),{boundary:'implementation-scope',scope:[ticket],subjectRef:path.join(f.root,'v3-scope.json')});
    const review={schema_version:1,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'synthetic.slice-reviewer',drafter_principal_ref:'synthetic.slice-drafter',subject_ref:binding.ref,subject_digest:binding.digest.slice(7),artifact_bindings:[{id:binding.id,version:binding.version,digest:binding.digest}],findings:[]};
    f.write('v3-review.json',review);
    const checkpoint={...structuredClone(f.checkpoint),gates:{'gate.slice-contract-approved':{status:'approved',reason:'Synthetic v3 mechanism approval only',subject_ref:binding.ref,evidence_refs:['v3-review.json']}},human_review:{implementation:{slice_contract_ref:binding.ref,vertical_slice_ticket_ref:ticket},user_decisions:[decision.requirement]}};
    f.write(binding.approval_ref,checkpoint);
    return {binding,review,checkpoint,decision,scope};
  }
  return {...f,contract,prepared,sources,refinements,ticket,approve};
}
