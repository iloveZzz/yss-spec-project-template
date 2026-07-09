---
name: yss-product-lifecycle
description: "Use when starting or continuing a YSS product/module/project through opportunity exploration, discovery, business/functional/system/data architecture artifacts, PRD baseline, product design/prototype/interaction design, PRD calibration, OpenAPI Draft/Freeze, engineering baseline, architecture, design review, vertical slices, YSS frontend/backend delivery, review, release, implementation, or retrospective; or when deciding missing artifacts, lifecycle stage, next prompt, or Matt/YSS skill routing."
---

# YSS Product Lifecycle

Use this skill as the project-level entrypoint for product-to-engineering flow. It routes work across lifecycle artifacts and specialist skills; it does not replace Matt Pocock Engineering Skills, `yss-router`, `yss-ui`, `yss-domain`, or other specialist skills.

## Core Rule

Determine the current lifecycle stage before proposing work. If implementation is requested but upstream artifacts are missing, identify the gap and route to the right artifact or specialist skill first.

For a small requirement change or iteration on an existing feature, do not restart the full lifecycle. First assess the impact radius, identify the nearest trustworthy stage already covered by current artifacts, then extend only the affected stage and required downstream gates. Re-enter earlier stages only when the change invalidates their assumptions.

## Documentation Language

For this repository, persistent lifecycle artifacts MUST use Chinese body text by default, because the primary users and reviewers are Chinese readers. This includes discovery notes, PRD, product design, architecture, OpenAPI review/freeze notes, vertical slice issues, Matt skill outputs, review reports, release notes, implementation records, retrospectives, and Git checkpoint explanations.

Keep English identifiers unchanged when they are technical names: file paths, commands, class/method names, API paths, schema names, enum values, error codes, frontmatter keys, YAML/JSON keys, and metadata identifiers. If an upstream skill template uses English section titles, convert the persisted project document to Chinese section titles unless the user explicitly asks for English or the document targets an English-speaking audience.

Daily execution uses 8 main stages. The previous 21 stage names are governance gates / responsibility points, not a mandatory step-by-step flow for every request. The authoritative mapping of stages, artifacts, templates, and required / conditional gates is `docs/process/lifecycle-artifact-map.md`.

```text
intake / lifecycle triage
-> opportunity and Discovery
-> business / PRD / functional architecture
-> product design and requirement freeze
-> system / data architecture, engineering contract, and Design Review
-> contract freeze and Issue formalization
-> vertical slices and TDD implementation
-> verification, release, and retrospective
```

## Matt Skills Coordination

Use this lifecycle skill to decide the stage and route to the right workflow. Do not use it as a substitute for specialist skills.

| Layer | Owner | Responsibility | Canonical artifacts |
|---|---|---|---|
| Product / requirements | `competitive-intelligence`, `research`, `grill-with-docs`, `prototype`, `to-prd` | Clarify market / competitor / technical facts, users, pain, boundaries, acceptance criteria, PRD scope, and runnable answers to hard design questions | `CONTEXT.md`, `docs/adr/`, `docs/discovery/`, `docs/research/`, `docs/requirements/<feature>-prd.md` |
| Contract | OpenAPI / YSS API skills, OpenSpec-style Spec Delta | Define and freeze frontend/backend API contracts, plus behavior deltas for medium/high-risk changes | `docs/api/specs/*.yaml`, `docs/specs/<feature>-spec-delta.md`, OpenAPI Draft Review / Freeze records |
| Delivery planning | `to-issues`, `handoff` / equivalent handoff record, Issue tracker | Split PRD / frozen contract into end-to-end vertical slices and preserve context across threads or implementation repos | GitLab / GitHub Issues or `docs/requirements/issues/*`, `docs/implementation/*` |
| Implementation | `implement`, `tdd`, `diagnosing-bugs`, `resolving-merge-conflicts`, `code-review` | Build with feedback loops, bug diagnosis, conflict resolution, independent review, and fresh verification | tests, review reports, verification records, implementation notes |
| YSS engineering | `yss-router` and selected YSS skills | Apply YSS DDD, UI, DTO, Repository, Controller, OpenAPI, and component rules | implementation routing record, Build Architecture Checklist, code/test evidence |

Rules:

