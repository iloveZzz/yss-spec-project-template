# GitLab Workflow Skills

> 本文沉淀本项目使用 GitLab 管理代码、MR、CI 和自动化 Git 工作流的技能配置。这里记录的是协作规范与本机/项目入口，不保存任何 token。

## 1. 定位

当项目主远端为 GitLab 时，默认使用 GitLab 作为代码托管、Merge Request、CI/CD 和工作流协作入口。

PRD、Issue 和 triage 不在本文中写死到 GitLab；它们按 `docs/agents/issue-tracker.md` 在 GitLab / GitHub 间路由。

已集成能力：

| 能力 | 工具 / Skill | 用途 |
|---|---|---|
| GitLab API 与项目查询 | `gitlab-workflow` skill | 查询项目、clone 地址、创建 group / project、执行分支化 git workflow |
| GitLab CLI | `glab` | 管理 MR、Issue、CI、Pipeline、Release、变量、Runner 等 |
| 项目快捷入口 | `scripts/gitworks` | 在当前仓库内统一执行 status、workflow、MR、CI 命令 |
| Git 推送认证 | macOS Keychain + HTTPS token | 让 `git push`、workflow push 能非交互执行 |

## 2. 本机配置

GitLab 基础配置文件：

```text
~/.config/codex/gitlab.json
```

结构：

```json
{
  "url": "http://<gitlab-host>",
  "token": "<GitLab Personal Access Token 或 Project Access Token>",
  "default_clone_protocol": "http"
}
```

要求：

- 文件权限应为 `600`。
- token 不得写入仓库文件。
- token 不得出现在脚本、文档、Issue、MR 描述或提交信息中。
- token 至少需要 `read_api`；若要推送代码，需要 `write_repository`；若要创建 MR、管理 CI 或项目资源，建议具备对应 API 权限。

## 3. glab 配置

`glab` 用于操作 GitLab MR / CI / Issue / Release。

自托管 GitLab 配置示例：

```bash
glab auth login \
  --hostname <gitlab-host> \
  --api-host <gitlab-host> \
  --api-protocol http \
  --git-protocol http \
  --stdin
```

验证：

```bash
glab auth status --hostname <gitlab-host>
glab repo view --repo <group>/<project>
```

若 `glab` 由 Go 安装，默认位置为：

```text
~/go/bin/glab
```

建议确保 `~/go/bin` 在 `PATH` 中。

## 4. 项目快捷入口

项目脚本：

```text
scripts/gitworks
```

`scripts/gitworks` 默认从当前仓库 `origin` 远端推导 GitLab host 和 `<group>/<project>`；如需覆盖，可设置 `GITLAB_HOST`、`GITLAB_PROJECT_PATH` 或 `GIT_REMOTE`。

常用命令：

```bash
scripts/gitworks status
scripts/gitworks workflow main feature/demo "feat: demo"
scripts/gitworks mr-list
scripts/gitworks mr-create main "feat: demo"
scripts/gitworks ci-list
scripts/gitworks ci-run
scripts/gitworks ci-status
```

命令语义：

| 命令 | 作用 |
|---|---|
| `status` | 查看当前分支、工作区状态和 GitLab 登录状态 |
| `workflow <base> <branch> <message>` | 执行 fetch、rebase、切分支、add、commit、push |
| `mr-list` | 查询当前项目打开的 MR |
| `mr-create <target> <title> [description]` | 从当前分支创建 MR 到目标分支 |
| `ci-list` | 查询 Pipeline 列表 |
| `ci-run [branch]` | 触发 Pipeline |
| `ci-status` | 查看 CI 状态 |

## 5. Agent 使用规则

当用户提到 GitLab、MR、Pipeline、CI、远端仓库、自动提交、自动推送或 gitworks 时，优先使用以下顺序：

1. 读取项目状态：`scripts/gitworks status`。
2. 需要 GitLab API / clone / push workflow 时，使用 `gitlab-workflow` skill。
3. 需要 MR / CI / Pipeline 时，使用 `glab` 或 `scripts/gitworks`；需要 Issue / PRD / triage 时，先按 `docs/agents/issue-tracker.md` 判断 GitLab 或 GitHub。
4. 执行自动提交前，必须先检查工作区脏文件，避免把无关 `.agents/`、`.codex/`、本机配置或用户未确认文件混入提交。
5. 不直接提交到受保护主分支；默认使用 `feature/*`、`fix/*`、`chore/*` 分支。
6. 自动 workflow 只在用户明确授权提交/推送时执行。
7. 每个阶段产物完成后，按 `AGENTS.md` 的 Git checkpoint 规则确认范围、提交和推送。

## 6. 推荐工作流

开发阶段：

```text
影响面评估
  -> 实现 / 文档 / 测试
  -> fresh verification
  -> scripts/gitworks status
  -> scripts/gitworks workflow <base> <branch> "<commit message>"
  -> scripts/gitworks mr-create <target> "<title>"
  -> scripts/gitworks ci-status
```

MR 阶段：

```text
创建 MR
  -> 查看 Pipeline
  -> 修复 CI / Review comments
  -> fresh verification
  -> 合并前确认发布说明和回滚点
```

## 7. 故障排查

| 现象 | 检查项 |
|---|---|
| `glab: command not found` | 确认 `~/go/bin` 在 `PATH`，或设置 `GLAB=/path/to/glab` |
| `git push` 要求输入密码 | 检查 Keychain 凭据；重新写入 GitLab token |
| `glab auth status` 失败 | 检查 token 是否过期、权限是否足够、GitLab 地址是否可达 |
| `ci-list` 没有结果 | 项目可能还没有 `.gitlab-ci.yml` 或历史 Pipeline |
| SSH clone 失败 | 当前环境优先使用 HTTP；SSH 端口和 key 需要单独配置 |

## 8. 安全要求

- token 轮换后，需要同步更新 `~/.config/codex/gitlab.json`、Keychain 和 `glab` 登录态。
- 用户在聊天中明文提供 token 后，建议完成配置后尽快在 GitLab 轮换。
- 不在 `docs/`、`scripts/`、`.env`、`.git/config` 中保存明文 token。
- 触碰权限、认证、CI 变量、Runner、生产部署凭据时，必须标记人工确认。
