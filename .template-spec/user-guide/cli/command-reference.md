# 命令参考

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 命令参考

| 命令 | 用途 | 示例入口 |
| --- | --- | --- |
| `archive` | 安全打包、读取或核验 ZIP 资产。 | `yss help examples archive` |
| `archive pack` | 打包指定项目目录。 | `yss help examples archive pack` |
| `archive unpack` | 安全解包到新位置。 | `yss help examples archive unpack` |
| `archive verify` | 只读核验归档结构。 | `yss help examples archive verify` |
| `assets` | 查询或补装 阶段资源和 Skill 闭包。 | `yss help examples assets` |
| `assets ensure` | 补装指定 阶段资源和 Skill 闭包。 | `yss help examples assets ensure` |
| `assets list` | 列出当前 Profile 支持的标识。 | `yss help examples assets list` |
| `attach` | 首次接管已有工程的模板受管资产；原生实例使用 sync，旧实例使用 migrate。 | `yss help examples attach` |
| `bundle` | 读取或导出完整固定 Bundle 与 manifest。 | `yss help examples bundle` |
| `bundle export` | 导出 Bundle 全部 bytes、mode 和 manifest。 | `yss help examples bundle export` |
| `bundle inspect` | 检查 Bundle 身份、来源及摘要。 | `yss help examples bundle inspect` |
| `capabilities` | 查看原生能力、治理接口与发行证据边界。 | `yss help examples capabilities` |
| `compat` | 显式旧命令兼容适配。 | `yss help examples compat` |
| `compat create-yss-harness-backend` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-harness-backend` |
| `compat create-yss-spec` | 固定旧别名的显式原生适配。 | `yss help examples compat create-yss-spec` |
| `compat-api` | 供现役 JavaScript 消费者使用的原生传输接口。 | `yss help examples compat-api` |
| `compat-api native.run` | 版本化兼容传输方法。 | `yss help examples compat-api native.run` |
| `compat-api native.snapshot` | 版本化兼容传输方法。 | `yss help examples compat-api native.snapshot` |
| `compat-api projectDiff` | 版本化兼容传输方法。 | `yss help examples compat-api projectDiff` |
| `compat-api projectDoctor` | 版本化兼容传输方法。 | `yss help examples compat-api projectDoctor` |
| `compat-api templateApply` | 版本化兼容传输方法。 | `yss help examples compat-api templateApply` |
| `compat-api templatePlan` | 版本化兼容传输方法。 | `yss help examples compat-api templatePlan` |
| `compat-api toErrorEnvelope` | 版本化兼容传输方法。 | `yss help examples compat-api toErrorEnvelope` |
| `context` | 查询或校验唯一 CONTEXT.md 及词汇快照。 | `yss help examples context` |
| `context check` | 校验词汇结构。 | `yss help examples context check` |
| `context query` | 查询稳定词汇。 | `yss help examples context query` |
| `context verify` | 校验当前词汇和可选快照。 | `yss help examples context verify` |
| `contract` | 校验 contract 的结构或原生领域语义。 | `yss help examples contract` |
| `contract check` | 执行显式 Schema 结构校验。 | `yss help examples contract check` |
| `contract verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples contract verify` |
| `contract view` | 按当前 Slice 或唯一工作单元阅读；不验证批准、不授予执行权限。 | `yss help examples contract view` |
| `diff` | 查看当前文件相对固定模板的差异和同步计划。 | `yss help examples diff` |
| `doctor` | 检查项目身份、受管基线和冲突。 | `yss help examples doctor` |
| `evidence` | 校验 evidence 的结构或原生领域语义。 | `yss help examples evidence` |
| `evidence check` | 执行显式 Schema 结构校验。 | `yss help examples evidence check` |
| `evidence verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples evidence verify` |
| `handoff` | 校验 handoff 的结构或原生领域语义。 | `yss help examples handoff` |
| `handoff check` | 执行显式 Schema 结构校验。 | `yss help examples handoff check` |
| `handoff verify` | 执行当前领域规则和独立消费者绑定校验。 | `yss help examples handoff verify` |
| `init` | 创建固定模板来源的项目实例。 | `yss help examples init` |
| `lifecycle` | 查询当前生命周期、配置本次推进目标并核验门禁。 | `yss help examples lifecycle` |
| `lifecycle query` | 查询注册表中的稳定 ID。 | `yss help examples lifecycle query` |
| `lifecycle route` | 只读判定日常或正式交付路径。 | `yss help examples lifecycle route` |
| `lifecycle status` | 只读核验 checkpoint、本次目标与显式消费者的当前证据。 | `yss help examples lifecycle status` |
| `lifecycle target` | 读取或事务设置 Spec 单功能的本次推进目标。 | `yss help examples lifecycle target` |
| `lifecycle verify` | 核验当前 checkpoint 的领域门禁。 | `yss help examples lifecycle verify` |
| `lifecycle verify-daily` | 核验同一日常任务的当前差异、测试和独立审查。 | `yss help examples lifecycle verify-daily` |
| `migrate` | 显式迁移旧实例 metadata、受管基线及 binding。 | `yss help examples migrate` |
| `migrate apply` | 应用迁移计划。 | `yss help examples migrate apply` |
| `migrate plan` | 生成只读迁移计划（默认动作）。 | `yss help examples migrate plan` |
| `migrate recover` | 恢复未完成迁移事务。 | `yss help examples migrate recover` |
| `migrate rollback` | 恢复迁移前实例。 | `yss help examples migrate rollback` |
| `migrate status` | 查询迁移事务。 | `yss help examples migrate status` |
| `profile` | 准备独立的下游 Profile 工程并登记显式关联。 | `yss help examples profile` |
| `profile prepare` | 生成或执行单端、联合初始化保存计划。 | `yss help examples profile prepare` |
| `project-ci` | 核验或配置项目 CI。 | `yss help examples project-ci` |
| `project-ci apply` | 应用有限原生 CI 保存计划。 | `yss help examples project-ci apply` |
| `project-ci check` | 核验完整治理或显式有限 CI。 | `yss help examples project-ci check` |
| `project-ci install` | 生成有限原生 CI 安装计划。 | `yss help examples project-ci install` |
| `project-ci plan` | 生成有限原生 CI 安装计划。 | `yss help examples project-ci plan` |
| `project-ci transition` | 核验工作单元流转条件。 | `yss help examples project-ci transition` |
| `project-ci verify` | 按完整 Git 基线核验 CI。 | `yss help examples project-ci verify` |
| `recover` | 查询或恢复未完成的项目事务。 | `yss help examples recover` |
| `rollback` | 查询或整体回退最近一次成功项目事务。 | `yss help examples rollback` |
| `runtime` | 管理独立运行记录与保护标记。 | `yss help examples runtime` |
| `runtime begin` | 创建运行记录并返回所有权 token。 | `yss help examples runtime begin` |
| `runtime commands` | 只读查询运行记录。 | `yss help examples runtime commands` |
| `runtime complete` | 以实际退出码结束运行记录。 | `yss help examples runtime complete` |
| `runtime event` | 追加运行事件。 | `yss help examples runtime event` |
| `runtime events` | 只读查询运行记录。 | `yss help examples runtime events` |
| `runtime inspect` | 只读查询运行记录。 | `yss help examples runtime inspect` |
| `runtime pin` | 维护运行记录保护标记。 | `yss help examples runtime pin` |
| `runtime pins` | 只读查询运行记录。 | `yss help examples runtime pins` |
| `runtime run` | 只读查询运行记录。 | `yss help examples runtime run` |
| `runtime unpin` | 维护运行记录保护标记。 | `yss help examples runtime unpin` |
| `skills` | 查询或补装 Skill 及其依赖闭包。 | `yss help examples skills` |
| `skills ensure` | 补装指定 Skill 及其依赖闭包。 | `yss help examples skills ensure` |
| `skills list` | 列出当前 Profile 支持的标识；--details 返回注册信息及安装声明。 | `yss help examples skills list` |
| `skills resolve` | 只读核验所选内置技能及命中的上下文依赖。 | `yss help examples skills resolve` |
| `stage` | 查询、登记或更新既有阶段工作项。 | `yss help examples stage` |
| `stage apply` | 事务应用已保存的阶段工作项计划。 | `yss help examples stage apply` |
| `stage check` | 读取并校验当前阶段工作项。 | `yss help examples stage check` |
| `stage plan` | 生成阶段工作项写入计划。 | `yss help examples stage plan` |
| `stage query` | 查询阶段或 checkpoint 中的工作项。 | `yss help examples stage query` |
| `stage register` | 生成阶段工作项写入计划。 | `yss help examples stage register` |
| `stage status` | 读取并校验当前阶段工作项。 | `yss help examples stage status` |
| `stage update` | 生成阶段工作项写入计划。 | `yss help examples stage update` |
| `sync` | 将项目模板升级到本 CLI 内置固定 Bundle。 | `yss help examples sync` |
| `update` | 安装、恢复或回退指定本地发行包。 | `yss help examples update` |
| `update apply` | 应用保存的程序安装计划。 | `yss help examples update apply` |
| `update plan` | 生成离线程序安装计划（默认动作）。 | `yss help examples update plan` |
| `update recover` | 恢复唯一未完成的程序事务。 | `yss help examples update recover` |
| `update rollback` | 回退最近一次成功程序安装。 | `yss help examples update rollback` |
| `update status` | 只读诊断安装一致性及程序事务状态。 | `yss help examples update status` |
| `upgrade` | 从 GitHub 下载并事务安装稳定版 CLI。 | `yss help examples upgrade` |
| `version` | 查看 CLI、协议和固定来源身份。 | `yss help examples version` |
| `xml` | 读取 Maven project XML。 | `yss help examples xml` |
| `xml inspect` | 读取 Maven project 结构。 | `yss help examples xml inspect` |
| `xml query` | 查询 Maven project 读取结果。 | `yss help examples xml query` |
