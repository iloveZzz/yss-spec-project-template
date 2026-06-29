# Lifecycle Stage Routing

Use this table to decide where the request belongs and what to do next.

| Stage | User signals | Required inputs | Outputs | Next action |
|---|---|---|---|---|
| Competitive analysis | 新工程、竞品、行业对标、MVP 边界 | Product idea | `docs/discovery/reports/<feature>-competitive-matrix.md` | Discovery |
| Discovery | 用户、痛点、场景、非目标、MVP | Competitive matrix or explicit skip | `docs/discovery/<feature>-discovery.md` | PRD |
| PRD | 需求、用户故事、验收标准 | Discovery, `CONTEXT.md` terms | `docs/requirements/<feature>-prd.md` | OpenAPI impact |
| OpenAPI | 前后端接口、契约、DTO、Orval | PRD | `docs/api/specs/<feature>.yaml` or "no API impact" | Architecture |
| Architecture | 模块边界、状态机、版本、权限、集成 | PRD and OpenAPI impact | `docs/architecture/<feature>-architecture.md`, ADR if needed | OpenSpec / Comet |
| OpenSpec / Comet | 正式变更、proposal、tasks、delta spec | PRD, architecture, API impact | `openspec/changes/<change>/` artifacts | Vertical slices / build |
| Vertical slices | issue、切片、拆任务 | PRD, OpenAPI, change artifacts | GitHub Issues or `docs/requirements/issues/` | Implementation routing |
| Implementation routing | 前端、后端、YSS、代码落地 | Slice and OpenAPI | Minimal YSS skill list | Specialist skills |
| Release / implementation | 发布、实施、客户上线、回滚 | Verified change | `docs/releases/`, `docs/implementation/`, `docs/user-guide/` | Retrospective |
| Retrospective | 复盘、沉淀、流程改进 | Release feedback | `docs/process/sprint-retros/`, updates to `CONTEXT.md` / `AGENTS.md` / ADR | Next planning |

## Stage Rules

- If no competitor analysis exists for a new module, start there.
- If `CONTEXT.md` lacks stable terms, update terms before PRD finalization.
- If the PRD says API impact is unknown, do not start frontend/backend implementation.
- If OpenAPI changes exist, update specs before implementing frontend or backend.
- If a Comet/OpenSpec change is active, prefer continuing it over creating a duplicate.
- If multiple active OpenSpec/Comet changes look relevant, ask the user which change to continue before planning work.
- If implementation spans frontend and backend, route through `yss-router`.

## State Inspection

Before deciding whether to create or continue a formal change:

1. Run `openspec list --json` when the command is available.
2. Inspect `openspec/changes/*/.comet.yaml` when Comet metadata exists.
3. Prefer continuing an active matching change over creating a duplicate.
4. If no active matching change exists, route to `comet` or `openspec-new-change` / `openspec-propose`.
5. If several active changes may match the request, stop and ask the user to choose one.

## Suggested Prompts

Competitive analysis:

```text
使用 yss-product-lifecycle，基于“<feature>”生成竞品分析阶段下一步。
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

- Stage: Competitive analysis.
- Evidence: The user says "新建工程" or "模型管理" and no product artifacts exist yet.
- Missing assets: competitor matrix, discovery document, PRD, OpenAPI impact, architecture, OpenSpec/Comet change.
- Next prompt:

```text
使用 yss-product-lifecycle，帮我启动数据中台模型管理项目，先补齐竞品分析并给出下一阶段 discovery 输入。
```

Continue model publishing and version freeze:

- Stage: OpenSpec / Comet or vertical slices, depending on active change state.
- Evidence: The user says "继续" and names an existing feature.
- First check: `openspec list --json`, then `openspec/changes/*/.comet.yaml`.
- Next prompt:

```text
使用 yss-product-lifecycle，继续模型发布与版本冻结功能，检查 active change、PRD、OpenAPI 和垂直切片是否齐全，并给出下一步。
```

Decide YSS skills for a vertical slice:

- Stage: Implementation routing.
- Evidence: PRD, OpenAPI impact, and slice are already clear.
- Next action: load `references/yss-skill-routing.md`, then route through `yss-router`.
- Next prompt:

```text
使用 yss-product-lifecycle，判断这个垂直切片需要哪些 YSS skills，并输出最小技能集和交接提示词。
```
