---
name: yss-product-lifecycle
description: "Use when starting or continuing a YSS product/module/project through opportunity exploration, discovery, business/functional/system/data architecture artifacts, PRD baseline, product design/prototype/interaction design, PRD calibration, OpenAPI Draft/Freeze, engineering baseline, architecture, design review, OpenSpec/Comet, vertical slices, YSS frontend/backend delivery, review, release, implementation, or retrospective; or when deciding missing artifacts, lifecycle stage, next prompt, or YSS/OpenSpec/Comet skill routing."
---

# YSS Product Lifecycle

Use this skill as the project-level entrypoint for product-to-engineering flow. It routes work across lifecycle artifacts and specialist skills; it does not replace `comet`, `openspec-*`, `yss-router`, `yss-ui`, `yss-domain`, or other specialist skills.

## Core Rule

Determine the current lifecycle stage before proposing work. If implementation is requested but upstream artifacts are missing, identify the gap and route to the right artifact or specialist skill first.

For a small requirement change or iteration on an existing feature, do not restart the full lifecycle. First assess the impact radius, identify the nearest trustworthy stage already covered by current artifacts, then extend only the affected stage and required downstream gates. Re-enter earlier stages only when the change invalidates their assumptions.

## Documentation Language

For this repository, persistent lifecycle artifacts MUST use Chinese body text by default, because the primary users and reviewers are Chinese readers. This includes discovery notes, PRD, product design, architecture, OpenAPI review/freeze notes, OpenSpec / Comet handoff notes, vertical slice issues, Superpowers specs/plans, review reports, release notes, implementation records, retrospectives, and Git checkpoint explanations.

Keep English identifiers unchanged when they are technical names: file paths, commands, class/method names, API paths, schema names, enum values, error codes, frontmatter keys, YAML/JSON keys, OpenSpec capability names, and Comet state values. If an upstream skill template uses English section titles, convert the persisted project document to Chinese section titles unless the user explicitly asks for English or the document targets an English-speaking audience.

Daily execution uses 8 main stages. The previous 21 stage names are governance gates / responsibility points, not a mandatory step-by-step flow for every request. The authoritative mapping of stages, artifacts, templates, and required / conditional gates is `docs/process/lifecycle-artifact-map.md`.

```text
intake / lifecycle triage
-> opportunity and Discovery
-> business / PRD / functional architecture
-> product design and requirement freeze
-> system / data architecture, engineering contract, and Design Review
-> contract freeze and OpenSpec / Comet
-> vertical slices and TDD implementation
-> verification, release, and retrospective
```

## Opportunity Exploration vs Comet Brainstorming

Opportunity exploration belongs to this lifecycle skill. It answers product-level questions before PRD: who the user is, what pain exists, why now, what MVP includes, what it excludes, how success will be measured, which product capabilities look promising, and which downstream UI / API / data / architecture impacts are likely.

Discovery may produce competitive analysis, a competitive matrix, an opportunity statement, MVP scope, non-goals, product capability guidance, and a downstream impact list. These are upstream inputs for PRD, functional architecture, product design, API, and architecture work. They do not freeze the PRD, final functional architecture, OpenAPI contract, data architecture, or technical system design.

Comet brainstorming belongs to the formal change workflow. It starts after the change is ready for OpenSpec / Comet and focuses on solution design: technical options, tradeoffs, risks, architecture, test seams, contract impact, and implementation strategy.

Do not duplicate the same brainstorming work in both places. If Discovery / PRD already captures the product opportunity clearly, Comet brainstorming should reuse those artifacts and focus on technical design and risk reduction instead of repeating market, competitor, or user exploration.

## OpenSpec / Comet / Superpowers Coordination

Use this lifecycle skill to decide the stage and route to the right workflow. Do not use it as a substitute for the formal OpenSpec / Comet / Superpowers flow.

