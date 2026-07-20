# 全生命周期最佳实践

本文补充 [产品全生命周期使用手册](./product-lifecycle-workflow.md)，用于约束长期使用这套模板时的工作习惯、质量门禁和常见反模式。

## 1. 核心原则

### 1.1 先稳定语言，再稳定实现

业务系统最怕“同一个东西有三个名字”。开始写代码前，先把稳定术语写进 `CONTEXT.md`。

示例：

```text
模型、字段、草稿版本、发布版本、校验错误、引用关系
```

如果一个术语还在讨论中，可以先放在 Spec 或 discovery 文档，不要急着写进 `CONTEXT.md`。

### 1.2 契约草案先评审，API Freeze 先于前后端实现

只要涉及前后端接口，就先形成 API 影响记录和契约草案；必要时在 `docs/api/specs/*.yaml` 产出 review-only OpenAPI Draft。Draft 经过工程基线、系统 / 数据架构设计和设计审查反审后，才能冻结为 OpenAPI Freeze，再实现前后端或生成客户端。

这能避免：

- 后端 DTO 和前端类型不一致。
- 错误响应没有统一结构。
- 分页、排序、筛选字段反复改。
- 实施文档和真实接口脱节。

Draft 阶段允许调整接口，但不能被当成稳定实现契约；Freeze 之后的契约变更必须回到工程基线、系统 / 数据架构设计和设计审查点，不能边写代码边悄悄改接口。

### 1.3 工程基线先于业务代码

编码规范分三层维护：

| 层级 | 放什么 | 不放什么 |
|---|---|---|
| `AGENTS.md` | Agent 启动即必须遵守的工程约束、技能入口和阶段门禁 | 完整代码手册、临时实现细节 |
| YSS skills | DDD 脚手架、分层职责、命名、Repository、MapStruct、统一响应等细则 | 单个功能的临时取舍 |
| `docs/architecture/` / ADR | 本次变更的模块边界、状态流、风险取舍和回滚策略 | 全局编码规则的重复副本 |

从零创建后端服务时，工程基线由 `yss-ddd-scaffold-generator` 产出；设计和审查阶段用 `yss-backend-scaffold-parent` 校验。功能开发阶段只补充本次变更需要的局部约束，不重新发明分层架构。

### 1.4 一个垂直切片 Ticket 只解决一个目标

垂直切片 Ticket 应该围绕一个清晰目标。

好的 change：

```text
实现模型发布与版本冻结
```

过大的 change：

```text
实现数据中台模型管理、指标管理、血缘分析和权限审批
```

如果一个 Ticket 需要多天都说不清完成标准，通常应该拆分。

### 1.5 用垂直切片交付，不按技术层横切

每个任务都应该能独立验收。

推荐：

```text
创建模型草稿：API + Domain 行为 + GatewayImpl / Repository + 前端弹窗 + 测试 + 验收
```

不推荐：

```text
写所有 Adapter
写所有 Application / Domain
写所有页面
```

### 1.6 人类保留最终决策权

AI 可以生成方案、代码、测试和报告，但这些决策必须由人确认：

- 产品优先级。
- 架构方向。
- 发布范围。
- 风险 / 回滚约束。
- 数据库迁移。
- 认证授权。
- 公共基础库 API。
- 加密算法相关内容。

存在需要人工确认的风险时，文档或代码中必须记录范围、责任人和结论。

### 1.7 机会探索先于 Spec

进入 Spec 前先完成机会探索环。它不是固定的“头脑风暴 → 发现”单向步骤，而是把事实、假设和 MVP 边界来回校准：

```text
市场 / 竞品 / 用户事实 <-> 机会构想假设 <-> MVP 边界
```

竞品分析不是“多收集一些参考资料”，而是正式输入：

- 用竞品矩阵识别行业基础能力。
- 用功能空白区识别差异化机会。
- 用竞品流程反推用户已习惯的交互和术语。
- 用竞品缺陷约束自己的非目标范围。

竞品结论必须落到 MVP 边界、用户故事或非目标范围里，否则只是背景材料。

常见入口：

- 只有模糊想法：先机会构想，再用 Discovery 验证。
- 已有行业、竞品或用户材料：先 Discovery，再生成候选方案。
- 明确 Bug 或小调整：不走完整机会探索，直接进入 hotfix / tweak。

## 2. 推荐工作模式

### 2.1 完整功能

适用于新模块、新页面、API 变更、跨模块能力。

