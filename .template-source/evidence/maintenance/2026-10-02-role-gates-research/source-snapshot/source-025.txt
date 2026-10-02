import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {safe, hash, parse, ensure} from './strategic-handoff-io.mjs';
import {assertUserDecisionRequirement} from './user-decision.mjs';

export const RESEARCH_VALIDATOR = '.agents/skills/yss-research/scripts/validate-research-package.mjs';
const binding = (root, ref) => ({ref, digest: hash(fs.readFileSync(safe(root, ref)))});
function readBound(root, bound) {
  ensure(bound && binding(root, bound.ref).digest === bound.digest, 'research-evidence-stale');
  return fs.readFileSync(safe(root, bound.ref));
}
function execute(root, brief, evidence) {
  return spawnSync(process.execPath, [safe(root, RESEARCH_VALIDATOR), safe(root, brief), safe(root, evidence)], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
    env: {...process.env, NODE_OPTIONS: '', NODE_PATH: ''},
  });
}

/** Capture actual validator output; never overwrite a historical run. */
export function recordResearchVerification(root, brief, evidence, output) {
  const inputs = {brief: binding(root, brief), evidence: binding(root, evidence), validator: binding(root, RESEARCH_VALIDATOR)};
  const dir = safe(root, output, {missing: true});
  ensure(!fs.existsSync(dir), '研究验证输出目录必须不存在');
  const started_at = new Date().toISOString(), result = execute(root, brief, evidence);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || result.error?.message || '');
  const record = {schema_version: 1, kind: 'maintenance-research-verification', inputs,
    command: ['node', RESEARCH_VALIDATOR, brief, evidence], started_at, completed_at: new Date().toISOString(),
    exit_code: result.status, stdout: binding(root, `${output}/stdout.log`), stderr: binding(root, `${output}/stderr.log`)};
  for (const value of Object.values(inputs)) readBound(root, value);
  fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(record, null, 2) + '\n');
  return {binding: binding(root, `${output}/verification.json`), exit_code: result.status};
}

export function validateResearchCompletion(state, {root, continuing = false}) {
  ensure(state?.context_reconciliation?.status === 'not-applicable' && state.context_reconciliation.reason?.trim(), 'research-context-reason-missing');
  fs.readFileSync(safe(root, state.context_reconciliation.ref));
  for (const key of ['blocking_signals', 'drift', 'violation', 'new_impacts', 'stale_candidates']) {
    ensure(Array.isArray(state[key]) && state[key].length === 0, `research-${key}-unresolved`);
  }
  const record = parse(readBound(root, state.research_verification));
  ensure(record.schema_version === 1 && record.kind === 'maintenance-research-verification', 'research-verification-invalid');
  for (const key of ['brief', 'evidence', 'validator']) readBound(root, record.inputs?.[key]);
  ensure(record.inputs.validator.ref === RESEARCH_VALIDATOR, 'research-validator-mismatch');
  ensure(record.exit_code === 0 && Number.isFinite(Date.parse(record.started_at)) && Date.parse(record.completed_at) >= Date.parse(record.started_at), 'research-verification-not-passed');
  ensure(JSON.stringify(record.command) === JSON.stringify(['node', RESEARCH_VALIDATOR, record.inputs.brief.ref, record.inputs.evidence.ref]), 'research-command-mismatch');
  readBound(root, record.stdout); readBound(root, record.stderr);
  for (const ref of [state.context_reconciliation.ref, state.research_verification.ref, record.inputs.brief.ref, record.inputs.evidence.ref]) {
    ensure(state.evidence_refs?.includes(ref), `research-evidence-unreferenced: ${ref}`);
  }
  const current = execute(root, record.inputs.brief.ref, record.inputs.evidence.ref);
  ensure(!current.error && current.status === 0, 'research-current-validation-failed');
  readBound(root, state.research_verification);
  for(const value of Object.values(record.inputs))readBound(root,value);
  if (continuing) {
    const authorization = parse(readBound(root, state.maintenance_authorization));
    ensure(authorization.boundary === 'template-maintenance-scope' && authorization.scope?.includes('work-unit.ssot-update'), 'maintenance-authorization-required');
    assertUserDecisionRequirement(authorization, {root});
  }
  return record;
}
