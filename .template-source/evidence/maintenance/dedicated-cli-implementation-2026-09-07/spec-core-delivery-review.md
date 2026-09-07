# 公共核心交付候选 Spec 轴审查

- review_mode: committed
- base / merge-base: `5eb824d776dba30b4d39522a0555df87f877501b`
- candidate: `a2363847effcd1e56417dcff86e0c6967229c67f`
- tree / candidate_digest: `8ecd609ff8e8f38a6d1b281f7c12fa98a2347873`
- Reviewer: `reviewer.dedicated-cli-spec` / `role.test-engineer` / `runtime.generic`
- 依据：已确认设计 v1.1.0、原任务合同与 code-review 的 Spec 轴。
- 覆盖：共享核心、薄包生成器及最终接力测试适配；真实包、源模板全量和 GitHub/npm 动作由主控另行闭合。

## Spec

(a) 本次核心交付范围未发现已确认要求漏项；(b) 未发现额外功能范围；(c) 未发现实现错误，原 S1—S4 保持关闭。

相对已通过候选 561d8786，参数、身份、三方基线、事务恢复、升级和固定快照的运行时代码及 17 条核心测试逐字未变。本次 fresh verification 全部通过，继续覆盖恢复旧身份/嵌套仓拒绝、全局升级 `-g`、包内子目录零写入和 `--force` 不降级。

生成薄包的 package test 改为实际快照计划、旧实例拒绝与零写入合同；使用存在的 `scripts/repository-mode`，不再调用不存在的验证命令。真实 tgz 初始化与 sync 仍属于 §8、§9 的独立验收，不能由预览测试替代；主控正在另行执行，故不将其记为本轴已验收或核心缺陷。接力场景保留已有 profile 全字段，避免测试夹具自行制造新版身份矛盾；允许复用刚生成的实例，同时仍核验 schema2、profile、来源提交、旧入口未分发、非空 init 拒绝与 sync 预览。Skill 锁只更新同内容的来源提交，未改变技能正文或路由。

**本固定候选 Spec 轴通过，0 findings。** 此结论不批准合同，不宣布整个实现、合并或发布完成。产品 API/UI/Slice 专项为 not-applicable。

## Fresh verification

审查对象来自固定 `git show` / diff；运行核心通过 `git archive a2363847effcd1e56417dcff86e0c6967229c67f .template-source/cli-core` 导出，未消费活动工作树实现。

执行目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/cli-spec-delivery-review-5_nz1ul9/.template-source/cli-core`。

实际命令：`pnpm --dir <固定导出目录> test`；退出 **0，17/17 pass，0 failed/skipped**。覆盖 S1/S2 的恢复预检拒绝及树快照零写入断言、S3 的真实尾斜杠入口 global/-g 断言、S4 的真实入口包内目录拒绝及包树未变化断言。原独立 21 条反例闭合记录见上一份 `spec-core-final-review.md`；本次不将其冒充重新执行，而以未变代码核验与新执行的 17 场景形成当前证据。

执行了固定版本运行时代码及测试的 `git diff --quiet 561d8786... a2363847... -- <runtime-and-test-files>`，退出 0。读取完整交付增量涉及的四个文件，并核对 Skill 来源仓 `f41c4a4...` 到 `5c1c982...` 的六个技能目录，`git diff --name-only` 无输出、退出 0；锁中的 effectiveHash/upstreamHash 未变化。

真实薄包运行、完整模板验证和 GitHub 交付不在上述执行结果中，仍需主控记录具体对象、命令与退出码。

```json
{
  "schema": "workflow-execution-result-v1",
  "work_unit": "work-unit.intensity-aware-review",
  "workflow_reference": ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-delivery-task.json",
  "result": "pass",
  "skill": "code-review",
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-delivery-review.md"],
  "changed_artifacts": [],
  "evidence_refs": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-delivery-review.md", ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/core-delivery-review-candidate.json"],
  "verification_results": [
    {"command": "pnpm --dir <fixed-export> test", "exit_code": 0, "tests": 17, "meaning": "fresh public CLI scenarios pass including S1-S4 regression assertions"},
    {"command": "git diff --quiet 561d8786 a2363847 -- <runtime-and-test-files>", "exit_code": 0, "meaning": "runtime and core tests unchanged from independently closed candidate"},
    {"command": "git -C submodules/yss-harness-design-agent diff --name-only f41c4a4 5c1c982 -- <six-skill-directories>", "exit_code": 0, "meaning": "no content changes in six source skill directories"}
  ],
  "deferred_seams": [],
  "drift": [],
  "violation": [],
  "new_impacts": [],
  "stale_candidates": [],
  "blocking_signals": [],
  "next_route": "主控汇合本固定候选双轴，继续真实包及全量验证；不据本轴宣布整体发布完成"
}
```
