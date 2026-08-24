# 模板维护发布候选 L3 记录

## 范围与分级

- 强度：L3。
- 触发项：`lifecycle-gate`、`permission-boundary`、`core-validator`、`aggregate-behavior-change`、`release-candidate`。
- 范围：本候选从 `9f1b423882eb79c13911da3b49d78c5b1ded4a72` 起的全部未提交技能、生命周期规则、校验器、投影、锁文件、派生文档和审查记录。
- 原因：候选同时改变 lifecycle work unit 的 user-invoked 边界、Git 授权与正式资产所有权，更新核心模板验证，并退役共享 skill；必须作为整体发布候选审查，不能分别降级。

## RED

- 在临时 detached worktree 中保留固定基线 `9f1b423882eb79c13911da3b49d78c5b1ded4a72`，仅置换候选 `scripts/lib/scenario-checks.mjs` 与 `scripts/verify-matt-yss-integration-scenarios` 后执行后者，基线以缺少 `Workflow Execution Result` 返回失败。
- 向 `scripts/verify-maintenance-intensity-scenarios` 增加“校验器不得硬编码 `LEVEL_BY_TRIGGER`，且必须加载 `maintenance-intensity.yaml`”断言；修订前以该断言返回失败。

## GREEN

- 将维护强度 trigger → 最低等级映射迁移到 `docs/process/maintenance-intensity.yaml`；`scripts/lib/maintenance-intensity.mjs` 只解析并执行该权威策略。
- `scripts/verify-maintenance-intensity-scenarios` 覆盖该消费边界，并继续覆盖 L1/L2/L3 的接受与拒绝场景。
- 生命周期调用边界、`Workflow Execution Result`、Git 授权和投影一致性由 Matt/YSS 压力场景验证。

## 审查补正：完成态结果协议

- RED：`scripts/verify-matt-yss-integration-scenarios` 在 canonical 契约缺少 `workflow_reference`、完成态证据和阻断信号字段时返回失败。
- GREEN：canonical `workflow_execution_result` 明确 `result_values`、`required`、`blocking_signals`、完成态空/非空字段、可读证据和无阻断信号条件；场景以一个可完成结果和缺 `workflow_reference`、空证据、不可读证据、`drift`、新影响五类变异验证。
- REFACTOR：旧 `matt_skill_result` 保持只读兼容，不再承载 canonical 路由约束；新协议成为完成态裁决的唯一结构来源。
- 审查补正：`workflow_reference` 必须与 `lifecycle_workflow_references` 中该 `work_unit` 的 source、skill 和 `invocation_mode` 精确匹配；错误 source、错配 skill 与错配模式均由压力场景拒绝。

## REFACTOR 与验证

- 流程文档只解释分级决策，`AGENTS.md` 明确映射的唯一事实来源；不再与校验器重复维护 trigger 列表。
- `scripts/verify-template` 将维护强度策略列为模板必需文件，防止分发候选缺失该权威资产。

正式独立审查会固定功能候选的 commit SHA；审查完成后，审查报告与可执行的 Maintenance checkpoint 作为只含证据的后续 checkpoint 提交，避免证据写入本身使被冻结候选失效。

## 正式独立审查

冻结候选 `0ab4012b7fd27a3e8d155755e3790c556c341083`（相对基线 `9f1b423882eb79c13911da3b49d78c5b1ded4a72`，tree digest `70b9030a5477558d624f3ce95ed533aae5e5f6ab`）完成双轴独立审查：

- Standards：通过。确认维护强度策略为唯一 trigger → 等级映射，`workflow_reference` 的 source、skill、`invocation_mode` 有精确拒绝变异，投影与锁文件一致。
- Spec：通过。确认 canonical 完成态实际拒绝缺失引用、错误 source、错配 skill、错配模式、空/不可读证据、阻断信号和未决影响；旧 `matt_skill_result` 仅只读兼容。

两名非实施审查者仅消费上述不可变提交，均执行 `git diff --check` 并给出无阻断结论。

## Maintenance checkpoint

```yaml
schema_version: 1
intensity: L3
classification_reason: 整体候选改变生命周期调用与 Git 授权边界、核心验证器和共享技能治理
triggers: [lifecycle-gate, permission-boundary, core-validator, aggregate-behavior-change, release-candidate]
changed_assets:
  - .agents/skills/**
  - .claude/skills/**
  - .codex/skills/**
  - .hermes/skills/**
  - .pi/skills/**
  - .qoder/skills/**
  - .trae/skills/**
  - .template-source/**
  - AGENTS.md
  - docs/agents/**
  - docs/process/**
  - docs/reviews/**
  - scripts/**
  - skills-lock.json
  - wiki/wiki/**
verification_evidence:
  - kind: red
    command: docs/reviews/template-maintenance-release-candidate-2026-08-18.md#red
    result: pass
  - kind: green
    command: scripts/verify-matt-yss-integration-scenarios && scripts/verify-maintenance-intensity-scenarios && scripts/sync-skills --check && scripts/update-skill-lock --check
    result: pass
  - kind: refactor
    command: docs/reviews/template-maintenance-release-candidate-2026-08-18.md#green
    result: pass
  - kind: pressure-scenario
    command: scripts/verify-matt-yss-integration-scenarios && scripts/verify-maintenance-intensity-scenarios
    result: pass
  - kind: fresh-verification
    command: scripts/verify-template
    result: pass
  - kind: formal-independent-review
    command: Standards 和 Spec 独立审查，candidate=0ab4012b7fd27a3e8d155755e3790c556c341083，digest=70b9030a5477558d624f3ce95ed533aae5e5f6ab，verdict=pass
    result: pass
review_mode: formal-independent
escalation: none
```
