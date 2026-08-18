# 实现仓库登记

状态：`ready-for-human`

## `create-yss-spec`

| 字段 | 值 |
|---|---|
| repo_role | other |
| git_url | `https://github.com/iloveZzz/create-yss-spec.git` |
| default_branch | `main` |
| local_worktree | `/Users/zhudaoming/Projects/create-yss-spec` |
| project_root | 仓库根目录 |
| layout_policy | `external-repository-native` |
| scaffold_status | existing |
| owner | 平台发布团队 |
| ci_system | none（需在切片 04 补齐） |
| test_command | `YSS_SPEC_TEMPLATE_REF=<pinned-commit> npm test` |
| build_command | `npm pack --dry-run`（会执行 `prepack`，不是只读检查） |
| rollback_point | 当前 `main` 固定 commit；每次变更另记 |

## `yss-template-runtime`

| 字段 | 值 |
|---|---|
| repo_role | other |
| git_url | `https://github.com/iloveZzz/yss-template-runtime.git`（公开仓库） |
| default_branch | `main`（已建立；当前发布编排提交 `7c947117302fc513cca74f7862592378824de326`） |
| local_worktree | `/Users/zhudaoming/Projects/yss-template-runtime`（本轮 onboarding 创建） |
| project_root | 仓库根目录 |
| layout_policy | `external-repository-native` |
| scaffold_status | required |
| owner | 平台发布团队 |
| ci_system | GitHub Actions（`Release preview` workflow 已执行；受保护 release environment 待配置） |
| test_command | 待 Rust 行为 oracle 合同冻结 |
| build_command | 待 Cargo target/release 合同冻结 |
| rollback_point | 每个 immutable release 的 N-1 |

## 共同缺口

- 预览 Rust 仓已建立 `main` 和 GitHub Actions；正式 license、CODEOWNERS、protected release environment、签名身份与真实目标环境仍未就绪；
- 两仓命令、允许写路径、分支、PR 与回滚点须在每个 `ready-for-agent` 切片中重新登记，不能以本草案替代。
