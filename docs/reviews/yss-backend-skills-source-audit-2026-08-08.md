# YSS 后端 Skills 一手源码审计（2026-08-08）

## 1. 审计结论

本次审计覆盖用户点名的 12 个去重 skill。结论不是“源码正确性审查通过”，而是判断 skill 是否准确描述、约束并安全使用当前 YSS 源码。

建议优先处理 6 个 skill 的 P0 问题：`yss-web-controller`、`yss-userinfo`、`yss-log`、`yss-audit-log`、`yss-security-algorithm`、`yss-backend-scaffold-application`。其余 6 个 skill 均有 P1 增强项，没有发现可以原样冻结且无需改进的 skill。

| Skill | 类型 | 最高优先级 | 结论摘要 |
|---|---|---:|---|
| `yss-backend-scaffold-application` | DDD / 模板型 | P0 | 系统异常指导与 `yss-exception` 源码相冲突；示例还把特定质量模块当成通用规范 |
| `yss-web-controller` | 生成器 / 模板型 | P0 | 生成器让所有写操作直接调用 Domain Gateway，绕过 Application；输出文件名说明与脚本不一致 |
| `yss-dto` | 源码组件型 | P1 | 主干约定基本准确，但遗漏泛型 `Serializable`、工厂方法返回码差异和分页对象真实行为 |
| `yss-userinfo` | 源码组件型 | P0 | 推荐使用的工具直接解析未验签 JWT；header `userCode` 赋值存在反向条件；skill 把实际流程描述得过于安全、确定 |
| `yss-log` | 源码组件型 | P0 | 把 `CatchAndLog` 描述成异常日志能力，但实现只记录 DEBUG 入参和成功路径耗时 |
| `yss-audit-log` | 源码组件型 | P0 | SpEL 上下文不是方法参数；两个订阅器开关没有控制订阅器注册或执行 |
| `yss-exception` | 源码组件型 | P1 | 三分类准确，但遗漏全局处理器实际 HTTP 映射、`level` 的真实作用和栈输出细节 |
| `yss-validation` | 源码组件型 | P1 | EL Parser 描述基本准确；`validation-jsr303` 实际只有依赖和消息资源，没有自有接入代码 |
| `yss-security-algorithm` | 源码组件型 | P0 | 已有安全提醒过于温和；源码含硬编码 RSA 私钥、重启变化密钥和默认 `noop` 密码编码器 |
| `yss-domain` | DDD / 模板型 | P1 | 目标方向合理，但未说明是目标架构；参考源码的现存模型仍是贫血对象并依赖 VO |
| `yss-repository` | DDD / 模板型 | P1 | 固定使用 `PO` 命名不足以覆盖现有 `Entity + BaseRepository` 体系；应先探测持久化风格 |
| `yss-router` | 治理 / 合同型 | P1 | 核心合同严谨，但长尾组件只有“不可用则阻断”，没有可执行的影响触发与依赖闭包 |

## 2. 审计范围与证据规则

- 模板仓库身份：`repository_mode: template-source`。
- 实现源码根：`/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice`。
- 实现源码快照：branch `dev`，commit `0057b9bec6a54c7b98e3f889fd37afe15d6c0257`，审计时工作树干净。
- 模板仓库快照：branch `main`，commit `f4c2ed58d81ac723b7fdd3029403f3eee00bdc05`，审计前工作树干净。
- 一手资料仅使用上述两个仓库中的源码、POM、README、skill、生成脚本和 Router 合同资产；没有使用二手文章。
- 源码组件型 skill 以具体 Java/POM/资源实现为准。DDD/Router 模板型 skill 不应假装由组件源码定义，改用样例模块结构、生成器和本仓库合同资产佐证。
- 优先级：P0 表示会生成错误分层、虚假能力或明显安全风险；P1 表示会导致高概率误用、排障方向错误或合同漏项；P2 表示准确性、可维护性和可验证性增强。

下文 `SRC` 指 `/Users/zhudaoming/Documents/yss-project/yss-cloud-microservice`，`TPL` 指 `/Users/zhudaoming/Projects/yss-spec-project-template`。

## 3. 按 Skill 审计

### 3.1 `yss-backend-scaffold-application`

**已核实事实**

