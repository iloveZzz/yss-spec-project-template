import { existsSync } from './validation-phase.mjs';
import path from 'node:path';
import { read, safe, ensure } from './strategic-handoff-io.mjs';

// Wire work-unit IDs belong to the immutable source package. Only target routing is adapted.
export function consumerEntry(root, capability, sourceWorkUnit) {
  const scope = existsSync(path.join(root, '.yss-execution-scope.yaml')) ? read(safe(root, '.yss-execution-scope.yaml')) : null;
  const profile = existsSync(path.join(root, 'docs/process/harness-profile.yaml')) ? read(safe(root, 'docs/process/harness-profile.yaml')) : null;
  const contractRef = scope || !profile ? '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml' : '.agents/skills/harness-orchestrator/references/orchestration-contract.yaml';
  const contract = read(safe(root, contractRef));
  const target = scope?.scope_id || profile?.profile_id || 'yss-full-lifecycle';
  const policy = contract.consumer_entry_routes?.[target]?.[capability];
  ensure(policy && policy.source_work_unit === sourceWorkUnit, `consumer-entry-unmapped: ${target}/${capability}/${sourceWorkUnit}`);
  const registry = read(safe(root, 'docs/process/lifecycle-registry.yaml'));
  ensure(registry.work_units.some(unit => unit.id === policy.target_work_unit), 'consumer-entry-unknown-target');
  if (scope) {
    ensure(scope.schema_version === 1, 'consumer-entry-invalid-scope');
    ensure(contract.execution_scopes?.[scope.scope_id]?.allowed_work_units?.includes(policy.target_work_unit), 'consumer-entry-outside-scope');
  }
  if (profile) ensure(profile.lifecycle.allowed_work_units.includes(policy.target_work_unit), 'consumer-entry-outside-profile');
  return { capability, source_work_unit: sourceWorkUnit, target_work_unit: policy.target_work_unit, target_profile: target };
}

export function scopedConsumerCapabilities(root, fallback) {
  if (!existsSync(path.join(root, '.yss-execution-scope.yaml'))) return fallback;
  const scope = read(safe(root, '.yss-execution-scope.yaml'));
  const contract = read(safe(root, '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'));
  const capabilities = contract.execution_scopes?.[scope.scope_id]?.consumer_capabilities;
  ensure(scope.schema_version === 1 && Array.isArray(capabilities) && capabilities.length, 'consumer-scope-capabilities-missing');
  return capabilities;
}