```text
opportunity exploration
-> grill-with-docs
-> Spec
-> API impact / contract draft
-> Engineering Baseline / DDD Review
-> Architecture / 系统 / 数据架构设计
-> Design Review
-> OpenAPI Freeze
-> to-tickets
-> implement / tdd
-> code-review
-> fresh verification
-> release / retro
```

要求：

- 有机会探索结论，或明确说明无需市场 / 竞品 / 用户输入。
- Spec 前已用 `grill-with-docs` 澄清关键边界，或已有等价的确认记录。
- 有 Spec。
- 有 API 影响分析 / 契约草案 / OpenAPI Freeze 判断；涉及接口时已有影响记录和契约草案 / review-only Draft，并在开发前 Freeze。
- 有 YSS DDD 工程基线判断；后端新服务或新模块已选择对应 YSS skills。
- 有设计审查结论；阻断项已经回到对应阶段修正。
- 有验收标准。
- 有测试决策。
- 有发布 / 复盘收口记录。

### 2.1.1 小迭代从最近可信阶段延伸

已有功能的小需求变更不需要从机会探索重新走一遍。先判断现有资产可信到哪一层，再从最早受影响的阶段继续：

| 影响类型 | 从哪里继续 | 需要补什么 |
|---|---|---|
| 文案、样式、局部配置 | tweak / 最小改动 | 验证记录 |
| 页面状态、交互、字段展示 | 产品设计 / 原型评审 | 交互说明、状态矩阵、Spec 回填项 |
| 验收标准、业务规则、非目标边界 | Spec 校准 | Spec 更新、产品总体设计影响 |
| 请求 / 响应 / 错误 / 权限 / 分页 | API 影响分析 / 契约草案 / OpenAPI Draft Review | 契约更新、Freeze 记录、契约测试 |
| 状态机、服务边界、集成、NFR、回滚 | 系统概要设计 / Design Review | 架构影响、ADR 候选、验证方案 |
| 持久化、元模型、版本、血缘、查询、索引 | 数据架构 / Design Review | 数据模型、迁移约束、人工审查点 |

只有当小迭代推翻了用户、痛点、MVP、非目标或产品边界，才回到 Discovery / 业务架构 / Spec 初稿阶段。

### 2.2 小调整

适用于文案、局部样式、已有配置值调整。

```text
/直接最小改动 调整模型列表空状态文案
```

如果改动扩散到多个模块、新增配置项或影响规格，升级到最早受影响阶段并补齐下游门禁。

### 2.3 小范围 bug

适用于可复现、范围明确、不引入新 API 的 bug。

```text
/diagnosing-bugs 修复模型校验失败后按钮没有恢复的问题
```

要求：

- 先建立复现命令或复现步骤。
- 先写失败测试或明确验证方式。
- 修复后补充回归验证。

如果 bug 修复引出新业务规则，升级到 Spec 校准、产品总体设计、OpenAPI 或系统概要设计等最早受影响阶段。

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
| 竞品矩阵 | `docs/discovery/reports/<feature>-competitive-matrix.md` |
| Spec | `docs/requirements/<feature>-spec.md` |
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
| Competitive Matrix | 竞品功能、差异化机会、MVP 边界输入 | 未验证事实、营销文案堆砌 |
| Spec | 用户问题、范围、验收 | 详细实现代码 |
| OpenAPI | 接口契约 | 页面交互细节 |
| Architecture | 模块边界、数据流、风险 | 业务长篇背景 |
| ADR | 难回滚、有取舍的决策 | 常规实现选择 |
| Release Note | 发布影响、升级、回滚 | 未完成需求 |

### 3.3 文档要互相链接

一个功能的主链路建议这样互链：

```text
Competitive Matrix
-> Discovery
-> CONTEXT
-> Spec
-> API impact / contract draft
-> Architecture / ADR / 系统 / 数据架构设计
-> OpenAPI Freeze
-> 垂直切片 Ticket
-> Tickets
-> Release Note
-> User Guide
```

这样后续你或 AI 能从任何入口追溯完整上下文。

## 4. YSS 技能路由与落地顺序

### 4.1 先用 yss-router 选最小技能集

当任务跨前端、后端、组件、API 或代码生成时，先用 `yss-router` 判断技能组合。原则是先选一个主技能，再按明确需要补充副技能。

