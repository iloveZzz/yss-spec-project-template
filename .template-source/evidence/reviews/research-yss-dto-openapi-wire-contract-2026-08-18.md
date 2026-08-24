# YSS DTO 与 OpenAPI YAML/JSON wire contract 事实研究

> 日期：2026-08-18
>
> 研究性质：只读事实研究，不作架构决策，不宣布 OpenAPI 批准、Freeze 或发布。
>
> 来源范围：模板仓库现有技能/文档，以及中台仓库当前磁盘上的 `yss-microservice-components/yss-component-dto` 源码和当前 Java import 使用。中台工作区存在其他既有脏改动，本研究未修改外部仓库；import 统计只针对当前 `*.java` 源文件，排除 `target`，不把索引文件当作当前真相。

## 已确认事实

### 1. 模板侧关于 YAML/JSON 契约的现有事实

- 模板仓库身份是 `repository_mode: template-source`（`yss-project.yaml:1-2`）。
- `yss-openapi-governance` 当前规定：OpenAPI YAML 是唯一权威契约，JSON 只能由冻结 YAML 可复现地产生，不能手写、反向覆盖 YAML，也不能把运行时代码当成设计契约来源（`.agents/skills/yss-openapi-governance/SKILL.md:8-15`）。Freeze 后的 JSON bundle 还需要记录 YAML/JSON SHA-256、工具版本、lockfile、命令和校验结果（同文件 `:68-78`）。
- `yss-openapi-draft-review` 把 `SingleResult<T>`、`MultiResult<T>`、`PageResult<T>` 和稳定 DTO/schema 名称列为 YSS API baseline；分页需要与 `PageResult<T>` 对齐，或显式记录例外（`.agents/skills/yss-openapi-draft-review/SKILL.md:10-24,34-43`）。这只是模板现有审查规则，不是本研究对某个具体 API 的批准。
- 模板 `yss-dto` 技能要求先确认项目实际采用的结果封装，再沿用 `CommandDTO` / `QueryDTO` / `PageQuery` 和既有结果包装；其文字规则写明三种泛型结果要求 `T extends Serializable`，并要求测试 `success/code/message/tips/data` 等行为（`.agents/skills/yss-dto/SKILL.md:17-22,32-42`）。
- `yss-dto` 的 `source-index.md` 明确自己是生成的路径提示，记录的 source worktree 为 `dirty`，并要求路径不存在时重新定位源码（`.agents/skills/yss-dto/references/source-index.md:3-10`）。它列出了 `response` 与 `result` 两套入口（同文件 `:30-45`）；本报告的结论来自随后读取的当前中台 Java 源码和实际 import，而不是该索引。

### 2. `Result` 基类的当前源码形状

两套 `Result` 的字段名、Java 类型和初始化值相同：

| 属性 | Java 类型 | 当前源码事实 |
|---|---|---|
| `success` | `boolean` | 默认 Java 值；有 success 状态字段 |
| `dataType` | `String` | 返回数据格式字段 |
| `code` | `Object` | 返回状态码字段 |
| `message` | `String` | 初始化为 `"数据返回正常"` |
| `tips` | `String` | 初始化为 `"信息返回正常"` |

来源：`response.Result` 的字段在 `yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/Result.java:18-27`；`result.Result` 的对应字段在 `.../result/Result.java:18-27`。

两套基类的 accessor 书写方式不同：

- `response.Result` 使用 Lombok `@Data`，当前源文件只显式写出返回 `Result` 的 `setCode` / `setMessage`（`response/Result.java:3,10,28-35`）；其他 accessor 不在源文件中展开，由编译期 Lombok 生成。
- `result.Result` 同样标注 `@Data`，同时显式写出 `getCode`、`getMessage`、`getTips`、`isSuccess`、`getDataType` 及对应 setter（`result/Result.java:3,10,28-68`）。因此“字段相同”不等于“源码中的 getter/setter 表达完全相同”。
- 两套 `Result` 的工厂方法都存在 `buildSuccess()`、`buildSuccess(String message)`、`buildSuccess(String code, String message)` 及失败重载。源码显示不同重载对 `code` 的赋值并不一致；例如无参成功方法设置 `"DM-A0001"`，只传 `message` 的重载不显式设置 `code`（`response/Result.java:36-67`；`result/Result.java:70-102`）。

