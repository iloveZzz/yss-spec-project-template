# YSS DDD 脚手架参考研究与开发者接力分析

> 决策更新（2026-09-03）：本文保留的是决策前研究快照。关于 legacy Profile、旧 schema 迁移和生成后 `plan/diff/migrate` 的提案均已被后续决策否决；当前规范以 [Target Profile 决策记录](yss-ddd-scaffold-target-profile-decision-2026-09-03.md) 为准：旧架构、schema v1、已有项目、旧项目迁移和当前模板升级统一为 `unsupported`。

> 日期：2026-09-03
> 仓库身份：`template-source`
> 任务包：`.template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-task-2026-09-03.yaml`
> 研究对象：`yss-ddd-scaffold-generator` 生成后，向 `yss-domain`、`yss-repository`、`yss-mybatis`、`yss-dto`、`yss-exception`、`yss-web-controller` 接力的开发者体验与工程合同
> 受众：模板维护者、后端架构师、使用脚手架开始首个垂直切片的 YSS 开发者
> 时间范围：以 2026-09-03 可访问的仓库事实和上游官方资料为准

## 1. 研究口径

本报告把证据分为三类，避免把外部框架约定或公开 issue 直接升级成 YSS 规则：

- **本地观察**：直接来自当前 canonical skill、脚本、模板和维护证据；属于对现状的强证据。
- **外部观察**：来自官方文档、官方源码仓库或官方 issue；文档和源码通常是强证据，单个 issue 只表示问题确实发生过，是弱频率信号。
- **对 YSS 的推断**：由本地与外部观察共同导出的改进假设；必须经 `work-unit.ssot-update`、合同更新和验证后才成为规则。

Product Design 用户上下文 preflight 返回空记录；本轮没有可用的内部支持、CRM、工单或用户访谈样本。因此，本文的“频率”主要依据问题是否会经过当前生成路径机械重复，而不是依据外部投诉数量。

## 2. Executive read

当前脚手架已经解决“目录生成成功但 `package` 失败”的历史逃逸，并能证明一个空业务骨架通过三条 Maven Wrapper 命令；但它尚未证明首个真实业务切片可以按六个下游 YSS skill 一致地落地。最大风险不是少生成几个 Java 文件，而是同一仓库同时存在 target DDD profile 和 legacy DTO/VO 型 profile：Domain、Repository 指南与 Web 生成器对 DTO、Domain Model、Gateway 返回类型和转换边界给出互相冲突的答案。第二个关键缺口是生成后的所有权和演进协议：根脚手架通过整目录备份降低了首次覆盖风险，下游生成器仍只有“存在则跳过 / `--force` 覆盖”，没有模板版本、逐文件所有者、散列、三方合并或迁移机制。第三个缺口是配置选择没有成为显式能力合同；当前模板实际上选定了 MyBatis-Plus、内部 Maven profile、MySQL、特定 Wrapper 下载源和 DEBUG 默认值，Manifest 却不足以让后续 skill 验证这些前提。外部优秀方案一致强调“结构化输入 + 可组合贡献器 + 生成集成测试 + 可执行架构规则 + 可追溯升级”，而不是一次性生成更多业务 CRUD。建议先冻结一种 canonical target profile，并用一个跨六个 skill 的 golden first slice 做兼容性验收，再扩展 Manifest 和生成后演进能力。Spring Modulith、jMolecules 或 JHipster 可以提供设计启发，但不应在未完成 JDK/Spring Boot/YSS 组件兼容决策前直接引入。

## 3. 当前接力链的已观察事实

