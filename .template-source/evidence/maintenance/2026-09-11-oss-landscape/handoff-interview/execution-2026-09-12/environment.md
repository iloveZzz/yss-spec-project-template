# 最小运行环境与部署身份查证

日期：2026-09-12。结论：工具入口部分可用，真实试验运行前提仍未闭合；没有证据证明已有五项身份探针。本文是只读查证与待决定的具体准备方案，不是接入、探针实现或部署批准。

## 已核实的工具

| 项目 | 实际结果 | 边界 |
|---|---|---|
| Java | `java -version` exit 0，Corretto OpenJDK 1.8.0_462 | 满足根 pom.xml:22–24 的 Java 8 目标；未证明依赖/构建可用 |
| Maven | PATH 无 `mvn`；已缓存 Maven 3.6.3，直接 `-version` exit 0 | 根 `mvnw`、wrapper jar/properties 存在，properties:17 指向3.6.3分发；未运行 wrapper，避免在路径不匹配时下载；构建继续优先 wrapper |
| Node | `node --version` exit 0，v23.9.0 | 满足前端 package.json 的 >=18 声明，不等于各依赖已兼容 |
| pnpm | `pnpm --version` exit 0，10.15.0 | 与 packageManager 声明一致；node_modules目录存在，不证明安装完整或锁文件一致 |
| Docker | `docker --version` exit 0，29.1.3 | 只读CLI版本；未连接daemon、检查镜像或启动容器 |
| PostgreSQL | PATH 无 `psql` | 不证明机器上没有服务；没有连接任何数据库 |
| Redis | PATH 无 `redis-server` | 不证明机器上没有服务；没有连接任何Redis |

仅这些检查已执行。没有安装、构建、测试、启动、业务数据读取或外仓文件修改。

## 实际工程入口与最小依赖

后端根为 `/Users/zhudaoming/yss-valuation-outsourced`，前端为其独立Git仓 `valuation-outsourced-frontend`。根身份缺失已由上级记录，本任务仅做迁移/接入前只读盘点。

- 后端 `README.md:131–146,165–180` 提供 wrapper构建、JAR启动和本地档位；`valuation-outsourced-starter/src/main/java/com/yss/datamiddle/valuation/YssValuationOutsourcedApplication.java:25–35` 启用缓存、审计、分布式ID、目录管理、Feign和跨模块扫描。预览调用链窄，不代表完整starter启动依赖自动缩减。
- `README.md:204,230–240` 说明私有YSS依赖、数据库、Redis、Nacos及文件管理依赖；本地档位可避开Nacos，但未验证全starter能在只有PG时启动。未读取settings.xml、env或bootstrap密钥内容。
- `docs/file-sync-rollout-runbook.md:11–19,26–28,40–60` 要求控制表、目标支持表、业务目标表和受管资源；DDL不由应用/集成测试自动执行。`FILE_SYNC_ENABLED=false`会关闭Controller，不能以此“成功启动”证明预览可用。
- 前端 `package.json:8–25,80–85`、`packages/vite.config.ts:13–20,37–42,74–80` 提供standalone、API代理和mock插件。真实试验应核实目标请求确实由Java响应；开发模式启用mock，不能只看页面有数据。优先使用已存在standalone构建路径，避免以mock结果计成功；具体静态服务/API同源方式待执行前固定。

建议最小环境仍为本地独立PG控制库和目标库/表、独立Redis（若完整装配需要）、真实starter、真实Vue。以小型合成任务和空表/有行两组数据验证；不运行同步/发布业务。不应直接沿用共享Nacos或现有数据库。私有Maven/npm依赖可解析性、daemon/镜像、后台任务隔离开关与完整starter装配均为未知，必须在隔离副本实际验证；工具版本检查不能替代它们。

## 已有部署身份来源是否足够

对后端 `docs`（排除scratch/archive）、README、根/启动模块POM检索 `build-info`、`git-commit-id`、`BuildProperties`、`GitProperties`、五身份字段、revision_pointers和actuator/info，rg exit 1无匹配。启动POM:237–241只声明Spring Boot Maven插件，没有在所查文件显式配置build-info执行。已有starter target下未找到build-info.properties或git.properties。

根`.github`、`deploy`、`deployment`、Dockerfile不存在；docker目录存在，但本次未发现说明构建身份的非配置文件或匹配字段。未读取其中环境yaml，避免暴露凭据。父POM/私有依赖或仓外平台仍可能提供信息，本次没有其证据，不能断言绝不存在探针。

接收器 `scripts/lib/frontend-delivery.mjs:53–72` 允许任意同origin revision_path与JSON Pointer，五项必须精确匹配：deployment_id、source_commit、openapi_digest、artifact_digest、test_data_digest。若现有平台能提供全部字段，必须提交实际路径、来源和服务绑定证明后复用；仅有Git版本号或/actuator/info不足以覆盖五项。本次不连接共享平台验证。

