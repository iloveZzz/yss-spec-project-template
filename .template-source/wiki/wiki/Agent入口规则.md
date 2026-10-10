# Agent入口规则

`AGENTS.md` 按当前仓身份和任务条件路由。先读当前治理仓根 `yss-project.yaml` 与唯一 `CONTEXT.md`；身份缺失、非法或 schema 不支持时停止受影响写入并检查迁移。只读调查不创建 Ticket、checkpoint、批准或启动回归。

## 作用范围与事实源

入口路径相对当前治理仓根。进入独立子仓后使用子仓入口解释本地身份、工具与流程；共同授权、用户工作保护和允许写范围继续有效。CLI 源码仓与 `skillUtils` 工具包按已声明身份维护，不补造产品治理文件。

`template-source` 走 [[模板维护流程]]；`project-instance` 先判日常 / 正式路径。阶段、门禁和稳定 ID 由生命周期注册表定义；Skill 来源与投影由锁文件持有，路由由 active 技能注册表持有，角色与会签由角色表持有。Wiki 解释当前来源，不建立第二套规则。

根 `CONTEXT.md` 保存已确认稳定语言，稳定业务词使用 PascalCase 英文词干及 `<ContextId>/<EnglishIdentifier>`；跨业务责任区用 `Global`。词汇变更先回写根词汇表，不临时另建上下文。正式批准或流转核验 `context_reconciliation`，模板源只验证模板合同并记录有原因的不适用。

## 先判日常 / 正式路径

唯一政策为当前主控合同的 `request_triage.delivery_path`，用支持能力的 `yss lifecycle route` 核验任务、实际实现仓和完整基线 SHA。政策启用且资格已证明的 Spec、Backend、Frontend 可走 `daily`；旧 CLI、缺政策、Profile 未启用或资格未证明时先调查，不能由专项技能自行启用。

`daily` 按需求与验收、适用 YSS 技术技能、实现、测试、独立 `code-review` 推进，只更新同一 Ticket/PR 的范围、验收、工程 / 基线、Skills、实际测试、审查与回滚。无需阶段 checkpoint、正式 Slice 合同或多级批准；`verify-daily` 失败、缺独立审查或阻断问题未关闭均不能完成。

已有正式任务不得降级；无关正式资产不阻断合格日常任务。新风险出现时保留修改与证据，停止受影响工作，从最近可信阶段恢复 `governed`。正式路径只验证当前资产、触发合同及直接 / 传递依赖，不提前生成未来资产。

## 正式实现与专项边界

正式切片消费已批准、已持久化且当前的 [[切片实现合同]]；合同编译器不批准、不授予 `ready-for-agent`。工程接入与脚手架遵守当前实现仓合同；新后端在用户确认架构与平台、Technical Design / 数据设计前置及 Project Scaffold Contract schema v4 下机械生成，既有工程不能重选或覆盖。显式独立脚手架请求可按独立输入生成机械骨架，不扩大业务实施授权，也不降级已有正式任务。

正式 Spec、设计和待冻结资产保持 `ready-for-human`；只有通过适用门禁、阻塞关闭、可直接实现的窄切片使用 `ready-for-agent`。UI 切片就绪前需已校验前端实现计划，实现后补桌面 / 窄屏视觉、状态、交互、console warning 与实际 `pnpm` 证据。延期 seam 保留风险、责任人、后续 Ticket、验证计划及目标版本或发布日期。

API 先 OAS 3.1 YAML Draft、锁定工具校验、独立审查与 Freeze，再实现和契约测试。合格日常任务的兼容边界和同一 Ticket 证据消费唯一政策与 `yss-openapi-governance`；其余走正式治理。

实现代码进入已确认工程；不把空 gitlink / 未初始化子模块当普通目录，不覆盖既有工程。前端优先 `pnpm`，后端优先工程根 `./mvnw`，缺工具记录受控例外。实现优先 YSS 技能；行为测试用 `tdd`，原型用 `yss-prototype-stage`，技术研究用 `yss-research`，竞品用 `competitive-intelligence`。原型不消费生产实现 Skill `yss-ui`。

## 协作、授权与完成

写范围不重叠，实施者不得自审，Reviewer 只读实现并写审查证据；角色名不同不代替独立主体。主控裁决状态与完成。首轮覆盖适用检查，修复后按差异、受影响结论及依赖定向复审，将结论重新绑定当前候选；未知影响先调查并阻断依赖事项。

保留实际命令、退出码、范围与未覆盖项；字节、规则、参数或仓库变化使受影响证据失效。局部完成不等于可合并 / 可发布，历史成功或实施者自述不能放行当前任务。

决定与授权消费完整用户决定协议，复用有效范围授权；真实回复指向已展示资产、版本和范围，数字人不能代答。新决定、外部强制审批与外部动作按实际边界处理；实施或验收不授予提交、推送、发布权限。模板源唯一自动 Git 例外只按 `advance-maintenance-iteration` 的本地 checkpoint 引用合同执行。

## 来源

- `AGENTS.md`：5–7、11–19、29–30、34–38 行。
- `CONTEXT.md`：6–14、50–65、67–70 行。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`：205–226、1210–1229、1417–1434 行。
- `.template-spec/process/harness-process-tailoring.md`：75–78 行。
- `.template-spec/agents/yss-skill-registry.yaml`：1–15 行。
- `.template-spec/process/lifecycle-registry.yaml`：337–360、481–505 行。
- `.template-spec/process/implementation-repo-integration.md`：7–15、27–41、65–74、107 行。
- `.template-spec/process/subagent-collaboration.md`：3–15、19–27 行。
- `.agents/skills/code-review/references/yss-review-standards.md`：54–65 行。
- `.agents/skills/yss-product-lifecycle/references/user-decisions.md`：9–14、50–64 行。
