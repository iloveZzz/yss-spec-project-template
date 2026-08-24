# 分发面边界 L2 聚焦审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析。

## 范围

把 `template-source` 的 LLM Wiki 编译树和剩余 `docs/reviews/` 迁出实例分发面，避免 `create-yss-spec` 快照把模板维护产物复制进新 `project-instance`。`.nvmrc` 与根 `.gitignore` 保持分发。

## 请审查

1. 根目录排除 `.template-source/` 是否足够，有没有漏到分发面的 `wiki/` 或 `docs/reviews/`。
2. `template-source` wiki-root 定为 `.template-source/wiki`、实例按需在仓库根 `wiki/` `init`，会不会让 Agent 在本仓误 `init` 出第二棵 wiki。
3. `docs/reviews/` Markdown 归档进 evidence-index（30 份）且非 Markdown 留在治理区工作树，是否仍符合 ADR-0008「只移动归档，不删除」。
4. 旧实例 `wiki/` / `docs/reviews/` 只走 `remove-report`、不静默删除，是否写进了本仓契约且没有反向要求 CLI 自动删。
5. `llm-wiki` 仍 `instance_default_discoverable: true` 是否与「新项目不附带编译树」一致。

## 关键路径

- `CONTEXT.md` 模板源治理区
- `AGENTS.md` §8 与 Cursor Cloud wiki-root
- `.template-source/adr/0008-template-source-distribution-boundary.md`
- `.template-source/contracts/create-yss-spec-repository-mode-contract.md`
- `.template-source/wiki/`
- `.template-source/evidence/reviews/index.yaml`
- `.agents/skills/llm-wiki/SKILL.md`
