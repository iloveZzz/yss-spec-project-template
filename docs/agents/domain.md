# Domain Docs

> 中文说明：本文规定 Agent 在做需求、Issue、架构或实现前如何读取领域上下文。领域词汇统一放在根目录 `CONTEXT.md`，架构决策放在 `docs/adr/`，避免每个任务重新解释业务概念。

Engineering skills should consume this repo's domain documentation before exploring code or drafting issues.

## Layout

This repo uses a single-context layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── docs/
```

## Before Exploring

Read these files when relevant:

- `CONTEXT.md` for domain vocabulary.
- `docs/adr/` for architectural decisions related to the area being touched.

If a file does not exist yet, proceed silently. The `domain-modeling` skill creates or updates domain docs lazily when real terms or decisions are resolved.

## Usage Rules

- Use glossary vocabulary in PRDs, issue titles, tests, architecture notes, and implementation summaries.
- Do not put implementation details in `CONTEXT.md`; it is a glossary, not a spec.
- If a proposal contradicts an ADR, call out the conflict explicitly before proceeding.
