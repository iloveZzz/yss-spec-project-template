import {readFileSync,existsSync} from './validation-phase.mjs';
import {safe, hash} from './strategic-handoff-io.mjs';

/** Checks binding, not the truth of arbitrary prose. Owner tests/review remain mandatory. */
export function executionEvidenceBlockers(result, contract, current) {
  const blockers=[];
  if(result.evidence_binding_version!==1)return ['legacy-evidence-binding-missing'];
  const unit=contract.work_units.find(u=>u.id===result.work_unit_id);
  if(!unit)return ['work-unit-mismatch'];
  try {
    const approved=current.approved_slice;
    if(!approved || result.consumed_contract?.contract_digest!==approved.digest || hash(readFileSync(safe(current.root,approved.ref)))!==approved.digest)blockers.push('evidence-contract-digest-mismatch');
    const evidence=result.evidence_files||[];
    const checks=unit.work_unit.verification;
    const evidenceRoot=contract.repositories?unit.project_root:current.root;
    for(const check of checks) {
      const rows=(result.verification_results||[]).filter(r=>r.verification_id===check.id);
      if(rows.length!==1){blockers.push('verification-id-missing-or-duplicate');continue;}
      const row=rows[0];
      if(row.command!==check.command||row.cwd!==check.cwd||row.exit_code!==0||!Number.isFinite(Date.parse(row.executed_at)))blockers.push('verification-binding-mismatch');
      if(!Array.isArray(row.acceptance_refs)||row.acceptance_refs.length!==new Set(row.acceptance_refs).size||JSON.stringify([...row.acceptance_refs].sort())!==JSON.stringify([...check.acceptance_refs].sort()))blockers.push('acceptance-evidence-coverage-missing');
      if(!Array.isArray(row.evidence_refs)||!check.expected_evidence.every(ref=>row.evidence_refs.includes(ref)))blockers.push('verification-evidence-link-missing');
      const covered=new Set();
      for(const ref of row.evidence_refs||[]) {
        const matches=evidence.filter(e=>typeof e==='object'&&e.path===ref&&(!contract.repositories||e.project_root===unit.project_root));
        if(!matches.length)blockers.push('verification-evidence-link-missing');
        for(const entry of matches) {
          if(!check.acceptance_refs.includes(entry.behavior_ref))blockers.push('evidence-behavior-unrelated');
          else covered.add(entry.behavior_ref);
          if(hash(readFileSync(safe(evidenceRoot,ref)))!==entry.digest)blockers.push('evidence-digest-mismatch');
        }
      }
      if(check.acceptance_refs.some(id=>!covered.has(id)))blockers.push('acceptance-evidence-coverage-missing');
    }
    // Bind declared execution inputs too: changed source bytes cannot reuse an earlier result.
    if(!Array.isArray(result.source_bindings)||!result.source_bindings.length)blockers.push('execution-source-bindings-missing');
    for(const entry of result.source_bindings||[]) {
      const root=entry.project_root||unit.project_root;
      const allowedRoots=new Set([unit.project_root,...checks.flatMap(check=>check.dependency_roots||[])]);
      if(!allowedRoots.has(root)||(contract.repositories&&!contract.repositories[root])){blockers.push('execution-source-repository-mismatch');continue;}
      if(entry.deleted===true) {
        if(existsSync(safe(root,entry.path,{missing:true})) || entry.digest!==null)blockers.push('execution-source-drift');
      } else if(hash(readFileSync(safe(root,entry.path)))!==entry.digest)blockers.push('execution-source-drift');
    }
    for(const changed of result.changed_files||[]) {
      const ref=typeof changed==='string'?changed:changed.path;
      if(!result.source_bindings?.some(b=>b.path===ref&&(b.project_root||unit.project_root)===(typeof changed==='object'&&changed.project_root||unit.project_root)))blockers.push('changed-source-binding-missing');
    }
  } catch(error) {blockers.push(`execution-evidence-unreadable: ${error.message}`);}
  return [...new Set(blockers)];
}
