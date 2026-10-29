---
name: setup-yss-harness
description: 安装或升级 YSS CLI，初始化、接管、同步技能或治理工程，转换安装方式并修复 Harness 就绪缺口。
---

# YSS Harness 就绪

本技能编排固定 `yss` 公开入口；操作合同以 [统一协议](references/operation-contract.md) 为准，该参考由模板事实源生成并随技能提供，可从用户级技能目录独立调用，无需预装 CLI 或模板 checkout。先判断用户要维护程序还是项目，只加载对应参考。模板源的技能修改交给 `maintaining-skills`；生产工程脚手架、业务实现、数据库迁移及产品批准由对应技能和生命周期合同承接。

用户指定工程并要求 `setup` 时，目标包括 CLI 就绪和受管模板对齐所选固定版本；按已有授权执行到验收，不在每个写入步骤重新确认。用户仅要求安装或升级程序时执行程序分支。目标工程、用途或新增实质决定缺失时先调查，再补决定。

用户仅要求检查或评估时保持只读，不执行准备下载、安装、同步、补装或恢复写入。

## 环境识别

程序入口不明或缺失时，按 [程序参考](references/program-installation.md) 使用随包 `scripts/bootstrap.py inspect` 只读识别平台、PATH 文件和 Python 能力。核对实际 CLI、入口链接、安装回执、manifest、摘要、权限和 `capabilities`；需取得执行器时用 `prepare` 固定并核验发行包，它不安装程序。已符合来源且安装一致时保持无变更。目标工程先用受支持的 `project inspect` 读取身份、安装方式及事务状态，再决定路线：

| 工程现状 | 路线 |
|---|---|
| 不存在或空目录，用户要求新建 | 默认 `governed`，仅需独立技能时选择 `skills`；`init` 保存计划后应用 |
| 普通工程，无 YSS metadata 或身份 | 默认 `governed`，仅需独立技能时选择 `skills`；`attach` 保存计划后应用 |
| 当前 Spec/Backend 原生实例（metadata4/5） | 沿用已登记安装方式，`doctor/diff` 后按需 `sync` |
| metadata4/5，用户要求转换安装方式 | 显式 `migrate --installation skills\|governed`，核对活动任务限制 |
| 受支持的旧统一实例（metadata3 / identity1 / policy1） | 显式 `migrate --plan` / `migrate --apply`；不能先 sync |
| 仅旧 npm 家族 metadata、Design、Frontend、旧 dev 或退役插件 | 当前执行器不提供迁移；保留原件，历史维护按固定旧执行器处理 |
| 当前受支持的插件 binding | 核验该插件对当前代际的公开升级或迁移接口后使用 |
| 同来源资源缺口 | 当前 Profile 的 `skills/assets list` → `ensure` |
| 模板源、矛盾身份、既有实例缺必需身份、未知 schema | 项目分支只诊断并保留现场 |

已有合法身份沿用登记 Profile 和安装方式。新建或接管按用途选择 `spec/backend`；未指定安装方式时采用 `governed`，仅需独立技能时选择 `skills`，命令显式传入选择。CLI 新建和接管默认 governed，`--full` 不切换安装方式。skills 工程不要求治理身份文件、Context、Ticket 或 checkpoint；治理安装读取其身份及唯一 Context。缺用途决定时调查后询问，不能用框架或目录名猜 Profile；后端交付插件绑定的是 `spec`。

## 操作分流

| 用户目标 | 入口与必读参考 |
|---|---|
| 安装、升级 CLI，或缺少平台包时构建 | [程序安装与升级](references/program-installation.md)：远程最新正式 Release → 固定版本及摘要 → 程序事务 |
| 新建技能或治理工程、接管普通工程 | [项目操作](references/project-operations.md)：显式 installation，支持时绑定 CLI 保存计划后应用 |
| 当前实例同步、安装方式转换、旧治理迁移或历史身份识别 | [项目操作](references/project-operations.md) 与 [家族适配](references/cli-families.md)：按安装方式及代际选择；binding 另核验插件接口 |
| 补装技能或阶段资源 | [项目操作](references/project-operations.md)：技能先 `list --details` / `resolve`，缺失时 `ensure` 保存计划后应用并重验；阶段沿用 `assets list/ensure` |
| 诊断、恢复或回退 | 按程序/项目选择上述参考；先只读查状态，再在已有授权范围使用对应事务写入入口 |

## 共同执行规则

