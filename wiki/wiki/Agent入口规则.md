# Agent 入口规则

`AGENTS.md` 是 Agent 启动任务时必须首先遵守的全局路由、硬门禁和禁止事项。其核心要求是：每个任务开始时先读取根目录 `yss-project.yaml`，依据 `repository_mode` 判定仓库身份（见 [[仓库身份与路由]]），再选择模板维护流程或产品研发生命周期。

入口规则确立了单一事实来源表：领域与流程词汇以 `CONTEXT.md` 为准，Agent 入口规则以 `AGENTS.md` 自身为准，主阶段、门禁、产物与退出标准以生命周期映射为准，影响面触发与 `not-applicable` 以裁剪指南为准（见 [[影响面分诊与流程裁剪]]），技能清单以 `skills-lock.json` 为准。README 与用户指南只引用或解释上述事实，不重复定义规则。

标准文档语言约定：所有面向业务、产品、架构、实施、审查、发布和复盘的落地文档正文统一使用简体中文；英文专有名词、代码标识、API 路径、schema、类名、方法名、枚举值、错误码、命令、文件名与协议 metadata 保持原样。

专项任务有强制入口：技术事实用 `research`、竞品事实用 `competitive-intelligence`、UI 设计用 `yss-design-system`、Bug 用 `diagnosing-bugs` 加 `tdd`、合并冲突用 `resolving-merge-conflicts`、架构治理用 `codebase-design`、跨线程跨仓库交接用 `handoff`（见 [[Matt技能体系]] 与 [[YSS工程技能体系]]）。业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现。
