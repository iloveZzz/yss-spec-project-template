# AR-12c 进展（前端整线移除）

状态：**已完成（本机单平台验证；未推送，固定档仍为 `40926d1`，`bundles.json.gz` 与帮助视图待统一重建）**。范围见 `architecture-iteration-v1-ar12b-frontend-inventory.md` §4：前端整条线移除，包含 Spec 生命周期里的本地前端实现；前端技能（`yss-ui`、`formily` 系列、`yss-frontend-scaffold-generator` 等）与脚手架就绪检查保留。

## 1. 采用的做法：软移除

不删协议形状，只让前端不可声明、不可消费，旧资产仍可只读识别：

| 面 | 处理 |
|---|---|
| Slice 合同 | `frontend` 段保留为 `{status: not-applicable}`；声明 `required` 或携带 `frontend` 子合同直接拒绝，原因「前端实现已从生命周期移除」 |
| Handoff | `consumer_routes` 仍声明三种能力（协议兼容，常驻两代）；接收方只生成后端与协调草案，不再生成或消费前端预检和追溯草案；`handoff-consumption` 的 `frontend` 消费者被拒绝 |
| 稳定 ID | 已发布 ID 不改名，下列八个进 `id_policy.deprecated_ids`：`gate.frontend-delivery-inputs-verified`、`gate.frontend-implementation-verified`、`evidence.frontend-implementation-verification`、`artifact.frontend-implementation-plan`、`artifact.frontend-implementation-verification`、`work-unit.frontend-implementation-verification`、`check.frontend-delivery-inputs-verified`、`check.frontend-implementation-verified`；基线按 ID 重算（design Profile 基线为 schema 1，按单摘要） |
| 推进目标 | 去掉 `frontend-accepted`（schema 枚举、`completion_policy`、Go 的目标表）；业务验收只核后端、API、数据影响 |
| Profile | 删除 `profiles/frontend`；`PROFILE_NAMES` 为 `design`、`backend`；yss 的 `GetProfile("frontend")` 与旧前端实例身份（`.yss-harness-frontend.json`、`.yss.json` 的 `profile: frontend`）返回 `IDENTITY`「前端 Profile 已移除」，`sync`、`doctor`、`diff`、`migrate plan` 均拒绝且不改动文件；`init --profile frontend` 被参数校验拒绝；Profile 关联里的 `frontend` 报「请先删除该关联」 |
| 角色与编排 | 数字人角色去掉 `role.frontend-agent` 的前端草案产物与 Profile 要求；编排合同、角色表、派生图（`lifecycle-artifact-map.md`、`harness-work-unit-map.md`）重新生成 |

## 2. 提交

| 仓库 | 分支 | 提交 |
|---|---|---|
| yss-cli（`.work/yss-cli`） | `arch/ar-12c` | `be1dbf3`：删 `frontend_implementation_semantic.go`、`frontend_local_semantic.go`，移除前端交付/实现验证语义与 `frontend-delivery` 公开 kind，推进目标、日常路线、下一步路线、Profile 引导、帮助文案、来源锁与规则中的 frontend；新增 `local_implementation_inputs.go` 保留 Spec 本地输入判断（与前端无关） |
| 根仓 | `arch/ar-12c` | 本提交（见 `git log`）：约 345 个文件、净删约 2.1 万行 |

## 3. 验证（本机单平台，只跑受影响集合）

- 新增守卫 `tests/frontend-removed.test.mjs`（4 个）：`profiles/frontend` 不存在、已删脚本不存在、`PROFILE_NAMES`、八个 ID 在 `deprecated_ids` 且未定义、`frontend-accepted` 不在枚举与 `completion_policy`、Compiler 合同不含前端交付绑定；登记为 `check.frontend-removed`。
- 新增登记：`check.frontend-removal-consumers`（`lifecycle-controls`、`business-tickets/handoff`、`slice-task-package-frontend-boundary`）、`check.strategic-handoff-package-scenarios`、`check.backend-delivery-terminal`、`check.existing-ui-baseline-scenarios`；`scripts/verify-template-fast --plan` 无未映射路径。
- 通过：`import-direction`、`legacy-coverage`、`frontend-removed`、`lifecycle-controls`、`business-tickets/handoff`、`slice-task-package-frontend-boundary`（共 37）；Compiler 技能测试 15；战略交接包场景；`decision-continuation`、`review-capabilities`（40，改掉了对 `frontend` Profile 的循环）；`verify-lifecycle-registry`、`verify-digital-human-roles`；`lifecycle-progression`（36）、Slice 合同 v3 等场景在中途已按前端移除调整后通过。
- yss 本机构建 `$S/yss-ar12c`：冒烟确认旧前端实例拒绝且文件不变、`help` 不再出现 frontend。yss-cli 无 Go 测试。
- 既有失败（基线 `HEAD` 一并失败，与本片无关）：`plan-review-control` 的「真实 CLI 分发」、`plugin-*` 系列（`native-binary-required`）、`skill-supply-chain` 的两项投影用例、`strategic-handoff-sealed-owner`/`plan-clarification-replay` 的四项、`native-instance-drift` 系列（工作树缺 `.strategic-design-skills-manifest.json`）、`verification-qualification` 的「资格报告成对」用例。

## 4. 未覆盖与顺延

- **发行/候选链仍是四家族口径，随固定档更新再改**：`NATIVE_PROFILES`、`legacy-recovery-matrix`（需 4 个旧固定执行器）、`verification-report-validator`/`verification-qualification` 的 `spec,design,backend,frontend`、`check.verification-frontend-cli`（G16）与 `release_families`、`template-release` 的 `all-four`，都属于冻结台账（117 条旧检查）和已记录的发行证据，改它们要同时重录恢复矩阵与发行报告，留给「根仓提交 → 刷新来源锁 → 重建 yss → 更新固定档」那一步。本片尝试改成三家族后冻结台账测试失败，已撤回。
- 冻结覆盖清单仍按名字登记 `verify-frontend-delivery-scenarios`、`verify-frontend-implementation-evidence-scenarios`，两个入口保留为只断言「已移除」的占位场景，覆盖清单本身未改。
- 与固定档耦合的用例（`efficiency-distribution`、`runtime-store-distribution` 中遍历 `NATIVE_PROFILES` 的「四个 Bundle」用例）用新构建的 yss 会失败（`init --profile frontend` 被拒绝），用固定档二进制通过；固定档更新时同步改为三家族。

- `bundles.json.gz`、`internal/helpview/assets/*.json`、`docs/cli-help.md`、版本对照表需要「根仓先提交 → 刷新来源锁 → 重建 yss → 更新固定档」，按「攒几片再统一重建」的节奏留到下一次集中重建；此前三个 Profile 的来源锁条目已更新，frontend 条目已删。生成前，旧二进制仍内置前端 Profile。
- 冻结的旧覆盖清单（`legacy-coverage` 的历史命令列表）没有改动；指向已删路径的条目按非结构化模式登记。
- 实例迁移（把被取代的前端文件作为可拒绝的删除提出，FR-016）未做：当前策略是明确拒绝升级且不动文件，删除规则随下次固定档重建一并提出。
- 前端技能文本里个别「前端实现计划」等措辞保留（技能本身保留，指向实现仓的前端工程）。
- AR-12b 余下部分（approval、user-decision 等 Node 实现删除）与本片互不依赖，仍待做。
