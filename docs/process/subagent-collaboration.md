---
status: active
owner: ai
---

# Subagent 协同规范

本文定义 YSS 规格流程中 subagent 的使用边界。结论：subagent 可以提升调研、草案、局部实现、独立审查和验证效率；生命周期裁决仍由主控 Agent 负责。

## 核心原则

```text
子代理负责执行与证据，主控 Agent 负责裁决与收口。
```

subagent 不是“多几个 Agent 一起做同一件事”，而是主控 Agent 将生命周期中的证据收集、草案产出、局部实现、独立审查和 fresh verification 拆成有边界的任务包。没有任务包边界时，不得派发 subagent。

## 角色定义

| 角色 | 职责 | 典型输出 | 默认写权限 |
|---|---|---|---|
| 主控 Agent | 生命周期阶段判定、任务拆分、结果合并、门禁裁决、Issue 同步、Git checkpoint | 阶段结论、正式资产、合并记录、下一步 | 可写正式资产 |
| Explorer subagent | 查现有资产、技术事实、竞品事实、代码影响面、缺失项 | 事实清单、证据链接、风险列表 | 只读 |
| Drafter subagent | 起草 PRD、设计、OpenAPI、架构、Issue 或 release 文档 | 草案文档或章节补丁 | 仅限指定文档 |
| Worker subagent | 实现指定切片、测试、脚手架或局部修复 | 代码变更、测试结果、变更说明 | 仅限指定文件 / 模块 |
| Reviewer subagent | 独立审查 PRD、OpenAPI、架构、代码、发布准备度 | findings、blocker、残余风险 | 默认只读 |
| Verifier subagent | 执行验证、复现实验、回归命令、截图或 CI 证据整理 | fresh verification 记录 | 默认只读，必要时写验证记录 |

## 可委派与不可委派

| 可委派事项 | 不可委派事项 |
|---|---|
| 竞品 / 市场 / 技术事实调研 | 生命周期阶段最终判定 |
| Discovery / PRD / 设计 / 架构 / OpenAPI 草案 | PRD baseline / requirement freeze |
| API Draft Review、Design Review findings | OpenAPI Freeze |
| 垂直切片草案和实现路由草案 | Architecture Review 最终放行 |
| 前端、后端、测试等边界清晰的局部实现 | 安全红线放行 |
| 独立 code review | Issue tracker 最终状态裁决 |
| fresh verification 执行与证据整理 | Git checkpoint 范围裁决 |
| release note / retro 草案 | “完成 / 可合并 / 可发布”结论 |

## 任务包门禁

主控 Agent 派发 subagent 前，必须为每个任务包明确：

- `task_id`：唯一编号，关联阶段、Issue 或切片。
- 任务类型：explore / draft / work / review / verify。
- 生命周期阶段和对应门禁。
- 输入资产：PRD、OpenAPI、设计、ADR、Issue、代码路径或命令。
- 输出资产：文档路径、review findings、代码文件、验证记录或摘要。
- 写范围：允许修改的文件 / 模块；只读任务必须写明只读。
- 禁止事项：不得 freeze、不得改安全红线、不得覆盖他人改动等。
- 验收标准：完成后主控 Agent 如何判断任务有效。
- 汇合方式：结果写入何处，冲突如何上报。

模板见 `docs/templates/subagent-task-package-template.md`。

## 生命周期使用策略

| 主阶段 | 推荐用法 | 风险控制 |
|---|---|---|
| 1. 入口分诊 | 复杂项目可派 Explorer 检查现有资产、Issue、git 状态 | 主控 Agent 保留最近可信阶段裁决 |
| 2. 机会与 Discovery | 竞品、市场、用户流程、技术事实并行调研 | 调研结论只能作为 PRD 输入，不得直接冻结需求 |
| 3. 业务 / PRD / 功能架构 | PRD 草案、功能架构、业务架构并行起草；Reviewer 质询边界 | 主控 Agent 合并术语、范围、非目标和验收标准 |
| 4. 产品设计与需求冻结 | 页面流、状态矩阵、AntD / YSS 设计系统、高保真 HTML 原型、Prototype Review 分工 | 用户确认和 requirement freeze 不可委派 |
| 5. 系统 / 数据架构与工程契约设计审查 | API Draft、系统架构、数据架构、Spec Delta、Draft Review 并行 | OpenAPI Freeze 和架构放行不可委派 |
| 6. 契约冻结与 Issue formalization | `to-issues` 草案、实现仓库 / 脚手架状态检查并行 | 主控 Agent 确认端到端切片和 Issue 同步 |
| 7. 垂直切片与 TDD 实现 | 前端、后端、测试、验证按文件 / 模块拆给 Worker；Reviewer 独立审查 | 写范围必须不重叠；同一 Agent 不得自审 |
| 8. 验证发布与复盘 | Verifier 执行 fresh verification；Drafter 起草 release / retro | 发布、合并、完成结论不可委派 |

## 并行拆分规则

- 信息类任务可并行：不同事实来源、不同资产检查、不同审查维度可以同时进行。
- 写入类任务按文件或模块拆分：每个 Worker 必须有不重叠的写范围。
- 阻塞链路主控优先：如果主控 Agent 下一步立即依赖某个结果，应优先本地完成，不把关键路径外包后等待。
- 子代理不得重复彼此任务；同一问题只能派一个责任代理，除非明确是独立复核。
- 子代理返回结果后，主控 Agent 必须做快速审查、合并和冲突处理，不能直接把子代理输出视为阶段结论。

## 合并与冲突处理

当 subagent 结论冲突时，主控 Agent 按以下优先级裁决：

1. 已冻结的 PRD、OpenAPI Freeze、ADR、架构评审和 Issue。
2. 当前 fresh verification、测试、CI 和可复现证据。
3. `CONTEXT.md` 中已确认的领域术语。
4. 安全红线和 `TODO-HUMAN-REVIEW` 要求。
5. 用户最新明确指令。

若冲突会改变需求、契约、架构、安全或发布结论，必须回到对应生命周期阶段重新审查，不得由 subagent 或主控 Agent 临时绕过。

## 记录要求

每个使用 subagent 的生命周期阶段，必须在阶段 checkpoint 或 Issue 评论中记录：

- 派发的任务包编号和子代理角色。
- 输入资产和输出资产。
- 写范围和实际变更路径。
- 是否存在冲突、漂移或被主控 Agent 覆盖的结论。
- 独立 review / fresh verification 证据。
- 未采纳的子代理建议及原因。

## 最小落地标准

一次 subagent 协同只有同时满足以下条件，才算可追溯：

- 至少一个任务包使用 `docs/templates/subagent-task-package-template.md` 或等价字段记录。
- 阶段 checkpoint 记录 subagent 使用情况。
- 所有写入类 subagent 的文件范围清晰且不重叠。
- 所有审查类 subagent 独立于实现者。
- 主控 Agent 明确给出最终阶段结论和证据来源。
- 安全红线、Freeze、release、Git checkpoint 未被 subagent 代替裁决。
