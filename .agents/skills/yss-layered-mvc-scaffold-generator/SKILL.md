---
name: yss-layered-mvc-scaffold-generator
description: 直接生成 YSS 分层 MVC 后端脚手架及参考工程，无需需求合同或设计审批。
---

# YSS 分层 MVC 工程生成

由 Agent 参考 [架构说明](references/architecture.md) 与保留的工程资产直接创建 server/service/repository 骨架。复用 DDD 技能资产中适用的通用 Maven 配置，按 MVC 职责改写，不引入 Domain/Gateway 层。

先确定项目名、包名、输出位置、Spring Boot / Java 及 Parent/BOM 坐标。Server 负责 HTTP 与 DTO，Service 负责用例规则和事务，Repository 负责持久化；额外模块仅在用户需求需要时添加。

需要构建时使用工程自身 ./mvnw 或已有 Maven，报告实际结果，不将文件生成描述成已经构建或发布。
