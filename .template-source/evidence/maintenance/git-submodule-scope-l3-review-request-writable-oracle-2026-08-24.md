# git-submodule 写入门禁判定式 正式独立审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析，不表示审查已通过。
> 第三轮请求原文不改写，见 `.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-writable-api-2026-08-24.md`。

## 范围

三个风险场景不变，题干改为可复现判定式。期望答案一律为 **否**（已闭合）。任一观察点失败则本题仍为 **是**。不得根据实施者自述宣布可合并或模板可发布。

附加分支子仓内嵌套生成仍允许，不在本题范围内。

## 请审查

1. 用 `makeGitlinkFixture({ checkout: "empty-gitlink" })`，登记 `repository_scope: git-submodule` 且 `checkout_state: empty-gitlink`。
   - `inspectWorkingTreeScope(superproject, record)` 是否仍是字符串，或 `.writable === true`，或 `isWorkingTreeWritable(result) === true`？
   - 同一条登记、`repoRoot` 换成探测失败的路径时，`.writable === true` 是否仍成立？
   - 闭合要求：返回值为非 null 普通对象（不得是字符串）；两处调用均 `.writable === false` 且 `isWorkingTreeWritable(result) === false`。不得把 `.includes(...)` 或 truthy 字符串当成通过。

2. 真实 detached HEAD fixture；`--output-dir` 为子仓工作树；`--project-name nested-service`。
   - 是否仍会生成工程？
   - 闭合要求：退出码 ≠ 0；不存在 `nested-service/pom.xml`；子仓内无 `staging` 目录、无 `nested-service/`；输出不含「请显式传入 `--force`」；输出含「detached HEAD 不得当成普通目录写入」。

3. 真实 empty gitlink；`--output-dir=apps/backend`；`--project-name=billing-service`；带齐 `--force` 与覆盖元数据。
   - `--force` 覆盖 gitlink 是否仍走普通目录覆盖路径？
   - 闭合要求：退出码 ≠ 0；无 `pom.xml`、无 `.billing-service.backup-*`；输出不含「请显式传入 `--force`」；输出命中 gitlink / `--force` 不得覆盖挂载点；父仓该路径 `git ls-files --stage` 仍为 mode `160000`。

## 关键路径

- `scripts/lib/repository-scope-policy.mjs`（`inspectWorkingTreeScope`、`isWorkingTreeWritable`）
- `.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`
- `.agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs`
- `scripts/verify-repository-scope-scenarios`
