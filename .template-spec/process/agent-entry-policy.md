# 按任务加载的详细入口政策

Spec 同时声明 `stage-gates-v1` 时，按 [四阶段门禁](stage-gates.md) 处理阶段放行；专业技能中的历史子批准／会签指令只适用于其原政策。内部内容检查与技术准备复用已有授权，不新增角色门禁或单独人工确认。Backend 按自身现行政策执行。

本文件补充 `AGENTS.md`，只在正式阶段、Profile 交付、工程接入、专业开发、协作或模板维护时按章节加载。语言、身份校验、日常/正式分流与不可省略的边界以 `AGENTS.md` 为准，本文不重复。

本入口用于当前 YSS 治理仓及其治理资产，路径相对当前仓根。进入独立子仓时，使用子仓入口解释本地身份、工具和流程；共同授权、用户工作保护及允许写范围继续有效。CLI 源码仓和 skillUtils 工具包按各自已声明身份维护，不补造产品治理文件。

仅请求新建后端开发脚手架时，按两种技能的直接生成说明调用 `yss-ddd-scaffold-generator` 或 `yss-layered-mvc-scaffold-generator`；无需需求合同或产品阶段前提，也无需先初始化治理实例。具体工程输入与目录保护由技能处理；显式正式合同调用继续原有校验。

## 项目实例

Spec / Backend 按 `request_triage.material_intake` 读取用户提供的需求、说明、技术文档或 Spec 材料；来源无需模板格式、源工程身份或源批准。提取目标、规则、约束、验收和未决项，复用当前 Ticket / PR 或本端原生资产，只补缺项；见[材料分析](../../.agents/skills/yss-product-lifecycle/references/conditional-guidance.md#材料分析与按需读取)。普通材料不自动成为正式上游绑定，按需获取，不强制变化检测、同步或恢复。提取不授予批准或实施权限；本端当前合同和显式正式上游继续原义核验。

`daily` 的步骤与记录字段见[同一记录交付说明](../../.agents/skills/yss-product-lifecycle/references/daily-delivery.md)；跨会话更新同一记录，无需阶段 checkpoint、正式 Slice 合同或多级批准。用 `yss lifecycle verify-daily` 核验当前差异与证据；失败、缺适用复核或阻断问题未关闭不得宣布完成。无关正式资产不阻断日常任务；发现新风险时保留修改与证据，从最近可信阶段恢复 `governed`。

`governed`：按 `.template-spec/process/harness-process-tailoring.md` 判影响，再用 `yss-product-lifecycle` 执行当前工作单元及依赖。阶段、门禁、稳定 ID 只由 `.template-spec/process/lifecycle-registry.yaml` 定义；只验证当前资产、触发合同与依赖，不提前生成未来资产。正式切片必须消费批准且当前的 Slice Implementation Contract；编译器不批准、不授予 `ready-for-agent`。正式批准/流转核验 Context、工程接入与门禁。

API 先 OAS 3.1 YAML Draft、锁定工具校验、内容复核（默认真实自检，按实际要求独立复核）与 Freeze，再实现和契约测试。日常兼容范围及同一 Ticket 的证据按 `AGENTS.md` 所述分流策略和 `yss-openapi-governance`；其余走正式治理。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
## 模板源维护

`template-source` 不生成产品阶段资产。按影响面维护事实源、派生、分发与证据；Skill 用 `maintaining-skills`，仅改 canonical `.agents/skills`，生成投影并更新锁。

按裁剪文档和 `.template-source/process/maintenance-intensity.yaml` 分 L1/L2。先看 `scripts/verify-template-fast --plan`，日常按检查选择变化行为及直接/传递消费者；每项指出命中文件、受影响行为和能发现的具体错误，适用的强制检查注明合同依据。已有检查覆盖时不新增测试或启动环境；必要检查通过即结束，只有相关修改、失败或具体遗漏才追加验证。未知路径、缺输入映射或非法依赖先修正计划，不自动跑全量。日常报告记录 `limited` 范围、实际结果与未覆盖边界，交付 `implementation-ready`，无需逐项填写跳过理由。候选/main集成/发布仍遵守 `.template-source/process/template-verification-profiles.yaml` 的当前资格与完整覆盖合同。


唯一自动 Git 例外由 `advance-maintenance-iteration` 的本地 checkpoint 引用合同规定，仅适用于模板源维护。
<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->

## 条件入口与边界

- 流程术语（阶段、门禁、产物、角色、Ticket 状态等）按需读 `.template-spec/process/process-glossary.md`；根 `CONTEXT.md` 只放业务语言。
- 分支、提交、钩子、策略、标签与推送使用支持 `yss git` 的 CLI，规则读 `.template-spec/process/git-workflow.md`；写入先计划，推送须用户确认远端。
- 工程接入、脚手架、仓库写范围读 `.template-spec/process/implementation-repo-integration.md`。代码进入已确认实现仓；不得把空 gitlink/子模块当普通目录或覆盖既有工程。
- 实现优先 YSS 技能；前端 `pnpm`，后端根 `./mvnw`；行为测试用 `tdd`。原型用 `yss-prototype-stage`，技术研究用 `yss-research`，竞品用 `competitive-intelligence`。
- 协作读 `.template-spec/process/subagent-collaboration.md`；新实例按编排政策选择 Skills、检查及复核方式，默认一名 Agent，无岗位或数字人注册要求。需要独立复核时核验独立上下文与只读证据；写范围不重叠。旧角色表仅用于原政策历史核验。主控裁决状态与完成。
- 验证保留实际命令、退出码、范围与未覆盖项；字节、规则、参数或仓库变化使受影响证据失效。局部完成不等于可合并/可发布。
- 决定/授权消费 [.agents/skills/yss-product-lifecycle/references/user-decisions.md](../../.agents/skills/yss-product-lifecycle/references/user-decisions.md)。复用有效范围授权；新决定、外部强制审批和外部动作按实际边界处理。提交、推送、发布须用户授权。