- 当前源码确有 `core/service/impl`、`@Service`、构造器注入和写方法事务边界。`SqlTemplateConfigServiceImpl` 在类级使用 `@Service` / `@RequiredArgsConstructor`，并在新增、更新、删除方法使用 `@Transactional(rollbackFor = Exception.class)`：`SRC/yss-microservice-components/yss-component-sql-tpl-parent/core/src/main/java/com/yss/cloud/sql/tpl/service/impl/SqlTemplateConfigServiceImpl.java:35`、`:57`、`:75`、`:110`。
- Application 中使用 MapStruct `INSTANCE` 是现有实践：`SRC/yss-microservice-components/yss-component-sql-tpl-parent/core/src/main/java/com/yss/cloud/sql/tpl/convertor/SqlTplConfigConvertor.java:16`、`:20`。
- 现有 Application 代码确实承担规则编排，例如名称/编码验重、资源绑定检查、版本变化：`SqlTemplateConfigServiceImpl.java:59`、`:80`、`:85`、`:93`。

**偏差与缺口**

- **P0**：skill 写“系统异常抛出 `RuntimeException`”，与 `yss-exception` 的一手实现冲突。组件提供 `ExceptionFactory.sysException(...)`，且 `SysException` 才是已知系统异常类型：`SRC/yss-microservice-components/yss-component-exception/src/main/java/com/yss/cloud/exception/ExceptionFactory.java:32`、`:49`；`.../SysException.java:14`。继续保留当前表述会绕过统一错误码、tips 和 cause 语义。
- **P1**：skill 自称“YSS 数据质量管理服务”通用规范，示例类也绑定 `QualityTemplate*`，但参考仓库存在 Tag、SQL Template、Taskflow 等不同结构。应将产品专有示例降为“历史样例”，避免误判为唯一包结构。
- **P1**：skill 用绝对表述要求核心领域逻辑下沉 Domain；而参考源码的规则主要仍在 Application。目标方向可以保留，但必须明确“目标架构约束，不是对现有源码的描述”，并给出迁移/兼容判断。
- **P2**：缺少事务传播、只读事务、事件发布时点、幂等键、当前用户获取和审计日志触发条件的检查项。

**建议**

1. 把系统异常规则改为：已知系统异常优先 `ExceptionFactory.sysException(...)` 并保留 cause；未知异常不在 Application 随意吞并，由全局处理器兜底。
2. 将示例改为中性 `{Domain}AppService`，或引用 `SqlTemplateConfigServiceImpl` 的可追溯片段。
3. 增加“现有工程探测”：确认 service/core/application 模块、事务落点、Gateway 返回类型和事件机制后再生成。

### 3.2 `yss-web-controller`

**已核实事实**

- 参考源码的 Controller 注入 Application Service，而不是直接执行写 Gateway。Tag Controller 注入 `TagService`：`SRC/yss-microservice-components/yss-component-tag-parent/core/src/main/java/com/yss/cloud/tag/controller/TagManageController.java:37`、`:41`、`:124`、`:131`；SQL Template Controller 同样注入 `SqlTemplateConfigService`：`SRC/yss-microservice-components/yss-component-sql-tpl-parent/core/src/main/java/com/yss/cloud/sql/tpl/controller/SqlTemplateConfigController.java:29`、`:34`、`:116`、`:118`。
- 参考源码使用 `@Valid @RequestBody` 和 `SingleResult` / `MultiResult` / `PageResult`：`TagManageController.java:48`、`:64`、`:125`。

**偏差与缺口**

- **P0**：生成脚本把新增、更新、删除全部编译为 `Gateway` 直接调用：`TPL/.agents/skills/yss-web-controller/scripts/generate_controller.py:198` 至 `:211`。Controller 模板直接持有 Gateway：`TPL/.agents/skills/yss-web-controller/assets/templates/Controller.java.template:25`，并在写接口调用这些表达式：`:49` 至 `:70`。这与参考源码、`yss-backend-scaffold-web` 的“写操作必须注入 Application Service”以及 Router 的端到端 Application 强制闭包相冲突。
- **P0**：生成的 Controller 请求体没有 `@Valid`：`Controller.java.template:33`、`:51`、`:60`，会使脚本生成的 `@NotBlank` / `@NotNull` 约束不生效。
- **P1**：SKILL 预期输出 `*PageQuery.java`，脚本实际生成 `${Domain}Page.java`：`TPL/.agents/skills/yss-web-controller/scripts/generate_controller.py:195`、`:270`。
- **P1**：脚本假定 Gateway 已有固定命名和固定返回类型，但没有读取真实 Gateway 接口或编译验证；例如它假定 `getXById(id).orElse(null)`：`generate_controller.py:199`。参考源码 Gateway 既有直接返回 null 的 `get`，也有不同分页返回类型：`SRC/.../SqlTplConfigGateway.java:13`、`:17`。
- **P2**：模板固定使用 Swagger 2 `io.swagger.annotations`，没有依据冻结 OpenAPI 或工程实际依赖探测：`Controller.java.template:11`、`:12`。

