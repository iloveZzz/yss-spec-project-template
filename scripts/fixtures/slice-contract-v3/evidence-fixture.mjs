// Synthetic result binding for mechanism tests only; never records a real tool run.
import fs from 'node:fs';
import path from 'node:path';
import {hash} from '../../lib/strategic-handoff-io.mjs';
import {normalizeSliceContract} from '../../lib/slice-contract.mjs';
export function bindSyntheticEvidence(result, raw, current) {
  const contract=normalizeSliceContract(raw,{root:current.root}), unit=contract.work_units.find(u=>u.id===result.work_unit_id);
  const evidenceRoot=contract.repositories?unit.project_root:current.root;
  result.evidence_binding_version=1;
  result.consumed_contract.contract_digest=current.approved_slice.digest;
  result.evidence_files=[];
  for(const check of unit.work_unit.verification) {
    const row=result.verification_results.find(r=>r.command===check.command&&r.cwd===check.cwd);
    Object.assign(row,{verification_id:check.id,acceptance_refs:check.acceptance_refs,evidence_refs:check.expected_evidence});
    for(const ref of check.expected_evidence)for(const ac of check.acceptance_refs)result.evidence_files.push({path:ref,...(contract.repositories?{project_root:unit.project_root}:{}),digest:hash(fs.readFileSync(path.join(evidenceRoot,ref))),behavior_ref:ac});
  }
  const changed=result.changed_files?.length?result.changed_files:[{path:'synthetic-source.txt',...(contract.repositories?{project_root:unit.project_root}:{})}];
  result.source_bindings=changed.map(item=>{
    const ref=typeof item==='string'?item:item.path, root=item.project_root||unit.project_root,file=path.join(root,ref);
    if(!fs.existsSync(file)){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'synthetic source fixture\n');}
    return {path:ref,...(contract.repositories?{project_root:root}:{}),digest:hash(fs.readFileSync(file))};
  });
  return result;
}
