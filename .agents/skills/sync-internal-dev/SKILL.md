---
name: sync-internal-dev
description: 一键自动拉取内网 dev 分支最新代码并同步至 GitHub 仓库 main 分支。AI 自动在独立临时分支/worktree 中恢复 GitHub-only 配置、清洗内网私有配置，并仅 push 到 github/main。当用户说“同步内网 dev”、“同步最新内网代码”、“把内网 dev 搬到 github”时触发。
---

# 内网 Dev 最新代码一键同步至 GitHub main 分支规范

用于 AI **全自动**将内网 GitLab 最新 `dev` 分支代码同步到 GitHub 的 `main` 分支，自动转换包名及配置并 Push 触发 GitHub CI。**零人工干预，只维护 GitHub 单一 main 分支。**

## 触发条件

- 用户明确要求“同步内网 dev 代码”、“同步最新内网代码”或“把内网 dev 搬到 github”。
- 内网完成阶段性发版或代码合并，需要将最新改动镜像同步至 GitHub 公网。

## 不适用场景

- 日常内网功能开发或仅向 GitLab 提交：使用常规提交流程与 `../commit-linting/SKILL.md`。
- 工作树存在未提交的冲突或未保存的脏改动。

## 硬约束（禁止/必须）

- `.github/` 为 **GitHub-only**，内网 `origin/dev` 树中**禁止长期存在**。
- 同步流程中**绝对禁止** `git push origin`、`git push`（无 remote）、以及任何向 GitLab 的意外推送。
- **禁止**在跟踪 `origin/dev` 的本地 `dev` 分支上提交 `.github/**` 后再推 `origin`。
- 修改 GitHub Actions / GitHub 发布配置时：只在同步用的临时分支上改，**禁止写进** `origin/dev`。
- 必须通过临时同步分支（如 `sync/github-main`）隔离操作，推送到 `github HEAD:main` 后立即清理临时分支。
- 必须在推送到 GitHub 前完成内网 IP、私服地址与内部单号脱敏。

## 标准代码骨架

```text
1. 拉取引用：git fetch origin dev && git fetch github main
2. 创建分支：git checkout -B sync/github-main dev
3. 恢复配置：git checkout github/main -- .github
4. 脱敏检查：清洗内网 192.168.x.x IP 与私有配置
5. 本地验证：pnpm type-check && pnpm lint
6. 安全推送：git add -A && git commit -m "chore(config): 自动同步..." && git push --force-with-lease github HEAD:main
7. 分支清理：git checkout dev && git branch -D sync/github-main
```

## 交付检查清单

- [ ] 本地工作树在同步前已提交或备份，无冲突。
- [ ] 临时分支已正确恢复 `.github/` 专用配置文件。
- [ ] 敏感内网 IP、私服地址已脱敏。
- [ ] 类型检查与 lint 验证均已通过。
- [ ] 代码仅推送到 `github HEAD:main`，未对 `origin` 执行任何 push。
- [ ] 同步完成后已切回本地开发分支并删除了临时分支。

## 失败兜底策略

- 若 `git fetch origin` 因内网网络或 VPN 未连通超时，提示用户并在本地现有最新提交基础上执行同步。
- 若推送到 `github` 发生冲突，优先使用 `--force-with-lease` 覆盖（GitHub 为单向镜像接收端）。
- 若类型检查或 Lint 失败，停在临时分支修复问题，不强推未验证代码。
