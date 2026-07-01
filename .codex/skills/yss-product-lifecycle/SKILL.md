---
name: yss-product-lifecycle
description: "Use when starting or continuing a YSS product/module/project through opportunity exploration, discovery, PRD baseline, product design/prototype/interaction design, PRD calibration, OpenAPI Draft/Freeze, engineering baseline, architecture, design review, OpenSpec/Comet, vertical slices, YSS frontend/backend delivery, review, release, implementation, or retrospective; or when deciding missing artifacts, lifecycle stage, next prompt, or YSS/OpenSpec/Comet skill routing."
---

# YSS Product Lifecycle

Use this skill as the project-level entrypoint for product-to-engineering flow. It routes work across lifecycle artifacts and specialist skills; it does not replace `comet`, `openspec-*`, `yss-router`, `yss-ui`, `yss-domain`, or other specialist skills.

## Core Rule

Determine the current lifecycle stage before proposing work. If implementation is requested but upstream artifacts are missing, identify the gap and route to the right artifact or specialist skill first.

```text
opportunity exploration
-> discovery / competitive analysis
-> PRD baseline
-> product design / prototype / interaction design
-> PRD calibration / requirement freeze
-> OpenAPI Draft
-> Engineering Baseline / YSS DDD Review
-> architecture / OpenSpec / Comet design
-> Design Review
-> OpenAPI Freeze
-> vertical slices
-> YSS frontend/backend implementation
-> independent review / fresh verification
-> release / implementation
-> retrospective
```

## Opportunity Exploration vs Comet Brainstorming

Opportunity exploration belongs to this lifecycle skill. It answers product-level questions before PRD: who the user is, what pain exists, why now, what MVP includes, what it excludes, and how success will be measured.

Comet brainstorming belongs to the formal change workflow. It starts after the change is ready for OpenSpec / Comet and focuses on solution design: technical options, tradeoffs, risks, architecture, test seams, contract impact, and implementation strategy.

Do not duplicate the same brainstorming work in both places. If Discovery / PRD already captures the product opportunity clearly, Comet brainstorming should reuse those artifacts and focus on technical design and risk reduction instead of repeating market, competitor, or user exploration.

## Workflow

1. Inspect existing context before asking questions:
   - `CONTEXT.md`
   - `docs/discovery/` and `docs/discovery/reports/`
   - `docs/requirements/`
   - `docs/design/`
   - `docs/api/specs/`
   - `docs/architecture/` and `docs/adr/`
   - `openspec/changes/` and current OpenSpec/Comet state
2. Classify the request into one stage:
   - opportunity exploration, requirement definition, product design / prototype / interaction design, API contract draft/freeze, engineering baseline, contract/design, change planning, implementation routing, review/verification, release, or retrospective.
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
| Start a new business product/module | opportunity exploration -> discovery / competitive analysis -> PRD baseline -> product design/prototype when UI exists -> PRD calibration |
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

- Do not skip opportunity exploration for new product/module work; create competitive analysis when market/competitor facts are needed, or record why it is not needed.
- Do not start implementation before PRD is calibrated, product design / prototype / interaction design exists when UI exists, OpenAPI Freeze decision, engineering baseline, design review, and vertical slice are clear.
- Do not route directly to frontend/backend skills before `yss-router` when the task crosses multiple YSS areas.
- Do not modify specialist skill behavior from this skill.
- Do not generate production code from this skill; hand off to the selected specialist skill.
- Treat TDD as the default for business behavior implementation; generated code, configuration, or throwaway prototypes may use a documented exception with a verification command.
- Require independent review and fresh verification evidence before calling work complete.
- Flag security red lines from `AGENTS.md` as human-review items.