| Layer | Owner | Responsibility | Canonical artifacts |
|---|---|---|---|
| OpenSpec | `openspec-*` through Comet | WHAT: formal change scope, capability requirements, acceptance scenarios, task boundary, archive lifecycle | `openspec/changes/<change>/proposal.md`, `specs/**/spec.md`, `design.md`, `tasks.md` |
| Comet | `comet` and phase skills | ORCHESTRATION: active change discovery, phase state, phase guards, OpenSpec-to-Superpowers handoff, user decision points, verify/archive | `openspec/changes/<change>/.comet.yaml`, `.comet/handoff/*` |
| Superpowers | invoked by Comet or explicit non-Comet tasks | HOW: brainstorming, implementation planning, TDD execution, debugging, review, verification discipline | `docs/superpowers/specs/*`, `docs/superpowers/plans/*`, review / verification evidence |

Rules:

- Prefer `comet` for formal change work. Raw `openspec-new-change`, `openspec-propose`, or `openspec-continue-change` are fallback tools or explicit user-requested tools; if they are used for a Comet-managed project, verify or create `.comet.yaml` before continuing.
- For an active change, report both the lifecycle stage and Comet phase. If `.comet.yaml` says `phase: open`, `design`, `build`, `verify`, or `archive`, route through `comet` / the matching Comet phase skill instead of manually jumping to downstream YSS implementation.
- Do not manually invoke Superpowers `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, or `requesting-code-review` for a formal change when Comet should invoke them. Comet owns the handoff context, phase guards, and decision points.
- `to-issues` produces vertical slice Issues, not Comet build execution. After Issues are approved, implementation still continues through the active Comet change: design if needed, build planning, TDD execution, verify, and archive.
- `yss-router` selects the minimal YSS implementation skills for a slice. It does not replace Comet; use its output as implementation guidance inside the Comet build handoff or for clearly non-Comet local work.

## Architecture Artifact Ladder

Architecture artifacts are produced progressively. Do not try to finish every architecture document on day one, but do not enter implementation when the artifact required by the current risk is missing.

| Artifact | Lifecycle timing | Primary question | Typical outputs | Diagram support |
|---|---|---|---|---|
| Business architecture | Opportunity exploration / Discovery / product definition | Who gets value, in which workflow, and where the product boundary sits | user journey, value stream, role/ecosystem model, capability map | journey map, swimlane, capability map |
| Product overview design / Functional architecture | PRD baseline / product design / PRD calibration | Which product capabilities, user flows, modules, pages, APIs, and data impacts support the MVP boundary | product overview, module map, feature list, priority, dependencies, state flow, open questions, PRD gaps | feature/module map, dependency graph, user flow, page map |
| System overview design / System architecture | Engineering baseline / Architecture / OpenSpec / Comet design | How the product is built, deployed, integrated, operated, and safely evolved | C4/container view, service boundary, integration, deployment, NFR decisions, rollout/rollback decisions | system architecture, sequence, deployment, DFD |
| Data architecture | Detailed design before persistence and repository work | How domain data, metadata, versions, lineage, and queries are modeled and stored | conceptual/logical/physical model, meta-model, versioning strategy, lineage/query/index strategy | ER, class, lineage graph, DFD |

For data modeling, metadata management, ER design, versioning, or lineage-analysis products, data architecture is a core product design artifact. It must be explicit before persistence implementation and before OpenAPI Freeze when API schemas depend on the meta-model.

Use `excalidraw-diagram-generator` when diagrams will make boundaries, flows, data structures, or slice dependencies easier to review. Diagrams support the text artifacts; they do not replace PRD, OpenAPI, ADR, OpenSpec/Comet design, or tests.

## Workflow

1. Inspect existing context before asking questions:
   - `CONTEXT.md`
   - `docs/discovery/` and `docs/discovery/reports/`
   - `docs/requirements/`
   - `docs/design/`
   - `docs/api/specs/`
   - `docs/architecture/` and `docs/adr/`
   - `openspec/changes/` and current OpenSpec/Comet state
2. Classify the request into one main stage:
   - intake / lifecycle triage, opportunity and Discovery, business / PRD / functional architecture, product design and requirement freeze, system / data architecture, engineering contract, and Design Review, contract freeze and OpenSpec / Comet, vertical slices and TDD implementation, or verification / release / retrospective.
3. For small changes or iterations, identify the nearest trustworthy existing stage and only expand from the earliest impacted artifact:
   - wording / style / local configuration -> tweak or direct minimal change, then verify;
   - UI behavior or page state -> product design / prototype review / PRD calibration as needed;
   - API request, response, error, permission, pagination, or concurrency -> system / data architecture, engineering contract, and Design Review with API impact analysis / contract draft / OpenAPI Draft Review / Freeze downstream gates;
   - service boundary, state machine, integration, NFR, rollout, or rollback -> system / data architecture, engineering contract, and Design Review downstream gates;
   - persistence, metadata, versioning, lineage, query, or index -> system / data architecture, engineering contract, and Design Review downstream gates.
4. Check whether required upstream artifacts exist.
   - Before formal `vertical slices / to-issues`, verify the OpenSpec / Comet change gate:
     - run `openspec list --json` when available;
     - identify the matching active change;
     - verify `openspec/changes/<change>/proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml` exist.
   - If no matching active change exists, or any required OpenSpec / Comet artifact is missing, do not enter formal `to-issues`; route first to `comet` or `openspec-new-change`.
   - Before frontend/backend implementation, inspect `.comet.yaml` for the matching change. If the phase has not reached a build-ready state with required Superpowers design/plan artifacts, route to `comet` rather than directly to `yss-router` or implementation skills.
5. Output the next action:
   - artifact to create/update,
   - specialist skill to invoke,
   - suggested prompt,
   - acceptance checklist.
6. For every completed lifecycle stage, perform a Git checkpoint decision:
   - identify the exact artifacts created or changed in that stage,
   - separate product/process artifacts from unrelated workspace changes,
   - propose or execute a scoped `git add` / `git commit` / `git push` when the user has already authorized committing,
   - record if a checkpoint is intentionally deferred and why.
7. Stop before writing business code. For implementation, route through `yss-router` and the selected specialist skills.

## Stage Git Checkpoints

Lifecycle artifacts are part of the product record, not scratch notes. Do not let PRD, design, OpenAPI, architecture, review, OpenSpec/Comet, issue, or retrospective outputs remain only in the local worktree across multiple stages.

At the end of each stage, report:

```markdown
### Git Checkpoint
- Changed artifacts: <files or directories>
- Excluded changes: <unrelated dirty files or "none">
- Commit status: <committed / pushed / deferred>
- Reason if deferred: <why>
```

When committing, prefer small checkpoint commits by artifact type or stage, for example:

- `docs: add data modeling discovery and prd artifacts`
- `docs: add data modeling openapi and architecture reviews`
- `docs: update lifecycle checkpoint rules`

Never stage broad dirty directories by default. Use explicit paths and keep generated environment folders, local tool caches, or unrelated user changes out of lifecycle commits unless the user explicitly asks to include them.

## Specialist Routing

Use these references as needed:

- Lifecycle stage decisions: `references/stage-routing.md`
- YSS skill selection: `references/yss-skill-routing.md`
- Artifact checklist: `references/artifact-checklist.md`

Default routing:

| Intent | Next skill / workflow |
|---|---|
| Start a new business product/module | intake -> opportunity and Discovery -> business / PRD / functional architecture -> product design and requirement freeze when UI exists |
| Design UI flow after PRD baseline | `product-design-prototype`; add `wireframe-prototype`, `component-story-prototype`, or `mock-api-prototype` only when needed |
| Review prototype before PRD calibration | `prototype-review` |
| Review contract draft / OpenAPI Draft inside architecture/design review | `yss-openapi-draft-review` |
| Clarify architecture artifact timing or gaps | this skill plus `docs/process/lifecycle-artifact-map.md` and `references/artifact-checklist.md` |
| Create architecture/process/data diagrams | `excalidraw-diagram-generator` as a support skill |
| Design meta-model / metadata / lineage data architecture | architecture/design workflow plus `yss-domain-modeling` or `yss-domain`; use `excalidraw-diagram-generator` for ER, lineage, DFD, or class diagrams when helpful |
| Formalize a change | Prefer `comet`; fallback to `openspec-new-change` / `openspec-propose` only when Comet is unavailable or explicitly requested, then verify `.comet.yaml` |
| Continue active change | `comet` first; fallback to `openspec-continue-change` only when Comet cannot manage the change |
| Choose YSS implementation skills | `yss-router`, but only after slice selection and active Comet phase inspection; use the result as Comet build guidance |
| Build Vue page | `yss-ui` plus related frontend skills chosen by `yss-router` |
| Build backend module from scratch | `yss-ddd-scaffold-generator` |
| Model backend domain | `yss-domain` / `yss-backend-scaffold-domain` |
| Implement persistence | `yss-repository` plus `yss-mybatis` when data architecture and domain metadata are stable |
| Implement Web adapter | `yss-web-controller` |

## When Not To Use

- For a single YTable height/layout issue, use `yss-use-table-height` directly.
- For a single Repository / PO / Convertor / GatewayImpl task with stable domain metadata and data architecture, use `yss-repository` directly.
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
- Do not treat Discovery outputs as frozen downstream design. Discovery can provide product capability guidance and downstream impact signals, but PRD, functional architecture, OpenAPI, system architecture, and data architecture still require their own gates.
- Do not start implementation before PRD is calibrated, required architecture artifacts are explicit, product design / prototype / interaction design exists and passes `prototype-review` when UI exists, OpenAPI Freeze decision, engineering baseline, design review, and vertical slice are clear.
- Do not skip business architecture for new products unless the product boundary, users, ecosystem, and value stream are already captured elsewhere.
- Do not skip functional architecture before PRD calibration when module boundaries, MVP priority, or cross-module dependencies are still unclear.
- Do not skip system architecture when services, deployment, integrations, performance, security, reliability, or operations are affected.
- Do not skip data architecture before persistence / repository work. For data modeling, metadata, versioning, or lineage products, treat it as mandatory before Design Review and OpenAPI Freeze.
- Do not let Excalidraw diagrams invent requirements or architecture decisions; diagrams must point back to source artifacts and any findings must be written back to PRD, OpenAPI, ADR, OpenSpec/Comet design, or issues.
- Do not treat an OpenAPI Draft as an implementation or generated-client contract before OpenAPI Freeze. It is review-only until engineering baseline, system/data architecture, Design Review, and Freeze have approved it.
- Do not move an OpenAPI Draft into Engineering Baseline / YSS DDD Review until `yss-openapi-draft-review` or an equivalent persistent review verifies P0 feature coverage, page action to endpoint mapping, YSS response wrappers, error structures, permissions, concurrency, security red lines, and contract test seams.
- Do not enter formal `vertical slices / to-issues` directly after OpenAPI Freeze unless a matching active OpenSpec / Comet change is selected and complete enough to anchor slices. Required files: `openspec/changes/<change>/proposal.md`, `design.md`, `tasks.md`, at least one `specs/**/spec.md`, and `.comet.yaml`. If `openspec list --json` shows no matching active change, or those files are missing, this is blocking; route to `comet` or `openspec-new-change` first.
- Do not bypass Comet with direct Superpowers or YSS implementation skills when a matching active Comet change exists. Continue the Comet phase first; Comet owns Superpowers handoff, user decision points, TDD mode, review mode, verification, and archive state.
- Do not advance multiple lifecycle stages while leaving their persistent artifacts uncommitted without explicitly calling out the missing Git checkpoint.
- Do not route directly to frontend/backend skills before `yss-router` when the task crosses multiple YSS areas.
- Do not modify specialist skill behavior from this skill.
- Do not generate production code from this skill; hand off to the selected specialist skill.
- Treat TDD as the default for business behavior implementation; generated code, configuration, or throwaway prototypes may use a documented exception with a verification command.
- Require independent review and fresh verification evidence before calling work complete.
- Flag security red lines from `AGENTS.md` as human-review items.
