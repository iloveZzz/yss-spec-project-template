# Lifecycle Stage Routing

Use this table to decide where the request belongs and what to do next.

| Stage | User signals | Required inputs | Outputs | Next action |
|---|---|---|---|---|
| Opportunity exploration | 新工程、竞品、行业对标、MVP 边界、模糊想法 | Product idea | opportunity notes, competitive matrix when useful, MVP boundary input | Discovery / PRD clarification |
| Discovery | 用户、痛点、场景、非目标、成功标准 | Opportunity input, competitive matrix or explicit skip | `docs/discovery/<feature>-discovery.md` | PRD |
| PRD | 需求、用户故事、验收标准 | Discovery, `CONTEXT.md` terms | `docs/requirements/<feature>-prd.md` with API impact and test decisions | OpenAPI Draft / no API impact |
| OpenAPI Draft | 前后端接口、契约、DTO、Orval、错误结构 | PRD with API impact | `docs/api/specs/<feature>.yaml` draft or "no API impact" | Engineering baseline / architecture |
| Engineering baseline / YSS DDD review | 后端新服务、新模块、DDD 分层、脚手架、Gateway/Repository | PRD and API draft/no-impact decision | scaffold decision, YSS skill baseline, architecture inputs | Architecture / OpenSpec / Comet design |
| Architecture / OpenSpec / Comet design | 模块边界、状态机、版本、权限、集成、行为规格 | PRD, API draft/no-impact decision, engineering baseline when applicable | `docs/architecture/<feature>-architecture.md`, ADR if needed, OpenSpec/Comet design artifacts | Design Review |
| Design Review | PRD/API/DDD/ADR/seam/安全红线审查 | PRD, API Draft, architecture/design artifacts | review result, blocking fixes or approval to Freeze | OpenAPI Freeze |
| OpenAPI Freeze | API 契约冻结、前后端实现输入 | API Draft, design review approval, frontend/backend/API agreement | frozen `docs/api/specs/<feature>.yaml` or no API impact record | Vertical slices |
| Vertical slices | issue、切片、拆任务 | PRD, frozen OpenAPI or no API impact, change artifacts | GitHub Issues or `docs/requirements/issues/` | Implementation routing |
| Implementation routing | 前端、后端、YSS、代码落地 | Slice, frozen OpenAPI/no-impact decision, design artifacts | Minimal YSS skill list and TDD/review/verify handoff | Specialist skills |
| Review / verification | 独立审查、fresh verification、契约一致性 | Implemented slice | review result, verification evidence | Release / implementation |
| Release / implementation | 发布、实施、客户上线、回滚 | Verified change | `docs/releases/`, `docs/implementation/`, `docs/user-guide/` | Retrospective |
| Retrospective | 复盘、沉淀、流程改进 | Release feedback | `docs/process/sprint-retros/`, updates to `CONTEXT.md` / `AGENTS.md` / ADR | Next planning |

## Stage Rules

- If no opportunity input exists for a new module, start with opportunity exploration; create a competitive matrix when market/competitor/user facts are needed, or explicitly record why it is skipped.
- Treat lifecycle opportunity exploration as product/MVP boundary work. When routing into Comet, do not repeat product discovery; Comet brainstorming should focus on formal change design, technical tradeoffs, risks, contracts, and test seams.
- If `CONTEXT.md` lacks stable terms, update terms before PRD finalization.
- If the PRD says API impact is unknown, do not start frontend/backend implementation.
- If OpenAPI changes exist, create Draft first, then Freeze after engineering baseline/design review before implementing frontend or backend.
- If backend work creates a new service or module, confirm YSS DDD engineering baseline before architecture/design approval.
- Do not move from design to implementation until Design Review has no blocking findings.
- If a Comet/OpenSpec change is active, prefer continuing it over creating a duplicate.
- If multiple active OpenSpec/Comet changes look relevant, ask the user which change to continue before planning work.
- If implementation spans frontend and backend, route through `yss-router`.
- After implementation, require independent review and fresh verification evidence before release/archive.

## State Inspection

Before deciding whether to create or continue a formal change:

1. Run `openspec list --json` when the command is available.
2. Inspect `openspec/changes/*/.comet.yaml` when Comet metadata exists.
3. Prefer continuing an active matching change over creating a duplicate.
4. If no active matching change exists, route to `comet` or `openspec-new-change` / `openspec-propose`.
5. If several active changes may match the request, stop and ask the user to choose one.

## Suggested Prompts

Opportunity exploration:

```text
使用 yss-product-lifecycle，基于“<feature>”判断当前是否需要机会探索、竞品矩阵、Discovery 或 PRD，并给出下一步。
```

Discovery:

```text
基于竞品分析结论，帮我形成 <feature> 的 discovery 文档，输出用户角色、核心流程、痛点、非目标范围和 MVP 边界。
```

Change continuation:

```text
使用 yss-product-lifecycle，继续 <feature>，判断当前应走 Comet、OpenSpec 还是 YSS implementation routing。
```

## Examples

Start a data middle platform model-management project:

- Stage: Opportunity exploration.
- Evidence: The user says "新建工程" or "模型管理" and no product artifacts exist yet.
- Missing assets: opportunity input, competitor matrix if needed, discovery document, PRD, OpenAPI Draft/Freeze decision, engineering baseline, architecture/design review, OpenSpec/Comet change.
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
使用 yss-product-lifecycle，继续模型发布与版本冻结功能，检查 active change、PRD、OpenAPI Draft/Freeze、工程基线、设计审查和垂直切片是否齐全，并给出下一步。
```

Decide YSS skills for a vertical slice:

- Stage: Implementation routing.
- Evidence: PRD, frozen OpenAPI or no API impact, design review, and slice are already clear.
- Next action: load `references/yss-skill-routing.md`, then route through `yss-router`.
- Next prompt:

```text
使用 yss-product-lifecycle，判断这个垂直切片需要哪些 YSS skills，并输出最小技能集和交接提示词。
```
