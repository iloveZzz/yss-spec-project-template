---
name: yss-ddd-scaffold-generator
description: 用于生成完整的 YSS DDD 多模块后端脚手架。当用户要求从零创建符合 YSS 规范的 Domain、Application、Infrastructure、Adapter、Bootstrap 工程骨架时调用。
---

# yss-ddd-scaffold-generator

这是一个脚手架生成型 skill。优先运行脚本和模板，不要手工拼装整套多模块工程。

在产品生命周期中，本 skill 属于 Engineering Baseline / YSS DDD Review 阶段：用于从零创建后端服务骨架，或为架构设计提供标准模块边界输入。它不是业务实现阶段的替代品。

## 何时使用

- 用户要求从零创建新的 YSS 后端服务。
- 用户要求一次性生成完整多模块工程骨架。
- 用户需要标准的 Domain、Application、Infrastructure、Adapter、Bootstrap 目录和基础模板。

## 不适用

- 只补单个领域模型时，优先 `yss-domain`。
- 只补持久层时，优先 `yss-db2mybatis` 或 `yss-repository`。
- 只补 Web 层时，优先 `yss-web-controller`。

## 优先流程

1. 确认项目名、基础包名、输出目录、数据库类型。
2. 运行 `scripts/generate_scaffold.py` 生成骨架。
3. 检查生成的模块名、POM、配置文件、Smart Doc 配置和包路径。
4. 使用 `./mvnw` 执行 `validate`、测试和打包验证。
5. 如需继续细化，再追加其他 YSS skill 补全领域、仓储和 Web。

## 推荐命令

```bash
python3 scripts/generate_scaffold.py \
  --project-name my-service \
  --base-package com.yss.myservice \
  --output-dir /path/to/implementation-repo \
  --database mysql
```

## 生成结果应包含

- 父工程 POM
- `*-domain`
- `*-application`
- `*-infrastructure`
- `*-adapter`
- `*-bootstrap`
- 基础配置、模板代码、构建脚本
- `bootstrap/src/main/resources/smart-doc.json` 基础配置

## 使用约束

- 先生成骨架，再做业务化定制，不要直接把脚手架当最终代码交付。
- 默认不生成 `User CRUD` 示例；只有显式传入 `--with-example` 时才生成。
- 若仓库已经存在相同工程，先核对覆盖范围。
- 输出目录必须显式指定；非空目录默认拒绝写入，确认覆盖时才使用 `--force`。
- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 生成后必须继续使用 `yss-backend-scaffold-parent` 校验工程基线，再按垂直切片加载 `yss-domain`、`yss-repository`、`yss-web-controller` 等局部技能。
- 当前脚手架第一阶段仅支持经过验证的 `mysql`；未提供完整模板和验证的数据库类型不得伪装成已支持。
- 生成后的后端工程必须使用项目根目录 `./mvnw ...` 执行构建、测试、运行、OpenAPI 生成和 CI 验证；不得在 README、实施记录、Ticket、Review 或 Release 中默认写裸 `mvn ...`。既有仓库确实无法使用 wrapper 时，必须记录受控例外。
- `.mvn/settings.xml` 只能通过 `${env.MAVEN_REPO_USERNAME}` 和 `${env.MAVEN_REPO_PASSWORD}` 读取 Maven 仓库凭据；内部仓库构建前由 CI 或本地安全环境注入变量，禁止把 Maven 仓库用户名、明文密码或 Maven 加密密码写入 skill、模板或生成工程。
- 涉及 API 契约时，先确认 `docs/.scratch/<feature>/api/<feature>.yaml` 中的 OpenAPI Draft / Freeze 状态；不要用脚手架生成结果反向替代产品契约设计。

## Smart Doc 配置参考

脚手架只生成不包含环境地址、Torna token 和业务项目名称的基础 `smart-doc.json`。参考真实项目配置时，仅提炼通用生成行为：

- `allInOne: true`：生成单一 OpenAPI 文档。
- `outPath: "target/openapi"`：生成文件输出到构建产物目录。
- `packageFilters: "<base_package>.*"`：按 Smart Doc 的正则语义扫描当前服务的 Controller 包。
- `componentType: "NORMAL"`：使用稳定的类名作为 schema 组件名。
- `inlineEnum: true`、`recursionLimit: 7`：保持枚举展开和递归深度策略。
- `requestExample`、`responseExample`、`createDebugPage` 默认关闭，避免把环境或示例数据带入契约产物。

`serverUrl`、`debugEnvUrl`、`openUrl`、`appToken`、`revisionLogs` 属于具体环境或项目治理配置，必须在实现仓库中按实际契约补充，不能写入通用脚手架模板。

## 按需读取

- 主脚本：`scripts/generate_scaffold.py`
- 模板目录：`assets/templates/`
- 分层细化参考：`references/yss-backend-scaffold-parent/` 及其子 skill

## 阶段 7 合同

- 仅在实现仓库/输出目录、`scaffold_status=required` 和批准合同明确时运行。
- 工程骨架属于 `controlled-generation`，必须记录生成器输入、预期文件和 `./mvnw ...` 编译/测试结果；不得将业务状态机、权限、事务或查询逻辑混入生成步骤。
- 生成后按统一 `YSS Skill Execution Result` 返回 changed/evidence files、实际验证结果和新增影响，再由 Router 为业务工作单元重新路由。
