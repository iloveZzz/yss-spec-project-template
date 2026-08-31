# ADR 全量退役 Standards 正式独立审查（Round 2）

```yaml
schema_version: 1
record_kind: maintenance-independent-review
review_mode: formal-independent
review_axis: Standards
status: changes-requested
workflow_status: blocked
reviewer_id: reviewer.adr-retirement.standards.r2.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
candidate_digest: 1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8
candidate_snapshot_ref: .template-source/evidence/maintenance/reviews/candidates/1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8/candidate.bin
task_package_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-task-round2-2026-08-31.yaml
review_report_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-round2-2026-08-31.md
reviewed_at: '2026-08-31T11:27:15Z'
findings:
  - id: STD-ADR-R2-001
    severity: high
    disposition: violation
    status: open
    summary: 战略设计 CLI 的生成快照属于发布包字节，但被 Git 忽略且未进入冻结候选；no-op 证据不能证明候选 digest 绑定了实际测试和 prepack 发布的 post-image。
  - id: STD-ADR-R2-002
    severity: medium
    disposition: resolved
    status: resolved
    summary: Round 1 的三仓 wiki 来源绑定错误已关闭；三套 manifest、raw、live hash 与 wikilink fresh lint 均闭合。
  - id: STD-ADR-R2-003
    severity: medium
    disposition: resolved
    status: resolved
    summary: Round 1 的开发 CLI 本机路径与 working-tree metadata 已关闭；冻结 post-image 使用远端 URL 和精确 source commit。
  - id: STD-ADR-R2-004
    severity: low
    disposition: not-applicable
    status: not-applicable
    summary: 未发现合同漂移；开放 finding 仍属于既有 cross-repo-contract 与 release-semantics 影响面。
  - id: STD-ADR-R2-005
    severity: low
    disposition: not-applicable
    status: not-applicable
    summary: 未发现新增影响面；不需要把合同标记为 stale 或返回 Router 重新分级。
```

> 上述结构化 findings 按本轮任务要求使用 `resolved` disposition 表达 Round 1 finding 的关闭状态；正式维护审查 schema 持久化时应映射为原 disposition 加 `status: resolved`。

## 冻结候选与覆盖

- `review_mode`: `worktree`；`review_base_ref` 与 `merge_base` 均为 `37cc9257a0918eac187003c8f8098bfbaff2480b`。
- `candidate.bin` 以 `YSS-WORKTREE-CANDIDATE-V1\0` 开始，只有一个 `T` record；声明长度与 `tracked.diff` 均为 `758003` bytes，payload 逐字节相等，无尾随记录。
- `candidate.bin` fresh SHA-256 为 `1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8`，与 manifest 的完整 `candidate_digest` 一致；manifest 声明 `untracked_files: []`。
- 覆盖 parent staged worktree、`yss-harness-dev-agent` `f381ade..b7f7ad9`、`yss-strategic-design-harness` `73eeb8f..f2c5f58`、`create-yss-harness-dev` `32c6720..d76420b`，以及 `create-yss-strategic-design` stable-ref projection no-op 声明。
- 本轮只写本报告；未修改候选或实现，未 commit、未 push，也不批准发布。

## Standards findings

### STD-ADR-R2-001 — 战略设计 CLI 发布快照未被候选 digest 绑定（hard violation）

Round 1 的 `STD-ADR-002` 尚未关闭。新证据 `.template-source/evidence/maintenance/adr-retirement-design-cli-noop-sync-2026-08-31.md` 证明稳定源同步后的模板树 `snapshot_hash` 未变化，但它把“Git 工作树无差异”进一步解释为“快照 post-image 与已提交字节完全一致”，这一解释与战略 CLI 的仓库合同不符：

1. `create-yss-strategic-design` 的 commit `8e6bd3f905c46f85764781ac857020639448b20f` 没有跟踪 `template/`、`template.manifest.json` 或 `template.snapshot.json`；`.gitignore` 明确忽略三者。因此不存在可与 post-image 比较的“已提交快照字节”。
2. 同一 commit 的 `package.json.files` 明确把这三项纳入 npm 发布包，`prepack` 又执行 `npm run sync-template`。它们是实际发布字节，不是可忽略的本机缓存。
3. 本轮 stable-ref 同步后的 live `template.snapshot.json` 至少改变了 `requestedRef`、`templateCommit` 与 `generatedAt`；即使 profile 排除了本轮 ADR、wiki、`docs/adr/README.md` 和治理校验器而使模板树 hash 不变，发布 metadata 也不是 byte no-op。
4. 冻结 manifest 声明 `untracked_files: []`，aggregate `tracked.diff` 的 design CLI 段也没有 post-image。证据文件只记录一个 hash 和 live 工作树结论，不能替代 `candidate.bin` 对生成快照全部字节的捕获。

