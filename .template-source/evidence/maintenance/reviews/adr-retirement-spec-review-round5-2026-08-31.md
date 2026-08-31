# ADR 退役冻结候选 Spec 独立审查（Round 5）

- reviewer_id: `reviewer.adr-retirement.spec.r5.2026-08-31`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808`
- review_mode: `formal-independent`
- review_axis: `Spec`
- candidate_mode: `worktree`
- review_base_ref: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- merge_base: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- candidate_manifest: `.template-source/evidence/maintenance/reviews/candidates/125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808/candidate-manifest.yaml`
- candidate_snapshot: `.template-source/evidence/maintenance/reviews/candidates/125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808/candidate.bin`
- task_package: `.template-source/evidence/maintenance/reviews/adr-retirement-spec-review-task-round5-2026-08-31.yaml`
- reviewed_at: `2026-08-31T12:24:28Z`

## 候选完整性

1. `candidate.bin` 共 `3839546` bytes，SHA-256 为完整 candidate digest `125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808`。
2. `yss-worktree-candidate-v1` tracked payload 共 `302001` bytes，SHA-256 为 `ed7cf2e7acfd8fcb617434a58d9f14361aca96e2e182950b115b00ed501872c1`，与 `tracked.diff` 逐字节一致。
3. 候选包含 `761` 个按原始 path bytes 排序的 `U` record，全部为 regular file，其中 `733` 个 mode `100644`、`28` 个 mode `100755`。manifest 的 `untracked_files`、`untracked_path_bytes`、`untracked_content_refs` 与 candidate records `761/761` 逐项一致。
4. 与 Round 4 候选相比，`761` 个发布 post-image record 完全相同；tracked payload 只修正 `adr-retirement-design-cli-noop-sync-2026-08-31.md` 与 fresh verification 中关于战略设计 profile 的证据陈述。

## Round 4 finding 关闭复核

`SPEC-ADR-R4-001` 已关闭。修正后的冻结证据明确声明：战略设计 profile 不分发 `.template-source/adr/**`、模板源治理 README、wiki 与治理校验脚本，但会分发 `docs/adr/README.md`，后者保留 `project-instance` 产品 ADR 入口。candidate manifest 的发布 post-image 同时满足：

- `.template-source/**` 路径为 `0` 个；
- `template/docs/adr/README.md` 为 `1` 个，且内容声明该目录仅供 `project-instance` 记录产品自身架构决策；
- fresh verification 使用相同边界表述，不再声称 `docs/adr/README.md` 未进入 profile。

叙述证据、manifest 路径和冻结内容现已一致，Round 4 的 blocking contradiction 不再存在。

## Spec 全轴复核

### 1. 用户授权顺序与稳定 commit

授权顺序满足“模板子仓 → CLI → 父仓 gitlink”：

1. 开发模板 `b7f7ad993760e2bb0bdf140a0daac92760f54837` 与战略设计模板 `f2c5f5878589667919f9000913743a288580ef46` 的 committer date 均为 `2026-08-31T19:09:55+08:00`。
2. 开发 CLI `d76420bf391638f4ee78c811553c2becf3ef21f1` 的 committer date 为 `2026-08-31T19:13:15+08:00`；战略设计 CLI `161a79e818ee17bef14f914d26ac698957dfea23` 的 committer date 为 `2026-08-31T19:49:25+08:00`。
3. 父仓冻结 diff 最后以 mode `160000` 将四个 gitlink 固定到上述完整 commit；本候选不包含父仓 commit 或 push。
4. 独立执行 `git ls-remote` 时，四个公开远端 `refs/heads/main` 分别精确解析到上述四个 commit。未发现浮动来源、本机路径或未推送 child commit。

### 2. 可复现发布 post-image

从战略设计 CLI commit `161a79e818ee17bef14f914d26ac698957dfea23` 的 tracked tree 在隔离临时目录运行两次 `npm pack --dry-run`，模板来源固定为 `https://github.com/iloveZzz/yss-harness-design-agent.git#f2c5f5878589667919f9000913743a288580ef46`：

- 两次命令均 exit `0`；`template.snapshot.json` SHA-256 两次均为 `ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b`；
- `template.manifest.json` SHA-256 为 `261d5abe38f5d200c588d38d6a573a512f7d075a51bd5e7468683d6a79234e6c`；snapshot metadata 的 `manifestHash` 与其一致，`snapshotHash` 为 `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`；
- `generatedAt` 固定为模板 commit 时间 `2026-08-31T11:09:55.000Z`；
- 隔离生成的 `template.manifest.json`、`template.snapshot.json` 与 `template/` 下 `759` 个文件，共 `761/761` 个路径和文件字节，全部等于冻结 candidate records。

因此稳定来源、生成器行为、prepack 与冻结发布 post-image 构成同一条可复现字节链。

### 3. ADR 全量退役与实例 ADR 边界

冻结 tracked diff 在父仓、开发模板源、战略设计模板源分别删除 `13`、`14`、`13` 个实时 `.template-source/adr/*.md`，没有新增或修改实时治理 ADR；开发模板源额外删除 profile 专属 ADR-0015。三个仓库的治理校验逻辑均允许 ADR 目录缺失或为空，并拒绝重新引入任意 Markdown 治理 ADR；三个 wiki 的 `adr-0002` live/raw 映射均退役。

冻结战略设计 CLI post-image 不包含 `.template-source/**`，但保留 `template/docs/adr/README.md`。这准确区分了已退役的 `template-source` 实时治理 ADR 与仍可用的 `project-instance` 产品 ADR 能力，符合 `CONTEXT.md` 的仓库身份和分发面边界。

### 4. 旧 CLI 边界

本轮发布目标仅为 `create-yss-harness-dev` 与包名 `create-yss-harness-design`。候选中新增的 `create-yss-spec` 表述均将其标识为全生命周期模板的历史或外部 CLI，并明确本战略设计 Harness 不使用、不履行该历史契约。冻结候选未修改旧 `submodules/create-yss-spec` gitlink，也未把其快照、测试或发布状态纳入完成结论。

旧 CLI 因 `root:staff`、mode `700` 未重建的说明只陈述环境边界，不豁免两个目标 CLI 的稳定来源与发布 post-image 要求。旧 CLI 对本轮为 `not-applicable`；本审查不推断其可发布。

## 验证结果

- `scripts/verify-digital-human-task-package .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-task-round5-2026-08-31.yaml`：exit `0`。
- `scripts/verify-template`：exit `0`。
- `git diff --check`：exit `0`。
- completion 边界重新计算 `candidate.bin` SHA-256：仍为 `125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808`。

## 结构化 findings

当前候选没有 open finding；Round 4 finding 的关闭记录如下：

```yaml
reviewer_id: reviewer.adr-retirement.spec.r5.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
candidate_digest: 125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808
review_status: pass
findings:
  - id: SPEC-ADR-R4-001
    severity: high
    disposition: violation
    status: resolved
    summary: 修正后的冻结证据、fresh verification 与 761 个发布 post-image 一致确认 docs/adr/README.md 进入战略设计 profile，并保留 project-instance 产品 ADR 入口。
open_findings: []
drift: false
new_impacts: []
```

## 结论

**审查结论：pass。** Round 4 的证据陈述 finding 已关闭；本轮对授权顺序、四个远端稳定 commit、可复现 prepack 与 `761/761` 发布 post-image、三仓实时治理 ADR 全量退役、`project-instance` ADR 入口保留及旧 CLI 边界的全轴复核均通过。Spec 轴无 open finding、无 drift、无 new impacts。

该 `pass` 仅表示当前冻结候选通过 Round 5 Spec 独立审查，不构成 `gate.release-ready`、CLI 发布、父仓 commit 或 push 的批准。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
workflow_reference: work-unit.intensity-aware-review
task_id: adr-retirement-spec-review-round5-2026-08-31
actor_id: reviewer.adr-retirement.spec.r5.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
skill: code-review
execution_state: Reviewer
status: pass
candidate_digest: 125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808
changed_files:
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round5-2026-08-31.md
evidence_refs:
  - .template-source/evidence/maintenance/reviews/candidates/125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808/candidate-manifest.yaml
  - .template-source/evidence/maintenance/reviews/candidates/125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808/candidate.bin
  - .template-source/evidence/maintenance/reviews/candidates/125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808/tracked.diff
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round5-2026-08-31.md
actual_verification:
  - candidate.bin sha256 与完整 candidate_digest 一致
  - tracked payload 与 tracked.diff 逐字节一致
  - 761/761 untracked path bytes 与 content refs 一致
  - 四个公开远端 main 与候选固定 commit 一致
  - 两次隔离 npm pack --dry-run exit 0 且 snapshot SHA-256 稳定
  - 隔离 prepack 结果与冻结发布 post-image 761/761 逐字节一致
  - parent/dev-source/design-source live ADR deletions == 13/14/13
  - scripts/verify-template exit 0
  - git diff --check exit 0
deferred_seams: []
drift: false
new_impacts: []
findings: []
next_route: reviewer.adr-retirement.lead.r5.2026-08-31
```
