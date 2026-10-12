# AR-12 进展（第 4 步：backend、frontend 的校验部分）

状态：进行中。第 1～4 片完成（OpenAPI 校验、后端终点、后端交付包、脚手架架构选择记录）；前端三项因决定整条移除而不迁移；slice 执行前检查待定。沿用口径：回放 → 薄壳 → 最后统一删除；每片只在本机单平台验证，固定档攒几片再统一重建（仍为 `40926d1`，未更新）。

## 1. 入口盘点

| 入口 | 归属 | 状态 |
|---|---|---|
| `verify-openapi-draft-validation-record` | 校验 | **第 1 片完成**：yss 公开 `contract verify --kind openapi-validation [--allow-template]` |
| `complete-backend-delivery verify` | 校验 | **第 2 片完成**：yss 公开 `contract verify --kind backend-delivery-terminal`；`complete` 是写终点的工作流，留 Node |
| `backend-delivery verify` | 校验 | **第 3 片完成**：yss 公开 `handoff verify --kind backend-delivery --package <目录\|ZIP>`；`export`、`import` 是工作流，留 Node |
| `verify-frontend-delivery`、`verify-frontend-strategic-preflight`、`verify-frontend-implementation-evidence` | 校验 | **不迁移**（见 §4）：前端移交验证整条线后续会移除 |
| `slice-contract verify`（执行前检查，AR-10 移交） | 校验 | **待定**：见 §5 |
| `verify-scaffold-architecture-decisions` | 校验 | **第 4 片完成**（维护者选「yss 新增独立 kind」）：yss 公开 `contract verify --kind scaffold-decisions [--allow-template]` |
| `verify-yss-dto-openapi-profile` | 模板数据检查 | 不迁：校验技能参考数据，不是项目资产，Go 里没有对应 |
| `verify-backend-platform-matrix`、`backend-platforms`、`backend-standards-coverage`、`audit-*`、`preflight-delivery` | 工作流与工具 | 留 Node（FR-010） |

## 2. 四片结果

| 片 | yss（`.work/yss-cli`，分支 `arch/ar-12`） | 根仓 | 回放 |
|---|---|---|---|
| 1 OpenAPI 校验 | `0d32ef4`，令牌 `contract.openapi-validation.v1` | `1ccb6287` | 17 类（含 `--allow-template`）与 Node 结论一致；原场景改用真实实例根 |
| 2 后端终点 | `5546023`，令牌 `contract.backend-terminal.v1` | `c84f2425` | 真实 Backend 实例夹具：通过、缺 check、错 Slice、错 Profile、缺契约报告、缺下游责任、审查状态与交付记录字节变化、无类型 Fresh 报告共 9 类一致；通过时 coverage 与 Node 结果逐字段相等 |
| 3 后端交付包 | `9924f65`，令牌 `handoff.backend-delivery-package.v1` | `7b111eaf` | 同一夹具导出的包：目录、ZIP 通过，载荷字节变化、清单文件被删、多出文件、`bundle_digest` 被改、版本被改、缺清单共 8 类一致 |
| 4 脚手架架构选择记录 | `c6a0863`，令牌 `contract.scaffold-decisions.v1` | 本提交 | 14 类（通过、继承通过、缺确认引用、模块闭包缺失、继承不一致、覆盖无说明、project_id 重复、父项目不存在、根默认声明父项目、未知 Profile、未知平台、数据库不是 h2、正式记录标成模板、输入摘要变化）加 `--allow-template`，与 Node 结论一致 |

第 4 片：Node 校验逻辑从脚本搬到 `scripts/lib/scaffold-decisions-verify.mjs`（回放对照，AR-12b 删除），`scripts/verify-scaffold-architecture-decisions` 改为薄壳（新增 `--root`，默认仓根）；回放在 Backend 实例里跑（平台目录与证据只在 Backend 实例里），并入 `tests/go-validator-replay.test.mjs`；原场景改用 Backend 实例根，登记 `check.scaffold-decisions-scenarios`。

