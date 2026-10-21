---
name: llm-wiki
description: "Build or refresh a local LLM wiki; use for wiki init, ingest, rebuild, lint, or source-backed wiki questions."
disable-model-invocation: true
---

# llm-wiki

Compile a persistent wiki from live documents and code. The wiki is the IR; live sources are the truth. Read [schema](references/schema.md), then the matching mode file.

One-off notes are out of scope. Use this skill to compile or lint a persistent wiki (`raw/` + `wiki/` + `.wiki-manifest.json`), or to answer from an existing wiki per [query.md](references/query.md).

## Mode

| 用户意图 | 入口 | 完成条件 |
|---|---|---|
| 构建 / 更新 / 重编译 | [compile](references/compile.md) init / refresh / rebuild | 事务 finalized，结构检查通过，报告剩余 freshness |
| 点名外源摄取 | [ingest](references/ingest.md) | 候选已确认，计划内写入，结构检查与状态报告 |
| 健康检查 | [lint](references/lint.md) | 结构与当前性分开报告，advise 只读 |
| 查询 | [query](references/query.md) | 有界检索、按风险核验、引用证据、零写入 |
| v1 升级 / 中断恢复 / 反馈 | [transactions](references/transactions.md) | 显式选择，保留恢复证据；不冒充内容已刷新 |

已明确的信息与授权直接复用。Existing wiki + ambiguous “构建” → clarify refresh/rebuild; never init over it. 所有写操作统一 plan/apply；查询不是编译模式。

## Layout

```
<wiki-root>/
  raw/                  # retained snapshots + labelled extracts
  wiki/                 # articles + index.md + log.md + CLAUDE.md
  .wiki-manifest.json   # compile graph (sources ↔ articles)
```

Scripts live in this skill's `scripts/` directory (the folder that contains this `SKILL.md`). Run them from the repo root so `--wiki` / `--repo` resolve correctly:

```bash
node <skill-root>/scripts/inventory.mjs hash --wiki <wiki-root>  # observation only
node <skill-root>/scripts/inventory.mjs status --wiki <wiki-root>
node <skill-root>/scripts/lint-wikilinks.mjs <wiki-root>
node <skill-root>/scripts/advise.mjs <wiki-root>
node <skill-root>/scripts/query.mjs --wiki <wiki-root> --query "关键词"
node <skill-root>/scripts/migrate.mjs --wiki <wiki-root>  # preview only
```

`status` is a stable alias of `drift`. `<skill-root>` is the canonical skill directory or a projection that points at it. Do not hard-code `.agents/skills/llm-wiki`.

## Steps

1. Detect: `<wiki-root>/wiki/index.md` + `CLAUDE.md` (or `AGENTS.md`) means a wiki exists. Default wiki-root is repo-root `wiki/`. If `yss-project.yaml` is `repository_mode: template-source`, wiki-root is `.template-source/wiki`.
2. If the user is asking a repository question, load [query.md](references/query.md) and stop. Do not lint, ingest, or append `log.md`.
3. Load the mode algorithm: [compile.md](references/compile.md) for init/refresh/rebuild, [ingest.md](references/ingest.md) for ingest. For init/rebuild corpus choice, load [discover.md](references/discover.md). For writing, load [writing.md](references/writing.md). For checks, load [lint.md](references/lint.md).
4. **Fact order:** called code > table comments / config defaults > stale raw copies. After writing, re-read live sources for a sample of claims (`N = min(5, changed pages)`).
5. 写入完成后结构 lint、status、advise；日志由事务 finalize 唯一追加。分别报告结构结果与剩余 stale/missing/unverified。

`refresh` without a manifest: stop. Rebuild, or reconstruct the manifest from existing「来源」sections — do not guess `sourceIds`.
