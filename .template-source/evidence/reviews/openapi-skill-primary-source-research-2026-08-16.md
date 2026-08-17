# smart-doc → OpenAPI JSON → Orval 一手资料核验

> 访问时间：2026-08-16（Asia/Shanghai）。
>
> 研究范围：仅核验 smart-doc 官方文档 / 官方仓库、Orval 官方文档 / 官方仓库、OpenAPI 官方规范，以及 `OpenAPITools/openapi-diff` 的官方仓库。本文不验证内部或定制版本 `yss-4.0.0` 的专有实现；该版本的 Maven goal、参数和输出行为均不能从公开一手资料确认。

> 后续决策：用户随后要求移除仓库内的 `yss-openapi` 和该 Maven 驱动链路。本笔记保留为迁移前的一手资料证据；当前 YAML-first 决策和验证见 `.template-source/evidence/reviews/openapi-yaml-first-red-green-2026-08-16.md`。

## 结论先行

- 上游 smart-doc 的标准 Maven 调用是 `smart-doc:openapi`；`configFile` 指向配置，`outPath` 决定输出目录，公开源码把 JSON 写到 `outPath + "/openapi.json"`。因此，`target/openapi/openapi.json` 可以是 YSS 脚手架约定，但不能被泛化为所有仓库的上游默认值。
- `componentType` 对前端代码生成有实质影响：公开文档将 `NORMAL` 标为“用于 OpenAPI 生成代码”，同时标明它不支持 `@Validated` 分组校验；不能只为稳定客户端类型而无条件设置它。
- Orval 接受有效的 OpenAPI YAML/JSON；由 `orval.config.*` 的 `input` 和 `output` 决定消费源与生成目录。默认会校验规范，`unsafeDisableValidation` 是明确的逃生阀，治理流水线不应启用。
- `operationId` 在 OAS 中可以省略，但一旦提供必须全局唯一；YSS 因前端生成需要而把它提升为必填是合理的组织级规则，而不是 OAS 自带的“必填”规则。
- 公开 smart-doc 3.1.0 源码以 Java 方法名生成 `operationId`，重名再追加序号；当前 Orval 源码默认用 `operationId` 派生生成操作名。后端方法重命名即使不改路径，也可能改变前端函数 / 类型名，必须纳入 Freeze 后差异检查。
- 结构合法、代码生成、兼容性差异、产品语义是四类不同检查：Orval 校验不能代替治理 / Draft Review；`openapi-diff` 可作 OAS 3.0 的兼容性门禁，但公开 README 未承诺 OAS 3.1 支持。公开 smart-doc 3.1.0 源码实际写出 `openapi: 3.1.0`，故二者不能默认组合。

## 可追溯事实与可操作建议