**建议**

1. 立即将写接口改为调用 Application Service；只有合同明确批准的纯查询 CQRS 才允许读 Gateway，并在生成输入中显式声明。
2. 为所有需要校验的 body 增加 `@Valid`，并生成 API/契约测试。
3. 统一 `Page` / `PageQuery` 命名，生成前解析真实 Application 接口，生成后必须执行目标仓库 `./mvnw ...`。

### 3.3 `yss-dto`

**已核实事实**

- `QueryDTO extends CommandDTO`，`PageQuery extends QueryDTO`：`SRC/yss-microservice-components/yss-component-dto/src/main/java/com/yss/cloud/dto/QueryDTO.java:3`；`.../page/PageQuery.java:6`。
- 分页字段实际为 `pageSize`、`pageIndex`、`orderBy`、`orderDirection`、`groupBy`，默认页大小 10、页码 1：`PageQuery.java:14` 至 `:40`。
- `SingleResult`、`MultiResult`、`PageResult` 均存在且继承 `Result`：`.../SingleResult.java:5`、`.../MultiResult.java:9`、`.../PageResult.java:14`。

**偏差与缺口**

- **P1**：skill 没有提醒三个结果类型的泛型上界是 `T extends Serializable`。生成 VO 或响应对象不实现 `Serializable` 会直接编译失败：`SingleResult.java:5`、`MultiResult.java:9`、`PageResult.java:14`。
- **P1**：工厂方法并非统一设置成功码。无参 `buildSuccess()` 设置 `DM-A0001`，但 `buildSuccess(String message)` 不设置 code：`SRC/.../Result.java:67` 至 `:85`；各派生类型也复制了这种差异。skill 只说“统一返回”，不足以指导契约测试。
- **P1**：`PageQuery.needTotalCount` 标注“暂时未实现”，且与 `tempTotalCount` 一起被 `@JsonIgnore`：`PageQuery.java:42` 至 `:55`。skill 应明确总数由 Repository/分页拦截器回填，而不是客户端输入。
- **P2**：组件 `readme.md` 当前为空。skill 应以源码为主并标记“无可用组件说明”，避免“先读文档”产生虚假确定性。

**建议**

1. 增加 `Serializable`、工厂方法 code/message/tips 差异和分页默认值的契约检查表。
2. 明确 `orderBy` / `groupBy` 不得直接拼 SQL，必须由 Repository 白名单映射。
3. 补一组源码级结果包装示例，不要只列类名。

### 3.4 `yss-userinfo`

**已核实事实**

- 工具初始用户为 `system`：`SRC/yss-microservice-components/yss-component-userinfo-starter/src/main/java/com/yss/cloud/user/AuthUserInfoUtil.java:55` 至 `:58`。
- 它先读三个 header；缺少 username 时读取 Bearer token；之后尝试 Redis：`AuthUserInfoUtil.java:62` 至 `:95`。
- Redis 使用 `CacheType.REDIS` 和 `DATA_MIDDLE_CACHE_JWT_USERINFO`：`AuthUserInfoUtil.java:91`。

**偏差与缺口**

