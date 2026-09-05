---
name: yss-backend-scaffold-parent
description: YSS DDD scaffold Engineering Baseline entry for profile, module, dependency, build, and downstream-skill routing checks.
---

# YSS DDD Scaffold Engineering Baseline

本文件只定义脚手架工程基线和路由，不复制 Domain、Application、Repository、Web 的实现细则。

## 当前可验证 Profile

- Architecture: `target-domain-model`
- Persistence: `mybatis-plus`
- Database: `mysql`
- Platform: `spring-boot-2.7-jdk8`
- Validation namespace: `javax`
- DTO placement: `web`
- Repository: `yss-internal`

未具备独立 fixture、受控合同和真实验证证据的组合统一为 `unsupported`。旧架构不存在可选 Profile，也不能作为回退。

## 模块与依赖方向

```text
domain <- application <- web
   ^            ^
   |            |
infrastructure-+
        ^
     bootstrap
```

- `domain`：纯 Java 领域模型、领域服务、领域事件、Domain Gateway；不得依赖 YSS DTO/Exception、Web Validation、Jackson、Swagger、MyBatis。
- `application`：用例编排、Command / Query / Result、事务边界、Application Query Port；可以依赖 Domain 和必要的 YSS result wrapper。
- `infrastructure`：实现 Domain Gateway / Application Query Port，拥有 PO、Mapper、持久化转换器；依赖 Domain 与 Application。
- `adapter/web`：拥有 HTTP DTO、Controller、异常翻译、WebConvertor；只依赖 Application。
- `bootstrap`：装配与启动，不放业务逻辑。

依赖方向由 Maven Reactor、Maven Enforcer 与 ArchUnit 共同约束。MapStruct 统一使用 Spring component model，父 POM 配置 annotation processor、Lombok 与 `lombok-mapstruct-binding`。

## 生成与验证

- 输入是批准且持久化的服务级 scaffold contract schema v3，身份为 `scaffold_request_id`，并绑定已确认的 `architecture_family=domain-driven` 架构决策；不使用 `slice_id`。历史 Manifest v2 仅供验证器只读兼容。
- 生成器严格 initialize-only：目标工程目录必须不存在，`--force`、旧项目迁移和当前模板升级均为 `unsupported`。
- Maven 内部仓库通过命名 profile `yss-internal` 与环境变量注入；共享模板不写内部 URL 或凭据。
- Wrapper 必须带 checksum；DEBUG 和 MyBatis stdout SQL 只允许在 `application-local.yml`。
- `./mvnw validate`、`./mvnw test`、`./mvnw package` 全部成功只得到 `empty-scaffold-verified`。
- 只有批准且版本当前的 golden first slice 真实组合 Domain/Application/Infrastructure/Web、通过下游 skill tree drift 校验与根 Wrapper，才能由 `run_first_slice_verification.mjs` 写入 `first-slice-verified`。

## 下游权威技能

- Domain：`yss-domain`
- Application：`yss-application`
- Persistence：`yss-repository` + `yss-mybatis`
- Web：`yss-web-controller` + `yss-dto` + `yss-exception`
- 横切实现约束：`yss-validation` + `mapstruct` + `lombok` + `alibaba-java-code-style`

业务代码必须回到 `yss-implementation-contract-compiler`，消费批准且版本当前的 Slice Implementation Contract，并采用 `behavior-tdd`；脚手架只生成机械工程资产。
