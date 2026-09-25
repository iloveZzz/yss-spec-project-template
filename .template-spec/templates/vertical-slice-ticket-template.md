---
status: ready-for-human
requirement_version: v1
---

# 垂直切片 Ticket：<标题>

填写前读取[中文写作规范](../process/document-writing.md)和 [Ticket 对照](examples/lifecycle-writing-examples.md#3-ticket把交付行为与实现就绪区分清楚)。冻结前在 frontmatter 记录状态。新 Slice 绑定本文件的需求版本与原始字节；冻结后 frontmatter 仅代表冻结时状态，当前执行状态由项目已配置的主 tracker 维护，平台不可用时使用现有任务包和待发布记录。不得回写本文件的状态、验收勾选或执行结果。需求变化另存新版本并重新编译、审查与批准，旧文件和批准不自动迁移。

## 父级

<Spec：`docs/.scratch/<feature>/spec.md`；功能父 Ticket：`docs/.scratch/<feature>/parent-ticket.md` 或远程 Issue URL>

## 要构建什么

描述本 Ticket 要交付的窄而完整的端到端行为。它必须贯穿所有受影响层，是可独立验证的垂直切片，不能只是某一层的横向任务。

先用一句话写出用户操作及交付结果，再引用对应 Spec 规则、版本和本切片边界；不要重写冻结需求或填入未经确认的范围。

## 覆盖的用户故事

- <用户故事 ID 或文本>

## OpenAPI 影响

- [ ] 无
- [ ] 基于冻结 OpenAPI：`docs/.scratch/<feature>/api/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| | | |

## 验收标准

每项写条件、操作和可观察结果，关联上游规则；保留必要例外。需求基线不记录执行结果；实际验收结论写入 tracker / 任务包。

- AC-1：标准 1
- AC-2：标准 2
- AC-3：标准 3

## 测试 Seam

- 主要公共接口：
- 必需测试：
  - [ ] 行为 / 领域测试
  - [ ] API / 契约测试
  - [ ] UI / 组件测试
  - [ ] E2E 测试

## Slice Implementation Contract

| 字段 | 内容 |
|---|---|
| contract_id |  |
| contract_version |  |
| contract_ref |  |
| 编译与批准记录 | 在现有 checkpoint / 任务包中维护，不回写冻结 Ticket |
| suggested_owner_role_id | `role.frontend-engineer` / `role.backend-engineer` / `role.test-engineer`（实现合同编译器 建议，编排器派活） |
| Build Architecture Checklist |  |

> 实现合同编译器 不得自行将合同批准或将本 Ticket 推进为 `ready-for-agent`。只有生命周期编排器核验并持久化当前版本合同、清除阻塞边后，才能在主 tracker 推进执行状态。

### 工作单元与工程约束

新切片使用 Slice v3。Ticket 保留行为、验收、测试 seam 与合同引用；工作单元、Skill、写范围、验证命令在权威 YAML 中保存一次，不再在此复制表格。

Agent 使用 `scripts/slice-contract view <合同.yaml>` 展示审阅说明，使用 `--unit <id>` 展示任务和完整工程约束。本切片新增细化、例外或缺口由 Agent 整理，独立专业审查核验；已有用户确认覆盖且无实质变化时复用。任务进度和 Execution Result 引用进入现有 tracker / 任务包。

涉及后端时，适用设计从已批准 Technical Design 绑定取得。`controlled-generation` 只适用于机械生成，并保留例外与验证；业务行为使用 `behavior-tdd`。

### 后端阻断规则

- [ ] 未填写 `Backend Slice Implementation Contract` 时不得写后端业务代码。
- [ ] `CMD` / `Query` / `VO` / `SingleResult` / `MultiResult` / `PageResult` 按 `yss-dto` 定义或复用；不私自新建 / 混用响应包装。
- [ ] Controller 不用内部类或非约定包临时承载主要 DTO / VO；写操作参数继承 `CommandDTO`，读操作参数继承 `QueryDTO` 或 `PageQuery`，分页查询优先继承 `PageQuery`。
- [ ] Controller 不手工分页主要业务集合，不穿透 Repository / Mapper / PO。
- [ ] Application 只做用例编排、事务边界和跨聚合协调，核心领域规则放入 Domain。
- [ ] 需要持久化的切片必须补 PO / Repository / Convertor / GatewayImpl；临时 `InMemory*Gateway` 必须标记 `seam-deferred`。
- [ ] POJO 样板代码默认使用 Lombok；成片手写 getter/setter、constructor、builder、logger 必须说明例外原因、测试证据和 review 结论。
- [ ] MapStruct / Convertor 强制优先；`BeanUtils.copyProperties`、反射式通用拷贝或重复手写 mapping 必须说明例外原因、测试证据和 review 结论。

## 阻塞关系

列出实际依赖、未决项、责任人和解除条件；尚未核验时写“待核验”。只有确认没有阻塞时才写“无”，无依赖不等于已通过实现就绪核验。

## 重路由记录位置

| 字段 | 内容 |
|---|---|
| reroute_status | current / incremental-review / full-reroute-required / lifecycle-return / stale |
| trigger | 新 API/schema / 状态机 / 数据模型 / 写路径 / 仓库 / skill / seam / 风险 / 交付顺序 / other |
| affected_work_units |  |
| new_impacts |  |
| stale_contract_version |  |
| return_stage | 实现合同编译器 / Architecture Re-check / 产品设计 / OpenAPI Draft-Review-Freeze / 系统或数据架构 / other |
| recovery_conditions |  |

本表作为 tracker / 任务包的记录字段说明，冻结后不在本文件填写。出现 `drift`、`violation` 或非空 `new_impacts` 时暂停受影响工作单元，不得先完成代码再补合同；更新合同版本并通过生命周期审查后才能恢复。

## 会签

冻结后会签结果保存在现有批准记录与 checkpoint，不修改以下冻结时引用。

| 门禁 | 记录路径 | 会签角色 | 状态 |
|---|---|---|---|
|  | `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml` | 见 `.template-spec/agents/digital-human-roles.yaml` | pending / approved / blocked / not-applicable |

## 状态

冻结时状态依据：<当时的合同、批准和就绪核验记录引用，以及尚未关闭的阻塞>。当前状态从主 tracker / 任务包读取。

> 默认 frontmatter 为 `ready-for-human`。仅在生命周期确认合同已批准且当前、阻塞已清除、全部适用门禁及就绪条件通过后在主 tracker 更新为 `ready-for-agent`；冻结文件不更新。

## AI / 人工审查点

- [ ] 无高风险变更或需人工确认项
- [ ] 原生 SQL：记录验证证据
- [ ] 公共基础库 API：记录验证证据

## 完成定义

以下为完成判据；检查结果和勾选进入 tracker / 任务包，不回写本文件。

- [ ] 如有需要，已基于冻结 OpenAPI Spec 拆分切片
- [ ] 实现完成
- [ ] 已新增测试且测试通过
- [ ] 已移除调试 / 原型代码
- [ ] 已在任务包核验 `Backend Slice Implementation Contract` 和 `Build Architecture Checklist`
- [ ] 已在任务包核验当前 `contract_id` / `contract_version`、全部工作单元和对应 `YSS Skill Execution Result`
- [ ] 实际 changed files 均在合同允许路径内，预期证据齐全，验证结果包含执行时间
- [ ] `new_impacts`、`drift`、`violation` 和重路由状态均有明确结论，合同未处于 `stale`
- [ ] 如领域或架构决策变化，已更新 `CONTEXT.md` / ADR；新增业务术语含 PascalCase `英文标识`，代码与契约字段能追溯到该词干
