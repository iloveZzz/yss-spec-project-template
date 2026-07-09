# YSS Lifecycle Stage Routing

Use this reference after reading current repo context. It maps request shape to the earliest useful lifecycle stage and the next skill.

## Stage Routing Table

| Stage | Use when | Inputs to inspect | Output | Next route |
|---|---|---|---|---|
| 1. Intake / lifecycle triage | 新需求、继续需求、Bug、小调整、流程不清、缺失资产判断 | User request, `CONTEXT.md`, docs, issues, git state | stage decision, nearest trustworthy artifact, minimal skill list | route to earliest impacted stage |
| 2. Opportunity and Discovery | 模糊想法、竞品/市场输入、用户痛点尚不清楚 | discovery docs, market/user facts, stakeholder notes | user, pain, why now, MVP, non-goals, success criteria, downstream impact | `competitive-intelligence` when market / competitor facts are needed, then `grill-with-docs` / spec |
| 3. Business / spec / functional architecture | 需要明确用户故事、验收标准、功能边界、模块依赖 | discovery, `CONTEXT.md`, ADRs, existing spec / legacy PRD | spec, business architecture, functional architecture, spec review notes | product design or contract design |
| 4. Product design and requirement freeze | 有 UI、页面、交互、状态矩阵、权限状态、空/错/加载态、高保真体验 | spec, design system, existing UI, component docs | product overview design, interaction spec, state matrix, prototype review, Ant Design v6 high-fidelity HTML prototype, requirement freeze | contract and architecture review |
| 5. System / data architecture, engineering contract, and Design Review | 接口、DTO、错误结构、后端新服务、新模块、DDD 分层、服务边界、部署、集成、状态机、权限、NFR、持久化、元模型、版本、血缘 | calibrated requirements, design inputs, API impact decision, engineering impact decision | API impact record; contract sketch or reviewable OpenAPI Draft marked draft-for-review; OpenAPI Draft Review; engineering baseline review; system overview; data architecture when required; ADR candidates; Design Review result | contract freeze and ticket formalization |
| 6. Contract freeze and ticket formalization | OpenAPI Freeze、无 API 影响记录、正式拆分垂直切片 | Design Review approval, contract draft / OpenAPI Draft, spec/design/architecture artifacts | OpenAPI Freeze or no API impact record; GitHub/GitLab/local vertical slice tickets | vertical slices and TDD implementation |
| 7. Vertical slices and TDD implementation | ticket、切片、实现、review、清理简化 | frozen contract / no API impact, approved slice, implementation repo/location | implementation routing, YSS skill routing, tests, review, verification evidence | verification, release, and retrospective |
| 8. Verification, release, and retrospective | 准备合并、发布、归档、复盘、用户手册 | diff, tests, CI, review notes, release notes | fresh verification, release / rollback notes, retrospective, doc updates | next intake |

## Routing Principles

- Treat lifecycle opportunity exploration as product/MVP boundary work. Discovery may produce competitive analysis via `competitive-intelligence`, an opportunity statement, product capability guidance, and downstream impact signals, but it must not freeze spec, final functional architecture, OpenAPI, data architecture, or technical system design.
- Small iterations only expand from the earliest affected artifact. Do not rerun Discovery or spec if a copy/style/config change has no API, state, permission, data, module boundary, or security impact.
- If a small iteration only changes copy, local style, an existing option value, or documentation without touching API, state, permission, data, module boundary, or security red lines, route to direct minimal change plus verification.
- API changes route through OpenAPI Draft Review and Freeze, then `to-tickets`.
- For implementation spanning frontend and backend, first check whether the impacted frontend/backend runtime projects already exist and can be reused; if not, route to scaffold initialization before `yss-router`.
- If multiple specs or tickets look relevant, ask the user which one to continue before planning work.

## Required Inspection Before Implementation

1. Inspect the relevant spec, ticket, OpenAPI Freeze or no-API-impact record, and architecture/design review when applicable.
2. Confirm the implementation repo/location.
3. Confirm whether each impacted frontend/backend runtime project already exists and is reusable; if not, route to `yss-ddd-scaffold-generator` or `yss-frontend-scaffold-generator`.
4. Confirm `yss-router` output when frontend/backend/YSS areas are involved.
5. Confirm Build Architecture Checklist and test command.
6. Confirm review strategy and fresh verification evidence required.
7. If any item is missing, route to the smallest artifact that fills the gap.

## Prompt Examples

### New feature

```text
使用 yss-product-lifecycle，判断 <feature> 当前生命周期阶段。
请先检查现有 Discovery、spec、设计、OpenAPI、架构和 ticket 资产，
然后输出缺失资产、是否阻塞、下一步推荐 skill 和可直接使用的提示词。
```

### Competitive analysis

```text
使用 yss-product-lifecycle，判断 <topic> 是否需要先进入竞品分析。
如果需要，请路由到 competitive-intelligence，输出研究问题、竞品范围、证据来源计划、
竞品矩阵落点、spec 输入和下一步 grill-with-docs / to-spec 衔接方式。
```

### API change

```text
使用 yss-product-lifecycle，评估 <feature> 的 API 影响。
请判断是否需要 OpenAPI Draft、Draft Review、Freeze、to-tickets，
并列出进入实现前必须补齐的 YSS skill routing、测试命令和审查点。
```

### Existing slice implementation

```text
使用 yss-product-lifecycle，检查 <issue-or-feature> 的实现准备度。
若 spec、OpenAPI Freeze 或架构清单缺失，请路由回对应阶段；
若已就绪，请先判断受影响的 frontend/backend 工程是否已存在且可复用；
若缺失则路由到对应脚手架 skill，否则输出最小 YSS skill 集合、TDD 策略、review 策略和验证命令。
```

### Bug fix

```text
使用 yss-product-lifecycle，判断这个 bug 是否只需要 diagnosing-bugs + tdd，
还是影响 API、权限、数据模型或架构边界。
请输出最小复现入口、回归测试位置和 fresh verification 命令。
```
