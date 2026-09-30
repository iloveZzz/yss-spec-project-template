---
content_profile: plan-spec-v1
---

# 审批状态流程

> 虚构输入；仅为确定性 fixture，不代表已批准业务。

## 功能需求

| ID | 需求 | 优先级 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|
| FR-001 | 仅草稿可提交；其他状态拒绝重复提交且状态不变 | P0 | .template-spec/templates/examples/plan-spec/complex-source.md :: id:C1 | AC-001 | 无 |
| FR-002 | 提交成功进入待审核；审批通过进入已生效；驳回回草稿并保留原因 | P0 | .template-spec/templates/examples/plan-spec/complex-source.md :: id:C2；.template-spec/templates/examples/plan-spec/complex-source.md :: id:C3 | AC-002, AC-003 | 无 |
| FR-003 | 并发审批仅首个合法转换生效，后续提示状态变化 | P0 | .template-spec/templates/examples/plan-spec/complex-source.md :: id:C4 | AC-004 | 无 |

## 非功能需求

not-applicable：本样本未新增独立非功能目标。

## 验收标准

| ID | 需求引用 | 前提 | 触发 | 可观察结果 | 场景类型 | 未决项 |
|---|---|---|---|---|---|---|
| AC-001 | FR-001 | 单据为已生效 | 重复提交 | 拒绝，状态不变 | 拒绝 | 无 |
| AC-002 | FR-002 | 草稿满足其他提交条件 | 提交后由审核员通过 | 依次进入待审核、已生效 | 状态变化 | 无 |
| AC-003 | FR-002 | 待审核单据 | 审核员驳回并填写原因 | 回到草稿且原因可查看 | 恢复 | 无 |
| AC-004 | FR-003 | 两位审核员并发操作同一待审核版本 | 首个通过，第二个驳回 | 首个转换生效，第二个显示状态已变化 | 边界 | 无 |

## 未决项

| ID | 问题 | 判断依据 | 责任人 | 解决时点 | 接收方 / 解决证据 |
|---|---|---|---|---|---|
| Q-001 | 审批超时恢复策略未知，需确认失败恢复方式 | .template-spec/templates/examples/plan-spec/complex-source.md :: id:C5；不承诺自动重试 | 业务负责人（虚构角色） | 冻结前 | Spec 起草者 / 待确认 |

## 非目标范围

不改变历史已生效单据，不增加补偿自动撤销。来源：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C6
