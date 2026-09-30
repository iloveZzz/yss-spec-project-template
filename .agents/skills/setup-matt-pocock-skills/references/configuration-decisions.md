# 工程技能配置决定

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip Section B entirely when `triage` isn't installed.

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it — they need to know whether to call `gh issue create`, write a markdown file under `docs/.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Path resolution is configuration-first: every Local-aware skill must read the
persisted `tracker.root` from `.template-spec/agents/issue-tracker.md` before resolving an
artifact path. If the field is absent, use `docs/.scratch` as the default. Do
not infer a tracker or replace the configured root from `git remote`; the legacy
`.scratch/` and `docs/requirements/tickets/` roots are read-only migration
sources.

The supported tracker choices in this template are exactly `local-markdown`, `github`, and `gitlab`. A `git remote` may be displayed as code-host context only; it must not choose or rank a tracker. Ask for one explicit project choice, with Local Markdown as the template default:

- **Local markdown (recommended)** — issues live as files under `docs/.scratch/<feature>/` in this repo.
- **GitHub** — use GitHub Issues and the `gh` CLI only when the user explicitly selects GitHub.
- **GitLab** — use GitLab Issues and the [`glab`](https://gitlab.com/gitlab-org/cli) CLI only when the user explicitly selects GitLab.

Do not offer an `Other` tracker or write an unsupported platform into the project configuration; extending the YSS tracker contract must happen before adding another platform.

Record the choice in `.template-spec/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off** — leave it off and don't raise it; a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you) — an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no — usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`) — collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C — Business vocabulary and decisions.** The layout does not branch: every YSS Git repository has exactly one case-sensitive `CONTEXT.md` at its root. Multiple business responsibility areas share that glossary and are distinguished by each business term's `适用业务责任区` and stable `<ContextId>/<EnglishIdentifier>` reference. ADRs live under root `docs/adr/` and are created lazily when the first qualifying decision is accepted.

If the root `CONTEXT.md` is missing, initialize it with `context_schema_version: 1`, the process-term table (`术语 | 含义 | 英文标识 | 避免 / 备注`) and the business-term table (`术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注`). Do not invent business terms during setup. If a lowercase, nested, duplicate, or mapped context layout exists, stop and report `migration-required`; do not preserve or extend it as a second supported layout.
