---
name: ask-matt
description: 显式查询战略 profile 的可用技能、下一工作单元或交接路径。
disable-model-invocation: true
---

# 战略技能导航

本 profile 的默认主控是 `yss-strategic-design`，负责 Plan、业务边界、规则、场景及战略交接。先读当地 Registry 与当前资产，推荐实际已安装的下一技能；普通问答直接回答，不启动整个生命周期。

- 业务语言或责任边界：主控安排 `domain-modeling`；已有根 `CONTEXT.md` 仅按需读取，不因只读而重建。
- 技术/策略事实：`yss-research`；竞品事实：`competitive-intelligence`。
- 产品设计：`yss-prototype-stage` → `yss-design-system` 与独立 `prototype-review`，由主控核验门禁。
- 方案决定及 Plan → Spec 接口：`yss-stage-decision`，保留当前真实用户决定和交接依据。
- 用户明确点名 `to-spec`、`to-tickets` 时，按当地兼容入口合同预检并回交主控；不得隐式调用。
- 实现、后端/前端代码、实现审查或生产测试：交接到登记的后端/前端消费项目及其主控。这里不调用未安装的 implement、tdd、prototype、teach 或 setup 入口。

输出当前事实、下一技能、输入缺口和交接对象。导航不批准合同、不修改 Ticket 状态、不提交 Git、不发布远端。已有输入已确认时复用；只询问影响当前路由的缺失决定。