- **P0 安全**：代码使用 `JWTUtil.parseToken(jwtToken)` 后直接信任 `sub`、`loginDisplayName`、`email`、`userCode`，没有验证签名、issuer、audience 或 expiration：`AuthUserInfoUtil.java:71` 至 `:78`。skill 当前“优先使用该工具”会把解析误表述为认证。必须明确只有受信网关已验证且防伪传播的上下文才可消费，不能把该工具当 JWT 验证器。
- **P0 正确性**：header 分支设置 `userCode` 的条件反了：`Objects.nonNull(usercode) ? "" : usercode`，导致存在 header 时写空串：`AuthUserInfoUtil.java:80` 至 `:84`。skill 应加入已知缺陷告警，修复源码前不得声称 userCode header 路径可靠。
- **P1**：skill 描述“headers、JWT、Redis”的线性 fallback 不够精确。header 路径不会立即返回，仍会查 Redis并可能覆盖；JWT 路径则立即返回：`AuthUserInfoUtil.java:69` 至 `:83`、`:91` 至 `:108`。
- **P1**：非 REST 场景捕获所有异常后仍用空字符串查 Redis，最后返回 `system`：`AuthUserInfoUtil.java:85` 至 `:108`。应区分“无用户上下文”和真实系统用户，避免审计归属混淆。

**建议**

1. 在 skill 顶部增加安全门禁：不把 `parseToken` 当验签；认证决策必须依赖安全组件或网关已验证的不可伪造上下文。
2. 在源码修复前列出 `userCode` header 已知缺陷，并要求测试 header/JWT/Redis/background 四条路径。
3. 明确每条路径的返回与覆盖顺序，加入缺失/伪造 header、过期 JWT 和缓存 miss 测试矩阵。

### 3.5 `yss-log`

**已核实事实**

- `@CatchAndLog` 只可标注方法：`SRC/yss-microservice-components/yss-component-log-starter/src/main/java/com/yss/cloud/log/CatchAndLog.java:13`。
- 切面在 DEBUG 下逐个 JSON 序列化请求参数，并在成功返回后记录耗时：`.../CatchLogAspect.java:25` 至 `:33`、`:40` 至 `:45`、`:49` 至 `:65`。
- 自动配置通过 `spring.factories` 注册：`SRC/yss-microservice-components/yss-component-log-starter/src/main/resources/META-INF/spring.factories:1`。

**偏差与缺口**

- **P0**：skill 把该能力描述为“method-level exception logging”，但 `joinPoint.proceed()` 外没有 catch/finally；目标方法抛异常时既不记录异常，也不记录耗时：`CatchLogAspect.java:25` 至 `:33`。内部 catch 只处理“日志序列化自身失败”，不能等同业务异常记录：`:43` 至 `:45`、`:62` 至 `:65`。
- **P1 安全**：实现会序列化每个参数，没有脱敏、大小限制或 Servlet/流对象过滤：`CatchLogAspect.java:54` 至 `:61`。skill 虽写“avoid secrets”，但没有可执行检查或禁止对象清单。
- **P1**：`pointcutAll()` 声明后未被 Around 使用：`CatchLogAspect.java:19` 至 `:25`。skill 不应把 public-method pointcut 当实际行为。
- **P2**：README 是日志平台选型和示例配置，不是 starter API 合同；skill 应把“平台架构建议”和“当前注解真实能力”分开。

**建议**

1. 将 capability 名称改为“DEBUG 请求参数与成功耗时日志”，删除异常日志承诺。
2. 增加敏感字段/大对象/流/Servlet 参数禁用规则，并要求脱敏验证。
3. 若确需异常日志，先修改组件并补失败路径测试，再更新 skill；不能只改文案假装已有能力。

### 3.6 `yss-audit-log`

**已核实事实**

- `@AuditLog` 默认 `isNeedArgs=true`、`isNeedResult=false`：`SRC/yss-microservice-components/yss-component-audit-log/src/main/java/com/yss/cloud/audit/AuditLog.java:34` 至 `:43`。
- 切面只在 `@AfterReturning` 触发，因此只审计成功返回：`.../AuditLogAspect.java:96` 至 `:98`。
- 异步发布使用容量 1000 的 `ArrayBlockingQueue`、10 个固定线程；队列满时仅记错误并丢弃消息：`.../YssAuditPublishService.java:18` 至 `:19`、`:28` 至 `:44`。

**偏差与缺口**

