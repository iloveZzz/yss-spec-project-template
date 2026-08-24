# git-submodule 判定式审查 findings（第四轮）

日期：2026-08-24

审查入口：`.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-writable-oracle-2026-08-24.md`

审查者：人工。工作区原始批注为「确认可以 / 是的 / 是的」，随后确认「已经审查」。批注对应闭合要求成立；对「是否仍」三题的正式答案为 **否**。

| # | 问题 | 正式答案 | 裁决 |
|---|---|---|---|
| 1 | 已登记 empty gitlink 的 `inspectWorkingTreeScope` 是否仍是字符串或 `.writable === true` | 否 | 通过 |
| 2 | `--output-dir` 指向 detached HEAD 子仓是否仍会生成工程 | 否 | 通过 |
| 3 | `--force` 覆盖 gitlink 是否仍走普通目录覆盖路径 | 否 | 通过 |

本轮不宣布模板可发布。跨仓 `create-yss-spec` 联调仍未做。
