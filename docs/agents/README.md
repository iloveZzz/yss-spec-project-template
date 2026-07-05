# Agent 协作说明

本目录存放给团队和 AI Agent 阅读的协作规范，用来说明 Issue、Triage、领域文档和 skills 维护方式。这里不是可执行的 skills 目录。

## 与隐藏目录的区别

| 路径 | 用途 |
|---|---|
| `.agents/` | Agent 可加载的 Engineering Skills、脚本、prompt 和参考材料 |
| `.agent/` | Matt engineering skills 与通用 Agent 工作流 |
| `.codex/skills/` | Codex 项目级 skills，包含 YSS、Matt、Issue 等能力 |
| `docs/agents/` | 人和 AI 都可读的协作说明、标签约定、维护规范 |

## 当前文档

| 文档 | 说明 |
|---|---|
| `issue-tracker.md` | Issue / PRD / triage 在 GitLab Issues 与 GitHub Issues 间路由的操作约定 |
| `triage-labels.md` | 标准五态 triage 标签与含义 |
| `domain.md` | 领域文档读取和维护规则 |
| `skills-maintenance.md` | Engineering Skills 的安装、升级和验证说明 |
| `gitlab-workflow-skills.md` | GitLab、MR、CI 和自动 gitworks 的技能配置与使用规则 |

当 `AGENTS.md` 或某个 skill 提到本目录时，应优先把这里当作项目协作规则读取；真正的 skill 执行入口仍在 `.agents/`、`.agent/` 或 `.codex/skills/`。
