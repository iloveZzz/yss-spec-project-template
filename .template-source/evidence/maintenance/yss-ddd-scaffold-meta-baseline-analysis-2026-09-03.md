# YSS DDD 后端脚手架与 metadata-platform 工程基线对照

## 1. 结论

当前 canonical `yss-ddd-scaffold-generator` 已复用 `metadata-platform` 的 YSS 父 POM、组件 BOM 和 Maven Wrapper 文件，但仍存在足以让“生成成功”与“工程可编译/可打包”脱节的缺口。

按风险排序：

1. **P0：Bootstrap 只有 POM 和资源，没有最小 `@SpringBootApplication` 启动类。** Bootstrap POM 声明 `spring-boot-maven-plugin`，生成器却不生成任何 Java 文件。若 YSS 父 POM为该插件配置了 `repackage` 执行，`./mvnw package` 会在主类发现阶段失败。`metadata-platform` 具备真实启动类；脚手架应只复用其最小机械部分（`@SpringBootApplication` + `main`），不得复制业务扫描包、Feign、MapperScan、调度或其他业务装配。
2. **P0：生成器自身不运行三条 Maven 门禁，却先打印“项目生成完成”。** `validateGeneratedArtifacts()` 只检查 POM、Wrapper、Manifest 和占位符；真实 `validate/test/package` 位于独立验证器。调用方若只运行生成器或只相信其完成输出，会把未编译的工程误报为完成。最终完成语义必须由验证器三条命令全部 `exit_code=0` 决定。
3. **P0：项目内 Maven settings 没有被 Maven 启动链引用。** canonical 与 `metadata-platform` 的 Wrapper、`.mvn/jvm.config`、`.mvn/maven.config`、`.mvn/settings.xml` 和 wrapper 文件哈希一致；但 `mvnw` / `mvnw.cmd` 及 `.mvn/maven.config` 均未引用项目内 `.mvn/settings.xml`。Maven 默认不会自动加载项目内 settings，因此内部父 POM/BOM 是否可解析依赖开发机全局 Maven 配置。脚手架验证器目前也无法把“仓库/认证不可用”与“POM/Java 编译错误”结构化区分。
4. **P1：Maven `groupId` 计算结果完全未进入实际生成 POM。** 生成器从 `base_package` 截取前两段计算 `groupId`，但实际使用的 `assets/templates/pom/*.template` 全部硬编码 `com.yss.datamiddle`；生成 Manifest 也不记录 Maven `groupId`。`assets/templates/config/parent-pom.xml.template` 使用 `{{group_id}}`，但生成器从不读取该文件，形成两份漂移的父 POM 模板。只修改根 POM 会破坏 reactor 内部 GAV，必须原子替换父 POM、所有子模块 parent 和内部模块 dependency 的 `groupId`。
5. **P1：基础依赖与配置语义不一致。** 脚手架 `application.yml` 输出 `mybatis-plus` 配置，而 Infrastructure POM 使用 `yss-component-mybatis-starter`；`metadata-platform` 使用 `yss-component-mybatis-plus-starter`。这不能仅凭参考工程证明前者不存在，但会使后续按 MyBatis Plus 生成的 Repository 代码面临编译/运行时不一致，必须以 YSS 内部基线的实际可解析坐标做 fresh verification。
6. **P1：后续业务 skill 常用的编译/测试基线未被骨架固定。** `metadata-platform` 的 Domain 明确依赖 `yss-component-exception`，各层按需配置 JUnit、AssertJ、`spring-boot-starter-test`、H2；当前骨架基本没有测试依赖。不能把参考工程所有业务依赖搬入模板，但应把各 YSS 专项 skill 会机械生成的类型所需依赖形成最小、可验证的工程基线，否则空目录骨架可通过而第一条业务切片失败。
7. **P1：`${mapstruct.version}` 依赖远端父 POM隐式提供。** Application 和 Infrastructure 模板引用该属性，实际父 POM模板未声明；未使用的 `config/parent-pom.xml.template` 反而声明了它。应消除重复模板，并由批准的 YSS 父 POM/BOM合同或当前工程 POM显式、唯一地持有版本来源。

由于本工作单元按合同只读，未运行参考工程或新生成工程的 Maven 构建，也未获得用户原始失败日志；所以第 1、3、5 项是高置信静态根因候选，具体首次失败点仍须由修复后的临时生成工程和三条 Wrapper 命令确认。

## 2. metadata-platform 可复用工程基线

### 2.1 Maven 聚合与分层

- 根工程继承 YSS 内部 `yss-datamiddle-parent:2.0.0-SNAPSHOT`，并显式使用空 `relativePath` 从仓库解析父 POM。
- 根工程导入 `yss-components-bom:2.0.0-SNAPSHOT`，内部模块版本统一使用 `${project.version}`。
- 稳定的通用主链为 Domain → Application；Infrastructure → Domain；Web → Application + Domain；Bootstrap → Web + Infrastructure。
- Adapter 是 `pom` 聚合模块，Web 是其子模块。
- `metadata-platform-client` 是面向其他服务发布 Feign SDK 的产品选择，不属于当前 skill 承诺的五层必选骨架；只有批准合同命中客户端发布边界时才应条件生成。
- Maven reactor 的内部 GAV 使用同一个项目 `groupId`，不能让 Java `base_package` 隐式替代 Maven 坐标。