- **P0**：skill 检查“summary 中 SpEL 变量名是否与方法参数名一致”，但源码没有把参数名放入 SpEL context。根对象只有 `"参数审计"` / `"结果审计"` 两个 map entry：`AuditLogAspect.java:101` 至 `:124`。正则还只允许 ASCII 字母数字等有限字符：`:57` 至 `:61`。当前排障指引会引导到错误方向。
- **P0**：`sendSysManageEnabled` 和 `auditLogPrintEnabled` 会进入配置属性，但 `AuditConfiguration` 无条件注册两个订阅器：`SRC/.../EnableAuditLog.java:19` 至 `:21`；`.../AuditConfiguration.java:26` 至 `:33`；`.../AuditConfigurationProperties.java:11` 至 `:14`。订阅器实现也不检查开关：`.../YssAuditLogPrintSubscriberImpl.java:33` 至 `:36`；`.../YssAuditLogSysManagerSubscriberImpl.java:14` 至 `:17`。skill 当前“检查开关是否禁用订阅器”的说法与实现不符。
- **P1**：注解允许 TYPE 和 METHOD，但 pointcut 仅使用 `@annotation`，类型级 `@AuditLog` 不会被该切面命中：`AuditLog.java:15`；`AuditLogAspect.java:97`。
- **P1 安全**：默认审计全部参数，只有 Servlet、ServletResponse、File、InputStream 做特殊处理，没有字段脱敏：`AuditLogAspect.java:199` 至 `:213`。
- **P1**：登录结果中的 `id_token` 同样只解析不验签：`AuditLogAspect.java:144` 至 `:160`。
- **P2**：队列丢弃、线程池关闭、失败重试和监控指标均没有 skill 级可观测性门禁。

**建议**

1. 用源码支持的 context key 重写 SpEL 指南，并给出经过测试的模板；若期望方法参数名语义，先改组件和测试。
2. 明确标注两个 subscriber 开关当前不生效；源码修复后再提供配置示例。
3. 增加成功/异常审计语义、敏感字段脱敏、队列满、下游失败、进程关闭和幂等性测试矩阵。

### 3.7 `yss-exception`

**已核实事实**

- README 的三分类与 skill 一致：Biz 不需 Error/Retry，Sys 需 Error/可 Retry，未知 Exception 需完整栈/可 Retry：`SRC/yss-microservice-components/yss-component-exception/readme.md:5` 至 `:9`。
- `ExceptionFactory` 同时提供业务与系统异常工厂，并支持保留 cause 的 `sysException`：`.../ExceptionFactory.java:15` 至 `:29`、`:32` 至 `:54`。

**偏差与缺口**

- **P1**：skill 把 `YssGlobalExceptionProperties` 泛称为“输出/logging 行为”，实际只有 `yss.exception.level` 一个字符串，且仅在值精确等于 `debug` 时执行 `printStackTrace()`：`SRC/.../YssGlobalExceptionProperties.java:11` 至 `:13`；`.../advice/GlobalExceptionAdvice.java:221` 至 `:225`。
- **P1**：全局处理器把 Biz、未知 Exception、RuntimeException 都映射为 HTTP 400：`GlobalExceptionAdvice.java:53` 至 `:71`、`:80` 至 `:93`。这会影响 OpenAPI 错误响应和客户端重试，skill 未提示。
- **P1**：BizException 虽不调用 `log.error`，但默认 `level=debug` 时仍 `printStackTrace`：`GlobalExceptionAdvice.java:53` 至 `:57`、`:221` 至 `:225`。skill 的“通常不记录 Error 栈”需要描述实际差异。
- **P2**：校验异常由全局 Advice 映射为 `SysException(PARAM_VALIDATION_ERROR)`，不是 BizException：`GlobalExceptionAdvice.java:146` 至 `:175`。应与 `yss-validation` / `yss-web-controller` 联动说明。

**建议**

1. 增加“组件当前 HTTP/错误码真实映射”表，不把异常分类理论等同当前 Advice 行为。
2. 明确 `level` 的唯一实际作用和默认值，禁止声称它可配置响应内容。
3. Application skill 统一引用 `ExceptionFactory`，并要求 OpenAPI/契约测试覆盖错误状态与 body。

### 3.8 `yss-validation`

**已核实事实**

- `validation-jsr303` POM 引入 `spring-boot-starter-validation`、`validation-api`，并提供中文/英文消息资源：`SRC/yss-microservice-components/yss-component-validation-jsr303/pom.xml:15` 至 `:38`；`.../src/main/resources/messages.properties:1` 至 `:22`。
- `ExpressParserFactory` 是 Spring `@Component`，可选注入 `List<ExpressParser>`，按 `parserType().getType()` 注册到并发 Map：`SRC/yss-microservice-components/yss-component-validation-engine-parent/validation-el-parser/src/main/java/com/dogsong/liteflow/editor/parser/factory/ExpressParserFactory.java:20` 至 `:42`。
- 内置 parser 使用 `@Component`，例如 IF parser：`.../parser/el/IfConditionParser.java:32` 至 `:37`。

