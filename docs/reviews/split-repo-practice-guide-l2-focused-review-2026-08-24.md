# 分仓接入实践指南 L2 聚焦审查

Status: `Approved`

审查者：非实施者（用户确认；不是本变更实施者）
候选：`111ad5f`（记录审查请求时的 HEAD）及后续仅含本审查落盘的 commit
结论：Approved

本结论覆盖 L2 聚焦清单。不是模板发布裁决，不是合并裁决，不得声称可发布。

## 范围与分级

- 强度：L2
- 触发：`local-rule`、`template-structure`
- 共识：分层接入 = 分仓接入；不设 superproject；不用 git submodule / subtree 嵌实现仓

## 审查清单（总体通过）

用户于 2026-08-24 确认「已审查完毕」，未提出返工项。对应请求见 `docs/reviews/split-repo-practice-guide-l2-review-request-2026-08-24.md`：

1. CONTEXT / ADR-0008 把「分仓不用 submodule」写成决策，Git 机制细节留在研究笔记。
2. 实践指南指向接入文档与登记模板，写明 Cursor 多仓与禁止 attach 单端仓。
3. 口语「研发仓 / 分层接入」只作对照，未开新术语行。
4. 研究笔记保持只读事实，不是架构批准。
5. 未改 skill、生成器或 `create-yss-spec`。

## 边界

- 完整 `scripts/verify-template` 与 CLI 跨仓集成仍未作为本轮发布证据。
- 实例仓要吃到本指南，需另一次 CLI 绑定新的 `templateCommit`。