| 环节 | 本地观察 | 接力风险 |
|---|---|---|
| Scaffold | 生成器只创建多模块 POM、空目录、Bootstrap 主类、配置、README、Wrapper 与 `.yss/scaffold-generation.json`；`USAGE_EXAMPLES.md:82-86` 明确不生成业务模型和 API。Manifest 位于 `generate_scaffold.mjs:290`，记录合同、坐标、包名、数据库等，但没有模板身份/散列、文件所有权、下游 profile 与架构规则版本。 | 空工程通过不代表第一个垂直切片通过；下游无法机器判定自己面对哪一种层边界和能力集合。 |
| Domain | `yss-domain/SKILL.md:10,33-35` 把新项目定义为 target profile：Domain 只生成 Domain Model 与 Gateway，DTO/VO 交给 client/web。该 skill 又要求同时加载的 `domain-layer-guide.md:5-7,14-18,51-55,267` 把 Command/Query/VO 放入 Domain，并让 Gateway 返回 VO/PageResult，最后承认当前示例主要是贫血模型。 | 同一个 skill 的主合同和 required reference 相互冲突，开发者无法仅靠“遵守 skill”得到唯一实现。 |
| Repository / MyBatis | `yss-repository/SKILL.md:25,48` 的 target profile 是 `PO <-> Domain Model`，事务在 Application；其 required guide `infrastructure-layer-guide.md:109-175` 的示例却让 Infrastructure 接收 Query DTO、直接返回 VO，并做 `PO -> VO`。`yss-mybatis/SKILL.md` 要求先确认普通 MyBatis 或 MyBatis-Plus，而脚手架 POM 与 `application.yml` 已硬编码 MyBatis-Plus。 | Repository 的返回模型、分页输入、转换责任和持久化 profile 不唯一，首个查询切片容易混合两套模型。 |
| DTO / Web | `yss-dto/references/openapi-wire-profile.yaml` 要求以 HTTP/JSON 证据决定 wire shape，并禁止把 `offset`、`needTotalCount`、`tempTotalCount` 暴露为客户端输入。`yss-web-controller/scripts/generate_controller.mjs:60-69` 却从 metadata 生成 client DTO/VO 到 Domain 模块；Controller 模板导入 Domain，WebConvertor 具备 `Cmd -> Domain`，但 add/update 实际直接把 Cmd 交给 Application（`Controller.java.template:3-6,27,52-62`；`WebConvertor.java.template:16-22`）。 | 物理模块、公开契约和转换调用链不一致；生成出的 Convertor 可能存在但没有参与写用例，形成“看似分层”的假边界。 |
| Exception | `yss-exception/SKILL.md:30-31,45-47` 记录当前 handler 会把 Biz、unknown、Runtime 映射为 HTTP 400，且 Runtime 可能返回 `getLocalizedMessage()`；新 API 必须显式做消毒映射。脚手架只放入依赖，没有生成或验证 endpoint error contract。 | 空构建无法发现 HTTP 状态、错误码、消息泄露和 OpenAPI 错误响应之间的漂移。 |
| Build / Environment | `.mvn/maven.config:1-2` 固定接入项目 settings 与 `internal-only`；settings 使用一个 HTTP 内网地址（`.mvn/settings.xml:42-95`）；Wrapper properties 绑定 Maven 3.6.3 与自定义下载地址，未记录 `wrapperSha256Sum` / `distributionSha256Sum`；应用默认 stdout SQL 与 DEBUG（`application.yml.template:21-35`）。 | 这些可以是受控 YSS 默认值，但目前不是带来源、适用环境和验证方式的能力选择，失败时容易被理解为“生成器不可靠”。 |
| Verification | 当前 fresh 证据证明临时空工程的 `./mvnw validate`、`test`、`package` 均通过，14/14 生成器测试通过（`yss-ddd-scaffold-compile-red-green-2026-09-03.md`）。验证器按日志正则分类首个失败，保留 stdout/stderr。 | 已解决空工程打包逃逸，但没有组合调用六个下游 skill，也没有领域行为、SQL/分页、序列化、异常和 HTTP 合同测试。 |

### 3.1 需要先回答的战术设计问题

以下问题不是模板实现细节，而是必须先由 Tactical DDD Check / ADR 给出唯一答案的边界决策：

1. 新项目的公开 Cmd/Query/VO 逻辑上属于 Web/Client boundary，还是仍属于 Domain module？若逻辑上不属于 Domain，是否新增独立 client Maven module，或暂时放入 web module？
2. Gateway 只交换 Domain Model / 领域值，还是允许 PageQuery、PageResult、VO 等 YSS transport 类型？读模型是否需要独立 Query Port？
3. Application Service 的稳定输入/输出是什么：HTTP Cmd/VO、Application command/result，还是 Domain Model？WebConvertor 应在哪个调用点真正执行？
4. `BizException` 是否允许从 Domain 直接依赖 YSS exception component；HTTP status、公开错误码与消息由 Web 映射还是组件默认 handler 决定？
5. scaffold 的持久化 profile 是普通 MyBatis、MyBatis-Plus、可选二者，还是未来包含无数据库/多数据源？当前 `--database mysql` 不能表达这个选择。

