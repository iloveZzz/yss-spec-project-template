---
name: yss-web-controller
description: "按冻结合同与稳定 Application 接口生成或重构 YSS Controller、请求 DTO、响应 VO 和 Web Convertor。"
---

# yss-web-controller

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

## 任务分流

- 只读审计读取实际入口和现有契约，缺用例 seam、契约或批准证据时记录缺口；不要求先补 Slice、生成 Manifest 或 metadata。
- `governed` 既有整改消费批准且当前的 Slice、冻结 API/no-impact 与稳定用例 seam；合格 `daily` 消费同 Ticket 的验收/范围、已有工程基线、稳定 seam 和当前 API/no-impact 依据，缺事实先调查，不补造 Slice。
- 仅新建 CRUD 要求 Web generation contract、metadata 并调用 initialize-only 生成器。认证、回调、Cookie、下载或流式接口可手工适配，不强制 CRUD 脚本或 metadata。

## 架构分流

将 `architecture_identity` 与当前工程基线和仓库登记核对；仅生成式来源核对脚手架 Manifest，既有来源使用登记及独立工程观测。再且只读取 `references/profiles/<architecture_profile>.md`。生成式分支为 target-domain-model、layered-mvc-service、mvc-data-analysis-v1；既有分支为 existing-domain-driven-maven、existing-layered-mvc-maven。成熟度以注册表为准，不能把 draft 称为受支持。MVC 不执行下文 DDD 专属规则，也不加载其分层 guide；组件、安全、允许路径与真实执行证据规则共用；批准合同仅用于 `governed`，`daily` 从同 Ticket 和已核验工程基线取得输入。

以下 Application / Domain Gateway / Infrastructure / Web module 叙述仅适用于 target-domain-model；MVC 的 service/core/repository/server/client 所有权由所选 Profile 引用定义。

对象命名及阿里/COLA 适配消费 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”；持久化 PO/DO 与领域 Entity 均不得直接充当 HTTP 请求/响应。

## 何时使用

- 用户要批量生成 Controller。
- 用户要根据冻结 OpenAPI 字段合同、metadata 和稳定 Application 接口生成 Request / Response / Controller / WebConvertor。
- 用户要求统一 Web Adapter 风格、返回值和接口路径。

## 新建 CRUD 生成

仅新建 CRUD 在输入齐备后必须读取 [生成流程与命令](references/crud-generation.md)，核验 schema v2 Web generation contract、metadata、绑定的 wire profile 与允许路径，再运行 initialize-only 生成器并检查完整输出。复杂接口按当前路线的已确认输入补足实现（`governed` 批准合同，`daily` 同 Ticket），不以生成成功替代行为验证。

## 约束

<a id="web.use-case"></a>
<!-- yss-rule {"id":"web.use-case","when":"web","level":"mandatory","evidence":"code-and-verification"} -->
- 生成代码只依赖既有 Application Service；读写操作都禁止绕过 Application。复杂查询经 Application Query Port 接入 Infrastructure。
<a id="web.wire"></a>
<!-- yss-rule {"id":"web.wire","when":"wire","level":"mandatory","evidence":"code-and-verification"} -->
- 返回包装类、分页默认值、允许字段与 `PageResult.of(...)` 参数语义必须消费合同绑定的 `yss-dto/references/openapi-wire-profile.yaml`；Web skill 不复制或自行维护第二套协议。
- DTO / VO / CMD / Query 默认用 Lombok 处理 getter/setter、constructor、builder 和日志样板；不要在 Controller 内部类或非约定包临时定义主要 DTO / VO。
- `WebConvertor` 使用 `@Mapper(componentModel = "spring")` 和构造器注入；禁止静态 `INSTANCE`、在 Controller / Application 中大段手写字段赋值、使用 `BeanUtils.copyProperties` 或反射式通用拷贝。
<a id="web.pagination"></a>
<!-- yss-rule {"id":"web.pagination","when":"pagination","level":"mandatory","evidence":"code-and-verification"} -->
- HTTP Request 不继承会暴露内部协作字段的 `PageQuery`；只生成冻结 OpenAPI allowlist 字段，禁止把 `offset`、`needTotalCount`、`tempTotalCount` 变成客户端输入。
- `fields.<table>.pagination` 必须显式列出 `yss-dto` wire profile 允许暴露的字段子集；模板不得无条件生成字段或自行定义默认值。
- 仅新建 CRUD 先跑脚本；既有整改和手工协议适配不重跑初始化生成器。
- Validation namespace 参数必须来自当前路线已核验的精确平台事实：`daily` 使用同 Ticket 的已有工程基线，`governed` 使用批准配置；不得按记忆或 Boot 大版本自行选择。
- 若用户只是要改单个 Controller，先看现有代码，不要盲覆盖整个目录。
- 脚本是 initialize-only；写入前先规划全部目标并校验 `allowed_write_paths`，任一目标已存在或传入 `--force` 时整体返回 `unsupported`。落盘使用排他创建和失败回滚，不得留下部分文件；旧项目迁移不属于该生成器。
- `integration_mode=existing-project` 只复用工程登记、effective POM 与依赖树共同证明的精确平台，不从 Boot 大版本推断能力；`integration_mode=scaffold-v2` 必须提供 `--scaffold-manifest-file`，且 Manifest 已达到 `empty-scaffold-verified`，Profile、基础包、标准 Web module 路径和平台绑定全部一致。