| 场景 | 主技能 | 常见补充 |
|---|---|---|
| 新建完整 Vue 业务页面 | `yss-ui` | `yss-page-module-development`、`api-integration`、`yss-openapi` |
| YTable / YTree / YssFormily 页面 | `yss-ui` | `yss-use-table-height`、`yss-use-tree-height`、`yss-formily` |
| 从零创建后端服务 | `yss-ddd-scaffold-generator` | 后续接 `yss-domain`、`yss-repository`、`yss-web-controller` |
| 领域建模和状态规则 | `yss-domain` | `yss-backend-scaffold-domain` |
| PO / Repository / GatewayImpl | `yss-repository` | `yss-mybatis` |
| Controller / DTO / VO / Web Convertor | `yss-web-controller` | `yss-dto` |
| MyBatis 分页、批量、多数据源或排障 | `yss-mybatis` | `yss-source-index` |

禁止因为“这是 YSS 项目”就一次性加载所有 YSS skills。只有需求涉及具体实现细节时，才加载对应专项技能。

### 4.2 前端必须按 yss-ui 落地

Vue + AntDV 页面优先复用 YSS UI 体系：

- YSS 已封装场景优先 `@yss-ui/components`，再考虑 `ant-design-vue`。
- 页面目录建议采用 `components/`、`hooks/`、`schemas/`、`index.vue`、`style.less`。
- `index.vue` 只负责页面编排和事件转发。
- 查询表单优先 `YssFormily` schema 驱动。
- 表格优先 `YTable`，列定义必须用 `field/type`，插槽使用字段同名插槽。
- 请求统一下沉到 `hooks/useXxx.ts`，使用 `vue-hooks-plus` 的 `useRequest`，并包含成功和失败兜底。
- 用 `currentParams` 作为查询、分页、导出、刷新的参数单一来源。
- 有表格高度自适应时用 `useTableHeight`，有树高度自适应时用 `useTreeHeight`。
- 页面至少覆盖 `loading`、`empty`、`error`、`selected` 状态。
- 路由菜单标题放 `meta.title`，非主菜单详情页使用 `MENU_TYPE.INNER_MENU`。

前端完成定义：

- [ ] 页面结构符合 YSS 目录和职责边界。
- [ ] YTable 使用 `field/type` 与字段同名插槽。
- [ ] YssFormily schema 和 scope 清晰。
- [ ] useRequest 请求、分页和参数治理已下沉 Hook。
- [ ] useTableHeight / useTreeHeight 绑定的是容器 ref。
- [ ] API / Mock / 路由菜单约定已对齐。

### 4.3 后端按 YSS DDD 顺序推进

从零创建后端服务时先使用 `yss-ddd-scaffold-generator` 生成骨架，确认项目名、基础包名、输出目录和数据库类型。生成后再业务化定制，不要把脚手架直接当最终代码。

如果只是开发现有服务中的一个功能，不需要重新生成全量脚手架；先读取 `yss-backend-scaffold-parent` 和对应层级 skill，确认本次变更落在哪些层。

推荐顺序：

```text
yss-ddd-scaffold-generator
-> yss-domain / yss-backend-scaffold-domain
-> yss-repository
-> yss-mybatis
-> yss-web-controller
```

领域层：

- 先抽业务术语、聚合边界和状态变化。
- 数据库字段只做补充，不直接决定领域对象。
- Domain 层不依赖 Repository、Mapper、Controller。
- 关键状态流转用领域方法表达，例如 `publish()`、`cancel()`、`terminate()`。
- Cmd 继承 `CommandDTO`，分页 Query 继承 `PageQuery`，普通 Query 继承 `QueryDTO`。
- Cmd 必须使用 JSR-303/380 注解校验。
- Gateway 定义在 Domain 层，方法命名体现领域能力。

持久层：

- 已有 Domain 模型后再用 `yss-repository` 补 `PO / Repository / Convertor / GatewayImpl`。
- Gateway 定义在 Domain，实现放在 Infrastructure。
- Convertor 优先 MapStruct。
- 逻辑删除、审计字段、主键策略要显式处理。
- 涉及 BaseRepository、BasePlusRepository、PageQuery、多数据源或批量插入时加载 `yss-mybatis`。
- 分页查询沿用 `PageQuery` 传递链路，不在 Repository 内发明临时分页参数。

Web 层：

- 有稳定领域模型或 metadata 后再用 `yss-web-controller`。
- 优先运行生成脚本，再按项目规范少量手调。
- Controller 默认依赖 Domain Gateway，不穿透 Repository。
- 返回结构保持 `SingleResult`、`PageResult`、`MultiResult` 体系。
- 复杂接口不要承诺脚本自动覆盖全部业务逻辑。

后端完成定义：

