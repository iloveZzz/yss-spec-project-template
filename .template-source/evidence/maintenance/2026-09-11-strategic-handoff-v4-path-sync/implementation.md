# 本体、战略设计与战术交付路径同步实施记录

本轮按当前用户批准的实施计划执行 `template-source` L3 跨仓维护，目标状态为 `implementation-ready`。未执行 commit、push、PR、GitHub 发布或 npm publish。

## 受保护基线

开始实施时根仓、四个模板子仓及五个 CLI 仓均按受保护脏工作树处理。既有 A/B 准备和战略职责修复属于本轮复用输入；无关变化保持原位，没有执行清理、reset 或覆盖。历史证据目录保持只读，新结果写入本目录。

| 仓库 | 基线 HEAD |
|---|---|
| 根本体 | `99061076f951d9fdf2f54eaa24d1edf745aefa65` |
| 战略模板 | `41fb25425928153791f7d92a85eb717f4eb2d546` |
| dev 模板 | `55c28a8a66b9c0f8aa6fd09b7881a58c550858a9` |
| backend 模板 | `cc222154f5e20c153a3cead93263572ff8c4bbd0` |
| frontend 模板 | `730fb25ecf2ad7883fbf35acf8bd1a28b53b5e77` |
| create-yss-spec | `c67e4ca888289df9c3d527d15fb6c71e9c4e6d45` |
| create-yss-strategic-design | `7278d72788cc1784498d0823413d8462cb690687` |
| create-yss-harness-dev | `3c4e06ba81f84ee128a8d6f85d9440c3d3b9b707` |
| create-yss-harness-backend | `13e064b48d1140d55aebefdbae1c31e380599257` |
| create-yss-harness-frontend | `96ca5d162f4146702d50543c7ccffd9f235e548f` |

批准计划记录的 `sync-strategic-handoff-tools --check` 初始 12 处漂移已纳入本轮修改，最终检查为零漂移。

## WP1-WP6 实施结果

- WP1：四类 profile 升级为 schema v2 并强化闭合校验；战略 registry 从 shadow 切换为 active；前端活动路由移除 Tactical Design，新增 Frontend Engineering Design。
- WP2：战略权威 `yss-stage-decision` 支持 Domain Strategy v3 与 Stage Decision Package v3；v2 保持只读，显式迁移结果为 draft 且必须重新批准。稳定 ID、证据和悬空引用均 fail closed。
- WP3：公共 Handoff v4 使用 `consumer_routes` 表达 backend、frontend 和 coordination 能力；v3 使用独立旧 schema 严格验证。Import Receipt v2 生成路由化草案，不改变包 v1 的不可覆盖、摘要、ZIP 和目录安全语义。
- WP4：后端先接收 `backend-technical-design`，再按批准架构分流 DDD/MVC；前端以 Strategic Preflight 起草工程设计，只有 Backend/API/Data 命中时才等待 Backend Delivery；dev 分离聚合两端状态。
- WP5：Consumer Feedback v1 与 Feedback Adjudication v1 独立于历史包，覆盖 `keep|amend|defer`、阻断传播、重发和摘要失效。
- WP6：根本体和四模板生成公共工具 lock；backend 路径适配使用显式命名转换；五个 CLI 快照与生成实例携带 `sourceState` 和 `snapshotHash`，本地同步明确标记为 `working-tree`。

## Fresh Verification

- Handoff v3/v4 目录、ZIP、重复导入、消费者路由、跨版本和反馈闭环场景：13/13 通过。
- 前端 Strategic Preflight / Delivery Acceptance v1-v2、UI-only N/A 和后端绑定场景：9/9 通过。
- 后端技术设计 DDD/MVC、OpenAPI 和交付绑定场景：29 项通过。
- 战略 v2/v3 校验、迁移后未重批及 profile 压力场景通过；四类 profile 正例和负例均通过。
- create-yss-spec 全量 183/183；create-yss-strategic-design 全量 37/37；backend、frontend CLI 各 1/1；dev CLI 串行全量 82/82。
- 五个 CLI 均完成临时 npm 打包和真实 project-instance 初始化；生成实例的 profile、lifecycle、Skill lock、来源状态和快照摘要验证通过。
- 根仓与九个子仓 `git diff --check` 通过，修改或新增 JSON 均可解析。本轮打包均输出到系统临时目录，没有新增仓内 tarball、备份或 staging；2026-09-10 的 `create-yss-spec-3.3.3.tgz` 和 2026-09-04 的 dev `.template-staging-WIkaKg` 是实施前已有的 ignored 资产，按脏工作树保护原则保留。

dev CLI 最后一轮并行全量测试曾出现 3 个失败：committed 临时源的 `requestedRef` 仍记录分支名，以及两个并发嵌套 release 验证争用内部 60 秒窗口。修复后 committed source 固定记录实际 40 位提交；全量命令使用 `--test-concurrency=1`，不放宽运行时校验超时。两个失败 attach 用例先单独通过，随后全量 82/82，并从实际 npm tarball 再次初始化 project-instance 验证通过。

## 交付边界

公共工具 lock 和五个 CLI 快照当前都准确声明 `source_state/sourceState=working-tree`，因此只能支持 `implementation-ready`。`scripts/verify-strategic-handoff-tools-lock --require-committed` 按预期拒绝并退出 1；这条门禁防止未提交源码进入 candidate/release，不是实施失败。

如后续取得 Git 授权，应按子模板仓、根仓 gitlink/locks、CLI 仓顺序形成提交，再刷新 committed-source lock/snapshot 并运行 candidate/release 验证。Git push 与 npm publish 仍需分别授权。
