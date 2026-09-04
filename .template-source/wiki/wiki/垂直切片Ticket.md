# 垂直切片Ticket

垂直切片是贯穿所有受影响层、可独立验证的窄功能路径。每个功能先建立功能父 Ticket，用来汇总 Spec、设计、审查、OpenAPI Freeze、阻塞项和阶段证据；父 Ticket 本身不是 Agent 直接实现的切片。契约冻结后，由生命周期原生 `work-unit.ticket-decomposition` 拆出窄切片；用户显式 `to-tickets` 只是兼容入口。禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分。

模板 `docs/templates/vertical-slice-ticket-template.md` 默认 `Status: ready-for-human`，frontmatter `status` 同值。正文必须写清要构建的端到端行为、覆盖的用户故事、OpenAPI 影响、验收标准、测试 seam、Slice Implementation Contract、阻塞关系和完成定义。它必须贯穿受影响层，不能只是某一层的横向任务。YSS active 调用 `to-tickets` 时，新建切片的初始 `Status:` 也固定为 `ready-for-human`。

Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产一律使用 `ready-for-human`。只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片，才能使用 `ready-for-agent`。五态标签为 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`，见 [[Ticket与流程状态]]。Ticket、Spec 和阶段证据按 `docs/agents/issue-tracker.md` 选定的主 tracker 持久化；Git remote 不代表 tracker 选择。当前模板默认 `local-markdown`，根为 `docs/.scratch/`。

切片拆分以冻结 [[Spec基线]] 和 [[OpenAPI契约]]（或无 API 影响记录）为输入。每个切片进入实现前必须挂当前 [[切片实现合同]]：`contract_id`、`contract_version`、`contract_ref`，实现合同编译器 状态只能是 `draft / blocked / ready-for-lifecycle-review`，生命周期批准状态为 `pending / approved / rejected`。实现合同编译器 不得自行批准合同，也不得把本 Ticket 推进为 `ready-for-agent`；只有生命周期编排器核验并持久化当前版本、清除阻塞边后才能改状态。合同编译见 [[YSS路由与合同编译]]。

工作单元必须写验收行为、主 / 辅 skill、`behavior-tdd` 或 `controlled-generation`、允许写路径、预期证据和验证命令。业务规则、状态机、事务、权限、错误映射、复杂查询和用户可见交互必须 `behavior-tdd`；`controlled-generation` 只覆盖机械脚手架、样板、冻结客户端或配置，并记录 exception reason。涉及后端时必须填写 Backend 合同与 skill 表，不得只写「符合 YSS」。出现 `drift`、`violation` 或非空 `new_impacts` 时暂停受影响工作单元，不得先完成代码再补合同。

完成定义要求：实现与测试通过，调试 / 原型代码已移除，合同与 `YSS Skill Execution Result` 已回勾，实际 changed files 均在允许路径内，验证结果含执行时间，重路由状态有明确结论且合同未 `stale`。领域或架构决策变化时更新 `CONTEXT.md` / ADR，新增业务术语含 PascalCase `英文标识`，代码与契约字段能追溯到该词干。路径越界、证据缺失、未执行验证时停止实现并重新路由，见 [[条件强制门禁]] 与 [[实现仓库与跨仓库契约]]。整条链路属于 [[产品研发生命周期]] 的 Ticket 正式化与垂直切片实现阶段。

## 来源

- `CONTEXT.md`
- `AGENTS.md`
- `docs/templates/vertical-slice-ticket-template.md`
- `docs/process/lifecycle-registry.yaml`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `.agents/skills/yss-implementation-contract-compiler/SKILL.md`
