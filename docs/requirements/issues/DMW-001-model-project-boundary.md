# 垂直切片 Issue：DMW-001 模型项目与边界闭环

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- OpenAPI Freeze：`docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付模型项目从列表、创建、边界声明、详情查看、基础信息更新到归档的完整闭环。完成后，内部数据架构师可以创建“绩效风控指标模型复用”试点项目，明确“绩效风控”主题域和“产品绩效收益模型”子域边界，并在工作台中看到权限动作、分页筛选排序、乐观锁冲突和归档后的状态变化。

## 覆盖的用户故事

- PRD 用户故事 1-5
- FR-001、FR-002、FR-019、FR-021

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| GET / POST | `/api/v1/modeling/projects` | 按冻结契约实现列表与创建 |
| GET / PATCH | `/api/v1/modeling/projects/{projectId}` | 按冻结契约实现详情与更新 |
| POST | `/api/v1/modeling/projects/{projectId}/archive` | 按冻结契约实现归档 |

## 验收标准

- [ ] 架构师可以创建带项目编码、负责人、主题域、子域、业务边界和试点说明的模型项目。
- [ ] 缺失主题域或业务边界时返回统一错误，不创建项目。
- [ ] 模型项目列表支持分页、关键字、状态、负责人、评审状态、覆盖率范围、排序和方向。
- [ ] 项目详情返回 `actions`，前端能基于 `enabled` 和 `disabledReason` 展示可用 / 禁用命令。
- [ ] 更新项目必须校验 `draftVersion`，冲突时返回 409 且不覆盖他人修改。
- [ ] 归档项目不删除已发布版本和审计追溯，默认列表不展示已归档项目。

## 测试 Seam

- 主要公共接口：项目 Application 用例、项目聚合、项目 Repository、项目 Controller、项目列表 / 详情页面。
- 必需测试：
  - [ ] 行为 / 领域测试：边界必填、归档状态、乐观锁冲突。
  - [ ] API / 契约测试：CT-020、CT-021、CT-022、CT-023、CT-013、CT-014。
  - [ ] UI / 组件测试：列表筛选排序、创建表单校验、权限禁用状态。
  - [ ] E2E 测试：创建试点项目，打开详情，更新边界，归档项目。

## 阻塞关系

- 无，可立即开始。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`，后端必须 fail closed。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束，`TODO-HUMAN-REVIEW`。
- [ ] 审计：创建、更新、归档必须记录 actor、action、target、result、correlationId、time。

## 完成定义

- [ ] 实现完成且不修改冻结 OpenAPI。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 已移除调试 / 原型代码。
- [ ] 如领域边界或架构决策变化，已更新 ADR / OpenSpec / PRD 回填项。