**偏差与缺口**

- **P1**：`validation-jsr303` 没有 Java 源码、自有 auto-configuration、Advice 或 Validator；`readme.md` 为空。它当前是依赖和消息资源模块。skill 的“Spring/JSR-303 integration and annotation-driven validation behavior”表述过宽，应避免让 Agent 在这里寻找不存在的接入实现。
- **P1**：skill 建议“先读 readme.md”，但该文件为空，无法作为权威行为说明。
- **P1**：Factory 的 `register` 先调用 `parser.parserType()`，后才断言 parser 非空：`ExpressParserFactory.java:36` 至 `:41`。skill 不应声称 null parser 有清晰断言保护。
- **P2**：缺少 parser type 冲突规则；当前 `PARSER_MAP.put` 会静默覆盖相同 key：`ExpressParserFactory.java:41`。

**建议**

1. 把 JSR-303 子模块描述为“依赖与消息资源聚合”，Controller/Service 是否生效由 Spring 注解、starter 和全局 Advice 共同验证。
2. 将空 README 标记为不可用证据，直接引用 POM、资源和 `GlobalExceptionAdvice`。
3. 对自定义 EL parser 增加 bean 扫描、重复 type、null type、注册顺序和 round-trip 测试。

### 3.9 `yss-security-algorithm`

**已核实事实**

- `CryptoType` 的确包含 RSA、AES、DES、SM2、SM4：`SRC/yss-microservice-components/yss-component-security-algorithm/src/main/java/com/yss/cloud/CryptoType.java:3` 至 `:8`。
- `SecurityCryptoUtil` 根据该枚举分支加解密：`.../SecurityCryptoUtil.java:36` 至 `:71`。

**偏差与缺口**

- **P0 安全**：源码直接包含完整 RSA 私钥和公钥常量：`SecurityCryptoUtil.java:77`、`:78`。skill 只写“built-in/static key material in places”过于含糊；必须明确禁止生产使用，并要求密钥泄露处置/轮换，而不是只建议“不要新增”。
- **P0 安全/可用性**：SM2 key pair 在类加载时随机生成，重启后无法解密旧密文：`SecurityCryptoUtil.java:73` 至 `:75`。SM4 key material也是固定常量和固定 hex：`:43` 至 `:44`、`:62` 至 `:63`、`:76`。
- **P0 安全**：`DefaultJwtConfiguration` 注释称默认 BCrypt，但实际 `encodingId = "noop"`，并注册 `NoOpPasswordEncoder`：`SRC/.../DefaultJwtConfiguration.java:30` 至 `:43`、`:51`。
- **P1**：JWK 每次启动动态生成，没有持久化或轮换机制；重启会使旧 token 无法用原 key 验证：`DefaultJwtConfiguration.java:23` 至 `:27`。
- **P1**：skill 提到 `KeyGeneratorUtils`，但该类和方法都是 package-private：`SRC/.../KeyGeneratorUtils.java:33`、`:37`、`:47`。不能作为业务模块公共 API 推荐。
- **P2**：RSA/SM2、AES/DES/SM4 的编码、模式、padding、IV 和密文格式未形成稳定合同。

**建议**

1. 将本 skill 默认路由设为 `blocked-for-production`：除非合同提供外部密钥来源、轮换、算法参数、兼容测试和安全审查证据。
2. 明确列出硬编码 RSA 私钥、SM2/JWK 重启变化、`noop` password encoder 三个现有高危事实。
3. 把 `SecurityCryptoUtil` 定位为兼容/迁移参考，不作为新生产能力模板。

### 3.10 `yss-domain`

**已核实事实**

- 参考源码存在 Domain 对象和 Gateway，但并非完整富领域模型。`SqlTplConfig` 是 Lombok 数据对象，字段中直接依赖 VO：`SRC/yss-microservice-components/yss-component-sql-tpl-parent/core/src/main/java/com/yss/cloud/sql/tpl/domain/SqlTplConfig.java:3` 至 `:8`、`:15` 至 `:19`、`:63` 至 `:71`。
- Gateway 仍直接接收 Query DTO、返回 VO：`SRC/.../gateway/SqlTplConfigGateway.java:3` 至 `:7`、`:13`、`:33`。

