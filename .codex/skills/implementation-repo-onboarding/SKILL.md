---
name: implementation-repo-onboarding
description: Use when connecting an existing frontend, backend, fullstack, or other implementation Git repository to this Harness repository. Produces a repository registry, baseline findings, validation commands, known gaps, and Harness write-back guidance without cloning, committing, pushing, or changing the implementation repository unless explicitly requested.
---

# Implementation Repo Onboarding

用于把已有前端、后端或其他实现仓库接入当前 Harness / 研发管理仓库。默认只做只读扫描和文档记录，不改实现仓库。

## Inputs

- 外部仓库 URL 或本地路径。
- `repo_role`: backend / frontend / fullstack / other。
- 目标 feature / change 名称。
- 可选：默认分支、CI 平台、验证命令、OpenAPI 位置。

## Workflow

1. 确认当前仓库是 Harness 仓库，读取 `docs/process/implementation-repo-integration.md`。
2. 如果输入是本地路径，只读检查 Git remote、当前分支、目录结构、构建文件和测试脚本。
3. 如果输入是远端 URL，优先使用只读 Git 查询；需要 clone 时只能 clone 到临时目录，不能 clone 到 Harness 仓库内。
4. 识别技术栈、包管理器、CI、测试命令、构建命令、OpenAPI 接入和设计 token 接入。
5. 按 `docs/templates/implementation-repo-registry-template.md` 输出实现仓库登记内容。
6. 列出 `known_gaps`、人审点、fresh verification 命令和需要回写到 Harness change / Issue / checkpoint 的信息。

## Baseline Checks

| repo_role | 必查项 |
|---|---|
| backend | 构建工具、模块结构、测试命令、OpenAPI 产出、YSS DDD 基线、数据库 / 迁移红线 |
| frontend | 包管理器、框架、路由、YSS UI / Ant Design、Orval / API client、设计 token、lint / type-check / build |
| fullstack | 前后端边界、契约生成方式、独立测试命令、CI 阶段拆分 |
| other | owner、构建 / 测试 / 发布命令、与 Harness change 的关系 |

## Boundaries

- 不直接提交、推送、创建 MR / PR 或修改实现仓库。
- 不把实现仓库源码复制进 Harness 仓库。
- 不把缺失命令编造为已存在；找不到时标记 `unknown` 或 `需人工确认`。
- 触碰认证、授权、SQL、迁移、加密、公共基础库 API 时标记 `TODO-HUMAN-REVIEW`。

## Output

- 实现仓库登记草案。
- 工程基线发现。
- known gaps 和补齐计划。
- fresh verification 命令。
- Harness 回写位置建议。
