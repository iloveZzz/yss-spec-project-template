# ADR 退役冻结候选 Spec 独立审查（Round 2）

- reviewer_id: `reviewer.adr-retirement.spec.r2.2026-08-31`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8`
- review_mode: `formal-independent`
- review_axis: `Spec`
- candidate_mode: `worktree`
- review_base_ref: `37cc9257a0918eac187003c8f8098bfbaff2480b`
- candidate_snapshot: `.template-source/evidence/maintenance/reviews/candidates/1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8/candidate.bin`
- candidate_integrity: `candidate.bin` SHA-256 与完整 candidate digest 一致；`yss-worktree-candidate-v1` 中唯一 tracked payload 与 `tracked.diff` 逐字节一致；manifest 声明 `untracked_files: []`
- spec_sources: 用户明确授权顺序“模板子仓→CLI→父仓 gitlink”；`.template-source/evidence/maintenance/adr-retirement-l3-contract-2026-08-31.yaml`；Round 2 Reviewer 任务包

## 覆盖与裁决

1. **授权顺序：满足。** 两个模板源提交 `b7f7ad993760e2bb0bdf140a0daac92760f54837`、`f2c5f5878589667919f9000913743a288580ef46` 均先于开发 CLI 提交 `d76420bf391638f4ee78c811553c2becf3ef21f1` 形成，且三者均为对应远端 `main` 的已推送提交。父仓候选随后才把三个 gitlink 暂存到上述模板源提交和开发 CLI 提交；父仓未在本候选中 commit/push，符合本审查禁止动作及“最后更新 gitlink”的边界。
2. **开发 CLI 的稳定模板绑定：满足。** `create-yss-harness-dev` 的 `template.snapshot.json` 同时把 `templateRepository` 固定为公开 Git URL，并把 `requestedRef`、`templateCommit` 固定为已推送模板提交 `b7f7ad993760e2bb0bdf140a0daac92760f54837`；不存在上一轮本机绝对路径或 `working-tree` 元数据。
3. **战略设计 CLI 的稳定来源声明：部分满足。** 无差异同步证据声明使用公开 Git URL 和已推送模板提交 `f2c5f5878589667919f9000913743a288580ef46`，来源标识本身正确；但冻结候选没有捕获该 CLI 实际生成的 snapshot/manifest/template 字节，不能由当前 digest 证明该声明，详见 `SPEC-ADR-R2-001`。
4. **全部模板源治理 ADR 退役语义：满足。** parent、开发模板源、战略设计模板源分别删除 13、14、13 个实时 `.template-source/adr/*.md`；开发模板源额外包含并退役其 profile 专属 ADR-0015。三套 validator 都改为允许目录缺失或为空、拒绝重新引入任意 Markdown 治理 ADR；三套 wiki 均退役 `adr-0002` live/raw 映射并改引当前 SSOT；`docs/adr/README.md` 继续保留 `project-instance` 产品 ADR 能力。冻结候选中的旧 ADR 内容只存在于历史 review/evidence 和旧候选快照，符合“Git 历史和既有 evidence 保留”，不构成实时治理 ADR 回流。
5. **跨仓范围：满足。** 候选范围是 parent、两个目标模板源、开发 CLI，以及战略设计 CLI 的声明式无差异同步；没有把旧 `create-yss-spec` 混入本轮发布结论，也没有把 `project-instance` 产品 ADR 一并退役。当前缺口仍属于既有 `cross-repo-contract` / `release-semantics` 影响面，不产生新影响面。
6. **旧 CLI 环境例外：准确且受控。** `submodules/create-yss-spec/template` 的所有者确为 `root:staff`、mode 为 `700`，当前 Reviewer 身份不能读取或重建该旧快照。证据明确把本轮目标限定为 `create-yss-harness-dev` 与包名 `create-yss-harness-design`，并明确“不构成旧 CLI 的发布结论”；因此该旧 CLI 对本轮为 `not-applicable`，不是豁免已命中的目标 CLI 门禁。

## 结构化 findings

```yaml
findings:
  - id: SPEC-ADR-R2-001
    disposition: violation
    severity: blocking
    requirement: "两个目标 CLI 必须在已推送稳定模板 commit 后同步；冻结候选必须足以证明被测试、待发布和被审查的是同一快照。"
    candidate_evidence:
      - "tracked.diff 末段只有 `REPOSITORY: create-yss-strategic-design stable-ref projection: no tracked byte change`，没有该 CLI 的 snapshot、manifest 或 template payload。"
      - "candidate-manifest.yaml 声明 `untracked_files: []`，因此 candidate digest 也没有捕获被 `.gitignore` 排除的战略设计 CLI 生成物。"
      - "无差异同步证据只记录 snapshot_hash 和 `git status --short` 为空；被忽略的 `template/`、`template.manifest.json`、`template.snapshot.json` 不会由该状态检查证明未变化。"
    finding: "来源 URL 与模板 commit 正确，但当前冻结字节不能证明战略设计 CLI 的实际生成快照确由 `f2c5f587...` 产生，也不能证明测试快照与待发布快照相同。Round 1 的 CLI 候选绑定阻断项尚未由叙述性 no-op 证据关闭。"
    remediation: "把战略设计 CLI 的生成 snapshot/manifest/template post-image（或一个能逐字节重建并校验这些 ignored 生成物的不可变归档）纳入新候选 digest，再基于新 digest 重跑验证与全轴正式独立审查。"
  - id: SPEC-ADR-R2-002
    disposition: resolved
    severity: non-blocking
    requirement: "开发 CLI 必须绑定已推送稳定模板 commit，且不得持久化本机路径或 `working-tree`。"
    evidence: "开发 CLI 快照绑定公开仓库与 `b7f7ad993760e2bb0bdf140a0daac92760f54837`；模板源和 CLI commit 均已推送到对应远端 `main`。"
  - id: SPEC-ADR-R2-003
    disposition: resolved
    severity: non-blocking
    requirement: "全部实时模板源治理 ADR 退役，同时保留当前规则 SSOT、历史 evidence 和 project-instance 产品 ADR 能力。"
    evidence: "三模板源 ADR 删除、validator 反向阻断、wiki 映射退役、SSOT 直连和产品 ADR 边界均在冻结 diff 中闭合。"
  - id: SPEC-ADR-R2-004
    disposition: not-applicable
    severity: non-blocking
    requirement: "旧 `create-yss-spec` 不属于本轮两个目标 CLI 的发布范围。"
    evidence: "权限事实为 root:staff/700；候选只记录受控环境例外，未对旧 CLI 作完成或发布声明。"
```

```yaml
drift: false
new_impacts: []
```

## 结论

**审查结论：blocked。** 共 1 项 blocking `violation`、2 项 `resolved`、1 项 `not-applicable`。授权顺序、开发 CLI 的远端稳定模板绑定、全部 ADR 退役语义、跨仓范围和旧 CLI 例外均可接受；但战略设计 CLI 的 ignored 生成快照仍未绑定到完整 candidate digest，当前 Spec 轴不能判定 pass。本结论不批准发布，也不包含 commit/push 授权。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
workflow_reference: work-unit.intensity-aware-review
task_id: adr-retirement-spec-review-round2-2026-08-31
actor_id: reviewer.adr-retirement.spec.r2.2026-08-31
implementation_actor_id: worker.adr-retirement.2026-08-31
skill: code-review
execution_state: Reviewer
status: blocked
candidate_digest: 1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8
changed_files:
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round2-2026-08-31.md
evidence_refs:
  - .template-source/evidence/maintenance/reviews/candidates/1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8/candidate-manifest.yaml
  - .template-source/evidence/maintenance/reviews/candidates/1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8/candidate.bin
  - .template-source/evidence/maintenance/reviews/candidates/1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8/tracked.diff
  - .template-source/evidence/maintenance/reviews/adr-retirement-spec-review-round2-2026-08-31.md
actual_verification:
  - "candidate.bin sha256 == 1cf34fd5ea03cee08b9d1aa537fcbb5b31d5e91c768875b9a94667d2578cdfb8"
  - "candidate.bin tracked payload byte-equal to tracked.diff"
  - "untracked_files == []"
  - "模板源 b7f7ad9/f2c5f58 与开发 CLI d76420b 均为对应远端 main 的已推送提交"
  - "父仓冻结 diff 的 gitlink 更新发生在模板源与开发 CLI 提交之后"
deferred_seams: []
drift: false
new_impacts: []
findings:
  - { id: SPEC-ADR-R2-001, disposition: violation }
  - { id: SPEC-ADR-R2-002, disposition: resolved }
  - { id: SPEC-ADR-R2-003, disposition: resolved }
  - { id: SPEC-ADR-R2-004, disposition: not-applicable }
next_route: worker.adr-retirement.2026-08-31
```
