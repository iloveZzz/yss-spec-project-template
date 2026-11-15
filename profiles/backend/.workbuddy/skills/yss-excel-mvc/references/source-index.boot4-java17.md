# yss-excel-mvc Source Index

Index schema: `backend-component-source-index-v2`
Platform line: `boot4-java17`
Generated: 2026-11-16
Source commit: `ad2642dd05527c073eb1da1213843b1130b44703`
Component worktree: `working-tree`
Source status SHA-256: `3821d54a47c93935fff8e516d777ebc27a0e764e83d7bc09d236cbca89b3dc75`
Source content SHA-256: `ab507485a5ff5451302b72e30a4a0e8887151a9491c85434d44a9ebff07f0b72`
Indexed source root: set `YSS_SOURCE_ROOT_BOOT4_JAVA17` to the matching readable source checkout.

路径以该环境变量对应的源码根为基准，可按模块GAV定位。HEAD描述提交基线，当前未提交B1/B2/B3改动由内容摘要另行标识。内容摘要算法与本轮C2一致，将相对路径到文件SHA-256的映射按Python `json.dumps(sort_keys=True, separators=(",", ":"))` 序列化后计算SHA-256，文件集合为Git tracked及非ignored untracked文件。它描述采集时源码，消费工程仍需核验实际解析构件。

## Component Path Hints

- `yss-microservice-components/yss-component-excel-mvc` — HEAD tree `f8f453ef6dadfcc638f9c9a1c235244bb1d4c0f9`，当前内容 `sha256:87932c9eef5b3f852280a1f617c2fe4998bba3ffc7c387379cf7e50b7f93a3e9`

## Inherited POM Identity

- `pom.xml` — `sha256:57cf2619ba118c89d8bf99c9c4fee0784e07842573d2d2dab3aeb1767308fb74`
- `yss-components-bom/pom.xml` — `sha256:bdc7a61153352abf186f9e4da29cc00dc3af0c994ed901d83dd0e3d90c64ed83`
- `yss-microservice-components/pom.xml` — `sha256:10067db08f0f01332e870098610298070991a566b965659849572d7dd9db3bb1`

## Maven Modules

- `yss-microservice-components/yss-component-excel-mvc/pom.xml` — GAV `com.yss.cloud:yss-component-excel-mvc:4.0.0-SNAPSHOT`，parent `com.yss.cloud:yss-microservice-components:4.0.0-SNAPSHOT`

## Platform Signals

- Java `17`，Spring Boot `4.1.2`，Spring Cloud `2025.1.4`，Spring Cloud Alibaba `2025.1.0.0`。
- 本索引记录当前候选源码入口，具体本地消费与未测范围见平台目录对应candidate配方的verification_scope。远程发布与宿主原生验证分别确认。

## Current API and Configuration

- RequestExcel/ResponseExcel为MVC注解，EnableExcelMvc显式导入FastExcelAutoConfiguration，该配置也通过AutoConfiguration.imports注册并受Servlet条件约束。
- yss.excel.mvc默认上传20MiB、最多5文件和10万行，ZIP默认minInflateRatio=0.01、entry=100MiB、text=10MiB。
- 当前POM使用Fesod Sheet 2.0.2-incubating、provided spring-boot-starter-webmvc、Jakarta Servlet与Validation，根POI统一5.5.1。ExcelUtils提供read/readBatches/write/writeMap，精确重载参数读当前源码。

## Auto-configuration Metadata

- `yss-microservice-components/yss-component-excel-mvc/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — `com.yss.excel.mvc.config.FastExcelAutoConfiguration`

## Key Java Entry Points

- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/annotation/EnableExcelMvc.java` — `sha256:e8c6d751fd66d4337d52d63aa519db3f1dc13abfb1581c1c852bbc94a6d44591`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/annotation/RequestExcel.java` — `sha256:8b3a9880352ae6efbd737748e4f9ec352e614b98b689810e9d2b1f43fdaef0a8`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/annotation/ResponseExcel.java` — `sha256:7afc2c69bf8691144da1d59fd8c42f9ba99329eecb5ce768a8902cee48248fbd`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/config/ExcelMvcProperties.java` — `sha256:1eb5715e3c1bba1cac8a6dc7ee48a5cd73cc0c2e5adcfa781907ea6d09dae51a`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/config/FastExcelAutoConfiguration.java` — `sha256:e09eccdf169854371eab5f5baf2b0645c252d788a7d5d8e976b386bd33ebda9e`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/exception/ExcelDataValidationData.java` — `sha256:ff5551647d78055cbac8fb40181a21e80e6fbe91f5a817415af66f8844ff6441`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/exception/ExcelDataValidationException.java` — `sha256:185433dd49e556a1a5b20077fcb83e71bf7338401f444636c20ea33221b92579`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/exception/ExcelMvcExceptionHandler.java` — `sha256:a5f26a8ecc5fb598ea7e1e56c5c33278df9c5f558e6a2a0b3cfa9eb14d44d2d0`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/handler/RequestFastExcelArgumentResolver.java` — `sha256:3f58472aca575af28cc9eb3df6cd6c17b66acd5098a23f3f90464e462b70ea62`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/handler/ResponseFastExcelReturnValueHandler.java` — `sha256:c5bcb7f1e61104172df10e500d530e7a100925e32bf83be4615e03b650973fca`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/model/ExcelDynamicData.java` — `sha256:15c6aefc8a17ca06aa4b9fac5ff6e0a1688c93da8fc12be60a89c5f577c5f0f9`
- `yss-microservice-components/yss-component-excel-mvc/src/main/java/com/yss/excel/mvc/util/ExcelUtils.java` — `sha256:8160e43a3e92dd5f88f3932bc06c9a50b35f338edd6fa88ea829d38901436927`

## Freshness and Use

- 新建工程使用默认Boot4配方时读取本索引。已有工程先读POM/effective POM与实际解析依赖，再选择对应平台线。
- 当前源码与索引不同时读取相关差异，并说明影响。实际源码或构件不可读时保留未知事实。
- 仅按当前任务读取入口。索引刷新及受管镜像同步由对应维护授权覆盖。
