---
name: yss-liquibase
description: 分析、设计、实现、审计和排查 YSS Liquibase 全生命周期数据库迁移，包括 YSS starter 与 Spring Boot 接入、changelog/changeset、formatted SQL、数据回填、零停机演进、生产发布、锁与 checksum、多数据源/租户/分片、MySQL/Oracle/PostgreSQL 及兼容数据库。用户要求处理 Liquibase 配置、脚本、升级、回滚、启动失败、发布审计或数据库迁移风险时使用。
---

# YSS Liquibase

以当前项目、实际依赖、YSS 组件源码和目标数据库为事实来源。先确定任务模式与授权边界，再取证、实施和验证。

## 选择模式

- `analyze`：盘点现状、执行入口、版本、资源矩阵和风险；保持只读。
- `design`：设计 changeset、兼容发布、数据回填和恢复方案；除非用户要求，不修改文件。
- `implement`：新增迁移、更新 master、补测试并运行验证。
- `diagnose`：分析锁、checksum、启动失败、schema 或方言问题；默认只读。
- `release-audit`：基于明确 Git 基线、发布清单和可选数据库状态给出门禁结论。

根据用户动词选择一种或组合模式。“分析”不授权修改，“排查”不授权释放锁，“实现”才授权仓库内编辑。共享环境或生产数据库上的任何写操作都必须另获明确授权。

## 先取证

1. 若仓库存在 `.codegraph/`，先用 CodeGraph 定位依赖、配置、迁移入口、调用链和测试；否则使用 `rg`。
2. 读取 `references/source-index.md`。依赖精确 YSS 行为时，按 `yss-source-index/references/source-location.md` 定位源码，并读取 `references/yss-starter-capabilities.md`；项目版本不匹配时以实际源码和 Maven 依赖树为准。
3. 检查依赖树、Spring Boot/Liquibase/驱动版本、`javax`/`jakarta` 体系、自动配置条件、自定义 `SpringLiquibase`、全部 changelog、发布流水线、资源说明和测试。
4. 确认唯一迁移执行所有者：应用启动、迁移 Job、流水线、CLI 或 DBA。识别多个入口、启动竞争和文档/Bean 生命周期漂移。
5. 确认目标数据库版本、schema/catalog、数据规模、租户或分片范围、context/label 以及 changelog/lock 表。

可先运行只读审计：

```bash
python3 <skill-dir>/scripts/audit_liquibase.py <module-or-repo> --format text
python3 <skill-dir>/scripts/audit_liquibase.py <module-or-repo> --baseline <release-tag> --format json
```

审计结果只是证据，不代替项目锁定版本的 Liquibase `validate`、`updateSQL`、真实数据库升级测试或人工风险判断。

## 判定迁移形态

- 单数据源启动迁移：沿用项目现有 Spring Boot `spring.liquibase.*` 接法。
- 模块自有迁移：确认专用 master、changelog/lock 表及与应用全局迁移的隔离。
- 多数据源、租户、分片或动态目标库：读取 `references/multi-datasource-migrations.md`。
- 数据回填、大表 DDL、字段收紧或删除：读取 `references/zero-downtime-and-data.md`。
- 生产诊断、发布、锁或 checksum：读取 `references/production-safety.md`。
- 使用 precondition、context/label、`runAlways`、`runOnChange`、`includeAll`、`logicalFilePath`、`validCheckSum` 或 `runInTransaction`：读取 `references/liquibase-features.md`。

支持范围由项目事实决定。XML/YAML changelog 和 formatted SQL 均可处理；JSON 仅在项目已采用时沿用。MySQL、Oracle、PostgreSQL 是深度参考基线；MariaDB、达梦、人大金仓等必须独立核对数据库版本、Liquibase `Database` 实现和实际 DDL，不能仅按兼容模式归类。H2 不能证明生产方言兼容。

## changeset 核心规则

1. 追加新 changeset 修复历史；不得改动已执行 changeset 的路径、`id`、`author` 或内容。
2. changeset 身份通常由 `id + author + filepath` 构成。文件移动须评估 `logicalFilePath`；项目可以额外要求 `author:id` 全局唯一，但不要把它误述为 Liquibase 的完整身份。
3. 文件名版本只负责排序和可读性，不是执行身份。master 必须按预期顺序 include，并保持路径稳定。
4. formatted SQL 必须声明头和稳定的 `--changeset author:id`。SQL 语句以分号结束；对象使用项目命名规范并显式命名索引和约束。
5. 不要求每条 SQL 自身幂等。仅在失败后重入、外部重复执行或按需迁移确有要求时增加 precondition 或幂等设计。
6. 数据库专用语法仅放入明确的方言分支。同步核对类型、标识符长度、时间精度、默认值、列修改、索引、事务和引号语义。
7. 不在脚本、命令输出或报告中泄露连接凭据和敏感数据。

## 验证与门禁

按风险选择门禁：

- 低风险：静态审计、Liquibase `validate`、空库 `update`、资源/模块测试。
- 中风险：增加上一发布版本升级、`updateSQL` 审阅、数据量评估和每种目标数据库验证。
- 高风险：增加兼容发布方案、生产相近数据量演练、锁与时长观测、审批以及备份或前滚恢复验证。

至少检查资源完整性、include 顺序、完整身份冲突、方言路由、启停开关、context/label 透传、schema、锁表、checksum 和失败恢复。`rollbackSQL` 只能证明能生成 SQL，不能证明数据可恢复。

Git 基线与数据库事实分级表述：工作区相对 `HEAD` 的变化、相对明确发布 ref 的历史变化、已由目标 `DATABASECHANGELOG` 证实执行的变化不能混为一谈。未提供发布基线或真实数据库证据时明确降低结论强度。

## 输出迁移清单

报告模式、执行所有者、目标区域/schema、数据库矩阵、changeset 身份与顺序、风险级别、应用兼容窗口、前置检查、成功判据、恢复步骤、验证证据和未验证项。只完成静态检查或未连接真实数据库时必须明示。

## 安全边界

- 在线诊断默认只读，优先分析脱敏后的 `DATABASECHANGELOG`、`DATABASECHANGELOGLOCK` 和日志导出。
- 不主动搜集凭据，不自动运行 `update`、`rollback`、`releaseLocks`、`clearCheckSums` 或手工更新 changelog 表。
- `clearCheckSums`、`validCheckSum` 和解锁只能在根因、目标库、schema、锁持有者、备份与影响范围确认后，由用户明确授权执行。
- 不臆造 YSS starter 扩展点或把 `spring.liquibase.*` 当成唯一入口。
- 不修改已发布历史来通过校验，不用 H2 或静态扫描替代真实数据库证据。
