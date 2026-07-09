---
pipeline: <feature-id>
stage: implementation-routing
status: draft
owner: ai
---

# <功能名称>实现路由记录

> 适用场景：PRD、OpenAPI Freeze / 无 API 影响记录、Design Review 和垂直切片 Issue 已就绪后，进入实现前。
> 本文记录契约状态、Issue 状态、YSS skill 最小集合、测试策略和回滚点，不替代垂直切片 Issue 或实施计划。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| 垂直切片 Issue |  |  |  |
| OpenAPI Freeze / 无 API 影响记录 |  |  |  |
| OpenSpec-style Spec Delta（条件必需） |  |  | 仅 API、权限、状态机、数据模型、跨端、新模块或高风险变更需要 |
| Design Review |  |  |  |
| 实现仓库 / 实现位置 |  |  |  |
| 前后端工程存在性判定 |  |  | 记录 frontend / backend 是否已存在且可复用 |
| `垂直切片 Issue 状态` |  |  | ready / blocked / in-progress |

## 2. 实现前门禁

| 检查项 | 结果 | 备注 |
|--------|------|------|
| PRD 验收标准已可追溯 | 是 / 否 |  |
| OpenAPI Freeze 或无 API 影响记录已完成 | 是 / 否 |  |
| Spec Delta 已补齐或明确不需要 | 是 / 否 / 不适用 |  |
| Design Review 阻断项已关闭 | 是 / 否 / 不适用 |  |
| 垂直切片 Issue 已拆到端到端可验收 | 是 / 否 |  |
| 实现仓库 / 实现位置已登记 | 是 / 否 |  |
| 受影响 frontend 工程已存在可复用，或已登记 `scaffold_status=required` 并确认外部脚手架目标 | 是 / 否 / 不适用 |  |
| 受影响 backend 工程已存在可复用，或已登记 `scaffold_status=required` 并确认外部脚手架目标 | 是 / 否 / 不适用 |  |
| 缺失工程时已路由到对应脚手架 skill | 是 / 否 / 不适用 | `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` |
| YSS skill 路由已完成 | 是 / 否 |  |
| fresh verification 方式已明确 | 是 / 否 |  |

## 3. YSS skill 最小集合

| 领域 | skill | 使用原因 | 是否必需 |
|------|-------|----------|----------|
| 前端 |  |  | 是 / 否 |
| 后端 |  |  | 是 / 否 |
| API / 契约 |  |  | 是 / 否 |
| 测试 / 验证 |  |  | 是 / 否 |

### 3.1 Backend Slice Implementation Contract

> 任一后端切片写业务代码前必须填写本合同；没有后端影响时标记 `not-applicable` 并说明原因。合同缺少必填项时，结论必须为 `Blocked`，不得进入实现。

| 项 | 内容 |
|---|---|
| slice_id |  |
| affected_layers | Adapter / Application / Domain / Infrastructure / Bootstrap / not-applicable |
| required_skills | `yss-domain` / `yss-backend-scaffold-application` / `yss-repository` / `yss-mybatis` / `yss-backend-scaffold-infrastructure` / `yss-web-controller` / `yss-dto` / `alibaba-java-code-style` / other |
| allowed_write_paths |  |
| forbidden_patterns | 私自新建 / 混用 Result 包装；Controller 内部类或非约定包临时定义主要 DTO / VO；DTO 未按 `yss-dto` 继承 `CommandDTO` / `QueryDTO` / `PageQuery`；Controller 手工分页；Controller 穿透 Repository；InMemory Gateway 作为正式持久化；重复手写 mapping；其他： |
| expected_evidence_files |  |
| seam_deferred |  |
| TODO-HUMAN-REVIEW |  |
| verification_commands |  |

