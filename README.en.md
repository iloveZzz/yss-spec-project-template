# YSS Skills and Project Templates

A collection of skills and reference assets for requirements, product design, Java backend and Vue frontend development. Start with AGENTS.md and select the skills relevant to the task.

The Chinese [user manual](.template-spec/user-guide/用户手册.md), [training materials](.template-spec/user-guide/培训材料.md) and [guide index](.template-spec/user-guide/用户手册索引.md) cover the full team workflow. Command examples use CLI 3.8.0 with its embedded Template 5.8.0. Current main additions are identified in the relevant sections.

Skill directories may include deterministic tools directly supporting generation or conversion. This repository does not add installation wrapper scripts, general-purpose test suites or automatic hooks. GitLab CI builds the Rust CLI on Linux with the current template and checks project installation, synchronization and scaffold generation; it does not package or publish Linux releases. Runners tagged `yss-linux` must use the same architecture to share the built executable. Agents create projects, synchronize skill copies, prepare exports and handle authorized releases directly. Existing CLIs may be used for capabilities they actually support. Builds, tests and reviews are task-specific choices, not universal prerequisites.

Shared content lives in .agents/skills. Backend-specific content lives in profiles/backend. Frontend selects shared skills through an explicit allowlist. Both Frontend installation modes include guidance for loading transitions, official shadcn-vue and FormKit skills, and VueUse function references. Claude uses linked shared skills and WorkBuddy uses ordinary file copies. Keep affected copies and distribution lists aligned when changing canonical content. See .template-source/agents/skills-maintenance.md.

Preserve business validation, security, error handling and user files. Commits, pushes, deployments and releases require authorization for those actions. Report observed results and unperformed work honestly.

Installed yss CLI binaries are separate products. Check compatibility against the installed version and its embedded template.

Template 5.19.2 pairs with CLI 3.19.2. This release updates the paired version information.

Template 5.19.1 pairs with CLI 3.19.1. This release updates the paired version information.

Template 5.19.0 pairs with CLI 3.19.0. This is a coordinated release: the CLI adds a Tauri desktop app with macOS ARM64 and Windows x64 installers, and the browser workbench remains available through the CLI.

Template 5.18.4 pairs with CLI 3.18.4. The CLI workbench updates the sidebar navigation and the project and Spec entry points, and adds Spec progress verification and read status.

Template 5.18.3 pairs with CLI 3.18.3. The CLI workbench has a compact light frosted-glass layout, Spec lifecycle status and stage confirmation, per-project permissions for Pi runs, and evidence from linked GitLab CI jobs.

Template 5.18.2 pairs with CLI 3.18.2. The frontend implementation skill can update affected pages from an approved prototype revision or compare the running frontend with the prototype in a read-only review. Approved changes in the running frontend can be reflected in the prototype and interaction notes. The handoff records the versions used, observed differences and evidence for repeating acceptance checks.

Template 5.18.1 pairs with CLI 3.18.1. Projects own their issue tracker configuration, and synchronization preserves existing settings. The workbench guide shows where to read the registered goal digest for progress reporting and how to record reviews of linked materials.

Template 5.18.0 pairs with CLI 3.18.0. All three profiles include `pr` by default, and Spec also includes `retro`. Spec continuations check prototype and interaction-note versions, identify affected acceptance criteria, and carry forward applicable decisions. Review findings with material acceptance impact can include steps to reproduce the issue.

Template 5.17.1 updates the documented pairing with CLI 3.17.1. The CLI workbench provides Pi model search and selection for individual runs.

Template 5.17.0 adds a review of the requirements and acceptance criteria before a complete Spec is submitted for confirmation or handed off. The review checks the adopted sources, combinations of business rules and observable outcomes. Both Frontend installation modes include the FormKit skill, a schema guide and a standalone JSON example, along with offline VueUse function references. Spec projects can add the FormKit skill on demand.

Template 5.16.1 aligns text input and select focus with a single border in high-fidelity prototypes and the design preview, while preserving error and high-contrast cues. The Query and Detail example adds a long-list and editing scenario for short viewports, same-query refresh, draft recovery, and focus restoration.

Template 5.16.0 adds the loading and transition skill to the Frontend defaults and includes pinned official shadcn-vue references. Frontend implementation can use high-fidelity prototype review findings while following the target project’s components, theme and request handling. Workbench guidance covers material review, scoped evidence and previously accepted delivery goals.

Template 5.15.0 adds `shadcn-vue` and `vueuse-functions` to the Frontend defaults and aligns the Vue scaffold theme with its component library. Skill descriptions state when to use each skill and what it delivers. Skills authored in English keep their English primary descriptions. `yss-help` recommends skills available in the target project and host. Spec handoffs record the scope of each batch, the decisions it affects, and the implementation plan.

Template 5.14.0 asks teams to record the confirmed scope, material versions and user responses for both business requirements and acceptance criteria, and for prototypes and interaction notes. Implementation based on a Spec checks those confirmations and open questions in scope. Before the first or a delegated implementation change, agents check the target Git repository, branch and relevant local changes. Both Frontend installation scopes include the shared repository guide.

Template 5.13.0 adds Chinese skill guidance through `yss-help` and renames seven entry points for business analysis, product specifications, UI design, logic experiments, document writing, decision mapping and PR/MR delivery. The [skill migration map](.template-spec/agents/profile-skills.md#技能改名) lists the old and new names. Specification, interaction and prototype work identifies the owning Spec before writing. A request limited to a selected prototype keeps writes within that prototype. Backend `yss-repository` adds a standard-library Python tool that generates PO/Mapper files from reviewed models and explicit project configuration while protecting existing files with different contents.

The current source provides 20 default skills out of 67 available for Spec, 44 out of 57 for Backend, and 21 out of 26 for Frontend. Both installation modes in all three profiles include `pr` for drafting or revising PR/MR descriptions. Use `retro` for explicitly requested Agent session retrospectives. Spec includes it by default, and Backend and Frontend users can install it on demand. Use `yss-deliver-pr-mr` to deliver selected materials through a PR or MR. Spec users can add `formkit` on demand. Install the CLI with the new embedded template, then synchronize the relevant project scope.

GitLab CI retains the compatible CLI 3.7.0 build source `f2e0a952123fbd9f12d3703b8df2b03d02b670cb`. The final CLI release records its own source and template commits. CLI 3.3.0 adds `scaffold frontend`. The Frontend Profile remains available from CLI 3.2.0, while 3.1.4 and earlier do not support it. Check the actual CLI help and embedded Bundle. Publishing the template does not update installed CLIs or projects. See the [Home validation report](.template-source/design/2026-11-15-spec-home-repo-validation.md) for the observed scope and limits.
