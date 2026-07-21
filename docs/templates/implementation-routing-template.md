---
pipeline: <feature-id>
stage: implementation-routing
status: draft
owner: ai
---

# <功能名称>实现路由记录

> 适用场景：Spec、OpenAPI Freeze / 无 API 影响记录、Design Review 和垂直切片 Ticket 已就绪后，进入实现前。
> 本文记录契约状态、Ticket 状态、YSS skill 最小集合、测试策略和回滚点，不替代垂直切片 Ticket 或实施计划。
> Router 只能生成 `draft`、`blocked` 或 `ready-for-lifecycle-review`；不得自行写入 `approved`、`ready-for-agent` 或 `completed`。合同批准、持久化和 Ticket 状态推进由生命周期编排器负责。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| 垂直切片 Ticket |  |  |  |
| OpenAPI Freeze / 无 API 影响记录 |  |  |  |
| OpenSpec-style Spec Delta（条件必需） |  |  | 仅 API、权限、状态机、数据模型、跨端、新模块或高风险变更需要 |
| Design Review |  |  |  |
| 实现仓库 / 实现位置 |  |  |  |
| 前后端工程存在性判定 |  |  | 记录 frontend / backend 是否已存在且可复用 |
| `垂直切片 Ticket 状态` |  |  | ready / blocked / in-progress |

## 2. 实现前门禁

| 检查项 | 结果 | 备注 |
|--------|------|------|
| Spec 验收标准已可追溯 | 是 / 否 |  |
| OpenAPI Freeze 或无 API 影响记录已完成 | 是 / 否 |  |
| Spec Delta 已补齐或明确不需要 | 是 / 否 / 不适用 |  |
| Design Review 阻断项已关闭 | 是 / 否 / 不适用 |  |
| 垂直切片 Ticket 已拆到端到端可验收 | 是 / 否 |  |
| 实现仓库 / 实现位置已登记 | 是 / 否 |  |
| 受影响 frontend 工程已存在可复用，或已登记 `scaffold_status=required` 并确认外部脚手架目标 | 是 / 否 / 不适用 |  |
| 受影响 backend 工程已存在可复用，或已登记 `scaffold_status=required` 并确认外部脚手架目标 | 是 / 否 / 不适用 |  |
| 缺失工程时已路由到对应脚手架 skill | 是 / 否 / 不适用 | `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` |
| 后端构建 / 测试 / OpenAPI / CI 命令均使用项目根目录 `./mvnw ...`，或已记录受控例外 | 是 / 否 / 不适用 | 裸 `mvn ...` 默认为规范偏离 |
| 持久化文档正文和章节标题已转换为中文，仅保留必要英文技术标识 / metadata | 是 / 否 | 英文 skill / 模板不得原样落地为交付文档 |
| YSS skill 路由已完成 | 是 / 否 |  |
| fresh verification 方式已明确 | 是 / 否 |  |

## 2.1 Slice Implementation Contract 身份与状态

| 字段 | 内容 |
|---|---|
| schema_version | `1` |
| contract_id |  |
| contract_version |  |
| slice_id |  |
| status | `draft` / `blocked` / `ready-for-lifecycle-review` |
| compiled_by | `yss-router` |
| 生命周期批准状态 | pending / approved / rejected；由生命周期编排器填写 |
| 合同持久化路径 |  |

### 生命周期引用与就绪性

| lifecycle_ref | 路径 / 链接 | 状态 | 阻塞或过期说明 |
|---|---|---|---|
| Spec |  |  |  |
| 垂直切片 Ticket |  |  |  |
| 需求冻结 |  |  |  |
| 原型确认 / 状态矩阵 |  |  | 无 UI 影响时记录 `not-applicable` 及原因 |
| OpenAPI Freeze / 无 API 影响记录 |  |  |  |
| 系统 / 数据架构审查 |  |  |  |
| Build Architecture Checklist |  |  |  |

| readiness | 内容 |
|---|---|
| blockers |  |
| stale_inputs |  |
| not_applicable |  |

任一适用输入为 `missing`、`stale` 或未批准时，合同状态必须为 `blocked`，并写明回退阶段。

## 2.2 Common 子合同

| 字段 | 内容 |
|---|---|
| impacted_areas |  |
| required_skills |  |
| optional_skills |  |
| unavailable_skills | 写明 provider、fallback 和阻断结论；不得静默跳过 |
| allowed_write_paths |  |
| forbidden_patterns |  |
| expected_evidence_files |  |
| verification_commands |  |
| human_review_points |  |
| full_reroute_triggers | 新 API/schema、权限、状态机、数据模型、写目录、仓库、skill、风险、seam 或交付顺序等变化 |

