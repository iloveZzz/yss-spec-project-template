import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseSliceYaml, selectSliceWorkUnit } from './slice-contract.mjs';
import { inspectSliceContract } from './slice-execution-preflight.mjs';
import { inspectMaintenanceCandidate } from './maintenance-candidate.mjs';

const ensure = (condition, message) => { if (!condition) throw new Error(`backend-review: ${message}`); };
const text = value => typeof value === 'string' && value.trim();
const digest = value => createHash('sha256').update(value).digest('hex');
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  ensure(result.status === 0, `git ${args[0]} failed`); return result.stdout;
}
function file(root, ref) {
  ensure(text(ref) && !path.isAbsolute(ref), 'relative evidence reference required');
  const resolved = fs.realpathSync(path.resolve(root, ref));
  ensure(resolved.startsWith(`${fs.realpathSync(root)}${path.sep}`), 'evidence path escape');
  return resolved;
}

export function backendReviewSkills(contract, actualSkills = []) {
  return [...new Set([...(contract.resolution?.required_skills || []), ...(contract.common?.required_skills || []),
    ...(contract.backend?.required_skills || []), ...actualSkills, 'alibaba-java-code-style', 'yss-repository', 'yss-mybatis'])].sort();
}

/** Validate existing code-review result and constraint_results; this is not an approval authority. */
export function validateBackendReview(state, { root = process.cwd() } = {}) {
  const input = state?.review_input;
  ensure(input?.slice_contract_ref, 'review input must bind Slice contract');
  const loaded = inspectSliceContract(input.slice_contract_ref, { root, approval_ref: input.approval_ref, work_unit_id: input.work_unit_id });
  ensure(loaded.report.execution_allowed, `approved current contract required: ${loaded.report.blockers.join('; ')}`);
  const contract = selectSliceWorkUnit(loaded.contract, input.work_unit_id);
  if (contract.backend?.status !== 'required') return { status: 'not-applicable', reason: 'contract has no backend impact' };
  ensure(Array.isArray(input.actual_skill_impacts), 'actual_skill_impacts must be explicit (may be empty)');
  const result = parseSliceYaml(fs.readFileSync(file(root, state.review_result_ref), 'utf8'));
  ensure(result.skill === 'code-review' && result.result === 'completed', 'only completed code-review can proceed');
  ensure(result.contract_digest === loaded.binding.digest, 'review contract digest stale');
  for (const identity of ['reviewer','implementer']) {
    const actor = result[identity];
    for (const field of ['actor_id','runtime_id','instance_id']) ensure(text(actor?.[field]), `${identity}.${field} required`);
  }
  ensure(result.reviewer.actor_id !== result.implementer.actor_id && result.reviewer.instance_id !== result.implementer.instance_id, 'independent Reviewer required');
  ensure(result.implementer.actor_id === input.implementation_actor_id && result.implementer.instance_id === input.implementation_instance_id, 'implementation identity mismatch');
  ensure(result.candidate_digest === input.candidate_digest, 'candidate digest mismatch');
  const projectRoot = fs.realpathSync(path.resolve(root, input.project_root || '.'));
  ensure(contract.common.project_roots.some(ref => fs.realpathSync(path.resolve(root, ref)) === projectRoot), 'candidate project is outside approved contract');
  // Reuse the packed worktree candidate protocol. Its exclusions are restricted to review evidence.
  if (input.review_mode === 'worktree') {
    const { manifest, trackedDiff, entries } = inspectMaintenanceCandidate({ manifestPath: file(projectRoot, input.candidate_snapshot_ref) });
    ensure(manifest.candidate_digest === input.candidate_digest, 'snapshot digest mismatch');
    ensure(trackedDiff.equals(git(projectRoot, ['diff','--no-ext-diff','--binary','--full-index',manifest.merge_base])), 'tracked candidate stale');
    const excluded = manifest.excluded_paths || [];
    ensure(excluded.every(p => p.startsWith('.template-source/evidence/maintenance/') && !p.split('/').includes('..')), 'candidate exclusions must be evidence only');
    const actual = git(projectRoot, ['ls-files','-z','--others','--exclude-standard']).toString().split('\0').filter(Boolean)
      .filter(p => !excluded.some(ex => p === ex || p.startsWith(`${ex}/`))).sort();
    ensure(JSON.stringify(actual) === JSON.stringify(entries.map(e => e.path).sort()), 'untracked candidate inventory stale');
    for (const entry of entries) {
      const info = fs.lstatSync(path.resolve(projectRoot, entry.path));
      ensure(info.mode === entry.mode && (entry.kind === 'symlink' ? info.isSymbolicLink() : info.isFile()), `untracked candidate mode/kind stale: ${entry.path}`);
      const current = entry.kind === 'symlink' ? Buffer.from(fs.readlinkSync(path.resolve(projectRoot, entry.path))) : fs.readFileSync(file(projectRoot, entry.path));
      ensure(current.equals(entry.content), `untracked candidate stale: ${entry.path}`);
    }
  } else {
    ensure(input.review_mode === 'committed', 'unsupported candidate mode');
    const tree = git(projectRoot, ['rev-parse',`${input.implementation_candidate_ref}^{tree}`]).toString().trim();
    ensure(tree === input.candidate_digest, 'committed candidate mismatch');
    ensure(git(projectRoot, ['rev-parse','HEAD^{tree}']).toString().trim() === tree && !git(projectRoot, ['status','--porcelain']).length, 'committed candidate is not current clean checkout');
  }
  const layerSkills = { domain: 'yss-domain', application: 'yss-application', infrastructure: 'yss-repository', web: 'yss-web-controller' };
  const actualSkills = [...input.actual_skill_impacts, ...(contract.backend.affected_layers || []).map(layer => layerSkills[layer]).filter(Boolean)];
  const required = backendReviewSkills(contract, actualSkills);
  const applicable = new Set([...(contract.resolution?.required_skills || []), ...(contract.common?.required_skills || []), ...(contract.backend?.required_skills || []), ...actualSkills, "alibaba-java-code-style"]);
  ensure(Array.isArray(result.constraint_results), 'constraint_results required');
  for (const skill of required) {
    const rows = result.constraint_results.filter(row => row.skill === skill && row.axis === 'Standards');
    ensure(rows.length, `skill not reviewed: ${skill}`);
    for (const row of rows) {
      ensure(text(row.constraint) && text(row.rule_ref) && text(row.code_ref) && text(row.evidence_ref), `${skill}: rule/code/evidence required`);
      ensure(['passed','not-applicable'].includes(row.status), `${skill}: unresolved violation`);
      ensure(row.status !== 'not-applicable' || (text(row.reason) && !applicable.has(skill)), `${skill}: applicable skill cannot be waived`);
      ensure(row.rule_ref.startsWith(`.agents/skills/${skill}/`), `${skill}: rule must cite its canonical skill`);
      const rule = fs.readFileSync(file(root, row.rule_ref.split('#')[0]));
      ensure(digest(rule) === row.rule_digest, `${skill}: rule evidence stale`);
      ensure(fs.existsSync(file(projectRoot, row.code_ref.split(':')[0])), `${skill}: missing code location`);
      ensure(digest(fs.readFileSync(file(root, row.evidence_ref))) === row.evidence_digest, `${skill}: verification evidence stale`);
    }
  }
  ensure(Array.isArray(result.verification_results) && result.verification_results.length > 0, 'machine verification required');
  for (const check of result.verification_results) {
    ensure(text(check.command) && Number.isFinite(Date.parse(check.executed_at)) && check.exit_code === 0 && check.candidate_digest === result.candidate_digest, 'machine check failed, absent or stale');
    ensure(digest(fs.readFileSync(file(root, check.evidence_ref))) === check.evidence_digest, 'machine evidence stale');
  }
  ensure(result.axes?.Standards === 'passed' && result.axes?.Spec === 'passed', 'Standards and Spec must pass separately');
  ensure(Array.isArray(result.findings), 'findings required');
  for (const finding of result.findings) {
    ensure(!['violation','drift','new_impacts','missing_evidence'].includes(finding.disposition) || finding.status === 'resolved', 'blocking finding remains open');
    if (finding.disposition === 'suggestion' && finding.status !== 'resolved') ensure(text(finding.follow_up_ref), 'suggestion needs backlog reference');
  }
  return { status: 'passed', candidate_digest: input.candidate_digest, reviewed_skills: required };
}
