# R3 同进程部署身份探针：实现准备输入

日期：2026-09-12。用户已授权R1–R3；本任务仅准备已授权范围的技术输入，未写Java、未批准合同、未运行构建或试验。正式设计、OpenAPI和Slice合同由新建backend-governance承接，本文只是模板源研究证据。

## 推荐实现

在真实starter同一进程提供GET `/internal/delivery-identity`。使用现有Web依赖，Java8兼容；只有Spring `delivery-trial` profile与显式 `yss.delivery-trial.enabled=true` 同时满足才注册Controller和Provider，默认档位不加载资源、不暴露入口。Maven `delivery-trial`只负责试验资源打包，不自动开启运行时profile。进程监听回环，继承原预览API，禁止添加Controller回显请求期望值的路径。

拟落点严格沿用已授权范围：

- `valuation-outsourced-starter/src/main/java/com/yss/datamiddle/valuation/delivery/DeliveryIdentityController.java`
- 同目录`DeliveryIdentityProvider.java`
- 对应`src/test/java/.../delivery/`下Provider、Web与启用条件测试
- `valuation-outsourced-starter/pom.xml`的独立试验profile
- `scripts/pilot/build-delivery-identity`、`scripts/pilot/launch-delivery-trial`及专属生成输出

主应用`YssValuationOutsourcedApplication.java:34`扫描`com.yss.datamiddle`，拟议package在扫描范围内；starter POM:109已有Web依赖、114已有测试依赖，237-241声明Spring Boot Maven插件。不要新增服务或把探针放Node服务。

## Maven资源和档位必须处理的事实

starter `pom.xml:312-326` 当前只包含过滤后的`**/*.yml`和不做过滤的`logback-spring.xml`。因此把JSON/YAML合同随意放src/main/resources并不能可靠保留原字节：新增profile须明确将`target/pilot-resources/`作为额外资源目录，`filtering=false`，仅包含`META-INF/yss-delivery-trial/`的合同和来源清单，保留原resources设置。构建脚本先清理专属生成目录，复制已冻结OpenAPI**原字节**，记录前后SHA-256；重打包后从最终JAR读取并比较资源字节。

