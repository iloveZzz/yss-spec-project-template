---
name: yss-dto
description: "实现或核验 YSS Result、PageResult、PageQuery、CommandDTO、QueryDTO 及 wire 边界。"
---

# yss-dto

执行路线消费当前 Profile 主控合同的 `request_triage.delivery_path` 与固定 CLI 的 `route` / `verify-daily` 结果。仅已启用且合格的 Spec、Backend、Frontend `daily` 使用同一 Ticket 的范围、验收、工程基线、实际测试与独立审查；本端写范围不扩大。缺政策或能力时保持正式路径，已有正式任务不得降级；本技能不授予执行授权。

用于处理 `yss-component-dto` 的使用规范和代码接入。

本 skill 同时负责把中台 DTO 映射到公开 HTTP/JSON 边界。`references/openapi-wire-profile.yaml` 是可复用的机器可读映射源；OpenAPI 治理和 Draft Review 必须消费它，不得各自复制一份 wrapper 或分页字段表。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-dto` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

## 所有权边界

- 对象命名及阿里/COLA 适配消费 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”；外部 DTO/VO 示例不改变当前 wire profile 的包装、默认值、字段或模块归属。
- 先消费 `architecture_identity`：DDD 的 HTTP DTO 在 Web；通用 MVC 私有 DTO 在 server、已批准公开 DTO 在 client；数据分析 MVC 公开 DTO 在 client。service/core 自有内部 Command/Query/Result，不依赖 client DTO；server 用 MapStruct 转换。共用 wire profile 不意味着共用模块路径。
- `Result` / `SingleResult` / `MultiResult` / `PageResult`、`CommandDTO` / `QueryDTO` / `PageQuery` 的 canonical package、工厂方法、字段语义、默认值、枚举和禁用字段由本 skill 及 `references/openapi-wire-profile.yaml` 唯一持有。
- Web skill 只生成 endpoint-specific Page Request、Request/Response 与 Convertor，并通过 `governed` 批准合同或合格 `daily` 同 Ticket 中的 profile 引用和 digest 消费上述协议；不得生成 wrapper/page base，也不得维护分页字段或默认值副本。
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
4. 需要设计或审查 API 时，先辨认已批准协议；采用 YSS wrapper 的普通 HTTP/JSON 接口校验 `references/openapi-wire-profile.yaml`，再把 endpoint 的具体 DTO/VO schema 组合到 wrapper。下载、流式和第三方回调按批准协议检查；Java 泛型不是 OpenAPI schema。
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
<a id="dto.page-input"></a>
<!-- yss-rule {"id":"dto.page-input","when":"pagination","level":"mandatory","evidence":"code-and-verification"} -->
- 公开 HTTP Page Request 默认不继承 `PageQuery`，只复制冻结 OpenAPI 允许的分页字段，再由 WebConvertor 转为 Application Query；避免继承的 `offset`、`needTotalCount`、`tempTotalCount` 进入绑定面。
- Controller 返回优先使用项目既有的 `Result` 或派生结果对象。
- 单对象返回优先 `SingleResult`，列表返回优先 `MultiResult`，分页返回优先 `PageResult`，前提是当前项目已采用这套体系。
- 三种泛型结果要求 `T extends Serializable`；生成的 VO/响应类型必须满足该编译约束。
- 采用 YSS wrapper 的普通 HTTP/JSON 响应以 `YssResultMeta` 表达公共字段，并用 `allOf` 叠加 endpoint-specific `data` / page 字段；这些响应声明 `x-yss-response-wrapper: SingleResult|MultiResult|PageResult`，不得把 `SingleResult<T>` 文字写成 schema。
- YSS wrapper 的 wire shape 不是 Java 字段清单：`success` 为 boolean，`dataType` 为 `string|null`，`code` 只允许 `string|integer|null`；不得把该 profile 的全局 `code` 放宽为任意 object。
- `MultiResult.data` 和 `PageResult.data` 对外是数组，空值按 `[]` 建模；`SingleResult.data` 按 endpoint schema 建模并显式处理 nullability。
- `PageResult` 当前稳定公共字段为 `totalCount/pageSize/pageIndex/data[]`；`totalPages` 是计算 getter，只有目标 HTTP mapper / contract fixture 证明后才能进入具体契约。
- 采用 YSS 分页协议的 `PageQuery` 客户端输入只允许 `pageIndex/pageSize/orderBy/orderDirection/groupBy`（后四项按 profile 的 optional / whitelist 规则）；`orderDirection` 只能是 `ASC|DESC`。`offset`、`needTotalCount`、`tempTotalCount` 是计算或内部协作字段，禁止从内部 `PageQuery` 泄露为客户端输入。其他已批准公开分页协议按冻结字段映射，不静默改名或套用该字段表。
- `buildSuccess(...)` 各重载设置 code 的行为并不一致；冻结契约必须测试 `success/code/message/tips/dataType`、nullability 和三种 data shape，不能只测试 data。
<a id="dto.wire-evidence"></a>
<!-- yss-rule {"id":"dto.wire-evidence","when":"wire","level":"mandatory","evidence":"code-and-verification"} -->
- Java getter、Lombok、`@JsonIgnore` 或默认 Jackson 结果都不是目标 HTTP wire fact；冻结前必须记录 mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP 证据。
<a id="dto.boundary"></a>
<!-- yss-rule {"id":"dto.boundary","when":"wire","level":"mandatory","evidence":"code-and-verification"} -->
- DTO 只表达接口契约，不承载 Repository PO 或领域对象的持久化细节。

## 检查清单

仅在 DTO/OpenAPI wire shape 受影响时读取 [wire 验收清单](references/wire-validation-checklist.md)，按当前平台和请求/响应方向执行；权威字段形状继续由 `references/openapi-wire-profile.yaml` 持有。

## 修改约束

- 不要在一个项目里混用多套返回包装类。
- 不要新建与 `PageQuery` 含义重叠的分页基类。
- 不要把 `com.yss.cloud.dto.response` 作为新 API 的 canonical 包，也不要从 Java getter 机械生成 wire schema。
<a id="dto.no-leak"></a>
<!-- yss-rule {"id":"dto.no-leak","when":"pagination","level":"mandatory","evidence":"code-and-verification"} -->
- 采用 YSS 分页协议时，不要把内部 `offset`、`needTotalCount`、`tempTotalCount` 作为客户端输入；其他批准协议按冻结契约核验公开字段。不要无证据把 `totalPages` 写入所有分页响应。
- 若项目已有 `SingleResult`、`PageResult`、`MultiResult` 体系，优先保持一致。

## 按需读取

- 源码索引：`references/source-index.md`
- DTO 基类示例：`assets/CommandDTO.java`、`assets/QueryDTO.java`
- 分页基类：`assets/PageQuery.java`
- 返回结构：`assets/Result.java`
- HTTP/JSON 映射：`references/openapi-wire-profile.yaml`

## 阶段 7 合同

- `governed` DTO/VO 消费冻结 OpenAPI/no-impact record 和批准合同，写入合同允许路径；合格 `daily` 消费同 Ticket 的当前 API Freeze/no-impact、验收、既有工程基线和实际 `scope.paths`，不强制 Slice。
- POJO 样板可 `controlled-generation`；校验、权限输入、错误结构和序列化行为必须由对应 `behavior-tdd` 工作单元覆盖。
- 两条路线均加载实际适用的 `lombok`、`mapstruct` 和 `alibaba-java-code-style`；`governed` 保留合同要求的技能与正式 `YSS Skill Execution Result`，`daily` 在同 Ticket 返回文件、wire/序列化约束、真实契约测试/命令/退出码及偏离，接受独立审查。涉及 YSS wrapper 且目标 wire 能力未移植时保持 `UNPORTED`，不得凭普通路径声明已核验。

## 既有契约与特殊协议

只读审计先辨认已锁定的 wire 契约。下载、流式和第三方回调按批准协议检查媒体类型、状态、Header、错误与权限边界；不强套 Result，也不因声称“特殊接口”豁免契约证据。普通已采用 YSS wrapper 的接口继续按 wire profile 检查。旧包/旧协议差距单列迁移，不静默改锁或改公开响应。
