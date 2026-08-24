# Ticket与流程状态

Ticket 是在追踪平台上承载功能生命周期或可实现工作单元的通用追踪对象；GitHub Issues / GitLab Issues 是具体平台对象名称，领域资产统一称为 Ticket。主 tracker 以 `docs/agents/issue-tracker.md` 为准，当前模板默认 `local-markdown`，root 为 `docs/.scratch/`；Git remote 只用于代码托管、分支、PR / MR 和 CI，不代表 tracker 选择。

每个功能先建立功能父 Ticket，用于汇总 Spec、设计、审查、OpenAPI Freeze、阻塞项和阶段证据（见 [[Spec基线]]、[[OpenAPI契约]]、[[产品设计影响与原型]]）。功能父 Ticket 不作为 Agent 直接实现的单元；可独立验证的实现单元是 [[垂直切片Ticket]]。

Local 完整功能包写入 `docs/.scratch/<feature>/`，其中 `parent-ticket.md` 汇总阶段资产与阻塞边，`issues/01-<slug>.md` 等文件是垂直切片或 Wayfinder 子 Ticket；不得把多个 Ticket 合成一个文件。根目录 `.scratch/` 与 `docs/requirements/tickets/` 只允许只读迁移检查。选定 GitHub / GitLab 但凭据或平台暂不可用时，在 `docs/.scratch/<feature>/` 生成待发布草案，`parent-ticket.md` 保留目标平台并标记 `publication: pending` 与 `pending_publication_to`，不得自动改投另一远程平台（见 [[实现仓库与跨仓库契约]]）。

五态见 `docs/agents/triage-labels.md`：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。Local 主 tracker 在 Ticket 顶部用同名 `Status:` 记录；评论追加在 `## Comments`，状态变化须保留原因、证据引用和下一步。Wayfinder 的 `claimed` / `resolved` 只是临时工作状态，不是五态，进入正式切片前必须转换为上述之一。

Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`。只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket，才能使用 `ready-for-agent`（见 [[条件强制门禁]] 与 [[切片实现合同]]）。调用 `to-tickets` 时新建切片的初始 `Status:` 固定为 `ready-for-human`，须由生命周期编排器核验完整就绪公式后才能改为 `ready-for-agent`。

Ticket、Spec 和阶段证据按主 tracker 持久化。连续自动推进期间累积的证据，在人工暂停、handoff、进入实现、合并或发布边界集中同步范围、验证证据、风险、人工审查点、Ticket 状态和下一步（见 [[Fresh验证与独立审查]]、[[Agent入口规则]]）。Git checkpoint 只包含本轮明确范围，并说明主 tracker、同步状态、验证命令、剩余风险和下一步；获得用户授权后才提交或推送。

## 来源

- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `AGENTS.md`
- `CONTEXT.md`
- `docs/process/lifecycle-registry.yaml`
