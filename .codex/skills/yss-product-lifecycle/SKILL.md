---
name: yss-product-lifecycle
description: Use when starting, continuing, auditing, or routing a YSS product/module/change across Discovery, Spec, design, OpenAPI, architecture, Tickets, implementation, review, release, or retrospective; or when lifecycle assets, gates, Matt flows, YSS skills, or readiness are unclear.
---

# YSS Product Lifecycle

YSS 产品研发的全生命周期主控编排器。它决定阶段、条件门禁、状态和工作顺序；Matt skills 提供通用工作流，YSS skills 提供专项实现规则。编排器持续主控，但不得绕过专项 skill 直接规定业务实现。

## 启动

1. 读取根目录 `yss-project.yaml`；非法或缺失时停止并进入迁移检查。
2. 读取 `CONTEXT.md`、相关 ADR、父 Ticket/checkpoint、当前资产与 tracker 配置。
3. `template-source` 只走模板维护流程；不得生成具体产品 Spec、原型、OpenAPI 或切片 Ticket。
4. `project-instance` 以 `docs/process/lifecycle-artifact-map.md` 和 `docs/process/harness-process-tailoring.md` 为阶段、门禁和裁剪事实来源。

YSS 仓库以本 skill 为直接入口，不机械嵌套调用 `ask-matt`。`ask-matt` 仅在用户显式调用时作为 Matt 通用导航，且不得修改 Matt skills。

## 选择模式

| 请求 | 模式 | 副作用 |
|---|---|---|
| “该怎么做/下一步” | `route` | 只读 |
| “推进/完成” | `orchestrate` | 在授权范围内有界推进 |
| “继续之前工作” | `resume` | 先重建并核验状态，再有界推进 |
| “是否可开发/合并/发布” | `audit` | 严格只读，不顺带修复 |

用户显式模式优先；无法判断时用 `route`。执行协议见 [orchestration.md](references/orchestration.md)。

## 核心规则

- 保留 8 个主阶段；21 个门禁全部按影响面条件强制。命中项必须达到 `approved`，未命中项记录 `not-applicable` 和原因。
- 有效 `yss-project.yaml` 存在时，`ask-matt` 和 `setup-matt-pocock-skills` 只能作为子流程；最终入口、仓库身份和模式裁决归本编排器。
- `template-source` 命中产品 flow 时必须返回 `blocked`（`template-source-product-artifact-forbidden`），不得继续到产品资产或 Ticket 生成。
- 文件存在不等于就绪。按内容、审查结论和上游新鲜度评估资产。
- 父 Ticket/checkpoint 的状态只是索引；与真实资产冲突时，以权威资产为准并修复索引。
- 上游变化按依赖图精准传播 `stale`；不要无条件重跑完整阶段。
- Matt 五态保持原义。只有解除阻塞、门禁通过且可直接实现的垂直切片才能使用 `ready-for-agent`。
- YSS active 调用 `to-spec` 时，必须把 Matt 独立 flow 的 `ready-for-agent` 发布提示归一化为 Spec `ready-for-human`；不得把 Spec 初稿当作可直接实现的 Ticket。
- `orchestrate`/`resume` 连续执行安全工作单元，直到人工门禁、真实阻塞、新授权、实现/发布裁决或专项失败。
- 进入实现后继续主控，通过 `yss-router`、`implement`、`tdd` 和 YSS 专项 skills 执行；独立审查和 fresh verification 后才能作完成判断。
- 原型确认 → 后端脚手架：当 YSS 高保真原型已经完成 Prototype Review、AntD CLI 校验和用户确认，且 backend `scaffold_status=required` 时，先完成工程基线，由 `yss-router` 编译脚手架受控生成工作单元合同，经生命周期编排器批准并持久化后，才使用 `yss-ddd-scaffold-generator` 生成后端骨架；随后由 `yss-backend-scaffold-parent` 校验并重新进入 `yss-router`，不得先写业务代码。
- 所有后续生成的后端代码都必须消费生命周期批准、已持久化且版本当前的 Slice Implementation Contract，绑定最小 YSS skill 闭包、允许写路径、证据文件和 YSS Skill Execution Result；没有这些证据时必须阻断。
- Harness 内承载运行时代码时，项目路径策略固定为 `apps/backend/<project>/` 和 `apps/frontend/<project>/`；`apps/backend/`、`apps/frontend/` 仅是项目容器，`app/backend/`、`app/frontend/` 及其子路径禁止生成。外部实现仓库不强制使用该目录，但必须登记真实项目根路径并写入合同。
- Setup readiness 每个任务只评估一次并在本轮缓存；只有 tracker、主远端、真实标签或配置变化时重查。
- Ticket tracker 支持 `local-markdown`、GitHub 和 GitLab；模板默认 `local-markdown`，以 `docs/.scratch/<feature>/` 完整功能包为主载体。Git remote 只代表代码托管，不能覆盖已持久化的 tracker 选择；Local 主 tracker 不要求远程 Ticket。根 `.scratch/` 与 `docs/requirements/tickets/` 只作为旧路径迁移来源。
- 小改动和中等变更允许同一独立执行者完成 Review 与 fresh verification；该执行者不得是实现者。新模块、高风险或职责冲突时拆分 Reviewer 与 Verifier。
- 连续自动推进期间累积 Ticket/Git 证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint；不为每个连续经过的概念阶段重复写同类记录。
- 跨线程、仓库、原型分支或上下文边界时使用 `handoff` 或等价记录。
- 在 Matt 阶段边界（phase boundary）先按 `Continue → /clear → /handoff → subagent → /compact` 判断上下文动作；只在 checkpoint 记录可选 `phase_boundary` 证据，不新增生命周期状态。
- `to-questionnaire` 进入结构化 `external-input-required` 暂停；回答回流后必须重新分类影响面并更新权威资产，不能直接恢复下游实现。
- `wait-what` 只重新解释当前结论，不改变阶段、门禁、Ticket 或 `ready-for-agent` 状态；`wizard` 只处理人工才能完成的步骤，默认临时使用，秘密值不得进入持久化输出。
- Matt `prototype` 是保留在 `prototype/<name>` 分支的单文件可分享 HTML 主来源；YSS 高保真 HTML 原型仍必须经过 Prototype Review、AntD CLI 校验和用户确认，两者不得互相替代。
- Matt skill 返回结果必须先归一化为 `Matt Skill Result`；`drift`、`new_impacts`、`violation`、`stale_candidates`、缺失证据或不完整结果不得推进为 `completed`。

