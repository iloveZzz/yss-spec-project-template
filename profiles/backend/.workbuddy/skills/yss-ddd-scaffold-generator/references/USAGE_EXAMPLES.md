# 使用示例

新合同是服务级工程基线，使用统一 Project Scaffold Contract schema v5（历史 v4 保留空工程语义） 与 `scaffold_request_id`。以下仅展示身份、Profile 和生成策略片段；实际平台、Maven 坐标、设计与批准绑定必须来自当前已批准输入，示例值不能作为生成授权：

```json
{
  "schema_version": 4,
  "kind": "project-scaffold-contract",
  "delivery_role": "backend",
  "scaffold_kind": "backend-ddd",
  "repository_scope": "external-repository",
  "init_git": false,
  "scaffold_request_id": "scaffold-metadata-service-1",
  "project_name": "metadata-service",
  "target_output_dir": "/path/to/implementation-repo",
  "base_package": "com.yss.metadata",
  "architecture_family": "domain-driven",
  "architecture_profile": "target-domain-model",
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
    "verification_database": "h2",
    "production_database": "not-bound",
    "platform": "<approved-platform-profile>",
    "validation_namespace": "<resolved-platform-namespace>",
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


## 2. 一键生成并验证

该入口依次生成工程并在项目根实际执行：

```bash
./mvnw validate
./mvnw test
./mvnw package
```

执行前按 [Maven settings 规则](engineering-checks.md) 参考用户 `~/.m2/settings.xml` 或显式文件路径；可通过 `YSS_MAVEN_SETTINGS=/path/to/settings.xml` 传给工作流。缺少可用配置时先获取用户的文件路径或必要仓库信息；仅采用项目环境模板时才必须由安全环境提供 `YSS_MAVEN_REPOSITORY_URL`、`MAVEN_REPO_USERNAME`、`MAVEN_REPO_PASSWORD`。模板不固化内部 URL 或凭据。只有三条命令全部返回 0，工作流才把 Manifest 从 `generated` 更新为 `empty-scaffold-verified`。任一步失败都返回非 0并保留证据：

- `scaffold-generation.stdout.log` / `scaffold-generation.stderr.log`
- `mvnw-validate.*.log`、`mvnw-test.*.log`、`mvnw-package.*.log`
- `scaffold-verification.json`
- `scaffold-workflow.json`


## 3. 生成结果

```text
metadata-service/
├── .mvn/
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

生成器只提供工程结构、POM、项目级 Maven 配置、机械启动入口和通用测试依赖，业务空工程不生成产品实体、表、Controller 或 API；默认 examples/reference/ 包含独立 ReferenceEntry 示例 CRUD。

## 4. 后续路由

完成 golden first slice 后，必须运行：

目标目录必须不存在。`--force`、旧项目迁移和当前模板升级均为 `unsupported`。旧项目继续按原工程维护；现代化改造必须单独立项、先评估再逐切片迁移。

如需本地启动机械入口：

```bash
cd /path/to/implementation-repo/metadata-service
./mvnw spring-boot:run -pl metadata-service-bootstrap
```
