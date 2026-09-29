// Presentation only: labels never change identifiers or decision values.
export const readingLabels=Object.freeze({
  'domain-strategy':'领域战略审阅','stage-decision-package':'阶段决策审阅',checkpoint:'阶段状态快照','tracking-migration':'跟踪迁移审阅',
  contexts:'业务责任区',subdomains:'业务板块',relationships:'协作与交接关系',rule_catalog:'业务规则',scenarios:'业务场景',concept_candidates:'关键业务对象候选',invariants:'不可违反的规则',downstream_mapping:'下游传播',context_snapshot:'术语来源',evidence_refs:'证据来源',approval:'批准记录',
  responsibilities:'负责事项',non_responsibilities:'不负责事项',owner:'负责人',status:'声明状态',statement:'规则内容',responsible_context:'责任区',preconditions:'前提条件',commands:'操作',rules:'适用规则',events:'业务事件',success_results:'成功结果',failure_results:'失败结果',consumers:'消费方',rule_refs:'规则引用',critical:'关键场景',
  problem_statement:'问题与目标',target_users:'目标用户',mvp:'本期范围',non_goals:'非目标',success_criteria:'成功标准',test_seams:'测试边界',confirmed_decisions:'已确认决定',assumptions:'假设',constraints:'约束',unresolved_items:'未决事项',domain_strategy_ref:'领域战略来源',impact_assessment:'影响面',
  stage:'当前阶段',next_work_unit:'下一工作单元',blockers:'已登记阻塞',stage_tracking:'阶段工作',items:'工作项',progress:'工作项进度',acceptance:'验收条件',dependencies:'依赖',completion:'完成证据',recheck_required:'需要重新检查',deferred:'延期安排',cancellation_reason:'取消原因',
  artifacts:'阶段资产',gates:'门禁登记',checks:'检查范围',verification:'验证记录',human_review:'人工审阅',context_reconciliation:'术语对账',ticket_sync:'Ticket 同步',git_checkpoint:'Git 授权记录',rollback:'回滚',
  changes:'文件变化',before:'修改前',after:'修改后',changed_refs:'变更文件',source_operation:'源操作结果',reading_update:'阅读材料更新',
  name:'名称',title:'标题',description:'说明',rationale:'依据',scope:'范围',type:'类型',next_action:'下一动作',target_version:'目标版本',semantic_upstream:'规则提供方',semantic_downstream:'规则使用方',business_authority:'业务决策权',transport_direction:'信息方向',translation_responsibility:'口径转换负责人',model_change_impact:'模型变更影响',direction_explanation:'方向说明',
});
export const escapeMarkdown=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_\[\]|])/g,'\\$1');
const scalar=value=>value===null?'null':String(value);
function textLines(value,indent=''){
  return scalar(value).split(/\r?\n/).map((line,index)=>`${index?'\n'+indent+'> ':''}${escapeMarkdown(line)}`).join('');
}
export function renderReadingValue(value,depth=0){
  if(value===null||typeof value!=='object')return textLines(value);
  const entries=Object.entries(value);
  if(!entries.length)return Array.isArray(value)?'[]（来源明确为空）':'{}（来源明确为空）';
  return entries.map(([key,child])=>{
    if(Array.isArray(value)&&(child===null||typeof child!=='object'))return '- '+textLines(child).replace(/\n/g,'\n  ');
    const label=Array.isArray(value)?`第 ${Number(key)+1} 项`:escapeMarkdown(readingLabels[key]||key);
    const rendered=renderReadingValue(child,depth+1).split('\n');
    return child!==null&&typeof child==='object'&&Object.keys(child).length?`- **${label}**：\n${rendered.map(line=>'  '+line).join('\n')}`:`- **${label}**：${rendered[0]}${rendered.slice(1).map(line=>'\n  '+line).join('')}`;
  }).join('\n');
}
export function renderReadingMarkdown(view){
  const lines=[`# ${readingLabels[view.kind]||view.kind} · ${escapeMarkdown(view.binding.id||view.binding.ref)}`,
    `版本：${escapeMarkdown(view.binding.version||'源资产未声明')}；权威文件：${escapeMarkdown(view.binding.ref)}`,
    `来源 SHA-256：${view.binding.digest}`,
    '本页为来源快照；当前有效性需重新检查。批准有效性未核验；本视图不授予执行权限。',
    `检查范围：${view.checks.map(escapeMarkdown).join('；')}`];
  for(const [key,value]of Object.entries(view.content))if(value!==undefined){
    lines.push(`## ${readingLabels[key]||escapeMarkdown(key)}`,key==='正文'&&typeof value==='string'?value:renderReadingValue(value));
  }
  if(view.blockers.length)lines.push('## 阻断与未决检查',...view.blockers.map(item=>`- ${escapeMarkdown(item)}`));
  return lines.join('\n\n')+'\n';
}
