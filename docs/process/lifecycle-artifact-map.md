# YSS 生命周期产物与门禁地图

本文是模板仓库与模板实例共享的生命周期事实源。它定义主阶段、条件门禁、必须持久化的产物和退出标准；具体项目只有在触发条件命中时才执行对应门禁。

## 1. 八个主阶段

| 阶段 | 目标 | 主要产物 | 退出标准 |
|---|---|---|---|
| 入口分诊 | 确认仓库身份、问题范围和影响面 | 入口分诊记录、仓库身份清单 | `yss-project.yaml` 合法，影响面和最近可信阶段可解释 |
| Discovery | 澄清问题、用户、约束和机会 | Discovery 记录、问题陈述 | 问题边界、关键假设和待确认项已记录 |
| Spec / 功能架构 | 固化解决方案和功能边界 | Spec、产品总体设计、功能架构 | Spec 基线和功能边界可审查 |
| 产品设计 | 在存在产品设计影响时校准页面流和状态 | 低保真草图、状态矩阵、高保真 HTML 原型、用户确认 | 触发的设计门禁通过；未触发项记录 `not-applicable` 及原因 |
| 系统 / 数据架构与工程契约 | 固化系统、数据、工程基线和 API 契约；原型确认后为新后端服务建立 YSS 工程骨架 | 架构审查、工程基线、后端脚手架生成结果、OpenAPI Draft / Freeze、ADR | 受影响的工程契约冻结或记录无 API 影响；backend `scaffold_status=required` 时脚手架、基线校验和 Router 重编译证据齐全 |
| Ticket 正式化 | 将冻结范围拆为可追踪的父 Ticket 和垂直切片 | 功能父 Ticket、垂直切片 Ticket | 工作单元窄、依赖清晰、验收和测试 seam 可执行 |
| 垂直切片实现 | 以批准合同驱动 TDD 实现和跨仓库协作 | Slice Implementation Contract、代码、测试、YSS Skill Execution Result | 允许写路径、禁止模式、证据和验证命令全部满足 |
| 验证 / 发布 / 复盘 | 完成 fresh verification、发布和回顾 | 验证记录、发布记录、回滚点、复盘 | 所有命中的门禁通过，人工审查点已完成，checkpoint 可追溯 |

## 2. 条件门禁与产物

| 门禁 | 触发条件 | 必须留下的证据 |
|---|---|---|
| 影响面分析 | 每次变更 | 受影响仓库、资产和风险 |
| 仓库身份校验 | 每次进入流程 | `yss-project.yaml` 校验结果 |
| Discovery | 新问题或边界不清 | Discovery 记录 |
| Spec | 新功能、行为变化或范围扩大 | Spec 基线 |
| 产品总体设计 | 进入 Spec 基线 | 总体设计或功能架构 |
| 功能架构 | 新模块或跨边界变化 | 功能架构图 / 说明 |
| 低保真原型 | 命中产品设计影响 | 页面流草图 |
| 状态矩阵 | 存在状态流转、异常或恢复 | 状态矩阵 |
| 高保真 HTML 原型 | 需要视觉与交互校准 | 原型地址和审查结果 |
| 用户确认 | 产品设计影响未被人工确认 | 确认记录 |
| OpenAPI Draft | 有 API 影响 | OpenAPI 3.1 Draft |
| 设计审查 | API 或架构影响 | 审查意见和处理结果 |
| OpenAPI Freeze | API 进入实现 | Freeze 版本和消费者确认 |
| 数据架构 | 数据模型、存储或一致性变化 | 数据架构记录 |
| 工程基线 | 后端、前端或高风险工程变化 | 工程基线、项目根路径和验证命令；Harness 内项目必须符合 `apps/backend/<project>/` / `apps/frontend/<project>/`，新后端还需脚手架登记、Router 脚手架合同 draft / 生命周期批准记录、生成器输入 / 预期文件、`./mvnw` 结果和 YSS Skill Execution Result |
| 架构审查 | 高风险或跨边界变化 | 架构审查记录 |
| Spec Delta | 已有冻结 Spec 的高风险行为变化 | `ADDED / MODIFIED / REMOVED` 差异 |
| 功能父 Ticket | 每个进入追踪的功能 | `parent-ticket.md` 或远程父 Ticket |
| 垂直切片 Ticket | 进入实现前 | 可独立验证的切片 Ticket |
| Slice Implementation Contract | Agent 进入实现；脚手架完成后每个后续生成代码工作单元 | 批准的 Slice Implementation Contract、当前版本、YSS skill 闭包和写路径 / 证据约束 |
| YSS Skill Execution Result | YSS 专项 skill 完成工作单元 | YSS Skill Execution Result |
| Fresh Verification / 发布 | 合并、发布或阶段完成 | fresh verification、release、rollback、checkpoint |

所有门禁都是条件强制门禁。未命中触发条件时，必须明确记录 `not-applicable` 及原因；不生成空文档。完成结论必须同时包含批准的 Slice Implementation Contract 与 YSS Skill Execution Result（若进入实现阶段）。

## 3. 退出与 checkpoint

阶段退出以“当前命中的门禁已通过、阻塞边已清除、证据可读、下一阶段入口明确”为准。连续推进时集中记录阶段因果、Ticket 同步状态、验证证据、风险、人工审查点和 Git checkpoint；不把单个阶段的口头汇报当作完成证明。
