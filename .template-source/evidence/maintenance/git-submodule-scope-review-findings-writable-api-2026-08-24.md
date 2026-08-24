# git-submodule 修订审查 findings（第三轮）

日期：2026-08-24

审查入口：`.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-write-misread-2026-08-24.md`

| # | 问题 | 答案 | 裁决 |
|---|---|---|---|
| 1 | 已正确登记为 `git-submodule` 的空 gitlink，`inspectWorkingTreeScope` 是否仍返回可写 | 是 | finding：返回字符串，`.writable` 为 undefined |
| 2 | 在 detached HEAD 子仓工作树内调用脚手架（`--output-dir` 指向子仓）是否仍会生成工程 | 是 | finding：漏检时仍会 mkdir / staging / 生成 |
| 3 | `--force` 覆盖 gitlink 挂载点是否仍走普通目录覆盖路径 | 是 | finding：exists / `--force` / rename 仍是挂载点后备路径 |

## 回流

- `inspectWorkingTreeScope` 改为 `{ writable, violation, declared, actual }`。只有 `.writable === true` 才可写；已登记或探测到 empty gitlink / uninitialized / detached HEAD 时 `writable` 必为 `false`。
- 脚手架以输出目录的 git root 探测，而不是只信模板 `REPOSITORY_ROOT`。`--output-dir` 指向 detached HEAD 子仓时在 mkdir 之前失败。
- `--force` 覆盖 gitlink 在 exists / rename 之前走 `refuseGitlinkAsRegularDirectory`，错误不得是「请显式传入 `--force`」。
