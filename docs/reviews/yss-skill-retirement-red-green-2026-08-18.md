# YSS 技能退役 RED / GREEN / REFACTOR 记录

日期：2026-08-18

## 范围与决策

本轮退役 `yss-db2mybatis`、`yss-mail`、`yss-sql-tpl`、`yss-sql-condition`、`yss-valuation`、`yss-variable` 和 `yss-quality`。退役范围包括权威源、六个 Agent 投影、`skills-lock.json`、公开技能清单、现行 Router/source-index 路由和当前 Wiki 文档；`wiki/raw/**` 历史快照保持不变。未修改外部公开技能仓库，未提交或推送。

## RED：退役不变量基线

基线检查要求 7 个退役名同时满足：权威源和六个投影根不存在、锁文件没有登记、公开清单没有登记、供应链 obsolete 集合包含该名称。

基线结果：退出码 `1`。`yss-db2mybatis`、`yss-valuation`、`yss-variable` 仍存在于权威源、投影、锁文件和公开清单；7 个名称中仍有 4 个本地空目录；前三个有效技能尚未进入 obsolete 集合。

该基线覆盖以下压力场景：只删除权威源会留下投影；只更新投影会留下 lock/public 清单；只更新清单会留下 Router/source-index 路由；全仓库替换会错误触碰 `wiki/raw/**` 历史证据。

## GREEN：最小退役实现

- 将 7 个名称纳入供应链 obsolete 防回流集合。
- 删除 3 个仍有内容的权威技能及其生成投影。
- 清除 4 个空占位目录。
- 将持久层路由收敛到 `yss-repository` 和 `yss-mybatis`。
- 删除 `yss-valuation`、`yss-variable` 的 Router、source-index 和公开清单映射。
- 更新当前 Wiki，保留 `wiki/raw/**`。

首轮 GREEN 检查发现 `yss-source-index/scripts/refresh-yss-skill-index.mjs` 仍会重新生成 `yss-variable` 和 `yss-valuation` 映射；删除这两条生成配置后重新同步投影和锁文件。

最终 GREEN 结果：

- 退役不变量：通过，7 个名称均不在源、投影、lock 或 public manifest。
- `scripts/sync-skills --check`：通过。
- `scripts/update-skill-lock --check`：通过。
- `scripts/verify-yss-router-scenarios`：通过。
- `scripts/verify-lifecycle-registry`：通过（`shadow`）。
- `scripts/verify-template`：通过（含 Node tooling、生命周期、脚手架、原型、Matt/YSS、Router、UI 和 OpenAPI 压力门禁）。
- 两份源码索引刷新脚本 `node --check`：通过。
- `git diff --check`：通过。

## REFACTOR：残留扫描

排除供应链 obsolete 集合、`wiki/raw/**` 历史快照和本轮审查目录后，`rg` 未发现 7 个退役名称的现行引用。没有创建 ADR：本次是可回滚的技能清单和路由收缩，没有新的难以逆转架构取舍。

## 独立审查边界

独立审查确认退役闭环、投影/锁文件、Router、`wiki/raw/**` 保护和完整模板门禁均通过。工作区仍包含本轮开始前已有的 Rust runtime 相关 `CONTEXT.md`、ADR、`docs/.scratch/` 和研究记录变更；这些文件不属于本轮退役范围，按要求保持原样。

本文件及本轮审查记录保留退役名称，是为了提供可追溯的 RED/GREEN/REFACTOR 证据，不是 Agent 可发现的技能目录、Router 路由、lock/public 登记或生成映射；严格的现行引用扫描因此将审查记录作为证据例外。
