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
