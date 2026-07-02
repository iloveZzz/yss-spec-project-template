---
change: data-modeling-workbench-mvp
design-doc: docs/superpowers/specs/2026-07-02-data-modeling-workbench-mvp-design.md
base-ref: d4a0749884cbb3502c6c75d682005a8f1038a6b6
---

# 企业数据模型协作工作台 MVP 实施计划

> **给 agentic workers：** 必须按任务逐项执行本计划。推荐使用 `superpowers:subagent-driven-development`，也可使用 `superpowers:executing-plans`。步骤使用 checkbox（`- [ ]`）追踪状态。

**目标：** 实现企业数据模型协作工作台 MVP，覆盖模型项目边界、导入、映射、规范检查、评审、发布、导出，以及安全审计收口。

**架构：** 以冻结 OpenAPI 契约作为外部边界，以 YSS DDD 作为实现结构。每个 DMW 切片都必须贯穿 UI、Web Adapter、Application、Domain、Gateway / Repository、Infrastructure、契约测试、审计和 fresh verification。

**技术栈：** YSS DDD 后端脚手架、Spring Boot 3 风格模块、PostgreSQL 元数据存储、MapStruct 风格转换、OpenAPI 3.1 契约；存在前端模块时遵循 Vue / YSS UI 约定；测试工具由 `yss-router` 根据目标工程选择。

## 全局约束

- 权威 change：`openspec/changes/data-modeling-workbench-mvp`。
- 权威 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`。
- 权威设计：`docs/superpowers/specs/2026-07-02-data-modeling-workbench-mvp-design.md`。
- 垂直切片索引：`docs/requirements/issues/2026-07-02-data-modeling-workbench-vertical-slices-index.md`。
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`。
- DMW-002 保持一个切片，覆盖对象树、逻辑模型和物理模型字段维护。
- DMW-003 在 DMW-001 后可与 DMW-002 并行。
- DMW-009 保留为安全、审计和契约收口切片。
- 实现阶段不修改 Frozen OpenAPI；任何契约缺口必须回到 Draft / Review / Freeze。
- 安全红线必须有人审证据：认证/授权中间件、数据库迁移模板、原生 SQL、DDL 草案生成、Excel 上传加固、下载 URL 策略和审计保留。
- 业务行为默认使用 TDD；生成脚手架步骤如不适用 TDD，必须记录验证命令。

---

### Task 0: 确认实现工作区与 YSS 路由

**文件：**
- 读取：`AGENTS.md`
- 读取：`CONTEXT.md`
- 读取：`docs/api/specs/data-modeling-workbench.yaml`
- 读取：`docs/superpowers/specs/2026-07-02-data-modeling-workbench-mvp-design.md`
- 读取：`docs/requirements/issues/2026-07-02-data-modeling-workbench-vertical-slices-index.md`
- 修改：`openspec/changes/data-modeling-workbench-mvp/.comet.yaml`

**接口：**
- 输入：active Comet 状态、冻结生命周期资产和已确认的垂直切片顺序。
- 输出：选定的实现工作区、YSS skill 路由说明，以及 Comet build 执行模式状态。

- [ ] **Step 1: 验证 active change 状态**

运行：

```bash
openspec list --json
sed -n '1,120p' openspec/changes/data-modeling-workbench-mvp/.comet.yaml
```

预期：`data-modeling-workbench-mvp` 处于 in-progress，且 `.comet.yaml` 为 `phase: build`。

- [ ] **Step 2: 路由实现技能**

运行 YSS 路由提示词：

```text
使用 yss-router，基于 docs/superpowers/specs/2026-07-02-data-modeling-workbench-mvp-design.md、docs/api/specs/data-modeling-workbench.yaml 和 docs/requirements/issues/2026-07-02-data-modeling-workbench-vertical-slices-index.md，为 DMW-001 到 DMW-009 选择最小 YSS 实现技能集。输出每个切片需要的前端、后端、Domain、Repository、Web Controller、OpenAPI、测试和安全人审技能。
```

预期：路由结果包含 `yss-ddd-scaffold-generator` 或现有服务工程基线、`yss-domain`、`yss-repository`、`yss-web-controller`、`yss-openapi`、实现 UI 时的 `yss-ui`，以及安全审查说明。

