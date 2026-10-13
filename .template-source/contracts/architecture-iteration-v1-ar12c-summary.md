# AR-12c 进展（前端整线移除）

状态：**实现与来源锁已收尾，限本机定向验证（limited）；未推送**。Bundle、帮助视图、帮助参考已重建，固定档改指 yss-cli `0951752204eed69ab946b5df261bf04e02477cdc`（darwin-arm64、linux-amd64、linux-arm64 三平台摘要）。范围见 `architecture-iteration-v1-ar12b-frontend-inventory.md` §4：前端整条线移除，包含 Spec 生命周期里的本地前端实现；前端技能（`yss-ui`、`formily` 系列、`yss-frontend-scaffold-generator` 等）与脚手架就绪检查保留。

## 1. 采用的做法：软移除

保留兼容协议形状，让前端不可声明、不可消费；旧前端实例明确拒绝维护，文件原样保留：

| 面 | 处理 |
|---|---|
| Slice 合同 | `frontend` 段保留为 `{status: not-applicable}`；声明 `required` 或携带 `frontend` 子合同直接拒绝，原因「前端实现已从生命周期移除」 |
| Handoff | `consumer_routes` 仍声明三种能力（协议兼容，常驻两代）；接收方只生成后端与协调草案，不再生成或消费前端预检和追溯草案；`handoff-consumption` 的 `frontend` 消费者被拒绝 |
| 稳定 ID | 已发布 ID 不改名，本次新增六个弃用 ID，加上此前已弃用的两个 gate ID，以下八个均在 `id_policy.deprecated_ids`：`gate.frontend-delivery-inputs-verified`、`gate.frontend-implementation-verified`、`evidence.frontend-implementation-verification`、`artifact.frontend-implementation-plan`、`artifact.frontend-implementation-verification`、`work-unit.frontend-implementation-verification`、`check.frontend-delivery-inputs-verified`、`check.frontend-implementation-verified`；基线按 ID 重算（design Profile 基线为 schema 1，按单摘要） |
| 推进目标 | 去掉 `frontend-accepted`（schema 枚举、`completion_policy`、Go 的目标表）；业务验收只核后端、API、数据影响 |
| Profile | 删除 `profiles/frontend`；`PROFILE_NAMES` 为 `design`、`backend`；yss 的 `GetProfile("frontend")` 与旧前端实例身份（`.yss-harness-frontend.json`、`.yss.json` 的 `profile: frontend`）返回 `IDENTITY`「前端 Profile 已移除」，`sync`、`doctor`、`diff`、`migrate plan` 均拒绝且不改动文件；`init --profile frontend` 被参数校验拒绝；Profile 关联里的 `frontend` 报「请先删除该关联」 |
| 角色与编排 | 数字人角色去掉 `role.frontend-agent` 的前端草案产物与 Profile 要求；编排合同、角色表、派生图（`lifecycle-artifact-map.md`、`harness-work-unit-map.md`）重新生成 |

## 2. 提交

| 仓库 | 分支 | 提交 |
|---|---|---|
| yss-cli（`.work/yss-cli`） | `arch/ar-12c` | `be1dbf3`：删 `frontend_implementation_semantic.go`、`frontend_local_semantic.go`，移除前端交付/实现验证语义与 `frontend-delivery` 公开 kind，推进目标、日常路线、下一步路线、Profile 引导、帮助文案、来源锁与规则中的 frontend；新增 `local_implementation_inputs.go` 保留 Spec 本地输入判断（与前端无关） |
| 根仓 | `arch/ar-12c` | `d6b6fb0d`：前端整线移除；`7acc4137`：发行链改为三家族；`332560ac`：模板来源 tag `v4.0.1` 的固定点；本次后续提交补最终固定档、验证配置、回归与交付记录 |

## 3. 验证（本机单平台，只跑受影响集合）

- 新增守卫 `tests/frontend-removed.test.mjs`（5 个）：`profiles/frontend` 不存在、已删脚本不存在、`PROFILE_NAMES`、本次弃用的六个 ID 在 `deprecated_ids` 且未定义、`frontend-accepted` 不在枚举与 `completion_policy`、Compiler 合同不含前端交付绑定；登记为 `check.frontend-removed`。
- 新增登记：`check.frontend-removal-consumers`（`lifecycle-controls`、`business-tickets/handoff`、`slice-task-package-frontend-boundary`）、`check.strategic-handoff-package-scenarios`、`check.backend-delivery-terminal`、`check.existing-ui-baseline-scenarios`；`scripts/verify-template-fast --plan` 无未映射路径。
- 通过：`import-direction`、`legacy-coverage`、`frontend-removed`、`lifecycle-controls`、`business-tickets/handoff`（早期定向集合）；Compiler 技能测试 15；战略交接包场景；`decision-continuation`、`review-capabilities`（40，改掉了对 `frontend` Profile 的循环）；`verify-lifecycle-registry`、`verify-digital-human-roles`；`lifecycle-progression`（36）、Slice 合同 v3 等场景在中途已按前端移除调整后通过。历史边界测试 `slice-task-package-frontend-boundary` 已随前端删除，最终消费者命令已去掉该失效操作数。
- yss 本机构建 `$S/yss-ar12c`：冒烟确认旧前端实例拒绝且文件不变、`help` 不再出现 frontend。yss-cli 无 Go 测试。
- 先前扩展检查记录的既有失败（不作为本片通过证据）：`plan-review-control` 的「真实 CLI 分发」、`plugin-*` 系列（`native-binary-required`）、`skill-supply-chain` 的两项投影用例、`strategic-handoff-sealed-owner`/`plan-clarification-replay` 的四项、`native-instance-drift` 系列（工作树缺 `.strategic-design-skills-manifest.json`）。最后一轮 Bundle 验证原为 289 项、288 通过、1 失败；失败是 `verification-gates` 的资格来源断言，被上述失效输入遮蔽。本轮修复后按当前字节重验，结果见仓外 checkpoint 证据。

