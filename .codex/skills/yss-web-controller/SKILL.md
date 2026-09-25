---
name: yss-web-controller
description: "按冻结合同与稳定 Application 接口生成或重构 YSS Controller、请求 DTO、响应 VO 和 Web Convertor。"
---

# yss-web-controller

## 架构分流（先执行）

读取当前合同的 architecture_identity 并与工程基线、仓库登记及 Manifest 核对；再且只读取 `references/profiles/<architecture_profile>.md`。生成式分支为 target-domain-model、layered-mvc-service、mvc-data-analysis-v1；既有工程分支为 existing-domain-driven-maven、existing-layered-mvc-maven。成熟度以注册表为准，不能把 draft 称为受支持。MVC 不执行下文 DDD 专属规则，也不加载其旧分层 guide；组件、安全、批准合同、允许路径及执行证据规则仍共用。

以下 Application / Domain Gateway / Infrastructure / Web module 叙述仅适用于 target-domain-model；MVC 的 service/core/repository/server/client 所有权由所选 Profile 引用定义。

本 Skill 同时支持只读审计、既有整改和新建 CRUD 生成。审计读取实际入口和现有契约，缺证据只记录缺口；整改消费批准 Slice、冻结 API/no-impact 与稳定用例 seam；仅新建 CRUD 才要求 Web generation contract、metadata 并调用 initialize-only 生成器。

## 何时使用

- 用户要批量生成 Controller。
- 用户要根据冻结 OpenAPI 字段合同、metadata 和稳定 Application 接口生成 Request / Response / Controller / WebConvertor。
- 用户要求统一 Web Adapter 风格、返回值和接口路径。

手工认证、回调、Cookie、下载或流式接口适用本 Skill，但不强制使用 CRUD 脚本或 metadata。

## 实施前置与审计边界

- 只读审计可以记录用例 seam 或契约缺失。既有整改缺少批准 Slice、稳定用例 seam 或接口契约时，回实现合同编译器补齐；仅新建 CRUD 生成要求 metadata，不因缺 metadata 拒绝既有代码审计或手工接口整改。

## 新建 CRUD 生成流程

1. 先确认冻结 OpenAPI、批准且版本当前的 Web generation contract schema v2、Application Service 接口、metadata、基础包、模块名、领域 segment 和 web 落盘目录；合同必须绑定 Slice `contract_id` / `contract_version` / `slice_id`、`yss-dto` wire profile 引用与 digest、允许写路径、证据与验证命令。
2. 加载并遵守 `yss-dto` 与 `yss-validation`；错误映射影响命中时再加载 `yss-exception`。
3. 涉及 DTO / VO / CMD / Query POJO 样板代码时，加载并遵守 `lombok`。
4. 涉及 Domain / Application Result 到 VO / DTO 或 CMD / Query 到输入模型的转换时，加载并遵守 `mapstruct`。
5. 运行 `node scripts/generate_controller.mjs`。
6. 生成后检查路径、命名、返回值包装、Application Service 引用、`@Valid`、Lombok 注解和 MapStruct WebConvertor 是否对齐项目。
7. 对复杂接口做少量手工修正，不在 skill 中承诺自动覆盖全部业务逻辑。

## 推荐命令

```bash
node scripts/generate_controller.mjs \
  --metadata-file /path/metadata.json \
  --contract-file /path/approved-web-generation-contract.json \
  --dto-wire-profile-file /path/to/yss-dto/references/openapi-wire-profile.yaml \
  --scaffold-manifest-file /path/service/.yss/scaffold-generation.json \
  --base-package com.yss.demo \
  --module-name demo \
  --domain-segment example \
  --web-project-dir /path/demo-adapter/demo-web \
  --application-service-package com.yss.demo.application.service \
  --validation-namespace <resolved-platform-namespace>
```

## 输出预期

- `rest/dto/request/*CreateRequest.java`
- `rest/dto/request/*UpdateRequest.java`
- `rest/dto/request/*PageRequest.java`
- `rest/dto/response/*Response.java`
- `rest/*Controller.java`
- `rest/convertor/*WebConvertor.java`

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
- Validation namespace 参数必须来自批准的精确平台配置和当前工程基线，不得按记忆或 Boot 大版本自行选择。
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

- 所有写入消费批准且当前的 Slice 与冻结 OpenAPI/no-impact record；只有新建 CRUD 生成还要求 schema v2 Web generation contract。生成合同 v1 为 `unsupported`，不得自动升级；不得用 Controller 反向定义产品契约。
- DTO/VO/WebConvertor 机械骨架可用 `controlled-generation`；权限、错误映射、校验语义和接口行为必须使用 `behavior-tdd`。
<a id="web.write-scope"></a>
<!-- yss-rule {"id":"web.write-scope","when":"change","level":"mandatory","evidence":"code-and-verification"} -->
- 写入必须位于合同 `allowed_write_paths`，并提供 Controller、DTO/VO、WebConvertor、契约/API 测试和实际验证结果。
- 按统一 `YSS Skill Execution Result` 返回偏离与新增影响；出现新 API/schema、权限或响应包装变化时暂停并回到 实现合同编译器/生命周期。

## 新脚手架平台约束

消费批准切片架构身份中的 `platform_configuration`，并与工程 Manifest、effective POM 和依赖树核对。DTO、Validation、Exception 或其他 YSS 组件命中时，逐项消费合同中的 `component_bindings`；缺少 verified 架构证据、构件摘要或绑定发生漂移时回合同编译器阻断。Validation namespace、Jackson wire 行为、Web starter 和自动配置机制只来自解析后的精确平台事实；命令参数必须使用该解析值，不在本 Skill 中按 Boot 大版本硬编码。不得在业务实现中升级、降级或替换组件；平台迁移使用独立迁移工作单元。详见仓库共享合同 `.template-spec/engineering/backend-platforms.md`。
