# Lifecycle Stage Routing

Use this table to decide where the request belongs and what to do next. Daily execution uses 9 main stages. The previous 21 lifecycle names are governance gates / responsibility points and are mapped in `docs/process/lifecycle-artifact-map.md`.

| Main stage | User signals | Required inputs | Outputs | Next action |
|---|---|---|---|---|
| 1. Intake / lifecycle triage | 新需求、继续需求、Bug、小调整、流程不清、缺失资产判断 | User request, existing docs, git / OpenSpec / Comet state when relevant | stage decision, nearest trustworthy artifact, minimal skill list | route to the earliest impacted stage |
| 2. Opportunity and Discovery | 新工程、竞品、行业对标、MVP 边界、模糊想法、用户痛点 | Product idea, competitor/user facts or explicit skip | `docs/discovery/<feature>-discovery.md`, competitive matrix when useful, MVP boundary | Business / PRD / functional architecture |
| 3. Business / PRD / functional architecture | 用户旅程、业务能力、需求、用户故事、验收标准、模块边界 | Discovery, business facts, `CONTEXT.md` terms | PRD, business architecture when needed, functional architecture / product overview design | Product design and requirement freeze |
| 4. Product design and requirement freeze | 页面、原型、交互、用户流、状态矩阵、范围冻结 | PRD baseline, product overview / functional architecture, UI impact | interaction spec and prototype review when UI exists; calibrated PRD / requirement freeze record | API Draft and engineering baseline |
| 5. API Draft and engineering baseline | 前后端接口、DTO、错误结构、后端新服务、新模块、DDD 分层 | frozen or calibrated requirements, design inputs, API impact decision | OpenAPI Draft or no API impact record, OpenAPI Draft Review, engineering baseline review when applicable | System / data architecture and Design Review |
| 6. System / data architecture and Design Review | 服务边界、部署、集成、状态机、权限、NFR、持久化、元模型、版本、血缘 | PRD, design, API Draft / no-impact decision, engineering baseline | system overview, data architecture when required, ADR candidates, Design Review result | Contract freeze and OpenSpec / Comet |
| 7. Contract freeze and OpenSpec / Comet | OpenAPI Freeze、正式 change、proposal/spec/design/tasks、Comet 状态 | Design Review approval, API Draft, PRD/design/architecture artifacts | OpenAPI Freeze or no API impact record; active `openspec/changes/<change>/` with required files | Vertical slices and TDD implementation |
| 8. Vertical slices and TDD implementation | issue、切片、实现、review、清理简化 | active change, frozen contract / no API impact, approved slice, Comet phase inspected | GitHub Issues or `docs/requirements/issues/`, implementation routing, tests, review, verification evidence | Verification, release, and retrospective |
| 9. Verification, release, and retrospective | fresh verification、发布、实施、用户手册、复盘 | implemented and reviewed slice/change | release note, implementation record, user guide, retrospective, updates to `CONTEXT.md` / `AGENTS.md` / ADR | next planning |

## Stage Rules

