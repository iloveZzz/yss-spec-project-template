---
content_profile: plan-spec-v1
---

# 附件提交校验

> 虚构输入；仅为确定性 fixture，不代表已批准业务。

## 功能需求

| ID | 需求 | 优先级 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|
| FR-001 | 点击提交时检查本单据必需附件，缺少任一项时拒绝且保持草稿 | P0 | .template-spec/templates/examples/plan-spec/missing-source.md :: id:S1；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S2 | AC-001 | 无 |
| FR-001 | 一次列出全部缺失附件名称，并保留当前页面已填数据 | P0 | .template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S3；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S4 | AC-001 | 无 |
| FR-003 | 补齐后重新提交并重新校验，齐全且其他条件满足时沿既有流程 | P0 | .template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S5；.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S6 | AC-002 | 无 |

## 非功能需求

not-applicable：本样本未新增独立非功能目标。

## 验收标准

| ID | 需求引用 | 前提 | 触发 | 可观察结果 | 场景类型 | 未决项 |
|---|---|---|---|---|---|---|
| AC-001 | FR-001, FR-002 | 草稿缺少两项必需附件且页面有已填数据 | 点击提交 | 拒绝提交；保持草稿；同时列出两项名称并保留当前页面数据 | 拒绝 / 边界 | 无 |
| AC-002 | FR-099 | 已补齐全部必需附件且其他提交条件满足 | 再次点击提交 | 重新检查并沿既有流程提交 | 恢复 / 成功 | 无 |

## 未决项

| ID | 问题 | 判断依据 | 责任人 | 解决时点 | 接收方 / 解决证据 |
|---|---|---|---|---|---|
| Q-001 | 读取附件清单失败时的行为待确认；安排需求澄清 | .template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S8；关键行为未知，不延期越过冻结 | 产品负责人（虚构角色） | Spec 冻结前 | Spec 起草者 / 待取得真实决定 |

## 非目标范围

不校验附件真实性；不承诺刷新或关闭后的恢复。来源：.template-spec/templates/examples/plan-spec/ordinary-source.md :: id:S7。读取清单失败时行为仍未知，验收例子不确定它。
