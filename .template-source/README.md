# 模板源治理区

本目录只属于 `template-source` 仓库，不属于 CLI 生成的 `project-instance`。

## 边界

- `docs/` 是模板实例分发面：其中的文件会随 `create-yss-spec` 快照进入新项目。
- `.template-source/` 是模板源治理区：保存模板维护的审查、研究、跨仓契约、发布路线、源仓库 ADR 和派生证据。
- 外部 CLI 按根目录排除 `.template-source/`；新项目不应出现该目录，也不应出现已经从 `docs/` 迁出的源仓库文件。

## 归档规则

1. RED / GREEN、压力场景、研究和独立审查证据先保留在 `evidence/reviews/`，完成 archive-source checkpoint 后由 `index.yaml` 汇总，原始文件从工作树移除但继续保存在 Git 历史或发布附件中。
2. `evidence/reviews/index.yaml` 是当前证据清单、SHA-256 和 checkpoint 引用的唯一事实源；`pending` 只允许出现在尚未取得 archive-source checkpoint 的中间状态。
3. 跨仓库契约进入 `contracts/`；模板源发布路线进入 `roadmap/`。路线条目必须有状态和验收证据，全部 `closed` 后才能从工作树移除。维护侧 Node 工具依赖、lockfile 和 vendor 构建位于 `tooling/node/`，不进入模板实例分发面。
4. 仅描述模板源执行过程的派生表进入 `derived/`。
5. 仅影响模板治理、尚未成为实例运行规则的 ADR 进入 `adr/`，`proposed` 不等于当前发布门禁。
6. 未归档的一手研究笔记进入 `research/`。不要把新的 `*.md` 放进已 `complete` 的 `evidence/reviews/`，以免破坏 archive 合同；也不要写入 `docs/`，以免进入模板实例分发面。

## ADR 评估

| ADR | 当前状态 | 处理决定 |
|---|---|---|
| ADR-0004 | `proposed` | 保留；等待 lifecycle / Router schema v2 迁移落地 |
| ADR-0005 | `proposed` | 保留；等待生态发布清单和跨仓闭合校验落地 |
| ADR-0007 | `proposed` | 保留；等待技能注册表和 Router 消费实现落地 |
| ADR-0008 | 已接受 | 保留；作为模板实例分发面与模板源治理区的边界契约 |

## 本次迁移清单

| 模板实例分发面来源 | 模板源治理区目标 |
|---|---|
| `docs/adr/0004-split-lifecycle-and-router-registry-domains.md` | `.template-source/adr/0004-split-lifecycle-and-router-registry-domains.md` |
| `docs/adr/0005-cross-repository-ecosystem-release-manifest.md` | `.template-source/adr/0005-cross-repository-ecosystem-release-manifest.md` |
| `docs/adr/0007-separate-skill-routing-registry-from-integrity-lock.md` | `.template-source/adr/0007-separate-skill-routing-registry-from-integrity-lock.md` |
| `docs/implementation/create-yss-spec-repository-mode-contract.md` | `.template-source/contracts/create-yss-spec-repository-mode-contract.md` |
| `docs/process/harness-work-unit-map.md` | `.template-source/derived/harness-work-unit-map.md` |
| `docs/process/harness-optimization-backlog.md` | `.template-source/roadmap/harness-optimization-backlog.md` |
| `docs/releases/next-major-template-governance.md` | `.template-source/roadmap/next-major-template-governance.md` |
| `docs/reviews/*.md`（13 个） | `.template-source/evidence/reviews/index.yaml` 及其 Git archive checkpoint |

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