1. 明确操作、目标绝对路径和已有授权范围。项目操作读取 metadata、Profile、installation、binding、受管基线和 Git 状态；仅 governed 分支要求治理身份及唯一 Context。`project inspect` 查询成功不代表身份有效；缺能力时按家族参考核验原始文件。既有实例身份非法或 schema 不支持时只诊断，不能猜身份或重新 init。
2. 默认查询固定仓库 `iloveZzz/yss-cli` 的最新正式 Release，排除草稿、预发布和未发布 main；记录 Release、完整源码 SHA、平台、包与二进制 SHA-256。每个执行批次固定来源；先查最新、再用明确版本或已下载包执行，不把 `latest` 留在项目 apply 中。用户明确指定固定版本或离线产物时消费该来源。
3. 核对实际运行文件、版本、安装回执和来源清单；程序恢复与项目恢复分别记录。回执、摘要或身份失配时保留现场，不能手改 metadata/收据、删除事务、`--force` 或覆盖裸二进制。程序安装成功后重新固定新二进制，再独立规划项目操作。
4. 接管只用于无 YSS metadata 的普通工程；按上表识别原生代际。旧统一实例需显式治理迁移，原政策和历史批准不授予当前资格；治理语义变化仅在已有授权覆盖时执行，缺真实决定才等待。保存计划核对逐资产结论、覆盖结果、`readyToApply` 和备份位置。冲突用 `--review-out` 在项目外导出材料；可定制资产的政策允许处置能保留本地定制且不引入新业务决定时，Agent 可生成合并候选及绑定决议，用原计划和 `--resolution-file` 重新规划、验证后继续，候选不直接写入工程。固定来源资产和生成锁遵守各自规则；无法证明保留定制、存在实质取舍或新增语义决定时展示差异并询问。历史基线只取已核验事务归档或显式 `--base-bundle`，不猜测、不联网取得。
5. 应用使用生成计划的同一固定二进制；新建/接管支持 `--bind-cli` 时使用它并保留原计划摘要，应用传 `--expected-digest`。普通计划和绑定计划分别按实际 schema 消费；跨执行器或代际重新规划。应用回执分别核对 `fileApplication` 和 `verification`；校验失败按事务恢复，恢复受阻保留现场。
6. 同时核对退出码、envelope、回执和业务结果；支持时用原计划 `project verify` 核查实际输出，只有 `outcome=complete` 才表示该计划产物完成。取消或异常后同样核查，不能推定零写入或自动回滚。同步、补装再做同选项计划验证幂等；迁移后按新身份检查，不重复迁移。分别报告程序、项目、文件就绪与宿主发现；unknown 不算通过。程序已成功而项目失败时保留已验证 CLI，整体 setup 报告未完成。记录定制、已有失败、来源、计划/回执/归档、实际命令及未覆盖项。
7. 日常升级只核验本次实际变化：程序包、运行入口、来源和安装事务，项目操作再核验受影响资产与消费者。每项检查说明能发现的具体错误及适用合同依据；固定发行包的使用不要求重跑生产方完整回归。已有检查覆盖时不新增测试或启动环境，必要检查通过即结束；相关修改、失败或明确遗漏才追加。记录未覆盖边界，不能把局部验收当作正式发布证据。

## 保护与恢复

- 程序 `update status` 只读，`update recover/rollback` 本身写入，不加 `--apply`。项目 `recover/rollback` 默认只读，写入加 `--apply`；当前没有 `migrate status/recover/rollback` 子命令。未完成治理迁移用 `recover --apply`，已完成迁移不支持降级，保留 `DOWNGRADE_UNSUPPORTED`。旧固定执行器消费自身版本规则。
- 程序目录与项目根分别指定；回退只针对最近成功的适用事务，重复回退不跨到更早事务。后续用户字节/权限变化或归档损坏时拒绝覆盖；不能把归档当扩大授权的理由。
- 保护唯一 Context、业务文件、用户 `.github`、Git HEAD/index/gitlink、文件类型和权限。Spec、Ticket、合同、人工回复、批准和正式验证默认保留；语义或批准绑定变化回交生命周期。
- 旧实例缺技能时使用独立技能包，或用固定 `bundle export` 在项目外读取该版本入口，不能先同步来安装技能。用 `skills list` 核对实际标识；已发布旧 Bundle 的旧名称仅作历史识别，不能伪造 `setup-yss-harness` 已可补装。CLI 升级只改程序；实例同步使用新二进制内固定 Bundle，不另拉模板 main。
- 不自动 commit、stash、reset、clean、push 或发布；不执行跨家族转换、任意历史回退、业务重构或数据库迁移。本技能不批准 Slice，不设置 `ready-for-agent`，不宣称可发布。

项目具备 `yss-research` / `i-have-adhd` 时按其适用范围消费；独立调用仍以随包统一协议、固定执行器及实际证据完成本技能，不依赖未安装的项目技能。
