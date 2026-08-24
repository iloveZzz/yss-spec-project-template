# git-submodule 第三轮审查：writable / 普通覆盖路径 GREEN

日期：2026-08-24

命令：

- `scripts/verify-repository-scope-scenarios`
- `node --test .agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs .template-source/tooling/node/test/runtime-contract.test.mjs`
- `scripts/verify-template`

摘录：

```text
{
  "writable": false,
  "violation": "empty gitlink must not be treated as a regular directory",
  "declared": { "scope": "git-submodule", "checkout": "empty-gitlink" },
  "actual": { "scope": "git-submodule", "checkout": "empty-gitlink" }
}
writable !== false: false
isWorkingTreeWritable: false

named stress empty_gitlink_as_regular_dir: PASS
named stress detached_head_as_regular_dir: PASS
named stress force_overlay_mount: PASS
模板发布校验通过
```

断言：已登记空 gitlink 的 `.writable === false`；登记为空 gitlink 但工作树探测失败时仍不可写；`--output-dir` 指向 detached HEAD 子仓时失败且错误不是「请显式传入 --force」，无 `pom.xml` / staging；`--force` 覆盖真实 gitlink 失败且不走普通 `--force` 提示、无 backup、无骨架。本轮不宣布可合并或模板可发布。
