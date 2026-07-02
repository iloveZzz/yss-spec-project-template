# 垂直切片 Issue：DMW-004 字段映射与覆盖率

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- 交互设计：`docs/design/data-modeling-workbench-interaction-spec.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付逻辑字段到物理字段的映射和覆盖率闭环。完成后，数仓开发工程师可以查询映射列表、筛选未映射 / P0 / 问题字段、维护单条或批量映射，系统实时展示整体覆盖率、P0 必填覆盖率和未映射提示，并按 80%、85%、95% 阈值给出门禁状态。

## 覆盖的用户故事

- PRD 用户故事 12-15、18、22、28
- FR-006、FR-007、FR-008、FR-021

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| GET | `/api/v1/modeling/projects/{projectId}/mappings` | 映射列表与筛选分页 |
| PUT | `/api/v1/modeling/mappings/{mappingId}` | 单条映射维护 |
| POST | `/api/v1/modeling/projects/{projectId}/mappings/batch` | 批量映射维护 |
| GET | `/api/v1/modeling/projects/{projectId}/coverage` | 覆盖率查询 |

## 验收标准

- [ ] 映射列表支持表、未映射、P0、问题等级筛选和分页。
- [ ] 保存映射时校验映射说明、逻辑字段 / 物理字段范围和 `draftVersion`。
- [ ] 整体覆盖率按有效映射逻辑字段数 / 范围内有效逻辑字段总数计算。
- [ ] P0 覆盖率按有效映射 P0 必填逻辑字段数 / 范围内 P0 必填逻辑字段总数计算。
- [ ] 覆盖率低于 80% 时不能提交评审；低于 85% 或 P0 低于 95% 时不能发布。
- [ ] UI 展示未映射、重复映射、疑似错映射字段和阻断原因。

## 测试 Seam

- 主要公共接口：映射 Application 用例、覆盖率 Domain Service、Mapping Repository、映射抽屉、覆盖率面板。
- 必需测试：
  - [ ] 行为 / 领域测试：覆盖率公式、P0 阈值、越界字段、重复映射。
  - [ ] API / 契约测试：CT-040 至 CT-045。
  - [ ] UI / 组件测试：映射列表筛选、批量映射、覆盖率状态、未映射提示。
  - [ ] E2E 测试：创建映射并看到覆盖率从不达标变为达标。

## 阻塞关系

- DMW-002 模型对象树与字段维护。
- DMW-003 Excel 导入物理模型草稿。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 覆盖率阈值必须集中在 Domain 或共享规则中，避免 UI / 后端漂移。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束。

## 完成定义

- [ ] 映射维护和覆盖率主路径可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 覆盖率阈值测试覆盖 80%、85%、95% 边界。
