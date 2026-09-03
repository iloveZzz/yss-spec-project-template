# 参考资料

本文档详细介绍了 `yss-component-dto` 组件的核心数据传输对象（DTO）。这些 DTO 类被广泛应用于各个服务项目，用于规范数据交互格式。公开 HTTP/JSON 的可复用映射以 `openapi-wire-profile.yaml` 为准；本文不把 Java 字段或 getter 自动等同于 wire shape。

## 核心类 (Core Classes)

### 1. Result.java

**位置**: `../assets/Result.java`

通用响应包装类，用于统一 API 接口的返回格式。

**核心字段**:

- `success`: 操作是否成功 (boolean)
- `code`: Java 内部类型为 `Object`；公开 wire contract 仅允许 `string | integer | null`
- `message`: 消息描述 (String, 默认 "数据返回正常")
- `dataType`: 返回数据格式
- `tips`: 提示消息

**常用静态方法**:

- `buildSuccess()`: 构建成功响应
- `buildSuccess(String message)`: 构建带消息的成功响应
- `buildFailure(String message)`: 构建失败响应
- `buildFailure(String errCode, String message)`: 构建带错误码的失败响应

### 2. PageQuery.java

**位置**: `../assets/PageQuery.java`

分页查询基础类，所有需要分页的查询参数都应继承此类。

**核心字段**:

- `pageIndex`: 当前页码 (默认 1)
- `pageSize`: 每页条数 (默认 10)
- `orderBy`: 排序字段
- `orderDirection`: 排序方向 (ASC/DESC, 默认 DESC)
- `tempTotalCount`: 临时总数字段（由分页插件回填）

**功能**:

- 提供了链式调用的 Setter 方法 (`setPageIndex`, `setPageSize` 等)。
- 自动计算偏移量 `getOffset()`。

## HTTP/JSON 映射边界

- 新 Target Profile 只使用 `com.yss.cloud.dto.result`；`com.yss.cloud.dto.response` 为 `unsupported`，不得由新契约或脚手架引入，也不自动迁移旧项目。
- 公共响应 schema 使用 `YssResultMeta`，具体 endpoint schema 使用 `allOf` 组合，并声明 `x-yss-response-wrapper`。
- `MultiResult.data` 和 `PageResult.data` 为数组；`SingleResult.data` 绑定具体 endpoint schema。不要把 `SingleResult<T>`、`MultiResult<T>` 或 `PageResult<T>` 的 Java 泛型文字直接写成 OpenAPI schema。
- `PageQuery` 的客户端字段是 `pageIndex/pageSize/orderBy/orderDirection/groupBy`；`offset`、`needTotalCount`、`tempTotalCount` 不属于客户端输入。`totalPages` 只有目标 mapper / contract evidence 证明后才进入响应契约。

### 3. CommandDTO.java & QueryDTO.java

**位置**: `../assets/CommandDTO.java`, `../assets/QueryDTO.java`

基础 DTO 抽象类，用于区分命令（写操作）和查询（读操作）对象。

- **CommandDTO**: 实现 `Serializable` 接口，所有命令参数应继承此类。
- **QueryDTO**: 继承自 `CommandDTO`，所有查询参数应继承此类。

## 使用场景

1. **API 响应**: 所有 Controller 方法应返回 `Result` 或其子类（如 `PageResult`, `SingleResult`）。
2. **分页查询**: `PageQuery` 用于 Application/Infrastructure 内部协作；公开 HTTP Page Request 默认只声明冻结 OpenAPI 允许的字段，再由 WebConvertor 转换，避免内部字段被继承到绑定面。MyBatis 拦截器所需形状必须由 Query Port 集成测试证明。
3. **参数封装**: 使用 `CommandDTO` 封装增删改参数，使用 `QueryDTO` 封装查询参数，保持代码语义清晰。
