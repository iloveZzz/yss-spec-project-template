---
status: ready-for-human
owner: ai
---

# 生命周期 Skill 精简验证

> 日期：2026-08-09
> 仓库身份：`template-source`
> 方法：`writing-skills` RED / GREEN / REFACTOR
> 约束：不修改 Matt skills 权威内容。

## RED 基线

只读 Reviewer 使用修改前的生命周期、裁剪、Router 和工作单元映射模拟“已有功能、API 与领域规则局部扩展”的中等变更。基线自然导出：

- `domain-modeling` 与 `yss-domain-modeling` 连续调用，二者都覆盖术语、边界、规则、`CONTEXT.md` 和 ADR 判断。
- `code-review` 与 `code-review-process` 连续调用；前者内部已有 Standards / Spec 两轴审查，后者再次执行质量与合并门禁。
- Review 和 fresh verification 被表达为两个角色，但硬规则只要求二者独立于实现者，没有要求必须由两个人承担。
- 连续经过 7 个受影响阶段时，旧规则至少产生 7 次 Ticket 同步和 7 次 Git checkpoint 判断。

基线失败结论：技能入口重复，执行者拆分和阶段 checkpoint 频率超过风险控制所需。

## GREEN 规则

- 删除 `code-review-process` 和 `yss-domain-modeling`；YSS 流程分别收敛到未修改的 Matt `code-review`、`domain-modeling`。
- `yss-product-lifecycle` 是 YSS 直接入口；用户显式调用 `ask-matt` 时才走通用导航。
- Setup readiness 每个任务检查一次，仅在 tracker、主远端、真实标签或配置变化时重查。
- 小改动和中等变更允许同一独立执行者完成 Review 与 fresh verification；实现者不得兼任。新模块、高风险、职责冲突或双人控制要求命中时拆分。
- 连续自动推进期间累积证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint。
- 普通架构设计只使用 `codebase-design`；`improve-codebase-architecture` 仅由难测模块、依赖恶化或明确重构目标触发。
- `prototype-review` 仅由主流程、导航、权限、异常/恢复状态、状态流转或 API 反推影响触发；无行为影响的局部视觉改动记录 `not-applicable`。
- OpenAPI YAML、`$ref`、path parameter 和 lint 由自动化提供新鲜证据；人工审查只处理 P0、权限、错误、并发、安全和测试 seam 等语义。

## 验证命令

```text
scripts/verify-lifecycle-scenarios
scripts/verify-yss-router-scenarios
scripts/update-skill-lock --check
scripts/sync-skills --check
scripts/verify-template
```

## 人工审查点

- 确认集中 checkpoint 仍保留各阶段因果关系和资产批准记录。
- 确认低中风险合并执行没有把实现者变成 Reviewer/Verifier。
- 确认 Matt skill 文件及其上游语义没有被修改。

## GREEN 验证结果

| 验证 | 结果 |
|---|---|
| `scripts/verify-lifecycle-scenarios` | 通过 |
| `scripts/verify-yss-router-scenarios` | 通过 |
| `scripts/update-skill-lock --check` | 通过 |
| `scripts/sync-skills --check` | 通过 |
| `git diff --check` | 通过 |
| 隔离工作区 `scripts/verify-template` | 通过 |

原工作区直接执行 `scripts/verify-template` 时，被未跟踪的 `docs/process/presentations/**/node_modules` 和该演示源文件的相对链接阻断；隔离排除这些既有未跟踪资产后总门禁通过。本次未修改或删除这些用户资产。

## REFACTOR 独立审查

独立 Reviewer 发现初版集中 checkpoint 规则与 `AGENTS.md` 原有逐阶段硬门禁冲突，并指出多份派生说明仍保留旧规则。已修订 `AGENTS.md` 单一事实来源，同步 GitLab 指南、执行蓝图、优化 backlog 和用户指南，并在 `scripts/verify-lifecycle-scenarios` 增加旧语义回归断言。

第二轮审查进一步发现产品设计影响口径、`domain-modeling` 强制闭包和集中 checkpoint 证据结构不足。已将产品设计影响限定为主流程 / 导航 / 权限 / 异常恢复 / 状态流转 / API 反推；将 `domain-modeling` 改为术语、边界或 ADR 变化时的条件依赖；并为 checkpoint 增加 `stage/upstream_refs/artifact_refs/gate_decisions/downstream_impacts` 结构化追踪及机器断言。
