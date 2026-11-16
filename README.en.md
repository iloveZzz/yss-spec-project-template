# YSS Skills and Project Templates

A collection of skills and reference assets for requirements, product design, Java backend and Vue frontend development. Start with AGENTS.md and select the skills relevant to the task.

The Chinese [user manual](.template-spec/user-guide/用户手册.md), [training materials](.template-spec/user-guide/培训材料.md) and [guide index](.template-spec/user-guide/用户手册索引.md) cover the full team workflow. Command examples use CLI 3.8.0 with its embedded Template 5.8.0. Current main additions are identified in the relevant sections.

This repository does not maintain script directories, test suites or automatic hooks. GitLab CI builds the Rust CLI on Linux with the current template and checks project installation, synchronization and scaffold generation; it does not package or publish Linux releases. Runners tagged `yss-linux` must use the same architecture to share the built executable. Agents create projects, synchronize skill copies, prepare exports and handle authorized releases directly. Existing CLIs may be used for capabilities they actually support. Builds, tests and reviews are task-specific choices, not universal prerequisites.

Shared content lives in .agents/skills. Backend-specific content lives in profiles/backend; profiles/frontend selects shared skills through an explicit allowlist. Frontend installs 13 skills by default, with 17 available. Claude uses linked shared skills and WorkBuddy uses ordinary file copies. Keep affected copies and distribution lists aligned when changing canonical content; see .template-source/agents/skills-maintenance.md.

Preserve business validation, security, error handling and user files. Commits, pushes, deployments and releases require authorization for those actions. Report observed results and unperformed work honestly.

Installed yss CLI binaries are separate products. Check compatibility against the installed version and its embedded template.

Template 5.8.0 strengthens llm-wiki synthesis, evidence maintenance, source changes and linting, with optional QMD search guidance. Database analysis uses a shared model, concise descriptions and a light Excel layout while preserving compatibility with existing models. New Backend projects continue to default to YSS `4.0.0-SNAPSHOT`, Spring Boot `4.1.2` and Java `17`, with explicit version selection. Authorized Home setup connects scaffold generation, skills installation and upstream navigation. Default skill counts remain Spec 17, Backend 42 and Frontend 13.

CLI 3.8.0 packages this template. GitLab CI retains the compatible CLI 3.7.0 build source `f2e0a952123fbd9f12d3703b8df2b03d02b670cb`. The final CLI release records its own source and template commits. CLI 3.3.0 adds `scaffold frontend`. The Frontend Profile remains available from CLI 3.2.0, while 3.1.4 and earlier do not support it. Check the actual CLI help and embedded Bundle. Publishing the template does not update installed CLIs or projects. See the [Home validation report](.template-source/design/2026-11-15-spec-home-repo-validation.md) for the observed scope and limits.
