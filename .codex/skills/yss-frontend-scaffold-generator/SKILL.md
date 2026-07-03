---
name: yss-frontend-scaffold-generator
description: Use when creating a new YSS frontend micro-application from the standard frontend template. The target template is the template branch of the YSS frontend template Git repository. This v1 skill defines the required inputs, safety checks, template workflow, and Harness registration evidence; it does not include an automated scaffold script yet.
---

# YSS Frontend Scaffold Generator

用于从标准 YSS 前端模板创建 0-1 前端微应用工程。当前 v1 只定义流程和证据要求；自动生成脚本后续补齐。

## Template Source

```text
repo: http://192.168.167.142:8081/Data-Middleground-Develop-Area/product-code/ai-frontend/yss-design/yss-frontend-template.git
branch: template
```

模板基线：Vue 3、TypeScript、Vite、Qiankun、pnpm、Ant Design Vue、`@yss-ui/components`、`@yss-ui/hooks`、Orval。

## Inputs

- `app_name`：应用名。
- `microapp_name`：微应用注册名。
- `base_route`：基础路由。
- `openapi_source`：OpenAPI 文件、URL 或 Harness spec 路径。
- `target_git_url` 或 `output_dir`：目标实现仓库或本地输出目录。
- `package_manager`：默认 pnpm。
- `init_git`：是否初始化 Git；默认必须用户明确确认。

## Workflow

1. 确认当前任务已经通过 Harness 入口分诊，且实现位置已记录在 proposal、design、build entry review、实施计划或实现路由记录中。
2. 确认目标是外部实现仓库；只有用户明确选择时才输出到 Harness 仓库的 `apps/frontend/`。
3. 只读检查模板分支是否可访问：`git ls-remote --heads <repo> template`。
4. 需要生成工程时，克隆或复制模板到用户确认的目标位置；不得默认写入 Harness 仓库。
5. 替换应用名、微应用名、路由、`micro-config.json`、环境变量和 README 中的模板占位。
6. 配置 OpenAPI source，并准备 Orval 生成命令。
7. 记录验证命令：`pnpm install`、`pnpm lint:check`、`pnpm type-check`、`pnpm build`、`pnpm generate:api`。
8. 按 `docs/templates/implementation-repo-registry-template.md` 回写前端实现仓库登记。

## Expected Template Shape

```text
openapi/
packages/src/api/
packages/src/router/
packages/src/views/
packages/src/styles/
micro-config.json
orval.config.ts
package.json
packages/package.json
```

## Boundaries

- 不直接创建远端 Git 项目，除非用户明确要求。
- 不推送、不创建 MR / PR，除非用户明确要求。
- 不绕过 OpenAPI Draft / Freeze；API client 生成必须有可追溯 OpenAPI source。
- 不把模板示例页面当作业务功能交付。
- 生成后仍需使用 `yss-page-module-development`、`yss-components`、`api-integration` 等专项 skill 实现业务页面。

## Output

- 前端工程生成位置或目标仓库信息。
- 模板来源和 commit / branch 证据。
- 替换参数清单。
- install / lint / type-check / build / generate:api 命令。
- Harness 实现仓库登记草案。
- 未覆盖项和 `TODO-HUMAN-REVIEW`。
