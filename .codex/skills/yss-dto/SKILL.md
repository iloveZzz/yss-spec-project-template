---
name: yss-dto
description: Use when YSS `Result`, `SingleResult`, `MultiResult`, `PageResult`, `PageQuery`, `CommandDTO`, `QueryDTO`, pagination, or response-wrapper boundaries are involved.
---

# yss-dto

用于处理 `yss-component-dto` 的使用规范和代码接入。

本 skill 同时负责把中台 DTO 映射到公开 HTTP/JSON 边界。`references/openapi-wire-profile.yaml` 是可复用的机器可读映射源；OpenAPI 治理和 Draft Review 必须消费它，不得各自复制一份 wrapper 或分页字段表。

## 所有权边界

- `Result` / `SingleResult` / `MultiResult` / `PageResult`、`CommandDTO` / `QueryDTO` / `PageQuery` 的 canonical package、工厂方法、字段语义、默认值、枚举和禁用字段由本 skill 及 `references/openapi-wire-profile.yaml` 唯一持有。
- Web skill 只生成 endpoint-specific Page Request、Request/Response 与 Convertor，并通过批准合同中的 profile 引用和 digest 消费上述协议；不得生成 wrapper/page base，也不得维护分页字段或默认值副本。
- OpenAPI skill 只把该 profile 组合进 endpoint schema；不得从 Java getter 或本地常量反向建立第二份 wire 协议。

## 何时使用

- 用户要定义新的分页查询对象。
- 用户要统一接口返回结构。
- 用户提到 `Result`、`PageQuery`、`CommandDTO`、`QueryDTO`。
- 用户在排查分页参数、返回结构或 DTO 继承不一致问题。

## 工作方式

1. 优先沿用项目现有 DTO 体系，不重复造返回包装类。
2. 涉及真实类名、返回结构、分页字段或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 新 Target Profile 的 canonical 包固定为 `com.yss.cloud.dto.result`；`com.yss.cloud.dto.response` 为 `unsupported`，不得在新契约或脚手架输出中引入。检测到旧包时只报告边界，不自动改写；旧项目现代化须单独立项。
4. 需要设计或审查 API 时，先校验 `references/openapi-wire-profile.yaml`，再把 endpoint 的具体 DTO/VO schema 组合到 wrapper；Java 泛型不是 OpenAPI schema。
5. 只围绕当前 DTO 结构回答，不泛化到整个微服务理论。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-skill-source-index-refresh/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- OpenAPI wire profile：`references/openapi-wire-profile.yaml`
- 重点源码入口通常包括 `CommandDTO`、`QueryDTO`、`PageQuery`、`PageRequestFactory`、`Result`、`SingleResult`、`MultiResult`、`PageResult`。

当组件源码变化后，用 `yss-skill-source-index-refresh` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 使用规则

- 写操作参数优先继承 `CommandDTO`。
- Application/Infrastructure 内部读参数可按项目 Profile 使用 `QueryDTO` 或 `PageQuery`。
- 公开 HTTP Page Request 默认不继承 `PageQuery`，只复制冻结 OpenAPI 允许的分页字段，再由 WebConvertor 转为 Application Query；避免继承的 `offset`、`needTotalCount`、`tempTotalCount` 进入绑定面。
- Controller 返回优先使用项目既有的 `Result` 或派生结果对象。
- 单对象返回优先 `SingleResult`，列表返回优先 `MultiResult`，分页返回优先 `PageResult`，前提是当前项目已采用这套体系。
- 三种泛型结果要求 `T extends Serializable`；生成的 VO/响应类型必须满足该编译约束。
- OpenAPI 响应以 `YssResultMeta` 表达公共字段，并用 `allOf` 叠加 endpoint-specific `data` / page 字段；每个响应声明 `x-yss-response-wrapper: SingleResult|MultiResult|PageResult`，不得把 `SingleResult<T>` 文字写成 schema。
- wire shape 不是 Java 字段清单：`success` 为 boolean，`dataType` 为 `string|null`，`code` 只允许 `string|integer|null`；不得把全局 `code` 放宽为任意 object。
- `MultiResult.data` 和 `PageResult.data` 对外是数组，空值按 `[]` 建模；`SingleResult.data` 按 endpoint schema 建模并显式处理 nullability。
- `PageResult` 当前稳定公共字段为 `totalCount/pageSize/pageIndex/data[]`；`totalPages` 是计算 getter，只有目标 HTTP mapper / contract fixture 证明后才能进入具体契约。
- `PageQuery` 客户端输入只允许 `pageIndex/pageSize/orderBy/orderDirection/groupBy`（后四项按 profile 的 optional / whitelist 规则）；`orderDirection` 只能是 `ASC|DESC`。`offset`、`needTotalCount`、`tempTotalCount` 是计算或内部协作字段，禁止成为客户端输入。
- `buildSuccess(...)` 各重载设置 code 的行为并不一致；冻结契约必须测试 `success/code/message/tips/dataType`、nullability 和三种 data shape，不能只测试 data。
- Java getter、Lombok、`@JsonIgnore` 或默认 Jackson 结果都不是目标 HTTP wire fact；冻结前必须记录 mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP 证据。
- DTO 只表达接口契约，不承载 Repository PO 或领域对象的持久化细节。

## 检查清单

- 分页字段名是否和框架约定一致。
- `orderBy` / `groupBy` 是否经过 Repository 白名单映射，禁止直接拼接 SQL。
- Application Query Port / Infrastructure 是否收到批准的分页语义；Domain Gateway 不接收 `PageQuery`。
- 新增 DTO 是否与现有序列化和校验方式兼容。
- 返回结构是否和前端或上游调用方契约一致。
- 是否通过 `scripts/verify-yss-dto-openapi-profile`，并引用 profile 版本。
- wrapper extension、`YssResultMeta`、`allOf`、具体 data schema 和方向性是否逐 endpoint 对齐。
- 是否有针对 `offset` / `needTotalCount` / `tempTotalCount` 的负向断言，以及对 `totalPages` 的目标 mapper 证据。
- Controller、Application Service、Domain、Repository 之间是否存在 DTO/VO/DO/PO 混穿。
- 前端 Orval 或调用方是否依赖当前返回包装结构。

## 修改约束

- 不要在一个项目里混用多套返回包装类。
- 不要新建与 `PageQuery` 含义重叠的分页基类。
- 不要把 `com.yss.cloud.dto.response` 作为新 API 的 canonical 包，也不要从 Java getter 机械生成 wire schema。
- 不要把 `offset`、`needTotalCount`、`tempTotalCount` 作为客户端分页输入；不要无证据把 `totalPages` 写入所有分页响应。
- 若项目已有 `SingleResult`、`PageResult`、`MultiResult` 体系，优先保持一致。

## 按需读取

- 源码索引：`references/source-index.md`
- DTO 基类示例：`assets/CommandDTO.java`、`assets/QueryDTO.java`
- 分页基类：`assets/PageQuery.java`
- 返回结构：`assets/Result.java`
- HTTP/JSON 映射：`references/openapi-wire-profile.yaml`

## 阶段 7 合同

- DTO/VO 必须消费冻结 OpenAPI/no-impact record 和批准合同，写入合同允许路径。
- POJO 样板可 `controlled-generation`；校验、权限输入、错误结构和序列化行为必须由对应 `behavior-tdd` 工作单元覆盖。
- 必须加载合同要求的 `lombok`、`mapstruct` 和 `alibaba-java-code-style`，并按统一 `YSS Skill Execution Result` 返回文件、契约测试和偏离。
