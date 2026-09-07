# 公共核心修复候选 Spec 轴复审

- review_mode: committed
- base / merge-base: `5eb824d776dba30b4d39522a0555df87f877501b`
- candidate: `3215ea7b31a2dc0efa73ec76849c08ed7eb32a5f`
- tree / candidate_digest: `5954297c4ae15d5c7a713bad46c27ad4bb06bd5b`
- Reviewer: `reviewer.dedicated-cli-spec` / `role.test-engineer` / `runtime.generic`
- 来源：设计 v1.1.0 第 3—7 节、第 9 节 A—E。读取固定 `git show`、修复 diff；将 candidate 核心通过 `git archive` 导出到独立临时目录复验，未把工作树作为候选。

## Spec

原 S1/S2/S3 均已关闭：同族旧 metadata 恢复返回 `LEGACY`；恢复目标变为嵌套仓返回 `PROTECTED`，两者保留新增文件；尾斜杠全局安装正确计划 `npm install -g`。新增损坏备份、gitlink、重复 metadata 键用例也通过。

(a) 未发现新增设计能力漏项；(b) 未发现额外功能范围，发布/退役和真实薄包验收留主控；(c) 尚有一项原隔离逻辑错误：

**[P2 / S4] 尾斜杠导致包安装目录的子目录可作为 init 目标。** 设计 §3 要求核心“构建时确定性复制”并由锁检查漂移，§9 A 要求“非法目标无写入”；候选 `cli.mjs:95–100` 已明确把安装目录纳入拒绝范围，却用 `packageRoot + path.sep` 比较带尾斜杠的正式入口 root，形成双斜杠，漏掉其子路径。实际入口 `init --target-dir <packageRoot>/vendor/cli-core/new-project` 返回 `applied` 并写入新版 metadata。此路径污染受锁管理的 vendor 树，之后核心清单核验会出现额外文件。这是已有目标隔离检查失效，未要求扩大业务功能。规范化 main 的 packageRoot 并覆盖真实入口形状；不能只修 update 的局部路径。

## 复验记录

固定导出根：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/cli-spec-fix-review-uob_qfn9/.template-source/cli-core`。所有自定义 fixture/脚本仅写临时目录；公开 CLI 以真实 Node 子进程调用，系统边界用 fs 注入中断或 fake npm。

1. `node --test <固定导出根>/tests/spec-review-repro.test.mjs`：退出 0，17/17 通过（候选原 15 条＋原 S1/S2 反例改为断言拒绝）。
   - SIGKILL 发生在 `docs/new.md` rename 完成后。
   - 替换为同族旧 metadata 后执行 `sync --apply --force`：退出 1、`code: LEGACY`、new.md 仍存在。
   - 中断后运行 `git -c init.templateDir= init <target>/docs` 再 `sync --apply`：退出 1、`code: PROTECTED`、new.md 仍存在。
2. `node --test <固定导出根>/tests/update-repro.test.mjs`：退出 0，16/16 通过（候选原 15 条＋原 S3）。传入 `<prefix>/lib/node_modules/create-yss-harness-backend/`，fake npm 返回新版和 prefix，`update --dry-run --json` 输出 `installKind: global`、`commandLine: ["npm","install","-g","create-yss-harness-backend@latest"]`、`cwd: null`。
3. `node --test <固定导出根>/tests/install-root-repro.test.mjs`：退出 0，16/16 测试通过。第 16 条断言缺陷存在，**不等于验收通过**。使用正式入口的 `fileURLToPath(new URL('.', import.meta.url))` 形状将包根传 main，命令目标设为包内 `vendor/cli-core/new-project`，实测 `PACKAGE_ROOT_REPRO 0 applied metadataExists true`。应非零拒绝且目标不存在。

第三项核心代码：

```js
const target = path.join(pkg, 'vendor/cli-core/new-project');
// entry.mjs 使用带尾斜杠的 fileURLToPath(new URL('.', import.meta.url)) 调 main。
spawnSync(process.execPath, [path.join(pkg, 'entry.mjs'), 'init', '--target-dir', target, '--json']);
// 实测退出 0，status applied，<target>/.yss-harness-backend.json 存在。
```

修复代码已检查：恢复先识别支持的身份与日志可解释状态，完整预检后才处理锁，逐项恢复再次检查当前仓库边界；未见删除合法半应用 init 恢复入口。参数/baseline/快照锁的既有范围仍覆盖；运行时是否自校验整个 core 仍仅作为首轮记录的事实，不增加硬要求。产品 API/UI/Slice 专项均 not-applicable。

本轴仍有 1 项 P2；原 3 项关闭。返回主控处理固定候选边界缺陷，本报告不批准合同、不作整项完成或发布结论。

```json
{
  "schema": "workflow-execution-result-v1",
  "work_unit": "work-unit.intensity-aware-review",
  "workflow_reference": ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-fix-task.json",
  "result": "violation",
  "skill": "code-review",
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-fix-review.md"],
  "changed_artifacts": [],
  "evidence_refs": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/spec-core-fix-review.md", ".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/core-fix-review-candidate.json"],
  "verification_results": [
    {"command": "node --test <fixed-export>/tests/spec-review-repro.test.mjs", "exit_code": 0, "tests": 17, "meaning": "15 candidate scenarios pass; S1/S2 closed"},
    {"command": "node --test <fixed-export>/tests/update-repro.test.mjs", "exit_code": 0, "tests": 16, "meaning": "15 candidate scenarios pass; S3 closed"},
    {"command": "node --test <fixed-export>/tests/install-root-repro.test.mjs", "exit_code": 0, "tests": 16, "meaning": "15 candidate scenarios pass; S4 defect reproduced"}
  ],
  "deferred_seams": [],
  "drift": [],
  "violation": ["S4 main trailing-slash packageRoot allows writes inside locked CLI installation"],
  "new_impacts": [],
  "stale_candidates": [],
  "blocking_signals": ["S4"],
  "next_route": "返回主控处理安装目录隔离缺陷并保持候选证据一致"
}
```
