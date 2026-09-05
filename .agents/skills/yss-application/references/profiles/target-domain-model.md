# target-domain-model

只用于 `domain-driven`；完整执行规则见 `../application-layer-guide.md`。Application 调用 Domain/Gateway 或 Query Port；领域不变量归 Domain，事务归 Application，HTTP DTO 转换归 Web。禁止把本分支套给 MVC。
