## 检查清单

- 分页字段名是否与已批准公开协议一致；采用 YSS 分页协议时对齐 wire profile。
<a id="dto.sort"></a>
<!-- yss-rule {"id":"dto.sort","when":"pagination","level":"mandatory","evidence":"code-and-verification"} -->
- `orderBy` / `groupBy` 是否经过 Repository 白名单映射，禁止直接拼接 SQL。
- Application Query Port / Infrastructure 是否收到批准的分页语义；Domain Gateway 不接收 `PageQuery`。
- 新增 DTO 是否与现有序列化和校验方式兼容。
- 返回结构是否和前端或上游调用方契约一致。
- 采用 YSS wrapper / 分页协议时，是否通过 `scripts/verify-yss-dto-openapi-profile`，并引用 profile 版本。
- 采用 YSS wrapper 的 endpoint，其 wrapper extension、`YssResultMeta`、`allOf`、具体 data schema 和方向性是否对齐；特殊协议检查实际媒体类型、状态、Header、错误与权限边界。
- 采用 YSS 分页协议时，是否有针对内部 `offset` / `needTotalCount` / `tempTotalCount` 泄露的负向断言；其他批准协议是否逐项绑定冻结公开字段。公开 `totalPages` 是否有目标 mapper / fixture 证据。
- Controller、Application Service、Domain、Repository 之间是否存在 DTO/VO/DO/PO 混穿。
- 前端 Orval 或调用方是否依赖当前返回包装结构。