| 不适用 skill | 原因 |
|---|---|
|  |  |

## 3. YSS skill 最小集合

| 领域 | skill | 使用原因 | 是否必需 |
|------|-------|----------|----------|
| 前端 |  |  | 是 / 否 |
| 后端 |  |  | 是 / 否 |
| API / 契约 |  |  | 是 / 否 |
| 测试 / 验证 |  |  | 是 / 否 |

### 3.1 Frontend 子合同

> 有 UI 影响时，批准后的产品设计、正式原型和状态矩阵是必填输入；缺失时合同必须为 `blocked`。无 UI 影响时填写 `not-applicable` 及原因。

| 字段 | 内容 |
|---|---|
| status | required / not-applicable |
| required_skills |  |
| approved_prototype_ref |  |
| state_matrix_ref |  |
| generated_api_client_ref |  |
| allowed_write_paths |  |
| component_test_seams | loading / empty / error / permission / 其他公开 seam |
| e2e_paths |  |

### 3.2 Backend Slice Implementation Contract

> 任一后端切片写业务代码前必须填写本合同；没有后端影响时标记 `not-applicable` 并说明原因。合同缺少必填项时，结论必须为 `Blocked`，不得进入实现。

| 项 | 内容 |
|---|---|
| slice_id |  |
| status | required / not-applicable |
| affected_layers | Adapter / Application / Domain / Infrastructure / Bootstrap / not-applicable |
| required_skills | `yss-domain` / `yss-backend-scaffold-application` / `yss-repository` / `yss-mybatis` / `yss-backend-scaffold-infrastructure` / `yss-web-controller` / `yss-dto` / `mapstruct` / `lombok` / `alibaba-java-code-style` / other |
| application_boundary |  |
| transaction_boundary |  |
| persistence_strategy |  |
| allowed_write_paths |  |
| forbidden_patterns | 私自新建 / 混用 Result 包装；Controller 内部类或非约定包临时定义主要 DTO / VO；DTO 未按 `yss-dto` 继承 `CommandDTO` / `QueryDTO` / `PageQuery`；Controller 手工分页；Controller 穿透 Repository；InMemory Gateway 作为正式持久化；`BeanUtils.copyProperties` / 反射拷贝 / 重复手写 mapping；成片手写 POJO getter/setter/constructor/builder/logger；其他： |
| expected_evidence_files |  |
| seam_deferred |  |
| 人工确认项 |  |
| verification_commands | 后端命令必须使用 `./mvnw ...`；如使用裸 `mvn ...`，必须在备注中记录受控例外原因 |

| 层级 | 必需 skill | 预期文件 / 证据 | 状态 |
|---|---|---|---|
| Adapter / Web | `yss-web-controller`、`yss-dto`、`yss-backend-scaffold-web`、`mapstruct`、`lombok` | Controller、CMD / Query / VO、WebConvertor、统一响应包装、Lombok 注解和 MapStruct 转换证据 | pending / implemented / seam-deferred / violation / not-applicable |
| Application | `yss-backend-scaffold-application` | AppService / UseCase、事务边界、跨聚合协调、异常处理 | pending / implemented / seam-deferred / violation / not-applicable |
| Domain | `yss-domain-modeling`、`yss-domain`、`yss-backend-scaffold-domain` | Entity / ValueObject / DomainService / Gateway interface / 状态方法 | pending / implemented / seam-deferred / violation / not-applicable |
| Infrastructure | `yss-repository`、`yss-mybatis`、`yss-backend-scaffold-infrastructure`、`mapstruct`、`lombok` | PO、Repository、Convertor、GatewayImpl、Mapper / XML / 查询策略、Lombok 注解和 MapStruct 转换证据 | pending / implemented / seam-deferred / violation / not-applicable |
| Java 规范 | `alibaba-java-code-style` | 命名、异常、日志、ORM、Maven、单测和安全项审查记录 | pending / implemented / seam-deferred / violation / not-applicable |

### 3.3 Contract 子合同

| 字段 | 内容 |
|---|---|
| api_impact | true / false |
| freeze_ref | API 有影响时的 OpenAPI Freeze |
| no_api_impact_ref | API 无影响时的正式记录 |
| generated_clients |  |
| contract_tests |  |
| regeneration_commands |  |

### 3.4 Cross-repo 子合同

| 字段 | 内容 |
|---|---|
| repositories |  |
| delivery_order |  |
| integration_verification |  |
| rollback_order |  |

### 3.5 后端门禁压力场景

