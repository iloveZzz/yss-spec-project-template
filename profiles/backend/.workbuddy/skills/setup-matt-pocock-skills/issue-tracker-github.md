# Issue tracker: GitHub

用户当前明确的 Ticket URL 或仓库/实例决定本次目标；与已存配置不同时说明差异即可，不重复确认、不改持久配置，也不扩大动作授权。当前请求未明确目标时沿用配置；仅在多个候选确实无法消歧时询问。访问失败报告缺口，不回退到默认仓库找同号票。所有 CLI 使用 `--repo OWNER/REPO`（企业实例用 `HOST/OWNER/REPO`）；API 使用明确 `--hostname HOST` 与 `repos/OWNER/REPO/...`。不依赖当前目录、fork 或默认 remote。优先使用能力足够的连接器，CLI 参数以当前帮助为准。

## 读取

- Issue 正文和标签：`gh issue view NUMBER --repo OWNER/REPO --json number,title,body,labels,url,state`。
- 评论单独读取：`gh api --hostname HOST --paginate repos/OWNER/REPO/issues/NUMBER/comments`；结果过大时按与任务相关的时间段读取并说明范围，不能只看评论就声称读过正文。
- Issue 列表用分页 REST `repos/OWNER/REPO/issues?state=open&per_page=100`，注意排除带 `pull_request` 的对象；有限列表只代表该范围。
- PR 正文/标签用 `gh pr view NUMBER --repo OWNER/REPO --json number,title,body,labels,url,state`；评论同上，代码审查讨论另读 PR reviews/comments，diff 用 `gh pr diff` 并显式指定 repo。
- 外部 PR 用分页 `gh api --hostname HOST --paginate 'repos/OWNER/REPO/pulls?state=open&per_page=100'` 的 `author_association`；保留 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`FIRST_TIMER`、`NONE`，排除 `OWNER`/`MEMBER`/`COLLABORATOR`，未知值单列。不要向 `gh pr list --json` 传不支持的 `authorAssociation`。
- Issue/PR 共用编号；含混编号先读取 Issue REST 响应的 `pull_request` 字段辨别类型。访问失败不能推断对象不存在。

## 写入

创建、修改、标签、评论和关闭各自需要当前请求授权。发布请求才创建 Issue；仅要求分析时返回建议。

- 创建正文写到临时文件后用 `gh issue create --repo OWNER/REPO --title TITLE --body-file BODY_FILE`；更新用 `gh issue edit ... --body-file BODY_FILE`。评论用 `gh issue comment ... --body-file BODY_FILE`。PR 用对应 pr 子命令并先核对帮助。
- 标签使用 `gh issue edit NUMBER --repo OWNER/REPO --add-label LABEL` 或 `--remove-label LABEL`，只改已授权标签。
- 解释评论与关闭分别执行、分别回读；已关闭条目的 close 成功不能证明评论已发送。发布失败或超时先按目标、标题、已得 URL/ID 查明结果；状态未知时报告未知，不直接重试创建。
- 更新前重新读取当前正文/状态，发现并发修改先整合，不能用旧快照覆盖。多行正文用结构化工具参数或正文文件，不拼接 shell 文本。

## PRs as a request surface

**PRs as a request surface: no.** 用户明确选择或本次请求包含 PR 时才扩展 triage 范围，不改默认配置。

## Wayfinding

地图可使用标记为 `wayfinder:map` 的 Issue；标签必须已存在或获准创建。子票保存真实父票引用，能用原生 sub-issue 时使用原生关系；不可用才写 `Part of #NUMBER` 等文本。参见 [GitHub 子票 API](https://docs.github.com/en/rest/issues/sub-issues)。

子票的方法类型沿用明确的既有映射，新约定保存单一 `wayfinder:<type>` 标签，取值 research/prototype/grilling/task。恢复时读取标签，不只看正文；它不是 GitHub 原生 Issue Type 或 triage 分类。用户明确的本次纠正可用于本次工作，但改标签需授权；缺失、未知或冲突且无明确纠正时只澄清类型选择。无权创建标签时报告未保存，不自动创建。

当前帮助支持且关系写入已授权时，可用以下示例；`PARENT`、`CHILD`、`BLOCKER` 替换为真实 issue number，企业实例的 repo 写为 `HOST/OWNER/REPO`：

```bash
gh issue edit PARENT --repo OWNER/REPO --add-sub-issue CHILD
gh issue edit CHILD --repo OWNER/REPO --add-blocked-by BLOCKER
gh issue create --repo OWNER/REPO --title TITLE --body-file BODY_FILE --parent PARENT --blocked-by BLOCKER
```

CLI 不支持相应参数时核对 API 能力：子票关系 POST `repos/OWNER/REPO/issues/PARENT/sub_issues`，参数 `sub_issue_id` 为子票数据库 `id`；依赖 POST `repos/OWNER/REPO/issues/CHILD/dependencies/blocked_by`，参数 `issue_id` 为阻塞票数据库 `id`。API 显式指定 `--hostname HOST`，先读真实对象取得数据库 `id`，不能使用界面 number 或 node_id。参见 [依赖 API](https://docs.github.com/en/rest/issues/issue-dependencies)。原生关系存在时不另维护独立阻塞列表；确认服务端不支持才用文本引用，鉴权失败或超时不表示能力不存在。

完整读取地图子票及其未关闭阻塞项后计算前沿，保留地图顺序。只有认领获授权时才分配 assignee；分配不是原子锁，复读并协调并发认领。无写权限仍可分析，但不能声称已认领。答案评论、关闭和地图更新分别执行并回读；决策解决不表示实现已交付。
