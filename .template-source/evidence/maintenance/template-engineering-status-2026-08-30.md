# 模板工程状态快照 — 2026-08-30

## 1. 快照目的

本记录保存 `yss-spec-project-template` 及其开发落地 Harness 子仓的状态，并于 2026-08-31 更新 B-01 至 B-03 的处理证据。它不是 npm 发布批准记录。

## 2. 当前状态

| 项目 | 状态 |
|---|---|
| 仓库身份 | `template-source` |
| 主分支 | 三个仓库均为 `main`；子仓提交已推送，父仓等待最终 checkpoint |
| 当前流程 | B-02、B-01 已关闭；B-03 已完成两个子仓提交与推送，正在闭合父仓 gitlink 和递归克隆复现 |
| 影响面 | `cross-repo-contract`、`generation-semantics`、`release-semantics` |
| 产品资产 | Spec、原型、OpenAPI、Ticket 和垂直切片均 `not-applicable` |
| 发布判断 | `blocked`；需完成父仓 commit、递归克隆复现与父仓 push 后关闭 B-03 |

当前跨仓组合：

- 模板源子仓已提交并推送 `f381adeb0147472fd5829c097153c1a15450c30e`。
- CLI 子仓已从该远端固定 commit 重建 snapshot，提交并推送 `32c6720ebb081faffc29710c53cce31fbd532e56`。
- CLI snapshot 的 `DEFAULT_TEMPLATE_REF`、`requestedRef` 和 `templateCommit` 均绑定 `f381adeb0147472fd5829c097153c1a15450c30e`。
- 父仓将在本轮 commit 中同时更新两个 gitlink，并保留 `.gitmodules` 的规范远端 URL。

## 3. 本轮验证证据

| 命令 / 检查 | 结果 |
|---|---|
| `scripts/verify-template` | 通过；根模板结构、技能、角色、生命周期、仓库边界、脚手架、Router、UI 和 OpenAPI 场景通过 |
| `node --test tests/*.test.js`（CLI 当前 bundled snapshot） | 56/56 通过 |
| 固定远端 `yss-harness-dev-agent@f381ade...` 后执行 `npm test` | snapshot 重建成功，56/56 通过 |
| 固定远端 `yss-harness-dev-agent@f381ade...` 后执行 `npm pack --dry-run` | 通过；`create-yss-harness-dev@0.1.0` 可打包 |
| CLI 子仓 `git diff --check` | 通过 |

技术验证表明 CLI 的 `init`、`attach`、`sync`、身份隔离、gitlink 防护和打包路径可以工作。根模板门禁没有调用外部 CLI 子模块，因此根门禁通过不能单独证明跨仓发布闭环。

## 4. 发布阻断项

### B-01：L3 正式独立审查证据无效（已关闭）

`yss-harness-dev-agent@62809f3...` 的维护 checkpoint 将 `.template-source/evidence/maintenance/create-yss-harness-formal-independent-review-2026-08-28.md` 登记为 `formal-independent-review: pass`，但该文件正文说明它只是审查请求，不是非实施者的正式独立审查结论；其中仍使用旧 CLI 名称和旧 metadata。

关闭证据：源仓最终候选 `9760cc175ecfe9fb895a67a852a43496261b0153c65e3aff879064712e598dbc` 完成第 7 轮 Standards / Spec 独立审查及 Lead 聚合签署；CLI 候选 `e4a9a2ff8dba3eafd3d615101de590484bc739039b857c0e84486090ff4b2029` 也完成双轴独立审查。两组均为 `pass` 且 `findings: []`，结构化记录已通过 `scripts/verify-maintenance-review-record` 和 L3 checkpoint 校验。

### B-02：维护 checkpoint 校验存在假阳性（已关闭）

`scripts/lib/maintenance-intensity.mjs` 只检查证据条目的 `kind`、非空命令和 `result=pass`，没有解析审查结论、Reviewer 独立性或候选 digest，因此 B-01 的矛盾记录仍能通过校验。

关闭证据：新增结构化审查记录 schema 与校验入口，绑定 Reviewer / 实施者、冻结 worktree 候选 digest、规范候选流、Reviewer 任务包、正式报告和 findings；新 L3 Markdown 被拒绝，仅保留固定历史 allowlist。反例覆盖审查请求、实施者自述、候选不匹配、否定结论、否定语境与受控通过行并存、无效任务包、开放阻断 finding、symlink 越界及候选字节不一致。根仓和模板源仓 `scripts/verify-template`、专项场景及 `git diff --check` 均 fresh 通过。

### B-03：子仓与父仓 gitlink 未闭合（最终验证中）

原始阻断已消除：模板源 `f381ade...` 和 CLI `32c6720...` 均已提交并推送，CLI snapshot 绑定同一模板源 commit，完整测试与打包预检通过。

剩余关闭条件：父仓 commit 同时更新两个 gitlink；用 `clone --recurse-submodules` 复现并执行根门禁；随后推送父仓。commit / push 授权均引用 `B03-2026-08-31`。

## 5. 治理跟进项

- `docs/agents/yss-skill-registry.yaml` 已为 `active`，但 `.template-source/adr/0007-separate-skill-routing-registry-from-integrity-lock.md` 仍描述为 `shadow`。
- `.template-source/adr/` 存在两个编号为 `ADR-0007` 的决策记录，需要消除身份歧义。
- 根 `README.md` 仍把 `grill-with-docs`、`to-spec` 和 `to-tickets` 描述成常规入口，与生命周期原生工作单元及“显式兼容入口”定位不一致。
- `yss-stage-decision` 与 `yss-tactical-design` 仍标记为 `draft`，但已经进入关键生命周期路由，需要明确成熟度提升计划或受控使用边界。

这些跟进项应与 B-02 的核心验证器变更一起重新评估强度，不能拆分成多个低等级修改规避 L3 聚合审查。

## 6. 下一工作单元

下一工作单元已收敛为 B-03 跨仓 Git 闭合，顺序如下：

1. 在父仓 checkpoint commit 中更新两个 gitlink。
2. 从该 commit 执行 `clone --recurse-submodules`，核对两个子仓 commit 并运行根模板门禁。
3. 记录复现证据并推送父仓 `main`。

完成标准：B-01 至 B-03 全部关闭，治理跟进项有明确 disposition，同一最终候选拥有有效 L3 checkpoint、正式独立审查和 fresh verification，且重新 clone 可以复现跨仓组合。
