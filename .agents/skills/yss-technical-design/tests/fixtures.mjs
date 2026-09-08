import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { hash } from '../../../../scripts/lib/strategic-handoff-io.mjs';
import { technicalDigest } from '../scripts/validate-technical-design.mjs';
export function mvcFixture(root) {
  const files = {
    'CONTEXT.md': '# 业务上下文\n',
    'spec.md': '# 需求\nrule.valid: 必填材料完整。scenario.submit: 提交成功或校验失败。\n',
    'registration.json': JSON.stringify({ project_id: 'example', status: 'current', architecture_identity: { architecture_family: 'layered-mvc' } }),
    'review.md': '设计评审测试证据；不构成真实批准。\n'
  };
  for (const [ref, bytes] of Object.entries(files)) writeFileSync(path.join(root, ref), bytes);
  const data = {
    schema_version: 2, technical_design_id: 'technical-design.example', version: 'v1', status: 'ready-for-human', context_ref: 'CONTEXT.md',
    architecture: { family: 'layered-mvc', project_id: 'example', source_kind: 'existing-registration', decision_ref: 'registration.json', decision_digest: hash(readFileSync(path.join(root, 'registration.json'))) },
    inputs: ['CONTEXT.md','spec.md'].map((ref,index) => ({ kind: index ? 'spec' : 'context', ref, version: 'v1', digest: hash(readFileSync(path.join(root,ref))) })),
    source_items: [{ source_id: 'rule.valid', kind: 'rule', critical: false, source_ref: 'spec.md' }, { source_id: 'scenario.submit', kind: 'scenario', critical: true, source_ref: 'spec.md' }],
    traceability: ['rule.valid','scenario.submit'].map(source_id => ({ source_id, disposition: 'implemented', tactical_refs: ['use-case.submit'], test_seam_refs: ['test-seam.success','test-seam.failure'], evidence_refs: ['spec.md'], dependency_status: 'known', dependent_slice_refs: ['slice.submit'], scenario_tests: [{ outcome: 'success', seam_ref: 'test-seam.success' }, { outcome: 'failure', seam_ref: 'test-seam.failure' }] })),
    design: {
      module_catalog: [{ module_id: 'module.server', layer: 'server', responsibility: 'HTTP 适配', depends_on: ['module.service'] }, { module_id: 'module.service', layer: 'service', responsibility: '提交用例和事务', depends_on: ['module.repository'] }, { module_id: 'module.repository', layer: 'repository', responsibility: '数据持久化', depends_on: [] }],
      use_case_catalog: [{ use_case_id: 'use-case.submit', module_ref: 'module.service', flow: ['校验材料','保存申请'], rule_refs: ['rule.valid'], failure_handling: '材料不完整拒绝提交，写入失败回滚' }],
      rule_catalog: [{ rule_id: 'rule.valid', statement: '材料必须完整', use_case_refs: ['use-case.submit'] }],
      state_transition_catalog: [], state_not_applicable_reason: '本范围只登记申请，无状态流转',
      consistency_policy: { transaction_boundary: '一次提交同一事务', rollback: '写入失败整体回滚', concurrency: '唯一约束拒绝竞争提交', idempotency: '请求键唯一' },
      persistence_mapping: [{ mapping_id: 'mapping.application', use_case_ref: 'use-case.submit', repository_ref: 'module.repository', storage_model: 'application', notes: '请求键唯一' }],
      integration_catalog: [], integration_not_applicable_reason: '无外部集成',
      test_seams: [{ seam_id: 'test-seam.success', kind: 'service', subject_ref: 'use-case.submit', assertion: '完整材料保存成功' }, { seam_id: 'test-seam.failure', kind: 'service', subject_ref: 'use-case.submit', assertion: '缺材料时不写入' }]
    }, evidence_refs: ['review.md']
  };
  data.digest = technicalDigest(data);
  return data;
}
