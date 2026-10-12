---
name: prototype-review
description: Use when independently reviewing low-fidelity UI, interaction specs, or state matrices before choosing an H1/H2 prototype profile, calibrating Spec/OpenAPI, slicing, or implementation.
---

# Prototype Review

Use this skill as the independent low-fidelity review in `yss-prototype-stage`. The review is fail-closed: if the design cannot drive calibrated requirements and the active profile's downstream acceptance, send it back to product design. Only the current Harness lifecycle orchestrator records the resulting `check.prototype-reviewed` decision.

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## Trigger Boundary

Run this independent gate only when UI changes affect a primary user flow, navigation, permissions, exception/recovery states, state transitions, or OpenAPI implications. For copy edits, token/color/spacing adjustments, and isolated visual fixes with no behavior, state, permission, navigation, or API impact, record `not-applicable` with the impact assessment; do not create prototype-review artifacts.

## Required Inputs

- Spec baseline or confirmed user stories.
- `.work/<feature>/design/<feature>-interaction-spec.md` or prototype link.
- State matrix, preferably based on `.template-spec/design/templates/state-matrix-template.md`.
- Existing OpenAPI Draft only if the review is checking alignment; do not require OpenAPI before product design.
- `.work/<feature>/verification/prototype-evidence.yaml` may be created as a pending Prototype Evidence schema v4 record, but档位构建、Visual Baseline schema v1 与浏览器验证属于后续 `check.prototype-verified`。

## Review Gates

| Gate | Pass condition |
|---|---|
| Page coverage | All primary pages, entry points, and navigation exits are named |
| Flow coverage | Main path, cancel/back, failure, retry, and completion paths are explicit |
| State coverage | loading, empty, error, readonly, disabled, no-permission, conflict, and dirty-form states are addressed or explicitly not applicable |
| State transition coverage | 每个状态列出进入事件、允许转换、guard、动作和退出路径；不存在只能进入不能退出的状态 |
| Permission coverage | Hidden vs disabled vs rejected actions are clear |
| Content hierarchy | 必需内容有任务优先级、长度/空值变化与区域；动作有可见结果，来源与 actionKey 引用现有合同 |
| Conditional comparison | 仅命中不确定性时比较；交互候选有实质差异且同输入/保真，标准先于选择，保留选择代价与用户决定引用 |
| Data coverage | Visible fields, filters, sort, pagination, forms, tables, drawers, modals, and audit/version data are listed |
| API implication | Request/response fields, error structure, pagination/filtering, permissions, and concurrency implications can be drafted |
| Action contract coverage | Every primary page action has an `actionKey`, endpoint or explicit non-goal, permission behavior, state transition, idempotency/concurrency rule, and error codes |
| P0 contract coverage | Every P0 requirement with manage/maintain/configure/create/update/archive/retry/cancel/publish/export/create-draft semantics is mapped to an API implication or an explicit non-goal |
| Rule/source coverage | Validation, approval, coverage, and publish gates state where rules come from, who can configure them, whether they are fixed, and how blocker/warning decisions are represented |
| Frontend acceptance | A frontend engineer can tell which components, visible states, data dependencies, and E2E paths are needed |

## Decision Rules

- If a feature has UI impact and lacks page map, user flow, prototype/wireframe, or state matrix, block prototype profile selection, Spec calibration, and OpenAPI Draft.
- If the prototype hides business rules behind generic text such as "校验失败", require field-level errors and recovery behavior.
- If a page shows a user action but the OpenAPI implication list lacks endpoint/non-goal mapping, block prototype profile selection, Spec calibration, or OpenAPI Draft.
- If Spec P0 scope says a user can manage or configure an object but the design only shows read-only data, block until the write path or scope downgrade is explicit.
- 对比方案仅换色、隐藏关键状态或增加未批准业务规则时，指出受影响的具体决策；审美偏好与未来建议进入 Non-Blocking Suggestions，不替代行为缺陷判断。
- If a state is intentionally out of scope, record why and who owns the decision.
- If downstream dependencies are unclear, return them to the current lifecycle orchestrator only after the prototype passes this review; the strategic profile records handoff questions, while the full-lifecycle profile may route to implementation-contract compilation.

## Output Contract

```markdown
### Review Result
<Approved / Blocked>

### Blocking Findings
- <missing asset or decision>

### Non-Blocking Suggestions
- <improvement that can wait>

### OpenAPI Draft Readiness
- <paths, fields, errors, permissions, pagination/YSS wrappers, action mappings, rule sources, concurrency notes>

### Spec Calibration Readiness
- <requirements gaps, acceptance criteria updates, non-goals, pending decisions>

### Frontend Prototype Readiness
- <component states, data dependencies, profile triggers, frontend acceptance notes>

### Lifecycle Evidence
- <persistent review path; blockers; `check.prototype-reviewed` candidate result>

### Next Action
- <yss-prototype-stage / return to product design>
```

Use `.template-spec/design/templates/prototype-review-checklist.md` when writing a persistent review artifact.

评审恢复路径时区分“保留草稿”“重新加载”“合并”，按既有状态矩阵核对最终字段和再次提交结果。候选初始化确认只证明声明的初始输入，不能替代实际操作；发现仅出现按钮但结果未核验时记为证据缺口。

涉及组件组合、分页/选择、字段错误或浮层时，按需读取 [组件检查与六轴 QA](references/component-qa.md)，并入现有评审，不另建门禁。

涉及企业多页工作区时，按原型技能 `references/enterprise-workspace.md` 核对导航退出、dirty 页签关闭、跨页保留与场景重置的区别，并检查隐藏页浮层清理和窄屏可达性；工程证据、视觉观察及偏好建议分别记录。

涉及搜索选择或日期范围时，按 [组件检查](references/component-qa.md) 核对搜索词/已选值、半完成范围、取消保值与隐藏浮层焦点；研究问题按可观察任务交接，不把模拟结果记成用户证据。
