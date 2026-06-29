# 全生命周期最佳实践

本文补充 [产品全生命周期使用手册](./product-lifecycle-workflow.md)，用于约束长期使用这套模板时的工作习惯、质量门禁和常见反模式。

## 1. 核心原则

### 1.1 先稳定语言，再稳定实现

业务系统最怕“同一个东西有三个名字”。开始写代码前，先把稳定术语写进 `CONTEXT.md`。

示例：

```text
模型、字段、草稿版本、发布版本、校验错误、引用关系
```

如果一个术语还在讨论中，可以先放在 PRD 或 discovery 文档，不要急着写进 `CONTEXT.md`。

### 1.2 API 先于前后端实现

只要涉及前后端接口，就先更新 `docs/api/specs/*.yaml`。

这能避免：

- 后端 DTO 和前端类型不一致。
- 错误响应没有统一结构。
- 分页、排序、筛选字段反复改。
- 实施文档和真实接口脱节。

### 1.3 一个 change 只解决一个目标

OpenSpec / Comet change 应该围绕一个清晰目标。

好的 change：

```text
实现模型发布与版本冻结
```

过大的 change：

```text
实现数据中台模型管理、指标管理、血缘分析和权限审批
```

如果一个 change 需要多天都说不清完成标准，通常应该拆分。

### 1.4 用垂直切片交付，不按技术层横切

每个任务都应该能独立验收。

推荐：

```text
创建模型草稿：API + Service + Repository + 前端弹窗 + 测试 + 验收
```

不推荐：

```text
写所有 Controller
写所有 Service
写所有页面
```

### 1.5 人类保留最终决策权

AI 可以生成方案、代码、测试和报告，但这些决策必须由人确认：

- 产品优先级。
- 架构方向。
- 发布范围。
- 安全红线。
- 数据库迁移。
- 认证授权。
- 公共基础库 API。
- 加密算法相关内容。

触碰安全红线时，文档或代码中必须标记 `TODO-HUMAN-REVIEW`。

## 2. 推荐工作模式

### 2.1 完整功能

适用于新模块、新页面、API 变更、跨模块能力。

```text
discovery
-> PRD
-> OpenAPI
-> /comet
-> design
-> build
-> verify
-> archive
```

要求：

- 有 PRD。
- 有 OpenAPI 影响判断。
- 有验收标准。
- 有测试决策。
- 有归档。

### 2.2 小调整

适用于文案、局部样式、已有配置值调整。

```text
/comet-tweak 调整模型列表空状态文案
```

如果改动扩散到多个模块、新增配置项或影响规格，升级为完整功能流程。

### 2.3 小范围 bug

适用于可复现、范围明确、不引入新 API 的 bug。

```text
/comet-hotfix 修复模型校验失败后按钮没有恢复的问题
```

要求：

- 先建立复现命令或复现步骤。
- 先写失败测试或明确验证方式。
- 修复后补充回归验证。

如果 bug 修复引出新业务规则，升级为完整功能流程。

### 2.4 探索和 spike

适用于不确定是否要做、如何做、影响多大。

```text
请 explore “模型版本是否允许回滚”的业务流程、API 影响和实施风险。
```

探索阶段可以输出方案和建议，但不要直接改业务代码。

## 3. 文档资产规范

### 3.1 推荐命名

| 类型 | 命名 |
|---|---|
| PRD | `docs/requirements/<feature>-prd.md` |
| OpenAPI | `docs/api/specs/<feature>.yaml` |
| 技术方案 | `docs/architecture/<feature>-architecture.md` |
| ADR | `docs/adr/0001-<decision>.md` |
| 发布说明 | `docs/releases/v<version>-<topic>.md` |
| 实施记录 | `docs/implementation/<customer-or-env>-<topic>.md` |

名称使用英文 kebab-case，正文可以中文。

### 3.2 每类文档只承担一个职责

| 文档 | 应该写 | 不应该写 |
|---|---|---|
| `CONTEXT.md` | 稳定术语 | 临时计划、代码路径 |
| PRD | 用户问题、范围、验收 | 详细实现代码 |
| OpenAPI | 接口契约 | 页面交互细节 |
| Architecture | 模块边界、数据流、风险 | 业务长篇背景 |
| ADR | 难回滚、有取舍的决策 | 常规实现选择 |
| Release Note | 发布影响、升级、回滚 | 未完成需求 |

### 3.3 文档要互相链接

一个功能的主链路建议这样互链：

```text
PRD
-> OpenAPI
-> Architecture / ADR
-> OpenSpec change
-> Issues
-> Release Note
-> User Guide
```

这样后续你或 AI 能从任何入口追溯完整上下文。

## 4. Java + Vue + AntDV 落地建议

### 4.1 后端

保持分层清晰：

```text
Controller -> Service -> Repository
```

建议：

- Controller 只处理协议适配、参数校验和响应包装。
- Service 承载业务行为和事务边界。
- Repository 只处理持久化。
- DTO 与 OpenAPI schema 保持一致。
- Service 测试覆盖核心业务规则。
- API 测试覆盖契约、错误响应和权限行为。

### 4.2 前端