| 层级 | 必需 skill | 预期文件 / 证据 | 状态 |
|---|---|---|---|
| Adapter / Web | `yss-web-controller`、`yss-dto`、`yss-backend-scaffold-web` | Controller、CMD / Query / VO、WebConvertor、统一响应包装证据 | pending / implemented / seam-deferred / violation / not-applicable |
| Application | `yss-backend-scaffold-application` | AppService / UseCase、事务边界、跨聚合协调、异常处理 | pending / implemented / seam-deferred / violation / not-applicable |
| Domain | `yss-domain-modeling`、`yss-domain`、`yss-backend-scaffold-domain` | Entity / ValueObject / DomainService / Gateway interface / 状态方法 | pending / implemented / seam-deferred / violation / not-applicable |
| Infrastructure | `yss-repository`、`yss-mybatis`、`yss-backend-scaffold-infrastructure` | PO、Repository、Convertor、GatewayImpl、Mapper / XML / 查询策略 | pending / implemented / seam-deferred / violation / not-applicable |
| Java 规范 | `alibaba-java-code-style` | 命名、异常、日志、ORM、Maven、单测和安全项审查记录 | pending / implemented / seam-deferred / violation / not-applicable |

### 3.2 后端门禁压力场景

| 场景 | 期望处理 |
|---|---|
| Agent 试图在 Controller 中新增内部 `CreateXCommand`、`XVO` 或私自新建 `PageResult` | 标记 `violation`；回到 `yss-web-controller` / `yss-dto` 补独立 DTO / VO / WebConvertor、复用既有响应包装或记录受控例外 |
| Agent 试图用 `InMemory*Gateway` 完成需要持久化的切片 | 仅允许 `seam-deferred`；必须写补齐切片、风险和 `TODO-HUMAN-REVIEW`，不得作为正式持久化实现 |
| Agent 试图跳过 Repository / PO / Convertor，直接在 Application 中过滤集合 | 若切片需要持久化或查询策略，标记 `violation`；回到 `yss-repository` / `yss-mybatis` |
| Agent 只写“符合 YSS”但没有列出 skill 证据和文件证据 | 标记 `violation`；不得进入 code review / 完成结论 |

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

## 4.2 人审结论

| 人审项 | 是否涉及 | 结论 | 证据 / 链接 | TODO-HUMAN-REVIEW 落点 |
|---|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |
| 权限接入 / 认证 / 授权 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |
| 审计日志 | 是 / 否 | 通过 / 草案 / 阻断 / 不适用 |  |  |

## 5. TDD 与验证策略

| 层级 | 先失败测试 / 验证命令 | 通过标准 |
|------|------------------------|----------|
| Domain / Application |  |  |
| API / 契约 |  |  |
| 前端组件 |  |  |
| E2E / 关键路径 |  |  |

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

- [ ] 垂直切片 Issue 完整，且状态允许进入实现。
- [ ] YSS skills 已最小化选择，没有绕过 Issue、OpenAPI Freeze / 无 API 影响记录或必要的 Spec Delta。
- [ ] 后端切片如适用，已填写 `Backend Slice Implementation Contract`，并且 required skills、禁止模式、证据文件、延期 seam 和验证命令完整。
- [ ] 受影响外部实现仓库已登记，并绑定分支、MR / PR、CI 和验证命令。
- [ ] 受影响 frontend / backend 工程存在性已判定；0-1 缺失工程已登记 `scaffold_status=required`、确认外部脚手架目标并路由对应脚手架 skill。
- [ ] DDL / SQL / 数据库迁移、权限接入和审计日志的人审结论已记录；未通过时仅保留草案或 `TODO-HUMAN-REVIEW`。
- [ ] 若使用 subagent，已记录任务包、写范围、独立 review、verification 命令和主控采纳结论。
- [ ] 每个切片包含测试命令、验证方式和回滚点。
- [ ] 触碰安全红线的项已标记 `TODO-HUMAN-REVIEW`。

## 9. 下一步门禁

- 结论：Approved / Blocked
- 下一步：TDD 实现 / 回到 系统 / 数据架构设计 / 回到垂直切片
- 阻断项：
