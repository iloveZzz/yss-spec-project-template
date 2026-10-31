# YSS Skills and Project Templates

A collection of skills and reference assets for requirements, product design and Java backend development. Start with AGENTS.md and select the skills relevant to the task.

This repository does not ship scripts, test suites, CI workflows or automatic hooks. Agents create projects, synchronize skill copies, prepare exports and handle authorized releases directly. Existing CLIs may be used for capabilities they actually support. Builds, tests and reviews are task-specific choices, not universal prerequisites.

Shared content lives in .agents/skills. Backend-specific content lives in profiles/backend. Claude uses linked skills and WorkBuddy uses ordinary file copies. Keep affected copies and distribution lists aligned when changing canonical content; see .template-source/agents/skills-maintenance.md.

Preserve business validation, security, error handling and user files. Commits, pushes, deployments and releases require authorization for those actions. Report observed results and unperformed work honestly.

Installed yss CLI binaries are separate products. Compatibility of their installation and synchronization behavior with this template revision has not been established by this change.