### 3. `SingleResult`、`MultiResult`、`PageResult` 两套实现差异

| 类型 | `com.yss.cloud.dto.response` | `com.yss.cloud.dto.result` |
|---|---|---|
| `SingleResult<T>` | `T` 无 `Serializable` 上界；继承本包 `Result`；字段 `T data`；显式 `getData(): T` / `setData(T)` | `T extends Serializable`；其余继承关系、字段和显式 getter/setter 相同 |
| `MultiResult<T>` | `T` 无上界；字段声明为 `Collection<T> data`，但 `getData()` 返回 `List<T>`；`data == null` 时返回空列表，非 `List` 时复制为 `ArrayList` | `T extends Serializable`；字段、`List<T>` getter 的转换逻辑相同 |
| `PageResult<T>` | `T` 无上界；字段为 `long totalCount`、`int pageSize`、`int pageIndex`、`Collection<T> data`；`getData()` 返回 `List<T>`；有 `getTotalPages(): int` | `T extends Serializable`；字段、getter、分页归一化和 `getTotalPages()` 逻辑相同 |

具体源码：

- `response.SingleResult`: `.../response/SingleResult.java:6-21,57-71`；`result.SingleResult`: `.../result/SingleResult.java:7-21,58-72`。
- `response.MultiResult`: `.../response/MultiResult.java:10-31,67-81`；`result.MultiResult`: `.../result/MultiResult.java:11-33,68-82`。
- `response.PageResult`: `.../response/PageResult.java:11-74,108-129`；`result.PageResult`: `.../result/PageResult.java:12-75,109-130`。

进一步可确认：

- `response` 三个泛型结果的 `of(...)` 方法也不约束 `T`；`result` 三个泛型结果的 `of(...)` 方法均要求 `T extends Serializable`。这是编译期约束差异，不是仅包名差异。
- `MultiResult` 和 `PageResult` 的 backing field 是 `Collection<T>`，但源码层面对外 getter 是 `List<T>`；空数据通过 getter 变成 `Collections.emptyList()`（`response/MultiResult.java:16-27`、`response/PageResult.java:26-61`，`result` 对应文件同段落）。
- `PageResult` 的 `getPageSize()` 与 `getPageIndex()` 返回至少为 `1` 的值，setter 也会归一化；`getTotalPages()` 使用 `totalCount` 与 `pageSize` 计算页数并返回 `int`（`response/PageResult.java:30-74`；`result/PageResult.java:31-75`）。
- `getTotalPages()` 是公开的计算 getter，是否被目标 `ObjectMapper` 识别为 wire property，尚未由本研究断言，见“尚未确认项”。

### 4. `CommandDTO`、`QueryDTO`、`PageQuery` 的请求侧形状

