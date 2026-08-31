# ADR 退役冻结候选 Spec 独立审查（Round 4）

- reviewer_id: `reviewer.adr-retirement.spec.r4.2026-08-31`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672`
- review_mode: `formal-independent`
- review_axis: `Spec`
- candidate_mode: `worktree`
- review_base_ref: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- merge_base: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- candidate_manifest: `.template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/candidate-manifest.yaml`
- candidate_snapshot: `.template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/candidate.bin`
- spec_sources: 用户授权顺序“模板子仓→CLI→父仓 gitlink”；`.template-source/evidence/maintenance/adr-retirement-l3-contract-2026-08-31.yaml`；Round 3 Spec 审查；Round 4 Reviewer 任务包

## 候选完整性

1. `candidate.bin` 共 `3839414` bytes，SHA-256 为完整 candidate digest `561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672`。
2. `yss-worktree-candidate-v1` 的唯一 tracked payload 共 `301869` bytes，SHA-256 为 `2c51a7b311481144fb9e0399523e1aefb69a334545c38903ed666be14e80fdd1`，与 `tracked.diff` 逐字节一致。
3. 候选包含 `761` 个按原始 path bytes 排序的 `U` record，全部为 regular file，其中 `733` 个 mode `100644`、`28` 个 mode `100755`。manifest 的 `untracked_files`、`untracked_path_bytes`、`untracked_content_refs` 与每条 record 的路径和内容 `761/761` 逐项一致。
4. 捕获的 `template.manifest.json` SHA-256 为 `261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c`；捕获的 `template.snapshot.json` SHA-256 为 `ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b`。snapshot metadata 的 `manifestHash` 与前者一致，`snapshotHash` 为 `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`。

## 覆盖与裁决

### 1. 用户授权顺序与四个远端稳定 commit

授权顺序满足“模板子仓→CLI→父仓 gitlink”：

1. 开发模板 `b7f7ad993760e2bb0bdf140a0daac92760f54837` 与战略设计模板 `f2c5f5878589667919f9000913743a288580ef46` 的提交时间均为 `2026-08-31T19:09:55+08:00`。
2. 开发 CLI 随后提交 `d76420bf391638f4ee78c811553c2becf3ef21f1`（`2026-08-31T19:13:15+08:00`）；战略设计 CLI 在修复可复现 prepack 后提交 `161a79e818ee17bef14f914d26ac698957dfea23`（`2026-08-31T19:49:25+08:00`）。
3. 父仓候选最后以 mode `160000` 把四个 gitlink 分别固定到上述四个 commit；候选不包含父仓 commit 或 push。
4. 独立读取四个公开远端的 `refs/heads/main`，均精确解析到对应完整 commit：
   - `https://github.com/iloveZzz/yss-harness-dev-agent.git` → `b7f7ad993760e2bb0bdf140a0daac92760f54837`
   - `https://github.com/iloveZzz/yss-harness-design-agent.git` → `f2c5f5878589667919f9000913743a288580ef46`
   - `https://github.com/iloveZzz/create-yss-harness-dev.git` → `d76420bf391638f4ee78c811553c2becf3ef21f1`
   - `https://github.com/iloveZzz/create-yss-harness-design.git` → `161a79e818ee17bef14f914d26ac698957dfea23`

该项符合 Spec，未发现先改父仓 gitlink、浮动分支绑定、本机绝对路径或未推送 child commit。

### 2. design CLI 可复现 prepack 与 761 个发布 post-image

在隔离临时目录从 `create-yss-harness-design` commit `161a79e818ee17bef14f914d26ac698957dfea23` 导出 tracked tree，以固定公开模板来源 `https://github.com/iloveZzz/yss-harness-design-agent.git#f2c5f5878589667919f9000913743a288580ef46` 连续执行 `npm pack --dry-run`：

- 两次执行均为 exit `0`；执行前后 `template.snapshot.json` SHA-256 始终为 `ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b`。
- `generatedAt` 稳定为模板 commit 的提交时间 `2026-08-31T11:09:55.000Z`，不再读取墙钟时间。
- 隔离 prepack 生成的 `template.manifest.json`、`template.snapshot.json` 与 `template/` 下 `759` 个文件，共 `761/761` 个发布 post-image，逐字节等于冻结候选的 761 个 `U` record。

因此来源、prepack 测试结果与冻结发布 post-image 已形成可重复的同一字节链；Round 3 后暴露的墙钟时间漂移已关闭。

### 3. ADR 全量退役与实例 ADR 边界

候选在父仓、开发模板源、战略设计模板源分别删除 `13`、`14`、`13` 个实时 `.template-source/adr/*.md`，开发模板源额外删除 profile 专属 ADR-0015；没有新增实时治理 ADR。三个模板源的 `verify-governance-release` 都改为允许目录缺失或为空、拒绝重新引入任意 Markdown 治理 ADR，wiki 的 `adr-0002` live/raw 映射也已退役。

冻结的战略设计 CLI post-image 不包含任何 `.template-source/**` 或 `.template-source/adr/**`，但明确包含 `template/docs/adr/README.md`，其作用是保留 `project-instance` 的产品 ADR 入口。该实际边界符合 `CONTEXT.md`：退役的是 `template-source` 实时治理 ADR，不是产品实例 ADR 能力。

