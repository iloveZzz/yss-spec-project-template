---
name: yss-layered-mvc-scaffold-generator
description: 在新目录生成 YSS 分层 MVC Java 空工程。已有工程沿用服务层和持久层增量维护。
---

# YSS 分层 MVC 工程生成

## 先选择操作

- 新建 MVC 工程时，先读取 `yss --version`、`yss scaffold catalog --json` 和 `yss scaffold mvc --help`。现装 CLI 支持目标平台及参数时，使用 `yss scaffold mvc` 生成。
- 已有 MVC Service、Controller 或 Repository 的维护，先读取现有代码、POM 和工程约定，使用适用 YSS 分层技能增量编辑。Service 继续承担用例规则和事务。
- 仅安装 Backend 技能时，使用 `setup-yss-harness` 按实际帮助执行 `init/attach --profile backend --installation skills`。
- CLI 缺失时先使用 `setup-yss-harness` 安装。现装 CLI 缺少目标能力时，先说明版本或平台限制，再读取 项目根 `.agents/skills/yss-ddd-scaffold-generator/references/standalone-generation.md` 评估资产 fallback。

## 新建工程

当前默认生成只需五项工程参数 `--project-name`、`--base-package`、`--output-dir`、`--group-id`、`--project-version`，默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。显式值优先，仅补齐唯一组合；歧义按提示补参数，未知版本需明确 Parent 等缺项。 参数示例见 [CLI 命令](../yss-ddd-scaffold-generator/references/command-examples.md)，DDD 与 MVC 使用相同参数集合。

目标工程目录必须不存在，包括空目录。核对写入授权、路径、符号链接和 Git 子模块边界，保留 CLI 的输入、版本兼容校验与文件保护。`--dry-run` 仅预览，实际生成使用去掉该参数的命令。

按 [架构说明](references/architecture.md) 核对 `server/service/repository` 空骨架、POM、机械启动配置、Maven Wrapper 和 `.yss/scaffold.json` 来源收据。项目根 `.agents/skills/yss-ddd-scaffold-generator/assets/reference` 保留为教学资料。业务 API、Service 规则、持久化实现和教学 reference 按后续需求另行实现。

构建或运行按当前任务需要使用工程根 `./mvnw`，报告实际结果。仅要源码时交付生成结果。已要求项目技能时，沿用本轮核验的 CLI 继续 `attach --root <生成目录> --profile backend --installation skills`，保留接入冲突现场。