后端回放在独立文件 `tests/go-validator-replay-delivery.test.mjs`（夹具构建约 40 秒，整份约 2.5 分钟），登记为 `check.go-validator-replay-delivery`，只在相关路径变化时选中；OpenAPI 回放并入 `tests/go-validator-replay.test.mjs`，场景登记为 `check.openapi-validation-scenarios`。三个薄壳（`verify-openapi-draft-validation-record`、`complete-backend-delivery verify`、`backend-delivery verify`）只翻译参数、透传结论与退出码；缺能力令牌时给出升级提示。

## 3. 回放发现并修掉的 Go 缺陷

- `contractOpenAPIReferences` 用 `any(cache[file]) == nil` 判断文件是否已缓存，nil map 装进 `any` 后不等于 nil，指向其他文件的 `$ref`（`shared.yaml#/Widget`）永远报「引用不可解析」。这条路径同时被冻结校验使用，原先无人发现。已在 `0d32ef4` 修复。

## 4. 前端移交验证：不迁移（维护者决定，2026-10-13）

前端接收（`verify-frontend-delivery`）、前端战略预检（`verify-frontend-strategic-preflight`）、前端实现证据（`verify-frontend-implementation-evidence`）三项不再迁移到 yss，因为前端移交验证这条线后续会整个移除。

- 已丢弃：根仓第四片提交 `0a507f69`（前端接收薄壳、独立回放文件、场景里的 yss 对拍、发行验证开对拍的一行、`check.go-validator-replay-frontend` 与路由、`frontendDelivery` 能力需求）；未提交的第五片（预检对拍、把预检抽成独立函数、`frontend-preflight` 公开 kind、令牌 `contract.frontend-preflight-report.v1`）；yss-cli 提交 `b789687`（前端接收同形报告、`--expected-digest`、两处 Go 修正）。
- 丢弃 `b789687` 的同时放弃了其中两处 Go 修正：接收记录里 `backend_dependency.route_id` 不必等于后端消费者路线、后端不适用时接收记录的 `backend_dependency` 不必等于预检里的绑定。这两处 Go 比 Node 宽松，只影响前端接收校验，随该线移除；如果移除没有发生，需要重新补上。
- AR-12b 把前端移交验证的 Node 实现整条删除（不是替换为 yss）。
- 保留的事实：两个既有场景（`前端 v2 预检与 v3 接收…`、`v5 既有基线与后端交付联合接收…`）在没有真实实例种子（`YSS_DELIVERY_TEST_*_ROOT`）时失败，是 Profile 子模块移除后就存在的既有失败，与本片无关。

## 5. 待定（未动手）

（原第 2 项「脚手架架构决定」已由维护者选定并完成，见第 4 片。）

1. **slice 执行前检查**：维护者在 AR-10 选了「yss 输出同形的执行前检查报告」。批准与新鲜度原因码（`registry-digest-changed`、`compiler-contract-digest-changed`、`technical-design-stale-or-unavailable`、`architecture-identity-*`、`component-binding-drift` 等）来自 Node 独有的 `evaluateContractFreshness` 与 `createApprovedExecutionContext`，要先在 Go 里移植。
这一项需要维护者确认后再做；做的时候先移植原因码，再做回放与薄壳。

## 6. 验证口径与限制

- 每片只跑受影响范围：回放、对应场景、`legacy-coverage`、导入方向检查、语法检查；`scripts/verify-template-fast --plan` 在起点之后的整段改动上没有「未映射路径」。未跑 `verify-template-fast` 全量。
- 既有失败（与本批无关）：`verification-selection` 的资格用例、`verification-execution` 的「显式legacy」用例；`profile-consumers` 里依赖 PATH 上旧 yss 的用例需用本机构建的 yss（`YSS_NATIVE_BINARY`）。
- 新增三个能力令牌，未更新固定档；PATH 上的旧 yss 缺令牌时薄壳提示升级。
- 本地覆盖缺口：后端终点回放没有覆盖 `local-evidence` 模式。
