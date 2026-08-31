# 模板源治理区

本目录只属于 `template-source` 仓库，不属于 CLI 生成的 `project-instance`。

## 边界

- `docs/` 是模板实例分发面的候选来源；模板源审查记录和其他治理资产不进入实例。`.nvmrc` 与根 `.gitignore` 同属分发面。
- `.template-source/` 是模板源治理区：保存模板维护的审查、研究、跨仓契约、发布路线、派生证据和源仓库 LLM Wiki 编译树。
- 源仓库 wiki-root 为 `.template-source/wiki`；新 `project-instance` 不附带该编译树。
- 外部 CLI 按显式分发清单构建快照；新项目不应出现 `.template-source/`、维护环境配置或已经从 `docs/` 迁出的源仓库文件。

## 归档规则

1. RED / GREEN、压力场景、研究和独立审查证据先保留在 `evidence/reviews/`，完成 archive-source checkpoint 后由 `index.yaml` 汇总，原始文件从工作树移除但继续保存在 Git 历史或发布附件中。
2. `evidence/reviews/index.yaml` 是当前证据清单、SHA-256 和 checkpoint 引用的唯一事实源；`pending` 只允许出现在尚未取得 archive-source checkpoint 的中间状态。
3. 跨仓库契约进入 `contracts/`；模板源发布路线进入 `roadmap/`。路线条目必须有状态和验收证据，全部 `closed` 后才能从工作树移除。维护侧 Node 工具依赖、lockfile 和 vendor 构建位于 `tooling/node/`，不进入模板实例分发面。
4. 仅描述模板源执行过程的派生表进入 `derived/`。
5. 模板治理决策直接进入本仓单一事实来源、维护 checkpoint 或 roadmap；不再维护 `.template-source/adr/*.md`。历史决策保留在 Git 历史和既有 evidence 中。

## 本次迁移清单

| 模板实例分发面来源 | 模板源治理区目标 |
|---|---|
| `docs/implementation/create-yss-spec-repository-mode-contract.md` | `.template-source/contracts/create-yss-spec-repository-mode-contract.md` |
| `docs/process/harness-work-unit-map.md` | `.template-source/derived/harness-work-unit-map.md` |
| `docs/process/harness-optimization-backlog.md` | `.template-source/roadmap/harness-optimization-backlog.md` |
| `docs/releases/next-major-template-governance.md` | `.template-source/roadmap/next-major-template-governance.md` |
| `docs/reviews/*.md`（13 个） | `.template-source/evidence/reviews/index.yaml` 及其 Git archive checkpoint |
| 其余 `docs/reviews/` 审查与证据文件 | `.template-source/evidence/reviews/`（Markdown 进入同一 archive 索引；非 Markdown 留在治理区工作树） |
| 根目录 `wiki/` 编译树 | `.template-source/wiki/` |

归档文件不进入 CLI 实例分发面，但必须能够通过索引、哈希和 checkpoint 恢复；“不进入实例”不等于“不可审计”。

## 完成归档的操作顺序

```bash
# 先在保留原件的工作树上建立 archive-source checkpoint
.template-source/scripts/evidence-index --write --archive-commit <archive-commit>
git rm .template-source/evidence/reviews/*.md
.template-source/scripts/evidence-index --check
scripts/verify-template
```

`<archive-commit>` 必须是已经存在、可追溯且包含 13 个原始文件最终内容的 40 位 Git commit；未获得 Git 提交授权时只能保留 `pending` 索引，不能执行 `git rm`。
