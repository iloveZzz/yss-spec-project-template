# 直接生成开发脚手架

用户要求生成 MVC 或 DDD 工程骨架时即可调用对应技能，不需要需求合同、原型确认、技术/数据/API 设计审批、tracker、checkpoint 或 `scaffold_status`。生成器未收到任何合同或批准参数时默认直接生成；`--standalone` 保留为可选的显式写法。

显式传入任意合同或批准参数时走正式路径，残缺、不可读、无效或过期合同报错，不回退成直接生成。已有正式治理任务继续消费当前批准的合同；用户新提出的纯脚手架请求不因工作区存在其他治理资产而被阻断。

先收集项目名、Java 包名、输出父目录、DDD/MVC 架构、精确 Spring Boot / Java 平台，以及完整项目、父 POM 和 YSS BOM 版本。平台模板配方来自共享清单；独立路径不要求该组合已有正式兼容验收，也不声明它已经兼容。缺少输入时向用户获取，不能猜版本、使用 `latest` 或伪造合同。

两种生成器使用相同参数。将下面的值替换成用户已经明确提供的输入，在对应 Skill 根目录执行：

```bash
node scripts/generate_scaffold.mjs \
  --project-name my-service --base-package com.yss.myservice \
  --output-dir /path/to/backend-container \
  --platform-profile spring-boot-3.5-jdk21 \
  --spring-boot-version 3.5.16 --java-version 21 \
  --group-id com.yss.example --project-version 1.0.0-SNAPSHOT \
  --parent-group-id com.yss.cloud --parent-artifact-id yss-cloud-microservice \
  --parent-version 3.0.0-SNAPSHOT --yss-components-version 3.0.0-SNAPSHOT
```

DDD 生成固定五模块及嵌套 Web 模块；MVC 生成 `server/service/repository` 三模块。业务空工程不初始化治理实例、Git、产品 API、生产数据库或批准记录。默认附带 examples/reference/ 独立参考工程；--without-example 禁用，--with-example 显式启用，两者互斥。独立 Manifest v2 绑定示例输入与所有权；旧 v1 不追加样例。数据分析入口退役，改用通用 MVC 后按需单独运行 setup-yss-harness。

目录、gitlink、挂载、initialize-only 和凭据守卫同时适用于独立路径。目标项目目录必须不存在；禁止覆盖已有项目或用 `--force` 绕过限制。`--standalone` 不接受任何合同或批准参数。

需要构建验证时改用 `generate_and_verify_scaffold.mjs`，追加 `--evidence-dir /path/outside/project`。它实际执行根 `./mvnw validate/test/package`，复用 [Maven settings 规则](engineering-checks.md)。配置缺失时保留已生成骨架，记录未执行命令的前检失败并获取配置；依赖、测试或打包失败时记录实际失败，不宣称构建完成。

独立清单是 `.yss/scaffold-generation.json`，`kind=standalone-backend-scaffold`、`generation_mode=standalone-generation`。它记录明确输入、模板和生成文件摘要，固定 `platform_verification=unverified`、`readiness.lifecycle_approved=false`、`readiness.ready_for_agent=false`，不携带合同或批准字段。仅生成时为 `generated` / `verification.status=not-executed`；三条实际验证均成功后为 `standalone-scaffold-verified`。实际验证状态和日志引用单独记录，不提升共享平台资格。

生成后即可开展工程开发，无需为使用骨架补建治理合同。独立结果不替代正式治理的业务批准、API Freeze 或 Slice Implementation Contract；之后选择接入 Harness 时按既有工程接入流程补齐设计与当前合同。

历史独立 v1 和正式 v4 Manifest 可用 `scripts/audit-legacy-backend-scaffold --project-root <工程目录>` 只读核验所有权与文件摘要，不隐式追加示例，也不重新授予平台、生成或生命周期资格；当前平台重新验收仍要求当前生成器与验证器指纹。