- [ ] **Step 3: 确认目标实现模块**

如果当前 workspace 没有 Java / Vue 源码树，停止 build 执行并请用户选择目标：

```text
请选择企业数据模型协作工作台 MVP 的实现位置：
A. 在当前仓库生成新的 YSS 后端/前端工程骨架
B. 切换到已有业务代码仓库或 worktree
C. 仅发布 GitHub Issues，暂不写代码
```

预期：只有在目标实现位置明确后才写业务代码。

### Task 1: DMW-001 模型项目与边界闭环

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-001-model-project-boundary.md`
- 来源 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- 后端目标：`adapter/modeling/ProjectController.java`
- 应用目标：`application/modeling/project/ProjectCommandHandler.java`
- 领域目标：`domain/modeling/project/ModelProject.java`
- 基础设施目标：`infrastructure/modeling/project/ModelProjectRepositoryImpl.java`
- 测试目标：`contract/modeling/ProjectContractTest.java`

**接口：**
- 输入：冻结的项目列表、创建、详情、更新、归档端点和 `PermissionSet`。
- 输出：`ModelProject`、项目边界命令、权限动作、乐观锁行为和项目审计事件。

- [ ] **Step 1: 先写失败的行为测试**

覆盖 CT-020、CT-021、CT-022、CT-023、CT-013 和 CT-014。包含主题域边界缺失、`draftVersion` 过期、归档保留发布版本、操作禁用原因等场景。

- [ ] **Step 2: 实现领域边界规则**

实现 `ModelProject`，包含项目编码、主题域、子域、试点范围、负责人、评审人、状态和 `draftVersion`。无边界项目必须在持久化前被拒绝。

- [ ] **Step 3: 实现 Application 与 Adapter**

通过 Web Adapter 接入创建、列表、详情、更新和归档用例。按 OpenAPI 冻结契约返回 `SingleResult<T>` 或 `PageResult<T>`。

- [ ] **Step 4: 验证**

运行项目契约测试和领域测试。预期：DMW-001 全部测试通过，越权访问不返回项目数据。

### Task 2: DMW-002 模型对象树与字段维护

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-002-model-object-field-maintenance.md`
- 领域目标：`domain/modeling/catalog/ModelObjectCatalog.java`
- 应用目标：`application/modeling/catalog/CatalogCommandHandler.java`
- Adapter 目标：`adapter/modeling/CatalogController.java`
- 基础设施目标：`infrastructure/modeling/catalog/CatalogRepositoryImpl.java`
- 测试目标：`contract/modeling/CatalogContractTest.java`

**接口：**
- 输入：Task 1 产出的项目边界和 `draftVersion`。
- 输出：业务对象、逻辑实体、逻辑字段、物理表、物理字段、归档依赖检查和对象树查询结果。

- [ ] **Step 1: 先写失败测试**

覆盖业务对象、逻辑实体、逻辑字段、物理表、物理字段的创建、更新、归档。包含过期版本、依赖阻断、树刷新和禁用态。

- [ ] **Step 2: 实现目录领域模型**

逻辑对象和物理对象保持在同一切片内；不得把 DMW-002 拆成独立的逻辑模型 issue 和物理模型 issue。

- [ ] **Step 3: 实现 Adapter 与持久化**

在 PostgreSQL 元数据表或生成的 Repository 模板中保存草稿目录元数据。迁移脚本仍是模板，必须等待人工审查。

- [ ] **Step 4: 验证**

运行对象树和字段抽屉相关的领域、应用、契约和 UI 状态测试。

