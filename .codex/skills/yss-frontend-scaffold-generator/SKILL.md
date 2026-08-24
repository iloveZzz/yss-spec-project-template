---
name: yss-frontend-scaffold-generator
description: Use when creating a new YSS frontend micro-application from the standard frontend template.
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
- OpenAPI Freeze 记录：已批准的冻结 YAML 版本和引用。
- OpenAPI JSON 派生记录：`docs/.scratch/<feature>/api/<feature>-json-export.md`，包含 YAML / JSON SHA-256、Redocly CLI 版本和 lockfile 引用。
- 冻结 JSON 产物：`docs/.scratch/<feature>/api/<feature>.json`；这是唯一允许交给既有前端代码生成流程的上游产物。
- `target_git_url` 或 `output_dir`：目标实现仓库或本地输出目录。
- `package_manager`：默认 pnpm。
- `init_git`：是否初始化 Git；默认必须用户明确确认。

## Workflow

1. 确认当前任务已经通过 Harness 入口分诊，且实现位置已记录在 proposal、design、build entry review、实施计划或实现路由记录中。
2. 确认目标与拓扑：分仓接入输出到外部实现仓库；新建一体仓才输出到实例仓的 `apps/frontend/<project>/`。已有一体仓且 `scaffold_status=existing` 时，不把迁仓到 `apps/` 当脚手架。`apps/frontend/` 只能作为项目容器，`app/frontend/`、`app/backend/` 及其子路径禁止作为输出位置。
3. 只读检查模板分支是否可访问：`git ls-remote --heads <repo> template`。
4. 需要生成工程时，克隆或复制模板到用户确认的目标位置；不得默认写入 Harness 仓库。
5. 替换应用名、微应用名、路由、`micro-config.json`、环境变量和 README 中的模板占位。
6. 核验 OpenAPI Freeze 记录和 OpenAPI JSON 派生记录；通过批准的 Cross-repo 子合同或项目脚本，将记录中的 JSON 原样物化到 `<frontend>/openapi/openapi.json`，并再次核对 SHA-256。
7. 保持模板既有的前端代码生成配置不变；本 Harness 只将 SHA-256 一致的 JSON 原样交给既有前端代码生成流程，不修改该配置、不在此仓库执行生成，也不设置生成 CI 门禁。目标前端项目在需要时手动运行其既有命令。
8. 记录目标前端项目的 install / lint / type-check / build 命令，以及既有客户端生成命令（如有）；生成命令仅作为目标项目的手动验证项。
9. 按 `docs/templates/implementation-repo-registry-template.md` 回写前端实现仓库登记。

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
- 不绕过 OpenAPI Draft / Freeze；API client 只消费与 OpenAPI JSON 派生记录 SHA-256 一致的冻结 JSON。
- 不接受任意 URL、未冻结 YAML、后端运行时输出或手工 JSON 作为既有前端代码生成流程的输入。
- 不修改模板既有的代码生成配置，也不把客户端生成加入 CI。
- 不得把 `apps/frontend/` 容器根登记为项目根；`harness-apps-multi-project` 下每个前端项目必须有独立的 `apps/frontend/<project>/` 路径。已有一体仓 `scaffold_status=existing` 时禁止把迁仓当作本脚手架。
- 不把模板示例页面当作业务功能交付。
- 生成后仍需使用 `yss-page-module-development`、`yss-components`、`api-integration` 等专项 skill 实现业务页面。

## Output

- 前端工程生成位置或目标仓库信息。
- 模板来源和 commit / branch 证据。
- 替换参数清单。
- install / lint / type-check / build 命令，以及目标前端项目既有的手动客户端生成命令（如有）。
- OpenAPI Freeze 记录、OpenAPI JSON 派生记录、JSON SHA-256 和 `openapi/openapi.json` 物化证据。
- Harness 实现仓库登记草案。
- 未覆盖项和 `TODO-HUMAN-REVIEW`。
