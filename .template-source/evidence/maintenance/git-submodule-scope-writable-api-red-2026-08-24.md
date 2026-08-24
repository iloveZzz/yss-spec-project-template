# git-submodule 第三轮审查：仍返回可写 / 普通覆盖路径 RED

日期：2026-08-24

审查入口：用户将第三轮三题答案全部标为「是」，作为正式独立审查 findings。

修订前对当时 `HEAD`（`6ecbbb2`）探测：

```text
inspect empty registered type: string
value: empty gitlink must not be treated as a regular directory
string.writable: undefined
writable !== false: true

inspect declared empty but wrong repoRoot type: string
writable !== false: true

generate in detached submodule: 当时 gitSubmoduleScaffoldViolation 能拦截 nested-service，
但 inspectWorkingTreeScope 无显式 writable=false，Agent 按 .writable !== false 仍会当成可写。

generate() 在 gitlink 检测之后仍保留：
  exists && !force → 「请显式传入 --force」
  exists → rename 备份后覆盖
空 gitlink 目录 nonEmpty=false，一旦漏检会走普通目录覆盖路径。
```

失败语义：

1. 已正确登记为 `git-submodule` 的空 gitlink，`inspectWorkingTreeScope` 返回字符串，`.writable !== false` 为 true，即仍返回可写。
2. `--output-dir` 指向 detached HEAD 子仓时，生成器仍以模板 `REPOSITORY_ROOT` 为探测根，漏检时会在子仓内 mkdir / staging / 生成。
3. `--force` 覆盖 gitlink 挂载点仍与普通目录 exists / `--force` / rename 共用控制流。
