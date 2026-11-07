# YSS Skills and Project Templates

A collection of skills and reference assets for requirements, product design, Java backend and Vue frontend development. Start with AGENTS.md and select the skills relevant to the task.

This repository does not maintain script directories, test suites or automatic hooks. GitLab CI builds the Rust CLI on Linux with the current template and checks project installation, synchronization and scaffold generation; it does not package or publish Linux releases. Runners tagged `yss-linux` must use the same architecture to share the built executable. Agents create projects, synchronize skill copies, prepare exports and handle authorized releases directly. Existing CLIs may be used for capabilities they actually support. Builds, tests and reviews are task-specific choices, not universal prerequisites.

Shared content lives in .agents/skills. Backend-specific content lives in profiles/backend; profiles/frontend selects shared skills through an explicit allowlist. Frontend installs 13 skills by default, with 17 available. Claude uses linked shared skills and WorkBuddy uses ordinary file copies. Keep affected copies and distribution lists aligned when changing canonical content; see .template-source/agents/skills-maintenance.md.

Preserve business validation, security, error handling and user files. Commits, pushes, deployments and releases require authorization for those actions. Report observed results and unperformed work honestly.

Installed yss CLI binaries are separate products. Check compatibility against the installed version and its embedded template.

Template 5.3.0 includes a minimal Vue starter and updated Spec prototype guidance. CLI 3.3.0 adds `scaffold frontend`; the Frontend Profile remains available from CLI 3.2.0, while 3.1.4 and earlier do not support it. Check the actual CLI help and embedded Bundle. GitLab CI pins a frontend-capable CLI source commit and covers all three profiles. Report remote execution and release results from the actual run.
