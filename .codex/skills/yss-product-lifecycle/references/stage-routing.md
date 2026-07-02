# Lifecycle Stage Routing

Use this table to decide where the request belongs and what to do next.

| Stage | User signals | Required inputs | Outputs | Next action |
|---|---|---|---|---|
| Opportunity exploration | 新工程、竞品、行业对标、MVP 边界、模糊想法 | Product idea | opportunity notes, competitive matrix when useful, MVP boundary input | Discovery / business architecture |
| Discovery | 用户、痛点、场景、非目标、成功标准 | Opportunity input, competitive matrix or explicit skip | `docs/discovery/<feature>-discovery.md` | Business architecture / PRD |
| Business architecture | 用户旅程、业务能力、生态位置、角色协作、价值流 | Discovery or explicit product facts | `docs/architecture/<feature>-business-architecture.md` or discovery section; user journey, value stream, capability map, role/ecosystem model | PRD baseline / functional architecture |
| PRD baseline | 需求、用户故事、验收标准 | Discovery, business architecture when needed, `CONTEXT.md` terms | `docs/requirements/<feature>-prd.md` with API impact and test decisions | Functional architecture / `product-design-prototype` when UI exists / PRD calibration / OpenAPI no-impact decision |
| Functional architecture | 功能域、模块边界、功能优先级、模块依赖 | PRD baseline, business architecture, MVP boundary | `docs/architecture/<feature>-functional-architecture.md` or PRD section; module map, feature list, priority, dependencies | Product design / PRD calibration |
| Product design / prototype / interaction design | 页面、原型、交互、用户流、状态矩阵 | PRD baseline, user stories, UI impact | `docs/design/<feature>-interaction-spec.md` or prototype link, page map, state matrix, OpenAPI implication list | `prototype-review` |
| Prototype Review | 原型评审、状态矩阵评审、PRD 回填和 OpenAPI 反推评审 | PRD baseline, interaction spec, prototype/wireframe, state matrix | approved prototype review or blocking findings | PRD calibration / return to product design |
| PRD calibration / requirement freeze | 原型评审、交互回填、范围冻结 | PRD baseline, product design and prototype review when UI exists | calibrated PRD with design links, updated acceptance criteria, no-go list | OpenAPI Draft / Engineering baseline |
| OpenAPI Draft | 前后端接口、契约、DTO、Orval、错误结构 | calibrated PRD with API impact, approved prototype review when UI exists | `docs/api/specs/<feature>.yaml` draft or "no API impact" | Engineering baseline / architecture |
| Engineering baseline / YSS DDD review | 后端新服务、新模块、DDD 分层、脚手架、Gateway/Repository | PRD, product design when UI exists, and API draft/no-impact decision | scaffold decision, YSS skill baseline, architecture inputs | System architecture / OpenSpec / Comet design |
| System architecture / OpenSpec / Comet design | 服务边界、部署、集成、状态机、版本、权限、行为规格 | PRD, product design when UI exists, API draft/no-impact decision, engineering baseline when applicable | `docs/architecture/<feature>-system-architecture.md` or `<feature>-architecture.md`, ADR if needed, OpenSpec/Comet design artifacts | Data architecture when data/persistence is affected / Design Review |
| Data architecture / meta-model design | 元模型、版本、血缘、搜索、存储、索引、持久化策略 | PRD, OpenAPI Draft/no-impact decision, domain terms, system architecture when relevant | `docs/architecture/<feature>-data-architecture.md`, conceptual/logical/physical model, meta-model, lineage/query/index strategy | Design Review |
| Design Review | PRD/UI/API/DDD/ADR/seam/安全红线审查 | PRD, product design when UI exists, API Draft, required business/functional/system/data architecture artifacts | review result, blocking fixes or approval to Freeze | OpenAPI Freeze |
| OpenAPI Freeze | API 契约冻结、前后端实现输入 | API Draft, design review approval, product design agreement, frontend/backend/API agreement | frozen `docs/api/specs/<feature>.yaml` or no API impact record | OpenSpec / Comet change formalization |
| OpenSpec / Comet change formalization | 正式 change、proposal/spec/design/tasks、Comet 状态 | OpenAPI Freeze, PRD, product design when UI exists, system/data architecture, design review | matching active `openspec/changes/<change>/` with `proposal.md`, `design.md`, `tasks.md`, `specs/**/spec.md`, `.comet.yaml` | Vertical slices |
| Vertical slices | issue、切片、拆任务 | PRD, product design when UI exists, frozen OpenAPI or no API impact, matching active OpenSpec / Comet change with required artifacts | GitHub Issues or `docs/requirements/issues/` | Implementation routing |
| Implementation routing | 前端、后端、YSS、代码落地 | Slice, product design when UI exists, frozen OpenAPI/no-impact decision, design artifacts | Minimal YSS skill list and TDD/review/verify handoff | Specialist skills |
| Review / verification | 独立审查、fresh verification、契约一致性 | Implemented slice | review result, verification evidence | Release / implementation |
| Release / implementation | 发布、实施、客户上线、回滚 | Verified change | `docs/releases/`, `docs/implementation/`, `docs/user-guide/` | Retrospective |
| Retrospective | 复盘、沉淀、流程改进 | Release feedback | `docs/process/sprint-retros/`, updates to `CONTEXT.md` / `AGENTS.md` / ADR | Next planning |

