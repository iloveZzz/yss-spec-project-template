# 前版格式对照

> 虚构输入的表达兼容试验。原表字段内容全部保留在前版正文；不是历史批准或真实产品基线。

## 功能需求

| ID | 需求 | 优先级 | 备注 |
|---|---|---|---|
| FR-001 | 点击提交时检查本单据必需附件，缺少任一项时拒绝且保持草稿 | P0 | 来源：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S1；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S2；验收：AC-001；未决项：无 |
| FR-002 | 一次列出全部缺失附件名称，并保留当前页面已填数据 | P0 | 来源：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S3；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S4；验收：AC-001；未决项：无 |
| FR-003 | 补齐后重新提交并重新校验，齐全且其他条件满足时沿既有流程 | P0 | 来源：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S5；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S6；验收：AC-002；未决项：无 |

## 非功能需求

not-applicable：本样本未新增独立非功能目标。


## 验收标准

ID：AC-001；需求引用：FR-001, FR-002；前提：草稿缺少两项必需附件且页面有已填数据；触发：点击提交；可观察结果：拒绝提交；保持草稿；同时列出两项名称并保留当前页面数据；场景类型：拒绝 / 边界；未决项：无

ID：AC-002；需求引用：FR-003；前提：已补齐全部必需附件且其他提交条件满足；触发：再次点击提交；可观察结果：重新检查并沿既有流程提交；场景类型：恢复 / 成功；未决项：无


## 未决项

ID：Q-001；问题：读取附件清单失败时的行为待确认；安排需求澄清；判断依据：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S8；关键行为未知，不延期越过冻结；责任人：产品负责人（虚构角色）；解决时点：Spec 冻结前；接收方 / 解决证据：Spec 起草者 / 待取得真实决定


## 原始范围与限制



不校验附件真实性；不承诺刷新或关闭后的恢复。来源：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S7。读取清单失败时行为仍未知，验收例子不确定它。
