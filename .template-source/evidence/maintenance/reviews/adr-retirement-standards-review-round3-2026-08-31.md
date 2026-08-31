# ADR 全量退役 Standards 正式独立审查（Round 3）

```yaml
schema_version: 1
record_kind: maintenance-independent-review
review_mode: formal-independent
review_axis: Standards
status: changes-requested
workflow_status: blocked
reviewer_id: reviewer.adr-retirement.standards.r3.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
candidate_digest: e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92
candidate_manifest_ref: .template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/candidate-manifest.yaml
candidate_snapshot_ref: .template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/candidate.bin
task_package_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-task-round3-2026-08-31.yaml
review_report_ref: .template-source/evidence/maintenance/reviews/adr-retirement-standards-review-round3-2026-08-31.md
reviewed_at: '2026-08-31T11:43:16Z'
findings:
  - id: STD-ADR-R3-001
    severity: high
    disposition: violation
    status: open
    summary: Round 2 finding 仅关闭候选遗漏 761 个 ignored 发布文件的部分；prepack 会重新生成带新 generatedAt 的 metadata，且无显式环境变量时还会退回本地 sibling 与 HEAD，因此发布 post-image 不能与测试及候选 post-image 保持逐字节同一。
  - id: STD-ADR-R3-002
    severity: medium
    disposition: resolved
    status: resolved
    summary: 战略设计 CLI 的 template/ 759 个文件与两个 metadata 文件已作为 761 个规范 U record 逐字节进入 candidate.bin，候选容器、manifest、capture 对象和当前测试 post-image 完全闭合。
  - id: STD-ADR-R3-003
    severity: medium
    disposition: resolved
    status: resolved
    summary: 候选中的战略设计 CLI metadata 已绑定远端稳定 commit f2c5f5878589667919f9000913743a288580ef46，manifestHash 与 snapshotHash 均和捕获字节闭合。
  - id: STD-ADR-R3-004
    severity: medium
    disposition: resolved
    status: resolved
    summary: SSOT、三套 wiki、治理 validator、开发 CLI metadata 与三个 pushed commit 复核通过。
  - id: STD-ADR-R3-005
    severity: low
    disposition: not-applicable
    status: not-applicable
    summary: 未发现合同 drift 或 new_impacts；开放问题仍属于既有 cross-repo-contract 与 release-semantics 影响面。
```

## 冻结候选与审查边界

- `review_mode` 为 `worktree`；`review_base_ref` 与 `merge_base` 均为 `37cc9257a0918eac187003c8f8098bfbaff2480b`。
- `candidate.bin` fresh SHA-256 为 `e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92`，与 manifest 的完整 `candidate_digest` 一致。
- `candidate.bin` 使用 `YSS-WORKTREE-CANDIDATE-V1\0` framing：一个 `T` record，payload 为 `1990756` bytes，与 `tracked.diff` 逐字节相等；随后为 `761` 个严格按 raw path bytewise 排序的 `U` record，无未知 record、截断或尾随字节。
- 761 个 `U` record 全部为 regular file；raw path、`lstat` mode、content reference 与 manifest 一一对应。逐项比较结果为 path mismatch `0`、mode mismatch `0`、capture-content mismatch `0`、当前 ignored post-image mismatch `0`。
- 本轮只审查该 manifest 固定的候选及其引用字节；未修改候选或实现，未 commit、未 push，也不批准发布。

## Standards findings

### STD-ADR-R3-001 — 发布 prepack 会改写已审查的战略设计 CLI post-image（hard violation）

Round 2 的开放 finding 只被部分关闭。新候选已经完整捕获战略设计 CLI 的 ignored 生成物，但仍不能证明测试、候选和发布 post-image 为同一字节：