- `CommandDTO` 是 `abstract class`，只实现 `Serializable`，没有实例字段或 getter（`.../dto/CommandDTO.java:1-8`）。
- `QueryDTO` 只继承 `CommandDTO`，没有新增实例字段或 getter（`.../dto/QueryDTO.java:1-6`）。
- `PageQuery` 继承 `QueryDTO`，所以它的序列化/反序列化形状由自身字段和具体子类字段组成（`.../dto/page/PageQuery.java:1-8`）。
- `PageQuery` 当前声明的实例字段为：`pageSize`（默认 `10`）、`pageIndex`（默认 `1`）、`orderBy`、`orderDirection`（默认 `DESC`）、`groupBy`、`needTotalCount`（默认 `true`）和 `tempTotalCount`（默认 `0`）（`.../page/PageQuery.java:14-55`）。
- `needTotalCount` 与 `tempTotalCount` 两个字段分别带 `@JsonIgnore`（`.../page/PageQuery.java:42-55`）；源码没有在 `isNeedTotalCount()` 或 `getTempTotalCount()` 方法上再次写 `@JsonIgnore`，两个公开 getter 仍然存在（`.../page/PageQuery.java:105-127`）。
- 可见 getter 包括：`getPageIndex()`、`getPageSize()`、`getOffset()`、`getOrderBy()`、`getOrderDirection()`、`getTempTotalCount()`、`getGroupBy()`、`isNeedTotalCount()`（`.../page/PageQuery.java:57-127`）。
- `getOffset()` 是无对应 setter 的计算 getter，计算式为 `(getPageIndex() - 1) * getPageSize()`（`.../page/PageQuery.java:81-83`）。`getPageSize()` 在发现小于 `1` 时还会把字段改回默认值 `10`；`setPageSize()` 也会做同样的归一化（`.../page/PageQuery.java:66-79`）。
- `setPageIndex()` 直接保存传入值，而 `getPageIndex()` 只在返回时使用 `Math.max(pageIndex, 1)`；因此字段原值、getter 返回值和 `toString()` 展示值可能不同（`.../page/PageQuery.java:57-64,129-132`）。

### 5. 当前中台实际 import 与使用举例

统计口径为当前中台工作树 `yss-microservice-components` 下的 `*.java`，排除 `target`，按 import 行统计：

| import | 当前 import 行数 | 覆盖 Java 文件数 | 主源码 / 测试源码 |
|---|---:|---:|---:|
| `com.yss.cloud.dto.result.SingleResult` | 21 | 含在总数内 | 18 / 3 |
| `com.yss.cloud.dto.result.PageResult` | 15 | 含在总数内 | 15 / 0 |
| `com.yss.cloud.dto.result.MultiResult` | 7 | 含在总数内 | 7 / 0 |
| `com.yss.cloud.dto.result.Result` | 2 | 含在总数内 | 2 / 0 |
| `com.yss.cloud.dto.result.*` 合计 | **45** | **28** | **42 / 3** |
| `com.yss.cloud.dto.response.*` | **0** | **0** | **0 / 0** |

请求基类 import 合计为 47 行：`CommandDTO` 25 行、`QueryDTO` 4 行、`PageQuery` 18 行；全部出现在主源码中。当前 `response` 包的四个类只在其自身 package declaration 中出现，没有在组件 Java 源码中发现直接 import。

当前代码例子：

- 字典控制器直接 import `result.MultiResult`、`result.PageResult`、`result.SingleResult`，并分别返回分页、列表和单对象包装（`.../dic/controller/DicQueryController.java:20-22,65-88`）。
- Taskflow 控制器直接 import `result.PageResult`、`result.Result`、`result.SingleResult`，分页和单对象方法的返回类型也使用这套包（`.../taskflow/task/api/TaskflowDefinitionController.java:16-18,43-65`）。
- Tag Feign 接口同时使用 `result.MultiResult`、`result.PageResult`、`result.SingleResult`（`.../tag/feign/TagClient.java:3-5,35-53`）。
- Taskflow 的 `TaskflowDefinitionPage` 继承 `com.yss.cloud.dto.page.PageQuery` 并增加 `name` 字段（`.../taskflow/domain/dto/query/TaskflowDefinitionPage.java:3-14`）；其 service 将查询结果通过 `result.PageResult.of(...)` 包装（`.../taskflow/core/service/impl/ProcessDefinitionServiceImpl.java:54-62`）。

### 6. 当前可见的 Jackson 相关事实