- [ ] 多模块依赖仍符合 Domain、Application、Infrastructure、Adapter、Bootstrap 分层。
- [ ] Domain 没有依赖 Infrastructure 或 Web。
- [ ] Gateway 边界清晰，未泄漏持久化细节。
- [ ] Repository / Mapper / XML / Convertor 命名和路径对齐。
- [ ] PageQuery、批量、多数据源等 MyBatis 机制未重复造轮子。
- [ ] Controller 返回包装和 API 路径符合项目既有规范。

## 5. Java + Vue + AntDV 落地建议

### 5.1 后端

保持 YSS DDD 分层清晰：

```text
Web Adapter
-> Application Use Case / Command Handler
-> Domain Model / Domain Service
-> Domain Gateway
-> Infrastructure GatewayImpl / Repository
```

建议：

- Controller / Web Adapter 只处理协议适配、参数校验和响应包装。
- Application 层负责用例编排、事务边界和 Command / Query 处理。
- Domain 层承载聚合、实体、值对象、领域服务和 Gateway 接口。
- Infrastructure 层实现 GatewayImpl、Repository、Mapper 和外部服务适配。
- CMD、Query、VO 与 OpenAPI schema 保持一致。
- Domain / Application 行为测试覆盖核心业务规则。
- API 测试覆盖契约、错误响应和权限行为。

### 5.2 前端

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

### 5.3 前后端协作

推荐顺序：

```text
OpenAPI Freeze
-> 后端契约测试
-> YSS DDD 后端实现
-> 前端 API 类型
-> 前端页面
-> E2E 关键路径
```

如果前端先做原型，也要在进入开发前回填 OpenAPI 和 Spec。

## 6. 质量门禁

### 6.1 进入开发前

- [ ] 已有机会探索结论，或明确说明无需市场 / 竞品 / 用户输入。
- [ ] Spec 已说明问题、范围和验收标准。
- [ ] OpenAPI 影响为“无”或已有 Draft，并在开发前 Freeze。
- [ ] 后端新服务或新模块已完成 YSS DDD 工程基线确认。
- [ ] Spec / API / 工程基线 / Architecture / Plan 的阻断审查项已关闭。
- [ ] 主要测试 seam 已明确。
- [ ] 风险 / 回滚约束已检查。
- [ ] 垂直切片已经足够小。
- [ ] YSS 技能集已通过 `yss-router` 或明确专项技能选择确定。

### 6.2 合并前

- [ ] 相关测试已通过。
- [ ] OpenAPI 与实现一致。
- [ ] 前端错误态、空态、加载态已处理。
- [ ] 前端页面符合 `yss-ui` 的组件、Hook、分页和高度治理规范。
- [ ] 后端代码符合 YSS DDD 分层、Gateway、Repository、Controller 边界。
- [ ] 实现者没有审查自己的代码；独立 Review 的阻断项已关闭。
- [ ] 如果涉及权限、认证、SQL、迁移、加密或公共 API 时，已记录风险判断和验证证据。
- [ ] 没有调试代码。
- [ ] 任务清单已更新。
- [ ] 如果术语或规则变化，已更新 `CONTEXT.md` 或 Spec。

### 6.3 发布前

- [ ] 发布说明已写。
- [ ] 实施步骤已写。
- [ ] 回滚方案已写。
- [ ] 已知风险已写。
- [ ] 验收清单已写。
- [ ] 需要人工审查的项已确认。

### 6.4 归档前

- [ ] 垂直切片任务全部完成或明确取消。
- [ ] 必要的 Spec Delta 已与 Spec / OpenAPI / Ticket 互链。
- [ ] 验证结果已记录。
- [ ] 经验已沉淀到 `AGENTS.md`、`CONTEXT.md` 或 ADR。

使用 Ticket 追踪时，发布前应确认所有垂直切片任务已完成或明确取消，并记录验证与回滚结论。

## 7. 常见反模式

