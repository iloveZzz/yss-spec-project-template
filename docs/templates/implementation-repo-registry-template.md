---
pipeline: <feature-id>
stage: implementation-repo-registry
status: draft
owner: ai
---

# <仓库名称>实现仓库登记

> 用于把外部前端、后端或其他运行时代码仓库接入当前 Harness / 研发管理仓库。本文不替代实现仓库 README、CI 配置或 MR / PR。

## 1. 基本信息

| 字段 | 值 |
|---|---|
| repo_role | backend / frontend / fullstack / other |
| git_url |  |
| default_branch |  |
| local_worktree |  |
| repository_scope | external-repository / harness-apps |
| project_type | backend / frontend / fullstack / other |
| project_name |  |
| project_root | 外部仓库相对路径，或 `apps/backend/<project>/` / `apps/frontend/<project>/` |
| layout_policy | `harness-apps-multi-project` / `external-repository-native` |
| scaffold_status | existing / required / initialized |
| scaffold_skill | `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` / none |
| scaffold_target_confirmed | 是 / 否 / 不适用 |
| target_git_url_or_output_dir |  |
| owner |  |
| ci_system | GitLab CI / GitHub Actions / Jenkins / other / none |
| issue_tracker | GitLab / GitHub / other |

## 2. 命令与流水线

| 类型 | 命令 / 链接 | 说明 |
|---|---|---|
| install_command |  |  |
| test_command |  |  |
| build_command |  |  |
| lint_command |  |  |
| typecheck_command |  |  |
| ci_pipeline |  |  |

Harness 内项目路径约束：`apps/backend/`、`apps/frontend/` 只能作为项目容器；工程必须位于具体的 `apps/backend/<project>/` 或 `apps/frontend/<project>/`。`app/backend/`、`app/frontend/` 及其子路径禁止登记或生成。外部实现仓库填写真实项目根路径，不使用本表的 Harness 占位路径。

## 2.1 项目清单（同一 monorepo 可登记多个项目）

| project_name | project_type | project_root | test_command | build_command | rollback_point |
|---|---|---|---|---|---|
| project1 | backend / frontend | `apps/backend/project1/` 或 `apps/frontend/project1/` |  |  |  |
| project2 | backend / frontend | `apps/backend/project2/` 或 `apps/frontend/project2/` |  |  |  |

## 3. 契约与设计接入

| 接入项 | 状态 | 证据 / 路径 | 缺口 |
|---|---|---|---|
| openapi_integration | 已接入 / 部分接入 / 未接入 / 不适用 |  |  |
| design_token_integration | 已接入 / 部分接入 / 未接入 / 不适用 |  |  |
| generated_client | 已接入 / 部分接入 / 未接入 / 不适用 |  |  |
| yss_ui_baseline | 已接入 / 部分接入 / 未接入 / 不适用 |  |  |
| yss_backend_baseline | 已接入 / 部分接入 / 未接入 / 不适用 |  |  |

## 4. 已知偏离项

| known_gaps | 风险 | 补齐计划 | 是否阻断 |
|---|---|---|---|
|  |  |  | 是 / 否 |

## 5. 人工审查

| 人工确认项 | 是否涉及 | 审查人 / 角色 | 结论 | 补齐落点 |
|---|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 权限接入 / 认证 / 授权 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 审计日志 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 其他风险 / 回滚约束 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |

## 6. Harness 回写

- 关联 Harness change：
- 关联垂直切片：
- 关联阶段 checkpoint：
- fresh verification 命令：
