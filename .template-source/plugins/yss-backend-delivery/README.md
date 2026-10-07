# YSS 需求到后端交付

本开发插件使用包内固定的原生 yss 二进制和完整治理 Bundle，Profile 为 `spec`。程序版本、二进制 SHA-256、平台、协议版本、模板 commit 与 Bundle/manifest 摘要分别锁定。不会调用旧 Node CLI、私有 CommonJS API 或本机 PATH 上的 yss。

业务唯一主控仍为项目本地 `yss-product-lifecycle`。插件接入不批准阶段、Slice、实现、Git 或发布；专业提供者须在当前会话实际发现。

## 项目接入

从插件目录用绝对路径运行 `node scripts/plugin.mjs`。

- `verify` 核验精确文件集合、mode 与 SHA-256；`doctor` 核验固定二进制平台和 Bundle 以及适用治理工具依赖。
- `project-plan --target-dir <独立绝对目录> --project-name <名称> --business-domain <领域> --issue-tracker <已选择平台>` 返回只读计划，不创建项目。保存整个 JSON 后用 `project-apply --plan <绝对计划文件>` 执行已授权计划。初始化选取完整治理资产，身份和 `.yss-backend-plugin.json` 由同一原生事务写入。
- `project-check --target-dir <绝对治理根>` 核验原生身份、当前来源、词汇与绑定；`project-bind-plan` / `project-bind-apply` 接入匹配且未绑定的原生项目。
- `project-migration-plan` / `project-migration-apply` 接入旧身份；`project-upgrade-plan` / `project-upgrade-apply` 更新既有原生插件绑定。展示保存计划后按授权执行，不直接改 metadata。旧 metadata 和 `.yss-plugin.json` 保留原字节，并将其摘要作为事务输入。
- 已绑定项目更换模板、Bundle 或二进制来源时，使用新插件的 `project-upgrade-plan` / `project-upgrade-apply`。直接 `yss sync` 缺少新绑定会返回 `BINDING_REQUIRED`；已登记身份与绑定本身不一致则返回 `BINDING_CONFLICT`。同一来源的治理资源补装仍可使用原生公开入口，其计划保护既有绑定 bytes 与 mode。
- `project-status`、`project-recover`、`project-rollback` 默认只读；后两者写入需 `--apply`。恢复和最近事务回退一起处理原生身份、治理文件、绑定及职责 scope。并发修改与摘要漂移停止回退并保留现场。
- 写入期间收到 SIGINT/SIGTERM 时，插件转发取消并等待原生事务结束，返回原始取消协议与退出码。仅剩已完整恢复的 `.yss` 初始化档案时，可重新预演初始化；是否接受由原生公开入口校验。未知、未完成或异家族历史仍阻断。
- `project-entry --target-dir <绝对治理根> --mode new|reuse|resume --input <JSON文件>` 交回项目本地主控。new 用空对象，reuse 提供项目内 `artifact_refs` 或 checkpoint，resume 必须提供 checkpoint。交接不是阶段完成或实现许可。

旧格式未完成事务继续使用仓外恢复包中的固定原版本执行器；不由新版猜测恢复。更早的 M4 / v0.2 绑定先用对应归档插件的公开迁移入口桥接到已登记旧版本，再迁移原生身份。原生 rollback 只回退第二阶段；第一阶段使用旧桥接独立备份恢复，不宣称旧协议直迁。旧桥接可能同步 CONTEXT，须从其独立备份按 before/after 摘要与 mode 守卫恢复原字节，再完成旧公开 check 与新迁移；此保护恢复是额外步骤。旧 npm 版本长期保留可得，不 unpublish。插件升级不自动改写已有项目。

## 构建

`node .template-source/plugins/yss-backend-delivery/build.mjs --binary <固定绝对yss路径> --output <不存在目录/yss-backend-delivery> [--binary-commit <完整SHA>]`

构建通过公开 `bundle inspect` / `bundle export` 获取完整资产，并核验逐文件 bytes、mode 与摘要；不使用临时覆盖层。产物仅包含固定二进制、治理资产、单一入口和诊断脚本。保存的 Bundle provenance 不等于二进制已提交来源；程序 commit 和 sourceState 由固定二进制 version 协议记录，`--binary-commit` 只验证既有完整 SHA 一致性。本轮构建保持开发资格。

本地机制验证、真实业务交付、已安装 Codex 会话、六平台原生运行与稳定发布分别验收。当前产物保持 `release_ready: false`；不写已安装 cache，不提交、推送或发布。

后端输出范围为 Plan → Spec → Design → 工程契约 → 后端实现与交付。初始化 tracker 必选 github/gitlab；`--backend-root` 只登记独立既有后端候选，不写业务代码。`project-import-design`、`query-project`、`project-resume`、`project-dispatch` 保留治理交接；生产前端不属于此插件职责。

原生行为测试必须提供固定 `YSS_PLUGIN_TEST_BINARY`；旧身份测试另提供 `YSS_PLUGIN_LEGACY_SPEC` / `YSS_PLUGIN_LEGACY_DESIGN` 的固定恢复包根，以及 `YSS_PLUGIN_LEGACY_ARCHIVE_ROOT`。跨二进制升级测试还需真实前版的 `YSS_PLUGIN_PREVIOUS_BINARY` 与独立固定摘要 `YSS_PLUGIN_PREVIOUS_BINARY_SHA256`。缺少输入时报错，不能跳过后仍宣称行为已验证。

## 受管资产升级决议

`project-upgrade-plan` 和 `project-migration-plan` 支持 `--review-out <项目外新目录>`、`--base-bundle <离线历史Bundle>`。存在冲突时先保存插件计划，再通过 `--plan <原插件计划> --resolution-file <决议文件>` 重新规划，保存新插件计划后交相应 apply 入口。决议摘要绑定容器内的原生计划；新 binding、受管文件、锁及 metadata 在同一原生事务中应用和验证。`readyToApply=false` 的计划保持阻断，旧 Context 单独诊断，业务与批准资产保留。计划 v2、Bundle v3、metadata v3；插件和原生 JSON envelope 继续 v1。
