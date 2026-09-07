# 公共核心 Spec 轴审查

- review_mode: committed
- base / merge-base: `5eb824d776dba30b4d39522a0555df87f877501b`
- candidate: `7b2c35411c877b80e606f387a3175d42063441e7`
- tree / candidate_digest: `6458dff5080dd25d54279deb3d7da07ae820845a`
- Reviewer: `reviewer.dedicated-cli-spec` / `role.test-engineer` / `runtime.generic`
- 来源：设计 v1.1.0 第 4—7 节、第 9 节 A—E；使用 `git show candidate:path` 与固定 diff，未审活动工作树。

## Spec

(a) 漏项：恢复路径缺少完整身份和仓库边界预检，见下面两项。(b) 未发现独立的额外需求行为；第 8 节后续发布/退役和实际薄包验收不属于本轮核心缺陷。(c) 三项已复现错误：

1. **[P1] 中断恢复绕过旧实例拒绝。** 设计 §6.2：“预检中识别旧 metadata 或 repository-local profile……不改文件”。`engine.mjs:16–28` 在 `identity()` 前直接 recover，仅排除异族文件名。中断 sync 后换入同族旧 metadata，`sync --apply --force` 返回成功并删除受管新增项，违反零写入规则。恢复前须识别旧/矛盾身份，同时允许日志可解释的自身半应用状态。
2. **[P1] 恢复写入已转为嵌套仓的路径。** 设计 §4：“不接管……submodule 内容”，§5：“执行期间并发变化则中止”。`transaction.mjs:263–278` 恢复仅比较内容，无 gitlink/嵌套仓检查。中断后将 docs 初始化为独立 Git 仓，恢复仍删除其文件。恢复须重新核验当前仓库边界并保留材料报告阻塞。
3. **[P2] 正式入口将全局安装误判为本地安装。** 设计 §5：“沿用现有安装方式识别”。`scaffold.mjs` 生成入口传入带尾斜杠的 packageRoot；`update.mjs:53–67` 与无尾斜杠全局路径精确比较失败，进入 local 分支。应规范化路径，再生成 `npm install -g` 计划。

## 反例与实际验证

从固定 candidate 使用 `git archive` 导出核心到独立临时目录，未改实现。基于现有公开 CLI fixture，仅通过文件系统与 fake npm 边界制造条件。

### S1 / S2

共同准备：init 新实例，包快照新增 `docs/new.md`；通过 Node `--import` 替换系统 `fs.renameSync`，完成 new.md rename 后向自身发送 SIGKILL，形成真实持久 pending 日志。

- S1：写入自身 `.yss-harness-backend.json` 为 `{schema_version:1,profile_id:"harness.backend-delivery"}`，执行 `sync --apply --force --json`。
- S2：保留原新版身份，执行 `git -c init.templateDir= init <target>/docs`，再执行 `sync --apply --json`。
- 两项实测均退出 0，输出 `status: recovered`，且 `docs/new.md` 从存在变为不存在。应当保留目标并返回非零诊断。
- 命令：`node --test <固定导出目录>/tests/spec-review-repro.test.mjs`；退出 0，14/14 测试通过（12 条原测试与 2 条断言错误行为存在的反例）。反例通过说明缺陷已复现，不能记为需求验收通过。

### S3

复制 fixture 包到 `<prefix>/lib/node_modules/create-yss-harness-backend/`，用正式生成器相同的带尾斜杠 packageRoot 调用 main。fake npm 对 `view` 返回 `0.2.0`，对 `prefix -g` 返回 `<prefix>`，拒绝真实 install。执行 `update --dry-run --json`。

实测退出 0，`installKind: local`，`commandLine: ["npm","install","create-yss-harness-backend@latest"]`，`cwd: <prefix>/lib`。正确计划应为 global 且带 `-g`。

命令：`node --test <固定导出目录>/tests/update-repro.test.mjs`；退出 0，13/13 测试通过（12 条原测试与错误行为复现）。现有 fixture 直接传无尾斜杠路径，未覆盖正式入口形状。

### 其他关注项

参数、三方 baseline 和固定 blob 校验已阅读，未增加无反例的硬缺陷。`loadBundle()` 只检查 core lock 格式，运行时不核验 core 文件清单/digest；`verifyCore()` 构建检查会校验。设计明确要求 `sync-core --check` 检查漂移，未明确规定运行时必须自校验核心，故仅记录事实，不将它升级为 Spec violation。产品 API/UI/Slice 专项技能均 not-applicable。

本轴共 3 项 finding，最严重 P1。返回主控修复并重新捕获 candidate、重跑双轴；不批准合同、不宣布整项完成或可发布。

```json
{
  "schema": "workflow-execution-result-v1",
  "work_unit": "work-unit.intensity-aware-review",
  "workflow_reference": ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-task.json",
  "result": "violation",
  "skill": "code-review",
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-review.md"],
  "changed_artifacts": [],
  "evidence_refs": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-review.md", ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/core-review-candidate.json"],
  "verification_results": [
    {"command": "node --test <fixed-export>/tests/spec-review-repro.test.mjs", "exit_code": 0, "tests": 14, "meaning": "12 existing pass; 2 defects reproduced"},
    {"command": "node --test <fixed-export>/tests/update-repro.test.mjs", "exit_code": 0, "tests": 13, "meaning": "12 existing pass; 1 defect reproduced"}
  ],
  "deferred_seams": [],
  "drift": [],
  "violation": ["S1 recovery bypasses legacy identity rejection", "S2 recovery writes within newly nested repository", "S3 global update misclassified as local"],
  "new_impacts": [],
  "stale_candidates": [],
  "blocking_signals": ["S1", "S2", "S3"],
  "next_route": "主控修复后重新捕获 candidate 并重跑双轴"
}
```