在这些答案冻结前继续扩张业务模板，会把冲突复制到更多文件。

## 4. 开发者体验问题排序

评分说明：严重度衡量错误进入业务代码后的代价；频率信号区分“路径必经”“条件触发”和“公开个案”；置信度衡量现有证据能否支持结论；产品杠杆衡量一次修复能影响多少后续项目。

| 排名 | 类型 | 用户目标与破坏点 | 严重度 | 频率信号 | 置信度 | 产品杠杆 | 建议动作 |
|---|---|---|---|---|---|---|---|
| P0-1 | 工作流 / 文档 | 开发者希望从 scaffold 无歧义地进入 Domain→Application→Repository→Web；target skill 与 required legacy guide/生成器对模型归属和返回类型冲突。 | Critical | 每个首切片必经 | 高，本地直接证据 | 极高 | 先批准单一 target profile；更新 SSOT、required guides、生成器合同和示例为同一条调用链。 |
| P0-2 | 可靠性 | 开发者希望“脚手架已验证”意味着第一条业务链可编译、可启动、可请求、可失败；当前只验证空工程。 | Critical | 每个新项目一次，影响持续 | 高，本地直接证据 | 极高 | 增加跨六个 skill 的 golden first slice 与 root `./mvnw validate/test/package`、架构、HTTP/序列化、异常、持久化测试。 |
| P0-3 | 工作流 / 可靠性 | 开发者希望生成后可以安全修改、再生成和升级；当前 Manifest 不记录逐文件所有权/模板版本，下游 `--force` 可覆写文件。 | High | 再生成/升级时条件触发；JHipster issue 仅是弱外部频率信号 | 高（能力缺失），外部频率低 | 高 | 建立 generator-owned / user-owned 边界、dry-run、逐文件 hash、三方 diff、冲突状态和版本化 migration。 |
| P1-1 | 配置 / Onboarding | 开发者希望输入一次后所有 skill 知道持久化、JDK/Boot、validation namespace、仓库与 Wrapper 前提；当前真实默认值分散在 POM/YAML/settings，Manifest 不完整。 | High | 每个环境/持久化切片必经 | 高 | 高 | 把能力矩阵变成 typed generation contract；默认值带 provenance，unsupported 组合前置失败。 |
| P1-2 | 工作流 / API | 开发者希望 DB metadata、Domain、DTO、OpenAPI 和异常 contract 各自有清晰来源；当前 Web 生成器可把表字段机械推到 wire DTO，且异常语义没有 endpoint 验证。 | High | 每个 CRUD/API 切片 | 高 | 高 | OpenAPI/批准字段 allowlist 先于 DTO 生成；生成后跑 serialization fixture、negative fields 与 sanitized error contract。 |
| P1-3 | 可靠性 | 开发者希望违反层依赖立即失败；当前关键边界主要靠 Markdown，Maven 与 package 规则不阻止 Domain 引用 Web/Infrastructure 或 adapter 互相依赖。 | High | 依赖增长后反复发生 | 高（门禁缺失） | 高 | 先引入 JDK 基线兼容的 ArchUnit 与 Maven Enforcer；规则由批准的 YSS profile 生成。 |
| P1-4 | 配置 / 供应链 | 开发者希望 Wrapper、Maven、Java、插件和依赖图可重现；当前自定义 Wrapper URL 无 checksum，POM 未显式检查 Java/Maven/plugin/reactor/dependency convergence。 | High | CI、离线、仓库变更时条件触发 | 高（缺失字段），故障频率未知 | 中高 | 固定并验证 Wrapper/发行包 checksum；Enforcer 校验 Java/Maven/plugin、reactor 与依赖收敛；证据记录解析源。 |
| P2-1 | 文档 / 诊断 | 开发者希望 README/架构图与真实代码一致，失败提示能指向下一步；`ARCHITECTURE.md:25-53,128-149` 同时声称 Domain 有 DTO、没有技术依赖，并给出含歧义的 `Infrastructure <-> Adapter`。验证器分类仍是日志正则。 | Medium | 文档路径必经；误分类条件触发 | 高（文档漂移），中（实际支持成本） | 中 | 文档从同一 profile/schema 派生；验证结果增加 failing module/goal、首因、remediation 与分类置信度。 |

