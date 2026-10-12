# AR-12b 前端移除盘点（2026-10-13，只读调查，未动手）

维护者决定：前端移交验证整条线移除；范围先定为「只移 Profile 和移交验证，前端技能保留」，旧前端实例升级时明确拒绝并提示已移除，排期合并在 AR-12b。调查发现前端线比 Profile 和移交验证宽，下表是实测范围。

## 1. 命中范围

| 区域 | 内容 | 规模 |
|---|---|---|
| Profile 本体 | `profiles/frontend`（`AGENTS.md`、`CONTEXT.md`、`DESIGN.md`、覆盖层脚本、技能锁） | 135 个文件，约 1.2 MB |
| yss（`.work/yss-cli`） | `domain.Profiles["frontend"]`；打包（`producer.go`、`render.go`、`skill_composition.go`、`updater.go`、`bundle/rules/frontend.json`、`bundles.json.gz`、`version-table.json`）；项目（`profile_prepare.go`、`legacy_recovery.go`、`skill_migration.go`、`identitymeta/profile_links.go`）；命令行帮助、教程、`--frontend-root`；发布工具（`tools/release/assemble.go`、`gate_evidence.go`、`tools/package`、`tools/refresh-source-lock.mjs`）；`docs/`；治理语义（`contract verify --kind frontend-delivery`、前端实现证据、本地前端输入、`handoff verify` 的 frontend 消费者、`progression`、`task`、`next_route`、`daily`、`profile_guidance`） | 约 40 个 Go 文件、111 处 `"frontend"` |
| 根仓 Node | `frontend-delivery.mjs`、`frontend-delivery-boundary.mjs`、`verify-frontend-delivery`、`verify-frontend-strategic-preflight`、`verify-frontend-implementation-evidence`、`existing-ui-baseline.mjs`、`ui-baseline.mjs`、`strategic-consumer-entry`；11 处调用（编译器 `implementation-contract-compiler.mjs`、`lifecycle-transition.mjs`、`task-package.mjs`、`slice-task-package.mjs`，含 `profiles/backend`、`profiles/frontend` 覆盖层副本）；场景与夹具（`frontend-delivery/scenarios.mjs`、`tests/scenarios/verify-existing-ui-baseline-scenarios.mjs` 等） | 约 30 个文件 |
| **Spec 生命周期** | `lifecycle-registry.yaml` 里的门禁 `gate.frontend-delivery-inputs-verified`、`gate.frontend-implementation-verified`，工作单元 `work-unit.frontend-implementation-verification`，产物 `artifact.frontend-implementation-plan/-verification`，证据与检查 `check.frontend-delivery-inputs-verified`、`check.frontend-implementation-verified`；`orchestration-contract.yaml` 41 处；推进目标 `frontend-accepted`；`.template-spec` 与核心技能共 69 个文件含 frontend | 稳定 ID 与冻结的旧覆盖清单（117 条命令逐字节不变）都会受影响 |

## 2. 需要维护者先定的边界

「前端移交验证」按字面是上表第 1、2 行的外部消费者部分（Profile、`frontend_delivery` 绑定、移交预检与接收）。第 3 行的**本地前端实现**（Spec 实例里同一功能的前端实施计划、验证证据、`frontend-accepted` 推进目标）是同一条线的另一半，是否一并移除会决定：

- 一并移除：要改生命周期注册表的稳定 ID（门禁、工作单元、产物、检查）、编排合同、推进目标协议与相关技能；`schema` 需按「常驻两代」处理旧实例；冻结覆盖清单里相关命令要保留文本但不再被选中。
- 不移除本地前端实现：只删外部 Profile 与移交验证，Spec 里的本地前端门禁继续存在，但它们依赖的 `verify-frontend-implementation-evidence`（已决定不迁移）要么保留 Node 实现，要么一并删除。

## 3. 建议顺序（边界定下后）

