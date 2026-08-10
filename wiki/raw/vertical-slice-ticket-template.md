# 垂直切片 Ticket：<标题>

## 父级

<Spec / 功能父 Ticket 链接>

## 要构建什么

描述本 Ticket 要交付的窄而完整的端到端行为。它必须贯穿所有受影响层，是可独立验证的垂直切片，不能只是某一层的横向任务。

## 覆盖的用户故事

- <用户故事 ID 或文本>

## OpenAPI 影响

- [ ] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| | | |

## 验收标准

- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3

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
| Router 状态 | draft / blocked / ready-for-lifecycle-review |
| 生命周期批准状态 | pending / approved / rejected |
| Build Architecture Checklist |  |

> Router 不得自行将合同批准或将本 Ticket 推进为 `ready-for-agent`。只有生命周期编排器核验并持久化当前版本合同、清除阻塞边后，才能推进状态。

### 工作单元

| work_unit_id | 验收行为 / 目标 | primary_skill | supporting_skills | tdd_mode | allowed_write_paths | expected_evidence | verification_commands | Execution Result 引用 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  | behavior-tdd / controlled-generation |  |  |  |  | pending / running / blocked / completed / stale |

`controlled-generation` 仅允许机械脚手架、样板、冻结客户端或配置，并记录 exception reason、生成器输入和生成后行为测试；业务规则、状态机、事务、权限、错误映射、复杂查询和用户可见交互必须使用 `behavior-tdd`。

## YSS 技能与后端实现合同

> 涉及后端时必须填写；不涉及时写明 `not-applicable`。不得只写“符合 YSS”。

| 影响面 | 必需 skill | 需要 / 不需要的理由 | 预期证据 |
|---|---|---|---|
| Domain / 领域行为 | `yss-domain` / `yss-backend-scaffold-domain` |  |  |
| Application / 用例编排 | `yss-backend-scaffold-application` |  |  |
| Infrastructure / Repository | `yss-repository` / `yss-mybatis` / `yss-backend-scaffold-infrastructure` |  |  |
| Web Adapter / DTO | `yss-web-controller` / `yss-dto` / `yss-backend-scaffold-web` |  |  |
| POJO / 对象转换 | `lombok` / `mapstruct` |  |  |
| Java 规范 | `alibaba-java-code-style` |  |  |

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

- 无，可立即开始

## 重路由状态

| 字段 | 内容 |
|---|---|
| reroute_status | current / incremental-review / full-reroute-required / lifecycle-return / stale |
| trigger | 新 API/schema / 权限 / 状态机 / 数据模型 / 写路径 / 仓库 / skill / seam / 风险 / 交付顺序 / other |
| affected_work_units |  |
| new_impacts |  |
| stale_contract_version |  |
| return_stage | Router / Architecture Re-check / 产品设计 / OpenAPI Draft-Review-Freeze / 系统或数据架构 / other |
| recovery_conditions |  |

出现 `drift`、`violation` 或非空 `new_impacts` 时暂停受影响工作单元，不得先完成代码再补合同；更新合同版本并通过生命周期审查后才能恢复。

## 状态

`ready-for-agent`

> 仅当阻塞关系为“无”且必要门禁已通过时填写 `ready-for-agent`；否则写明被哪个 Ticket 阻塞。

## AI / 人工审查点

- [ ] 无高风险变更或需人工确认项
- [ ] 原生 SQL：记录验证证据
- [ ] 公共基础库 API：记录验证证据

## 完成定义

- [ ] 如有需要，已基于冻结 OpenAPI Spec 拆分切片
- [ ] 实现完成
- [ ] 已新增测试且测试通过
- [ ] 已移除调试 / 原型代码
- [ ] 已回勾 `Backend Slice Implementation Contract` 和 `Build Architecture Checklist`
- [ ] 已回勾当前 `contract_id` / `contract_version`、全部工作单元和对应 `YSS Skill Execution Result`
- [ ] 实际 changed files 均在合同允许路径内，预期证据齐全，验证结果包含执行时间
- [ ] `new_impacts`、`drift`、`violation` 和重路由状态均有明确结论，合同未处于 `stale`
- [ ] 如领域或架构决策变化，已更新 `CONTEXT.md` / ADR
