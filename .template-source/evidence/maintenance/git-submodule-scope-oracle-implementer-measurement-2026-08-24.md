# git-submodule 判定式实施者实测（≠ 独立审查）

日期：2026-08-24

> 本文件是实施者按第四轮判定式当场测量的记录，不是正式独立审查结论。  
> 不得据此宣布审查通过、可合并或模板可发布。  
> 正式入口仍为 `.template-source/evidence/maintenance/git-submodule-scope-l3-review-request-writable-oracle-2026-08-24.md`，须由非实施者重跑后作答。

对照判定式：`makeGitlinkFixture`、`inspectWorkingTreeScope`、脚手架 CLI。

## 题 1

登记 `repository_scope: git-submodule`、`checkout_state: empty-gitlink`。

| 调用 | typeof | writable | isWorkingTreeWritable | 是否字符串 |
|---|---|---|---|---|
| `inspectWorkingTreeScope(superproject, record)` | object | false | false | 否 |
| 同一 `record`，`repoRoot=process.cwd()`（探测失败） | object | false | false | 否 |

探测失败时 `violation` 同时含「工作树不是 gitlink」与 empty gitlink 误读；`writable` 仍为 false。

按判定式：**否（闭合）**。实施者不得把该答案写入审查请求。

## 题 2

真实 detached HEAD；`--output-dir` = 子仓工作树；`--project-name nested-service`。

- 退出码：1
- `nested-service/pom.xml`：不存在
- 子仓内无 `staging`、无 `nested-service/`
- 输出不含「请显式传入 `--force`」
- 输出含「detached HEAD 不得当成普通目录写入」

按判定式：**否（闭合）**。实施者不得把该答案写入审查请求。

## 题 3

真实 empty gitlink；`--output-dir=apps/backend`；`--project-name=billing-service`；带 `--force` 与覆盖元数据。

- 退出码：1
- 无 `pom.xml`、无 `.billing-service.backup-*`
- 输出不含「请显式传入 `--force`」
- 输出含「`--force` 不得把 git-submodule 挂载点当成普通目录覆盖」
- 父仓 `git ls-files --stage` 该路径 mode 仍为 `160000`

按判定式：**否（闭合）**。实施者不得把该答案写入审查请求。

## 下一步（已授权）

由另一名 Agent 或人工按同一判定式重跑，把三题答案写入第四轮审查请求。在此之前禁止可合并 / 可发布结论。跨仓 CLI 联调仍未做。