1. yss-cli：从 `domain.Profiles` 移除 frontend；`init --profile frontend` 拒绝；`upgrade`、`sync` 对已有 frontend 实例返回「前端 Profile 已移除」的明确错误，文件原样保留；删前端治理语义；打包、发布与源码锁工具去掉 frontend；重新生成 `bundles.json.gz` 与版本对照表。
2. 根仓：删 `profiles/frontend`，删前端 Node 实现与调用点（含 backend 覆盖层副本），删场景、夹具、验证登记与路由；文档、来源锁、分发清单去掉 frontend。
3. 迁移规则：已有实例里被取代的前端文件按 FR-016 作为可拒绝的删除提出。
4. 再继续 AR-12b 其余删除（approval/user-decision 等）。

## 4. 维护者决定与实测规模（2026-10-13）

维护者的决定：前端整条线都移除，包含 Spec 生命周期里的本地前端实现；前端技能（`yss-ui`、`formily` 系列、`yss-frontend-scaffold-generator` 等）保留；旧前端实例升级时明确拒绝并提示已移除，不删除、不迁移。

按这个范围实测，根仓里提到 frontend 的非 Profile 文件（不含 `archify` 示例页与冻结的旧覆盖清单）有 70 多个，规模最大的几类：

- 生命周期与合同：`lifecycle-registry.yaml`、`lifecycle-registry-baseline*.json`、`orchestration-contract.yaml`（41 处）、`digital-human-roles.yaml`（22 处）、`yss-skill-registry.yaml`（26 处）、`compiler-contract.yaml`、`project-scaffold-contract.schema.json`。**Slice 合同本身带 `frontend` 段**（`slice-contract.mjs`、`slice-contract-preparation.mjs`、`implementation-contract-compiler.mjs`、`harness-execution-scope.mjs`、`lifecycle-transition.mjs`、`lifecycle-readiness.mjs`、`lifecycle-execution-scope.mjs`），删它等于改 Slice 合同的 schema 与稳定 ID。
- 交接域：`strategic-handoff.mjs`、`strategic-handoff-consumption.mjs`、`backend-delivery.mjs` 里的前端消费者路线（Handoff v4/v5 的 `consumer_routes` 含 `frontend-engineering-design`），同样要改交接包 schema 的消费者能力集合。
- 测试与夹具：约 25 个文件（前端交付、既有 UI 基线、Slice 合同 v3、任务包前端边界、生命周期推进等）。
- yss：Profile 登记、打包与发布工具、帮助与教程、约 16 个治理语义文件；`bundles.json.gz`、来源锁（四个 Profile 的数量约束）、版本对照表、固定二进制都要按「根仓先提交、再刷新来源锁、再重建 yss、再更新固定档」的顺序重来一遍。

这不是 AR-12b 里一片能做完的事：它改稳定 ID、Slice 合同 schema 和 Handoff schema，并且依赖多步发布顺序，每一步都需要完整的验证。建议单独立项为 **AR-12c「前端整线移除」**，按下面顺序、每片独立提交与验证：

1. 规格与计划修订（FR-016 的删除规则、旧实例「常驻两代」、被取代的稳定 ID 清单、冻结覆盖清单的处理），维护者确认。
2. 交接域：Handoff 消费者路线去掉 frontend（schema 常驻两代，旧版只读）。
3. Slice 合同与编译器：去掉 `frontend` 段（schema 常驻两代）。
4. 生命周期注册表、编排合同、角色、技能注册表：去掉前端门禁、工作单元、产物、检查与推进目标。
5. 根仓：删前端 Node 实现、场景、夹具、验证登记与路由，删 `profiles/frontend`。
6. yss：移除 Profile 与前端治理语义，旧前端实例升级时明确拒绝；重建打包与固定档。
7. 实例迁移：被取代的前端文件作为可拒绝的删除提出。

AR-12b 余下部分（approval、user-decision 等 Node 实现的删除，以及各步骤保留的回放对照实现改为录制 fixture）与 AR-12c 互不依赖，可先做；其中交接源检查与 `business-tickets` 校验迁到 yss 的前置工作见 AR-11 总结第 7 节。