**偏差与缺口**

- **P1**：skill 的富领域约束是合理目标，但没有明确说明它是模板目标架构，不是 `yss-cloud-microservice` 当前普遍实现。直接说“参考源码证明 YSS 就是这种 DDD”不成立。
- **P1**：产物范围只列 Entity/Gateway，遗漏 Value Object、Domain Service、Domain Event、不变量测试和聚合持久化边界；与 skill 自己的“状态机/领域规则”目标不对称。
- **P1**：skill 允许“顺带补 client DTO/VO”，容易让 Domain 实现任务越过 API/合同边界；Router 已要求冻结 OpenAPI 与允许写路径，Domain skill 应默认不生成 client 契约。
- **P2**：没有为遗留 Gateway 的 DTO/VO 泄漏提供迁移策略或受控例外。

**建议**

1. 明确分为“目标 DDD 模式”和“遗留兼容模式”，后者必须记录 drift / migration seam。
2. 扩充产物与测试：Aggregate、Value Object、Domain Service/Event、不变量和状态迁移测试。
3. 从默认产物移除 client DTO/VO，API 影响必须回 Router/生命周期处理。

### 3.11 `yss-repository`

**已核实事实**

- 参考 Tag 模块的持久化对象叫 `TagEntity`，使用 JPA 注解和 Lombok `@Data`：`SRC/yss-microservice-components/yss-component-tag-parent/repository/src/main/java/com/yss/cloud/tag/entity/TagEntity.java:5` 至 `:18`。
- Repository 接口扩展 YSS `BaseRepository<Entity, ID>`：`SRC/.../repository/TagRepository.java:3` 至 `:6`。
- GatewayImpl 放在 repository 模块，依赖 Repository 并通过 MapStruct 转换：`SRC/.../gateway/impl/TagGatewayImpl.java:3`、`:10` 至 `:18`、`:26` 至 `:43`。
- SQL Template 的 GatewayImpl 同样使用 `Entity + BaseRepository/Wrapper + Convertor`，但 Query/VO 仍穿过 Gateway：`SRC/yss-microservice-components/yss-component-sql-tpl-parent/repository/src/main/java/com/yss/cloud/sql/tpl/gateway/impl/SqlTplConfigGatewayImpl.java:3` 至 `:14`、`:33` 至 `:55`。

**偏差与缺口**

- **P1**：skill 固定产出 `*PO.java`，而参考源码主要使用 `*Entity.java`、`@Entity`、`BaseRepository`。必须先探测工程持久化风格，不能仅根据模板偏好重命名或并存两套模型。
- **P1**：skill 说事务位于 Application，但参考源码也把事务放在 GatewayImpl：`TagGatewayImpl.java:47`、`:55`、`:62`、`:69`、`:90`。应要求识别并统一事务 owner，避免双层注解掩盖传播语义。
- **P1**：现有实体使用 `@Data`，而 skill 禁止实体 `@Data`。这是合理治理改进，但必须标为“新代码门禁/遗留 drift”，不能声称参考源码已符合。
- **P2**：缺少对 `BaseRepository` / ExampleWrapper、JPA 注解、MyBatis starter、逻辑删除和审计基类的分支探测表。

**建议**

1. 生成前识别 `Entity`/`PO` 命名、`BaseRepository`、Mapper/Wrapper、主键和审计基类，输出选中的 persistence profile。
2. 在合同中唯一指定事务 owner；GatewayImpl 事务仅作为明确架构选择或遗留例外。
3. 将 `@Data` 命中记为需审查的遗留 drift，不做无上下文批量替换。

### 3.12 `yss-router`

**已核实事实**

- 状态约束、readiness、合同字段、工作单元字段和重路由触发器均有结构化定义：`TPL/.agents/skills/yss-router/references/router-contract.yaml:1` 至 `:33`、`:53` 至 `:72`、`:115` 至 `:150`。
- Router 明确禁止输出 `approved` / `ready-for-agent` / `completed`：`router-contract.yaml:2`、`:3`。
- 核心后端闭包包含 Domain、Application、Repository、Web、DTO、MapStruct、Lombok 和 Alibaba：`router-contract.yaml:74` 至 `:106`。
- Execution Result 要求验证命令真实结果和时间，且 `new_impacts` 非空时暂停：`TPL/.agents/skills/yss-router/references/yss-skill-execution-result.md:48` 至 `:59`。

