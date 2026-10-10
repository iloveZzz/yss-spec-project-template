---
name: setup-yss-harness
description: 安全安装或升级 YSS CLI，并按目标工程的真实环境初始化、接管、同步或迁移研发治理实例；用于准备 YSS Harness 和修复其就绪缺口。
---

# YSS Harness 就绪

本技能编排固定 `yss` 公开入口；操作合同以 [统一协议](references/operation-contract.md) 为准，该参考由模板事实源生成并随技能提供，可从用户级技能目录独立调用，无需预装 CLI 或模板 checkout。先判断用户要维护程序还是项目，只加载对应参考。模板源的技能修改交给 `maintaining-skills`；生产工程脚手架、业务实现、数据库迁移及产品批准由对应技能和生命周期合同承接。

用户指定工程并要求 `setup` 时，目标包括 CLI 就绪和受管模板对齐所选固定版本；按已有授权执行到验收，不在每个写入步骤重新确认。用户仅要求安装或升级程序时执行程序分支。目标工程、用途或新增实质决定缺失时先调查，再补决定。

## 环境识别

先解析实际 CLI 文件、入口链接、平台、安装回执、manifest、摘要、权限和 `capabilities`；缺旧 CLI 能力时使用核验过的发行包引导执行器。已符合来源且安装一致时保持无变更。再独立读取目标工程身份与状态：

| 工程现状 | 路线 |
|---|---|
| 不存在或空目录，用户要求新建 | `init` 保存计划后应用 |
| 普通工程，无 YSS metadata 或身份 | `attach` 保存计划后应用 |
| 合法原生实例 | `sync` |
| 可识别旧家族实例 | `migrate plan/apply` |
| 插件绑定实例 | 对应插件的公开升级或迁移接口 |
| 同来源资源缺口 | 当前 Profile 的 `skills/assets list` → `ensure` |
| 模板源、矛盾身份、既有实例缺必需身份、未知 schema | 项目分支只诊断并保留现场 |

已有合法身份沿用登记 Profile。新建或接管按用途推荐 `spec/design/backend/frontend`，缺用途决定时询问，不能用框架、目录名或前后端标签猜 Profile；后端交付插件绑定的是 `spec`。

## 操作分流

| 用户目标 | 入口与必读参考 |
|---|---|
| 安装、升级 CLI，或缺少平台包时构建 | [程序安装与升级](references/program-installation.md)：远程最新正式 Release → 固定版本及摘要 → 程序事务 |
| 新建治理工程或接管普通工程 | [项目操作](references/project-operations.md)：`init` / `attach` 保存计划后应用 |
| 原生模板同步、旧四 CLI 实例迁移 | [项目操作](references/project-operations.md) 与 [家族适配](references/cli-families.md)：`sync` / `migrate plan/apply`；有插件 binding 时走插件公开接口 |
| 补装技能或阶段资源 | [项目操作](references/project-operations.md)：技能先 `list --details` / `resolve`，缺失时 `ensure` 保存计划后应用并重验；阶段沿用 `assets list/ensure` |
| 诊断、恢复或回退 | 按程序/项目选择上述参考；先只读查状态，再在已有授权范围使用对应事务写入入口 |

## 共同执行规则

