# llm-wiki I1–I5 聚焦独立审查请求

日期：2026-08-23
强度：L2（`local-rule` + `non-core-validator`）
实施者：本分支作者（不得担任本审查）

请非实施者按 `code-review` 或等价聚焦审查阅读
`cursor/llm-wiki-adapt-iterations-0efe` 相对 `main` 的 diff，并改写本文件结论。
实施者未预填 pass / fail。

## 范围

- `.agents/skills/llm-wiki/**`（含 `advise.mjs`、`ingest.md`、`status` 别名）
- `AGENTS.md` 强制入口与 `CONTEXT.md` 术语
- 本仓 `wiki/` 对 [[LLM Wiki]] / [[Agent入口规则]] 的 refresh
- 本目录 L2 反例与 fresh verification

## 请核对

1. `lint-wikilinks` 失败合同未因 advise / suspects / 缺 Status 变严。
2. `inventory status` exit 0 报告漂移；lint 的 `STALE HASH` 仍失败。
3. query 仍只读，禁止 ingest / 回写。
4. ingest 确认前零文章字节；已映射 live 走 refresh。
5. 未点名外部 skill，未改 `yss-public-skills.json`，未挂 `verify-template`。
6. 通用 skill 未写死 `.agents/skills/llm-wiki` 或本仓文档语言。

## 结论

待非实施者填写。未完成前不得宣布可合并或可发布。
