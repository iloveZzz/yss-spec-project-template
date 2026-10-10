# AGENTS.md — YSS 开发入口

用简体中文；按当前任务加载规则，明确行动在既有授权内持续推进。

本入口用于当前 YSS 治理仓及其治理资产，路径相对当前仓根。进入独立子仓时，使用子仓入口解释本地身份、工具和流程；共同授权、用户工作保护及允许写范围继续有效。CLI 源码仓和 skillUtils 工具包按各自已声明身份维护，不补造产品治理文件。

先读当前治理仓根 `yss-project.yaml` 与唯一的 `CONTEXT.md`。身份缺失、非法或 schema 不支持时停止受影响写入并检查迁移；不得猜身份。只读调查不创建 Ticket、checkpoint、批准或启动回归。

## 项目实例

先消费 `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml` 的 `request_triage.delivery_path`。这是日常/正式路径的唯一策略；用支持该能力的 `yss lifecycle route` 核验当前任务、实现仓和完整基线 SHA。缺事实先调查；旧 CLI、缺政策、Profile 未启用或资格未证明时，不自行启用日常路径。

`daily`：需求与验收 → 适用 YSS 技术技能 → 实现 → 测试 → 独立 `code-review`。只维护一张 Ticket/PR，记录范围、验收、工程/基线、Skills、实际测试、审查与回滚；跨会话更新同一记录。无需阶段 checkpoint、正式 Slice 合同或多级批准。用 `yss lifecycle verify-daily` 核验当前差异与证据；失败、缺独立审查或阻断问题未关闭不得宣布完成。

已有正式任务不得降级；无关正式资产不阻断日常任务。发现新风险保留修改与证据，停止受影响工作，从最近可信阶段恢复 `governed`。

`governed`：按 `.template-spec/process/harness-process-tailoring.md` 判影响，再用 `yss-product-lifecycle` 执行当前工作单元及依赖。阶段、门禁、稳定 ID 只由 `.template-spec/process/lifecycle-registry.yaml` 定义；只验证当前资产、触发合同与依赖，不提前生成未来资产。正式切片必须消费批准且当前的 Slice Implementation Contract；编译器不批准、不授予 `ready-for-agent`。正式批准/流转核验 Context、工程接入与门禁。

API 先 OAS 3.1 YAML Draft、锁定工具校验、独立审查与 Freeze，再实现和契约测试。日常兼容范围及同一 Ticket 的证据按上述唯一策略和 `yss-openapi-governance`；其余走正式治理。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
## 模板源维护

`template-source` 不生成产品阶段资产。按影响面维护事实源、派生、分发与证据；Skill 用 `maintaining-skills`，仅改 canonical `.agents/skills`，生成投影并更新锁。

按裁剪文档和 `.template-source/process/maintenance-intensity.yaml` 分 L1/L2。先看 `scripts/verify-template-fast --plan`，日常按检查选择变化行为及直接/传递消费者；每项指出命中文件、受影响行为和能发现的具体错误，适用的强制检查注明合同依据。已有检查覆盖时不新增测试或启动环境；必要检查通过即结束，只有相关修改、失败或具体遗漏才追加验证。未知路径、缺输入映射或非法依赖先修正计划，不自动跑全量。日常报告记录 `limited` 范围、实际结果与未覆盖边界，交付 `implementation-ready`，无需逐项填写跳过理由。候选/main集成/发布仍遵守 `.template-source/process/template-verification-profiles.yaml` 的当前资格与完整覆盖合同。


唯一自动 Git 例外由 `advance-maintenance-iteration` 的本地 checkpoint 引用合同规定，仅适用于模板源维护。
<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->

## 条件入口与边界

- 流程术语（阶段、门禁、产物、角色、Ticket 状态等）按需读 `.template-spec/process/process-glossary.md`；根 `CONTEXT.md` 只放业务语言。
- 工程接入、脚手架、仓库写范围读 `.template-spec/process/implementation-repo-integration.md`。代码进入已确认实现仓；不得把空 gitlink/子模块当普通目录或覆盖既有工程。
- 实现优先 YSS 技能；前端 `pnpm`，后端根 `./mvnw`；行为测试用 `tdd`。原型用 `yss-prototype-stage`，技术研究用 `yss-research`，竞品用 `competitive-intelligence`。
- 协作读 `.template-spec/process/subagent-collaboration.md`，角色/会签读 `.template-spec/agents/digital-human-roles.yaml`；写范围不重叠，实施者不得自审。主控裁决状态与完成。
- 验证保留实际命令、退出码、范围与未覆盖项；字节、规则、参数或仓库变化使受影响证据失效。局部完成不等于可合并/可发布。
- 决定/授权消费 [.agents/skills/yss-product-lifecycle/references/user-decisions.md](.agents/skills/yss-product-lifecycle/references/user-decisions.md)。复用有效范围授权；新决定、外部强制审批和外部动作按实际边界处理。提交、推送、发布须用户授权。
