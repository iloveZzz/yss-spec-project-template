---
name: llm-wiki
description: >
  Compile and maintain a Karpathy-pattern LLM wiki (raw + wiki + schema) with
  init, incremental refresh, global rebuild, and lint. Use when the user wants
  a local knowledge wiki, incremental wiki refresh, wiki rebuild, `/llm-wiki`,
  or an answer from an existing wiki.
---

# llm-wiki

Compile a persistent wiki from live documents and code. The wiki is the IR; live sources are the truth. Read [schema](references/schema.md), then the matching mode file.

One-off notes are out of scope. Use this skill to compile or lint a persistent wiki (`raw/` + `wiki/` + `.wiki-manifest.json`), or to answer from an existing wiki per [query.md](references/query.md).

## Mode

| User intent | Mode | Completion |
|---|---|---|
| 从零构建知识库 | `init` | 三层目录 + schema + index + log + 文章 + `.wiki-manifest.json`，lint 退出 0 |
| 源变了，更新受影响页 | `refresh` | 只改漂移命中的文章；human-owned 不改；lint 0；log 有 REFRESH |
| 全局按新源重编译 | `rebuild` | raw 对齐 live；稳定 ID 与 human-owned 保留；LLM 页全量重写；lint 0；log 有 REBUILD |
| 健康检查 | `lint` | 脚本报告 + 对变更页做 live 源抽查 |

Ambiguous → ask. Existing wiki + "构建" → ask refresh vs rebuild, do not init over it.

Query is not a mode. Follow [query.md](references/query.md).

## Layout

```
<wiki-root>/
  raw/                  # immutable copies + labelled extracts
  wiki/                 # articles + index.md + log.md + CLAUDE.md
  .wiki-manifest.json   # compile graph (sources ↔ articles)
```

Scripts live in this skill's `scripts/` directory (the folder that contains this `SKILL.md`). Run them from the repo root so `--wiki` / `--repo` resolve correctly:

```bash
node <skill-root>/scripts/inventory.mjs hash --wiki <wiki-root>
node <skill-root>/scripts/inventory.mjs drift --wiki <wiki-root>
node <skill-root>/scripts/lint-wikilinks.mjs <wiki-root>
node <skill-root>/scripts/extract.mjs skill-names --in <live-lock.json> --out <wiki-root>/<rawPath>
```

`<skill-root>` is the canonical skill directory or a projection that points at it. Do not hard-code `.agents/skills/llm-wiki`.

## Steps

1. Detect: `wiki/index.md` + `CLAUDE.md` (or `AGENTS.md`) means a wiki exists.
2. If the user is asking a repository question, load [query.md](references/query.md) and stop. Do not lint or append `log.md`.
3. Load the mode algorithm in [compile.md](references/compile.md). For init/rebuild corpus choice, load [discover.md](references/discover.md). For writing, load [writing.md](references/writing.md). For checks, load [lint.md](references/lint.md).
4. **Fact order:** called code > table comments / config defaults > stale raw copies. After writing, re-read live sources for a sample of claims (`N = min(5, changed pages)`).
5. Run lint. Append `log.md`. Stop.

`refresh` without a manifest: stop. Rebuild, or reconstruct the manifest from existing「来源」sections — do not guess `sourceIds`.
