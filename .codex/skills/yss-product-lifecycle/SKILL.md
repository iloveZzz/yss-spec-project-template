---
name: yss-product-lifecycle
description: "Use when starting or continuing a YSS product/module/project through competitor analysis, discovery, PRD, OpenAPI, architecture, OpenSpec/Comet, vertical slices, YSS frontend/backend delivery, release, implementation, or retrospective; or when deciding missing artifacts, lifecycle stage, next prompt, or YSS/OpenSpec/Comet skill routing."
---

# YSS Product Lifecycle

Use this skill as the project-level entrypoint for product-to-engineering flow. It routes work across lifecycle artifacts and specialist skills; it does not replace `comet`, `openspec-*`, `yss-router`, `yss-ui`, `yss-domain`, or other specialist skills.

## Core Rule

Determine the current lifecycle stage before proposing work. If implementation is requested but upstream artifacts are missing, identify the gap and route to the right artifact or specialist skill first.

```text
competitive analysis
-> discovery
-> PRD
-> OpenAPI
-> architecture
-> OpenSpec / Comet change
-> vertical slices
-> YSS frontend/backend implementation
-> release / implementation
-> retrospective
```

## Workflow

1. Inspect existing context before asking questions:
   - `CONTEXT.md`
   - `docs/discovery/` and `docs/discovery/reports/`
   - `docs/requirements/`
   - `docs/api/specs/`
   - `docs/architecture/` and `docs/adr/`
   - `openspec/changes/` and current OpenSpec/Comet state
2. Classify the request into one stage:
   - product research, requirement definition, contract/design, change planning, implementation routing, release, or retrospective.
3. Check whether required upstream artifacts exist.
4. Output the next action:
   - artifact to create/update,
   - specialist skill to invoke,
   - suggested prompt,
   - acceptance checklist.
5. Stop before writing business code. For implementation, route through `yss-router` and the selected specialist skills.

## Specialist Routing

Use these references as needed:

- Lifecycle stage decisions: `references/stage-routing.md`
- YSS skill selection: `references/yss-skill-routing.md`
- Artifact checklist: `references/artifact-checklist.md`

Default routing:

| Intent | Next skill / workflow |
|---|---|
| Start a new business product/module | competitive analysis -> discovery -> PRD |
| Formalize a change | `comet` or `openspec-new-change` / `openspec-propose` |
| Continue active change | `comet` first; fallback to `openspec-continue-change` |
| Choose YSS implementation skills | `yss-router` |
| Build Vue page | `yss-ui` plus related frontend skills chosen by `yss-router` |
| Build backend module from scratch | `yss-ddd-scaffold-generator` |
| Model backend domain | `yss-domain` / `yss-backend-scaffold-domain` |
| Implement persistence | `yss-repository` plus `yss-mybatis` when needed |
| Implement Web adapter | `yss-web-controller` |

## When Not To Use

- For a single YTable height/layout issue, use `yss-use-table-height` directly.
- For a single Repository / PO / Convertor / GatewayImpl task with stable domain metadata, use `yss-repository` directly.
- For a request that is only about running the Comet workflow and already has the needed lifecycle artifacts, use `comet` directly.

## Output Contract

When used for planning or routing, respond with:

````markdown
### 当前阶段
<one lifecycle stage>

### 阶段判定依据
- <signals and artifacts used to infer the stage>

### 已有资产
- <found artifacts>

### 缺失资产
- <missing artifacts or "无">

### 是否阻塞
- <blocked / not blocked and why>

### 下一步
- <one recommended next action>

### 推荐技能
- <minimal skill list>

### 可直接使用的提示词
```text
<prompt>
```
````

When the user explicitly asks for a full delivery plan, include stage-by-stage tasks and acceptance checks, but keep each stage tied to concrete project artifacts.

## Guardrails

- Do not skip competitor analysis for new product/module work unless the user explicitly says it is unnecessary.
- Do not start implementation before PRD and OpenAPI impact are clear.
- Do not route directly to frontend/backend skills before `yss-router` when the task crosses multiple YSS areas.
- Do not modify specialist skill behavior from this skill.
- Do not generate production code from this skill; hand off to the selected specialist skill.
- Flag security red lines from `AGENTS.md` as human-review items.
