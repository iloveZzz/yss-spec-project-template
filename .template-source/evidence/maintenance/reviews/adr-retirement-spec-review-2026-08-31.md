# ADR 退役冻结候选 Spec 独立审查

- reviewer_id: `reviewer.adr-retirement.spec.2026-08-31`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e`
- review_mode: `formal-independent`
- candidate_mode: `worktree`
- review_base_ref: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- candidate_snapshot: `.template-source/evidence/maintenance/reviews/candidates/b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e/candidate.bin`
- spec_sources: `.template-source/evidence/maintenance/adr-retirement-l3-contract-2026-08-31.yaml`；用户目标“继续处理，直到完成所有 adr”及本次六项核对要求
- candidate_integrity: `candidate.bin` SHA-256 与 manifest digest 一致；其唯一 tracked payload 与 `tracked.diff` 逐字节一致；manifest 声明无 untracked 文件

## 覆盖与结果

1. **三套模板源实时治理 ADR 退役：满足。** 冻结 diff 在 parent、`yss-harness-dev-agent`、`yss-strategic-design-harness` 分别删除 13、14、13 个 `.template-source/adr/*.md` 文件；三套 `verify-governance-release` 同步改为在 `template-source` 身份下拒绝该目录中的 Markdown ADR。任务包绑定的 fresh verification 对同一 digest 报告三仓 `scripts/verify-template` 通过。
2. **活跃规则 SSOT 与历史证据保留：满足。** `.template-source/README.md` 明确将模板治理决策落到对应 SSOT、maintenance checkpoint 或 roadmap，并声明历史决策保留于 Git 历史和既有 evidence。冻结 diff 未删除 `.template-source/evidence/**`、既有 review 或冻结 candidate；身份、流程、技能和角色规则继续由 `yss-project.yaml`、`AGENTS.md`、`CONTEXT.md`、生命周期注册表、技能注册表及数字人角色注册表承载。
3. **三个 wiki 退役 `adr-0002` 映射并 lint：满足。** 三套 wiki manifest 均删除 `adr-0002` source/sourceIds，三套 `raw/adr-0002-repository-mode.md` 均删除，三套日志和文章均改为直接引用 `yss-project.yaml`、`AGENTS.md` 与实例化合同。任务包绑定的 fresh verification 对同一 digest 报告三套 wiki lint 均通过。
4. **两个 CLI 快照同步：不满足。** dev CLI 有快照内容和 digest 变化，但 design CLI 聚合段为空，且 dev CLI 的持久快照元数据写入本机绝对路径和 `working-tree` 引用。详见 findings。
5. **阻止模板源治理 ADR 重新引入：满足。** parent、dev-source、design-source 及 dev CLI 快照中的校验器均在 `repository_mode=template-source` 时枚举 `.template-source/adr/*.md` 并阻断非空集合；同 digest 的压力证据报告加入 `9999-regression.md` 后按预期失败。
6. **保留 project-instance 产品 ADR 能力：满足。** `docs/adr/README.md` 及 dev CLI 对应快照仍保留产品 ADR 创建入口和 `docs/templates/adr-template.md`，只把该能力限定到 `project-instance`；校验器的拒绝逻辑受 `isTemplateSource(root)` 保护，没有删除产品 ADR 模板或实例能力。

## Spec findings

```yaml
findings:
  - id: SPEC-ADR-001
    classification: missing-partial
    severity: blocking
    requirement: "合同第 3 行：修改……两个 CLI 生成快照；任务包第 25 行：目标 CLI 同步。"
    candidate_evidence: "tracked.diff 第 4112 行只有 `YSS-AGGREGATE-REPOSITORY design-cli submodules/create-yss-strategic-design`，其后没有任何 snapshot、template 或校验器 diff；相对地 dev-cli 段包含 3 个文件变更。"
    finding: "冻结候选没有实现或提供足以审查 `create-yss-harness-design` 快照已与 design-source 退役结果同步的候选字节。仅有 manifest 中的 HEAD 标识和外部测试通过声明，不能证明该快照包含本候选对 `docs/adr/README.md` 与 `scripts/verify-governance-release` 的 post-image。"
    disposition: "返回实现者：同步 design CLI（本地目录仍使用旧名时也须明确映射到 `create-yss-harness-design`），把快照 post-image 纳入新的冻结候选，并重跑完整 Spec 审查。"
  - id: SPEC-ADR-002
    classification: wrong-implementation-scope-creep
    severity: blocking
    requirement: "合同第 3 行只要求同步两个 CLI 生成快照，没有授权把发布快照来源改成本机路径。"
    candidate_evidence: "tracked.diff 第 4050-4051 行把 dev CLI 的 `templateRepository` 从公开 Git URL 改为 `/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-dev-agent`，并把 `requestedRef` 改为 `working-tree`。"
    finding: "持久化生成快照携带审查机绝对路径和可变工作树引用，产生机器相关、不可复现的发布元数据；这不是 ADR 退役所需行为，也不适合作为跨仓冻结候选。"
    disposition: "返回实现者：在源仓候选可由稳定 ref 标识后重新生成 dev CLI 快照，保留可移植的 repository/ref 元数据；随后重新冻结五仓候选并全轴复审。"
```

## Drift / new impacts

```yaml
drift: false
new_impacts: []
```

两个 finding 均属于既有 `cross-repo-contract` / `release-semantics` 影响面内的实现缺口，不要求扩展合同影响面；应沿原合同返回实施者修复，重新捕获不可变候选后复审。

## 结论

**审查结论：blocked。** Spec findings 共 2 项，均为 blocking；在 design CLI 快照进入冻结候选且 dev CLI 快照元数据恢复为可移植、可复现来源之前，不得把本 Spec 轴记为 pass。本结论不批准发布，也不包含 commit/push 授权。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
workflow_reference: work-unit.intensity-aware-review
task_id: adr-retirement-spec-review-2026-08-31
actor_id: reviewer.adr-retirement.spec.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
skill: code-review
execution_state: Reviewer
status: blocked
candidate_digest: b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e
changed_files:
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-2026-08-31.md
evidence_refs:
  - .template-source/evidence/maintenance/reviews/candidates/b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e/candidate-manifest.yaml
  - .template-source/evidence/maintenance/reviews/candidates/b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e/candidate.bin
  - .template-source/evidence/maintenance/reviews/candidates/b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e/tracked.diff
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-2026-08-31.md
actual_verification:
  - "candidate.bin sha256 == candidate_digest"
  - "candidate.bin tracked payload byte-equal to tracked.diff"
  - "untracked_files == []"
deferred_seams: []
drift: false
new_impacts: []
findings: [SPEC-ADR-001, SPEC-ADR-002]
next_route: worker.adr-retirement.2026-08-31
```
