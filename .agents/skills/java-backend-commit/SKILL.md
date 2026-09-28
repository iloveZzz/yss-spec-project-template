---
name: java-backend-commit
description: "为 Java 后端改动生成提交信息、审查原子提交或修复 Git hook；用户明确要求提交时执行 git commit。"
---

# Java 后端规范提交

## 触发条件

- 用户要求为 Java 后端项目生成 commit message、检查提交规范或执行 `git commit`。
- 需要将跨层改动（接口、领域、持久化、迁移、测试）拆分为可独立构建和回滚的原子提交。
- commitlint、`commit-msg` 或 `pre-commit` hook 拒绝提交，需要按规则修复。
- 适用于 Java、Spring Boot、Maven、Gradle、单体服务和多模块后端仓库。

## 不适用场景

- Vue、React 等前端或微前端仓库：在目标前端 profile 使用已安装的 `frontend-commit`；本 profile 不臆造跨目录链接。
- yss-ui 组件库仓库自身的提交与发版：遵循目标组件库已安装的提交规范；不存在对应 skill 时读取其贡献指南和 hooks。
- 仅请求代码实现，不涉及提交信息或 `git commit` 操作。
- 无代码改动，或改动内容与提交请求不匹配。
- 合并提交、发布提交、自动依赖机器人提交和数据库基线发布：遵循仓库专用流程，不套用本技能的常规模板。

## 执行合同

先读取 [公共提交合同](../git-commit-core/SKILL.md)，再读取 [专项 scope 与示例](references/scope-and-examples.md)。公共合同负责授权、暂存保护、消息格式、hook 和提交后核验，本入口负责以下专项判断。

读取根 pom.xml 或 Gradle 构建和相关模块；优先 ./mvnw、./gradlew 验证。scope 依次为仓库枚举、artifactId/子项目、服务/限界上下文、跨模块能力；不按 controller/service/repository 拆分提交。已在共享环境执行的 Flyway/Liquibase 版本迁移不得静默改写，须报告风险；数据库基线发布遵循专用流程。

无代码改动或请求与改动不匹配时停止。多个逻辑变更无法安全拆分时先给出拆分方案；发现凭据或意外大文件只报告路径。不以更换 type、删除破坏性标记或绕过 hooks 掩盖规则冲突。
