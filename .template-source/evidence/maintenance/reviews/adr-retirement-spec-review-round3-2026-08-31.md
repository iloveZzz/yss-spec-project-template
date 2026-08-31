# ADR 退役冻结候选 Spec 独立审查（Round 3）

- reviewer_id: `reviewer.adr-retirement.spec.r3.2026-08-31`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92`
- review_mode: `formal-independent`
- review_axis: `Spec`
- candidate_mode: `worktree`
- review_base_ref: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- candidate_snapshot: `.template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/candidate.bin`
- spec_sources: 用户明确授权顺序“模板子仓→CLI→父仓 gitlink”；`.template-source/evidence/maintenance/adr-retirement-l3-contract-2026-08-31.yaml`；Round 2 finding `SPEC-ADR-R2-001`；Round 3 Reviewer 任务包

## 候选完整性

1. `candidate.bin` 共 `5528301` bytes，SHA-256 为完整 candidate digest `e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92`。
2. `yss-worktree-candidate-v1` 的唯一 tracked payload 共 `1990756` bytes，与 `tracked.diff` 逐字节一致。
3. 候选包含 `761` 个按原始 path bytes 排序的 `U` record，全部为 regular file；manifest 的 `untracked_files`、`untracked_path_bytes`、`untracked_content_refs` 与每条 record 的路径和内容逐项一致。其范围恰为战略设计 CLI 的 `template.manifest.json`、`template.snapshot.json` 与 `template/` 下 `759` 个生成文件。
4. 捕获的 `template.manifest.json` SHA-256 为 `261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c`，与捕获 snapshot metadata 的 `manifestHash` 一致。按稳定 CLI commit `8e6bd3f905c46f85764781ac857020639448b20f` 中 `treeHash` 规则仅从捕获字节重算 `template/`，得到 `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`，与 `snapshotHash` 及无差异同步证据一致。

## 覆盖与裁决

1. **Round 2 finding 已关闭。** `SPEC-ADR-R2-001` 要求把战略设计 CLI 被 `.gitignore` 排除的 generated post-image 纳入新候选 digest。当前候选不仅列出路径，还把 metadata、manifest 和全部 `template/` 内容以 `U` record 逐字节纳入 digest；重算后的 `manifestHash`、`snapshotHash` 均与捕获 metadata 及同步证据一致。捕获的 `template.snapshot.json` 将 `templateRepository` 固定为 `https://github.com/iloveZzz/yss-harness-design-agent.git`，并将 `requestedRef`、`templateCommit` 同时固定为 `f2c5f5878589667919f9000913743a288580ef46`。无差异同步证据以同一 source commit 和同一 snapshot hash 记录同步后 `npm test` 5/5，通过后形成的 post-image即本候选捕获字节，因此来源、被测试快照与待发布快照已建立可重算的同一快照链。
2. **授权顺序满足“模板子仓→CLI→父仓 gitlink”。** 两个模板源 commit `b7f7ad993760e2bb0bdf140a0daac92760f54837`、`f2c5f5878589667919f9000913743a288580ef46` 先形成，且本地 `origin/main` 分别精确指向二者；开发 CLI 随后以稳定模板 commit 生成并提交 `d76420bf391638f4ee78c811553c2becf3ef21f1`，其 `origin/main` 也精确指向该 commit。战略设计 CLI 在稳定来源同步后为 byte no-op，继续绑定已推送的 `8e6bd3f905c46f85764781ac857020639448b20f`，无需制造空提交。最后，父仓候选才把开发模板源、战略设计模板源和开发 CLI 三个发生变化的 gitlink 暂存到上述 commit；战略设计 CLI 因 tracked no-op 保持原 gitlink `8e6bd3f...`。候选不包含父仓 commit/push。
3. **稳定 commit 绑定满足。** 开发 CLI tracked snapshot 将公开 Git URL、`requestedRef`、`templateCommit` 固定到 `b7f7ad993760e2bb0bdf140a0daac92760f54837`；战略设计 CLI captured snapshot 将三项来源 metadata 固定到 `f2c5f5878589667919f9000913743a288580ef46`。两者均无本机绝对路径、`working-tree` 或浮动分支引用。
4. **ADR 全量退役满足。** 冻结 tracked diff 在 parent、开发模板源、战略设计模板源分别删除 `13`、`14`、`13` 个实时 `.template-source/adr/*.md`，开发模板源额外退役 profile 专属 ADR-0015；没有新增实时治理 ADR。三套 `verify-governance-release` 均改为允许目录缺失或为空、拒绝重新引入任意 Markdown 治理 ADR；三套 wiki 退役 `adr-0002` live/raw 映射并改引当前 SSOT。`docs/adr/README.md` 继续保留 `project-instance` 产品 ADR 能力；战略设计 CLI 捕获的窄 profile post-image也保留该实例入口，同时未分发 `.template-source/**`。旧 ADR 文本仅存在于历史 review/evidence 和旧候选内容中，不构成 live ADR 回流。
5. **旧 CLI 边界满足。** 本轮目标只覆盖 `create-yss-harness-dev` 与包名 `create-yss-harness-design`；候选没有把旧 `create-yss-spec` 纳入完成或发布结论。既有 `root:staff`、mode `700` 环境例外只解释为何不重建旧 CLI，不豁免两个目标 CLI 的稳定来源、测试或候选绑定要求。因此旧 CLI 对本轮保持 `not-applicable`，其发布状态没有被本审查推断。
6. **跨仓影响面无扩张。** 当前候选仍落在合同既有 `core-validator`、`release-semantics`、`cross-repo-contract`、`aggregate-behavior-change` 影响面；未发现新的 UI、API、数据或运行时代码影响，也未发现候选越出授权范围。