| 场景 | 期望处理 |
|---|---|
| Agent 试图在 Controller 中新增内部 `CreateXCommand`、`XVO` 或私自新建 `PageResult` | 标记 `violation`；回到 `yss-web-controller` / `yss-dto` 补独立 DTO / VO / WebConvertor、复用既有响应包装或记录受控例外 |
| Agent 试图用 `InMemory*Gateway` 完成需要持久化的切片 | 仅允许 `seam-deferred`；必须写补齐切片、风险、人工确认项，不得作为正式持久化实现 |
| Agent 试图跳过 Repository / PO / Convertor，直接在 Application 中过滤集合 | 若切片需要持久化或查询策略，标记 `violation`；回到 `yss-repository` / `yss-mybatis` |
| Agent 试图用 `BeanUtils.copyProperties`、反射拷贝或大段手写字段赋值完成对象转换 | 标记 `violation`；回到 `mapstruct` / `yss-repository` / `yss-web-controller` 补 MapStruct Convertor，或记录受控例外、测试和 review 证据 |
| Agent 试图成片手写 POJO getter/setter、constructor、builder 或 logger | 标记 `violation`；回到 `lombok` 补注解，或记录受控例外、测试和 review 证据 |
| Agent 只写“符合 YSS”但没有列出 skill 证据和文件证据 | 标记 `violation`；不得进入 code review / 完成结论 |
| Agent 在后端 README、CI、Ticket、Review 或验证记录中使用 `mvn clean test` 等裸 Maven 命令 | 标记规范偏离；改为项目根目录 `./mvnw ...`，或记录既有仓库无法使用 wrapper 的受控例外 |
| Agent 将英文 skill 模板标题 / checklist 原样复制为持久化交付文档 | 标记规范偏离；正文、标题、审查结论、实施说明和 checkpoint 说明必须改为中文 |

## 4. 外部实现仓库

| repo_role | git_url | default_branch | working_branch | MR / PR | CI | test_command | build_command | 状态 |
|---|---|---|---|---|---|---|---|---|
| backend |  |  |  |  |  |  |  | pending / ready / blocked / not-applicable |
| frontend |  |  |  |  |  |  |  | pending / ready / blocked / not-applicable |
| other |  |  |  |  |  |  |  | pending / ready / blocked / not-applicable |

说明：当前仓库默认作为 Harness / 研发管理仓库；前后端实现默认位于外部实现仓库。缺少实现仓库登记时，先使用 `implementation-repo-onboarding`，并按 `docs/templates/implementation-repo-registry-template.md` 补齐登记。

## 4.1 脚手架初始化判定

| 受影响端 | 是否已有可用工程 | scaffold_status | 目标是否确认 | 处理结论 | 使用 skill | 输出位置 / 仓库 | 备注 |
|---|---|---|---|---|---|---|---|
| backend | 是 / 否 / 不适用 | existing / required / initialized / not-applicable | 是 / 否 / 不适用 | 复用现有 / 初始化 / 阻塞 | `yss-ddd-scaffold-generator` / none |  |  |
| frontend | 是 / 否 / 不适用 | existing / required / initialized / not-applicable | 是 / 否 / 不适用 | 复用现有 / 初始化 / 阻塞 | `yss-frontend-scaffold-generator` / none |  |  |

## 4.2 人工确认结论

| 人工确认项 | 是否涉及 | 结论 | 证据 / 链接 | 补齐落点 |
|---|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |
| 权限接入 / 认证 / 授权 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |
| 审计日志 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |

## 5. TDD 与验证策略

> 每个工作单元必须且只能选择 `behavior-tdd` 或 `controlled-generation`。领域规则、状态机、事务、复杂查询、权限 / 错误映射、页面交互和用户可见状态必须使用 `behavior-tdd`；`controlled-generation` 只用于机械脚手架、样板、冻结客户端和配置。

| work_unit_id | 验收行为 / 生成目标 | primary_skill | supporting_skills | tdd_mode | allowed_write_paths | expected_evidence | verification_commands | 状态 |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  | behavior-tdd / controlled-generation |  |  |  | pending / running / blocked / completed / stale |

### 5.1 `behavior-tdd` 工作单元

| work_unit_id | 已确认公开 seam | RED 证据 | GREEN 证据 | 合同回勾 |
|---|---|---|---|---|
|  |  |  |  |  |

### 5.2 `controlled-generation` 工作单元

| work_unit_id | exception_reason | generator | generator_inputs | expected_files | verification_commands | behavior_tests_after_generation |
|---|---|---|---|---|---|---|
|  | mechanical-scaffold / frozen-client / configuration / other |  |  |  |  |  |

若生成内容包含状态变化、权限、业务过滤、事务或错误映射，必须拆分对应工作单元并改为 `behavior-tdd`。