1. 明确操作、目标绝对路径和已有授权范围。程序安装不要求已有项目的 `yss-project.yaml` 或 `CONTEXT.md`；项目操作读取目标根身份、唯一 Context、metadata、Profile、binding、受管基线和 Git 状态。新建与接管的身份前置条件见项目参考；既有实例身份非法或 schema 不支持时只诊断，不能猜身份或重新 init。
2. 默认查询固定仓库 `iloveZzz/yss-cli` 的最新正式 Release，排除草稿、预发布和未发布 main；记录 Release、完整源码 SHA、平台、包与二进制 SHA-256。每个执行批次固定来源；先查最新、再用明确版本或已下载包执行，不把 `latest` 留在项目 apply 中。用户明确指定固定版本或离线产物时消费该来源。
3. 核对实际运行文件、版本、安装回执和来源清单；程序恢复与项目恢复分别记录。回执、摘要或身份失配时保留现场，不能手改 metadata/收据、删除事务、`--force` 或覆盖裸二进制。程序安装成功后重新固定新二进制，再独立规划项目操作。
4. 接管只用于无 YSS metadata 的普通工程；原生实例走 `sync`，可识别旧实例走 `migrate plan/apply`。保存计划核对逐资产结论、覆盖结果、`readyToApply` 和备份位置。冲突用 `--review-out` 在项目外导出材料；可定制资产的政策允许处置能保留本地定制且不引入新业务决定时，Agent 可生成合并候选及绑定决议，用原计划和 `--resolution-file` 重新规划、验证后继续，候选不直接写入工程。固定来源资产和生成锁遵守各自规则；无法证明保留定制、存在实质取舍或新增语义决定时展示差异并询问。历史基线只取已核验事务归档或显式 `--base-bundle`，不猜测、不联网取得。复用有效授权，缺真实决定才等待。
5. 应用使用生成计划的同一固定二进制；计划重建、输入变化或候选篡改会阻断。旧保存计划返回 `PLAN_VERSION`，须重新生成。应用回执分别核对 `fileApplication` 和 `verification`；校验失败按整体事务恢复，恢复受阻保留现场。
6. 核对实际退出 0、envelope `status=ok/code=OK`、回执及操作后的状态；项目操作再做同选项计划，验证无重复变更和明确保留例外的稳定性。分别报告程序、项目与验收结果；程序已成功而项目失败时保留已验证 CLI，项目事务恢复自身，整体 setup 报告未完成。记录定制、已有失败、来源、计划/回执/归档、实际命令及未覆盖项。结构检查不代替真实 CLI 或 Agent 行为验证。
7. 日常升级只核验本次实际变化：程序包、运行入口、来源和安装事务，项目操作再核验受影响资产与消费者。每项检查说明能发现的具体错误及适用合同依据；固定发行包的使用不要求重跑生产方完整回归。已有检查覆盖时不新增测试或启动环境，必要检查通过即结束；相关修改、失败或明确遗漏才追加。记录未覆盖边界，不能把局部验收当作正式发布证据。

## 保护与恢复

- 程序 `update status`、项目 `migrate status` 只读。程序 `update recover/rollback` 和项目 `migrate recover/rollback` 本身是显式写入子命令，不加 `--apply`；普通项目 `recover/rollback` 默认只读，加 `--apply` 才写入。旧固定执行器消费其自身版本规则。
- 程序目录与项目根分别指定；回退只针对最近成功的适用事务，重复回退不跨到更早事务。后续用户字节/权限变化或归档损坏时拒绝覆盖；不能把归档当扩大授权的理由。
- 保护唯一 Context、业务文件、用户 `.github`、Git HEAD/index/gitlink、文件类型和权限。Spec、Ticket、合同、人工回复、批准和正式验证默认保留；语义或批准绑定变化回交生命周期。
- 旧实例缺技能时使用独立技能包，或用固定 `bundle export` 在项目外读取该版本入口，不能先同步来安装技能。用 `skills list` 核对实际标识；已发布旧 Bundle 的旧名称仅作历史识别，不能伪造 `setup-yss-harness` 已可补装。CLI 升级只改程序；实例同步使用新二进制内固定 Bundle，不另拉模板 main。
- 不自动 commit、stash、reset、clean、push 或发布；不执行跨家族转换、任意历史回退、业务重构或数据库迁移。本技能不批准 Slice，不设置 `ready-for-agent`，不宣称可发布。

项目具备 `yss-research` / `i-have-adhd` 时按其适用范围消费；独立调用仍以随包统一协议、固定执行器及实际证据完成本技能，不依赖未安装的项目技能。