### 4.1 外部公开问题不能冒充 YSS 痛点

JHipster 的官方 issue 中确有“更新实体可能覆盖自定义代码”“希望明确 generator extension 与 custom extension 边界”“重生成一个实体波及无关文件”等个案（[#10787](https://github.com/jhipster/generator-jhipster/issues/10787)、[#19155](https://github.com/jhipster/generator-jhipster/issues/19155)、[#28747](https://github.com/jhipster/generator-jhipster/issues/28747)）。这些 issue 只支持“生成器所有权与升级边界是现实风险”，不支持“YSS 用户已经频繁遭遇同样问题”。YSS 的高置信结论来自本地能力检查：Manifest 没有逐文件所有权/散列，下游 Web generator 的 `--force` 会直接写入既有文件；真实发生频率仍需收集生成日志、支持工单或开发者访谈。

## 5. 可借鉴的官方方案

| 方案 | 外部观察 | 可迁移到 YSS 的模式 | 不应直接照搬 |
|---|---|---|---|
| Spring Initializr | 官方 reference 把生成描述建模为可配置的 build system、language、packaging、coordinates、platform version 和 dependencies，并以有序 contributor/customizer 生成项目；`ProjectDescriptionDiff` 可描述定制前后的变化。官方还提供 `ProjectGeneratorTester` 测试生成上下文。[Reference](https://docs.spring.io/initializr/docs/current/reference/html/) · [Customizer API](https://docs.spring.io/initializr/docs/current/api/io/spring/initializr/generator/project/ProjectDescriptionCustomizer.html) · [Tester source](https://github.com/spring-io/initializr/blob/main/initializr-generator-test/src/main/java/io/spring/initializr/generator/test/project/ProjectGeneratorTester.java) | 把 scaffold input 变成 typed `ProjectDescription`；层、数据库、validation、仓库 profile 由可组合 contributor 处理；为生成结果提供一等测试 harness 和变更 diff。 | 不需要引入 Initializr 服务本身；YSS 已有受控合同和 Node generator，可借其元数据/贡献器/测试思想。 |
| Maven Archetype | Descriptor 支持 `requiredProperties`、默认值、`validationRegex`、条件 fileSet 与嵌套 module；Integration Test Mojo 可生成样例、执行 `goal.txt`、运行 verify script 并与 reference 目录比较。[Generate model](https://maven.apache.org/archetype/maven-archetype-plugin/specification/generate.html) · [Descriptor](https://maven.apache.org/archetype/archetype-models/archetype-descriptor/archetype-descriptor.html) · [Integration test](https://maven.apache.org/archetype/maven-archetype-plugin/integration-test-mojo.html) | 对每个支持矩阵建立生成 fixture；参数 validation 与条件模板机器化；生成后跑真实目标工程验证。 | 官方 `create-from-project` 也明确自动生成的 archetype 往往仍需编辑，难以自动排除所有文件或表达复杂 metadata；不能把参考工程整仓反向模板化当完成。[Create from project](https://maven.apache.org/archetype/maven-archetype-plugin/create-from-project-mojo.html) |
| JHipster / JDL | JDL 以声明式文本描述 application、deployment、entity、relationship，并通过 options 表达 dto/service/pagination/skipClient/skipServer 等选择；官方升级流程依赖 clean Git、生成提交、force regeneration 与 merge conflict 处理。[JDL intro](https://www.jhipster.tech/jdl/intro/) · [Options](https://www.jhipster.tech/jdl/options/) · [Applications](https://www.jhipster.tech/jdl/applications/) · [Upgrade](https://www.jhipster.tech/upgrading-an-application/) | 为 YSS 定义小而受控的 generation model：应用坐标、层 profile、持久化、API、命名空间、模块集合；生成/升级前强制 clean scope 和 rollback ref。 | JHipster 的广域 CRUD/UI/部署生成与 YSS“脚手架只产机械骨架、业务回 Router+TDD”不一致；其 force-regenerate/merge 模式也不宜作为默认安全策略。 |
| Spring Modulith | `ApplicationModules.verify()` 可检查 module cycle、只访问公开 API，并支持显式 allowed dependencies；module model 由 package、named interface 与自定义 detection 构成，也可选择启动时验证。[Verification](https://docs.spring.io/spring-modulith/reference/1.3/verification.html) · [Fundamentals](https://docs.spring.io/spring-modulith/reference/fundamentals.html) · [Runtime](https://docs.spring.io/spring-modulith/reference/runtime.html) | 借鉴“架构定义必须可执行”和 allowed dependency 的语义；把 YSS 技术模块/包规则转为测试。 | 当前 YSS 基线仍涉及 JDK 8 / Spring Boot 2.7，而 Spring Modulith 当前线面向更新的 Java/Spring Boot；官方 issue 也曾要求清晰兼容矩阵（[#971](https://github.com/spring-projects/spring-modulith/issues/971)）。未做兼容性 ADR 前不直接加依赖，而且 Modulith 的业务 package module 不等于现有 Maven 技术分层。 |
| ArchUnit / jMolecules | ArchUnit 可测试 package/class dependency、layer、slice cycle 和 onion architecture；`FreezingArchRule` 可先冻结历史违规并只阻止新增违规。jMolecules 提供 DDD/hexagonal/layered/onion 类型/注解及 ArchUnit/jQAssistant 校验。[ArchUnit guide](https://www.archunit.org/userguide/html/000_Index.html) · [ArchUnit source](https://github.com/TNG/ArchUnit) · [jMolecules source](https://github.com/xmolecules/jmolecules) | 优先用 ArchUnit 以 package/module 规则保护 `Domain <- Application/Web/Infrastructure` 方向；如需渐进治理，用版本库内 baseline，但 CI 禁止更新 baseline。 | `FreezingArchRule` 曾有 IDE/Maven store 差异个案（[#923](https://github.com/TNG/ArchUnit/issues/923)），冻结只应由 canonical Wrapper 流程产生。jMolecules 类型/注解会进入业务代码，未验证依赖、JDK 与“纯 Domain”偏好前仅作为可选语义层。 |
| Maven Enforcer / Wrapper | Enforcer 官方规则覆盖 dependency convergence、banned dependencies、reactor convergence、Java/Maven/plugin version；Wrapper 官方支持 `wrapperSha256Sum` 与 `distributionSha256Sum`。[Rules](https://maven.apache.org/components/enforcer/enforcer-rules/index.html) · [Dependency convergence](https://maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html) · [Banned dependencies](https://maven.apache.org/enforcer/enforcer-rules/bannedDependencies.html) · [Reactor convergence](https://maven.apache.org/enforcer/enforcer-rules/reactorModuleConvergence.html) · [Wrapper](https://maven.apache.org/tools/wrapper/index.html) | 让 Java/Maven/plugin/reactor/依赖与 Wrapper 来源成为生成工程可执行基线；用 banned dependencies 保护 Domain 不引入 Web/Infrastructure 技术依赖。 | `reactorModuleConvergence` 对 `mvn -pl subproject validate` 有官方限制；规则应在根 reactor 验证，不替代 ArchUnit 的 package-level 规则。 |
| Copier | 官方 update 模型保存 answers 与 template identity，要求 template/project 在 Git 中并保持 clean worktree，再从旧模板生成基线并与新模板做 smart update；支持冲突、pre/post migrations 和机器可读 update check。[Updating](https://copier.readthedocs.io/en/stable/updating/) · [Configuring](https://copier.readthedocs.io/en/stable/configuring/) | 扩展 `.yss/scaffold-generation.json`：模板版本/散列、规范化答案、逐文件 owner/hash、dry-run、三方 diff、迁移版本、冲突清单。 | 不必把现有生成器替换成 Copier；其模板执行/信任模型和 Python 工具链需另审，先移植演进协议。 |
| OpenRewrite | 官方 Spring recipes 能组合迁移 build、deprecated API 与 properties，适合重复、可审计的框架升级。[Boot 3 recipe](https://docs.openrewrite.org/recipes/java/spring/boot3/upgradespringboot_3_0-community-edition) · [Properties recipe](https://docs.openrewrite.org/recipes/java/spring/boot3/springbootproperties_3_0) | 将未来的模板/JDK/Boot/YSS 组件升级表达为版本化 migration recipe，而不是重跑初始 scaffold。 | recipe 的可用性、许可、内部 YSS API 覆盖和执行环境必须单独验证；不用于正常业务再生成。 |

## 6. 建议的目标合同

### 6.1 先批准 canonical target profile

基于当前 `yss-domain` 与 `yss-repository` 顶层 skill 已声明的方向，建议送审如下 target profile，而不是静默兼容 required guide 的 legacy 示例：

| 责任面 | 建议 target profile | 首切片可执行检查 |
|---|---|---|
| Domain | 只拥有聚合/实体/值对象、领域行为、不变量和 Gateway/Port；不拥有 HTTP DTO、PO、Controller。 | ArchUnit：Domain 不依赖 Web/Infrastructure；行为测试证明一个不变量。 |
| Application | 编排用例并拥有事务边界；输入/输出采用经批准的 application command/result 或明确的 port，不从 Infrastructure 返回 VO。 | 用例测试；写操作 transaction seam；无 repository 实现类型泄露。 |
| Repository / MyBatis | Infrastructure 实现 Domain Gateway；PO 与 Domain Model 由 MapStruct 转换；普通 MyBatis / Plus 只能选一个 profile，分页/排序白名单有集成测试。 | H2 或批准数据库 fixture；mapper/repository/gateway test；MapStruct 生成实现可编译。 |
| DTO / Web | HTTP Cmd/Query/VO 属于 Web/Client boundary；Controller 只调用 Application；WebConvertor 必须在实际调用链使用；wire 字段来自冻结 OpenAPI/批准字段而非全量 DB metadata。 | HTTP contract + serialization fixture；PageQuery forbidden fields 不可绑定；Controller 无 Infrastructure 引用。 |
| Exception | Domain/Application 错误语义与 HTTP 映射分离；公开消息消毒，unknown/system 保留内部 cause/stack。 | Biz/known/unknown 三类 endpoint test；状态码、错误码、message 与 OpenAPI 一致。 |

这里尚不替代“独立 client Maven module vs web module”的 ADR；先固定逻辑所有权，再决定物理模块。若必须支持 legacy profile，应使用显式 `architecture_profile=legacy-client-in-domain`，并产生迁移/兼容记录，不能靠读者猜测。

### 6.2 Manifest v2 最小字段

对 YSS 的推断：可在现有 `.yss/scaffold-generation.json` 上演进，不另造平行事实源。建议至少增加：

```yaml
schema_version: 2
generator:
  id: yss-ddd-scaffold-generator
  version: <skills-lock version>
  template_digest: <canonical asset digest>
project:
  coordinates: { group_id, artifact_id, version }
  base_package: <package>
  java_baseline: <major>
  spring_boot_baseline: <version/range>
profiles:
  architecture: target-domain-model
  persistence: mybatis-plus
  database: mysql
  validation_namespace: javax
  dto_wire_profile: yss-dto-openapi-wire-profile@1
  exception_profile: <approved profile>
ownership:
  generated_files:
    - { path, owner: generator, sha256 }
  user_owned_globs: []
compatibility:
  downstream_skills:
    yss-domain: <version/hash>
    yss-repository: <version/hash>
    yss-mybatis: <version/hash>
    yss-dto: <version/hash>
    yss-exception: <version/hash>
    yss-web-controller: <version/hash>
  architecture_ruleset: <version/hash>
evolution:
  previous_template_digest: <digest|null>
  migration_level: initial|compatible|breaking
  conflict_policy: fail-before-write
```

字段命名只是提案；最终 schema 必须由既有 scaffold contract、Router 与 lifecycle orchestration 的 SSOT 统一发布，并保持旧 Manifest 的显式迁移路径。

### 6.3 Golden first slice 验收

空工程验证保留，但新增一个小而完整的代表性切片，例如单聚合的创建、详情和分页查询：

1. 固定一份批准的 tactical contract、OpenAPI fixture 和 metadata/DDL fixture。
2. Domain 生成/实现一个有不变量的聚合及 Gateway；Application 编排 create/detail/page，并在写用例建立事务 seam。
3. Repository/MyBatis 生成 PO、Repository、GatewayImpl、MapStruct；验证排序白名单、分页传递与 `PO <-> Domain`。
4. DTO/Web 只生成冻结契约允许的字段，验证 WebConvertor 真正参与调用链，拒绝 PageQuery 内部字段。
5. Exception 覆盖 business、known system、unknown 三类，验证公开 message 已消毒并与 OpenAPI 一致。
6. 执行根目录 `./mvnw validate`、`./mvnw test`、`./mvnw package`，再执行 ArchUnit/HTTP/serialization/integration tests；结果写入统一 `YSS Skill Execution Result`。
7. 加一个故意违规的 negative fixture，例如 Domain 导入 Web DTO 或 Repository 直接返回 VO，证明架构门禁先红后绿，而不是仅证明正例可编译。

这个 fixture 才能回答“生成的骨架是否真的兼容下游技能”；它不应包含生产业务 CRUD，也不批准任何产品切片。

## 7. Opportunity map

### Fix this week

1. 形成并批准 target/legacy profile 决策：先解决 Domain DTO、Gateway 返回值、Application 输入输出、WebConvertor 调用点与 client 物理模块归属。
2. 把 golden first slice 作为新的生成兼容性验收；先测试当前冲突，再调整 SSOT 与模板，不扩大业务生成范围。
3. 将 `ARCHITECTURE.md`、Domain/Repository required guides、Web generator 和 POM 依赖按同一 profile 收敛；文档示例不得与顶层 skill 冲突。
4. 设计 Manifest v2 schema 与旧 schema migration；先加入 template digest、profile、downstream compatibility 和 file ownership。

### Fix this quarter

1. 引入 JDK 基线兼容的 ArchUnit 与 Maven Enforcer：package/layer、banned dependency、reactor convergence、Java/Maven/plugin/dependency convergence。
2. 增加生成后演进协议：`plan/dry-run`、generator-owned/user-owned、逐文件 hash、三方 diff、冲突报告、版本化 migration；默认 fail-before-write。
3. 把 generator 重构为 typed description + ordered contributors；每个已支持 profile 组合有独立 fixture，unsupported 组合前置失败。
4. 把 Wrapper URL、Maven distribution/version/checksum、repository profile 与凭证 preflight 纳入结构化证据；成功结论记录实际解析来源。
5. 让验证报告输出 phase、failing module、goal、首因、分类置信度、remediation 与已脱敏日志引用，减少正则分类带来的误导。

### Needs deeper research

1. 通过现有 YSS 实现仓与消费者访谈决定独立 client module 或 web 内 client package；不得只凭外部架构偏好决定。
2. 核验实际 YSS exception starter 的 auto-configuration、handler precedence 和 HTTP 序列化行为，再冻结 exception profile。
3. 建立 JDK 8 / Spring Boot 2.7 下可用的 ArchUnit、jMolecules、MapStruct、Lombok、MyBatis(-Plus) 精确兼容矩阵；Spring Modulith 仅在基线升级决策后评估。
4. 核验内部 Maven repository manager、TLS/镜像策略、Wrapper 分发源与 checksum 供应链要求；当前报告不推断该内网配置是否对所有团队可达。
5. 采集真实 scaffold 生成/失败分类、首切片耗时、手工改动量、重复生成冲突和支持工单，校准频率与季度优先级。

## 8. 决策建议

| 决策 | 建议 | 理由 |
|---|---|---|
| 是否生成更多业务代码 | 暂不增加 | 边界合同尚未唯一；更多生成只会放大 split-brain。 |
| 是否直接采用 Spring Initializr / Copier | 不替换现有 generator，采用元数据、贡献器、测试与演进协议 | 可保留 YSS 受控合同、路径和生命周期门禁。 |
| 是否直接引入 Spring Modulith | 暂不 | 当前 JDK/Boot 基线和模块语义需要 ADR；先用兼容的 ArchUnit/Maven 规则。 |
| 是否直接引入 jMolecules annotations | 默认不引入，可作为 opt-in 研究项 | 避免 Domain 被额外框架类型污染；先证明 package rule 足够。 |
| 是否继续支持 legacy profile | 仅显式支持 | 必须有 profile 标识、兼容范围、迁移记录和独立 fixture，禁止静默混用。 |
| 完成语义 | `empty-scaffold-verified` 与 `first-slice-compatible` 分级 | 避免把当前三条 Maven 通过误读为业务开发就绪。 |

建议的北极星不是“生成文件数”，而是：**从批准合同到首个切片通过全部门禁的时间和返工次数**。可配套跟踪：首切片一次通过率、手工修改 generator-owned 文件数、unsupported profile 前置阻断率、再生成冲突数、架构规则失败到修复时长。

## 9. Source map 与证据强弱

| 来源 | 搜索/检查范围 | 贡献 | 强弱 |
|---|---|---|---|
| 当前 YSS canonical skills/scripts/templates | generator、Domain、Repository、MyBatis、DTO、Exception、Web Controller、当前 RED/GREEN 证据 | 现状、合同冲突、配置与验证缺口 | 强，本地直接证据 |
| Spring Initializr 官方 docs/API/source | metadata、customizer/contributor、test harness | typed input、可组合生成、生成测试 | 强，官方文档/源码 |
| Maven Archetype 官方 docs | descriptor、generate、integration test、create-from-project | 参数验证、条件模块、生成项目 IT、反向模板限制 | 强，官方文档 |
| JHipster 官方 docs + GitHub issues | JDL、upgrade、overwrite/extension issues | 声明式选项与生成后升级风险 | docs 强；单 issue 的频率弱 |
| Spring Modulith 官方 docs + issue | module model、verify、runtime、兼容矩阵诉求 | 可执行模块边界、直接采用限制 | docs 强；兼容 issue 中等/需版本实测 |
| ArchUnit / jMolecules 官方 docs/source/issues | layers/onion/slices/freeze、DDD annotations | 架构测试与渐进治理 | docs/source 强；单 issue 弱 |
| Maven Enforcer / Wrapper 官方 docs | convergence、toolchain、plugin、checksum | 构建/供应链门禁 | 强，官方文档 |
| Copier / OpenRewrite 官方 docs | smart update、migration、framework recipes | 生成后演进与版本化迁移 | 强，官方文档；适配 YSS 仍是推断 |
| 内部支持/CRM/访谈 | 本轮无连接器和保存上下文 | 无法给出真实用户频率 | 缺失，需补研究 |

## 10. Workflow Execution Result

```yaml
result_schema: workflow-execution-result-v1
work_unit: work-unit.entry-triage
workflow_reference: .template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-task-2026-09-03.yaml
result: completed
skill: yss-product-lifecycle + yss-ddd-scaffold-generator + yss-tactical-design + research + product-design:research
changed_files:
  - .template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-2026-09-03.md
changed_artifacts:
  - .template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-2026-09-03.md
evidence_refs:
  - .template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-2026-09-03.md
  - .template-source/evidence/maintenance/yss-ddd-scaffold-compile-l3-checkpoint-2026-09-03.yaml
  - .template-source/evidence/maintenance/yss-ddd-scaffold-compile-red-green-2026-09-03.md
actual_verification:
  - command: test -s .template-source/evidence/maintenance/yss-ddd-scaffold-reference-research-2026-09-03.md
    exit_code: 0
deferred_seams:
  - 独立 client Maven module 与 web 内 client package 的选择需要 Tactical DDD/ADR 和现有实现仓证据。
  - YSS exception starter 的真实运行时映射、JDK 8 兼容架构测试版本和内部 Maven 供应链策略需要专项验证。
  - 缺少内部支持/CRM/用户访谈，问题频率只能按生成路径重复性估计。
drift:
  - yss-domain 顶层 target profile 与其 required domain-layer-guide 的 DTO/VO/Gateway legacy 示例不一致。
  - yss-repository 顶层 PO-Domain target profile 与其 required infrastructure-layer-guide 的 Query/VO legacy 示例不一致。
  - yss-web-controller 生成器的 DTO 物理输出、Domain import 和 Convertor 实际调用链与 target profile 不一致。
violation: []
new_impacts:
  - scaffold contract/Manifest schema、canonical generator、下游 skill required guides、Web generator、POM/templates、测试与投影同步面。
  - 需要新增 first-slice compatibility、architecture rules、wire/error contract 和 generation-evolution 验证证据。
stale_candidates: []
blocking_signals: []
next_route: work-unit.ssot-update
```

本报告是研究与分诊证据，不批准修改脚手架、不批准 Slice Implementation Contract，也不作 `release-ready` 声明。