### 原型完成后的后端脚手架与代码生成边界

`prototype_confirmation` 是产品设计门禁，不是业务实现授权。后端新工程的顺序固定为：工程基线 → `yss-router` 编译脚手架合同 draft → 生命周期批准/持久化 → `yss-ddd-scaffold-generator` → `yss-backend-scaffold-parent` → `yss-router` 合同重编译 → 垂直切片实现。

- `scaffold_status=required` 时，脚手架工作单元使用 `controlled-generation`，记录项目名、基础包名、输出目录、数据库类型、预期文件和实际 `./mvnw validate`、`./mvnw test`、`./mvnw package` 结果，并返回 YSS Skill Execution Result。
- 脚手架合同必须结构化记录 `contract_id`、`contract_version`、`slice_id`、Router draft 引用、生命周期批准引用、持久化引用、当前版本、实现仓库、允许写路径、预期证据文件和验证命令；生命周期批准记录至少包含 `approval_ref`、`approver`、`persisted_ref`、`current_version`。
- `yss-ddd-scaffold-generator` 必须读取已持久化的结构化脚手架合同 JSON，并校验 `status=approved`、当前版本、主 skill、`controlled-generation` 和固定验证命令；只传任意字符串引用不得放行。
- 生成项目必须包含 `.yss/scaffold-generation.json`，回勾实际使用的合同 ID、版本、Router draft 引用、生命周期批准引用、持久化引用、生成输入、受控模式和固定验证命令；元数据清单缺失或过期时阻断后续 Router。
- 三条 `./mvnw` 命令必须由受控工作单元真实执行，并记录每条命令的 `exit_code`、`duration_ms`、stdout/stderr 引用和执行时间；生成器打印的命令、输出目录存在或“生成成功”都不构成验证证据。
- 脚手架只生成多模块工程结构、POM、配置、Wrapper 和经验证的机械模板；不得生成或承载领域规则、状态机、权限、事务、复杂查询、错误映射或用户可见业务行为。
- 该生命周期脚手架工作单元必须关闭 `--with-example`，不得把 User CRUD 或业务字段伪装成样板；目标目录非空时 `--force` 默认阻断，只有覆盖范围、备份、回滚点和明确批准全部进入合同后才能另行审查。
- `scaffold_status=existing` 或 `initialized` 时不重复全量生成，但仍须完成 `yss-backend-scaffold-parent` 基线证据、Wrapper 校验和 `yss-router` 合同重编译。
- 脚手架完成不等于实现仓库接入、架构放行、契约批准或 `ready-for-agent`。后续每一个 Agent / generator 写入的后端代码都必须绑定批准合同和对应 YSS skill；业务行为只能使用 `behavior-tdd`，机械生成才可使用 `controlled-generation`。

| 压力诱因 | 统一裁决 |
|---|---|
| “脚手架本来就是 YSS，先生成代码再补合同” | 先阻断；Router draft 不能批准合同或替代生命周期放行。 |
| “`./mvnw validate` 已通过，直接继续最省时间” | 只证明工程基线可验证，不证明业务、权限、事务或契约已获批；三条实际命令的结果还必须进入 Execution Result。 |
| “后续代码也是生成物，不需要重新路由” | 只要写入业务代码，就必须重新消费当前 Slice Implementation Contract 和 YSS skill 闭包。 |
| “发布窗口快结束了，可以把业务字段放进脚手架” | 时间、上级要求、已有产出和演示压力都不能放宽禁止模式；必须拆为 `behavior-tdd` 工作单元。 |

**红旗：** 输出目录存在、脚手架成功、只打印了 `./mvnw` 命令、`validate` 通过、Router 只有 draft、或生成器参数中出现业务字段 / 权限 / 事务 / 状态机，均不足以继续业务实现；命中任一项即暂停并重路由。

**项目路径策略：** 在 Harness 内生成项目时，先确认目标属于 `apps/backend/<project>/` 或 `apps/frontend/<project>/`；把 `apps/backend/`、`apps/frontend/` 当作项目根，或把单数 `app/backend/`、`app/frontend/` 当作等价路径，均属于路径违规并阻断。

状态和依赖规则见 [state-model.md](references/state-model.md) 与 [artifact-dependencies.md](references/artifact-dependencies.md)；Matt/YSS 对应见 [matt-yss-adapter.md](references/matt-yss-adapter.md)。
机器可执行的模式、readiness、Wayfinder、影响传播和回流字段见 [orchestration-contract.yaml](references/orchestration-contract.yaml)。说明文档与该契约冲突时必须暂停并修订权威资产，不得猜测。

## 输出

始终输出：模式、当前阶段、影响面、证据、资产/门禁状态、阻塞项、本轮动作、下一工作单元、暂停或继续理由、Ticket 同步和 Git checkpoint 判断；调用 Matt skill 时追加 `Matt Skill Result`。

暂停时只提出一个具体人工决策，并给出推荐答案与确认后的恢复动作。`audit`/`route` 不得写文件、Ticket、标签或 Git。
