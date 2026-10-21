# 配置写入与种子模板

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

### 4. Write

**Pick the file to edit:**

- If `AGENTS.md` exists, edit it.
- If it is missing, ask before creating it.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `.template-spec/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `.template-spec/agents/triage-labels.md`.

### Domain docs

[one-line summary: one root `CONTEXT.md`, with bounded contexts represented inside its business glossary]. See 根 `CONTEXT.md` 的消费规则.
```

Include the `### Triage labels` sub-block, and write `.template-spec/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it isn't, both are omitted.

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](.././issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](.././issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](.././issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](.././triage-labels.md) — label mapping (only if `triage` is installed)
- 根 `CONTEXT.md` 文首合同与消费规则 — domain doc consumer rules + layout

For an unsupported tracker request, stop and require a YSS tracker-contract extension; do not write an unsupported platform into `.template-spec/agents/issue-tracker.md`.