### Task 3: DMW-003 Excel 导入物理模型草稿

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-003-excel-import-physical-draft.md`
- 领域目标：`domain/modeling/imports/ImportJob.java`
- Gateway 目标：`domain/modeling/imports/ExcelImportGateway.java`
- 基础设施目标：`infrastructure/modeling/imports/ExcelImportGatewayImpl.java`
- Adapter 目标：`adapter/modeling/ImportController.java`
- 测试目标：`contract/modeling/ImportContractTest.java`

**接口：**
- 输入：Task 1 产出的项目边界和试点表范围。
- 输出：导入任务生命周期、预览表/字段、apply/cancel 行为、幂等 apply 和上传安全证据。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-030 至 CT-038 和 CT-093：上传只生成预览、不支持的表头别名、重复字段、越界目标表、不支持的 PostgreSQL 类型、blocker apply 拒绝、warning apply 带说明、重复幂等键。

- [ ] **Step 2: 实现导入任务生命周期**

实现 `uploaded -> parsing -> preview_ready -> applied/cancelled/failed`；apply 必须等到 preview ready 且安全后才能执行。

- [ ] **Step 3: 增加人工审查证据**

记录 `TODO-HUMAN-REVIEW` 或审批证据，覆盖文件类型、大小、公式注入处理、行数上限、解析隔离和存储保留。

- [ ] **Step 4: 验证**

运行导入契约测试和上传安全检查。预期：上传在 apply 前绝不修改模型草稿。

### Task 4: DMW-004 字段映射与覆盖率

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-004-field-mapping-coverage.md`
- 领域目标：`domain/modeling/mapping/FieldMappingSet.java`
- 领域服务目标：`domain/modeling/mapping/CoverageDomainService.java`
- Adapter 目标：`adapter/modeling/MappingController.java`
- 测试目标：`contract/modeling/MappingContractTest.java`

**接口：**
- 输入：DMW-002 的逻辑字段，以及 DMW-002 / DMW-003 的物理字段。
- 输出：映射列表、单条/批量映射保存、覆盖率汇总、未映射提示和阈值 fixture。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-040 至 CT-045，包含越界字段引用、缺少映射说明、`draftVersion` 冲突、80% 草稿阈值、85% 发布阈值和 95% P0 阈值。

- [ ] **Step 2: 实现覆盖率领域服务**

计算 `overallCoverage = 已映射逻辑字段 / 有效逻辑字段`，以及 `p0Coverage = 已映射 P0 字段 / 有效 P0 字段`。

- [ ] **Step 3: 实现 API 与 UI 状态**

使用冻结响应包装暴露映射筛选、未映射提示、问题等级和覆盖率面板数据。

- [ ] **Step 4: 验证**

运行契约、领域阈值和 UI 面板测试。预期：DMW-004 能同时消费手工维护物理字段和 Excel 导入物理字段。

### Task 5: DMW-005 规范规则与检查运行

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-005-validation-rules-runs.md`
- 领域目标：`domain/modeling/validation/ValidationRuleSet.java`
- 领域目标：`domain/modeling/validation/ValidationRun.java`
- 应用目标：`application/modeling/validation/ValidationCommandHandler.java`
- 测试目标：`contract/modeling/ValidationContractTest.java`

**接口：**
- 输入：DMW-002 至 DMW-004 产出的项目目录和映射。
- 输出：规则配置、检查运行结果、字段级问题和发布就绪阻断项。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-050 至 CT-054：规则更新版本、检查运行绑定、字段级问题定位、blocker 阻止提交评审、草稿变更后旧检查失效。

- [ ] **Step 2: 实现检查规则**

支持命名、公司字段标准、码表复用、映射覆盖率和发布就绪规则，区分 blocker / warning。

- [ ] **Step 3: 实现不可变检查运行结果**

将 run summary 和 issues 作为不可变证据保存，并绑定 `draftVersion` 和 `ruleSetVersion`。

- [ ] **Step 4: 验证**

运行规范检查面板和发布就绪测试。预期：blocker 问题阻止提交评审和发布。

### Task 6: DMW-006 单一架构师评审

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-006-single-architect-review.md`
- 领域目标：`domain/modeling/review/ModelReview.java`
- 应用目标：`application/modeling/review/ReviewCommandHandler.java`
- Adapter 目标：`adapter/modeling/ReviewController.java`
- 测试目标：`contract/modeling/ReviewContractTest.java`

**接口：**
- 输入：DMW-004 / DMW-005 的覆盖率和检查证据。
- 输出：提交评审、评审详情、评论、通过/驳回决策，以及驳回后再次提交生成新 `reviewId`。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-060 至 CT-065，包含覆盖率低于 80%、非评审人审批拒绝、驳回原因缺失、再次提交生成新 `reviewId`、重复审批冲突。

- [ ] **Step 2: 实现评审状态机**

支持 `pending -> approved/rejected`。Rejected review 保持不可变历史；再次提交创建新 review，并关联 `previousReviewId`。

