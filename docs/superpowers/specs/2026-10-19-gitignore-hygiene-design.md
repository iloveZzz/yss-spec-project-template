# Git 忽略与过程材料管理优化设计

状态：待审阅。用户已要求编写优化方案与实施计划；本文不表示实施、提交、推送或发布已获批准。

## 1. 问题与目标

在基线 `e1337581036f55f66c00c7d40c042ad60f6c8190` 上，本地 Claude 配置依赖全局 Git 忽略，Claude worktree 依赖本机 `.git/info/exclude`；这些规则不会随仓库克隆。`.codex/settings.local.json` 已被跟踪，当前内容只有空 `hooks`，且分发清单已明确排除该文件。

本方案让本地配置和仓内 worktree 在其他开发机器上也能被仓库规则识别，同时保留当前模板、流程输入与用户文件。Git 忽略只解决后续跟踪边界，不负责删除文件、归档历史或缩小已有 Git 历史。

## 2. 方案与取舍

采用四条精确规则和一次单文件索引调整；不新增清理器、检查注册项、依赖或运行目录。只依赖本机排除规则无法解决换机器后的差异；忽略整个工具目录或过程文档目录又会遮住共享 hook、Skill 投影与现行依据。

在根 `.gitignore` 的 `# Template-source only` 区域新增：

```gitignore
# Local agent settings and repository-local worktrees
/.claude/settings.local.json
/.codex/settings.local.json
/.claude/worktrees/
/.worktrees/
```

前三条补齐已发现的配置差异；第四条覆盖现有 worktree 技能的默认备用位置。暂不新增 `/.gitnexus/`、`/worktrees/`、通用报告目录或备份扩展名规则，因为当前没有相应产物或已选使用位置。代码图谱、Wiki、日志及缓存沿用现有忽略规则。

`.codex/settings.local.json` 使用 `git rm --cached -- .codex/settings.local.json` 单独移出索引，保留工作区文件的完整字节与权限。执行前若该路径已有暂存修改，暂停这一操作，保留原索引，不使用强制参数。

## 3. 过程材料的后续处理

在现有 [留存策略](../../../.template-source/process/runtime-storage.md)“产物与留存”之后增加“源码跟踪边界”短节，不另建材料注册表：

- 个人配置与仓内 worktree 由上述精确规则排除；共享 hook、canonical Skills、投影和锁文件继续跟踪。
- 会话日志、重复推演、可重建阅读视图及普通运行报告使用现有仓外维护存储；不再复制成第二套长期维护文档。
- Superpowers 设计和计划只要仍承担当前需求、决定、执行或验收依据就继续保留；不忽略整个 `docs/superpowers/`。
- AR 阶段总结和盘点仍有执行计划及兼容例外引用，本轮不搬迁、不删除。以后只有在引用收敛并按现有 plan → pack → verify → remove 流程核验归档后，才处理对应原件。
- 项目实例的 `.work/`、历史 `docs/.scratch/` 可能保存正式资产；模板源整目录忽略规则不得移植到实例。必要工程证据继续按现行引用保留。

这些边界补入现有政策后，本文仍只是本轮维护设计，不成为新的运行时事实源。

## 4. 全局约束

- 只修改当前模板仓的根 `.gitignore`、现有留存政策和单个本地配置的索引条目；不改 yss-cli、Profile 覆盖层、Bundle、CLI pin、分发清单或锁文件。
- 根 `.gitignore` 的 managed 区间逐字节保持不变；新增规则只放在 template-source 专用区。
- 保留工作区文件、原有暂存修改和其他未跟踪文档；不执行 reset、clean、restore、stash、强制移出索引或历史重写。
- 复用 Git 与 Node.js 标准库；Node 沿用现行 `>=22.13 <27`，不新增依赖、测试文件、CI 检查项、Schema、Ticket 或 checkpoint。
- 只核验当前改动及必要消费者，记录实际命令和未覆盖边界；不自动提交、推送、归档、发布或修改全局 Git 配置。

## 5. 验收

| 编号 | 可观察结果 |
|---|---|
| AC1 | 复制根忽略规则到独立临时 Git 仓、禁用全局忽略后，四类本地路径全部被忽略 |
| AC2 | 共享 hook、Skill 投影入口、CodeGraph 的忽略文件、AR 总结、必要工程日志及 Superpowers 当前计划没有被新增规则遮住 |
| AC3 | managed 区间及 Profile 覆盖层没有变化；共同规则片段仍允许跟踪正式工作记录与验收日志，并排除工作包缓存 |
| AC4 | 本地 Codex 配置在工作区保持原字节与权限，索引中仅该路径被移出；路径已有暂存修改时不执行移出 |
| AC5 | 留存政策明确个人配置、重复过程材料、现行依据及历史归档的不同处理；旧材料及其引用不变 |
| AC6 | 一次性边界探针的 15 项通过，现有 Wiki 忽略测试通过，工作区与索引的 diff 空白检查通过；不宣称 Bundle 或跨平台资格 |

## 6. 当前证据与回滚

2026-10-19 已在 macOS / Node v24.21.0 的独立临时 Git 仓运行计划中的探针：共 15 项，四类新增规则对应的检查失败，其余 11 项符合期望。该结果证明当前缺口，不是实施通过证据；临时仓已清除，业务工作区与索引未改。

规则回滚仅撤销本轮四条新增规则与政策短节；索引回滚使用实施前记录的该文件原始 mode 和 blob，保留工作区当前文件，不重建或覆盖用户内容。Git 历史不会因本方案缩小。

依据：[现有忽略规则](../../../.gitignore)、[分发排除](../../../.template-source/distribution/bundle-profile.json)、[worktree 默认位置](../../../.agents/skills/using-git-worktrees/references/git-fallback.md)、[工作目录合同](../../../.template-spec/process/work-layout.md)。