## 结构化 findings

```yaml
findings:
  - id: SPEC-ADR-R3-001
    disposition: resolved
    severity: non-blocking
    closes: SPEC-ADR-R2-001
    requirement: "战略设计 CLI ignored generated post-image 必须逐字节纳入完整候选 digest，并证明来源、测试和待发布的是同一快照。"
    evidence:
      - "candidate.bin SHA-256 == e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92。"
      - "761 个 U record 与 manifest path/content refs 逐项相等，其中 template/ 共 759 个文件。"
      - "manifestHash 重算为 261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c；template/ treeHash 重算为 be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635，均与 captured metadata 一致。"
      - "captured metadata、无差异同步证据与 5/5 测试共同绑定公开来源及 f2c5f5878589667919f9000913743a288580ef46。"
  - id: SPEC-ADR-R3-002
    disposition: resolved
    severity: non-blocking
    requirement: "授权顺序必须为模板子仓→CLI→父仓 gitlink，且所有可发布来源绑定稳定已推送 commit。"
    evidence: "两个模板 commit 先于开发 CLI commit；四个相关 child HEAD 均与各自 origin/main 一致；父仓候选最后更新三个实际变化的 gitlink，战略设计 CLI 因 byte no-op 保持 8e6bd3f。"
  - id: SPEC-ADR-R3-003
    disposition: resolved
    severity: non-blocking
    requirement: "全量退役 template-source 实时治理 ADR，同时保留当前 SSOT、历史审计和 project-instance 产品 ADR 能力。"
    evidence: "三仓分别删除 13/14/13 个 live ADR，validator 反向阻断重新引入，wiki 映射退役，captured CLI post-image 保留 docs/adr/README.md 产品实例边界。"
  - id: SPEC-ADR-R3-004
    disposition: not-applicable
    severity: non-blocking
    requirement: "旧 create-yss-spec 不属于本轮两个目标 CLI 的发布范围。"
    evidence: "候选与验证结论均未把旧 CLI 纳入完成或发布声明；环境例外没有替代目标 CLI 门禁。"
```

```yaml
drift: false
new_impacts: []
```

## 结论

**审查结论：pass。** Round 2 唯一 blocking finding `SPEC-ADR-R2-001` 已由完整、可重算的 ignored generated post-image 字节链关闭；本轮共 `3` 项 `resolved`、`1` 项 `not-applicable`，无 `violation`、`drift` 或 `new_impacts`。授权顺序、稳定 commit 绑定、ADR 全量退役与旧 CLI 边界均符合 Spec。本结论仅为 Spec 轴独立审查通过，不批准发布，也不包含 commit/push 授权。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
workflow_reference: work-unit.intensity-aware-review
task_id: adr-retirement-spec-review-round3-2026-08-31
actor_id: reviewer.adr-retirement.spec.r3.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
skill: code-review
execution_state: Reviewer
status: completed
candidate_digest: e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92
changed_files:
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round3-2026-08-31.md
evidence_refs:
  - .template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/candidate-manifest.yaml
  - .template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/candidate.bin
  - .template-source/evidence/maintenance/reviews/candidates/e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92/tracked.diff
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round3-2026-08-31.md
actual_verification:
  - "candidate.bin sha256 == e059d1ad835b964c6bb720be9173adfc72ba244f4a894276b932b98837226b92"
  - "candidate.bin tracked payload byte-equal to tracked.diff"
  - "761/761 untracked path bytes and content refs byte-equal to candidate U records"
  - "captured manifest sha256 == snapshot manifestHash == 261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c"
  - "captured template treeHash == snapshotHash == be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635"
  - "b7f7ad9、f2c5f58、d76420b、8e6bd3f 均与对应本地 origin/main 一致"
  - "parent/dev-source/design-source live ADR deletions == 13/14/13"
deferred_seams: []
drift: false
new_impacts: []
findings:
  - { id: SPEC-ADR-R3-001, disposition: resolved, closes: SPEC-ADR-R2-001 }
  - { id: SPEC-ADR-R3-002, disposition: resolved }
  - { id: SPEC-ADR-R3-003, disposition: resolved }
  - { id: SPEC-ADR-R3-004, disposition: not-applicable }
next_route: reviewer.adr-retirement.lead.r3.2026-08-31
```
