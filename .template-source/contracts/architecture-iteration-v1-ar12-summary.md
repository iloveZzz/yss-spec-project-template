# AR-12 进展（第 4 步：backend、frontend 的校验部分）

状态：**已完成（范围已按维护者决定调整）**。第 1～5 片完成（OpenAPI 校验、后端终点、后端交付包、脚手架架构选择记录、Slice 执行前检查）；前端三项因决定整条移除而不迁移。沿用口径：回放 → 薄壳 → 最后统一删除；每片只在本机单平台验证，固定档攒几片再统一重建（仍为 `40926d1`，未更新）。

## 1. 入口盘点

| 入口 | 归属 | 状态 |
|---|---|---|
| `verify-openapi-draft-validation-record` | 校验 | **第 1 片完成**：yss 公开 `contract verify --kind openapi-validation [--allow-template]` |
| `complete-backend-delivery verify` | 校验 | **第 2 片完成**：yss 公开 `contract verify --kind backend-delivery-terminal`；`complete` 是写终点的工作流，留 Node |
| `backend-delivery verify` | 校验 | **第 3 片完成**：yss 公开 `handoff verify --kind backend-delivery --package <目录\|ZIP>`；`export`、`import` 是工作流，留 Node |
| `verify-frontend-delivery`、`verify-frontend-strategic-preflight`、`verify-frontend-implementation-evidence` | 校验 | **不迁移**（见 §4）：前端移交验证整条线后续会移除 |
| `slice-contract verify`（执行前检查，AR-10 移交） | 校验 | **第 5 片完成**：yss 公开 `contract verify --kind slice-preflight`，输出与 Node 同形的报告；`prepare`、`migrate`、`view`、`diff` 是工作流，留 Node |
| `verify-scaffold-architecture-decisions` | 校验 | **第 4 片完成**（维护者选「yss 新增独立 kind」）：yss 公开 `contract verify --kind scaffold-decisions [--allow-template]` |
| `verify-yss-dto-openapi-profile` | 模板数据检查 | 不迁：校验技能参考数据，不是项目资产，Go 里没有对应 |
| `verify-backend-platform-matrix`、`backend-platforms`、`backend-standards-coverage`、`audit-*`、`preflight-delivery` | 工作流与工具 | 留 Node（FR-010） |

## 2. 五片结果

| 片 | yss（`.work/yss-cli`，分支 `arch/ar-12`） | 根仓 | 回放 |
|---|---|---|---|
| 1 OpenAPI 校验 | `0d32ef4`，令牌 `contract.openapi-validation.v1` | `1ccb6287` | 17 类（含 `--allow-template`）与 Node 结论一致；原场景改用真实实例根 |
| 2 后端终点 | `5546023`，令牌 `contract.backend-terminal.v1` | `c84f2425` | 真实 Backend 实例夹具：通过、缺 check、错 Slice、错 Profile、缺契约报告、缺下游责任、审查状态与交付记录字节变化、无类型 Fresh 报告共 9 类一致；通过时 coverage 与 Node 结果逐字段相等 |
| 3 后端交付包 | `9924f65`，令牌 `handoff.backend-delivery-package.v1` | `7b111eaf` | 同一夹具导出的包：目录、ZIP 通过，载荷字节变化、清单文件被删、多出文件、`bundle_digest` 被改、版本被改、缺清单共 8 类一致 |
| 4 脚手架架构选择记录 | `c6a0863`，令牌 `contract.scaffold-decisions.v1` | 本提交 | 14 类（通过、继承通过、缺确认引用、模块闭包缺失、继承不一致、覆盖无说明、project_id 重复、父项目不存在、根默认声明父项目、未知 Profile、未知平台、数据库不是 h2、正式记录标成模板、输入摘要变化）加 `--allow-template`，与 Node 结论一致 |
| 5 Slice 执行前检查 | `ec917e5`，令牌 `contract.slice-preflight-report.v1` | 本提交 | 真实 Backend 夹具（v3 Slice）7 类：通过（报告逐字段相等）、不给批准引用、注册表内容变化、Compiler 合同内容变化、Slice 字节变化、批准引用不存在、上游技术设计字节变化（合同无法读取）；加薄壳冒烟 |

第 4 片：Node 校验逻辑从脚本搬到 `scripts/lib/scaffold-decisions-verify.mjs`（回放对照，AR-12b 删除），`scripts/verify-scaffold-architecture-decisions` 改为薄壳（新增 `--root`，默认仓根）；回放在 Backend 实例里跑（平台目录与证据只在 Backend 实例里），并入 `tests/go-validator-replay.test.mjs`；原场景改用 Backend 实例根，登记 `check.scaffold-decisions-scenarios`。

