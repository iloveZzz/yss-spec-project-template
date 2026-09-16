// Interpret the published lifecycle check, without creating a second gate registry.
export function sliceCheckApplicability(scope,registry) {
 if(!['low','medium','high'].includes(scope.risk_level))throw new TypeError('缺少明确风险等级，不能裁剪材料');
 if(scope.impacted_areas.some(impact=>!['ui','frontend','backend','api','data','persistence','domain','architecture','cross-repo','cross-boundary','high-risk'].includes(impact)))throw new TypeError('未知影响不能裁剪材料，先补影响分析');
 const check=registry.checks?.find(check=>check.id==='check.architecture-reviewed');
 // Unknown source rule revisions need an adapter update, never a local default.
 if(check?.trigger!=='高风险或跨边界变化。')throw new TypeError('不支持当前生命周期架构审查规则');
 const required=scope.risk_level==='high'||scope.impacted_areas.includes('high-risk')||scope.impacted_areas.some(impact=>['architecture','cross-repo','cross-boundary'].includes(impact))||scope.project_roots.length>1;
 return {[check.id]:{status:required?'required':'not-applicable',reason:`${check.trigger} 本切片风险 ${scope.risk_level}，影响 ${scope.impacted_areas.join(', ')||'无'}，工程数 ${scope.project_roots.length}。`}};
}
