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

## 研发自动化体系：OpenSpec × Comet × Superpowers

| 层级 | 组件 | 职责 |
|------|------|------|
| **契约层** | OpenAPI 3.1 Spec | 前后端 Agent 共同语言 |
| **状态机层** | Comet (.comet.yaml + comet-guard.sh) | Open→Design→Build→Verify→Archive |
| **方法论层** | Superpowers (spike/plan/tdd/review/debug/simplify) | Agent 协作模式 |
| **编排层** | cronjob / webhook / delegate_task | 自动化流水线 |

### Comet 五阶段流水线

```
Open → Design → Build → Verify → Archive
  │       │        │        │         │
Spec    Plan     TDD     Review    Deploy+Retro
      comet-guard.sh 门禁检查每个阶段转换
```

**Comet 状态推进规则：**
- `.comet.yaml` 是唯一状态源，禁止手工修改 pipeline 阶段状态。
- 阶段推进必须通过 `scripts/comet-driver <pipeline> advance` 或 `scripts/ysscomet advance <pipeline>`。
- Agent / harness / stage-executor 只允许生成 artifacts，不允许直接推进 `current_stage`。
- 每个 artifact 头部必须包含 `pipeline: <id>`，guard 会拒绝使用其他 pipeline 的产物。

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
| | v1.0 | 从 ysscomet-project-template 初始化 |
