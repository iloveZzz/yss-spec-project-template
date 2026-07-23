# Liquibase 特性使用规则

使用下列特性时读取本文，并以项目锁定的 Liquibase 版本文档和 API 为准。

- `runAlways`：只用于可重复、无副作用操作；禁止用于普通 DDL 和数据回填。
- `runOnChange`：用于视图、函数、存储过程等可重建对象；不得用来绕过历史不可变规则。
- `includeAll`：默认避免。只有排序、打包和文件过滤规则稳定且有测试时才采用。
- `logicalFilePath`：用于文件移动时维持身份；必须进行从已发布版本升级测试。
- precondition：验证真实前提并快速失败。`MARK_RAN`、`CONTINUE`、`WARN` 必须解释后果，不得掩盖环境漂移。
- `validCheckSum`：仅用于审计过的历史兼容，不是常规修复方式。
- `runInTransaction=false`：记录部分执行后的恢复和重入方案。
- `sqlFile`/原生执行器：核对 `splitStatements`、`endDelimiter`、encoding、comment stripping 及客户端依赖。

context/label 优先表达可选能力、数据库角色、租户类别或受控初始化，不用于让核心 schema 在 dev/test/prod 长期分叉。自定义 `SpringLiquibase` 必须按需求同时透传 context 与 label，发布清单记录实际值。

changeset 完整身份通常是 `id + author + filepath`。审计时分别报告完整身份冲突与项目级 `author:id` 重复，严重度不可混同。
