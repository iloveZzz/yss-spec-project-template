---
content_profile: plan-spec-v1
---

# 权限查看变更

> 虚构输入；仅为确定性 fixture，不代表已批准业务。

## 功能需求

| ID | 需求 | 优先级 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|
| FR-001 | 具有审批权限的审核员可查看本部门单据 | P0 | .template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H1 | AC-001 | 无 |
| FR-002 | 撤销审批权限后的后续查看请求拒绝且不显示单据内容 | P0 | .template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H2 | AC-002 | 无 |

## 非功能需求

| ID | 需求 | 适用条件/负载 | 指标及单位 | 目标 | 确认状态 | 验证方法 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|---|---|---|---|
| NFR-001 | 权限撤销传播时效 |  | 传播延迟 / 毫秒 | 未知 | 已确认 |  | .template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H4 | AC-002 | 无 |
| NFR-002 | 日志不包含单据正文 | 本次拒绝路径日志 | 检查：不存在单据正文 | 日志无单据正文 | 已确认 | 检查拒绝日志样本 | .template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H5 | AC-003 | 无 |

## 验收标准

| ID | 需求引用 | 前提 | 触发 | 可观察结果 | 场景类型 | 未决项 |
|---|---|---|---|---|---|---|
| AC-001 | FR-001 | 具有权限且单据属于本部门 | 查看单据 | 可见单据内容 | 成功 | 无 |
| AC-002 | FR-002, NFR-001 | 当前服务已读到撤销后的权限状态 | 发起后续查看 | 拒绝且不返回单据内容；传播窗口仍待确认 | 拒绝 / 状态变化 | Q-001 |
| AC-003 | NFR-002 | 请求被拒绝 | 检查该请求的日志 | 日志不存在单据正文 | 拒绝 | 无 |

## 未决项

| ID | 问题 | 判断依据 | 责任人 | 解决时点 | 接收方 / 解决证据 |
|---|---|---|---|---|---|
| Q-001 | 权限传播延迟目标未知；采集传播记录后由负责人确认 | .template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H4；冻结前补齐，不补造阈值 | 安全负责人（虚构角色） | Spec 冻结前 | 工程契约 / 待确认目标 |

## 非目标范围

不主动清除已返回客户端的历史内容。来源：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H3。不承诺即时全局失效；当前行为候选，按既有决定协议确认。
