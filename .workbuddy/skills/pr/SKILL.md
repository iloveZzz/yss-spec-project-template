---
name: pr
description: 根据改动、验证记录或已有正文，起草或修订 GitHub PR 或 GitLab MR 的描述草稿。
---

# 起草 PR/MR 正文

从提供本技能的同一有效工程根读取 `.agents/skills/yss-write-docs/references/pr-and-retro.md` 的「PR / MR 描述」章节。参考不可读时，依据可用材料完成能支持的草稿，并说明参考缺失及受影响的判断。

只读收集正文所需的材料。目标仓已明确时，采用其可读模板和相关差异。只有用户提供的摘要、验证记录或已有正文时，按现有材料起草并说明影响判断的缺口。修订已有正文时，仅调整用户授权的内容，逐字保留其余文本。返回可直接使用的正文草稿。

通过 PR/MR 交付选定材料时，使用 `yss-deliver-pr-mr` 并核对相应的动作授权。审查改动使用 `code-review`，明确要求实施改动或修复反馈时使用 `implement`。
