# AR-12c 进展（前端整线移除）

状态：**已完成（本机验证；未推送）**。Bundle、帮助视图、帮助参考已重建，固定档已改指 yss-cli `4acb0ae`（darwin-arm64、linux-amd64、linux-arm64 三平台摘要）。范围见 `architecture-iteration-v1-ar12b-frontend-inventory.md` §4：前端整条线移除，包含 Spec 生命周期里的本地前端实现；前端技能（`yss-ui`、`formily` 系列、`yss-frontend-scaffold-generator` 等）与脚手架就绪检查保留。

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

## 4. 重建与固定档

- 来源锁仍钉在 `v4.0.0`（`1afff73`）：`refresh-source-lock` 拒绝在已钉 tag 的来源上按 HEAD 刷新，新 tag 需要单独授权，所以本片没有刷新锁。做法是锁里删掉 `frontend` 条目后按原锁重建 Bundle：三个 Profile 的模板内容不变，只去掉 frontend（`bundles.json.gz`、`internal/helpview/assets/*.json`、`docs/cli-help.md`、`version-table.json` 的 frontend 行）。yss-cli `4acb0ae`；`artifacts.mjs check --scope derived` 通过，`helpview --check`、`helpdocs --reference --check` 通过。
- 根仓固定文件 `yss-cli-pin.json` 改指 `4acb0ae`，三平台摘要来自 `tools/build-candidate.mjs`（固定 Go 环境、`-trimpath`）；`tests/cli-retirement.test.mjs` 对固定二进制通过（10）。
- 发行/候选链改为三家族：`NATIVE_PROFILES`、发行报告与资格校验的家族集合、恢复矩阵（需 3 个旧固定执行器、36 个场景）、交付运行器、合成 fixture 与计数同步。冻结台账要求 G01～G20 共 20 个 Gate 且编号连续，所以 `check.verification-frontend-cli`（G16）保留为已移除占位（`release_families: []`、不要求发行）。
- 冻结覆盖清单（117 条）仍按名字登记 `verify-frontend-delivery-scenarios`、`verify-frontend-implementation-evidence-scenarios`；清单是历史追溯的冻结件，两个入口保留为只断言「已移除」的占位场景。
- 模板内容（`.template-spec`、技能、脚本）里 AR-12c 的改动要等下一个发布 tag 才进入 Bundle；到那时再用 `refresh-source-lock --tag` 刷新锁并重建。
- 发行时的 `--cli-family all-four` 参数名保留（含义改为全部维护的三个 Profile）。

## 5. 未覆盖与顺延

- 旧前端实例不做迁移也不提出删除：按维护者决定，`sync`、`doctor`、`diff`、`migrate plan` 一律明确拒绝并提示「前端 Profile 已移除」，文件保持原样（FR-016 的删除规则对它不适用）。
- 前端技能文本里个别「前端实现计划」等措辞保留（技能本身保留，指向实现仓的前端工程）。
- AR-12b 余下部分（approval、user-decision 等 Node 实现删除）与本片互不依赖，仍待做。
