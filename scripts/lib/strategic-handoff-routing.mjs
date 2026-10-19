import { existsSync, readFileSync } from './validation-phase.mjs';
import path from 'node:path';
import { read, safe, ensure } from './strategic-handoff-io.mjs';
import { readInstanceMetadata } from './instance-metadata.mjs';
import { loadOrchestrationContract } from './orchestration-contract.mjs';

const readContract = (root, ref) => loadOrchestrationContract(part => readFileSync(safe(root, part, { missing: true })), ref).value;

// Wire work-unit IDs belong to the immutable source package. Only target routing is adapted.
export function consumerEntry(root, capability, sourceWorkUnit) {
  const scope = existsSync(path.join(root, '.yss-execution-scope.yaml')) ? read(safe(root, '.yss-execution-scope.yaml')) : null;
  const profile = existsSync(path.join(root, '.template-spec/process/harness-profile.yaml')) ? read(safe(root, '.template-spec/process/harness-profile.yaml')) : null;
  const fullSpec = profile?.profile_id === 'harness.spec-template';
  if (fullSpec) {
    const identity = readInstanceMetadata(root);
    ensure(identity?.kind === 'native' && identity.profile === 'spec' && profile.instantiation?.cli_package === 'yss' && profile.instantiation?.native_profile === 'spec', 'consumer-entry-invalid-spec-profile');
  }
  const dedicated = profile && !fullSpec;
  if (dedicated) ensure(profile.profile_id === 'harness.backend-delivery' && Array.isArray(profile.lifecycle?.allowed_work_units), 'consumer-entry-invalid-profile');
  const contractRef = '.template-spec/process/orchestration-contract.yaml';
  const contract = readContract(root, contractRef);
  const target = scope?.scope_id || (dedicated ? profile.profile_id : 'yss-full-lifecycle');
  const policy = contract.consumer_entry_routes?.[target]?.[capability];
  ensure(policy && policy.source_work_unit === sourceWorkUnit, `consumer-entry-unmapped: ${target}/${capability}/${sourceWorkUnit}`);
  const registry = read(safe(root, '.template-spec/process/lifecycle-registry.yaml'));
  ensure(registry.work_units.some(unit => unit.id === policy.target_work_unit), 'consumer-entry-unknown-target');
  if (scope) {
    ensure(scope.schema_version === 1, 'consumer-entry-invalid-scope');
    ensure(contract.execution_scopes?.[scope.scope_id]?.allowed_work_units?.includes(policy.target_work_unit), 'consumer-entry-outside-scope');
  }
  if (dedicated) ensure(profile.lifecycle.allowed_work_units.includes(policy.target_work_unit), 'consumer-entry-outside-profile');
  return { capability, source_work_unit: sourceWorkUnit, target_work_unit: policy.target_work_unit, target_profile: target };
}

export function scopedConsumerCapabilities(root, fallback) {
  if (!existsSync(path.join(root, '.yss-execution-scope.yaml'))) return fallback;
  const scope = read(safe(root, '.yss-execution-scope.yaml'));
  const contract = readContract(root, '.template-spec/process/orchestration-contract.yaml');
  const capabilities = contract.execution_scopes?.[scope.scope_id]?.consumer_capabilities;
  ensure(scope.schema_version === 1 && Array.isArray(capabilities) && capabilities.length, 'consumer-scope-capabilities-missing');
  return capabilities;
}
