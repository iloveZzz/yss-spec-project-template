---
name: to-tickets
description: Use when a frozen specification or approved plan must be divided into independently verifiable vertical slices with explicit blocking edges.
disable-model-invocation: true
---

# To Tickets

将已冻结范围拆成可独立验证的窄垂直切片 Ticket，并明确每个 Ticket 的阻塞边。

## 前置条件

- 需求已冻结，功能父 Ticket 已存在。
- OpenAPI Freeze 或无 API 影响记录已完成。
- 必要的产品设计、系统 / 数据架构、工程基线和人工确认已通过。

任一前置条件不满足时，回到功能父 Ticket 记录阻塞，不发布可实现 Ticket。

## 流程

1. 读取功能父 Ticket 及其链接的 Spec、设计、OpenAPI Freeze、ADR、架构和验证资产。
2. 用项目领域词汇起草简体中文 Ticket。每个切片都要贯穿所有受影响层，完成后可独立演示或验证。
3. 为每个 Ticket 声明真实阻塞边。需要宽范围机械重构时，使用 expand → migrate → contract，不强行伪装成垂直切片。
4. 向用户展示编号拆分，确认粒度、阻塞边和合并 / 拆分点。
5. 按依赖顺序发布 Ticket，关联功能父 Ticket。只有阻塞边已全部清除的 frontier Ticket 才标记 `ready-for-agent`。

## 垂直切片规则

- 切片要窄但完整，不只修改 schema、API、UI 或测试中的某一层。
- 一个 Ticket 应能在一个新鲜上下文窗口中完成。
- 优先完成能让后续实现更容易的前置切片，但其自身仍必须可验证。
- 禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分。

## 状态红线

- 被其他 Ticket 阻塞的 Ticket 不得标记 `ready-for-agent`。
- 功能父 Ticket 保持 `ready-for-human` 或当前阶段状态，本 skill 不关闭或改写父 Ticket。
- 平台支持 native blocking / sub-issue 时优先使用；否则在正文中使用可追踪引用。

## 本地 Ticket

未配置真实 Tracker 时，在 `.scratch/<feature-slug>/tickets/` 下按依赖顺序生成一个文件对应一个 Ticket：

```markdown
# <NN> — <Ticket 标题>

## 交付行为

<从用户视角说明本切片完成的端到端行为>

## 阻塞项

<阻塞 Ticket 的编号和标题，或“无”>

## 验收标准

- [ ] <可观测验收条件>

## 状态

<`ready-for-agent` 或“被 <Ticket> 阻塞”>
```
