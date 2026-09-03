---
name: yss-web-controller
description: Use when generating or refactoring YSS Web Adapter Controllers, request DTOs, response VOs, validation, result wrappers, or Web Convertors from frozen contracts and stable Application interfaces.
---

# yss-web-controller

这是一个 Web 适配层生成型 skill。优先复用脚本 `scripts/generate_controller.mjs` 和模板，不手写重复 CRUD。

## 何时使用

- 用户要批量生成 Controller。
- 用户要根据冻结 OpenAPI 字段合同、metadata 和稳定 Application 接口生成 Request / Response / Controller / WebConvertor。
- 用户要求统一 Web Adapter 风格、返回值和接口路径。

## 不适用

- 用户只是要新增一个手写复杂接口，不一定要用脚本。
- 用户还没有稳定的领域模型或 metadata，先补 `yss-domain` 并准备完整的 metadata 输入。

## 优先流程

1. 先确认冻结 OpenAPI、批准的 Web generation contract、Application Service 接口、metadata、基础包、模块名、领域 segment 和 web 落盘目录；合同中的 `base_package`、`module_name`、`domain_segment` 必须与 CLI 一致。
2. 涉及 DTO / VO / CMD / Query POJO 样板代码时，加载并遵守 `lombok`。
3. 涉及 Domain / Application Result 到 VO / DTO 或 CMD / Query 到输入模型的转换时，加载并遵守 `mapstruct`。
4. 运行 `node scripts/generate_controller.mjs`。
5. 生成后检查路径、命名、返回值包装、Application Service 引用、`@Valid`、Lombok 注解和 MapStruct WebConvertor 是否对齐项目。
6. 对复杂接口做少量手工修正，不在 skill 中承诺自动覆盖全部业务逻辑。

## 推荐命令

```bash
node scripts/generate_controller.mjs \
  --metadata-file /path/metadata.json \
  --contract-file /path/approved-web-generation-contract.json \
  --base-package com.yss.demo \
  --module-name demo \
  --domain-segment example \
  --web-project-dir /path/demo-adapter/demo-web \
  --application-service-package com.yss.demo.application.service \
  --validation-namespace javax
```

## 输出预期

- `rest/dto/request/*CreateRequest.java`
- `rest/dto/request/*UpdateRequest.java`
- `rest/dto/request/*PageRequest.java`
- `rest/dto/response/*Response.java`
- `rest/*Controller.java`
- `rest/convertor/*WebConvertor.java`

## 约束

- 生成代码只依赖既有 Application Service；读写操作都禁止绕过 Application。复杂查询经 Application Query Port 接入 Infrastructure。
- 返回结构保持项目既有 `SingleResult`、`PageResult`、`MultiResult` 体系。
- DTO / VO / CMD / Query 默认用 Lombok 处理 getter/setter、constructor、builder 和日志样板；不要在 Controller 内部类或非约定包临时定义主要 DTO / VO。
- `WebConvertor` 使用 `@Mapper(componentModel = "spring")` 和构造器注入；禁止静态 `INSTANCE`、在 Controller / Application 中大段手写字段赋值、使用 `BeanUtils.copyProperties` 或反射式通用拷贝。
- HTTP Request 不继承会暴露内部协作字段的 `PageQuery`；只生成冻结 OpenAPI allowlist 字段，禁止把 `offset`、`needTotalCount`、`tempTotalCount` 变成客户端输入。
- 先跑脚本，再按项目规范做少量手调。
- `javax` / `jakarta` validation namespace 必须来自工程基线，不得按记忆选择。
- 若用户只是要改单个 Controller，先看现有代码，不要盲覆盖整个目录。
- 脚本是 initialize-only；写入前先规划全部目标，任一目标已存在或传入 `--force` 时整体返回 `unsupported` 且不得留下部分文件。旧项目迁移不属于该生成器。

## 按需读取

- 分层开发规范：`references/web-adapter-layer-guide.md`
- 生成脚本：`scripts/generate_controller.mjs`
- Controller 模板：`assets/templates/Controller.java.template`
- Convertor 模板：`assets/templates/WebConvertor.java.template`
- POJO 样板代码：`lombok`
- 对象转换：`mapstruct`

## 阶段 7 合同

- 只消费已批准合同和冻结 OpenAPI/no-impact record；不得用 Controller 或半成品 backend 反向定义产品契约。
- DTO/VO/WebConvertor 机械骨架可用 `controlled-generation`；权限、错误映射、校验语义和接口行为必须使用 `behavior-tdd`。
- 写入必须位于合同 `allowed_write_paths`，并提供 Controller、DTO/VO、WebConvertor、契约/API 测试和实际验证结果。
- 按统一 `YSS Skill Execution Result` 返回偏离与新增影响；出现新 API/schema、权限或响应包装变化时暂停并回到 Router/生命周期。
