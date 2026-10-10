---
name: frontend-commit
description: "为前端改动生成提交信息、审查原子提交或修复 Git hook；用户明确要求提交时执行 git commit。"
disable-model-invocation: true
---

# 前端规范提交

## 触发条件

- 用户要求为前端项目生成 commit message、检查提交规范或执行 `git commit`。
- 需要将混合改动拆分为原子提交，或评估当前暂存区是否可以安全提交。
- commitlint、`commit-msg` 或 `pre-commit` hook 拒绝提交，需要按规则修复。
- 适用于 Vue、React、TypeScript、JavaScript、Vite、微前端和前端 monorepo 仓库。

## 不适用场景

- yss-ui 组件库仓库自身的提交与发版：回到 yss-ui 源仓库使用其 `categories.library` 提交流程；该类 skill 不随业务模板分发。
- Java、Spring Boot、Maven、Gradle 后端仓库：回交目标后端 profile 的 `java-backend-commit`；本 profile 不臆造跨目录链接。
- 仅请求代码实现，不涉及提交信息或 `git commit` 操作。
- 无代码改动，或改动内容与提交请求不匹配。
- 合并提交、发布提交和自动依赖机器人提交：遵循仓库专用流程，不套用本技能的常规消息模板。

## 执行合同

先读取 [公共提交合同](../git-commit-core/SKILL.md)，再读取 [专项 scope 与示例](references/scope-and-examples.md)。公共合同负责授权、暂存保护、消息格式、hook 和提交后核验，本入口负责以下专项判断。

读取 package.json、lockfile 和 workspace，按 pnpm 与仓库脚本执行相关测试、类型检查、lint 或构建。scope 依次为仓库枚举、包/应用、业务模块、共享能力；不用 views/hooks/文件名兜底。

无代码改动或请求与改动不匹配时停止。多个逻辑变更无法安全拆分时先给出拆分方案；发现凭据或意外大文件只报告路径。不以更换 type、删除破坏性标记或绕过 hooks 掩盖规则冲突。
