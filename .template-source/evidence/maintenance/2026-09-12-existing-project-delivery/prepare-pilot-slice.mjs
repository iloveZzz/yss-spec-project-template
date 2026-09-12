import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/backend-governance';
const ref = 'docs/.scratch/target-preview-pilot/existing-v2';
const refreshHistory = `${ref}/history/compiler-contract-refresh-20260912`;
const contractRef = `${ref}/slice-contract.json`;
const approvalRef = `${ref}/slice-review-approval.json`;

const { compileDefaultImplementationContract, loadCompilerContract } = await import(
  pathToFileURL(`${root}/scripts/lib/implementation-contract-compiler.mjs`)
);
const { hash } = await import(pathToFileURL(`${root}/scripts/lib/strategic-handoff-io.mjs`));

const absolute = (name) => path.join(root, name);
const read = (name) => JSON.parse(fs.readFileSync(absolute(name), 'utf8'));
const write = (name, value) => {
  fs.mkdirSync(path.dirname(absolute(name)), { recursive: true });
  fs.writeFileSync(absolute(name), `${JSON.stringify(value, null, 2)}\n`);
};

const previousApproved = read(`${refreshHistory}/slice-contract-before.json`);
const previousApproval = read(`${refreshHistory}/slice-review-approval-before.json`);
const generatedCandidate = read(contractRef);
const previousDigest = hash(fs.readFileSync(absolute(`${refreshHistory}/slice-contract-before.json`)));

if (previousApproval.subject_digest !== previousDigest) {
  throw new Error('refresh-history-invalid: 旧批准没有绑定归档的旧合同原字节');
}

const regressionRef = `${refreshHistory}/slice-contract-regressed-generator-output.json`;
if (!fs.existsSync(absolute(regressionRef))) write(regressionRef, generatedCandidate);

// The recompilation context deliberately re-reads the original approved bytes at their
// persisted ref. Restore them only for compilation, then replace them with the new draft.
write(contractRef, previousApproved);
const input = read(`${ref}/compiler-input.json`);
input.approved_slice = {
  ref: contractRef,
  digest: hash(fs.readFileSync(absolute(contractRef))),
  id: previousApproved.contract_id,
  version: previousApproved.contract_version,
  approval_ref: approvalRef
};
const resolution = compileDefaultImplementationContract(input);

// A compiler refresh must preserve the complete, previously reviewed implementation
// contract. Only recomputed resolution and newly required compiler-owned common fields
// are changed; implementation commands, lifecycle evidence, task mapping and test seams
// continue to come from the approved contract.
const candidate = structuredClone(previousApproved);
candidate.status = 'draft';
candidate.resolution = resolution;
for (const field of ['quality_baseline_ref', 'context_plan', 'doubt_driven_review']) {
  if (!Object.hasOwn(generatedCandidate.common || {}, field)) {
    throw new Error(`refresh-input-invalid: 缺少新编译器字段 common.${field}`);
  }
  candidate.common[field] = structuredClone(generatedCandidate.common[field]);
}

const required = loadCompilerContract().slice_contract_required;
for (const [section, fields] of Object.entries(required)) {
  const owner = section === 'root' ? candidate : candidate[section];
  for (const field of fields) {
    if (!owner || !Object.hasOwn(owner, field)) {
      throw new Error(`refresh-output-invalid: 缺少 ${section}.${field}`);
    }
  }
}

write(`${ref}/resolution.json`, resolution);
write(contractRef, candidate);
write(`${ref}/slice-draft-verification.json`, {
  result: 'compiled-draft',
  compiled_at: resolution.compiled_at,
  identity: resolution.architecture_identity.source_kind,
  profile_maturity: resolution.profile_maturity,
  readiness_blockers: resolution.readiness_blockers,
  contract_digest: hash(fs.readFileSync(absolute(contractRef))),
  approval: 'not-approved-by-compiler',
  user_implementation_scope: 'stale-until-current-asset-confirmation',
  refresh_basis: {
    previous_contract_ref: `${refreshHistory}/slice-contract-before.json`,
    previous_contract_digest: previousDigest,
    preserved_sections: ['lifecycle_refs', 'readiness', 'architecture', 'frontend', 'backend', 'testing', 'contract', 'cross_repo', 'work_units'],
    updated_sections: ['status', 'resolution', 'common.quality_baseline_ref', 'common.context_plan', 'common.doubt_driven_review']
  }
});

console.log(`Current Slice draft refreshed without regressing reviewed task and evidence mappings: ${hash(fs.readFileSync(absolute(contractRef)))}`);
