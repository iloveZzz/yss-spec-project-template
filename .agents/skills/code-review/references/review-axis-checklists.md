# 审查轴检查提纲

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

**Standards sub-agent prompt** — include:

- The full candidate manifest, captured candidate, `candidate_digest`, diff/inventory commands and commit list. For Worktree candidates, explicitly include every untracked file.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full. Paste Fowler smells in full. For YSS specialist inputs, pass the exact skill file paths; the reviewer must read them and cite `skill + rule + location`. Do not summarise away mandatory Alibaba or YSS violations to fit a word cap. The 400-word cap applies only to the Fowler smell section.
- Machine-check commands, exit codes and evidence from step 3. Tooling failure is a hard Standards violation.
- The brief: "Report — per file/hunk where relevant — (a) every place the diff violates a documented standard or a required YSS / Alibaba specialist rule: cite the skill or file and the rule; (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls — documented-standard and mandatory specialist breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything the machine checks already enforced. Smell section under 400 words; specialist findings have no word cap."

**Spec sub-agent prompt** — include:

- The same candidate manifest, captured candidate, `candidate_digest`, diff/inventory commands and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.