建议从 OpenAPI 契约派生 API 类型或接口封装。

页面结构建议：

```text
api client
-> composable / page service
-> AntDV table / form / modal / drawer
-> error state / empty state / loading state
```

模型管理类页面要特别关注：

- 列表筛选条件是否可恢复。
- 表格列是否适合实施人员排查问题。
- 表单校验是否能定位到字段。
- 发布失败是否能展示字段级错误。
- 禁用、只读、无权限状态是否明确。
- 大字段列表是否支持批量操作或导入。

### 4.3 前后端协作

推荐顺序：

```text
OpenAPI
-> 后端契约测试
-> 后端实现
-> 前端 API 类型
-> 前端页面
-> E2E 关键路径
```

如果前端先做原型，也要在进入开发前回填 OpenAPI 和 PRD。

## 5. 质量门禁

### 5.1 进入开发前

- [ ] PRD 已说明问题、范围和验收标准。
- [ ] OpenAPI 影响为“无”或已更新。
- [ ] 主要测试 seam 已明确。
- [ ] 安全红线已检查。
- [ ] 垂直切片已经足够小。

### 5.2 合并前

- [ ] 相关测试已通过。
- [ ] OpenAPI 与实现一致。
- [ ] 前端错误态、空态、加载态已处理。
- [ ] 没有调试代码。
- [ ] 任务清单已更新。
- [ ] 如果术语或规则变化，已更新 `CONTEXT.md` 或 PRD。

### 5.3 发布前

- [ ] 发布说明已写。
- [ ] 实施步骤已写。
- [ ] 回滚方案已写。
- [ ] 已知风险已写。
- [ ] 验收清单已写。
- [ ] 需要人工审查的项已确认。

### 5.4 归档前

- [ ] OpenSpec tasks 全部完成或明确取消。
- [ ] delta spec 已同步到主规格。
- [ ] 验证结果已记录。
- [ ] 经验已沉淀到 `AGENTS.md`、`CONTEXT.md` 或 ADR。

使用原生 OpenSpec skills 时，可以把“同步主规格”和“归档 change”作为两个显式步骤处理。使用 Comet 时，archive 阶段会在最终确认后完成同步与归档；此处的检查项表示归档结果必须满足，而不是要求你重复执行 sync。

## 6. 常见反模式

| 反模式 | 后果 | 修正方式 |
|---|---|---|
| 只在聊天里讲需求 | 后续无法追溯，AI 容易遗忘 | 写入 PRD 或 OpenSpec proposal |
| 先写页面再补接口 | 字段和错误结构反复返工 | 先写 OpenAPI |
| 按层拆任务 | 做了很多代码但无法演示 | 按垂直切片拆 |
| 一个 change 包含多个目标 | 验证和归档困难 | 拆成多个 change |
| 跳过测试直接实现 | 回归风险高 | 至少覆盖关键业务 seam |
| AI 自己审查自己实现的代码 | 容易漏掉同类错误 | 使用独立 review 流程 |
| ADR 写太多 | 决策记录变噪音 | 只记录难回滚且有真实取舍的决策 |
| 文档不归档 | active changes 越堆越乱 | verify 后及时 archive |
| 实施反馈不回流 | 同类问题反复出现 | 写入 user guide、PRD 或 AGENTS.md |

## 7. Prompt 模板

### 7.1 需求澄清

```text
请作为产品和实施顾问，基于“数据中台模型管理”场景，
帮我澄清用户角色、核心流程、异常场景、非目标范围和第一版 MVP。
输出为 discovery 文档。
```

### 7.2 PRD 生成

```text
基于 discovery 文档，使用 docs/templates/prd-template.md 生成 PRD。
要求补充 Gherkin 验收标准、OpenAPI 影响、测试决策和人工审查点。
```

### 7.3 API 契约

```text
基于 PRD 生成 OpenAPI 3.1 spec。
要求包含分页、排序、错误响应、字段级校验错误和发布接口。
保存到 docs/api/specs/<feature>.yaml。
```

### 7.4 垂直切片

```text
基于 PRD 和 OpenAPI，把功能拆成 3-6 个可独立验收的垂直切片。
每个切片都要包含 API、后端、前端、测试和完成定义。
```

### 7.5 开发

```text
按当前 OpenSpec change 的 tasks 推进下一个未完成任务。
默认使用 TDD，先写公共接口层面的失败测试，再实现。
```

### 7.6 发布实施

```text
基于本次 change、测试结果和 API 变化，
生成发布说明、实施步骤、回滚方案、验收清单和已知风险。
```

## 8. 单人多角色节奏

当你同时是产品、设计、开发和实施时，最容易混乱的是上下文切换。建议每天按固定顺序推进：

```text
上午：产品和设计决策
下午：开发和测试
收尾：更新文档、任务状态和实施记录
```

每周至少做一次小复盘：

- 本周交付了哪些垂直切片？
- 哪些需求被改了两次以上？
- 哪些实现让实施解释成本变高？
- 哪些规则应该写入 `AGENTS.md`？
- 哪些术语应该写入 `CONTEXT.md`？

这样这套模板会从“文档目录”逐渐变成你的产品操作系统。