## 最小探针提案（待单独决定，不实施）

推荐在真实Java进程中增加仅试验档位启用的身份读取入口，避免独立Node响应器与实际JAR脱节。具体待改路径：

1. 新增 `valuation-outsourced-starter/src/main/java/com/yss/datamiddle/valuation/delivery/DeliveryIdentityController.java`，在独立试验profile下提供GET `/internal/delivery-identity`。JSON字段或包装可遵循现有项目规范，由revision_pointers映射；不更改目标预览业务API。默认不启用。
2. 新增同目录 `DeliveryIdentityProvider.java`，从随构建生成的来源清单、精确OpenAPI资源、实际运行JAR和只读试验清单读取/校验，不从请求参数回显期望值。字段缺失、格式错误或文件不匹配时身份不可用，不返回猜测值。
3. 新增 `scripts/pilot/build-delivery-identity` 与 `scripts/pilot/launch-delivery-trial`（拟议名），并在启动模块POM内增加仅试验profile执行的资源生成。实际目录与脚本语言按后续接入合同统一；本轮不创建。这些脚本负责冻结源码、产出清单、启动固定JAR、记录退出码，不自动批准合同。
4. 新增 `valuation-outsourced-starter/src/test/java/com/yss/datamiddle/valuation/delivery/DeliveryIdentityControllerTest.java` 与 `DeliveryIdentityProviderTest.java`；具体公开seam与测试合同需后续批准。

| 字段 | 建议来源和绑定 | 必须防止的问题 |
|---|---|---|
| source_commit | 构建时从选定、可追溯提交读取并生成资源；若试验采纳未提交快照，须另有明确源码树摘要与基线规则，不能让HEAD代表脏树 | 不写死SHA、不直接把交付包期望值当事实 |
| openapi_digest | 构建时复制获准OpenAPI原始字节至运行资源，启动时SHA-256；构建后不得悄悄格式化 | “文档同名但字节不同” |
| artifact_digest | 对实际被启动的最终JAR原始字节SHA-256，启动记录与进程所加载路径核对 | 摘要不能再嵌回被哈希的JAR造成自引用；源码运行/类目录不冒充JAR |
| deployment_id | 启动一次生成唯一ID，以只读运行清单传给该进程并与进程启动证据绑定 | 不能复用旧进程ID或只修改期望包 |
| test_data_digest | 合成数据seed＋schema版本＋规范化基线快照清单的SHA-256；实际库读回校验与清单一致后才登记 | 仅hash SQL脚本文本不证明实库状态；试验期间数据变动使已有基线失效 |

端口只绑定回环；不把数据库地址、账户、密钥、绝对敏感路径暴露在响应或日志。既有接收器支持authorization_env，若确需鉴权由运行合同规定，不能猜配置。

该探针提供部署身份与输入绑定，不证明业务实现正确，也不是防恶意篡改的远程证明。真实预览空/有数据API与Vue结果仍需独立执行验证。若测试数据在服务启动后发生变化，应重建基线并重启/刷新受控身份；不能继续声称旧digest描述当前数据。

## 验证与回滚方案

实施获准后先验证：缺字段/摘要错拒绝；同一JAR和清单稳定；换JAR或OpenAPI、换数据基线能检测；正常profile不暴露试验端点；五项同进程HTTP值与独立构建/实库证据一致。之后才进入S0，S0成功前不计故障试验成功。Java执行优先根`./mvnw`，Vue用`pnpm`；实际退出码、锁定版本与日志摘要同时记录。

所有拟议改动仅在登记隔离副本实施。回滚停止试验进程、移除本次专用输出和profile配置、恢复所选基线；不操作共享服务或原仓，不删除批准来恢复。清理数据库只允许确认归属于本次试验的实例/库，由启动清单界定，不能以模糊库名删除。

## 查证记录与限制

CodeGraph第一次误在模板根运行后已在正确后端根重跑（exit0）；后端检索未更新索引。文档/POM身份检索独立捕获exit1，表示无匹配，不与后续命令成功混淆。一次尝试读取后端不存在的workflow schema路径失败，未据此推断业务行为；交付结果使用上级已有workflow-execution-result-v1表达。未运行wrapper，缓存Maven版本使用既有二进制在/tmp只读执行，不作为绕开wrapper的构建证据。

本任务可读范围内盘点与具体方案已完成。产品试验S0–S6/O1未执行，环境状态为未就绪，探针实施与实际接入仍交由主控处理原Q12边界。

JSON语法验证：任务包指定的node JSON.parse命令实际执行，exit 0。仅证明结构可解析。