- Prefer Matt skills for generic engineering workflow: `research`, `grill-with-docs`, `prototype`, `to-prd`, `to-issues`, `implement`, `tdd`, `diagnosing-bugs`, `resolving-merge-conflicts`, `code-review`, `domain-modeling`, `codebase-design`, and `improve-codebase-architecture`.
- Use `competitive-intelligence` when market, competitor, pricing, positioning, or customer sentiment facts are needed before Discovery / PRD decisions.
- Use `research` when technical facts, standards, third-party API behavior, framework behavior, or official documentation need primary-source evidence before PRD, OpenAPI, architecture, or acceptance decisions.
- Use `prototype` only for throwaway runnable feedback on logic, state-machine, or UI direction questions. Feed the conclusion back into PRD, design, ADR, or issues; do not treat prototype code as production implementation or as the required Ant Design v6 high-fidelity HTML prototype.
- Preserve OpenAPI 3.1 Draft / Freeze as the API contract gate. Draft is review-only until Freeze.
- Use OpenSpec-style Spec Delta for API, permission, state-machine, data-model, cross-client, new-module, or high-risk behavior changes. It is a lightweight behavior-delta artifact, not OpenSpec CLI, change-state files, or an extra state machine.
- After OpenAPI Freeze, route to `to-issues` or an equivalent vertical-slice issue record; do not require extra state-machine artifacts.
- Before frontend/backend implementation, first decide whether the impacted frontend/backend runtime projects already exist and can be reused. If an impacted side has no reusable project yet, route to `yss-ddd-scaffold-generator` or `yss-frontend-scaffold-generator` before business implementation.
- Use `yss-router` before frontend/backend implementation when the task crosses multiple YSS areas. The route output becomes implementation guidance inside the current slice.
- Use `handoff` or an equivalent handoff record when crossing threads, implementation repositories, prototype branches, or context-window limits.
- Use `resolving-merge-conflicts` or an equivalent conflict-resolution flow for merge / rebase conflicts before release or merge decisions.
- Use `code-review` or an independent review agent before merge/release decisions.
- Require fresh verification evidence before claiming completion.

## Architecture Artifact Ladder

Architecture artifacts are produced progressively. Do not try to finish every architecture document on day one, but do not enter implementation when the artifact required by the current risk is missing.

| Artifact | Lifecycle timing | Primary question | Typical outputs | Diagram support |
|---|---|---|---|---|
| Business architecture | Opportunity exploration / Discovery / product definition | Who gets value, in which workflow, and where the product boundary sits | user journey, value stream, role/ecosystem model, capability map | journey map, swimlane, capability map |
| Product overview design / Functional architecture | PRD baseline / product design / PRD calibration | Which product capabilities, user flows, modules, pages, low-fidelity prototypes, APIs, and data impacts support the MVP boundary | product overview, module map, feature list, priority, dependencies, low-fidelity wireframe, state flow, open questions, PRD gaps | feature/module map, dependency graph, user flow, page map, low-fidelity wireframe |
| System overview design / System architecture | Engineering baseline / architecture review | How the product is built, deployed, integrated, operated, and safely evolved | C4/container view, service boundary, integration, deployment, NFR decisions, rollout/rollback decisions | system architecture, sequence, deployment, DFD |
| Data architecture | Detailed design before persistence and repository work | How domain data, metadata, versions, lineage, and queries are modeled and stored | conceptual/logical/physical model, meta-model, versioning strategy, lineage/query/index strategy | ER, class, lineage graph, DFD |

For data modeling, metadata management, ER design, versioning, or lineage-analysis products, data architecture is a core product design artifact. It must be explicit before persistence implementation and before OpenAPI Freeze when API schemas depend on the meta-model.

Use `excalidraw-diagram-generator` when diagrams will make boundaries, flows, data structures, or slice dependencies easier to review. Diagrams support the text artifacts; they do not replace PRD, OpenAPI, ADR, issues, or tests.

## Workflow

1. Inspect existing context before asking questions:
   - `CONTEXT.md`
   - `docs/discovery/` and `docs/discovery/reports/`
   - `docs/research/`
   - `docs/requirements/`
   - `docs/design/`
   - `docs/api/specs/`
   - `docs/architecture/` and `docs/adr/`
   - `docs/requirements/issues/` and current issue tracker state when available
2. Classify the request into one main stage:
   - intake / lifecycle triage, opportunity and Discovery, business / PRD / functional architecture, product design and requirement freeze, system / data architecture, engineering contract, and Design Review, contract freeze and Issue formalization, vertical slices and TDD implementation, or verification / release / retrospective.
3. For small changes or iterations, identify the nearest trustworthy existing stage and only expand from the earliest impacted artifact:
   - wording / style / local configuration -> direct minimal change, then verify;
   - UI behavior or page state -> product design / prototype review / PRD calibration as needed;
   - unclear state-machine, complex rules, or UI direction -> `prototype` for throwaway runnable feedback, then feed the conclusion into PRD/design/ADR/issue;
   - API request, response, error, permission, pagination, or concurrency -> system / data architecture, engineering contract, and Design Review with API impact analysis / contract draft / OpenAPI Draft Review / Freeze downstream gates;
   - service boundary, state machine, integration, NFR, rollout, or rollback -> system / data architecture, engineering contract, and Design Review downstream gates;
   - persistence, metadata, versioning, lineage, query, or index -> system / data architecture, engineering contract, and Design Review downstream gates.
