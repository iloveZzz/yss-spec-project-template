# 垂直切片 Issue：DMW-009 安全、审计与契约收口

## 父级

- OpenSpec / Comet change：`openspec/changes/data-modeling-workbench-mvp`
- OpenAPI Freeze：`docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- 契约测试清单：`docs/testing/2026-07-02-data-modeling-workbench-contract-test-checklist.md`
- AGENTS 安全红线：`AGENTS.md`

## 要构建什么

交付 MVP 进入实现完成前的安全、审计、契约和质量收口。这个 issue 不替代前 8 个功能切片的安全要求，而是在前 8 个切片完成后，统一确认权限 fail-closed、审计覆盖、统一错误、分页筛选排序、乐观锁、异步任务、文件安全、DDL 草案红线和人工审查证据。

## 覆盖的用户故事

- PRD 用户故事 4、19、23、29
- FR-019、FR-020，以及全局安全红线和契约一致性要求

## OpenAPI 影响

- [x] 基于冻结 OpenAPI：`docs/api/specs/data-modeling-workbench.yaml`
- [ ] 需要修改 OpenAPI

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 全部 | `/api/v1/modeling/**` | 不新增契约；做跨端点契约、安全、审计和错误结构收口 |

## 验收标准

- [ ] OpenAPI 解析、`$ref`、路径参数和无 DDL 执行端点检查全部通过。
- [ ] 所有单对象、分页、业务校验失败、权限失败、幂等键缺失返回结构符合冻结契约。
- [ ] 越权查看项目详情返回 403 且响应不包含业务数据。
- [ ] 越权审批、发布、导出返回 403，写安全审计，状态不变。
- [ ] 发布、审批、导入 apply、导出创建成功均写业务审计。
- [ ] Excel 上传公式注入风险内容按安全规则处理或阻断。
- [ ] 搜索和分页 size 过大返回校验错误或按最大 size 限制。
- [ ] 所有 TODO-HUMAN-REVIEW 项都有人工确认记录或明确阻断结论。

## 测试 Seam

- 主要公共接口：权限 Gateway、Audit Gateway、统一错误处理、分页查询组件、合同测试套件、关键 E2E 流程。
- 必需测试：
  - [ ] 行为 / 领域测试：关键命令审计、权限 fail-closed、乐观锁冲突。
  - [ ] API / 契约测试：CT-001 至 CT-004、CT-010 至 CT-015、CT-090 至 CT-094。
  - [ ] UI / 组件测试：无权限、禁用动作、错误提示、分页 size 限制。
  - [ ] E2E 测试：从项目创建到发布导出主路径，以及至少一个越权失败路径。

## 阻塞关系

- DMW-001 至 DMW-008。

## AI / 人工审查点

- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`。
- [ ] 文件上传 / 下载安全：`TODO-HUMAN-REVIEW`。
- [ ] SQL / DDL 草案：`TODO-HUMAN-REVIEW`。
- [ ] 数据库迁移：仅生成模板，`TODO-HUMAN-REVIEW`。
- [ ] 加密算法：禁止实现；如发现需要加密能力，停止并交由人工设计。
- [ ] 公共基础库 API：仅生成草案。

## 完成定义

- [ ] 契约测试清单全部通过或有明确阻断项。
- [ ] 每个安全红线都有人工确认记录。
- [ ] 审计覆盖矩阵与实现行为一致。
- [ ] fresh verification 证据已记录，可进入独立审查 / 发布前验证。