## 按需读取

- 分层开发规范：`references/web-adapter-layer-guide.md`
- Web 生成合同 schema：`references/web-generation-contract.schema.json`
- 生成脚本：`scripts/generate_controller.mjs`
- Controller 模板：`assets/templates/Controller.java.template`
- Convertor 模板：`assets/templates/WebConvertor.java.template`
- POJO 样板代码：`lombok`
- 对象转换：`mapstruct`

## 阶段 7 合同

- `governed` 所有写入消费批准且当前的 Slice 与冻结 OpenAPI/no-impact record；合格 `daily` 消费同 Ticket 的 `scope.paths`、验收、已有工程/seam 与 API 段的当前 Freeze 或 no-impact，保守兼容新增按支持的 API review/Freeze 路线处理。只有新建 CRUD 生成还要求 schema v2 Web generation contract；该生成分支不因 `daily` 豁免。生成合同 v1 为 `unsupported`，不得自动升级；不得用 Controller 反向定义产品契约。
- DTO/VO/WebConvertor 机械骨架可用 `controlled-generation`；权限、错误映射、校验语义和接口行为必须使用 `behavior-tdd`。
<a id="web.write-scope"></a>
<!-- yss-rule {"id":"web.write-scope","when":"change","level":"mandatory","evidence":"code-and-verification"} -->
- 写入必须位于 `governed` 合同 `allowed_write_paths` 或 `daily` 同 Ticket 的实际 `scope.paths`，并提供 Controller、DTO/VO、WebConvertor、契约/API 测试和实际验证结果。
- `daily` 在同 Ticket 返回文件、技术约束、真实契约测试/命令/退出码及偏离，由独立 Reviewer 绑定当前候选；`governed` 按正式 `YSS Skill Execution Result` 返回。新 API/schema 按当前政策重新分诊；破坏性、未知、跨仓、权限或响应包装新影响停止受影响实现并回生命周期，正式合同漂移按原规则回编译器。YSS wrapper 的目标 wire 检查未移植时保持 `UNPORTED`，不能用 profile 检查替代。

## 新脚手架平台约束

`governed` 消费批准切片架构身份中的 `platform_configuration`，并与工程 Manifest、effective POM 和依赖树核对；合格 `daily` 从同 Ticket 的已有工程基线、effective POM 与依赖树取得精确平台，不补造生成 Manifest 或 Slice。DTO、Validation、Exception 或其他 YSS 组件命中时，逐项核验当前平台的组件绑定与证据；`governed` 消费合同中的 `component_bindings`。缺少 verified 架构证据、构件摘要或绑定发生漂移时停止受影响动作，`daily` 回生命周期调查，`governed` 回合同编译器阻断。Validation namespace、Jackson wire 行为、Web starter 和自动配置机制只来自解析后的精确平台事实；命令参数必须使用该解析值，不在本 Skill 中按 Boot 大版本硬编码。不得在业务实现中升级、降级或替换组件；平台迁移使用独立迁移工作单元。详见仓库共享合同 `.template-spec/engineering/backend-platforms.md`。
