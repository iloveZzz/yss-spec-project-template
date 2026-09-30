# 前版格式对照

> 虚构输入的表达兼容试验。原表字段内容全部保留在前版正文；不是历史批准或真实产品基线。

## 功能需求

| ID | 需求 | 优先级 | 备注 |
|---|---|---|---|
| FR-001 | 仅草稿可提交；其他状态拒绝重复提交且状态不变 | P0 | 来源：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C1；验收：AC-001；未决项：无 |
| FR-002 | 提交成功进入待审核；审批通过进入已生效；驳回回草稿并保留原因 | P0 | 来源：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C2；.template-spec/templates/examples/plan-spec/complex-source.md :: id:C3；验收：AC-002, AC-003；未决项：无 |
| FR-003 | 并发审批仅首个合法转换生效，后续提示状态变化 | P0 | 来源：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C4；验收：AC-004；未决项：无 |

## 非功能需求

not-applicable：本样本未新增独立非功能目标。


## 验收标准

ID：AC-001；需求引用：FR-001；前提：单据为已生效；触发：重复提交；可观察结果：拒绝，状态不变；场景类型：拒绝；未决项：无

ID：AC-002；需求引用：FR-002；前提：草稿满足其他提交条件；触发：提交后由审核员通过；可观察结果：依次进入待审核、已生效；场景类型：状态变化；未决项：无

ID：AC-003；需求引用：FR-002；前提：待审核单据；触发：审核员驳回并填写原因；可观察结果：回到草稿且原因可查看；场景类型：恢复；未决项：无

ID：AC-004；需求引用：FR-003；前提：两位审核员并发操作同一待审核版本；触发：首个通过，第二个驳回；可观察结果：首个转换生效，第二个显示状态已变化；场景类型：边界；未决项：无


## 未决项

ID：Q-001；问题：审批超时恢复策略未知，需确认失败恢复方式；判断依据：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C5；不承诺自动重试；责任人：业务负责人（虚构角色）；解决时点：冻结前；接收方 / 解决证据：Spec 起草者 / 待确认


## 原始范围与限制



不改变历史已生效单据，不增加补偿自动撤销。来源：.template-spec/templates/examples/plan-spec/complex-source.md :: id:C6
