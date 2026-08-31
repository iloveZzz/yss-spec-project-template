# ADR 全量退役 Standards 正式独立审查（Round 4）

```yaml
schema_version: 1
record_kind: maintenance-independent-review
review_mode: formal-independent
status: approved
reviewer_id: reviewer.adr-retirement.standards.r4.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
candidate_digest: 561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672
candidate_snapshot_ref: .template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/candidate.bin
task_package_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-task-round4-2026-08-31.yaml
review_report_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-round4-2026-08-31.md
reviewed_at: '2026-08-31T12:04:45Z'
findings:
  - id: STD-ADR-R4-001
    severity: high
    disposition: resolved
    status: resolved
    summary: Round 3 prepack 漂移 finding 已关闭；design CLI commit 161a79e 把 generatedAt 绑定到稳定模板 commit 的提交时间，连续同步测试与 prepack 前后 snapshot 字节均可复现。
  - id: STD-ADR-R4-002
    severity: medium
    disposition: judgement-call
    status: resolved
    summary: 候选 T record 纳入 design CLI generator/test 的完整 8e6bd3f..161a79e commit diff，761 个 ignored 发布 post-image 作为规范 U record 完整纳入冻结字节。
  - id: STD-ADR-R4-003
    severity: medium
    disposition: judgement-call
    status: resolved
    summary: 三个模板源的 ADR 全量删除、治理 validator、三套 wiki、开发 CLI 稳定快照及四个远端 main commit 均复核通过。
  - id: STD-ADR-R4-004
    severity: low
    disposition: not-applicable
    status: not-applicable
    summary: 未发现 violation、drift 或 new_impacts；Java、YSS Backend、生产 UI 与 UI fidelity 未被本候选触发。
```

## 冻结候选与审查边界

- `review_mode` 为 `worktree`；`review_base_ref` 与 `merge_base` 均为 `37cc9257a0918eac187003c8f8098bfbaff2480b`。
- `candidate.bin` fresh SHA-256 为完整 digest `561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672`，与 manifest 的 `candidate_digest` 和目录身份一致。
- 规范 `YSS-WORKTREE-CANDIDATE-V1\0` 流包含一个 `T` record：payload 为 `301869` bytes，与 `tracked.diff` 逐字节相等；其后包含 `761` 个按 raw path bytewise 严格升序排列的 `U` record，无未知 record、截断或尾随字节。
- 761 个 `U` record 全部为 regular file，其中 mode `0100644` 为 733 个、`0100755` 为 28 个；manifest path、base64 path、content reference 与捕获字节逐项 mismatch 均为 `0`。
- 本轮只消费 manifest 固定的候选字节与其固定 commit；未修改实现或候选，未 commit、未 push，也不批准发布。

## Standards findings

### STD-ADR-R4-001 — Round 3 prepack 漂移已关闭（resolved）

`tracked.diff` 明确包含 `create-yss-strategic-design` 的完整 `8e6bd3f905c46f85764781ac857020639448b20f..161a79e818ee17bef14f914d26ac698957dfea23` 范围：

1. `scripts/sync-template.js` 不再使用墙钟时间。它从固定 `templateCommit` 读取 `%cI`，校验可解析后规范化为 ISO 字符串，因此同一 commit 的 `generatedAt` 不随执行时间改变。
2. `tests/init-cli.test.js` 新增连续运行两次 sync 并对 `template.snapshot.json` 做 byte equality 的回归测试；候选 fresh verification 记录完整测试为 6/6。
3. 捕获的 `template.snapshot.json.generatedAt` 为 `2026-08-31T11:09:55.000Z`，与模板 commit `f2c5f5878589667919f9000913743a288580ef46` 的 committer time `2026-08-31T19:09:55+08:00` 是同一时刻。
4. 固定远端 URL 与 40 位 ref 下，`npm pack --dry-run` 前后 `template.snapshot.json` SHA-256 均为 `ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b`；该值与本候选 `U` record 中捕获的 metadata 文件 fresh hash 完全相同。

该可复现结论以同一稳定来源身份为前提：本候选和发布证据使用 `YSS_STRATEGIC_DESIGN_TEMPLATE_REPO=https://github.com/iloveZzz/yss-harness-design-agent.git` 与 `YSS_STRATEGIC_DESIGN_TEMPLATE_REF=f2c5f5878589667919f9000913743a288580ef46`。生成器未设置环境变量时仍可选择本地 sibling 与 `HEAD`；该开发便利路径不等于本次冻结发布输入，也不得用于替代上述固定来源合同。

### STD-ADR-R4-002 — generator/test diff 与 761 个 ignored post-image 已完整冻结（resolved）