## 4. 重建与固定档

- 维护者已授权本地 tag `v4.0.1`，固定于根仓 `332560acfbfe59208b3e499074429a4450fb5748`；未推送 tag。CLI 的三个 Profile 来源锁均已刷新到该 tag，AR-12c 的模板、技能和脚本改动已进入 Bundle。
- yss-cli `f65fa125e75571958737e644a8534ebebbabd837` 包含来源锁、`bundles.json.gz`、帮助视图及帮助参考；`artifacts.mjs check --scope derived` 退出 0。后续 `0951752204eed69ab946b5df261bf04e02477cdc` 修复 Spec 日常前端入口遗漏，根仓 `yss-cli-pin.json` 固定这一最终提交和三平台 SHA-256；Bundle 来源仍为 `v4.0.1`。
- 三平台构建回执均为 `sourceState: committed`、`inputDrift: false`；本次重新逐项核对构建输入与实际二进制摘要一致。darwin-arm64 执行本机验证，Linux 两个平台只交叉编译，未做运行验收。
- 来源 tag 后仅补模板源维护配置、测试、固定档与交付记录，不移动 tag；这些收尾文件不作为实例运行模板变更重新打包。
- 发行/候选链改为三家族：`NATIVE_PROFILES`、发行报告与资格校验的家族集合、恢复矩阵（需 3 个旧固定执行器、36 个场景）、交付运行器、合成 fixture 与计数同步。冻结台账要求 G01～G20 共 20 个 Gate 且编号连续，所以 `check.verification-frontend-cli`（G16）保留为已移除占位（`release_families: []`、不要求发行）。
- 冻结覆盖清单（117 条）保持原样；两个历史前端场景入口只断言已移除。`--cli-family all-four` 参数名继续兼容，含义为全部维护的三个 Profile。
- 最终核对发现资格输入还引用已删除的前端 fixture 和 AR-06 旧锁，现已移除这两个失效绑定；其余输入与摘要核验保持。5 个遗漏的发行验证路径已登记到直接消费者检查，整段 AR-12c 的 fast 计划不再有未映射路径。
- 新增公开 CLI 回归覆盖旧版和原生前端身份：`sync`、`sync --plan`、`doctor`、`diff`、`migrate plan` 明确拒绝，用户文件内容、权限、Git 暂存区和目录树保持不变，不产生计划文件。

## 5. 独立审查与收尾验证

- 独立只读 Reviewer `01a13317-24d6-7340-beec-6457f6b60c01` 按 Standards / Spec 两轴审查，发现并交回两项 P2：检查命令引用已删除的边界测试；Spec 的 `lifecycle route` / `verify-daily` 仍接受日常前端实现。两项均由实施者修复；独立 Reviewer 已定向复审，Standards / Spec 均为 limited 通过，无剩余 P1/P2。
- 新增公开入口回归先在旧固定二进制上失败（错误地返回 `OK`），再在修复后通过。覆盖前端/UI 影响声明、前端实现仓侧别、前端写范围、实现仓根目录与实际 Vue/JSX/TSX 文件；路由及验收均返回 `FRONTEND_REMOVED`，后端 `no-api` 路线仍成功。独立前端技能与脚手架不受此日常实现入口限制。
- 快检中的两条过时断言已同步：已迁移的用户决定必须选择 Go 回放，公开 Bundle 准备任务为三个维护中的 Profile。
- 最终验证按 `limited` 范围记录实际命令、退出码与日志。首次收尾 CI 调用缺少固定二进制环境而退出 1；第二次因上述旧断言及取消重复回放退出 1，均保留为失败记录，不能当作完整 CI 通过。修复后的定向 fresh verification、固定二进制回归与 checkpoint 结果见仓外 `maintenance:checkpoints/arch-ar-12c/`。

## 6. 未覆盖与顺延

- 旧前端实例不做迁移也不提出删除：按维护者决定，`sync`、`doctor`、`diff`、`migrate plan` 一律明确拒绝并提示「前端 Profile 已移除」，文件保持原样（FR-016 的删除规则对它不适用）。
- 前端技能文本里个别「前端实现计划」等措辞保留（技能本身保留，指向实现仓的前端工程）。
- 本片最终交付为 `implementation-ready`，验证范围 `limited`；不声明完整 CI、恢复矩阵、Linux 运行、合并或发布验收通过。最终定向集合按固定二进制身份、Spec 日常拒绝、实例保护、现役消费者及检查配置选择，不重跑未改变行为的全部历史校验域。
- AR-12b 余下部分（approval、user-decision 等 Node 实现删除）与本片互不依赖，仍待做。