- `yss-component-dto/pom.xml` 直接声明的是 `jackson-annotations`，且为 `provided`（`.../yss-component-dto/pom.xml:15-20`）；该模块本身没有在此 POM 中声明完整 `jackson-databind` 运行配置。
- 当前中台若干模块各自创建 `JsonMapper`，并启用 `MapperFeature.REQUIRE_SETTERS_FOR_GETTERS`，同时通过 `valueToTree` / `writeValueAsString` 使用该 mapper。例如 mapper-dynamic 的 `JSONUtils` 位于 `.../mapper-dynamic/.../JSONUtils.java:24-51,69-85`；sql-tpl 的同类配置位于 `.../sql-tpl/.../JSONUtils.java:25-53,71-85`；taskflow 的同类配置位于 `.../taskflow-domain/.../JSONUtils.java:20-81,100-114`。
- 因此当前源码能证明“存在使用特定 getter 配置的局部 JSON 工具”，但不能仅凭 DTO 源码证明所有 HTTP 响应、Feign 编解码和 OpenAPI 生成链路使用同一个 `ObjectMapper`。

## 从事实推导的风险

1. **双包同名类型会造成契约绑定歧义。** 当前源代码中 `response` 和 `result` 都有四个同名类，但实际组件 import 只落在 `result` 包。若 OpenAPI schema、生成器输入或人工映射只写 `Result` / `PageResult` 而不保留包归属，可能把当前实际使用的 `result` 形状误映射到 `response` 形状。

2. **泛型约束会产生编译边界漂移。** 模板 `yss-dto` 规则写的是三种结果均需 `T extends Serializable`，而当前 `response.SingleResult`、`response.MultiResult`、`response.PageResult` 的 `T` 没有上界；当前中台实际 import 使用的 `result` 版本才具有该上界。相同的 OpenAPI `data` schema 可能在两套 Java 消费端得到不同的编译约束。

3. **声明字段与 JavaBean getter 不是同一组 wire 事实。** `MultiResult` / `PageResult` 的 `data` 字段声明为 `Collection<T>`，getter 却返回 `List<T>` 并将 null 转成空列表；`PageResult.getTotalPages()` 与 `PageQuery.getOffset()` 又是公开计算 getter。仅从字段列表生成契约，可能遗漏或错误纳入 getter 派生属性。

4. **分页请求存在归一化和计算副作用。** `PageQuery` 的 `getPageSize()` 可能改写字段，`getPageIndex()` 的返回值会被夹到至少 `1`，`getOffset()` 使用归一化后的 getter 计算；`PageResult` 也对 page size/index 做归一化。若请求/响应契约只记录原始字段，不记录 getter 语义，边界输入的实际行为可能与 schema 直觉不一致。

5. **`@JsonIgnore` 的字段位置与公开 getter 需要实际 mapper 证据。** `needTotalCount` / `tempTotalCount` 的 `@JsonIgnore` 写在字段上，但对应的 `isNeedTotalCount()` / `getTempTotalCount()` 仍是公开方法；同时中台存在多个局部 `ObjectMapper` 配置。不能把“字段有注解”直接等同于“所有目标 wire JSON 都不会出现同名属性”。

6. **计算 getter 的 wire 可见性不能由源码单独定论。** `PageResult.totalPages`、`PageQuery.offset` 等属性是否被使用中的 `ObjectMapper` 序列化，必须由具体 mapper 和契约测试确认；尤其本地 JSON 工具启用了 `REQUIRE_SETTERS_FOR_GETTERS`，不同 HTTP/Feign/工具 mapper 仍可能有差异。

7. **`code` 的 wire 类型存在来源差异。** 基类把 `code` 声明为 `Object`；无参成功工厂写入字符串 `"DM-A0001"`，部分 `of(data, Integer code)` 写入整数，且只传 message 的成功工厂不显式写 code。若契约只按单一 primitive 类型记录，可能与不同调用路径的实际值不一致。

