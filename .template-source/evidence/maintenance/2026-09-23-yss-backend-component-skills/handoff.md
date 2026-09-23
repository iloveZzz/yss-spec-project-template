# YSS 后端组件技能增强交接

- 范围：`yss-cache`、`yss-distributed-id`、`yss-mybatis`、`yss-repository` 的当前 Boot 3 行为指引；保留 Boot 2 独立源码线。改动位于主模板权威 Skill、生成投影、锁文件及后端 Agent 子项目。模板维护不产生产品 Ticket，`context_reconciliation` 记为 `not-applicable`（`template-source`）。
- 自检：已对照当前 cache、ID、persistence 组件源码检查 JetCache 同步、Redis 故障与区域策略、ID UUID/Segment/Snowflake 分支、分页和批量写入；`bash -n`、非法平台参数退出码 2、`git diff --check` 均通过。
- 本轮 fresh verification：主模板与后端子项目的 `scripts/verify-template-fast` 均退出 0；两仓 `scripts/sync-skills --check`、`scripts/update-skill-lock --check` 和后端 profile 同步检查通过。未据此宣称组件运行或消费项目兼容已验证。
- 来源校验（2026-09-23 复核）：以当前 Boot 3 组件工作树运行 `check-backend-skill-source-index.mjs`，`yss-cache`、`yss-distributed-id`、`yss-mybatis` 均退出 1，统一报 `component worktree is dirty`。以独立的 Boot 2 干净工作树运行同三项检查，均退出 0。现有 Boot 3 干净工作树仍是优化前提交，不能替代本轮改动作为刷新来源；生成索引未手改。
- 未闭合：组件源码形成提交且相应子树干净后，以分别匹配的 Boot 2 / Boot 3 源码根定向刷新三项索引，重跑 freshness 与模板快速验证。CLI 固定来源快照亦待源码、后端 Agent 与模板的提交来源确定后重建；当前不宣称组件兼容或发布就绪。
- 人工边界：本轮无新增产品决定；提交、推送、CLI 发布均未执行，后续仍按各自授权边界处理。当前维护状态为 `implementation-ready`。
