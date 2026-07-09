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

| 人审项 | 是否涉及 | 审查人 / 角色 | 结论 | TODO-HUMAN-REVIEW 落点 |
|---|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 权限接入 / 认证 / 授权 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 审计日志 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |
| 其他安全红线 | 是 / 否 |  | 通过 / 草案 / 阻断 / 不适用 |  |

## 6. Harness 回写

- 关联 Harness change：
- 关联垂直切片：
- 关联阶段 checkpoint：
- fresh verification 命令：