| 层级 | 先失败测试 / 验证命令 | 通过标准 |
|------|------------------------|----------|
| Domain / Application |  |  |
| API / 契约 |  |  |
| 前端组件 |  |  |
| E2E / 关键路径 |  |  |

## 5.3 YSS Skill Execution Result 回填

> 每个结果必须引用当前 `contract_id` / `contract_version` 和 `work_unit_id`。只列计划命令、缺实际结果或时间戳，不构成 fresh verification。

| schema_version | skill | slice_id | work_unit_id | status | consumed contract ref / version | changed_files | evidence_files | verification result / executed_at | constraint_results | seam_deferred | deviations | new_impacts | 结果文件引用 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `1` |  |  |  | implemented / seam-deferred / drift / violation / not-applicable |  |  |  |  |  |  |  |  |  |

汇总规则：

- `changed_files` 超出 `allowed_write_paths`，或 `expected_evidence_files` 缺失：标记 `violation`，阻断 build。
- `drift`：触发 Architecture Re-check；不得汇总为完成。
- `new_impacts` 非空、原 `not-applicable` 被推翻或合同关键输入变化：将合同及相关工作单元标记 `stale`，暂停实现并进入完整重路由或生命周期回退。

## 6. Subagent 执行计划

| task_id | subagent 角色 | 责任范围 | 允许修改文件 / 模块 | 禁止事项 | 输出回填位置 |
|---|---|---|---|---|---|
|  | Explorer / Drafter / Worker / Reviewer / Verifier | frontend / backend / test / review / verify / docs |  | 不得 Freeze / 不得安全放行 / 不得覆盖他人改动 |  |

| 并行风险 | 缓解措施 | 合并负责人 | 状态 |
|---|---|---|---|
| 写范围冲突 | 按文件 / 模块拆分，不重叠写入 | 主控 Agent | open / mitigated / blocked |
| 实现者自审 | Reviewer 必须独立于 Worker / Drafter | 主控 Agent | open / mitigated / blocked |
| 验证不足 | Verifier 执行 fresh verification 并记录命令 | 主控 Agent | open / mitigated / blocked |

| 子代理输出 | 主控采纳结论 | 未采纳原因 | 回填资产 |
|---|---|---|---|
|  | 采纳 / 部分采纳 / 不采纳 / 需返工 |  |  |

## 7. 回滚点与风险

| 风险 | 回滚点 | 观察信号 | 负责人 |
|------|--------|----------|--------|
|  |  |  |  |

## 8. 完成标准

- [ ] 垂直切片 Ticket 完整，且状态允许进入实现。
- [ ] 统一合同包含 `contract_id` / `contract_version`、Common、Frontend、Backend、Contract 和 Cross-repo 子合同；不适用项均有原因。
- [ ] 生命周期编排器已批准并持久化合同；Router 没有自行给出 `approved` 或 `ready-for-agent`。
- [ ] YSS skills 已最小化选择，没有绕过 Ticket、OpenAPI Freeze / 无 API 影响记录或必要的 Spec Delta。
- [ ] 后端切片如适用，已填写 `Backend Slice Implementation Contract`，并且 required skills、禁止模式、证据文件、延期 seam 和验证命令完整。
- [ ] 受影响外部实现仓库已登记，并绑定分支、MR / PR、CI 和验证命令。
- [ ] 受影响 frontend / backend 工程存在性已判定；0-1 缺失工程已登记 `scaffold_status=required`、确认外部脚手架目标并路由对应脚手架 skill。
- [ ] DDL / SQL / 数据库迁移、权限接入和审计日志的人工确认结论已记录；未通过时记录阻塞原因、责任人和补齐计划。
- [ ] 若使用 subagent，已记录任务包、写范围、独立 review、verification 命令和主控采纳结论。
- [ ] 每个切片包含测试命令、验证方式和回滚点。
- [ ] 每个工作单元均绑定唯一 TDD 模式，且 Execution Result 引用合同版本并包含实际验证结果和时间。
- [ ] `changed_files`、证据文件、`deviations`、`new_impacts`、`drift` 和 `violation` 已完成汇总核验；需重路由时合同已标记 `stale` 并暂停相关工作单元。
- [ ] 需要人工确认的事项已记录范围、责任人和结论。

## 9. 下一步门禁

- Router 结论：draft / blocked / ready-for-lifecycle-review
- 生命周期编排器结论：approved / rejected / pending
- 下一步：生命周期合同审查 / TDD 实现 / 完整重路由 / Architecture Re-check / 回到 系统 / 数据架构设计 / 回到垂直切片
- 阻断项：
- stale 合同 / 工作单元：
- 恢复条件：