1. `submodules/create-yss-strategic-design/package.json` 把 `template/`、`template.manifest.json`、`template.snapshot.json` 明确列入 npm `files`，同时把 `pretest` 和 `prepack` 都定义为 `npm run sync-template`。因此发布打包不是消费冻结后的 761 个字节对象，而是再次运行生成器。
2. `scripts/sync-template.js` 每次都以 `generatedAt: new Date().toISOString()` 构造 `template.snapshot.json`。候选捕获的值固定为 `2026-08-31T11:14:28.911Z`；任何后续 `prepack` 即使使用同一远端和同一 commit，也必然产生不同的 metadata 字节，从而改变 candidate digest 所覆盖的发布 post-image。
3. 生成器默认先选择存在的 sibling `../yss-strategic-design-harness`，本地源又把 `templateRef` 设为 `HEAD`。只有显式传入 `YSS_STRATEGIC_DESIGN_TEMPLATE_REPO` 与 `YSS_STRATEGIC_DESIGN_TEMPLATE_REF`，才会得到候选中的远端 URL 和 40 位 requested ref。当前发布证据没有固定 `prepack` 环境的可执行合同。
4. fresh verification 记录了固定远端下的 `npm test` 5/5，但没有战略设计 CLI 的 `npm pack --dry-run`、包内 761 文件复核或 pack 后 digest。仓库的跨仓发布规范明确要求固定 commit 的 `npm test` 与 `npm pack --dry-run`，所以缺失项不能由候选容器自洽替代。

结论是：测试结束后的 post-image 与本候选已闭合，但发布 `prepack` 的 post-image尚未闭合。应由 `worker.adr-retirement.2026-08-31` 在原合同路径修复：让发布消费可复现且不被 `prepack` 改写的冻结字节，或提供确定性 metadata 与强制远端固定 ref 的生成合同；随后执行固定 commit 的测试和实际 pack、核验包内 post-image、重新冻结候选并全轴复审。本 finding 仍是既有 `cross-repo-contract` / `release-semantics` 下的 `violation`，不是 `drift` 或 `new_impacts`。

## Round 2 finding 的已关闭部分

### 761 个 ignored 发布文件进入候选 — resolved

- manifest 精确列出 `759` 个 `template/` 文件及 `template.manifest.json`、`template.snapshot.json`，合计 `761` 个文件。
- 761 个文件的内容、路径字节与 mode 均已进入 `candidate.bin` 的规范 `U` record，并分别保存为 761 个 `untracked-content` 对象；逐字节复核无差异。
- `template.manifest.json` SHA-256 为 `261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c`，与 `template.snapshot.json.manifestHash` 相同。
- `template/` tree hash 为 `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`，与 `template.snapshot.json.snapshotHash` 相同。

### 战略设计 CLI 稳定来源 metadata — resolved

- 候选 metadata 的 `templateRepository` 为 `https://github.com/iloveZzz/yss-harness-design-agent.git`。
- `requestedRef` 与 `templateCommit` 均为完整 SHA `f2c5f5878589667919f9000913743a288580ef46`，没有本机绝对路径或 `working-tree`。
- `git ls-remote` 显示 metadata URL 与子仓当前远端 URL 的 `refs/heads/main` 均精确指向该 commit。名称兼容映射不改变 commit identity。

## SSOT、wiki、validator 与开发 CLI 复核

### SSOT 与 ADR 边界 — pass

- `.template-source/README.md` 把模板治理决策路由到现行 SSOT、维护 checkpoint 或 roadmap，并明确不再维护 `.template-source/adr/*.md`；历史决策由 Git 历史和 evidence 审计。
- `AGENTS.md` 继续分别指定仓库身份、生命周期注册表、维护强度、技能 lock/registry 与数字人角色注册表的事实所有权；未发现用退役 ADR 复制定义活跃规则。
- `docs/adr/README.md` 与 `docs/templates/adr-template.md` 保留 `project-instance` 的产品 ADR 能力，没有把模板源 ADR 退役错误扩大到产品架构决策。

### 三套 wiki — pass

