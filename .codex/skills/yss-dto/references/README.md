# 参考资料

本文档详细介绍了 `yss-component-dto` 组件的核心数据传输对象（DTO）。这些 DTO 类被广泛应用于各个服务项目，用于规范数据交互格式。

## 核心类 (Core Classes)

### 1. Result.java

**位置**: `../assets/Result.java`

通用响应包装类，用于统一 API 接口的返回格式。

**核心字段**:

- `success`: 操作是否成功 (boolean)
- `code`: 状态码 (Object, 默认 "DM-A0001")
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

### 3. CommandDTO.java & QueryDTO.java

**位置**: `../assets/CommandDTO.java`, `../assets/QueryDTO.java`

基础 DTO 抽象类，用于区分命令（写操作）和查询（读操作）对象。

- **CommandDTO**: 实现 `Serializable` 接口，所有命令参数应继承此类。
- **QueryDTO**: 继承自 `CommandDTO`，所有查询参数应继承此类。

## 使用场景

1. **API 响应**: 所有 Controller 方法应返回 `Result` 或其子类（如 `PageResult`, `SingleResult`）。
2. **分页查询**: Controller 接收分页请求时，参数类应继承 `PageQuery`。MyBatis 分页插件会自动识别并处理。
3. **参数封装**: 使用 `CommandDTO` 封装增删改参数，使用 `QueryDTO` 封装查询参数，保持代码语义清晰。