### 2.2 可复用的最小依赖原则

- Domain 可保留 YSS DTO、YSS Exception、Validation、Lombok 等真正会被通用模板引用的依赖。
- Application 可保留 Domain、Spring 基础能力、事务、Lombok、MapStruct；是否需要 AOP 应由工程基线明确，而不是从业务工程整包复制。
- Infrastructure 应选择与生成配置及 Repository 专项 skill 一致的 MyBatis / MyBatis Plus starter，并保留 MapStruct、Lombok 和已批准数据库驱动。
- Web 可保留 Application、Domain、Web、Validation、Lombok；Swagger 版本应由父 POM/BOM或统一属性管理。
- Bootstrap 可保留 Web、Infrastructure、Spring Boot 与命中的 YSS 通用组件；Liquibase、Nacos、Feign、Actuator、smart-doc 等均按影响面条件启用。
- JUnit、AssertJ、Spring Boot Test、H2 等应作为“可编译测试 seam”的工程基线按模块放置，但不得复制 `metadata-platform` 的具体测试、业务客户端或数据架构。

### 2.3 Wrapper 与配置

- `metadata-platform` 和 canonical 的 `mvnw` 均为可执行文件，且 Wrapper、JVM 配置、Maven 配置、settings、wrapper jar 与 properties 的 SHA-256 分别一致。Wrapper 文件本身不是当前差异来源。
- settings 只通过 `MAVEN_REPO_USERNAME` / `MAVEN_REPO_PASSWORD` 环境变量读取仓库凭据，没有发现固化明文凭据；报告不记录任何凭据值。
- 必须显式接入项目内 settings，或在合同中声明并验证受控的外部 settings 来源；不得继续复制一个实际不会被 Maven 读取的 settings 文件。
- `metadata-platform` 使用 `bootstrap.yml` + 条件 profile/Nacos 配置；当前脚手架使用本地 `application.yml`。这不是编译缺口。Nacos、Liquibase、业务数据源扩展及 Mapper 扫描应由后续批准切片添加，不能复制为所有服务默认值。

### 2.4 不得复制的内容

- `metadata-platform` 的业务依赖、外部服务客户端、smart-doc includes、业务扫描包和领域配置。
- 启动类中的 Feign、Mapper、调度及跨业务包扫描。
- 业务数据库 schema、Nacos 地址、数据库连接信息或任何凭据。
- 为当前五层骨架无条件增加 Client 模块。

## 3. 当前生成器与参考工程的关键差异

| 维度 | metadata-platform | 当前 canonical 生成器 | 判定 |
|---|---|---|---|
| YSS parent / BOM | 内部 parent 与 BOM，版本一致 | 同坐标、同版本 | 已对齐，但需要仓库可用性预检 |
| 模块 | Domain、Client、Application、Infrastructure、Adapter/Web、Bootstrap | Domain、Application、Infrastructure、Adapter/Web、Bootstrap | 五层目标正确；Client 不应无条件复制 |
| Bootstrap 主类 | 存在可运行主类 | 不生成 Java 主类 | P0 |
| Wrapper bundle | 完整 | 与参考工程逐文件哈希一致 | 已对齐 |
| settings 生效 | 工程内文件存在，但实际成功可能依赖外部 Maven 配置 | 同样复制但未显式接入 | P0，可移植性缺口 |
| Maven `groupId` | 全 reactor 使用统一坐标 | 计算后未使用，硬编码固定坐标 | P1，合同和模板漂移 |
| MyBatis 基线 | MyBatis Plus starter + 对应配置 | 普通 starter + MyBatis Plus 配置 | P1，需内部坐标验证 |
| MapStruct 版本 | 由上游 parent 隐式提供 | 同样隐式依赖；另有未使用模板声明属性 | P1，SSOT 分叉 |
| 测试编译基线 | 各模块按需声明 | 基本缺失 | P1，空骨架无法代表切片可编译 |
| 验证完成语义 | 可由工程实际构建给出 | 生成器先报告完成，验证器另行执行 | P0，状态误报窗口 |

## 4. 建议的增强合同

### 4.1 输入与 Manifest

在批准的脚手架合同、CLI 和 `.yss/scaffold-generation.json` 中显式增加并逐项回勾：

- `maven.group_id`：与 `base_package` 分离；现有 `com.yss.datamiddle` 可作为兼容默认值，但禁止从包名前两段静默截取。
- `maven.parent.{group_id,artifact_id,version}`。
- `maven.bom.{group_id,artifact_id,version}`。
- `maven.repository_mode` 与受控 settings 来源；只记录来源及所需环境变量名，不记录变量值。
- `bootstrap.main_class`：由 `base_package` 和项目名确定性生成、写入 Manifest 并校验文件存在。
- 经验证的 `persistence_stack`；当前第一阶段固定为与 YSS MyBatis Plus 基线一致的单一选项，未验证选项不得声称支持。

