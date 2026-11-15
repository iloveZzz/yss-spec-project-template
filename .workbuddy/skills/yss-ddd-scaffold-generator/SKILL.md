---
name: yss-ddd-scaffold-generator
description: 在新目录生成 YSS DDD 多模块 Java 空工程。已有工程按现有分层增量维护。
---

# YSS DDD 工程生成

## 先选择操作

- 新建 DDD 工程时，先读取 `yss --version`、`yss scaffold catalog --json` 和 `yss scaffold ddd --help`。现装 CLI 支持目标平台及参数时，使用 `yss scaffold ddd` 生成。
- 已有工程的功能开发、修复或重构，先读取现有代码、POM 和约定，按 [分层实现路由](references/layer-skill-routing.md) 增量维护。
- 仅安装 Backend 技能时，使用 `setup-yss-harness` 按实际帮助执行 `init/attach --profile backend --installation skills`。
- CLI 缺失时先使用 `setup-yss-harness` 安装。现装 CLI 缺少目标能力时，先说明版本或平台限制，再按 [资产使用边界](references/standalone-generation.md) 评估 fallback。

## 新建工程

当前默认生成只需五项工程参数 `--project-name`、`--base-package`、`--output-dir`、`--group-id`、`--project-version`，默认 YSS `4.0.0-SNAPSHOT` / Boot `4.1.2` / Java `17`。显式值优先，仅补齐唯一组合；歧义按提示补参数，未知版本需明确 Parent 等缺项。 参数示例见 [CLI 命令](references/command-examples.md)，平台选择见 [平台说明](references/platform-selection.md)。

目标工程目录必须不存在，包括空目录。核对写入授权、路径、符号链接和 Git 子模块边界，保留 CLI 的输入、版本兼容校验与文件保护。`--dry-run` 仅预览，实际生成使用去掉该参数的命令。

当前 CLI 生成 DDD 空骨架、POM、机械启动配置、Maven Wrapper 和 `.yss/scaffold.json` 来源收据。分层职责见 [架构说明](references/ARCHITECTURE.md)。`assets/reference` 是教学资料，业务 API、领域实现、教学 reference 和架构测试均需按后续需求另行实现。

生成完成后按 [产物核对](references/generation-workflow.md) 检查实际文件。构建或运行按当前任务需要使用工程根 `./mvnw`，报告实际结果。仅要源码时交付生成结果。已要求项目技能时，沿用本轮核验的 CLI 继续 `attach --root <生成目录> --profile backend --installation skills`，保留接入冲突现场。