但是，同一冻结候选中的 `.template-source/evidence/maintenance/adr-retirement-design-cli-noop-sync-2026-08-31.md` 明确声称“`docs/adr/README.md` 也未进入该窄 profile”。该陈述与 manifest、candidate bytes 及独立 prepack 的共同结果直接冲突，把应保留的产品实例 ADR 边界写反。详见 finding `SPEC-ADR-R4-001`。

### 4. 旧 CLI 边界

本轮两个目标 CLI 是 `create-yss-harness-dev` 与包名 `create-yss-harness-design`。候选对战略设计模板中的历史 `create-yss-spec` 合同增加了明确历史边界，并未把旧 `create-yss-spec` 的快照、测试或发布状态纳入本轮完成结论。既有 `root:staff`、mode `700` 环境说明只解释旧 CLI 未重建，不豁免两个目标 CLI 的稳定来源、测试和发布 post-image 要求。

因此旧 CLI 对本轮保持 `not-applicable`；本审查不推断其可发布，也不批准任何 CLI 发布。

## 结构化 findings

```yaml
findings:
  - id: SPEC-ADR-R4-001
    disposition: violation
    severity: blocking
    requirement: "ADR 退役证据必须准确区分 template-source 实时治理 ADR 与 project-instance 产品 ADR 入口，并与冻结发布 post-image 一致。"
    location: ".template-source/evidence/maintenance/adr-retirement-design-cli-noop-sync-2026-08-31.md（冻结 tracked.diff 中新增正文）"
    observed: "证据声称 docs/adr/README.md 未进入战略设计窄 profile。"
    contradiction:
      - "candidate manifest 的 761 个 untracked_files 明确包含 submodules/create-yss-strategic-design/template/docs/adr/README.md。"
      - "candidate.bin 对应 U record 与该 content ref 逐字节一致。"
      - "从稳定 CLI/template commit 隔离执行 npm pack --dry-run 后，761/761 生成文件与冻结 post-image 逐字节一致，结果同样包含 template/docs/adr/README.md。"
    impact: "冻结候选的实现字节实际保留了正确的 project-instance ADR 入口，但正式跨仓证据把该边界写反，不能作为全部 ADR 退役与实例能力保留的可信发布证据。"
    required_resolution: "由实现者修正证据为：.template-source/adr/** 和模板源治理资产不进入 profile，而 docs/adr/README.md 作为 project-instance 产品 ADR 入口保留；随后重新执行相关验证、重新捕获完整候选 digest，并重跑全部独立审查轴。"
```

```yaml
drift: false
new_impacts: []
```

## 结论

**审查结论：blocked。** 完整候选 digest、授权顺序、四个远端稳定 commit、design CLI 可复现 prepack、`761/761` 发布 post-image、三仓实时治理 ADR 删除及旧 CLI 范围本身均已核验；但候选内存在 `1` 项 blocking `violation`：正式 no-op 同步证据与冻结 post-image 对 `docs/adr/README.md` 的分发事实相反。按 L3 finding 闭环，必须返回 `worker.adr-retirement.2026-08-31` 修正证据并重新冻结，当前候选不能取得 Spec 轴通过结论。本审查不批准发布，也不包含 commit/push 授权。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
workflow_reference: work-unit.intensity-aware-review
task_id: adr-retirement-spec-review-round4-2026-08-31
actor_id: reviewer.adr-retirement.spec.r4.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
skill: code-review
execution_state: Reviewer
status: blocked
candidate_digest: 561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672
changed_files:
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round4-2026-08-31.md
evidence_refs:
  - .template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/candidate-manifest.yaml
  - .template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/candidate.bin
  - .template-source/evidence/maintenance/reviews/candidates/561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672/tracked.diff
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round4-2026-08-31.md
actual_verification:
  - "candidate.bin sha256 == 561572f0ee4b360d478dae73a483422982225a35a5b9474b35842fe2d5466672"
  - "candidate.bin tracked payload byte-equal to tracked.diff; tracked sha256 == 2c51a7b311481144fb9e0399523e1aefb69a334545c38903ed666be14e80fdd1"
  - "761/761 untracked path bytes and content refs byte-equal to candidate U records"
  - "b7f7ad993760e2bb0bdf140a0daac92760f54837、f2c5f5878589667919f9000913743a288580ef46、d76420bf391638f4ee78c811553c2becf3ef21f1、161a79e818ee17bef14f914d26ac698957dfea23 均与对应公开远端 main 一致"
  - "隔离连续 npm pack --dry-run exit 0；snapshot sha256 两次均为 ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b"
  - "隔离 prepack 结果与冻结发布 post-image 761/761 逐字节一致"
  - "parent/dev-source/design-source live ADR deletions == 13/14/13"
deferred_seams: []
drift: false
new_impacts: []
findings:
  - { id: SPEC-ADR-R4-001, disposition: violation, severity: blocking }
next_route: worker.adr-retirement.2026-08-31
```
