# 垂直切片 Issue：DMW-005 规范规则与检查运行

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- PRD：`docs/requirements/2026-07-01-data-modeling-workbench-prd.md`
- 系统架构：`docs/architecture/2026-07-02-data-modeling-workbench-architecture-design.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`

## 要构建什么

交付规范规则配置与检查运行闭环。完成后，架构师可以配置阻断项 / 警告项，数仓开发工程师可以发起规范检查，系统输出命名、分层、类型、注释、必填元数据、敏感标记、待分级状态和映射完整性问题，并把阻断结果用于提交评审和发布门禁。

## 覆盖的用户故事

- PRD 用户故事 16-18、19、22
- FR-009、FR-016、FR-020

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| GET / PUT | `/api/v1/modeling/projects/{projectId}/validation-rules` | 规则集查询与更新 |
| POST | `/api/v1/modeling/projects/{projectId}/validations` | 发起检查 |
| GET | `/api/v1/modeling/validations/{validationRunId}` | 查询检查结果 |

## 验收标准

- [ ] 规则集更新需要 `draftVersion` 和幂等键，成功后规则集版本可追溯。
- [ ] 检查运行绑定 `projectId`、`draftVersion`、`ruleSetVersion`。
- [ ] 检查结果包含对象类型、对象 ID、字段路径、行号、消息、建议、严重级别和阻断标记。
- [ ] 存在 blocker 时提交评审返回 `VALIDATION_BLOCKING_ISSUES`。
- [ ] 草稿变更后旧检查结果只作为历史证据，不能作为当前门禁。
- [ ] 规范检查面板能定位到受影响模型资产。

## 测试 Seam

- 主要公共接口：规则配置 Application 用例、Validation Domain Service、规则 Gateway、Validation Repository、规范检查面板。
- 必需测试：
  - [ ] 行为 / 领域测试：阻断 / 警告分级、旧检查失效、字段定位。
  - [ ] API / 契约测试：CT-050 至 CT-054。
  - [ ] UI / 组件测试：规则配置、检查运行、结果筛选、定位到字段。
  - [ ] E2E 测试：运行检查，看到 blocker，修复后重新检查通过。

## 阻塞关系

- DMW-004 字段映射与覆盖率。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 公司级字段标准、命名词典和码表资产只复用已有入口，不扩展完整标准库治理。
- [ ] 原生 SQL：仅生成草案或通过 Repository 约束。

## 完成定义

- [ ] 规则配置、检查运行和 blocker 门禁可演示。
- [ ] 已新增并通过行为、API、UI、E2E 测试。
- [ ] 不修改已冻结 OpenAPI。
- [ ] 检查结果能被评审和发布前置条件复用。