8. **Lombok 生成 accessor 增加了源码到 bytecode 的间接层。** `response.Result` 的非显式 getter 不在源码中；`result.Result` 则显式声明了主要 getter。仅做文本级 OpenAPI 推导无法证明最终编译产物的 accessor 可见性和目标 Lombok 配置，需结合编译产物或序列化测试。

## 尚未确认项

- `PageResult.getTotalPages()` 是否出现在目标 HTTP/Feign JSON：**需 ObjectMapper/契约测试确认**。
- `PageQuery.getOffset()` 是否出现在目标请求 JSON 或被当作仅服务端派生值：**需 ObjectMapper/契约测试确认**。
- `PageQuery.getTempTotalCount()`、`PageQuery.isNeedTotalCount()` 与字段级 `@JsonIgnore` 在目标 HTTP mapper、Feign mapper 及局部 `JSONUtils` 下的最终序列化/反序列化行为：**需 ObjectMapper/契约测试确认**。
- `MultiResult` / `PageResult` 的 `data == null` 是否在实际 wire JSON 中表现为空数组、null 或被省略：**需目标 mapper 与契约测试确认**。
- `code` 在不同 factory 路径中的实际 JSON 类型、默认值和 null 包含策略：**需按调用路径执行序列化契约测试**。
- 当前中台各 HTTP 服务、Feign 编解码器和 OpenAPI 生成链路是否共享同一 `ObjectMapper`、相同 Jackson 版本和相同 visibility/features：本次本地源码检索未得到一个统一配置事实。
- 当前没有对 `yss-component-dto` 的 Java wire-shape 测试、运行时 `ObjectMapper` 输出或冻结 OpenAPI YAML/JSON 做执行验证；本报告不据此宣布任何契约已稳定、已批准或已冻结。

## 来源路径与行号

### 模板仓库

- `/Users/zhudaoming/Projects/yss-spec-project-template/yss-project.yaml:1-2`
- `/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/research/SKILL.md:1-13`
- `/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-openapi-governance/SKILL.md:8-15,33-50,59-78`
- `/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-openapi-draft-review/SKILL.md:10-24,27-43`
- `/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-dto/SKILL.md:17-22,32-58`
- `/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-dto/references/source-index.md:3-10,30-45`

### 中台当前源码

- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/Result.java:1-74`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/SingleResult.java:1-72`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/MultiResult.java:1-82`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/response/PageResult.java:1-130`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/Result.java:1-108`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/SingleResult.java:1-73`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/MultiResult.java:1-83`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/result/PageResult.java:1-131`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/CommandDTO.java:1-8`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/QueryDTO.java:1-6`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/page/PageQuery.java:1-133`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dto/pom.xml:15-20`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-mapper-dynamic/src/main/java/com/yss/datamiddle/mybatis/util/JSONUtils.java:24-51,69-85`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-sql-tpl-parent/core/src/main/java/com/yss/cloud/sql/tpl/util/JSONUtils.java:25-53,71-85`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-taskflow/yss-component-taskflow-domain/src/main/java/com/yss/cloud/taskflow/domain/utils/JSONUtils.java:20-81,100-114`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-dictionary-parent/yss-component-dictionary/src/main/java/com/yss/cloud/dic/controller/DicQueryController.java:20-22,65-88`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-tag-parent/yss-component-tag-feign/src/main/java/com/yss/cloud/tag/feign/TagClient.java:3-5,35-53`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-taskflow/adapter/yss-component-taskflow-web/src/main/java/com/yss/cloud/taskflow/task/api/TaskflowDefinitionController.java:16-18,43-65`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-taskflow/yss-component-taskflow-domain/src/main/java/com/yss/cloud/taskflow/domain/dto/query/TaskflowDefinitionPage.java:3-14`
- `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice/yss-microservice-components/yss-component-taskflow/yss-component-taskflow-core/src/main/java/com/yss/cloud/taskflow/core/service/impl/ProcessDefinitionServiceImpl.java:54-62`
