# ADR 全量退役 Standards 正式独立审查

```yaml
reviewer_id: reviewer.adr-retirement.standards.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
candidate_digest: b37eaa0edc156cd75f561e584337a51dbc742bd181a9d5cfa5bdb0484078cf0e
review_mode: formal-independent
review_axis: Standards
workflow_status: blocked
findings:
  - id: STD-ADR-001
    classification: hard-violation
    disposition: violation
    severity: blocking
    standard: llm-wiki/SKILL.md「live sources are the truth」「refresh 只改漂移命中的文章」及 Fact order
    locations:
      - dev-source:.template-source/wiki/.wiki-manifest.json
      - dev-source:.template-source/wiki/raw/**
      - design-source:.template-source/wiki/.wiki-manifest.json
      - design-source:.template-source/wiki/raw/**
    summary: 两个模板源 wiki refresh 绑定了父仓而非各自模板源，manifest、raw 与文章来源失真。
    remediation: 分别以 dev-source 和 design-source 为 repo 重做 refresh，核对各自 HEAD、source hash、raw 和受影响文章后 lint/advise，再冻结新候选。
  - id: STD-ADR-002
    classification: hard-violation
    disposition: violation
    severity: blocking
    standard: code-review/SKILL.md「冻结候选必须捕获全部候选字节」及仓库跨仓发布候选不可变性要求
    locations:
      - design-cli:.gitignore
      - design-cli:scripts/sync-template.js
      - candidate-manifest.yaml
      - tracked.diff
    summary: design CLI 的 template、manifest 和 snapshot 被忽略且未进入冻结流，候选 digest 未绑定实际测试或发布的生成快照。
    remediation: 让 design CLI 的生成快照成为可冻结候选的一部分并从对应 design-source 候选重建，补齐候选绑定的 test/pack 证据后重新冻结。
drift: false
new_impacts: false
```

## 冻结候选与覆盖

- 候选流符合 `YSS-WORKTREE-CANDIDATE-V1` framing：声明的 tracked 长度与 `tracked.diff` 均为 `293754` bytes，字节完全相同，无尾随记录；流 SHA-256 与 `candidate_digest` 全值一致。
- 审查只消费 `candidate-manifest.yaml`、`candidate.bin`、`tracked.diff` 及任务包指定的 fresh verification evidence；未从 live worktree 重建候选。
- 覆盖 parent、dev-source、design-source、dev-cli、design-cli。候选无 untracked record。

## Standards findings

### STD-ADR-001 — 两个模板源 wiki 使用了错误的 live source（hard violation）

`tracked.diff` 中 dev-source 的 manifest（约第 1804 行）把 `gitCommit` 从自身历史值改为父仓 `37cc9257a0918eac187003c8f8098bfbaff2480b`；design-source 的 manifest（约第 2520 行）也写入同一父仓 SHA。两者新增的 `AGENTS.md`、`CONTEXT.md`、`README.md`、`lifecycle-registry.yaml` hash 又都与 parent manifest 相同。

按 `candidate-manifest.yaml` 固定的不可变 repository heads 复核，三仓文件 hash 实际不同。例如：

| source | `AGENTS.md` SHA-256 | `lifecycle-registry.yaml` SHA-256 |
|---|---|---|
| parent `37cc925…` | `0b6894c2325a3ffcc1f55d1647732d7e02d6f05cc6ebc4082cb9a37637ecb480` | `d140f953f3e1487f8bb6831e0c924193abf39114519ffa0f108f359ec1a67829` |
| dev-source `f381ade…` | `0883ecf81bddb061906086c8b1f32aca20b3c7cd2a0c9f151075d19125b7b784` | `5b1f79adff29f41dc940cd86b0bb645c17420ad3a0b974efeb20eb52c0701647` |
| design-source `73eeb8f…` | `abf48b0a9b73366c64f04190be3a7d4a6d41740f0ac622ae417df5dcea9d4462` | `64ad0abf07212f6b74a1b56e034b64ce8e16dbb79219ea2901f693adcdd4e3f3` |

