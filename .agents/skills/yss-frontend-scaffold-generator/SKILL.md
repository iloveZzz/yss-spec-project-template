---
name: yss-frontend-scaffold-generator
description: Use when creating a new YSS frontend micro-application from the standard frontend template.
---

# YSS Frontend Scaffold Generator

用于从标准 YSS 前端模板创建 0-1 前端微应用工程。它只在阶段 5 的 `work-unit.implementation-repository-preparation` 中消费生命周期批准、持久化且当前的 Project Scaffold Contract schema v4，执行 `controlled-generation`；不生成业务页面。

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
- Project Scaffold Contract schema v4：包含用户确认的仓库 scope、目标路径、`init_git`、模板 commit、应用参数、允许写路径和验证命令。
- OpenAPI Freeze 记录：有 API 影响时提供已批准的冻结 YAML 版本和引用；无 API 影响时提供带原因的 `not-applicable`。
- OpenAPI JSON 派生记录：`docs/.scratch/<feature>/api/<feature>-json-export.md`，包含 YAML / JSON SHA-256、Redocly CLI 版本和 lockfile 引用。
- 冻结 JSON 产物：`docs/.scratch/<feature>/api/<feature>.json`；这是唯一允许交给既有前端代码生成流程的上游产物。
- `target_git_url` 或 `output_dir`：目标实现仓库或本地输出目录。
- `package_manager`：默认 pnpm。
- `init_git`：是否初始化 Git；默认必须用户明确确认。

## Workflow

采用专职前端 profile 或显式 `frontend_delivery` 绑定时，先按 `docs/process/frontend-backend-delivery.md` 实际核验战略与后端联合交付。缺任一输入只能诊断和回交；输入通过后准备计划/合同，正式实现、生成和恢复仍须当前批准的 Slice Contract 冻结接收摘要。接口或部署版本漂移时重新接收，不复用旧成功输出。

1. 确认当前任务已经通过 Harness 入口分诊、逐项目脚手架决定已由真实用户确认，且 schema v4 合同已由生命周期批准、持久化并保持当前。
2. 确认目标是外部实现仓库；只有用户明确选择时才输出到 Harness 仓库的 `apps/frontend/<project>/`。`apps/frontend/` 只能作为项目容器，`app/frontend/`、`app/backend/` 及其子路径禁止作为输出位置。`git-submodule` 只能在已初始化且附加分支的子仓工作树生成；空 gitlink、detached HEAD、`--force` 覆盖挂载点不得当成普通目录。
3. 只读检查模板分支和合同锁定的 40 位 commit 是否可访问；生成时使用精确 commit，不跟随浮动分支。
4. 使用 `scripts/generate_and_verify_scaffold.mjs` 从已核验 checkout 复制工作树，排除模板 `.git`；目标必须不存在或为空。不得默认写入 Harness、不得 `--force`。仅合同 `init_git=true` 时初始化目标 Git。
5. 替换应用名、微应用名、路由、`micro-config.json`、环境变量和 README 中的模板占位。
6. 有 API 影响时核验 OpenAPI Freeze 记录和 JSON 派生记录，将摘要一致的 JSON 原样物化到 `<frontend>/openapi/openapi.json`；`openapi_impact=not-applicable` 时必须有原因并禁止生成 API client。
7. 保持模板既有的前端代码生成配置不变；本 Harness 只将 SHA-256 一致的 JSON 原样交给既有前端代码生成流程，不修改该配置、不在此仓库执行生成，也不设置生成 CI 门禁。目标前端项目在需要时手动运行其既有命令。
8. 实际执行并记录 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm type-check`、`pnpm build` 的退出码和日志；缺失脚本只能由批准的工程基线提供替代命令。任何必需命令失败都阻断。
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
- 不保留模板 `.git` 或模板 remote；不在未获确认时执行 `git init`。
- 不推送、不创建 MR / PR，除非用户明确要求。
- 不绕过 OpenAPI Draft / Freeze；API client 只消费与 OpenAPI JSON 派生记录 SHA-256 一致的冻结 JSON。
- 不接受任意 URL、未冻结 YAML、后端运行时输出或手工 JSON 作为既有前端代码生成流程的输入。
- 不修改模板既有的代码生成配置，也不把客户端生成加入 CI。
- 不得把 `apps/frontend/` 容器根登记为项目根；Harness 内每个前端项目必须有独立的 `apps/frontend/<project>/` 路径。
- 不把模板示例页面当作业务功能交付。
- 生成后仍需使用 `yss-ui-business-page-generation`、`yss-components`、`yss-api-integration` 等专项 skill 实现业务页面。

## Output

- 前端工程生成位置或目标仓库信息。
- 模板来源和 commit / branch 证据。
- 替换参数清单。
- install / lint / type-check / build 命令，以及目标前端项目既有的手动客户端生成命令（如有）。
- OpenAPI Freeze 记录、OpenAPI JSON 派生记录、JSON SHA-256 和 `openapi/openapi.json` 物化证据。
- Harness 实现仓库登记草案。
- `.yss/scaffold-generation.json` Manifest v4 与 `scaffold-verification.json`。
- 未覆盖项和 `TODO-HUMAN-REVIEW`。
