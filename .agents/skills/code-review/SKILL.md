---
name: code-review
description: 审查分支、PR、固定候选或工作树改动，按仓库规范、Spec 及适用 UI 还原要求报告有证据的缺陷。
---

Review a pinned candidate: all applicable axes initially, then affected conclusions and dependencies:

- **Standards** — does the code conform to this repo's documented coding standards **and**, for YSS slices, the specialist check inputs compiled in [yss-review-standards.md](references/yss-review-standards.md)?
- **Spec** — does the code faithfully implement the originating issue / spec?
- **UI fidelity** (only when the change has UI impact) — does the candidate match the confirmed prototype and `yss-design-system` / `yss-ui`? Type-check or claiming "already aligned" is not a pass. Invoke those skills' verification notes; do not collapse this axis into Standards or Spec. YSS page-module conventions stay on Standards.

普通功能默认由一名与实现者独立的审查者完成 Standards、Spec 和适用的 UI fidelity 检查，分别报告结论。只有专业能力缺口、结论冲突、明确外部制度或用户指定时，才拆成多个审查者；多个无依赖审查可以并行。检查轴不等于会签人数，不能要求用户为每个轴重复确认。

角色表编译 `review_context` / `skill_source.review_skills`（只读）；见协作规则，不授予实现权限。

If `.template-spec/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`; do not invoke another user-invoked skill yourself.

## 文档写作

撰写审查报告时，按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md` 的共用写法及审查指引；保留各审查轴的 findings、严重性、定位、证据及原裁决，不因压缩表达合并或降级。作用域仅限当前产物，派发时传递条件及引用。

## Process

### 1. 固定候选

开始审查前按 [候选捕获合同](references/candidate-capture.md) 选择 committed/worktree 模式，固定比较基点、内容摘要和未跟踪文件。保持只读；候选变化使相关审查失效。

### 2. Identify the spec source

Look for the originating spec, in this order:

1. A spec/Ticket/contract reference supplied by the user or an upstream lifecycle review input.
2. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `.template-spec/agents/issue-tracker.md`.
3. A spec file under `docs/`, `specs/`, or `docs/.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Compile sources **before** review. For YSS implementation candidates follow [yss-review-standards.md](references/yss-review-standards.md): run machine checks that exist in the implementation repo; then collect repo docs (`CODING_STANDARDS.md` / `CONTRIBUTING.md` if present), every Slice `required_skills` skill file, the impact-conditioned specialist inputs (`alibaba-java-code-style`, `yss-ui`, `yss-domain`, …), and `.template-spec/templates/review-report-template.md`. Missing applicable coverage is `missing_evidence`, not a pass.

Resolve backend roots from the registered project and Slice scope; exclude frontend, vendor, unrelated submodules and unregistered roots. Assess both `yss-repository` and `yss-mybatis` for every backend candidate, including impact, selected Profile and current component source index per the standards reference. Without persistence impact, record concrete `not-applicable` reasons for both.

Repo coding documents remain sources alongside mandatory YSS / Alibaba inputs.

Standards 检查代码 diff 时读取 [Fowler smell baseline](references/smell-baseline.md)。仓库明确标准优先；smell 只作 judgement call，不升级为硬违规，机器已覆盖项不重复判断。

### 4. Complete each applicable review axis

默认由独立 Reviewer 完成下列两份检查提纲，按轴保留结论，不派发额外 subagent。需要多专业参与时，按角色表和协作协议派发对应提纲；只增加缺少的能力，不默认启动两个额外 Agent。下面的 sub-agent prompts 同样是单 Reviewer 的检查清单。

执行 Standards / Spec 轴时读取 [逐轴检查提纲](references/review-axis-checklists.md)；单 Reviewer 同样使用它。实际派发时传入相同候选、证据和完整 smell baseline；Spec 缺失按提纲明确报告。

首轮完整覆盖；修复后依差异、受影响结论 / 行为及依赖定向复验并绑定当前候选，未受影响项有依据地复用。摘要、UI 或 `new_impacts` 不触发全轴兜底，未知先调查。历史两轮同样适用；细则见 [finding 闭环](references/yss-review-standards.md)。

### 5. Aggregate

仅任务包携带 `review_round`、明确采用历史冻结候选协议时，读取 [两轮收敛合同](references/legacy-convergence.md)。普通审查不因此新增候选冻结或额外审查者。

#### 报告与阻断

按 `## Standards`、`## Spec` 分别呈现原报告或等义整理后的结论；UI 影响另列 `## UI fidelity`。专项表填写在 `.template-spec/templates/review-report-template.md` 的 Standards 证据中，不增加第四轴，也不合并或跨轴重排 findings。适用专项行空白、遗漏 `required_skills` 或 mandatory violation 未关闭时，结果为 `blocked`，不能写 `completed`。

#### 修复后复审

Reviewer 保持只读，将 `violation`、机器检查失败和适用行空白交回原合同路径的实施者。修复后比较差异、重新捕获候选，复审受影响结论与依赖，并明确重新绑定未受影响的证据；不在审查会话中写实现来关闭 finding。

#### 合同失效与延期

`drift`、`new_impacts` 或 `required_skills` 不匹配时，将合同标为 `stale` 并回到 实现合同编译器 调查受影响要求；停止使用旧合同实现，不默认全轴重审。`not-applicable` 只用于未触发影响。mandatory 门禁不能豁免；按原合同修复，或在原流程允许延期时提供完整 `seam-deferred` 记录。

For Worktree mode, recapture the candidate digest after all applicable checks finish. If it differs from `candidate_digest`, mark the affected reports as reviewing a **stale candidate** and return `blocked`; the caller may start a new review against a new capture, but this invocation must not aggregate findings from different bytes. Recheck the same digest again at the completion/checkpoint boundary.

State the reviewed `review_mode`, fixed point, candidate digest and coverage before the two reports. End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes — that's the reranking the separation exists to prevent.

## Why separate axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that implements the spec but diverges from the confirmed prototype or design system → **Spec pass, UI fidelity fail.**

Reporting them separately stops one axis from masking the other.
