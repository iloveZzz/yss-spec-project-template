# 交付证据索引

- `implementation-report.md`：实现设计、行为、接口、兼容升级与回退。
- `delivery-status.json`：最终状态、门禁和未验证边界；不替代生命周期批准。
- `change-manifest.json`：本轮源码与接收 profile 的路径、摘要。
- `baseline-manifest.json`、`initial-working-tree.diff`、`receiving-initial-state.json`：开始时的 HEAD、来源、既有改动。
- `unrelated-preservation.json`：105 个无关 llm-wiki 文件的摘要保留检查。
- `research-closure/`：三个厂商及总报告的新收尾任务包、真实校验记录和日志；旧任务包仍在原研究目录。
- `fresh-verification/original-workspace/console.log`：原工作区快照被现有大于 2GiB 的 CodeGraph 数据库阻断；未更改缓存。
- `fresh-verification/isolated-first/`：初次隔离检查的失败记录，包括依赖未复制、入口预算和路由元数据缺项。
- `fresh-verification/isolated-final/report/`：补齐环境和修复后执行的完整计划、97 项结果和全部日志；96 项通过，未提交来源门禁失败，输入未漂移。
- `fresh-verification/isolated-final/supplemental/`：被上述门禁跳过的四项补跑及 103 项语法检查；保留 npm 12 发布集成失败。
- `fresh-verification/isolated-final/npm11-release-test.*`：使用随 Node 24 安装的 npm 11 重验发布集成；实际版本和退出码单独记录。
- `isolated-final-source-manifest.json`、`verified-source-readback.json`：验证检出与最终源文件逐项摘要对齐。
- `agent-scenarios.json`、`agent-baseline/`、`agent-candidate/`：固定提示、断言、原始统计、逐步轨迹及实际产物副本。
- `evaluation-decision.md`、`evaluation-decision.json`：逐项语义复核、指标与不推广默认的结论。
- `task-view-comparison.json`：仅用于字节对比的合成实验。
- `post-evaluation-snapshot-delta.json`：冻结 Agent 候选与最终元数据／入口说明的差异。

为避免把评测副本当成项目源码，完整 fixture 与依赖已归档，每个归档都流式重读并逐文件核对 SHA-256：

| 归档 | 内容 |
| --- | --- |
| `baseline-workspaces.tar.gz` | 基线全部工作目录、主环境真实 preflight、Python／浏览器依赖 |
| `candidate-workspaces.tar.gz` | 候选全部工作目录，包括失败和未完成资产 |
| `frozen-sources.tar.gz` | 基线、候选冻结来源与 Python 依赖 |

对应 `*.manifest.json` 记录包和成员摘要；基线归档成员表使用 `baseline-archive-manifest.json`。解包到新的隔离目录即可查阅；若要复现原绝对引用，按原目录布局恢复。JSON 报告保留当时的绝对执行路径，未改写历史内容。复跑 Agent 会产生新的预算消耗，不能改写本轮统计。

隔离验证检出保留在 `/Users/zhudaoming/.codex/worktrees/lifecycle-core-verification/yss-spec-project-template`，便于复查四个 CLI 的 WORKTREE 快照；它不是已提交发布候选。主工作区是本轮源码交付位置。