- `T` record 同时包含父仓 gitlink 从 `8e6bd3f` 更新到 `161a79e`，以及该 commit 的两个 tracked 文件 diff：`scripts/sync-template.js` 和 `tests/init-cli.test.js`。这不是仅更新 submodule 指针而遗漏实现 diff。
- `U` records 精确包含 759 个 `template/` 文件、`template.manifest.json` 和 `template.snapshot.json`，共 761 个发布 post-image 文件。
- 捕获字节计算出的 `template.manifest.json` SHA-256 为 `261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c`，与 metadata 的 `manifestHash` 一致。
- 从 759 个捕获文件按 CLI `treeHash` 算法重新计算得到 `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`，与 metadata 的 `snapshotHash` 一致。
- metadata 的 `templateRepository` 为远端 URL，`requestedRef` 与 `templateCommit` 都是完整 `f2c5f5878589667919f9000913743a288580ef46`；没有本机路径或 `working-tree`。

### STD-ADR-R4-003 — ADR、validator、wiki、开发 CLI 与远端 commit 全轴通过（resolved）

#### ADR 退役与 validator

- Parent 候选删除 13 个 `.template-source/adr/*.md`；`yss-harness-dev-agent` commit 删除 14 个；`yss-strategic-design-harness` commit 删除 13 个。每项均为 `deleted file mode` 且 new side 为 `/dev/null`，没有候选内新增 ADR。
- Parent 与两个模板源的 `scripts/verify-governance-release`，以及开发 CLI 的 `template/scripts/verify-governance-release`，目标 blob 完全一致；四份内容 SHA-256 均为 `7d7d23d09bb86ad55ff159dc648ed1f1be51649a9a503fae80a724590c0d15bd`。
- validator 允许 ADR 目录不存在或无顶层 Markdown，并在出现 `*.md` 时 fail closed；候选压力证据覆盖重新加入 `9999-regression.md` 的失败路径。
- `docs/adr/README.md` 继续保留 `project-instance` 的产品 ADR 能力，同时明确 `template-source` 不再维护实时治理 ADR；未把模板源退役扩大为产品 ADR 禁令。

#### 三套 wiki

- Parent、开发 Harness、战略设计 Harness 的 `.wiki-manifest.json` 分别包含 16、18、16 个 source，均包含 23 篇 article，且不再引用 `.template-source/adr` 或 `adr-0002-repository-mode` raw。
- 三套 wiki 的退役 log 与文章去引用进入各自固定 diff；fresh evidence 记录 wikilink lint 全部 exit `0`，`unreferencedRaws=0`、`suspects=0`。

#### 开发 CLI 与远端 commit

- 开发 CLI `d76420bf391638f4ee78c811553c2becf3ef21f1` 的 metadata 绑定远端模板 commit `b7f7ad993760e2bb0bdf140a0daac92760f54837`；重新计算的 manifest hash `59dec8ccf234c51874c2c401df410dbd6c2d3a5fc2acbdf998f440b995375cf5` 与 tree hash `5a72e02fb22e080b97263f8562818e62f8beea53e9837805c4b6f5a6db062d40` 均闭合。
- Reviewer fresh `git ls-remote` 复核四个远端 `main`：design CLI 为 `161a79e818ee17bef14f914d26ac698957dfea23`，开发 CLI 为 `d76420bf391638f4ee78c811553c2becf3ef21f1`，开发 Harness 为 `b7f7ad993760e2bb0bdf140a0daac92760f54837`，战略设计 Harness及 metadata 兼容 URL均为 `f2c5f5878589667919f9000913743a288580ef46`。

## Machine checks、specialist 与 smell 基线

- Reviewer fresh 执行 `scripts/verify-template` 与 `git diff --check`，组合退出码为 `0`；`scripts/verify-template` 包含 32/32 Node tooling tests、skill projection/lock、技能注册表、数字人、生命周期、维护强度、跨仓路径与模板发布门禁。
- 本候选属于模板治理、Node validator、wiki 与 CLI 发布语义，不涉及 Java 后端或生产 UI。Alibaba Java、YSS Backend、YSS Frontend 与 UI fidelity 均为 `not-applicable`，不是空白适用行。
- 未发现需要单列的 Fowler judgment-call finding。三个模板源的 validator 同步属于受控跨仓投影，不据此判定 Duplicated Code 或 Shotgun Surgery；其余 smell 未形成可操作 finding。

## 结论

审查结论：pass。

Standards 轴共有 0 个 open finding、3 个 `resolved` 裁决和 1 个 `not-applicable` 裁决。Round 3 的最严重问题已由稳定 commit 时间 metadata、连续 sync 回归测试、固定来源 prepack hash 与完整 761-file post-image 冻结共同关闭；本结论仅关闭 Standards 独立审查，不构成 `gate.release-ready`、合并或发布批准。
