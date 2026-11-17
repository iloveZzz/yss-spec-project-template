## 检查清单

- 分页字段名是否与已批准公开协议一致；采用 YSS 分页协议时对齐 wire profile。
<a id="dto.sort"></a>
- `orderBy` / `groupBy` 是否经过 Repository 白名单映射，禁止直接拼接 SQL。
- Application Query Port / Infrastructure 是否收到批准的分页语义；Domain Gateway 不接收 `PageQuery`。
- 新增 DTO 是否与现有序列化和校验方式兼容。
- 返回结构是否和前端或上游调用方契约一致。
- 采用 YSS wrapper 的 endpoint，其 wrapper extension、`YssResultMeta`、`allOf`、具体 data schema 和方向性是否对齐；特殊协议检查实际媒体类型、状态、Header、错误与权限边界。
- 采用 YSS 分页协议时，是否有针对内部 `offset` / `needTotalCount` / `tempTotalCount` 泄露的负向断言；其他已确认协议是否逐项核对既有公开字段。公开 `totalPages` 是否有目标 mapper / fixture 证据。
- Controller、Application Service、Domain、Repository 之间是否存在 DTO/VO/DO/PO 混穿。
- 是否递归核对嵌套类型、集合元素、Map 值及泛型参数；Request → 用例输入、用例结果 → Response 的方向是否保持，未用内部对象充当公开子结构。
- 缺失、显式 null、空字符串、空集合及合法零值是否遵守请求/响应语义；部分更新的“保持/清空”是否保留必要的字段存在性。
- 前端 Orval 或调用方是否依赖当前返回包装结构。