| 主题 | 一手资料事实 | 对三个技能的优化建议 |
| --- | --- | --- |
| Maven 生成入口与输出定位 | smart-doc 官方 Maven 指南给出 `mvn -Dfile.encoding=UTF-8 smart-doc:openapi`；公开插件源码以 `openapi` Mojo 调用 `OpenApiBuilder`。公开插件会将相对 `outPath` 解析为当前 Maven project basedir 下的路径；公开 core 3.1.0 将 JSON 写到 `outPath + "/openapi.json"`，且写入 `openapi: "3.1.0"`。 [Maven 指南](https://smart-doc-group.github.io/guide/plugins/maven) · [OpenApiMojo 3.1.2](https://github.com/TongchengOpenSource/smart-doc-maven-plugin/blob/3.1.2/src/main/java/com/ly/doc/plugin/mojo/OpenApiMojo.java#L39-L46) · [输出路径解析 3.1.2](https://github.com/TongchengOpenSource/smart-doc-maven-plugin/blob/3.1.2/src/main/java/com/ly/doc/plugin/mojo/BaseDocsGeneratorMojo.java#L148-L163) · [生成 JSON 3.1.0](https://github.com/TongchengOpenSource/smart-doc/blob/3.1.0/src/main/java/com/ly/doc/builder/openapi/OpenApiBuilder.java#L90-L104) | `yss-openapi` 应先从选定模块的 POM 和 `smart-doc.json` 解析实际插件坐标、goal、`configFile`、`outPath`，再定位输出；将 `target/openapi/openapi.json` 表述为“已声明的脚手架基线”，不是无条件假设。上游的 `smart-doc:openapi` 仅能作为公开版本的回退参考，并须读取生成 JSON 的 `openapi` 字段选择后续校验 / diff 工具。 |
| 生成成功不能只看旧文件存在 | 公开插件 3.1.2 在 `configFile` 存在但路径找不到时只记录 warning 并直接返回；它不会因此抛出 Maven 异常。若上次输出仍在，`test -s openapi.json` 可以误把陈旧合同当成本次生成结果。[BaseDocsGeneratorMojo 3.1.2](https://github.com/TongchengOpenSource/smart-doc-maven-plugin/blob/3.1.2/src/main/java/com/ly/doc/plugin/mojo/BaseDocsGeneratorMojo.java#L117-L163) | `yss-openapi` 的验证应同时记录本次启动前 / 后的文件 hash 或在隔离 staging 输出目录生成，再执行 JSON 解析；不得只检查目标文件非空。该行为只在公开 3.1.2 中证实，内部 `yss-4.0.0` 仍须 fresh 验证。 |
| 定制版本不确定性 | 公开 smart-doc 文档列出的是公开插件 / 配置契约，未包含 `yss-4.0.0`。公开资料不能证明该内部版本仍使用同一 goal、字段或输出布局。[官方 Maven 指南](https://smart-doc-group.github.io/guide/plugins/maven) | 三个技能都不应把 `yss-4.0.0` 的行为写成已验证事实。实现时要求 POM 插件声明和一次 fresh 生成证据；若需强制该版本，应补内部制品文档或集成测试。 |
| 组件名与校验组的取舍 | smart-doc 配置文档说明：`componentType` 默认 `RANDOM`；`NORMAL`“用于 OpenAPI 生成代码”，但“不支持 `@Validated` 分组校验”。[官方配置项（`componentType`）](https://smart-doc-group.github.io/zh/guide/advanced/config) | `yss-openapi` 应把 `componentType: NORMAL` 写成有条件的代码生成选择，并要求检查受影响 Controller 是否依赖分组校验；`yss-openapi-governance` 应比较冻结合同与生成后 `components.schemas` 的名称稳定性；`yss-openapi-draft-review` 保持对字段 / 分组校验语义的人工核对。 |
| 统一响应包装的生成侧证据 | smart-doc 提供 `responseBodyAdvice.className`，用于配置统一响应体处理；文档同时列出 `showValidation` 可提取 JSR 字段校验信息。[官方配置项（`responseBodyAdvice`）](https://smart-doc-group.github.io/zh/guide/advanced/config) | `yss-openapi` 的生成证据应记录该配置及实际 JSON 中的响应 schema；不得仅凭 Java 返回类型推断 `SingleResult<T>` / `MultiResult<T>` / `PageResult<T>` 是否真实写入合同。治理与 Draft Review 继续负责 YSS 包装、错误和权限语义。 |
| Orval 的输入 / 输出契约 | Orval 可从有效 OpenAPI v3 或 Swagger v2 的 YAML / JSON 生成 TypeScript 客户端；`input` 是规范路径或配置，`output.target` 与 `output.schemas` 控制生成位置。CLI 支持 `--config`、`--input` 和 `--output`。[Orval README](https://github.com/orval-labs/orval) · [Quick Start](https://orval.dev/docs/quick-start/) · [配置总览](https://orval.dev/docs/reference/configuration/) · [输出配置](https://orval.dev/docs/reference/configuration/output/) | `yss-openapi` 应以实际 `orval.config.*` 为唯一前端输入 / 输出事实来源。若前后端同一工作区，可直接把 `input.target` 指到后端生成 JSON；若跨仓库，应显式发布或复制一份带 hash 的合同资产，而不是手工编辑生成文件。 |
| YAML 到 JSON 的受控派生 | Redocly CLI 的 `bundle` 会解析 `$ref` 并输出单一 OpenAPI 文件；可通过 `--output` 与 `--ext json` 生成 JSON，组件重名冲突可配置为 error。默认 bundle 保留可表示的 `$ref`，而非强制 dereference。[Redocly CLI bundle](https://redocly.com/docs/cli/commands/bundle) | 冻结 YAML 保持唯一权威，项目以 lockfile 固定 Redocly CLI 后运行 `redocly bundle ... --ext json --component-renaming-conflicts-severity=error`；记录输入 / 输出 SHA-256、工具版本和 `$ref` 例外，之后才交给 Orval。 |
| `operationId` 与 Orval 生成名称 | 当前 Orval 源码：若规范提供字符串 `operationId`，`getOperationId` 原样使用；否则从 HTTP verb 和 route 派生。随后，若没有 `override.operationName`，默认生成名称为 `sanitize(camel(operationId))`。公开 smart-doc 3.1.0 则以 Java 方法名写入 `operationId`，同名时追加 `_1`、`_2` 等序号。[Orval `getOperationId`](https://github.com/orval-labs/orval/blob/master/packages/core/src/getters/operation.ts#L4-L25) · [Orval 默认操作名](https://github.com/orval-labs/orval/blob/master/packages/core/src/generators/verbs-options.ts#L303-L335) · [smart-doc operationId 3.1.0](https://github.com/TongchengOpenSource/smart-doc/blob/3.1.0/src/main/java/com/ly/doc/builder/openapi/OpenApiBuilder.java#L156-L166) | `yss-openapi-governance` 应把“唯一、稳定、显式的 `operationId`”列为产生客户端的阻断规则；`yss-openapi` 在 Orval 后检查已生成操作名的 diff，防止 Controller 方法重命名或新增重名方法无意中改掉前端 API。上述 Orval 行为来自当前 `main`，因此应将 Orval 版本锁定并用项目版本复核。 |
| Orval 的规范校验与外部 `$ref` 边界 | `unsafeDisableValidation` 默认 `false`；启用后会跳过规范级校验和组件 key 检查。转换器在校验前执行。外部 `$ref` 默认不解析，`allow: ['*']` 会允许读取任意本地文件或请求任意 URL，官方建议只列可信目标。[Orval 输入配置](https://orval.dev/docs/reference/configuration/input/) | `yss-openapi` 应禁止常规 CI 使用 `unsafeDisableValidation`，优先以可审查 transformer 修复已知规范问题；治理技能应把外部 `$ref` allowlist 作为安全规则，而不是默认放开。 |
| OpenAPI 的机器可检验最低线 | OAS 3.0.4 规定路径模板必须有对应 path 参数；每个操作的 Responses Object 至少有一个响应，文档预期包含成功响应和已知错误；`operationId` 若存在必须在 API 内唯一。OAS 同时说明 JSON Schema 只是信息性实现，规范正文才是权威。[OAS 3.0.4：路径模板](https://spec.openapis.org/oas/v3.0.4.html#pathTemplating) · [响应](https://spec.openapis.org/oas/v3.0.4.html#responses-object) · [操作](https://spec.openapis.org/oas/v3.0.4.html#operation-object) · [规范与 schema 边界](https://spec.openapis.org/oas/v3.0.4.html#schema) | `yss-openapi-governance` 应把路径参数、唯一且稳定的 `operationId`、成功 / 已知错误响应作为可自动化规则；其中“每个操作必须有 `operationId`”是 YSS 为客户端生成增加的规则，应明确标注为组织政策。`yss-openapi-draft-review` 不应把 P0、权限、幂等、并发和无数据泄漏等语义降级为纯 JSON Schema 校验。 |
| Orval 生成警告与输出目录风险 | Orval CLI 的 `--fail-on-warnings` 可使警告返回非零，适合 CI。`output.clean` 会清空 `target` 和 `schemas` 下的所有文件，而非仅 Orval 生成文件；官方要求手写代码置于专用生成目录之外。[Orval CLI](https://orval.dev/docs/reference/cli/) · [Orval `clean` 配置](https://orval.dev/docs/reference/configuration/output/#clean) | `yss-openapi` 应建议 `pnpm` 脚本把 `--fail-on-warnings` 纳入 CI，并要求 `target` / `schemas` 为专用生成目录；不要让清理逻辑覆盖 mutator、transformer、应用代码或包入口。 |
| 兼容性差异门禁 | `OpenAPITools/openapi-diff` 的官方 README 支持比较两个 OpenAPI 3.x 文档、输出 JSON / Markdown 等，并提供 `--fail-on-incompatible`；但功能声明仅明确写了 OpenAPI 3.0 支持，Maven 示例也允许用生成后的规范作为 `newSpec`。而公开 smart-doc core 3.1.0 写入的是 `openapi: 3.1.0`。[官方 README](https://github.com/OpenAPITools/openapi-diff) · [smart-doc 3.1.0 输出版本](https://github.com/TongchengOpenSource/smart-doc/blob/3.1.0/src/main/java/com/ly/doc/builder/openapi/OpenApiBuilder.java#L90-L104) | 在生成后增加“冻结 / 基线 JSON → 新生成 JSON”的差异门禁是可行的；但只应在生成 JSON 的 `openapi` 字段确认是 3.0.x、并对锁定版本做样例验证后采用此工具。对于 3.1.x（公开 smart-doc 3.1.0 就是此情形），必须另选有明确支持声明的工具或先做兼容性试验，不能从该 README 推断支持。 |

## 建议的质量门禁顺序（由上述事实推导）

```text
设计 Draft
  → Draft Review（P0、权限、错误、并发、安全语义）
  → Governance（OAS 结构 + YSS 组织规则）
  → Freeze
  → Maven/smart-doc 生成 openapi.json
  → 生成后 OAS 校验 + 冻结合同差异检查
  → Orval（保留校验，fail on warnings）
  → TypeScript 类型检查 / 仅提交可解释的生成差异
```

这不是把设计 Draft 直接交给 Orval：smart-doc 的生成结果是已实现 Controller / DTO 的证据，需与已冻结的设计合同做生成后比对。OpenAPI 本身能描述 HTTP 合同，但不能自动判定 P0 覆盖、YSS 包装正确性、权限泄漏、业务幂等或乐观锁语义；这些仍属于 `yss-openapi-draft-review` 和 `yss-openapi-governance` 的边界。

## 面向技能维护的最小改动建议

1. **`yss-openapi`**：将“固定 `yss-4.0.0`、固定目标文件”改为“读取 POM + smart-doc 配置 + Orval 配置”，保留上游 `smart-doc:openapi` 作为公开实现的参考而非对内部版本的断言；增加 `componentType` / `responseBodyAdvice` / `openapi` 版本的生成证据。
2. **`yss-openapi-governance`**：补充生成后 conformance 阶段；强制唯一、稳定的 `operationId`、路径参数、成功 / 已知错误响应，禁止常规使用 `unsafeDisableValidation`，并把 `$ref` allowlist 列为安全检查项。
3. **`yss-openapi-draft-review`**：维持 fail-closed 的语义审查，不与结构 lint 重复；增加“若实现侧采用 `componentType: NORMAL`，是否依赖 `@Validated` 分组”的交接检查项。
4. **跨技能**：将“生成 JSON 的 `sha256`、POM 中插件坐标 / goal、smart-doc config 路径、`componentType`、`responseBodyAdvice`、OAS 版本、Orval 版本 / 配置、差异报告路径”作为同一份可审计生成证据。这是基于上述工具边界得出的流程建议，不是任一上游工具自动提供的功能承诺。

## 未确认项与使用限制

- `yss-4.0.0` 是否为私有 fork、其确切 Maven 坐标、goal、Smart-doc 核心版本、`componentType`、`responseBodyAdvice`、缺失配置时的退出行为以及 `operationId` 规则：**公开一手资料不可验证**。实施前只能以目标工程的 POM、配置文件、已锁定依赖和 fresh 生成结果确认。
- Orval 官方网页反映当前文档能力；`--fail-on-warnings`、外部 `$ref` 策略等必须与项目锁定的 Orval 版本核对，不能把当前网页能力反推给旧版依赖。
- `openapi-diff` 官方 README 明确写的是 OpenAPI 3.0 支持，故本文不把它推荐为 OAS 3.1 的默认门禁。
- OAS 的 `operationId` 在规范层是可选字段；本笔记建议其在 YSS 中必填，仅因为前端生成、测试命名和差异追踪需要稳定标识，不应误称为 OAS 的强制字段。

## 实际读取的一手来源

- [smart-doc Maven 插件官方指南](https://smart-doc-group.github.io/guide/plugins/maven)
- [smart-doc 官方配置项（简体中文）](https://smart-doc-group.github.io/zh/guide/advanced/config)
- [smart-doc 官方 OpenAPI JSON / UI 集成说明（简体中文）](https://smart-doc-group.github.io/zh/guide/advanced/debug)
- [Orval 官方 GitHub README](https://github.com/orval-labs/orval)
- [Orval 官方 Quick Start](https://orval.dev/docs/quick-start/)
- [Orval 官方输入配置](https://orval.dev/docs/reference/configuration/input/)
- [Orval 官方输出配置](https://orval.dev/docs/reference/configuration/output/)
- [Orval 官方 CLI 参考](https://orval.dev/docs/reference/cli/)
- [Redocly CLI `bundle` 参考](https://redocly.com/docs/cli/commands/bundle)
- [OpenAPI Specification 3.0.4](https://spec.openapis.org/oas/v3.0.4.html)
- [OpenAPITools `openapi-diff` 官方仓库](https://github.com/OpenAPITools/openapi-diff)
