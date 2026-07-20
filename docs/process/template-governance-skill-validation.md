# 模板治理规则压力验证

> 日期：2026-07-20
> 方法：`writing-skills` RED / GREEN / REFACTOR
> 目标：验证仓库身份、状态路由、UI 条件门禁、技能投影和旧入口清理

## RED：修订前基线失败

| 压力场景 | 压力组合 | 修订前行为 | 失败证据 |
|---|---|---|---|
| Spec 初稿刚写完，开发窗口只剩一天，实现者要求立即开工 | 时间 + 权威 + 交付压力 | `to-spec` 直接将 Spec 标记 `ready-for-agent` | `.agents/skills/to-spec/SKILL.md` 明确要求“Apply the ready-for-agent triage label” |
| 垂直切片 B 被 A 阻塞，但团队希望并行开工 | 进度 + 并行 + 沉没成本 | `to-tickets` 默认给所有 Ticket 标记 `ready-for-agent` | 技能没有将“阻塞边未清除”作为标签前置条件 |
| 只在 Codex 根目录紧急修改一个共享 skill | 时间 + 局部便利 + 多端成本 | 不同 Agent root 的同名 skill 内容哈希不一致 | 修订前 `to-tickets` 和 `to-issues` 已出现多个哈希 |
| 纯后端 API 功能被要求尽快进入契约设计 | 时间 + 流程合规 + 无 UI 事实 | 入口规则仍要求所有 Spec 产出低保真页面草图 | 修订前 `AGENTS.md` 未将功能架构与 UI 原型门禁分开 |
| 维护模板规则时，Agent 按完整产品生命周期补 Spec 和 OpenAPI | 合规 + 上下文 + 产物压力 | 仓库没有机器可读身份，只能猜测 | 修订前缺少 `yss-project.yaml` 和模板维护路由 |

其他基线失败：

- `scripts/verify-template` 首次执行失败：`missing Matt skill: .agents/skills/to-prd/SKILL.md`。
- README 仍将 PRD 和 `to-issues` 作为 Quickstart 入口，与 `AGENTS.md` 的 Spec / `to-tickets` 主链冲突。

## GREEN：目标行为

| 场景 | 必须得到的结果 |
|---|---|
| Spec 初稿 | 功能父 Ticket 使用 `ready-for-human`，不得立即进入实现 |
| 被阻塞的子 Ticket | 保留阻塞关系，不得标记 `ready-for-agent` |
| 共享 skill 修改 | 只修改 `.agents/skills`，然后生成投影并刷新锁文件 |
| 纯后端功能 | 产出功能架构，UI 相关产物标记 `not-applicable` |
| 模板源维护 | 进入模板维护流程，不生成产品 Spec / OpenAPI |

## REFACTOR：验证证据

- [x] `to-spec` 状态语义校验：Spec 初稿创建功能父 Ticket 并使用 `ready-for-human`，状态红线明确禁止 `ready-for-agent`。
- [x] `to-tickets` frontier 标签校验：被阻塞 Ticket 不得使用 `ready-for-agent`，只有阻塞边清除的 frontier Ticket 可进入实现。
- [x] 共享技能目录哈希校验：`scripts/sync-skills --check` 输出 `skill projections are synchronized`。
- [x] 锁文件校验：`scripts/update-skill-lock --check` 输出 `skills-lock.json matches distributed skills`；锁文件记录 35 个共享 skills 与 62 个平台 skills。
- [x] 五类路由压力场景校验：`scripts/verify-lifecycle-scenarios` 输出 `五类生命周期压力场景验证通过`。
- [x] `scripts/verify-template` fresh verification：输出 `模板发布校验通过`。

## 尚未解除的发布门禁

- 当前实现者的差异自检不构成独立审查；模板仍需其他 Agent 或人工 Reviewer 审查。
- 外部 `create-yss-spec` 尚未完成 `project-instance` 转换和共同集成验证，因此整体 major 版本仍不可发布。
