import {withValidationPhase} from './validation-phase.mjs';
import {hash,schema} from './strategic-handoff-io.mjs';
import {viewContract,diffContract,validateKind,load,references} from './contract-views.mjs';
import {readingCheckpointsForAsset,checkReadingViews} from './reading-view-bundle.mjs';

// 工作流层：合同审查准备需要同时读取合同视图和阅读视图是否过期，所以放在 contract-views 之上。
export function prepareContractReview(beforeRef, afterRef, options = {}) {
  const root = options.root || process.cwd();
  return withValidationPhase({root,purpose:'prepare-contract-review',readOnly:true}, () => {
    validateKind(options.kind);
    const gaps = [];
    const gap = (code, source_ref, reason, recovery) => gaps.push({code,source_ref,reason,recovery});
    const readView = (ref, side, sourceRoot) => {
      try {
        const value = viewContract(ref,{...options,root:sourceRoot,profile:'full'});
        for(const blocker of value.blockers)gap('SOURCE_INVALID',ref,blocker,'恢复当前权威来源并重新校验');
        return value;
      } catch(error) { gap('SOURCE_UNREADABLE',ref,`${side}: ${error.message}`,'提供可读取的原始资产；不推断历史内容');return null; }
    };
    for(const checkpoint of readingCheckpointsForAsset(root,afterRef,options.kind)){
      const reading=checkReadingViews(root,checkpoint);
      if(reading.blockers.length)gap('READING_VIEWS_STALE',checkpoint,reading.blockers.join('; '),reading.recovery);
    }
    const before = readView(beforeRef,'before',options.beforeRoot||root), after = readView(afterRef,'after',root);
    if(before?.binding.id && after?.binding.id && before.binding.id!==after.binding.id)gap('IDENTITY_CONFLICT',afterRef,'前后资产 ID 不一致','选择同一资产的前后版本');
    if(before?.binding.version && before.binding.version===after?.binding.version && before.binding.digest!==after.binding.digest)gap('VERSION_CONFLICT',afterRef,'相同版本包含不同字节','形成新候选版本并重新核验');
    let diff = null;
    if(before&&after)try{diff=diffContract(beforeRef,afterRef,options);}catch(error){gap('DIFF_UNAVAILABLE',afterRef,error.message,'先修复来源绑定与版本冲突');}
    let originalDecision = null;
    if(options.decision_ref) {
      try {
        const loaded=load(options.decision_ref,root);
        schema(loaded.raw,'.template-spec/process/schemas/user-decision.schema.json');
        originalDecision={ref:options.decision_ref,digest:hash(loaded.bytes),record:loaded.raw};
        for(const row of references(loaded.raw,root))if(!row.current)gap('DECISION_SOURCE_STALE',row.ref,row.error||'原决定来源摘要不匹配','恢复原决定快照；不得重绑旧回复');
      }catch(error){gap('DECISION_UNAVAILABLE',options.decision_ref,error.message,'提供有效的原始决定；本材料不能替代用户回复');}
    }
    if(!options.decision_ref)gaps.push({code:'DECISION_NOT_PROVIDED',source_ref:null,reason:'未提供原决定，不能判断批准延续',recovery:'需要沿用批准时提供原决定及原始回复来源',blocking:false});
    return {
      schema_version:1,kind:'contract-review-preparation',read_only:true,execution_allowed:false,
      approval_reusable:false,approval_validity:'not-checked',semantic_equivalence:'requires-independent-review',
      before:before?.binding||null,after:after?.binding||null,original_decision:originalDecision,
      decision_status:options.decision_ref?(originalDecision?'requires-validation':'missing-or-invalid'):'not-provided',
      source_views:{before:before?.content||null,after:after?.content||null},diff,gaps,
      review_required:['business_scope','acceptance','contract_commitments','authorization','risk_acceptance','quality','external_commitments'],
      next_action:gaps.some(x=>x.blocking!==false)?'repair-source-gaps':'independent-semantic-review',
      blockers:gaps.filter(x=>x.blocking!==false).map(item=>item.reason)
    };
  });
}
