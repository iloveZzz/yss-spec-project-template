# 技能迁移说明

本文记录已退役技能入口的迁移路径。退役技能不保留物理目录、投影或 lock 条目；本文件是历史名称的唯一持久兼容说明。

## `yss-harness-upgrade` 更名（2026-10-08）

安装和实例维护入口统一为 `setup-yss-harness`，支持用户级独立调用、环境分流及有效授权内的规划、应用与验收。新请求命中旧 ID 返回 `skill-retired` 并指向新技能；活跃源码不保留旧目录、投影、Registry alias 或 lock 条目。

已发布 CLI 的固定 Bundle、历史批准与既有实例保持原状。旧 Bundle 的名称只作历史识别与读取，补装前用实际 `skills list` 核对；新名称进入实例分发依赖后续固定来源 CLI 发行。既有工程按明确同步或迁移计划更新，无法安全退役的定制旧文件保留为明确例外。

## `grill-me` 入口退役（2026-09-24）

`grill-me` 仅转发到 `grilling`，现已硬退役。新请求直接使用 `grilling`；旧 ID 返回 `skill-retired`，不保留兼容目录、投影、Registry 或 lock 条目。历史候选与冻结证据只读保留。

## high-fidelity-html-prototype

`high-fidelity-html-prototype` 已退役，不再作为 Router alias、默认发现入口或独立物理技能存在。

迁移到：

- 阶段合同：`yss-prototype-stage`
- 高保真默认入口：`yss-prototype-stage` 离线 HTML；独立视觉稿按需使用 `product-design:index`
- 独立低保真评审：`prototype-review`

迁移时保留原型评审记录、AntD CLI 验证、浏览器验证和用户确认，并由 `yss-strategic-design` 将专业结论登记为 `check.prototype-reviewed`、`check.prototype-verified`，再裁决 `gate.product-design-approved`。旧 `gate.*` 记录仅作为历史证据，不得创建同名兼容目录或自动继承批准。

## 2026-09-14：HTML 原型与 Provider 退役

`yss-antdv-next-design`、`yss-antd-design` 从当前技能、默认生成路线及分发中移除。新原型使用 `yss-prototype-stage` 的 html-css-js 适配器；历史原型、fact pack、截图及用户决定保持只读。在途继续演进时新建 HTML 工作版本，重新验证并确认；普通同步不直接删除消费项目的历史或用户修改资产。

## 2026-09-28 入口收敛

以下旧 Skill ID 已硬退役：新调用返回 `skill-retired` 和迁移提示，不能自动执行替代入口或改变阶段状态。历史证据只读保留。

| 旧入口 | 承接位置 |
|---|---|
| wait-what | 普通解释对话，按文档写作规范或 i-have-adhd 调整表达 |
| grill-with-docs | 当前生命周期的 work-unit.plan-requirements，保留 Context 校验、对账和退出判定 |
| to-questionnaire | 当前生命周期外部输入问卷，保留 external-input-required 与答案回流合同 |
| improve-codebase-architecture | codebase-design 显式架构审计模式及可选 HTML 报告 |

Data Analytics 平台包从本模板及 frontend 分发退出；不卸载用户另装插件。frontend-commit / java-backend-commit 保留专项入口并读取内部 git-commit-core。prototype 仅做逻辑与状态试验；正式 UI 由生命周期产品设计阶段承接。

存量实例先预览同步计划。只按旧版本基线移除未修改的受管文件，用户修改保留并报告冲突；不自动迁移历史审批、问卷或快照。
