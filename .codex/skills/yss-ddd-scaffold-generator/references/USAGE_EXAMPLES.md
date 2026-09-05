# 使用示例

## 1. 准备批准合同

新合同是服务级工程基线，使用 schema v3 与 `scaffold_request_id`，并把已批准的架构决策、Java 包名、Maven 坐标和 Profile 分开登记：

```json
{
  "schema_version": 3,
  "scaffold_request_id": "scaffold-metadata-service-1",
  "project_name": "metadata-service",
  "target_output_dir": "/path/to/implementation-repo",
  "base_package": "com.yss.metadata",
  "architecture_family": "domain-driven",
  "generator_skill": "yss-ddd-scaffold-generator",
  "decision_ref": "scaffold-architecture-decisions.yaml",
  "decision_id": "architecture-metadata-service",
  "decision_digest": "sha256:<digest>",
  "maven_coordinates": {
    "group_id": "com.yss.datamiddle",
    "project_version": "1.0.0-SNAPSHOT",
    "parent": {
      "group_id": "com.yss.datamiddle",
      "artifact_id": "yss-datamiddle-parent",
      "version": "2.0.0-SNAPSHOT"
    },
    "yss_components_version": "2.0.0-SNAPSHOT"
  },
  "profiles": {
    "architecture": "target-domain-model",
    "persistence": "mybatis-plus",
    "database": "mysql",
    "platform": "spring-boot-2.7-jdk8",
    "validation_namespace": "javax",
    "dto_placement": "web",
    "repository": "yss-internal"
  },
  "module_profile": {
    "resolution_version": 1,
    "requested_capabilities": [],
    "resolved_modules": ["domain", "application", "infrastructure", "adapter", "bootstrap"]
  },
  "generation_policy": {
    "mode": "initialize-only",
    "existing_target": "unsupported",
    "old_project_migration": "unsupported",
    "template_upgrade": "unsupported"
  }
}
```

以上只是关键片段；实际合同还必须满足 `yss-implementation-contract-compiler/references/compiler-contract.yaml` 中的完整 `scaffold_contract_schema`，引用经用户确认并由生命周期批准的 `scaffold-architecture-decisions.yaml`，再持久化为当前版本。历史 schema v2 仅用于验证器只读兼容；新生成拒绝 schema v1/v2 且不自动升级。

## 2. 一键生成并验证

```bash
node .agents/skills/yss-ddd-scaffold-generator/scripts/generate_and_verify_scaffold.mjs \
  --project-name metadata-service \
  --base-package com.yss.metadata \
  --group-id com.yss.datamiddle \
  --project-version 1.0.0-SNAPSHOT \
  --parent-group-id com.yss.datamiddle \
  --parent-artifact-id yss-datamiddle-parent \
  --parent-version 2.0.0-SNAPSHOT \
  --yss-components-version 2.0.0-SNAPSHOT \
  --output-dir /path/to/implementation-repo \
  --contract-id <approved-scaffold-contract-id> \
  --contract-version <current-version> \
  --approval-ref <lifecycle-approval-ref> \
  --compiler-draft-ref <compiler-draft-ref> \
  --persisted-ref <persisted-contract-ref> \
  --contract-file /path/to/persisted-scaffold-contract.json \
  --evidence-dir /path/to/evidence/scaffold
```

该入口依次生成工程并在项目根实际执行：

```bash
./mvnw validate
./mvnw test
./mvnw package
```

执行前必须由安全环境提供 `YSS_MAVEN_REPOSITORY_URL`、`MAVEN_REPO_USERNAME`、`MAVEN_REPO_PASSWORD`；模板不固化内部 URL 或凭据。只有三条命令全部返回 0，工作流才把 Manifest 从 `generated` 更新为 `empty-scaffold-verified`。任一步失败都返回非 0并保留证据：

- `scaffold-generation.stdout.log` / `scaffold-generation.stderr.log`
- `mvnw-validate.*.log`、`mvnw-test.*.log`、`mvnw-package.*.log`
- `scaffold-verification.json`
- `scaffold-workflow.json`

验证报告的 `failure_category` 会区分内部仓库访问、项目模型、编译、启动入口、测试和打包失败。`preflight` 只记录凭据是否配置，不记录凭据值。

## 3. 生成结果

```text
metadata-service/
├── .mvn/
├── .yss/scaffold-generation.json
├── mvnw
├── pom.xml
├── metadata-service-domain/
├── metadata-service-application/
├── metadata-service-infrastructure/
├── metadata-service-adapter/
│   └── metadata-service-web/
└── metadata-service-bootstrap/
    └── src/main/java/com/yss/metadata/MetadataServiceApplication.java
```

生成器只提供工程结构、POM、项目级 Maven 配置、机械启动入口和通用测试依赖，不生成实体、表、Controller、业务 API 或示例 CRUD。

## 4. 后续路由

`empty-scaffold-verified` 不等于业务切片可实现。后续必须回到 `yss-implementation-contract-compiler`，消费批准且版本当前的 Slice Implementation Contract，再按影响面加载 `yss-domain`、`yss-application`、`yss-repository`、`yss-mybatis`、`yss-web-controller`、`yss-dto`、`yss-exception`、`yss-validation`、`mapstruct`、`lombok`、`alibaba-java-code-style` 等 skill，并使用 `behavior-tdd` 实现业务行为。

完成 golden first slice 后，必须运行：

```bash
node .agents/skills/yss-ddd-scaffold-generator/scripts/run_first_slice_verification.mjs \
  --project-root /path/to/implementation-repo/metadata-service \
  --slice-contract-file /path/to/approved-slice-contract.json \
  --evidence-dir /path/to/evidence/first-slice
```

只有该验证器确认合同、全层产物、skill tree digest 与根 Wrapper 全部通过，并更新 Manifest 后，才能标记 `first-slice-verified`。

目标目录必须不存在。`--force`、旧项目迁移和当前模板升级均为 `unsupported`。旧项目继续按原工程维护；现代化改造必须单独立项、先评估再逐切片迁移。

如需本地启动机械入口：

```bash
cd /path/to/implementation-repo/metadata-service
./mvnw spring-boot:run -pl metadata-service-bootstrap
```
