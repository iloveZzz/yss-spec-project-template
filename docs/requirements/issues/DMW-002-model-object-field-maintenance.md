# 垂直切片 Issue：DMW-002 模型对象树与字段维护

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- 交互设计：`docs/design/data-modeling-workbench-interaction-spec.md`
- 数据架构：`docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md`

## 要构建什么

交付项目内模型对象树和字段维护闭环。完成后，架构师和数仓开发工程师可以在设计工作台维护业务对象、逻辑实体、逻辑字段、物理表、物理字段、字段属性、敏感标记入口和待分级状态，并通过字段抽屉看到校验、权限、版本冲突和树刷新结果。

## 覆盖的用户故事

- PRD 用户故事 6-8、11、28
- FR-003、FR-005、FR-016、FR-019、FR-020

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| GET | `/api/v1/modeling/projects/{projectId}/object-tree` | 实现对象树查询 |
| POST / PATCH / archive | business object、logical entity、physical table 相关路径 | 实现对象维护 |
| POST / PATCH | `/api/v1/modeling/logical-fields`、`/api/v1/modeling/physical-fields` | 实现字段维护 |

## 验收标准

- [ ] 对象树能展示业务对象、逻辑实体、物理表和字段数量 / 状态摘要。
- [ ] 逻辑字段支持名称、中文名、字段语义、是否 P0 必填、字段属性、敏感标记、待分级状态和说明。
- [ ] 物理字段支持 PostgreSQL 类型、主键、分区、分层、注释和字段属性。
- [ ] 归档对象或字段时执行依赖检查，不破坏映射、检查结果、评审记录或发布快照。
- [ ] 字段抽屉支持取消、保存、冲突提示和草稿保留规则。
- [ ] 所有 mutating command 校验 `X-Idempotency-Key` 和乐观锁版本。

## 测试 Seam

- 主要公共接口：模型资产 Application 用例、模型资产聚合、字段值对象、Repository、对象树 Controller、设计工作台页面。
- 必需测试：
  - [ ] 行为 / 领域测试：字段必填、P0 标记、待分级状态、依赖归档。
  - [ ] API / 契约测试：CT-010、CT-012、CT-014、CT-015。
  - [ ] UI / 组件测试：对象树刷新、字段抽屉、取消 / 保存 / 冲突状态。
  - [ ] E2E 测试：新增逻辑实体和物理表，维护字段，刷新对象树。

## 阻塞关系

- DMW-001 模型项目与边界闭环。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 敏感分级：正式分级后置，本切片只实现敏感标记和待分级入口。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束。

## 完成定义

- [ ] 设计工作台能完成对象与字段维护主路径。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 字段标准、命名词典和码表复用入口如未完整实现，已在 UI 和文档中明确为后续治理能力。
