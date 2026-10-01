---
name: yss-harness-upgrade
description: 升级既有 YSS 模板实例，规划同家族版本迁移、定制合并、持久归档、验证与恢复；用于 create-yss-spec 及 design/backend/frontend CLI 实例升级，不处理业务代码或数据库迁移。
---

# YSS 实例升级

先读取根 `yss-project.yaml`、`CONTEXT.md` 和 [统一协议](../../../.template-spec/process/harness-upgrade.md)。目标必须是已登记的同家族 `project-instance`；身份/schema 不支持时只诊断，不能重新 init 或猜测身份。模板源的技能维护由 `maintaining-skills` 处理。

## 工作顺序

1. 确认目标绝对路径、用户授权范围、实际 CLI 路径及版本、模板 metadata、工作区已有改动。依据 [家族适配](references/cli-families.md) 选定 CLI。未指定目标版本时查询同家族稳定版本并固定精确包版本和摘要，执行期间不再引用 `latest`。CLI 程序升级和项目实例迁移分别记录，不自动安装全局版本。
2. 用固定 CLI 的 `migrate status` 检查中断事务。有中断时先 `migrate recover` 预览，按既有授权执行 `--apply`，然后重新规划。不得删除状态目录绕过恢复。
3. `migrate plan --target-dir <绝对路径> --output <项目外全新计划.json>`。旧治理布局迁移显式附加 `--migrate-layout`；退出分发文件清理显式附加 `--prune`。计划阶段不修改项目；检查计划中的版本、变化路径、保留项和归档位置。
4. 冲突时在项目外起草候选差异和 `--resolutions` 文件。只使用计划报告的可信受管冲突；`preserve` 保留原文，`merge` 提供候选内容并绑定原文件及新模板摘要。向用户展示新的语义取舍，复用已有范围授权；未获授权的新决定保持等待。不能使用 `--force` 批量覆盖，不能先修改项目来消除冲突。
5. 用相同固定 CLI 执行 `migrate apply --plan <计划>`。执行器重新生成候选并验证计划、归档、身份和输入摘要；`STALE_PLAN` 时重新规划，不能手改摘要续跑。迁移不自动 commit、stash、reset、push 或发布。
6. 查看回执和实例验证结果，执行相同选项的新计划验证无重复迁移。核对业务文件与既有工作区改动保持，说明保留的定制和现有失败。输出实际版本、归档/回执位置、验证证据和剩余问题；结构检查不能代替真实 CLI 或 Agent 行为验证。

## 恢复与边界

- `migrate recover` 恢复未完成事务；`migrate rollback` 预览最近一次成功迁移的整体回退。两者仅加 `--apply` 才写入。回退遇到后续修改或损坏归档必须保留现场，不覆盖新工作。
- Spec、Ticket、合同、人工回复、批准和正式验证默认保留。路径迁移不产生新批准；语义或批准绑定变化交回原生命周期，不补造旧状态。
- 不执行跨家族转换、任意历史版本跳转、业务重构或数据库迁移。未知基线不能由 Agent 猜测；归档不能作为扩大写入授权的理由。
- 旧实例缺少本技能时，从已固定 CLI 包的 `resources/upgrade-skill/` 在项目外读取入口及相邻协议。不得先同步目标项目来安装升级技能。

本技能只编排，不复制迁移执行器。研究新技术事实时用 `yss-research`；结论输出按 `lifecycle-document-output` 使用 `i-have-adhd`。不批准 Slice、不设置 `ready-for-agent`、不宣称可发布。
