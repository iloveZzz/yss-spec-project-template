# 仓库 Git 工作流（`yss git`）

此入口适用于 `project-instance`，要求支持 `yss git` 的 CLI（`yss git --help` 可见）；不支持时改用 `git-commit-core` 的手工合同，不自行补造命令。`yss git` 不授予批准、实现资格、可合并或可发布结论；它只管理本地分支、提交、钩子、策略和推送。

## 授权分级

| 级别 | 命令 | 规则 |
| --- | --- | --- |
| L0 只读 | `status` `base` `submodules` `doctor` `guard` `policy` `audit` `changelog` `verify-message` | 直接执行，不写工作区、索引、引用或配置，不联网 |
| L1 本地写入 | `branch start` `commit` `hooks install` `policy set` `release tag` | 先 `--plan --out <仓库外新文件>`，审阅后 `--apply --plan-file`；需要用户对本次提交、分支、钩子、策略或标签的授权 |
| L2 外部副作用 | `push` | 同 L1，并且 `--apply` 必须带用户给出的 `--confirm-remote <远端名>`；Agent 不自行确认，只交出计划 |

计划绑定 HEAD、状态摘要和涉及文件的内容摘要；应用时重新推导，仓库有任何变化即返回 `BASELINE`，改过的计划返回 `PLAN`。授权不跨级、不跨计划延伸；计划文件保存在仓库之外。

## 与日常/正式任务的关系

- `daily` 与 `governed` 都可使用。分支名、提交 trailer 与 PR 的 Ticket 须一致；一个 Ticket/PR 对应一个分支。
- `yss git base --json` 输出 HEAD 与默认分支的合并基线（完整 SHA），用作 `yss lifecycle route --base`；它只是 Git 事实，不替代实现仓确认和 `verify-daily` 的核验。
- 进入独立实现仓（子模块或独立克隆）先读其本地入口；`yss git submodules` 列出状态和本地入口，不初始化、不拉取。
- 实施者不得自审：`audit` 的 `self-review` 发现必须由其他角色处理，不能靠改 `Reviewed-by` 绕过。
- `commit` 只暂存 `--paths` 明确列出的路径；范围外改动、其他人的暂存保持原状。它不替代 `git-commit-core` 对密钥、大文件和消息质量的检查，这些仍在生成消息前完成。

## 策略文件

可选 `.template-spec/process/git-policy.yaml`，格式见 [git-policy.schema.json](schemas/git-policy.schema.json)；缺失时使用默认值，未知字段、非法分支名或非法正则会被拒绝，不回退默认值。

```yaml
schema_version: 1
default_branch: main
protected_branches: [main]
branch_pattern: "^(feat|fix|chore|docs|refactor|test)/[A-Za-z0-9._-]+$"
ticket_trailer: Ticket
ticket_pattern: "^[A-Z][A-Z0-9]*-[0-9]+$"
review_trailer: Reviewed-by
require_signed: false
```

- `protected_branches`：`commit` 与 `push` 拒绝直接作用于这些分支，改经分支和评审合并；发布标签是例外，只在 `default_branch` 上创建，并且只推送标签。
- `ticket_pattern` 须与 tracker 的 Ticket 标识一致；`ticket_trailer` 同时是 `commit-msg` 钩子和 `audit` 的检查对象。
- `require_signed: true` 时提交使用 `-S`、标签使用 `-s`，`audit` 与 `push` 检查签名状态；签名环境由用户的 Git/GPG 配置负责。
- 用 `yss git policy set --key <字段> --value <值>` 修改；它按固定格式整文件重写，原有注释不会保留。

## 推送

`push` 的计划阶段不联网：按本地远端跟踪引用确定待推送提交并按策略审计，受保护分支、分离 HEAD、已分叉或落后、策略发现一律拒绝，没有 `--force`。跟踪引用过期时远端仍会以 non-fast-forward 拒绝，错误原样报告。URL 内嵌密码、`ext::` 等命令传输被拒绝，认证由用户自己的凭据助手或 SSH 配置负责。推送成功不等于 PR 已评审、CI 已通过或可以合并。

## 钩子

`hooks install` 把 `commit-msg` 写入受版本控制的 `.githooks/` 并设置本地 `core.hooksPath`；每个克隆各自安装。原 `core.hooksPath` 或 `.git/hooks/commit-msg` 先被链式调用，已有的非 yss 钩子不覆盖。找不到 `yss` 时钩子跳过检查，所以它是提示而不是唯一门禁；门禁以 CI 与 `audit` 为准。

## 事务状态

`hooks install` 与 `policy set` 经 YSS 文件事务写入，状态在 `.yss/transactions`。该目录未被忽略时工作区会显示为未提交，`release tag` 要求工作区干净，所以发布前先处理它；不要手工删除事务目录。

## 退出码与错误

沿用现有协议：0 成功；`ARGUMENT` 2；其余失败 1，机器输出读取 `status` 与 `code`。常见：`ROOT`（不是仓库顶层）、`INPUT`（引用、路径或策略无效）、`CONFLICT`（受保护分支、进行中的操作、策略发现）、`BASELINE`（计划后仓库变化）、`PLAN`（计划无效）、`CAPABILITY`（缺少推送确认或提交身份）、`EXECUTION`（git 本身失败）。