## Stage Rules

- If no opportunity input exists for a new module, start with opportunity exploration; create a competitive matrix when market/competitor/user facts are needed, or explicitly record why it is skipped.
- Treat lifecycle opportunity exploration as product/MVP boundary work. When routing into Comet, do not repeat product discovery; Comet brainstorming should focus on formal change design, technical tradeoffs, risks, contracts, and test seams.
- For new products, business architecture is required before PRD baseline unless users, value stream, role model, ecosystem boundary, and capability map are already documented elsewhere.
- Functional architecture belongs with PRD baseline and product design. If modules, feature priority, MVP boundaries, or dependencies are unclear, do not calibrate PRD yet.
- If `CONTEXT.md` lacks stable terms, update terms before PRD calibration / requirement freeze.
- If the PRD says API impact is unknown, do not start frontend/backend implementation.
- If the feature has a user interface, route PRD baseline to `product-design-prototype`; do not create OpenAPI Draft from PRD baseline alone.
- UI work must have page map, prototype / wireframe, user flow, interaction state matrix, and OpenAPI implication list, then pass `prototype-review` before PRD calibration / requirement freeze.
- If OpenAPI changes exist, create Draft first, then Freeze after engineering baseline/design review before implementing frontend or backend.
- After OpenAPI Freeze and before formal `vertical slices / to-issues`, OpenSpec / Comet change formalization is a hard gate. Run `openspec list --json`; if there is no matching active change, route to `comet` or `openspec-new-change` first. If a matching change exists but lacks `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, or `.comet.yaml`, treat vertical slicing as blocked until the change artifacts are completed.
- If backend work creates a new service or module, confirm YSS DDD engineering baseline before architecture/design approval.
- System architecture is required before Design Review when service boundaries, deployment, integration, performance, reliability, security, observability, or operations are affected.
- Data architecture is required before persistence / repository work. For data modeling, metadata management, ER design, version management, or lineage-analysis products, it is a core design artifact and must be explicit before Design Review and OpenAPI Freeze.
- Use `excalidraw-diagram-generator` when a diagram helps review business flows, functional modules, system boundaries, data models, lineage, state flow, API sequence, or vertical-slice dependencies. Diagram findings must be written back to the source text artifact.
- Do not move from design to implementation until Design Review has no blocking findings.
- If a Comet/OpenSpec change is active, prefer continuing it over creating a duplicate.
- If multiple active OpenSpec/Comet changes look relevant, ask the user which change to continue before planning work.
- If implementation spans frontend and backend, route through `yss-router`.
- After implementation, require independent review and fresh verification evidence before release/archive.

## State Inspection

Before deciding whether to create or continue a formal change:

1. Run `openspec list --json` when the command is available.
2. Inspect `openspec/changes/*/.comet.yaml` when Comet metadata exists.
3. For formal vertical slicing, verify the matching active change contains `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml`.
4. Prefer continuing an active matching change over creating a duplicate.
5. If no active matching change exists, route to `comet` or `openspec-new-change` / `openspec-propose`.
6. If a matching change exists but required artifacts are missing, route to `comet` / OpenSpec continuation before `to-issues`.
7. If several active changes may match the request, stop and ask the user to choose one.

## Suggested Prompts

Opportunity exploration:

```text
使用 yss-product-lifecycle，基于“<feature>”判断当前是否需要机会探索、竞品矩阵、Discovery 或 PRD，并给出下一步。
```

Discovery:

```text
基于竞品分析结论，帮我形成 <feature> 的 discovery 文档，输出用户角色、核心流程、痛点、非目标范围和 MVP 边界。
```

Business architecture:

```text
基于 <discovery 路径>，为 <feature> 产出业务架构说明。
请覆盖目标用户、用户旅程、价值流、业务能力地图、角色/组织模型、外部系统边界和 MVP 非目标范围。
必要时使用 excalidraw-diagram-generator 生成用户旅程图或能力地图。
```

Functional architecture:

```text
基于 <PRD 路径> 和 <business architecture 路径>，梳理 <feature> 的功能架构。
请输出功能域、模块边界、功能优先级、模块依赖、MVP/非目标边界，以及需要回填 PRD 的缺口。
```

Change continuation:

```text
使用 yss-product-lifecycle，继续 <feature>，判断当前应走 Comet、OpenSpec 还是 YSS implementation routing。
```

Product design / prototype:

```text
使用 product-design-prototype，基于 <PRD 路径> 为 <feature> 生成或更新 docs/design/<feature>-interaction-spec.md。
请覆盖页面清单、用户主路径、异常路径、线框/原型链接、状态矩阵、OpenAPI 反推清单，以及需要回填 PRD 的需求缺口；完成后给出 prototype-review 交接。
```

Prototype review:

```text
使用 prototype-review，审查 <feature> 的 PRD 初稿、交互设计、线框/原型和状态矩阵是否足以进入 PRD 校准和 OpenAPI Draft。
请输出 Approved/Blocked、阻断项、PRD Calibration Readiness、OpenAPI Draft Readiness 和下一步。
```

System and data architecture:

```text
基于 <PRD 路径>、<OpenAPI Draft 路径> 和工程基线，产出 <feature> 的系统总体架构和数据架构。
系统架构覆盖服务/模块边界、部署、集成、权限、性能、可靠性和回滚策略。
数据架构覆盖概念模型、逻辑模型、物理模型、元模型、版本策略、血缘/查询/索引策略。
如关系复杂，使用 excalidraw-diagram-generator 生成 C4/系统架构图、ER 图、血缘图或 DFD。
```

## Examples

Start a data middle platform model-management project:

- Stage: Opportunity exploration.
- Evidence: The user says "新建工程" or "模型管理" and no product artifacts exist yet.
- Missing assets: opportunity input, competitor matrix if needed, discovery document, business architecture, PRD baseline / functional architecture, product design / prototype and `prototype-review` when UI exists, PRD calibration, OpenAPI Draft/Freeze decision, engineering baseline, system/data architecture as needed, architecture/design review, OpenSpec/Comet change.
- Next prompt:

```text
使用 yss-product-lifecycle，帮我启动数据中台模型管理项目，先判断机会探索和竞品分析是否必要，并给出下一阶段 discovery 输入。
```

Continue model publishing and version freeze:

- Stage: OpenSpec / Comet or vertical slices, depending on active change state.
- Evidence: The user says "继续" and names an existing feature.
- First check: `openspec list --json`, then `openspec/changes/*/.comet.yaml`.
- Next prompt:

```text
使用 yss-product-lifecycle，继续模型发布与版本冻结功能，检查 active change、PRD、功能架构、页面/原型/交互设计、OpenAPI Draft/Freeze、工程基线、系统/数据架构、设计审查和垂直切片是否齐全，并给出下一步。
```

Decide YSS skills for a vertical slice:

- Stage: Implementation routing.
- Evidence: PRD, frozen OpenAPI or no API impact, design review, and slice are already clear.
- Next action: load `references/yss-skill-routing.md`, then route through `yss-router`.
- Next prompt:

```text
使用 yss-product-lifecycle，判断这个垂直切片需要哪些 YSS skills，并输出最小技能集和交接提示词。
```