后端回放在独立文件 `tests/go-validator-replay-delivery.test.mjs`（夹具构建约 40 秒，整份约 2.5 分钟），登记为 `check.go-validator-replay-delivery`，只在相关路径变化时选中；OpenAPI 回放并入 `tests/go-validator-replay.test.mjs`，场景登记为 `check.openapi-validation-scenarios`。三个薄壳（`verify-openapi-draft-validation-record`、`complete-backend-delivery verify`、`backend-delivery verify`）只翻译参数、透传结论与退出码；缺能力令牌时给出升级提示。

第 5 片：Node 的批准阶段（createApprovedExecutionContext）除了核对批准本身，还核对合同自身（写范围、就绪条件、Skill/Compiler 冻结摘要、resolution 当前性、架构身份摘要），所以注册表或 Compiler 变化在 Node 里落在「批准」层（原因码 `EXECUTION_CONTRACT_STALE`）；yss 的预检按同样的分层实现，新鲜度层（`technical-design-stale-or-unavailable` 等）逐项独立评估，原因码与 Node 一致。批准失败时两边的原因码按各自实现命名（Node 用内部码或文字，yss 用错误码），回放只比较结论与分层。

## 3. 回放发现并修掉的 Go 缺陷

- `contractOpenAPIReferences` 用 `any(cache[file]) == nil` 判断文件是否已缓存，nil map 装进 `any` 后不等于 nil，指向其他文件的 `$ref`（`shared.yaml#/Widget`）永远报「引用不可解析」。这条路径同时被冻结校验使用，原先无人发现。已在 `0d32ef4` 修复。

## 4. 前端移交验证：不迁移（维护者决定，2026-10-13）

前端接收（`verify-frontend-delivery`）、前端战略预检（`verify-frontend-strategic-preflight`）、前端实现证据（`verify-frontend-implementation-evidence`）三项不再迁移到 yss，因为前端移交验证这条线后续会整个移除。

- 已丢弃：根仓第四片提交 `0a507f69`（前端接收薄壳、独立回放文件、场景里的 yss 对拍、发行验证开对拍的一行、`check.go-validator-replay-frontend` 与路由、`frontendDelivery` 能力需求）；未提交的第五片（预检对拍、把预检抽成独立函数、`frontend-preflight` 公开 kind、令牌 `contract.frontend-preflight-report.v1`）；yss-cli 提交 `b789687`（前端接收同形报告、`--expected-digest`、两处 Go 修正）。
- 丢弃 `b789687` 的同时放弃了其中两处 Go 修正：接收记录里 `backend_dependency.route_id` 不必等于后端消费者路线、后端不适用时接收记录的 `backend_dependency` 不必等于预检里的绑定。这两处 Go 比 Node 宽松，只影响前端接收校验，随该线移除；如果移除没有发生，需要重新补上。
- AR-12b 把前端移交验证的 Node 实现整条删除（不是替换为 yss）。
- 保留的事实：两个既有场景（`前端 v2 预检与 v3 接收…`、`v5 既有基线与后端交付联合接收…`）在没有真实实例种子（`YSS_DELIVERY_TEST_*_ROOT`）时失败，是 Profile 子模块移除后就存在的既有失败，与本片无关。

## 5. 未覆盖

- Slice 执行前检查：v2 合同的结构层（`missing:*`、`work-unit-*` 原因码）与新鲜度层的几类原因（`architecture-*`、`component-binding-drift`、`frontend-delivery-stale-or-unavailable`）没有对应的夹具，只由代码对照保证；v3 夹具里这些情形多在批准层或合同读取层就被拦下。
- 后端终点回放没有覆盖 `local-evidence` 模式。

## 6. 验证口径与限制

- 每片只跑受影响范围：回放、对应场景、`legacy-coverage`、导入方向检查、语法检查；`scripts/verify-template-fast --plan` 在起点之后的整段改动上没有「未映射路径」。未跑 `verify-template-fast` 全量。
- 既有失败（与本批无关）：`verification-selection` 的资格用例、`verification-execution` 的「显式legacy」用例；`profile-consumers` 里依赖 PATH 上旧 yss 的用例需用本机构建的 yss（`YSS_NATIVE_BINARY`）。
- 新增三个能力令牌，未更新固定档；PATH 上的旧 yss 缺令牌时薄壳提示升级。
- 本批把 `contractSliceFresh` 里的工程与工作单元选择抽成 `contractSliceSelect`，行为不变，但没有重跑 `tests/go-validator-replay.test.mjs` 全量（维护者要求快速验证）；跑过的是后端交付回放 30 个（含 slice 的既有 `contract verify --kind slice` 无单独回放）。风险点在 AR-12b 开工前补跑全量。
