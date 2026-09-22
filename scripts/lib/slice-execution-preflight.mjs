import { withValidationPhase } from './validation-phase.mjs';
import { readSliceContract } from './slice-contract.mjs';
import { createApprovedExecutionContext } from './approved-execution-context.mjs';
import { evaluateContractFreshness, loadCompilerContract } from './implementation-contract-compiler.mjs';
import { loadSkillRegistry } from './skill-registry.mjs';

/** Readability, structure and execution approval are different levels of evidence. */
export function inspectSliceContract(ref, options = {}) {
  return withValidationPhase({root:options.root,purpose:'slice-inspect',slice_id:ref,work_unit_id:options.work_unit_id,readOnly:true,signal:options.signal},()=>inspect(ref,options));
}
function inspect(ref, { root = process.cwd(), approval_ref, work_unit_id } = {}) {
  const loaded = readSliceContract(ref, { root });
  const { contract, binding } = loaded;
  const checks = { readable: 'passed', structure: 'passed', approval: 'not-checked', freshness: 'not-checked' };
  const blockers = [];
  if (loaded.raw.schema_version === 2) {
    for (const [section, fields] of Object.entries(loadCompilerContract().slice_contract_required)) {
      const target = section === 'root' ? contract : contract[section];
      for (const field of fields) if (!target || !Object.hasOwn(target, field)) blockers.push(`missing:${section}.${field}`);
    }
    for (const section of ['common', 'resolution', 'backend']) {
      if (!Array.isArray(contract[section]?.required_skills)) blockers.push(`invalid:${section}.required_skills`);
    }
    if (!Array.isArray(contract.work_units) || !contract.work_units.length) blockers.push('slice-contract-work-units-missing');
    for (const unit of contract.work_units || []) {
      if (unit.contract_id !== contract.contract_id) blockers.push(`work-unit-contract-id-mismatch:${unit.id}`);
      if (unit.contract_version !== contract.contract_version) blockers.push(`work-unit-contract-version-mismatch:${unit.id}`);
      if (!unit.work_unit?.primary_skill) blockers.push(`work-unit-primary-skill-missing:${unit.id}`);
    }
    if (blockers.length) checks.structure = 'failed';
  }
  if (approval_ref && !blockers.length) {
    try {
      const approved_slice = { ...binding, approval_ref };
      const context = createApprovedExecutionContext(approved_slice, { root, contract, work_unit_id, readOnly: true });
      checks.approval = 'passed';
      const current = evaluateContractFreshness(contract, { root, registry: loadSkillRegistry(), compilerContract: loadCompilerContract(), approved_slice, work_unit_id, readOnly: true }, context);
      checks.freshness = current.freshness === 'current' ? 'passed' : 'failed';
      blockers.push(...current.reasons);
    } catch (error) {
      checks.approval = 'failed';
      blockers.push(error.code || error.message);
    }
  }
  return { ...loaded, report: { read_only: true, ...binding, checks, approval_validity: checks.approval,
    execution_allowed: !!approval_ref && !blockers.length && checks.freshness === 'passed', blockers } };
}