4. Check whether required upstream artifacts exist.
   - Before PRD calibration, product design, API impact analysis, OpenAPI Draft, requirement freeze, or formal vertical slicing, verify PRD baseline and product overview design / functional architecture exist. If the task does not enter the PRD lifecycle, record the not-applicable reason in the impact assessment.
   - For UI work, before PRD calibration, API impact analysis, OpenAPI Draft, or requirement freeze, verify low-fidelity `prototype-review` is approved, `docs/design/prototypes/<feature>/index.html` exists as an Ant Design v6 high-fidelity HTML prototype, AntD v6 CLI validation evidence is recorded, and user confirmation is recorded after the prototype is produced. This prototype is a required lifecycle artifact and may be generated automatically by the system / Agent after low-fidelity prototype review; it does not have to be manually supplied by the user.
   - Before formal vertical slicing, verify PRD, product overview design / functional architecture, OpenAPI Freeze or no-API-impact record, architecture review as needed, and a clear issue destination.
   - For medium/high-risk API, permission, state-machine, data-model, cross-client, new-module, or safety-sensitive changes, verify an OpenSpec-style Spec Delta exists or record why it is not needed.
   - When technical, standard, framework, or third-party API facts influence downstream decisions, verify `research` or an equivalent primary-source record exists and is cited.
   - Before frontend/backend implementation, verify vertical slice scope, implementation repo/location, whether the impacted frontend/backend runtime projects already exist and are reusable, YSS skill routing, Build Architecture Checklist, test command, and review strategy.
   - Before crossing threads, implementation repos, prototype branches, or long contexts, verify `handoff` or an equivalent handoff record captures source artifacts, current stage, open questions, verification commands, and next owner.
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

Lifecycle artifacts are part of the product record, not scratch notes. Do not let PRD, design, OpenAPI, architecture, review, issue, or retrospective outputs remain only in the local worktree across multiple stages.

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
| Start a new business product/module | intake -> opportunity and Discovery -> `competitive-intelligence` when market / competitor facts are needed -> `grill-with-docs` -> `to-prd` -> product overview design / functional architecture -> product design and requirement freeze when UI exists |
| Analyze competitors, substitute workflows, pricing, positioning, or market facts | `competitive-intelligence`; then feed stable findings into `grill-with-docs` and `to-prd` |
| Research technical facts, standards, framework behavior, or third-party APIs | `research`; feed cited findings into PRD, OpenAPI, architecture, ADR, or acceptance criteria |
| Answer a design question that needs runnable feedback | `prototype`; feed the conclusion into PRD, design, ADR, or issue, then delete or absorb throwaway code |
| Design UI flow after PRD baseline | Verify product overview design / functional architecture first, then use `product-design:index` as the primary Product Design router; follow its focused routing such as `$get-context`, `$ideate`, `$prototype`, `$image-to-code`, or `$url-to-code` |
| Review low-fidelity prototype before high-fidelity design | `prototype-review` |
| Build high-fidelity interactive HTML prototype | Use `product-design:index` as the primary entrypoint and route to the appropriate Product Design focused workflow for prototype/code output; query AntD v6 design/component/demo/token/semantic facts with `antd` CLI before output; the required stage output must be Ant Design v6 HTML at `docs/design/prototypes/<feature>/index.html`, may be system / Agent generated, must record AntD CLI validation evidence, and must be confirmed by the user before downstream gates |
| Review contract draft / OpenAPI Draft inside architecture/design review | `yss-openapi-draft-review` |
| Record behavior deltas for medium/high-risk changes | OpenSpec-style Spec Delta at `docs/specs/<feature>-spec-delta.md` using `docs/templates/spec-delta-template.md` |
| Clarify architecture artifact timing or gaps | this skill plus `docs/process/lifecycle-artifact-map.md` and `references/artifact-checklist.md` |
| Create architecture/process/data diagrams | `excalidraw-diagram-generator` as a support skill |
| Design meta-model / metadata / lineage data architecture | architecture/design workflow plus `yss-domain-modeling` or `yss-domain`; use `excalidraw-diagram-generator` for ER, lineage, DFD, or class diagrams when helpful |
| Split delivery scope after PRD / OpenAPI Freeze | `to-issues`; record whether impacted frontend/backend projects already exist, and whether scaffold initialization is needed |
| Cross threads, repos, prototype branches, or long contexts | `handoff` or equivalent handoff record; preserve source artifacts, current stage, open questions, verification commands, and next owner |
| Implement a slice | first check impacted frontend/backend project existence; route missing backend to `yss-ddd-scaffold-generator`, missing frontend to `yss-frontend-scaffold-generator`, then use `implement` plus `tdd`; use `yss-router` first when multiple YSS areas are touched |
| Fix a bug or test failure | `diagnosing-bugs` then `tdd` |
| Resolve merge or rebase conflicts | `resolving-merge-conflicts`; record both intents, resolution trade-offs, and fresh verification |
| Review implementation | `code-review` plus YSS-specific review inputs |
| Build Vue page | `yss-ui` plus related frontend skills chosen by `yss-router` |
| Build backend module from scratch | `yss-ddd-scaffold-generator` |
| Model backend domain | `yss-domain` / `yss-backend-scaffold-domain` |
| Implement Application use case / transaction boundary | `yss-backend-scaffold-application` |
| Implement persistence | `yss-repository` plus `yss-mybatis` when data architecture and domain metadata are stable |
| Implement Web adapter | `yss-web-controller` |

