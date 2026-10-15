import path from 'node:path';
import {ROOT,read,safe,ensure,digest} from './strategic-handoff-io.mjs';
import {nativeEvidenceVerify,nativeContractVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';

const assetRef=(state,id,fallback)=>state?.[fallback]||state?.artifacts?.[id]?.ref||'';
export function inspectSpecBaselineSource(root,checkpointRef,expected) {
 const proof=nativeCoverage(nativeEvidenceVerify({root,group:'handoff',kind:'spec-baseline',file:checkpointRef,selector:'--checkpoint',needs:NEEDS.specBaselinePackage}),'spec_baseline_source');
 if(expected)ensure(digest(proof.source)===digest(expected),'Spec baseline manifest 与源 checkpoint 事实不一致');
 return proof;
}
// root 决定原生校验暂存外部包的位置（root/.work/native-candidates）；默认是模板根，夹具与并行测试应传入自己的临时根，避免互相观察到对方的暂存目录。
export function verifySpecBaselinePackage(packageRoot,{root=ROOT}={}) {
 const result=nativeEvidenceVerify({root,group:'handoff',kind:'spec-baseline',file:path.resolve(packageRoot),needs:NEEDS.specBaselinePackage});
 const source=nativeCoverage(result,'spec_baseline_source'),pack=nativeCoverage(result,'spec_baseline_package');
 return {...source,manifest:pack.manifest,sourceRoot:safe(path.resolve(packageRoot),pack.source_prefix)};
}
export function verifySpecBaselineBinding(state,{root=process.cwd(),requireReconciliation=true}={}) {
 const result=nativeContractVerify({root,kind:'spec-baseline-binding',document:state,extra:requireReconciliation?[]:['--no-reconciliation'],needs:NEEDS.specBaselineBinding});
 const binding=nativeCoverage(result,'spec_baseline_binding'),source=nativeCoverage(result,'spec_baseline_source'),pack=nativeCoverage(result,'spec_baseline_package');
 return {...source,manifest:pack.manifest,sourceRoot:safe(root,`${binding.receipt.package_ref}/${pack.source_prefix}`),...binding};
}

export function assertImportedSpecPrerequisite(state,{root=process.cwd()}={}) {
  const proof=verifySpecBaselineBinding(state,{root});
  const ref=assetRef(state,'artifact.spec','spec_ref');
  ensure(state.gates?.['gate.spec-baseline-approved']?.status==='approved'||!ref||ref===proof.specRef,'目标 checkpoint Spec 与导入基线不一致');
  return proof;
}

export function importedApprovalOrigin(root,binding) {
  const origin=binding?.approval_context?.source_baseline;if(!origin)return null;
  const receipt=read(safe(root,origin.receipt_ref)),manifest=read(safe(root,`${receipt.package_ref}/manifest.json`));
  const proof=verifySpecBaselineBinding({feature_id:manifest.source.feature_id,upstream_spec_baseline:{receipt_ref:origin.receipt_ref,receipt_digest:origin.receipt_digest},context_reconciliation:{ref:origin.context_reconciliation_ref}},{root});
  ensure([proof.source.spec_ref,proof.source.domain_strategy_ref,proof.source.stage_decision_package_ref,proof.source.plan_ref].filter(Boolean).includes(origin.source_ref),'不可继承该 Spec baseline 资产批准');
  ensure(binding.persisted_ref===`${proof.receipt.package_ref}/payload/files/${origin.source_ref}`,'继承批准资产引用与源快照不一致');
  return {...proof,origin};
}
