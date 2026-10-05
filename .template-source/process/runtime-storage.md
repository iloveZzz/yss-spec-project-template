# 模板维护运行产物留存策略

模板维护控制新增运行产物的数量，将普通执行事件集中保存到仓外运行存储。正式维护证据使用仓外可独立核验的文件包；源码树仅保存现行资产和必要工程依据。共同操作规则见 [运行记录与证据留存](../../.template-spec/process/runtime-storage.md)。

## 产物与留存

| 产物 | 模板源处理 |
|---|---|
| Schema、注册表、锁文件、Skill 配置 | 保留文本文件与版本历史，通过现有脚本生成派生内容 |
| 当前 checkpoint、批准、用户决定、迁移回执、恢复事务 | 维护记录保存在仓外持久目录，绑定原字节摘要；项目实例不改变规则 |
| 普通验证事件、耗时、重试及命令状态 | 进入 SQLite，不逐事件生成 JSON / YAML |
| stdout / stderr | 仓外流式保存；普通成功 7 天，失败、超时、取消 30 天 |
| 重复运行输入清单 | 以原字节摘要压缩去重，原报告绑定该摘要 |
| 交付、正式审查、发布和明确报告目录的证据 | 导出独立文件包并永久保护 |
| 可重建查询索引 | 按源文件摘要更新，过期索引不能参与门禁裁决 |

清理使用 `scripts/runtime-store plan-gc` 和 `apply-gc`，执行时重新检查正式引用、进程占用及输入变化。保护材料不受普通日志留存期影响。数据库与日志都不进入源码输入扫描；运行记录的历史通过结果不替代本次 Fresh Verification。

## 仓外维护目录与引用

复用 `~/.yss-harness/runtime/<workspace-id>/maintenance/`，可通过 `YSS_RUNTIME_HOME` 指定持久仓外根。workspace-id 由真实工作区根路径的 SHA-256 计算，不能借用其它工作区。下设 `archives/`、`candidates/`、`research/`、`diagrams/`、`cache/` 和 `wiki/`。正式材料不使用 `RUNNER_TEMP` 作为唯一存储；CI 需导出独立包。

使用 `scripts/maintenance-path <类别>/<运行 ID>/<文件>` 解析输出位置；维护合同使用 `maintenance:<相对路径>`，验证记录绑定 `evidence_digest`。只在 template-source 维护合同中解析这些引用，产品实例与 Slice 保持既有路径权限。独立包内使用规范相对路径，拒绝绝对路径、上级跳转、符号链接和错误工作区。

新候选 manifest schema v2 声明 `reference_base: bundle` 和工作区身份，原字节流、摘要及三文件原子捕获保持不变；旧候选仅兼容读取。Wiki 事务、旧日志、备份与完成收据保存在 `maintenance:wiki/<wiki-id>/`，仓内日志只保存最新运行入口。

模板验证指纹观察已跟踪、未跟踪及忽略文件，仅排除经 Git 确认忽略的 `.codegraph/` 和 `.idea/` 工具运行状态；这些目录中已跟踪文件及其它忽略资产仍参与漂移检测。普通只读 intake 继续观察全部文件。快速入口自动升级为全量时验证当前工作树，显式 candidate / release 入口仍要求已提交来源；报告分别记录验证强度、来源要求和指纹观察规则。

## 归档与恢复

入口为 `.template-source/scripts/evidence-archive.mjs`，默认归档及索引位于 `maintenance:archives/`。执行顺序为 plan → pack → verify → remove。删除前清单必须包含逐文件路径、字节数、类型、权限和 SHA-256，解包后检查全部成员及包摘要，并再次检查源文件漂移。保留资产不能引用已移除档案。没有通过的 verify 报告不得移除；现存归档或恢复目标、摘要篡改、缺失或额外成员、路径逃逸与符号链接均拒绝。

恢复仅限对应批次，保留原字节与权限；失败只撤销当前操作。归档不重写 Git 历史，归档证据不能作为当前任务放行依据。正式维护材料及恢复包不受普通日志留存期影响。

## 来源同步与分发

运行存储的共享模块权威来源为 CLI core。`scripts/sync-strategic-handoff-tools` 生成根工具副本、主 CLI 副本及各专职模板的共享工具，更新同步锁；禁止手改这些复制品。canonical Skill 仍位于 `.agents/skills`，投影及锁文件通过仓库脚本生成。

受影响 CLI 的 Node engines 为 `>=22.13 <27`，启动入口在任何目标写入前检查版本。最低版本使用其已有的 `node:sqlite` API。兼容矩阵覆盖 Node 22.13、24、26 与 macOS、Linux、Windows，单独验证 22.12 拒绝且无写入。Windows 的独立 runtime 验收入口为 `.template-source/scripts/verify-runtime-windows.mjs`；用 `--help` 查看版本路径、源码摘要清单及仓外报告参数。非 Windows 机械检查不形成 Windows 通过证据，便携源码包不替代固定提交来源的完整验证。

分发变更需要重建并验证四个 CLI 的核心来源、模板快照、打包、干净安装和真实入口。工作树构建结果不能冒充固定提交来源的发布证据。内循环运行 `verify-template-fast`，候选运行 `verify-template-candidate`；main 与发布前执行 `verify-template`，按验证 profile 核验全部适用风险，完整 baseline 或资格未闭合时执行独立 `legacy-full`。固定版本集成仍按原发布边界闭合。

单次运行的来源清单分别绑定根模板 / core、三个专职模板 gitlink、四个 CLI gitlink、锁及包摘要。只有精确来源元组相同的构建 / 包产物才能在本轮共享；插件 pinned 来源使用独立槽位。每个消费场景持有独立可写目录，消费前后复核摘要；共享产物不复用检查通过结论，重跑使用新报告目录。确定性构建继续真实执行两次。正式报告保留失败、超时、中断、终止失败及输入漂移的原始日志和状态，不拼接历史结果。

本地维护交付默认止于 `implementation-ready`。新分发版本在当前验证闭合后默认启用 SQLite；已有实例使用显式升级计划接入。Git 提交、推送、发布及历史迁移均按各自授权执行。
