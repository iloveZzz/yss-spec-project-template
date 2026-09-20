## 检查清单

- 分页字段名是否和框架约定一致。
<a id="dto.sort"></a>
<!-- yss-rule {"id":"dto.sort","when":"pagination","level":"mandatory","evidence":"code-and-verification"} -->
- `orderBy` / `groupBy` 是否经过 Repository 白名单映射，禁止直接拼接 SQL。
- Application Query Port / Infrastructure 是否收到批准的分页语义；Domain Gateway 不接收 `PageQuery`。
- 新增 DTO 是否与现有序列化和校验方式兼容。
- 返回结构是否和前端或上游调用方契约一致。
- 是否通过 `scripts/verify-yss-dto-openapi-profile`，并引用 profile 版本。
- wrapper extension、`YssResultMeta`、`allOf`、具体 data schema 和方向性是否逐 endpoint 对齐。
- 是否有针对 `offset` / `needTotalCount` / `tempTotalCount` 的负向断言，以及对 `totalPages` 的目标 mapper 证据。
- Controller、Application Service、Domain、Repository 之间是否存在 DTO/VO/DO/PO 混穿。
- 前端 Orval 或调用方是否依赖当前返回包装结构。
