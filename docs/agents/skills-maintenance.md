# Skills Maintenance

> 中文说明：本文说明本仓库内置 Engineering Skills 的来源、安装位置、升级步骤和验证命令。它是维护文档，不是 skill 本体；真正可被 Agent 加载的 `SKILL.md` 位于各项目 Agent roots 的 `skills/` 目录。

本仓库默认使用项目内置技能快照，而不是只依赖用户全局 Codex / Hermes 技能目录。`skills-lock.json` 是来源、版本和技能清单的权威记录；`scripts/verify-template` 是落地校验入口。

## Sources

| Source | Ref | Path | 用途 |
|---|---|---|---|
| `mattpocock/skills` | `272f99b22574f50e4266791c86b9302682970e23` | `skills/engineering` | Matt Pocock Engineering Skills 主流程 |
| `anthropics/knowledge-work-plugins` | `main` | `sales/skills/competitive-intelligence` | 竞品 / 市场事实研究 |

## Installed Skills

当前项目 Agent roots 必须同时具备以下技能：

```text
ask-matt
competitive-intelligence
grill-with-docs
to-prd
to-issues
implement
tdd
diagnosing-bugs
code-review
domain-modeling
codebase-design
improve-codebase-architecture
triage
prototype
research
setup-matt-pocock-skills
resolving-merge-conflicts
```

`ask-matt` 保持 Matt Pocock 上游正文不改；本项目通过 `yss-product-lifecycle` 把它的 idea -> ship 主流映射到 YSS 阶段门禁、OpenAPI Draft / Freeze、YSS routing、Git checkpoint 和 fresh verification。

## Project Agent Roots

| Agent | Project root |
|---|---|
| Agents | `.agents/skills/<skill-name>/` |
| Claude | `.claude/skills/<skill-name>/` |
| Codex | `.codex/skills/<skill-name>/` |
| Hermes | `.hermes/skills/<skill-name>/` |
| Pi | `.pi/skills/<skill-name>/` |
| Trae | `.trae/skills/<skill-name>/` |

## Optional Local Workflow Tools

除项目内置 Engineering Skills 外，维护者可按需使用本机级 GitLab 工作流工具；它们不是模板必须内置的技能目录。

| Skill / Tool | Entry | 用途 |
|---|---|---|
| `gitlab-workflow` | `$CODEX_HOME/skills/gitlab-workflow/` | GitLab API、项目查询、clone、push、分支化 workflow |
| `glab` | `glab` | GitLab MR、CI、Pipeline、Issue、Release 等 CLI 操作 |
| `scripts/gitworks` | `scripts/gitworks` | 当前仓库的 GitLab workflow 快捷入口 |

详细配置与使用规则见 `docs/agents/gitlab-workflow-skills.md`。

## Project-Level Harness / YSS Skills

本项目还维护以下项目级 Harness / YSS 集成技能：

| Skill | Path | 用途 |
|---|---|---|
| `implementation-repo-onboarding` | `.codex/skills/implementation-repo-onboarding/` | 接入已有前端 / 后端实现仓库，生成登记、基线发现和验证命令 |
| `cross-repo-implementation-routing` | `.codex/skills/cross-repo-implementation-routing/` | 路由跨仓库实现任务，绑定 MR / PR 和验证证据 |
| `yss-frontend-scaffold-generator` | `.codex/skills/yss-frontend-scaffold-generator/` | 基于标准 YSS 前端模板定义 0-1 前端工程生成流程 |

这些技能只定义流程、输入输出和安全边界；除非用户明确授权，不直接 clone 到 Harness 仓库、创建远端仓库、提交或推送代码。

## Upgrade Checklist

1. 读取 `skills-lock.json`，确认 Matt 快照 ref、`competitive-intelligence` 额外来源和技能清单。
2. 拉取或下载对应来源到临时目录，不直接覆盖工作区。
3. 将锁定技能同步到全部 6 个项目 Agent roots。
4. 保留 `ask-matt` 上游正文不改；项目差异写入 `yss-product-lifecycle`、流程文档或维护说明。
5. 检查每个技能目录都有合法 `SKILL.md` frontmatter，至少包含 `name` 和 `description`。
6. 运行 `scripts/verify-template`。
7. 重启需要重新加载技能的 Agent 客户端。

## Verification Command

```bash
skills=(
  ask-matt
  competitive-intelligence
  grill-with-docs
  to-prd
  to-issues
  implement
  tdd
  diagnosing-bugs
  code-review
  domain-modeling
  codebase-design
  improve-codebase-architecture
  triage
  prototype
  research
  setup-matt-pocock-skills
  resolving-merge-conflicts
)

roots=(
  .agents/skills
  .claude/skills
  .codex/skills
  .hermes/skills
  .pi/skills
  .trae/skills
)

for root in "${roots[@]}"; do
  for skill in "${skills[@]}"; do
    test -f "$root/$skill/SKILL.md" || echo "missing $root/$skill/SKILL.md"
  done
done

scripts/verify-template
```
