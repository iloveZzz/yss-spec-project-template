# Skills Maintenance

> 中文说明：本文说明 Engineering Skills 的来源、安装位置、升级步骤和验证命令。它是维护文档，不是 skill 本体；真正可被 Agent 加载的 `SKILL.md` 位于 `.agents/`、`.agent/`、`.codex/skills/` 或用户本机的 skills 目录。

This repo expects Matt Pocock Engineering Skills to be installed locally for Codex and Hermes.

## Source

- Upstream: <https://github.com/mattpocock/skills/tree/main/skills/engineering>
- Installed date: 2026-06-29
- Installation mode: local copy

## Installed Skills

```text
ask-matt
codebase-design
diagnosing-bugs
domain-modeling
grill-with-docs
implement
improve-codebase-architecture
prototype
resolving-merge-conflicts
setup-matt-pocock-skills
tdd
to-issues
to-prd
triage
```

## Runtime Locations

| Runtime | Path |
|---|---|
| Codex | `/Users/zhudaoming/.codex/skills/<skill-name>/` |
| Hermes | `/Users/zhudaoming/.hermes/skills/software-development/<skill-name>/` |

## Project Workflow Skills

除 Matt Pocock Engineering Skills 外，本项目还使用本机级 GitLab 工作流技能：

| Skill / Tool | Path / Entry | 用途 |
|---|---|---|
| `gitlab-workflow` | `/Users/zhudaoming/.codex/skills/gitlab-workflow/` | GitLab API、项目查询、clone、push、分支化 workflow |
| `glab` | `/Users/zhudaoming/go/bin/glab` | GitLab MR、CI、Pipeline、Issue、Release 等 CLI 操作 |
| `scripts/gitworks` | `scripts/gitworks` | 当前仓库的 GitLab workflow 快捷入口 |

详细配置与使用规则见 `docs/agents/gitlab-workflow-skills.md`。

## Project-level Harness Skills

本项目还维护以下项目级 Harness / YSS 集成技能：

| Skill | Path | 用途 |
|---|---|---|
| `implementation-repo-onboarding` | `.codex/skills/implementation-repo-onboarding/` | 接入已有前端 / 后端实现仓库，生成登记、基线发现和验证命令 |
| `cross-repo-implementation-routing` | `.codex/skills/cross-repo-implementation-routing/` | 从 Harness change 路由跨仓库实现任务，绑定 MR / PR 和验证证据 |
| `yss-frontend-scaffold-generator` | `.codex/skills/yss-frontend-scaffold-generator/` | 基于标准 YSS 前端模板定义 0-1 前端工程生成流程 |

这些 skill 只定义流程、输入输出和安全边界；除非用户明确授权，不直接 clone 到 Harness 仓库、创建远端仓库、提交或推送代码。

## Upgrade Checklist

1. Back up the current Codex and Hermes skill directories.
2. Pull or download upstream `skills/engineering`.
3. Replace all 14 skill directories in both runtimes.
4. Confirm each skill has a `SKILL.md`.
5. Restart Codex.
6. Run `hermes skills list` and confirm each skill is enabled.
7. Re-read `AGENTS.md` and this repository's safety rules; they override upstream skills on conflicts.

## Verification Command

```bash
for d in ask-matt codebase-design diagnosing-bugs domain-modeling grill-with-docs implement improve-codebase-architecture prototype resolving-merge-conflicts setup-matt-pocock-skills tdd to-issues to-prd triage; do
  test -f "/Users/zhudaoming/.codex/skills/$d/SKILL.md" || echo "codex missing $d"
  test -f "/Users/zhudaoming/.hermes/skills/software-development/$d/SKILL.md" || echo "hermes missing $d"
done

for d in implementation-repo-onboarding cross-repo-implementation-routing yss-frontend-scaffold-generator; do
  test -f ".codex/skills/$d/SKILL.md" || echo "project missing $d"
done
```
