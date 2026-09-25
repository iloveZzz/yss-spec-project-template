import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseSliceYaml, selectSliceWorkUnit } from './slice-contract.mjs';
import { validateApprovalRecord } from './approval-record.mjs';
import { inspectSliceContract } from './slice-execution-preflight.mjs';
import { inspectMaintenanceCandidate } from './maintenance-candidate.mjs';
import { compileStandardsCoverage, coverageDigest, coverageFile, verifyCoverageRows } from './backend-standards-coverage.mjs';

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
    ...(contract.backend?.required_skills || []), ...actualSkills, 'alibaba-java-code-style'])].sort();
}

/** Validate existing code-review result and constraint_results; this is not an approval authority. */
export function validateBackendReview(state, { root = process.cwd() } = {}) {
  const input = state?.review_input;
  ensure(['baseline','change'].includes(input?.scope_kind), 'scope_kind required; historical records are read-only');
  if (input.scope_kind === 'baseline') return validateBaselineReview(state, {root});
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
  const coverage = currentStandardsCoverage(input, {root, projectRoot, contract});
  verifyCoverageRows(coverage, result.constraint_results, {root, projectRoot});
  const required = coverage.skills.map(row => row.skill);
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

/** Recompute derived coverage, do not trust a submitted expected-rule list. */
export function currentStandardsCoverage(input, {root, projectRoot, contract=null}={}) {
  ensure(input.standards_coverage_ref && input.standards_coverage_digest, 'standards coverage binding required');
  const bytes=fs.readFileSync(file(root,input.standards_coverage_ref));
  ensure(digest(bytes)===input.standards_coverage_digest, 'standards coverage digest stale');
  const recorded=parseSliceYaml(bytes.toString());
  let comparison_ref=null;
  if(input.scope_kind==='change') {
    comparison_ref=input.review_mode==='worktree'
      ? inspectMaintenanceCandidate({manifestPath:file(projectRoot,input.candidate_snapshot_ref)}).manifest.merge_base
      : input.review_base_ref;
  }
  const current=compileStandardsCoverage({root,projectRoot,contract,scope_kind:input.scope_kind,
    baseline_binding:input.baseline_binding,comparison_ref,actual_skills:input.actual_skill_impacts||[],responsibility_evidence:input.responsibility_evidence||[]});
  ensure(coverageDigest(current)===coverageDigest(recorded),'standards coverage stale or incomplete');
  return current;
}

function validateBaselineReview(state,{root}) {
  const input=state.review_input,projectRoot=fs.realpathSync(path.resolve(root,input.project_root||'.'));
  const coverage=currentStandardsCoverage(input,{root,projectRoot});
  const result=parseSliceYaml(fs.readFileSync(file(root,state.review_result_ref),'utf8'));
  ensure(result.skill==='code-review' && result.result==='completed','independent code-review baseline report required');
  ensure(result.candidate_digest===coverageDigest(coverage.inventory) && input.candidate_digest===result.candidate_digest,'baseline candidate stale');
  for(const key of ['actor_id','runtime_id','instance_id'])ensure(text(result.reviewer?.[key])&&text(result.implementer?.[key]),'baseline actor identity required');
  ensure(result.reviewer.actor_id!==result.implementer.actor_id && result.reviewer.instance_id!==result.implementer.instance_id,'independent Reviewer required');
  ensure(result.implementer.actor_id===input.implementation_actor_id && result.implementer.instance_id===input.implementation_instance_id,'baseline actor mismatch');
  verifyCoverageRows(coverage,result.constraint_results,{root,projectRoot});
  ensure(result.axes?.Standards==='passed','Standards must pass');
  ensure(['passed','missing_evidence'].includes(result.axes?.Spec),'baseline Spec must be explicit');
  if(result.axes.Spec==='passed') {
    ensure(input.spec_binding?.ref && input.spec_binding?.digest,'approved Spec evidence binding required');
    ensure(digest(fs.readFileSync(file(root,input.spec_binding.ref)))===input.spec_binding.digest.replace(/^sha256:/,''),'Spec evidence stale');
    ensure(text(input.spec_binding.approval_ref),'Spec approval record required');
    const approval=parseSliceYaml(fs.readFileSync(file(root,input.spec_binding.approval_ref),'utf8'));
    validateApprovalRecord(approval,{root,requireApproved:true,rolesDoc:parseSliceYaml(fs.readFileSync(file(root,'.template-spec/agents/digital-human-roles.yaml'),'utf8'))});
    ensure(approval.gate_id==='gate.spec-baseline-approved' && approval.artifact_bindings?.some(b=>b.digest.replace(/^sha256:/,'')===input.spec_binding.digest.replace(/^sha256:/,'')),'Spec approval does not bind current baseline');
    ensure(Array.isArray(result.constraint_results)&&result.constraint_results.some(r=>r.axis==='Spec'&&r.status==='passed'&&text(r.evidence_ref)),'Spec acceptance evidence required');
    for(const row of result.constraint_results.filter(r=>r.axis==='Spec')) {
      ensure(row.status==='passed'&&text(row.constraint)&&text(row.code_ref)&&text(row.evidence_ref),'Spec acceptance unresolved');
      coverageFile(projectRoot,row.code_ref.split(':')[0]);
      ensure(digest(fs.readFileSync(file(root,row.evidence_ref)))===row.evidence_digest,'Spec acceptance evidence stale');
    }
  }
  ensure(Array.isArray(result.findings)&&result.findings.every(f=>f.disposition==='suggestion'||f.status==='resolved'||(f.disposition==='missing_evidence'&&f.axis==='Spec'&&result.axes.Spec==='missing_evidence')),'baseline blocking findings remain');
  ensure(Array.isArray(result.verification_results)&&result.verification_results.length,'baseline verification required');
  for(const check of result.verification_results)ensure(text(check.command)&&check.exit_code===0&&Number.isFinite(Date.parse(check.executed_at))&&check.candidate_digest===result.candidate_digest&&digest(fs.readFileSync(file(root,check.evidence_ref)))===check.evidence_digest,'baseline machine evidence missing or stale');
  return {status:'audited',axes:result.axes,execution_allowed:false,scope_kind:'baseline',candidate_digest:result.candidate_digest,reviewed_skills:coverage.skills.map(s=>s.skill)};
}