因此当前 digest 无法证明审查、`npm test` 与后续 `prepack` 使用同一战略 CLI 快照。应由 `worker.adr-retirement.2026-08-31` 在原合同路径修复候选绑定：把稳定 ref 生成的 design CLI 发布快照字节纳入新的不可变候选（或先调整仓库发布合同，使发布字节可由 commit 完整复现），再执行 fresh verification、重新冻结并全轴复审。本 finding 是既有 `cross-repo-contract` / `release-semantics` 下的 `violation`，不是 `drift` 或 `new_impacts`。

## 已关闭项与通过项

### Wiki 来源、hash 与链接 — resolved

- Parent、dev source、design source 三套 `.template-source/wiki` 均 fresh lint 通过，各 23 篇文章；manifest source hash 与各自 live path 闭合。
- 三套 advise 均为 `unreferencedRaws=0`、`suspects=0`；`adr-0002` source/sourceIds 与 raw 已退役，当前文章没有指向已删除 ADR 的 live 链接。
- dev/design manifest 不再复制 parent 的 source hash；它们分别反映各自模板源内容，关闭 Round 1 `STD-ADR-001`。

### 模板源 ADR、SSOT 与投影 — pass

- Parent、dev source、design source 的冻结 post-image 均无 Git 跟踪的 `.template-source/adr/*.md`；分别删除原有 13、14、13 个模板源 ADR。dev source 额外退役其独有的 `0015-create-yss-harness-instantiation-cli.md`。
- `.template-source/README.md` 将当前模板治理事实路由到对应 SSOT、maintenance checkpoint 或 roadmap；历史决策继续由 Git 历史和既有 evidence 审计。
- 仓库身份、生命周期、稳定 ID、技能完整性/路由、角色、DTO/OpenAPI 和实例分发等已生效事实仍由 `yss-project.yaml`、`AGENTS.md`、`CONTEXT.md`、结构化注册表、profile、合同与校验器承载。未发现活跃规则依赖已删除 ADR；历史 evidence 与 wiki append-only log 中的旧路径属于审计记录。
- `docs/adr/README.md` 与 `docs/templates/adr-template.md` 保留 `project-instance` 产品 ADR 能力；退役没有误删产品架构决策入口。
- 本轮未修改共享 skill，skills lock / projection 同步不触发；该项为 `not-applicable`，不是空白 mandatory row。

### `verify-governance-release` — pass

- Parent、dev source、design source 与开发 CLI 快照中的实现一致：仅在 `isTemplateSource(root)` 为真时检查 `.template-source/adr`，目录缺失或无 Markdown 时通过，发现顶层 `*.md` 时 fail closed。
- `scripts/verify-template` 调用该校验器；冻结 fresh verification 记录三仓验证通过，并记录加入 `9999-regression.md` 后按预期失败。该行为没有删除或阻断 `project-instance` 的 `docs/adr` 能力。

### 三个远端 commit 与开发 CLI metadata — resolved/pass

- `https://github.com/iloveZzz/yss-harness-dev-agent.git` 的远端 `main` 精确指向 `b7f7ad993760e2bb0bdf140a0daac92760f54837`。
- `https://github.com/iloveZzz/yss-strategic-design-harness.git` 的远端 `main` 精确指向 `f2c5f5878589667919f9000913743a288580ef46`。
- `https://github.com/iloveZzz/create-yss-harness-dev.git` 的远端 `main` 精确指向 `d76420bf391638f4ee78c811553c2becf3ef21f1`。
- 开发 CLI 的冻结 `template.snapshot.json` 使用 `templateRepository: https://github.com/iloveZzz/yss-harness-dev-agent.git`，且 `requestedRef` 与 `templateCommit` 均精确为 `b7f7ad993760e2bb0bdf140a0daac92760f54837`；active metadata 中无本机绝对路径或 `working-tree`。Round 1 的相关问题已关闭。
- 冻结候选中保留的 Round 1 failed candidate/evidence 含旧本机路径，是不可改写的历史失败证据，不等同于当前开发 CLI post-image。

## Fowler smell 基线

未发现需要单列的 judgment-call finding。跨三模板源同步相同治理校验逻辑是受控投影/跨仓合同变化，不据此认定 Duplicated Code 或 Shotgun Surgery；其余 Mysterious Name、Feature Envy、Data Clumps、Primitive Obsession、Repeated Switches、Divergent Change、Speculative Generality、Message Chains、Middle Man、Refused Bequest 未形成可操作 finding。

## 结论

审查结论：blocked。

Standards 轴共有 1 个 open `violation`、2 个 `resolved`、2 个 `not-applicable` 裁决；最严重问题是战略设计 CLI 的实际 npm 发布快照未进入冻结候选，候选 digest 不能绑定测试与发布字节。应返回 `worker.adr-retirement.2026-08-31` 修复并重新冻结；本报告不批准发布。