## When Not To Use

- For a single YTable height/layout issue, use `yss-use-table-height` directly.
- For a single Repository / PO / Convertor / GatewayImpl task with stable domain metadata and data architecture, use `yss-repository` directly.
- For a request that only asks to run a specific Matt skill and already has the needed lifecycle artifacts, use that Matt skill directly.

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

- Do not skip opportunity exploration for new product/module work; use `competitive-intelligence` when market/competitor facts are needed, or record why it is not needed.
- Do not make technical, standards, framework, or third-party API claims that affect PRD, OpenAPI, architecture, acceptance, or release decisions without `research` or equivalent primary-source evidence.
- Do not treat Discovery outputs as frozen downstream design. Discovery can provide product capability guidance and downstream impact signals, but PRD, functional architecture, OpenAPI, system architecture, and data architecture still require their own gates.
- Do not treat throwaway `prototype` code as production code, as an implementation shortcut, or as the required Ant Design v6 high-fidelity HTML prototype. Keep the conclusion, delete or absorb the code.
- Do not start implementation before PRD is calibrated, product overview design / functional architecture exists, required architecture artifacts are explicit, product design / prototype / interaction design exists, low-fidelity `prototype-review` passes, high-fidelity Ant Design v6 HTML prototype exists when UI exists, OpenAPI Freeze decision, engineering baseline, design review, and vertical slice are clear.
- Do not start implementation before deciding whether the impacted frontend/backend runtime projects already exist and can be reused. Missing or conflicting runtime projects must route back to implementation routing and scaffold initialization first.
- Do not skip business architecture for new products unless the product boundary, users, ecosystem, and value stream are already captured elsewhere.
- Do not skip product overview design / functional architecture after PRD baseline. It is a required artifact before PRD calibration, product design / prototype / interaction design, API impact analysis, OpenAPI Draft, requirement freeze, or implementation. Only tasks that do not enter the PRD lifecycle may record a not-applicable reason in the impact assessment.
- Do not skip system architecture when services, deployment, integrations, performance, security, reliability, or operations are affected.
- Do not skip data architecture before persistence / repository work. For data modeling, metadata, versioning, or lineage products, treat it as mandatory before Design Review and OpenAPI Freeze.
- Do not let Excalidraw diagrams invent requirements or architecture decisions; diagrams must point back to source artifacts and any findings must be written back to PRD, OpenAPI, ADR, or issues.
- Do not treat an OpenAPI Draft as an implementation or generated-client contract before OpenAPI Freeze. It is review-only until engineering baseline, system/data architecture, Design Review, and Freeze have approved it.
- Do not treat OpenSpec-style Spec Delta as a replacement for PRD, OpenAPI, Design Review, or vertical slice Issues. It only captures behavior differences, acceptance scenarios, and test / verification mapping.
- Do not require Spec Delta for small wording, local style, configuration, or low-risk bug fixes unless the change expands into API, permission, state-machine, data-model, cross-client, or security impacts.
- Do not move an OpenAPI Draft into Engineering Baseline / YSS DDD Review until `yss-openapi-draft-review` or an equivalent persistent review verifies P0 feature coverage, page action to endpoint mapping, YSS response wrappers, error structures, permissions, concurrency, security red lines, and contract test seams.
- Do not route directly to frontend/backend skills before `yss-router` when the task crosses multiple YSS areas.
- Do not cross threads, implementation repos, prototype branches, or context-window limits without `handoff` or an equivalent handoff record when downstream agents need continuity.
- Do not generate production code from this skill; hand off to the selected specialist skill.
- Do not complete merge/rebase conflict work without documenting resolution intent and rerunning relevant checks.
- Treat TDD as the default for business behavior implementation; generated code, configuration, or throwaway prototypes may use a documented exception with a verification command.
- Require independent review and fresh verification evidence before calling work complete.
- Flag security red lines from `AGENTS.md` as human-review items.
