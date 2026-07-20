---
name: to-spec
description: Use when the current discussion is sufficiently resolved to synthesize a product-development specification without another requirements interview.
disable-model-invocation: true
---

# To Spec

将已经澄清的对话、Discovery 和仓库上下文整理为 Spec。本 skill 只做综合，不重新访谈用户，也不将未冻结的 Spec 标记为可实现。

## 流程

1. 读取 `CONTEXT.md`、相关 ADR、Discovery、质询记录和现有资产。统一使用领域词汇和简体中文正文。
2. 提取已确认的测试 seam，优先复用最高的现有公开边界。如果 seam 尚未确认，将其记为 `ready-for-human` 阻塞项，不自行发明实现边界。
3. 按下方结构写入 `docs/requirements/<feature>-spec.md`。不在 Spec 中写具体实现文件路径或大段代码。
4. 创建或更新功能父 Ticket，链接本地 Spec 和上游资产，并标记 `ready-for-human`。

## 状态红线

- Spec 初稿不得标记 `ready-for-agent`。
- 只有需求冻结、必要设计审查、OpenAPI Freeze 或无 API 影响记录完成后，才能进入 `to-tickets`。
- 本 skill 不创建垂直切片 Ticket，不关闭功能父 Ticket。

## Spec 结构

### 问题陈述

从用户视角说明问题、影响和为什么现在要解决。

### 解决方案

从用户视角说明预期能力和价值，不展开实现步骤。

### 用户故事

用编号列表覆盖主流程、异常、权限、边界和恢复场景：

1. 作为 <角色>，我希望 <能力>，以便 <价值>。

### 验收标准

使用可观测行为定义成功、失败和边界条件。

### 已确认决策

记录功能域、模块边界、公开接口、数据 / API 影响、状态与权限约束。原型中只有状态机、schema 或类型形状比文字更精确时，才内联最小决策片段。

### 测试决策

记录已确认 seam、对外行为、相似测试先例和不测实现细节的约束。

### 非目标

明确本 Spec 不交付的能力、角色、端、数据或运维范围。

### 未决项与风险

只保留会阻塞需求冻结或下游设计的未决问题，并标注责任人和期望解决阶段。