| 反模式 | 后果 | 修正方式 |
|---|---|---|
| 跳过竞品分析直接定 MVP | 容易重复造已有弱功能，差异化不足 | 先产出竞品矩阵和机会清单 |
| 只在聊天里讲需求 | 后续无法追溯，AI 容易遗忘 | 写入 Spec、Spec Delta 或 Ticket |
| 先写页面再补接口 | 字段和错误结构反复返工 | 先写 OpenAPI |
| 按层拆任务 | 做了很多代码但无法演示 | 按垂直切片拆 |
| 不经 yss-router 随手选技能 | 规范加载过多或漏掉关键约束 | 先选最小技能集 |
| 把完整编码手册塞进 AGENTS.md | 入口指令变长且容易和 YSS skills 冲突 | AGENTS.md 放入口约束，细则放 skills / docs |
| 新后端服务绕过脚手架手搓结构 | 模块依赖和命名不一致 | 先用 `yss-ddd-scaffold-generator`，再业务化定制 |
| YSS 页面把请求写满 index.vue | 页面难维护，分页参数重复 | 请求和分页下沉 Hook |
| 后端 Controller 直接穿透 Repository | 分层破坏，领域规则失控 | Controller 依赖 Domain Gateway / Service |
| 一个 change 包含多个目标 | 验证和归档困难 | 拆成多个 change |
| 跳过测试直接实现 | 回归风险高 | 至少覆盖关键业务 seam |
| AI 自己审查自己实现的代码 | 容易漏掉同类错误 | 使用独立 review 流程 |
| ADR 写太多 | 决策记录变噪音 | 只记录难回滚且有真实取舍的决策 |
| 阶段产物不 checkpoint | Spec / Spec Delta / OpenAPI / Ticket 决策难追溯 | 阶段结束做 Ticket 同步和 Git checkpoint |
| 实施反馈不回流 | 同类问题反复出现 | 写入 user guide、Spec 或 AGENTS.md |

## 8. Prompt 模板

### 8.1 竞品分析

```text
请作为产品经理、设计和实施顾问，基于“数据中台模型管理”场景，
使用 docs/discovery/templates/competitive-matrix-template.md 输出竞品功能矩阵。
要求覆盖竞品概览、功能矩阵、差异化亮点、功能空白区和 MVP 边界建议。
```

### 8.2 需求澄清

```text
请作为产品和实施顾问，基于“数据中台模型管理”场景和竞品分析结论，
帮我澄清用户角色、核心流程、异常场景、非目标范围和第一版 MVP。
输出为 discovery 文档。
```

### 8.3 Spec 生成

```text
基于 discovery 文档，使用 docs/templates/spec-template.md 生成 Spec。
要求补充 Gherkin 验收标准、OpenAPI 影响、测试决策和人工审查点。
```

### 8.4 API 契约草案

```text
基于 Spec 生成 OpenAPI 3.1 Draft。
要求包含分页、排序、错误响应、字段级校验错误和发布接口。
保存到 docs/api/specs/<feature>.yaml。
```

### 8.5 API 契约冻结

```text
基于 OpenAPI Draft、工程基线、架构设计和 Ticket 行为规格，
检查路径、schema、错误结构、分页、权限、状态流、DDD 边界和契约测试是否一致。
确认后将 docs/api/specs/<feature>.yaml 作为开发冻结契约。
```

### 8.6 YSS 技能路由

```text
请使用 yss-router 分析这个垂直切片需要哪些最小 YSS 技能集。
分别说明前端、后端、API、Repository/MyBatis、Controller 是否需要专项技能。
```

### 8.7 垂直切片

```text
基于 Spec、冻结 OpenAPI 和架构设计，把功能拆成 3-6 个可独立验收的垂直切片。
每个切片都要包含 API、后端、前端、测试和完成定义。
```

### 8.7 前端开发

```text
请按 yss-ui 规范实现该页面。
要求使用 YTable / YssFormily，列表请求和分页下沉 hooks/useXxx.ts，
使用 currentParams 统一参数，并覆盖 loading、empty、error 状态。
```

### 8.8 后端开发

```text
请按 YSS DDD 顺序实现该后端切片：
先用 yss-domain 建模领域对象和 Gateway，
再用 yss-repository 补 PO / Repository / Convertor / GatewayImpl，
涉及 PageQuery 或 BaseRepository 时遵循 yss-mybatis，
最后用 yss-web-controller 补 Controller / DTO / VO / Web Convertor。
```

### 8.9 通用开发

```text
按当前 垂直切片 Ticket 的 tasks 推进下一个未完成任务。
默认使用 TDD，先写公共接口层面的失败测试，再实现。
```

### 8.10 发布实施

```text
基于本次 change、测试结果和 API 变化，
生成发布说明、实施步骤、回滚方案、验收清单和已知风险。
```

## 9. 单人多角色节奏

当你同时是产品、设计、开发和实施时，最容易混乱的是上下文切换。建议每天按固定顺序推进：

```text
上午：竞品、产品和设计决策
下午：YSS 前后端开发和测试
收尾：更新文档、任务状态和实施记录
```

每周至少做一次小复盘：

- 本周交付了哪些垂直切片？
- 哪些需求被改了两次以上？
- 哪些实现让实施解释成本变高？
- 哪些规则应该写入 `AGENTS.md`？
- 哪些术语应该写入 `CONTEXT.md`？

这样这套模板会从“文档目录”逐渐变成你的产品操作系统。