因此三套 wiki 的 `lint-wikilinks` 退出 `0` 只能证明结构和链接闭合，不能证明 dev/design 的 raw 与 live source 闭合。该错误还把父仓内容写入两个模板源的 `raw/**`，并据此刷新文章，违反 `llm-wiki` 的来源事实顺序。

### STD-ADR-002 — design CLI 生成快照未被冻结候选绑定（hard violation）

`tracked.diff` 在 `YSS-AGGREGATE-REPOSITORY design-cli` marker 后没有任何 diff，manifest 同时声明 `untracked_files: []`。但 manifest 固定的 design-cli HEAD `8e6bd3f905c46f85764781ac857020639448b20f` 中，`.gitignore` 明确忽略 `template/`、`template.manifest.json`、`template.snapshot.json`；`scripts/sync-template.js` 会在 `pretest` / `prepack` 阶段从 sibling design-source 重新生成这些发布字节。

所以 fresh verification 中 design CLI `npm test` 的 5/5 结果依赖未进入 `candidate.bin` 的 ignored、可变生成物。当前 digest 无法证明测试时快照、待发布快照和被审查快照是同一字节集，也无法证明该快照来自冻结的 design-source 候选。dev-cli 的 tracked `template.snapshot.json`、`template/docs/adr/README.md` 和 `template/scripts/verify-governance-release` 已进入候选；design-cli 未达到同等候选绑定要求。

## 其他 Standards 轴结果

- **SSOT**：除上述错误 wiki 投影外，ADR 中已生效的身份、生命周期注册表、稳定 ID、技能注册表、实例分发、运行时角色、DTO/OpenAPI 和 CLI 约束在 `AGENTS.md`、`CONTEXT.md`、结构化注册表、合同、profile 或校验器中仍有权威承载；删除 live ADR 不等于删除这些当前事实。未实施提案保留在 Git 历史，不应被误当成当前门禁。
- **历史 evidence**：冻结 diff 未修改 `.template-source/evidence/**` 的既有历史记录；ADR 删除通过 Git 历史保留，不存在把旧 evidence 改写成新结论的候选修改。
- **核心校验器**：parent、dev-source、design-source 及 dev-cli 快照中的新逻辑允许 ADR 目录缺失/为空，并对任意 `.template-source/adr/*.md` fail closed；fresh pressure evidence 记录 `9999-regression.md` 被拒绝。该项本身通过。
- **路径边界**：候选修改路径均落在合同列出的 ADR、README、wiki、validator、子仓和 CLI 快照范围内；未发现越界写入。错误 wiki 内容属于范围内实现 violation，不是新增影响面。
- **Fresh verification**：证据记录 parent 与两个模板源 `verify-template`、两个 CLI `npm test`、三套 wiki lint/advise、压力反例和五仓 `git diff --check` 均退出 `0`。这些结果不能关闭 STD-ADR-001 的来源错误，也不能补足 STD-ADR-002 缺失的不可变生成字节。

## Fowler smell 基线

未发现需要单列的 judgment-call finding。validator 在多个独立模板源和 dev-cli 快照中同步出现相同改动，表面类似 Duplicated Code / Shotgun Surgery，但这是本仓跨仓 SSOT 投影与生成快照合同要求的共同变化，不据此升级为 smell。其余 Mysterious Name、Feature Envy、Data Clumps、Primitive Obsession、Repeated Switches、Divergent Change、Speculative Generality、Message Chains、Middle Man、Refused Bequest 均未在本候选变更中形成可操作 finding。

## 结论

审查结论：blocked。Standards findings 共 2 项，最严重问题为两个模板源 wiki 来源绑定错误与 design CLI 发布快照未进入冻结候选。应返回 `worker.adr-retirement.2026-08-31` 修复，重新执行 fresh verification、重新冻结候选并对新 digest 进行全轴正式独立审查；本报告不批准发布。