- [ ] **Step 3: 实现审计与权限**

记录提交、评论、通过、驳回和越权决策尝试。

- [ ] **Step 4: 验证**

运行评审契约测试和 UI 状态测试。预期：只有指定架构师可以通过或驳回。

### Task 7: DMW-007 发布版本与从版本创建草稿

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-007-version-publish-draft-from-version.md`
- 领域目标：`domain/modeling/version/ModelVersion.java`
- 领域服务目标：`domain/modeling/version/VersionSnapshotDomainService.java`
- Adapter 目标：`adapter/modeling/VersionController.java`
- 测试目标：`contract/modeling/VersionContractTest.java`

**接口：**
- 输入：已通过评审、覆盖率汇总、检查运行和 DDL 草案确认。
- 输出：不可变版本快照、版本列表/详情、快照 checksum / schema version，以及从版本创建草稿。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-070 至 CT-075：发布阈值、`ddlDraftAcknowledged: true`、不可变快照、版本详情 checksum / schema version、发布版本只读、从版本创建草稿。

- [ ] **Step 2: 实现发布门禁**

要求已通过评审、整体覆盖率 >= 85%、P0 覆盖率 >= 95%、无 blocker 检查问题、发布说明、当前 `draftVersion` 和 DDL 草案确认。

- [ ] **Step 3: 实现不可变快照**

生成 `snapshotChecksum` 和 `snapshotSchemaVersion`。后续草稿编辑不得修改已发布快照行。

- [ ] **Step 4: 验证**

运行版本契约测试和不可变性测试。预期：从版本创建草稿会生成新草稿，原版本保持不变。

### Task 8: DMW-008 三类异步导出资产

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-008-async-export-assets.md`
- 领域目标：`domain/modeling/export/ExportTask.java`
- Gateway 目标：`domain/modeling/export/DdlDraftGateway.java`
- Gateway 目标：`domain/modeling/export/FileStorageGateway.java`
- Adapter 目标：`adapter/modeling/ExportController.java`
- 测试目标：`contract/modeling/ExportContractTest.java`

**接口：**
- 输入：DMW-007 的发布版本快照。
- 输出：异步导出任务、受控下载引用、重试行为、DDL 草案标识和下载审计。

- [ ] **Step 1: 先写失败测试**

覆盖 CT-080 至 CT-085：只能从发布版本导出、失败重试创建新 `exportId`、过期 URL、成功下载审计和 DDL 草案标识。

- [ ] **Step 2: 实现导出任务生命周期**

支持 `queued -> running -> succeeded -> expired`，以及 `running -> failed -> queued(new exportId via retry)`。

- [ ] **Step 3: 增加人工审查证据**

记录 SQL / DDL 草案生成、下载 URL 过期、权限绑定和存储保留的审批证据。

- [ ] **Step 4: 验证**

运行导出契约测试。预期：不存在执行 DDL 的端点，也不暴露无限制文件路径。

### Task 9: DMW-009 安全、审计与契约收口

**文件：**
- 来源 issue：`docs/requirements/issues/DMW-009-security-audit-closure.md`
- 来源清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`
- 验证目标：`docs/implementation/data-modeling-workbench-mvp-verification.md`
- 发布目标：`docs/releases/data-modeling-workbench-mvp.md`

**接口：**
- 输入：已实现并验证的 DMW-001 至 DMW-008。
- 输出：跨切片权限、审计、错误、分页、幂等、人审和发布验证证据。

- [ ] **Step 1: 运行跨切片契约检查**

运行 CT-001 至 CT-004、CT-010 至 CT-015、CT-090 至 CT-094，以及每个切片自己的契约测试。

- [ ] **Step 2: 验证安全证据**

收集认证/授权、Excel 上传安全、SQL / DDL 草案输出、迁移模板、原生 SQL 红线、受控下载 URL 和审计保留证据。

- [ ] **Step 3: 验证一致性**

检查每个切片中的分页/排序/筛选限制、统一错误结构、`X-Idempotency-Key`、`draftVersion`、权限动作禁用态和审计事件。

- [ ] **Step 4: 记录发布就绪**

写入验证和发布说明，包含命令、结果、剩余风险、回滚方式和人工审批证据。
