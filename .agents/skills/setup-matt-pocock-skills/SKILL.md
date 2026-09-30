---
name: setup-matt-pocock-skills
description: Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (Local Markdown by default; GitHub and GitLab require an explicit project choice)
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- Root `AGENTS.md` — does it exist, and is there already an `## Agent skills` section?
- The case-sensitive `CONTEXT.md` at the Git repository root; also detect lowercase, nested, or duplicate context files as migration problems
- `docs/adr/` and any `src/*/docs/adr/` directories
- `.template-spec/agents/` — does this skill's prior output already exist?
- `docs/.scratch/` — sign that the canonical local-markdown issue tracker convention is already in use
- `.scratch/` and `docs/requirements/tickets/` — legacy local-tracker roots; inspect them read-only for migration and never use them as new write targets
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.

### 2. Present findings and ask

需要确认 tracker、triage 标签或根词汇布局时，读取 [配置决定](references/configuration-decisions.md)，按条件逐项确认。Tracker 只允许 `local-markdown`、`github`、`gitlab`；默认 Local Markdown，不从 remote 推断。嵌套、重复或大小写错误的 CONTEXT 布局返回 `migration-required`。

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to `AGENTS.md`
- The contents of `.template-spec/agents/issue-tracker.md`, 根 `CONTEXT.md` 的消费规则, and `.template-spec/agents/triage-labels.md` (the last only when `triage` is installed)

Let them edit before writing.

### 4. Write

草案已展示且用户确认后，读取 [配置写入与模板](references/write-configuration.md)。只更新已有区块并保留周围用户内容；不存在 AGENTS.md 时先取得创建授权。

### 5. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention they can edit `.template-spec/agents/*.md` directly later — re-running this skill is only necessary if they want to switch issue trackers or restart from scratch.
