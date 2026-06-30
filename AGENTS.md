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

这些阶段不是死流程。Agent 必须先判断任务类型，再选择最小必要流程；明确 Bug、小调整和探索任务不应被强行套入完整新功能链路。

### 任务入口分流

| 任务类型 | 推荐路径 | 关键门禁 |
|------|------|------|
| 模糊想法 / 产品机会 | 机会探索环 → 需求澄清 | 进入 PRD 前必须收敛用户、痛点、MVP 和非目标范围 |
| 已有竞品 / 用户 / 行业材料 | Discovery → 机会构想 → `grill-with-docs` → PRD | 事实输入必须转化为 MVP 边界和验收标准 |
| 新模块 / API / 跨端改动 | `grill-with-docs` → PRD → OpenAPI → OpenSpec/Comet → 垂直切片 → TDD | 契约变更先更新 `docs/api/specs/*.yaml` |
| 明确 Bug / 测试失败 / 性能回退 | diagnosing-bugs → tdd → verify | 先建立可复现反馈命令，再修复 |
| 小文案 / 局部样式 / 配置调整 | comet-tweak 或直接最小改动 → verify | 扩散到 API、状态、权限或多模块时升级完整流程 |
| 架构治理 / 难测模块 | improve-codebase-architecture / codebase-design → ADR / Issue | 使用 module、interface、seam、adapter 术语 |

### 机会探索环

机会探索不是固定的“头脑风暴 → 发现”单向流程，而是三类输入之间的循环：

```text
市场 / 竞品 / 用户事实 <-> 机会构想假设 <-> MVP 边界
```

进入 PRD 前必须收敛为：

- 用户是谁。
- 痛点是什么。
- 为什么现在做。
- 第一版做什么。
- 明确不做什么。
- 成功标准是什么。

说明：

- 如果只有一个模糊想法，可以先由 Ideation Agent 发散假设，再由 Discovery Agent 验证。
- 如果已经有行业、竞品或用户材料，应先由 Discovery Agent 整理事实，再由 Ideation Agent 生成候选方案。
- Ideation Agent 的“机会构想”不等同于 Superpowers `brainstorming`。前者回答“可能做什么、是否值得探索”，后者用于某个候选方向进入设计前的需求澄清、方案比较和设计说明。

### 阶段、Agent 与职责

| 阶段 | Agent | 职责 |
|------|-------|------|
| 0. 入口分诊 | Intake / Lifecycle Agent | 判断任务类型、风险等级和最小技能集；选择 OpenSpec / Comet / Superpowers / YSS 路径 |
| 1. 机会探索 | Discovery + Ideation Agent | 市场、竞品、用户事实与机会构想假设循环验证；形成机会清单、MVP 边界和非目标范围 |
| 2. 需求澄清 | Product / Grill Agent | 使用 `grill-with-docs`、`domain-modeling` 澄清用户、场景、术语、验收标准；必要时更新 `CONTEXT.md` |
| 3. 需求成文 | PRD / Issue Agent | 使用 `to-prd` 生成 PRD；明确 OpenAPI 影响、测试 seam、安全红线；使用 `to-issues` 拆垂直切片 |
| 4. 契约先行 | API Contract Agent | 先更新 OpenAPI 3.1 Spec，再实现前后端；定义统一响应、错误结构、分页和契约测试 |
| 5. 方案设计 | Architecture / OpenSpec Agent | 生成 proposal、design、spec、tasks；明确模块边界、数据流、风险和取舍；必要时写 ADR |
| 6. 实施计划 | Planning Agent | 使用 `writing-plans` 把方案拆成可执行步骤；每步包含文件、测试、验证命令和回滚点 |
| 7. 开发实现 | Code Agent | 使用 `yss-router` 选择最小 YSS skills；按垂直切片 TDD 实现，前后端通过 OpenAPI 对齐 |
| 8. 独立审查 | Review Agent | 实现者不得审查自己；重点审安全红线、契约一致性、分层边界和测试缺口 |
| 9. 清理简化 | Simplify Agent | 在功能已验证基础上处理复用、质量和效率问题；不做无关重构 |
| 10. 验证发布 | Verify / Release Agent | fresh verification、契约测试、关键路径 E2E、发布说明、实施步骤和回滚方案 |
| 11. 复盘沉淀 | Retro / Knowledge Agent | 将术语、规则、踩坑、ADR、AGENTS.md 约定和用户手册更新回仓库 |

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
