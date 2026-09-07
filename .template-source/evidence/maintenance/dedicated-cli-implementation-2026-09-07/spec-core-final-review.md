# 公共核心最终候选 Spec 轴审查

- review_mode: committed
- base / merge-base: `5eb824d776dba30b4d39522a0555df87f877501b`
- candidate: `561d8786cf48b4629d02bde376b44b91b9de4f92`
- tree / candidate_digest: `182d5175f1bdebbced528326e46f84323b7c6f12`
- Reviewer: `reviewer.dedicated-cli-spec` / `role.test-engineer` / `runtime.generic`
- 设计来源：`.template-source/contracts/dedicated-harness-cli-design.md` v1.1.0。
- 对象：固定共享核心与薄包生成器 A—E；关联执行范围工具和分发验证入口变更作源码复核。薄包正式打包、真实安装、GitHub 与 npm 发布不是本轴完成声明。

## Spec

(a) 未发现本轮公共核心范围中遗漏或仅部分实现的已确认要求；(b) 未发现额外功能范围；(c) 原 S1—S4 均已实测关闭，无遗留 Spec finding。

设计 §6 的旧实例零写入拒绝已覆盖恢复路径；§4、§7 的仓库边界在恢复预检及逐项写入中重新校验；§5 的全局升级安装方式保留 `-g`，`--force` 不降级。`main()` 入参先规范化，真实入口尾斜杠不会再绕过安装目录子路径拒绝，满足 §3 固定核心及 §9 A 非法目标无写入要求。

schema2 新增在运行时 execution-scope 的身份分支中，旧 schema 分支仅保留旧项目现有执行行为；新 CLI 的 legacy 拒绝没有被删除或放宽。分发验收入口改用新 CLI，并检查生成 metadata schema2、非空 init 拒绝、sync 预览和任务/技能接力门禁；未把仍待主控执行的真实包验收写成已通过。API/UI/Slice 专项 not-applicable。

结论仅为该固定候选 **Spec 轴通过**；不批准合同，不代表整项完成或可发布。

## 实际验证

消费方式：读取固定 `git show` 和累计修复 diff；`git archive 561d8786cf48b4629d02bde376b44b91b9de4f92 .template-source/cli-core` 导出到独立临时目录。未修改实现或把活动工作树作为候选。

复验目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/cli-spec-final-review-nfu6agag/.template-source/cli-core`。

命令：`node --test <固定导出目录>/tests/spec-final-repro.test.mjs`，**实际退出 0，21/21 通过，0 failed/skipped**。包含候选自带 17 条公共 CLI 场景，以及原 S1—S4 的四条独立复现条件，改为断言正确行为。原反例名称保留历史描述，其断言已反转为修复验收。

| Finding | 本次复验结果 |
|---|---|
| S1 同族旧身份绕过恢复拒绝 | 在新增治理文件 rename 后 SIGKILL，换入旧 metadata，`sync --apply --force` 退出 1，code LEGACY；新增文件仍存在 |
| S2 恢复写入新增嵌套仓 | 同样中断后 `git init <target>/docs`，再 apply 退出 1，code PROTECTED；新增文件仍存在 |
| S3 全局升级误判本地 | 正式尾斜杠入口＋fake npm prefix，输出 global、`npm install -g create-yss-harness-backend@latest`、cwd null |
| S4 包内目标隔离失效 | 正式尾斜杠入口 init 到 `<packageRoot>/vendor/cli-core/new-project`，退出 1、status error，目标不存在、metadata 不存在 |

自带 17 场景同时覆盖两家族离线 init、mode、attach 预览/冲突/业务文件保护、三方 sync、新旧混合/未知身份拒绝、路径/链接/gitlink、失败与中断恢复、恢复损坏备份零写入、重复 metadata 键、全局 update、force 不降级和安装根零写入。

源码检查包括原已审版本与本轮变更。运行时 scope 和分发入口的真实两端集成验证仍由主控执行，本审查未据源码阅读宣称该执行结果。运行时是否全量自校验 core digest 维持首轮事实记录，不追加设计未规定的硬门禁。

```json
{
  "schema": "workflow-execution-result-v1",
  "work_unit": "work-unit.intensity-aware-review",
  "workflow_reference": ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-final-task.json",
  "result": "pass",
  "skill": "code-review",
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-final-review.md"],
  "changed_artifacts": [],
  "evidence_refs": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-final-review.md", ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/core-final-review-candidate.json"],
  "verification_results": [
    {"command": "node --test <fixed-export>/tests/spec-final-repro.test.mjs", "exit_code": 0, "tests": 21, "meaning": "17 candidate scenarios and S1-S4 closure assertions pass"}
  ],
  "deferred_seams": [],
  "drift": [],
  "violation": [],
  "new_impacts": [],
  "stale_candidates": [],
  "blocking_signals": [],
  "next_route": "主控汇合固定候选双轴，继续真实薄包/集成验证；本轴不批准或发布"
}
```
