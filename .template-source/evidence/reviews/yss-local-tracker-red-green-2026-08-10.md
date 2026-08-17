---
status: completed
owner: ai
---

# Local `docs/.scratch` 与 YSS 生命周期修订验证

## RED 基线

本轮 RED 先将压力场景目标切换为 `docs/.scratch/<feature>/`，再在权威文档修改前运行。当前根 `.scratch` 配置导致 Local root、远程 fallback、持久化 tracker root、Matt/YSS adapter 和各 feature skill 路径断言失败；这证明旧路径仍会被默认使用。

迁移规则同时要求：旧根 `.scratch/` 或 `docs/requirements/tickets/` 只能被只读识别；仅有旧资产时记录 `migration_ref` 并暂停写入；新旧资产并存时返回 `conflict`。

本轮开始时的仓库基线还存在独立的历史问题：`80eecb6 chore: remove local workspace directories` 删除了 `docs/process/` 下的生命周期文件，而 `scripts/verify-template`、`scripts/verify-lifecycle-scenarios` 和 `scripts/verify-yss-router-scenarios` 仍将其列为必需输入。该问题没有通过生成临时产品资产或绕过校验来隐藏。

## GREEN 场景

集成压力脚本现在覆盖：

1. GitHub `origin` + 持久化 Local 配置仍选择 `local-markdown`，写入 `docs/.scratch`，不规划远程 Issue 命令。
2. 显式选择 GitHub / GitLab 后，平台不可用只生成 `docs/.scratch/<feature>/` 草案，在 `parent-ticket.md` 标记 `publication: pending`，并保留原目标平台。
3. 多个持久化配置声明不同平台时返回 `conflict`，不覆盖任何配置。
4. 仅有旧路径资产时返回迁移所需结果；新旧路径并存时返回 `conflict`，两种情况都不写入。
5. `template-source` 只做模板契约验证，不创建产品 `docs/.scratch`、Spec 或 Ticket。

## REFACTOR 结果

- `docs/agents/issue-tracker.md` 成为 tracker 单一事实来源，默认 `local-markdown`，完整功能包位于 `docs/.scratch/<feature>/`。
- Matt Local seed、Local-aware skills 和 YSS adapter 已统一到 `docs/.scratch`；Matt 核心流程和五态语义保持不变。
- setup-matt-pocock-skills 只提供 `local-markdown`、`github`、`gitlab` 三种显式选择；Git remote 不参与排序，unsupported tracker 不写入配置。
- YSS 原型、OpenAPI、架构图和 Discovery 主动执行 skill 的功能资产路径已归一到 `docs/.scratch/<feature>/`；项目级设计系统仍保留在 `docs/design/`。
- YSS active 时，`to-spec` 的独立 `ready-for-agent` 提示被适配层收敛为 `ready-for-human`。
- `Status: claimed/resolved` 只保留为 Wayfinder 临时工作状态，交付 Ticket 必须提升为五态角色。
- 远程降级保留 `tracker`、`publication: pending` 和 `pending_publication_to`，不自动切换平台。
- `docs/.scratch` 不应被 `.gitignore` 忽略；模板校验现在显式检查这一契约。
- `template-source` 模式显式拒绝非空产品 `docs/.scratch` 或根 `.scratch` 目录。

## 验证证据

- `ruby scripts/verify-matt-yss-integration-scenarios`：通过。
- setup tracker choice / unsupported platform 断言：通过（集成脚本覆盖）。
- `scripts/verify-yss-ui-scenarios`：通过。
- `scripts/sync-skills --check`：通过。
- `scripts/update-skill-lock --check`：通过。
- `git diff --check`：通过。
- `ruby -c`：同步、锁文件和两类场景脚本均通过。
- `scripts/verify-template`：被既有缺失的 `docs/process/lifecycle-artifact-map.md` 阻断。
- `scripts/verify-lifecycle-scenarios`：被既有缺失的 `docs/process/harness-executive-blueprint.md` 阻断。
- `scripts/verify-yss-router-scenarios`：被既有缺失的 `docs/process/lifecycle-artifact-map.md` 阻断。
- 上述 `docs/process` 缺失源于本轮前的 `80eecb6 chore: remove local workspace directories`，未通过生成产品资产或绕过校验来隐藏。
