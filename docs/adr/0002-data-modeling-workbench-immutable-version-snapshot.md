# ADR-0002: 数据建模工作台发布版本快照不可变

## 状态

已接受

## 日期

2026-07-02

## 背景

企业数据模型协作工作台 MVP 需要支持模型评审、发布、历史版本查看、从版本创建草稿和异步导出。PRD 要求发布快照不可变，数据架构要求发布时冻结逻辑模型、物理模型、字段映射、覆盖率、规范检查结果和 DDL 草案提示。

如果发布版本直接复用草稿明细表，后续字段或映射变更可能污染历史版本，导致评审追溯、导出资产和审计证据不可信。

## 决策

发布模型版本时生成不可变 `ModelVersion` 和 `VersionSnapshot`。

具体约束：

1. 发布版本详情只读。
2. 发布快照保存 `snapshotChecksum` 和 `snapshotSchemaVersion`。
3. 导出任务只能绑定发布版本 `versionId`，不能绑定可变草稿。
4. 后续修改必须通过“从版本创建草稿”进入新的草稿态元数据，并记录 `sourceVersionId`。
5. 不允许普通业务操作直接修改已发布 `VersionSnapshot`；确需修复只能走人工数据修复流程或发布新版本。

## 考虑的替代方案

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 发布版本复用草稿明细行 | 存储简单，查询方便。 | 后续草稿修改会污染历史版本，追溯不可信。 | 拒绝。 |
| 每次发布复制归一化全量明细表 | 查询灵活，结构强。 | 表数量和迁移复杂度高，MVP 实现成本大。 | 暂不采用。 |
| 发布元数据摘要 + JSONB 完整快照 | 兼顾追溯、结构演进和 MVP 成本。 | 快照内部查询能力弱，需要保留 summary 列。 | 采用。 |

## 后果

### 正面影响

- 历史版本、评审证据和导出资产可追溯。
- 从版本创建草稿的行为边界清晰。
- `snapshotSchemaVersion` 支持后续快照结构演进。

### 负面影响

- 发布时需要生成完整快照和校验值。
- 快照 payload 内部结构变更需要兼容策略。

### 风险

- 快照过大可能影响读取和存储，需要限制 P0 模型规模并保留 summary 列。
- 人工数据修复流程必须严格控制，否则会破坏不可变语义。

## 相关

- `docs/api/specs/data-modeling-workbench.yaml`
- `docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- `docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md`
- `docs/architecture/2026-07-02-data-modeling-workbench-architecture-design.md`
