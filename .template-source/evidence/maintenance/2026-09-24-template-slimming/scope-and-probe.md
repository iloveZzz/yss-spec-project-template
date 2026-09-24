# 工程模板精简：工作区边界与旧实例探针

## 工作区边界

开始时根仓和七个子模块均有未提交改动。Antdv Next 事实包、旧教程和占位文件的清理已在工作树中，本轮接续核对分发结果；其余既有或并行改动未重置、覆盖或纳入本轮结论。根仓历史 `reviews` 快照和 Archify 五份 HTML 测试基准未修改。

本轮认领根仓重复流程文档、三个小模板、`grill-me` 的 canonical Skill 与投影、Registry/lock/profile/退役清单、三个专职模板的对应入口，以及四个 CLI 的开发快照。后端和前端专职模板中无活动引用的 `docs/requirements/README.md` 一并退役。活动 README 保留业务入口并指向现有手册与生命周期事实源。

三个小模板的内容分别由 `yss-technical-design` 技术设计合同、`docs/templates/spec-template.md` 的用户故事、`docs/plan/templates/plan-template.md` 未决项及 Spec 风险段承接；这些资产继续由生命周期注册表路由。

## 旧实例迁移探针

- 旧来源：`create-yss-harness-backend` 提交 `50d8953e6192b3316afca3dbb74511c69a221ff4`，以 `git archive HEAD` 在独立临时目录运行旧 CLI `init`。
- 探针时新来源：本轮 `WORKTREE` 开发快照，`snapshotHash=eca3a1d0b0e6e9dfa052bfe93ca28c818cf98f8fb973aea7ff236f95124236a0`。此后只补充 `grill-me` 退役错误中的 `grilling` 替代入口；prune 逻辑未变，最终快照重新生成并通过 bundle 校验。
- 旧实例初始存在 `docs/process/PDCA-SCRUM.md` 和 `docs/templates/risk-register-template.md`；向风险模板追加用户内容。
- 普通 `sync --apply --force` 后两文件均保留，`pruned=0`。
- 显式 `sync --apply --force --prune` 后，未修改的 PDCA 文档已删除，用户修改的风险模板仍在。总 `pruned=18`，包含同一旧实例中的其他符合基线条件的退役文件。

本轮只交付 `implementation-ready` 的本地工作树。PR candidate、提交后固定源 SHA 的正式快照、完整发布验证与发布集成另行执行；本轮未提交、推送或发布。

验证期间，首次根仓 fast 的插件用例受并行负载影响触发超时；降低并发后完整通过。战略 CLI 最终快照的首次重跑在任务中断期间超时，隔离重跑后通过。checkpoint 仅采用最终成功结果。

补充退役错误详情时，临时新增的测试路径会把 fast 自动升级到发布级，已撤回该临时测试并改用定向断言。退役 ID 扫描曾把专用于拒绝旧 ID 的路由行误判为活动调用，现只对该精确拒绝行放行；其他活跃引用仍阻断。最终 fast 与四个 CLI 测试均已重跑通过。

## 空目录占位文件补充整改

经用户确认，本轮继续移除三个专职模板各 5 个仍被 Git 跟踪的 `.gitkeep`：`docs/discovery/reports/`、`docs/discovery/reports/competitor-deep-dive/`、`docs/implementation/`、`docs/releases/`、`docs/requirements/tickets/`，共 15 个。根模板的 9 个 `.gitkeep` 删除已在此前工作树中，本次不重复改动；本地未跟踪空目录、缓存和备份保持原状。

三个专职 CLI 以 `WORKTREE` 重建开发快照。新快照的活动文件均不含上述 5 个路径；战略设计 CLI 的退役基线记录 `docs/requirements/tickets/.gitkeep`，后端和前端 CLI 各记录全部 5 个路径。三个 CLI 的 `verify-bundle` 与 `test:prepared` 均通过。

用后端 CLI 提交态旧包初始化临时实例后，五个占位文件均存在。新 CLI 普通 `sync --apply --force` 保留全部五个；显式 `sync --apply --force --prune` 删除未修改的 `docs/discovery/reports/.gitkeep`，保留已由用户追加内容的 `competitor-deep-dive/.gitkeep`，并按项目自有路径规则保留 `docs/implementation/`、`docs/releases/`、`docs/requirements/tickets/` 下的占位文件。其余退役文件依既有基线规则处理，探针总 `pruned=21`。未扩大项目自有路径的清理权限。
