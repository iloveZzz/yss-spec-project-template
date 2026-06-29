# AGENTS.md — AI 开发指令

> **本文档是 AI Harness 的核心载体。所有 AI Agent 启动时必须读取本文档。**

---

## 项目概述

- **项目名称：** [填写]
- **业务领域：** [填写]
- **团队规模：** [填写]

---

## 编码规范

### 通用规则
- 所有函数/方法必须有类型注解
- 单文件不超过 300 行，超过则拆分
- （补充项目特定的命名规范、代码风格）

### 分层架构
```
Controller → Service → Repository
     ↓ 禁止跨层调用
```

### API 规范
- 版本化 URL：`/api/v1/`
- 统一响应格式
- （补充项目特定的 API 约定）

### 前后端契约
- 以 OpenAPI 3.1 Spec 作为 API 契约
- 契约变更必须先更新 Spec，再分别实现前后端

---

## 测试要求

| 层级 | 覆盖率要求 |
|------|-----------|
| Service 层 | ≥ 90% |
| API 层 | ≥ 80% |
| 前端组件 | ≥ 75% |
| 关键流程 | 100% (E2E) |

---

## 安全红线（AI 绝对不可触碰）

| 场景 | AI 权限 |
|------|---------|
| 支付相关逻辑 | 仅生成草案 |
| 数据库迁移脚本 | 仅生成模板 |
| 认证/授权中间件 | 仅生成草案 |
| 加密算法实现 | **禁止生成** |
| SQL 原生查询 | 仅生成草案 |
| 公共基础库 API 变更 | 仅生成草案 |

---

## 研发协作体系：OpenSpec × Superpowers

| 层级 | 组件 | 职责 |
|------|------|------|
| **契约层** | OpenAPI 3.1 Spec | 前后端 Agent 共同语言 |
| **方法论层** | Superpowers (spike/plan/tdd/review/debug/simplify) | Agent 协作模式 |
| **编排层** | 项目自选 harness / CI / webhook | 自动化流水线 |

---

## Agent skills

本仓库已集成 Matt Pocock Engineering Skills，Codex 与 Hermes 均可调用。能力说明见 `docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md`。

### Issue tracker

Issues 和 PRD 默认发布到 GitHub Issues；外部 PR 暂不作为 triage 请求入口。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用标准五态标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

使用单上下文领域文档布局：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

### Recommended flow

默认需求交付链路：`grill-with-docs -> to-prd -> OpenAPI Spec -> to-issues -> implement with tdd -> review/verify`。

### Mandatory skill rules

- 新功能或较大改动必须先用 `grill-with-docs` 澄清需求，再用 `to-prd` / `to-issues` 形成 PRD 和垂直切片 Issue。
- 任何 API 契约变更必须先更新 `docs/api/specs/*.yaml`，再实现前后端和测试。
- 任何 Bug、测试失败或性能回退必须先用 `diagnosing-bugs` 建立可复现反馈命令，再修复。
- 任何实现工作默认使用 `tdd`：一次一个行为测试，测试公共接口，不测试内部实现细节。
- 架构治理、难测模块、深模块设计必须使用 `improve-codebase-architecture` / `codebase-design` 的 module、interface、seam、adapter 术语。
- `to-issues` 产出的任务必须是端到端垂直切片，不允许只按 Controller / Service / Repository 横向拆分。
- 触碰安全红线时，必须标记 `ready-for-human` 或 `TODO-HUMAN-REVIEW`，Agent 只能生成草案。

---

## AI Agent 协作规范

| 阶段 | Agent | 职责 |
|------|-------|------|
| 💡 头脑风暴 | Ideation Agent | 发散→收敛→挑战→连接→记录 |
| 🔍 发现 | Market / Competitor / User Insight | 市场 / 竞品 / 用户 |
| 📋 需求 | Plan Agent | 需求 → Sprint Backlog |
| 🏗 设计 | Architecture Agent | 方案生成 + 六维预审 + ADR |
| 💻 开发 | Code Agent × 2 | 前后端并行 TDD |
| 🔍 审查 | Review Agent × 2 | 独立安全审查 |
| 🧹 清理 | Simplify Agent × 3 | 复用/质量/效率 |
| ✅ 检查 | Test + Standup | 测试生成 + 站会 |
| 🔄 改进 | Retro + Knowledge | 复盘 + AGENTS.md 沉淀 |

### Agent 铁律
1. **实现者 ≠ 审查者** — 同一段代码不能由同一个 Agent 审查
2. **无测试不写代码** — 先写失败测试，再写实现
3. **Fail-Closed 审查** — 无法确认安全性 → 自动拒绝
4. **安全红线不可逾越** — 触碰红线 → 标记 TODO-HUMAN-REVIEW

---

## 项目专属约定

<!-- 随项目推进持续补充 -->
### 业务规则
- （待补充）

### 已知陷阱
- （待补充）

### 性能基线
- （待补充）

---

## 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| | v1.0 | 从 yss-spec-project-template 初始化 |