### 4.2 生成与验证闭环

1. 合并/删除重复父 POM模板，只保留 `assets/templates/pom/parent-pom.xml.template` 为生成事实源。
2. 让所有 parent GAV 和内部 dependency GAV 使用同一显式 `maven.group_id`。
3. 生成最小 Bootstrap 主类，仅包含通用 Spring Boot 启动行为。
4. 增加仓库/认证预检：只检查 Wrapper 可执行、settings 确实接入、必需环境变量是否存在以及 parent/BOM 是否可解析；禁止输出凭据值。
5. 验证报告增加 `failure_class`，至少区分 `wrapper-bootstrap`、`repository-or-auth`、`maven-model`、`java-compilation`、`test`、`packaging`。
6. 仍以项目根真实执行 `./mvnw validate`、`./mvnw test`、`./mvnw package` 为最终门禁；任一非零即 `failed`，不得宣称完成。
7. 生成器输出应明确为“文件生成成功，验证待执行”；只有受控验证器全部通过后，生命周期工作单元才能返回 completed。

### 4.3 回归测试 seam

- 使用显式、非默认的 Maven `groupId` 生成完整临时工程，断言根 POM、所有 child parent 和全部内部依赖坐标一致。
- 断言 `base_package` 与 Maven `groupId` 可以不同且不会互相静默推导。
- 断言生成 Bootstrap 主类的包名、类名和 Manifest 完全一致。
- 在临时生成工程中真实执行三条 Wrapper 命令并保存 stdout、stderr、exit code、耗时和时间戳。
- 用隔离的 Maven user home / settings fixture 验证“缺仓库或缺认证”被归类为 `repository-or-auth`，而 Java 语法错误被归类为 `java-compilation`。
- 对 `yss-component-mybatis-plus-starter`、MapStruct 属性来源、YSS parent/BOM 进行 effective-POM 或依赖解析断言。
- 保留现有 gitlink、detached HEAD、合同版本和覆盖回滚测试。

## 5. 证据索引

- 参考父 POM：`/Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/pom.xml`
- 参考启动类：`/Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/metadata-platform-bootstrap/src/main/java/com/yss/metadata/MetadataPlatformApplication.java`
- 参考各层 POM：`/Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/*/pom.xml` 与 `metadata-platform-adapter/metadata-platform-web/pom.xml`
- canonical 生成器：`.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`
- canonical 验证器：`.agents/skills/yss-ddd-scaffold-generator/scripts/run_scaffold_verification.mjs`
- canonical POM 模板：`.agents/skills/yss-ddd-scaffold-generator/assets/templates/pom/*.template`
- 未使用的重复父 POM模板：`.agents/skills/yss-ddd-scaffold-generator/assets/templates/config/parent-pom.xml.template`
- canonical Wrapper：`.agents/skills/yss-ddd-scaffold-generator/assets/wrapper/`

## 6. Workflow Execution Result

```yaml
schema_version: workflow-execution-result-v1
workflow_reference: scaffold-meta-baseline-exploration
work_unit_id: work-unit.entry-triage
role_id: role.backend-engineer
runtime_id: runtime.skill-projection
execution_state: Explorer
skill: yss-ddd-scaffold-generator
status: analyzed-with-signal
changed_files:
  - .template-source/evidence/maintenance/yss-ddd-scaffold-meta-baseline-analysis-2026-09-03.md
evidence_refs:
  - .template-source/evidence/maintenance/yss-ddd-scaffold-meta-baseline-analysis-2026-09-03.md
actual_verification:
  - command: test -f /Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/pom.xml
    exit_code: 0
  - command: test -x /Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/mvnw
    exit_code: 0
deferred_seams:
  - 原始失败日志未纳入本只读任务；直接首次失败点由修复后的临时生成工程真实 Maven 证据确认。
  - YSS 内部 parent、BOM 和 MyBatis Plus starter 的可解析性由受控构建环境确认。
drift:
  - 生成器计算 groupId 但实际 POM 模板不消费，且存在未使用的第二份父 POM模板。
  - 生成成功输出早于 mandatory Maven verification，存在状态语义漂移。
violation:
  - Bootstrap 声明可执行打包插件但未生成通用启动类。
  - 项目内 Maven settings 被复制却未显式接入 Maven 启动链。
  - 初次 CodeGraph 查询命中了目标仓库索引中的任务包范围外文件；未修改或引用这些文件形成结论，后续证据全部使用 allowed_read_paths 内的定向 rg/sed 重新核验。
new_impacts:
  - scaffold contract schema、CLI 参数和 Manifest 需要增加 Maven 坐标与仓库模式。
  - canonical 模板、生成器、验证器、回归测试及技能投影/CLI 分发面需同步更新。
blocking_signals:
  - 任一真实 ./mvnw validate、./mvnw test、./mvnw package 非零时必须阻断完成。
  - 仓库/认证预检失败必须单独归类，不得伪装成 Java 编译失败或生成成功。
```