- If no opportunity input exists for a new module, start with opportunity exploration; create a competitive matrix when market/competitor/user facts are needed, or explicitly record why it is skipped.
- For small requirement changes or iterations on an existing feature, do not rerun the full lifecycle. Assess impact, select the nearest trustworthy existing stage, then update only the affected artifact and required downstream gates. Re-enter opportunity exploration, discovery, business architecture, or full PRD only when the change invalidates user, problem, MVP, non-goal, or product-boundary assumptions.
- Treat lifecycle opportunity exploration as product/MVP boundary work. When routing into Comet, do not repeat product discovery; Comet brainstorming should focus on formal change design, technical tradeoffs, risks, contracts, and test seams.
- For new products, business architecture is required before PRD baseline unless users, value stream, role model, ecosystem boundary, and capability map are already documented elsewhere.
- Product overview design / functional architecture belongs between PRD baseline and PRD calibration. If user flows, business objects, modules, feature priority, MVP boundaries, page/API/data impacts, or dependencies are unclear, do not calibrate PRD yet.
- If `CONTEXT.md` lacks stable terms, update terms before PRD calibration / requirement freeze.
- If the PRD says API impact is unknown, do not start frontend/backend implementation.
- If the feature has a user interface, route PRD baseline to `product-design-prototype`; do not create OpenAPI Draft from PRD baseline alone.
- UI work must have page map, prototype / wireframe, user flow, interaction state matrix, and OpenAPI implication list, then pass `prototype-review` before PRD calibration / requirement freeze.
- For UI-driven API work, OpenAPI Draft must be derived from calibrated PRD plus product overview design, page/prototype/interaction spec, state matrix, permissions, abnormal paths, and `prototype-review` findings. If these are missing or stale, return to product design / PRD calibration before drafting the contract.
- If OpenAPI changes exist, create Draft first, then Freeze after engineering baseline/design review before implementing frontend or backend.
- If a small iteration only changes copy, local style, an existing option value, or documentation without touching API, state, permission, data, module boundary, or security red lines, route to `comet-tweak` or direct minimal change plus verification.
- After OpenAPI Freeze and before formal `vertical slices / to-issues`, OpenSpec / Comet change formalization is a hard gate. Run `openspec list --json`; if there is no matching active change, route to `comet` or `openspec-new-change` first. If a matching change exists but lacks `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, or `.comet.yaml`, treat vertical slicing as blocked until the change artifacts are completed.
- If backend work creates a new service or module, confirm YSS DDD engineering baseline before architecture/design approval.
- System architecture is required before Design Review when service boundaries, deployment, integration, performance, reliability, security, observability, or operations are affected.
- Data architecture is required before persistence / repository work. For data modeling, metadata management, ER design, version management, or lineage-analysis products, it is a core design artifact and must be explicit before Design Review and OpenAPI Freeze.
- Use `excalidraw-diagram-generator` when a diagram helps review business flows, functional modules, system boundaries, data models, lineage, state flow, API sequence, or vertical-slice dependencies. Diagram findings must be written back to the source text artifact.
- Do not move from design to implementation until Design Review has no blocking findings.
- If a Comet/OpenSpec change is active, prefer continuing it over creating a duplicate.
- If multiple active OpenSpec/Comet changes look relevant, ask the user which change to continue before planning work.
- If implementation spans frontend and backend, route through `yss-router`, but only after checking the matching Comet phase. If the change is still in `open`, `design`, `verify`, or `archive`, continue `comet` first. If the change is in `build` but lacks plan, isolation, build mode, TDD mode, or review mode, continue `comet-build` first.
- After implementation, require independent review and fresh verification evidence before release/archive.

## State Inspection

Before deciding whether to create or continue a formal change:

1. Run `openspec list --json` when the command is available.
2. Inspect `openspec/changes/*/.comet.yaml` when Comet metadata exists.
3. For formal vertical slicing, verify the matching active change contains `proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml`.
4. For implementation routing, inspect `.comet.yaml` fields: `phase`, `design_doc`, `plan`, `build_pause`, `isolation`, `build_mode`, `tdd_mode`, `review_mode`, and `verify_result` when present.
5. Prefer continuing an active matching change over creating a duplicate.
6. If no active matching change exists, route to `comet` or `openspec-new-change` / `openspec-propose`.
7. If a matching change exists but required artifacts are missing, route to `comet` / OpenSpec continuation before `to-issues`.
8. If a matching change exists but Comet phase is not ready for implementation, route to `comet` or the matching phase skill before `yss-router` / implementation.
9. If several active changes may match the request, stop and ask the user to choose one.

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

Product overview design / Functional architecture:

```text
基于 <PRD 路径> 和 <business architecture 路径>，梳理 <feature> 的产品总体设计 / 功能架构。
请输出用户主流程、业务对象关系、功能域、模块边界、功能优先级、模块依赖、MVP/非目标边界、页面/API/数据影响、开放问题，以及需要回填 PRD 的缺口。
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

System overview and data architecture:

```text
基于 <PRD 路径>、<产品总体设计路径>、<OpenAPI Draft 路径> 和工程基线，产出 <feature> 的系统概要设计和数据架构。
系统架构覆盖服务/模块边界、部署、集成、权限、性能、可靠性和回滚策略。
数据架构覆盖概念模型、逻辑模型、物理模型、元模型、版本策略、血缘/查询/索引策略。
如关系复杂，使用 excalidraw-diagram-generator 生成 C4/系统架构图、ER 图、血缘图或 DFD。
```

## Examples

Start a data middle platform model-management project:

- Stage: Opportunity exploration.
- Evidence: The user says "新建工程" or "模型管理" and no product artifacts exist yet.
- Missing assets: opportunity input, competitor matrix if needed, discovery document, business architecture, PRD baseline, product overview design / functional architecture, product design / prototype and `prototype-review` when UI exists, PRD calibration, OpenAPI Draft/Freeze decision, engineering baseline, system overview / data architecture as needed, architecture/design review, OpenSpec/Comet change.
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
使用 yss-product-lifecycle，继续模型发布与版本冻结功能，检查 active change、PRD、产品总体设计/功能架构、页面/原型/交互设计、OpenAPI Draft/Freeze、工程基线、系统概要/数据架构、设计审查和垂直切片是否齐全，并给出下一步。
```

Decide YSS skills for a vertical slice:

- Stage: Implementation routing.
- Evidence: PRD, frozen OpenAPI or no API impact, design review, approved slice, and matching Comet phase are clear.
- Next action: inspect `.comet.yaml`. If the change is not build-ready, route to `comet`; otherwise load `references/yss-skill-routing.md`, then route through `yss-router`.
- Next prompt:

```text
使用 yss-product-lifecycle，检查 active Comet change phase 和这个垂直切片的实现准备度。
若 Comet phase 尚未 build-ready，请路由到 comet；若已就绪，请判断需要哪些 YSS skills，并输出最小技能集和 Comet build 交接提示词。
```
