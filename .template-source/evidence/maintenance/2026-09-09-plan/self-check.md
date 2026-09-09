# Plan 阶段调整维护者自检

日期：2026-09-09。身份：`template-source`。维护强度：L3（`lifecycle-gate`、`cross-repo-contract`、`aggregate-behavior-change`）。默认出口：`implementation-ready`。

## 已确认范围

用户两次确认战略规划推荐：Plan 完成后可进入 Spec；影响业务边界、关键规则或 MVP 的问题必须先解决；非关键项经确认后带责任人、解决时点和接收方进入下游。

侧边任务 `01a086cf-2c3f-72e3-9912-b9b23c098c4f` 转达用户原话：“discovery 不做兼容，后续开发项目不存在discovery阶段了，反馈给主任务”。最终实施以该修正为准，取消初拟别名兼容方案。

## 自检结论

- 主模板与战略设计模板均采用 `stage.plan`、`artifact.plan-record` 和 `work-unit.plan-*`；阶段与资产事实由各仓注册表持有。
- 不提供旧阶段或旧工作单元解析；注册表旧 ID 仅进入弃用清单，防止重新分配。查询旧 ID 的反例应失败。
- 规划模板覆盖已确认边界、优先级、未决项责任和交接；Plan 之后仍保留 Spec、原型及 profile 的后续阶段。
- 探索方法和复用模板移至 `docs/plan/`；旧兼容 README 与收敛模板入口已移除。原有历史报告未改写，CLI 分发排除 `docs/discovery`。
- `.agents/skills` 为修改源；runtime 投影和锁由脚本生成。来源哈希覆盖战略设计子仓工作树，尚未提交，不能称为已发布版本。
- 不修改运行时代码；Nacos 服务发现与技能发现等无关概念保留。既有 `submodules/create-yss-harness-dev` 的用户修改未纳入本轮。

## 反证与限制

旧阶段不能静默视作新规划通过；缺少 Plan 关键结论时需重新整理和确认。非关键延期不得用于规避 runnable blocker。Plan 是 YSS 本地命名，官方 Inception 的职责范围更大。

模板内产品 Spec、产品原型、OpenAPI、产品 Ticket、Slice 合同与产品 `context_reconciliation` 为 `not-applicable`：本次仅维护模板合同，不是产品工作单元。模板根词汇合同仍执行验证。

## 验证与交付边界

验证结果记录在相邻维护 checkpoint。注册表、旧 ID 拒绝、状态转换、技能治理、跨仓模板分发和 CLI 实际初始化均需使用本轮结果。默认不冻结候选、不创建正式独立审查、不提交、不推送、不发布。

回滚点为各仓本轮开始前 HEAD；本轮变更均留在工作树。移除的旧模板入口可由 Git 历史恢复；历史冻结证据未删除。

Tracker：模板维护集中 checkpoint；未生成产品父 Ticket 或实现切片。下一步若需要发布，须完成按仓提交、更新来源 revision / gitlink 并重新执行发布门禁。
