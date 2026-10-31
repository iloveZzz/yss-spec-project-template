---
name: yss-ddd-scaffold-generator
description: 直接生成 YSS DDD 多模块后端脚手架，无需需求合同或设计审批。
---

# YSS DDD 工程生成

由 Agent 直接使用本技能保留的 assets 与 references 创建工程，不调用仓库生成脚本。输入为项目名、包名、输出位置、Spring Boot / Java 版本及 Maven Parent/BOM 坐标；已有工程配置可直接复用，缺少的关键版本先查询资料或询问用户。

按 [架构说明](references/ARCHITECTURE.md) 保持 DDD 模块职责和依赖方向。参考 assets/reference 中的目录与文件内容，替换项目、包、模块和版本占位符；按实际需求生成骨架，不自动添加业务样例或测试套件。

新工程写入明确授权的位置，已有文件先读取并保留用户内容，不覆盖已有工程或空子模块挂载。需要 Maven Wrapper 时使用现成工程或可用 Maven 的标准能力；不要捏造 Wrapper 二进制。

不要求需求合同、批准、登记、兼容报告或测试门禁。构建或运行只有在当前任务需要时使用工程自身 ./mvnw，并说明实际结果；生成成功不等于运行成功。