**偏差与缺口**

- **P1**：Router skill 声称会检查“长尾 skill”，但 `dependency_closure` 只为核心分层和前端 skill 定义规则；本次 6 个长尾组件型 skill（`yss-userinfo` / `yss-log` / `yss-audit-log` / `yss-exception` / `yss-validation` / `yss-security-algorithm`）没有影响触发或闭包规则，`yss-dto` 也只作为 Web 闭包依赖出现：`router-contract.yaml:74` 至 `:93`。
- **P1**：`impact_flags_required` 只有 UI/API/data/backend/cross-repo，没有 auth-context、audit-log、validation、exception-contract、crypto/key-management、technical-log 等安全/合规影响：`router-contract.yaml:15` 至 `:23`。因此“长尾不可用则 blocked”无法稳定执行，因为没有先判定何时必需。
- **P1**：`yss-web-controller` 闭包虽强制 Application 出现在端到端集合，但 Router 没有验证生成器是否让 Controller 写操作绕过 Application。当前仅靠 skill 名出现不能阻止错误生成模板。
- **P2**：缺少源码版本/commit 或 source-index freshness 字段；组件行为变动后合同仍可能消费旧索引。

**建议**

1. 增加长尾影响矩阵和条件闭包：认证用户上下文 -> `yss-userinfo`；业务审计 -> `yss-audit-log`；技术日志 -> `yss-log`；错误契约 -> `yss-exception`；DTO 校验 -> `yss-validation`；密码/加密/JWT key -> `yss-security-algorithm` + 强制人工安全审查。
2. Backend 合同增加 `security_impacts`、`audit_impacts`、`user_context_source`、`exception_mapping`、`sensitive_logging`、`source_evidence_ref`。
3. `forbidden_patterns` 增加 Controller 写操作直接调用 Gateway、未验签 JWT claim 作为认证依据、硬编码 key、`DelegatingPasswordEncoder("noop", ...)`。

## 4. 建议实施顺序

### P0：先阻断错误生成和安全误用

1. `yss-web-controller`：写接口改走 Application，补 `@Valid`，修复输出命名和接口探测。
2. `yss-userinfo`：skill 增加未验签告警和已知 `userCode` bug；源码另立修复任务。
3. `yss-log`：纠正能力边界，加入敏感参数规则。
4. `yss-audit-log`：纠正 SpEL/开关/成功路径语义，加入脱敏与丢消息约束。
5. `yss-security-algorithm`：默认阻断生产接入，强制密钥和密码编码安全审查。
6. `yss-backend-scaffold-application`：统一 `SysException` / `ExceptionFactory` 语义。

### P1：补齐真实行为和路由闭包

1. `yss-router` 加入长尾组件条件路由和禁止模式。
2. `yss-dto`、`yss-exception`、`yss-validation` 增加真实源码语义和契约测试矩阵。
3. `yss-domain`、`yss-repository` 明确目标架构与遗留兼容模式，先探测现有工程再生成。

### P2：可维护性与证据刷新

1. 为组件 skill 增加源码 commit / index generated-at / freshness 检查。
2. 为生成器建立最小 metadata fixture，并用临时工程执行 `./mvnw ...` 编译测试。
3. 将空 README、历史示例和目标规范明确分类，避免它们被当成同等级权威事实。

## 5. 仍存不确定性

- 用户指定仓库是组件与部分样例模块仓库，不是所有 YSS 业务实现仓库；因此 DDD/Application/Repository/Web 结论只能证明“当前仓库中的真实样例”，不能证明所有外部项目都采用同一结构。
- 本次没有修改或运行实现源码，也没有验证生产网关是否已在到达服务前强制清洗用户 header、验证 JWT；这不改变 `AuthUserInfoUtil` 本身未验签的源码事实。
- 本次没有验证外部配置中心是否覆盖 `DefaultJwtConfiguration`、`yss.audit.*` 或密码编码器 Bean；skill 仍应按源码默认行为设置安全门禁，而不能依赖未提供的部署约定。
- 本审计是优化输入草案，尚未经过独立 Reviewer，也没有执行 `writing-skills` RED/GREEN/REFACTOR 修订；不得据此声称 skills 已修复、模板可合并或可发布。