同POM `basic`、`valset-standardizer-fm2spv`和`discovery-nacos`目前activeByDefault（154-233）。显式启用新profile会使同POM默认profile失活，这是[Maven官方规则](https://maven.apache.org/guides/introduction/introduction-to-profiles)。因此构建记录必须明确列出本试验采纳的完整profile集合并核对有效依赖，不能默默移除业务模块。若原基线需要保持默认装配，候选命令是`./mvnw -pl valuation-outsourced-starter -am -Pbasic,valset-standardizer-fm2spv,discovery-nacos,delivery-trial package`；运行时仍采用隔离本地配置阻止连接共享Nacos。是否需改变该集合由实际装配检查决定，本文没有执行或确认构建成功。

## 五字段来源和验证

建议使用现有SingleResult包装，成功载荷`data`包含以下字段；最终JSON Pointer与真实序列化一致（建议`/data/<field>`，冻结前Web测试核实）。不要求改变业务预览API。

| 字段 | 事实来源 | Provider须核验 | 独立接收证据 |
|---|---|---|---|
| source_commit | 随构建打包的来源清单中固定基础提交 | 40位Git提交；manifest包含补丁与源码树摘要，不能把工作区HEAD当完整实现 | Git基础对象＋允许补丁逐文件hash＋源码树manifest＋构建日志 |
| openapi_digest | JAR内部`META-INF/yss-delivery-trial/preview-openapi.yaml`原字节 | 计算SHA-256，与打包manifest一致；不是从请求/交付包注入的期望字符串 | 已冻结合同原文件与JAR资源原字节相同 |
| artifact_digest | 本次实际`java -jar`启动的最终可执行JAR字节 | 只允许正式JAR启动，拒绝类目录/IDE启动；启动时计算，并在探测时检查文件未被替换 | launcher计算JAR摘要、真实路径、进程启动记录；最终JAR摘要不可嵌回本JAR |
| deployment_id | 启动器每次启动生成的新ID，写入单次运行清单 | 当前进程只接受该启动清单；重启生成新ID，不复用上次run目录 | 同一启动记录包含ID、JAR摘要、PID/启动时间，HTTP在该进程端口响应 |
| test_data_digest | 冻结的`test-data.json`原字节：schema/seed版本、目标表结构、规范化合成数据读回基线 | 对当前实库执行固定只读校验，确认与冻结基线一致后返回**文件摘要**；不同则503不可用 | 建库/seed实际退出码、独立实库读回、JSON原字节摘要与交付environment.test_data绑定 |

这里的test_data_digest必须等于接收器要求的`delivery.environment.test_data.digest`，即说明文件原字节SHA-256；不能一端返回SQL文件hash、另一端返回查询结果hash。查询结果的规范化摘要应作为test-data.json的内容，再以文件摘要作为协议值。

数据范围固定为隔离控制库中选中任务的配置记录及该任务目标表；所有表名/列名在受审阅准备输入中列明，不能从HTTP参数或任意文件拼接SQL。只读连接、固定顺序、固定类型序列化、短超时；先验证字段类型与主键，再比较规范化快照。空表与有行作为两个独立数据基线，分别重新生成说明、批准交付依据并启动；不在旧部署里更新数据后继续返回旧摘要。只读探针的查询不应触发文件同步/调度业务。

若为了证明数据身份必须增加超出已授权两类/脚本路径的业务适配或修改现有业务Gateway，应记录准确差异回主控，不自动扩大源码范围。Provider可通过显式的试验数据校验seam注入读取器，在其单元测试中隔离文件/JAR/JDBC；真实试验须使用真实JDBC读取器，不能以mock通过作为S0。

## JAR身份避免自引用和回显

先形成来源manifest与精确合同资源，再构建最终JAR，之后单独计算产物摘要；不得把该最终摘要写回JAR。launcher参数必须指向固定、不可变的最终JAR，记录绝对真实路径并拒绝符号链接或临时类目录。Provider从实际JVM类路径/启动方式核对该JAR，校验资源来自本进程；Boot嵌套JAR路径解析必须以打包后的实际启动测试证明，不能仅凭IDE单测假定成功。可用启动参数只传JAR路径与单次运行清单路径，不传五个期望摘要；任何路径均局限本次隔离区。

每次启动创建独立run目录和不可覆盖manifest；成功响应只输出必要身份值，不输出数据库URL/账户/秘密、源码路径或数据内容。字段缺失、非法格式、JAR/资源/数据不匹配、读取超时统一形成可定位诊断，并返回非2xx（建议503）。GET无请求体、不接受身份值参数；错误响应不回显秘密。不要把异常吞掉后填默认SHA。

## 未提交探针补丁与source_commit语义

本次没有Git提交授权。R3实现后仍可构建可追溯的`基础提交＋有限补丁`，但不能声称source_commit包括探针本身。建议在正式合同明确：source_commit是基础提交`714fd4223d202b29c410d4d5533913e44874b3f1`；完整源码身份由supporting_files中的`source-provenance.json`补充，包含base_commit、允许路径逐文件原/新hash、补丁hash、源树manifest hash、实际构建命令和工具版本，artifact_digest指向该输入生成的最终JAR。

现有`backend-delivery.schema.json:131-146`的build对象禁止额外字段，仅允许source_commit/artifact_digest，故不向build硬塞source_tree_digest。schema已有supporting_files，包工具复制并hash它们，但未观察到接收器验证补丁与构建语义的专用逻辑。必须如实区分：自动接收证明包字节绑定和服务匹配；完整补丁来源关系还需本试验的独立构建验证和审阅证据。若正式合同或独立接收方要求每个产物都对应包含全部实现的不可变Git提交，则在单独取得提交授权前停下；不制造假SHA或借哈希格式伪装提交。

源码树manifest排除.git、target、日志、生成资源、专属运行目录，但应覆盖实际构建消费的受管源码/POM/scripts与允许补丁；依赖版本和artifact坐标另记。源manifest与自身不互哈希，最终JAR生成后独立记录。不能仅hash两Java文件却声称固定完整编译输入。

## 最小验证集（待正式合同批准后执行）

1. Provider：实际资源SHA；缺/坏manifest；错JAR/资源/数据；进程重启ID变化；可空字段无伪默认；读取失败不返回有效身份。
2. Controller：默认profile和缺显式开关时无端点；双启用后返回标准JSON五字段；异常非2xx；查询参数不改变任何身份值。
3. 打包检查：无filtering；精确合同字节进入最终JAR；最终JAR哈希不嵌回；保持所选业务profile集合；不包含凭据。
4. 同进程集成：真实JAR启动，五项HTTP值与独立构建/数据库读回记录一致；换JAR/数据或重启后旧身份失效；明确禁用mock与共享环境配置。
5. 预览基线：真实PG空/有行、scope默认CURRENT，真实Vue调用本进程；此项独立于探针单元测试与模板9项合成测试。

候选单测入口优先根`./mvnw -pl valuation-outsourced-starter -am -Dtest=DeliveryIdentityProviderTest,DeliveryIdentityControllerTest -Dsurefire.failIfNoSpecifiedTests=false test`；命令范围和最终测试类由正式Slice合同确定。本文无任何测试“已通过”结论。

## 当前交接与确切阻塞

- 新backend-governance的yss-project.yaml已确认project-instance，AGENTS与CONTEXT已读；读取时CONTEXT仍是初始化模板、没有本试验业务术语/文首合同。R1由主控进行当前词汇对账，不在本证据目录伪造产品Context。
- 正式当前OpenAPI/技术设计/实现合同和必要批准尚待R1/R2/R3正常流程。R1–R3范围授权已经存在，无需重复询问是否允许研究或起草；范围授权不能替代当前字节批准。
- 具体PG schema/目标表/只读查询和部署配置由环境准备资产给出；本任务不读取密钥或实际业务数据。
- 本方案已具备可审阅路径、身份来源、失败条件、验证和源码补丁语义。没有新业务源码，未将本文件作为正式Slice合同。

回滚限定隔离副本本轮允许路径和登记试验进程，保留原始日志、批准、失败与源码基线。不删原仓、不抹除批准以恢复。