- Parent、`yss-harness-dev-agent`、`yss-strategic-design-harness` 的 fresh `lint-wikilinks.mjs` 均通过，各 23 篇文章；链接计数分别为 204、191、204。
- 三套 `.wiki-manifest.json` 分别有 16、18、16 个 source，均无指向退役 `.template-source/adr` 或 `adr-*` raw 的 source。
- 三套 fresh advise 均为 `unreferencedRaws=[]`、`suspects=[]`。`oneWayLinks` 与 `missingTermPages` 是建议项，不是本次 ADR 退役闭合错误。

### 治理 validator — pass

- Parent、两个模板源及开发 CLI 快照中的 `scripts/verify-governance-release` SHA-256 均为 `7d7d23d09bb86ad55ff159dc648ed1f1be51649a9a503fae80a724590c0d15bd`。
- 校验器只在 `isTemplateSource(root)` 为真时检查 `.template-source/adr`；目录不存在或没有顶层 Markdown 时通过，存在 `*.md` 时 fail closed。两个模板源中该 ignored 目录只剩 `.DS_Store`，没有绕过校验的 Markdown。
- Reviewer fresh 执行父仓 `scripts/verify-template` 与 `git diff --check`，退出码均为 `0`。这证明现有门禁通过，但不覆盖战略设计 CLI 缺失的 pack post-image 同一性。

### 开发 CLI 与三个 pushed commit — pass

- 开发 CLI commit `d76420bf391638f4ee78c811553c2becf3ef21f1` 中的 `template.snapshot.json` 使用远端 `https://github.com/iloveZzz/yss-harness-dev-agent.git`，且 `requestedRef`、`templateCommit` 均为 `b7f7ad993760e2bb0bdf140a0daac92760f54837`。其 manifest hash `59dec8ccf234c51874c2c401df410dbd6c2d3a5fc2acbdf998f440b995375cf5` 与 tree hash `5a72e02fb22e080b97263f8562818e62f8beea53e9837805c4b6f5a6db062d40` 均闭合。
- `https://github.com/iloveZzz/yss-harness-dev-agent.git` 的远端 `main` 精确为 `b7f7ad993760e2bb0bdf140a0daac92760f54837`；该 commit 的 parent 为 `f381adeb0147472fd5829c097153c1a15450c30e`。
- `https://github.com/iloveZzz/yss-strategic-design-harness.git`（以及 metadata 使用的兼容 URL）的远端 `main` 精确为 `f2c5f5878589667919f9000913743a288580ef46`；该 commit 的 parent 为 `73eeb8f432cbbf2629552faa2bf71763c0a757fa`。
- `https://github.com/iloveZzz/create-yss-harness-dev.git` 的远端 `main` 精确为 `d76420bf391638f4ee78c811553c2becf3ef21f1`；该 commit 的 parent 为 `32c6720ebb081faffc29710c53cce31fbd532e56`。
- `tracked.diff` 使用相同三个 commit range，并保留 design CLI `8e6bd3f905c46f85764781ac857020639448b20f` 的 tracked no-op 边界；其 ignored 发布字节由本候选的 761 个 `U` record 补齐。

## Specialist 与 smell 基线

- 本候选是模板治理、Node 校验器、wiki 与 CLI 发布语义变更，不涉及 Java 后端或生产 UI；Alibaba Java、YSS Backend、YSS Frontend 与 UI fidelity 均为 `not-applicable`，不是空白适用行。
- 未发现需要单列的 Fowler judgment-call finding。三仓相同 validator 是受控跨仓投影，不据此认定 Duplicated Code 或 Shotgun Surgery；其余 smell 未形成可操作 finding。

## 结论

审查结论：blocked。

Standards 轴共有 1 个 open `violation`、3 个 `resolved`、1 个 `not-applicable` 裁决。最严重问题是战略设计 CLI 的候选虽然已经完整捕获测试后的 761 个发布文件，但 `prepack` 会重新生成非确定性 metadata，实际发布 post-image 尚未与候选 digest 绑定。应返回 `worker.adr-retirement.2026-08-31` 修复并重新冻结；本报告不批准发布。
