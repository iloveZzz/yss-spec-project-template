# Skill mechanics

Read this reference when designing a skill's invocation policy or shared dependencies. The host repository owns authorization and lifecycle rules; runtime metadata expresses only the capabilities that the installed host actually supports.

## Keep the decisions separate

- **Discovery** makes an entry available through a catalog, description or explicit command. Keep the required `name` and `description` even when automatic selection is disabled.
- **Automatic selection** lets the model choose a relevant entry. A precise description helps selection; it does not grant permission to run commands or change files.
- **Explicit invocation** follows the host's supported user entry. Do not assume that a natural-language mention and a slash command behave identically on every host.
- **Reading dependencies** loads an authorized reference or shared contract. Disabling automatic selection does not by itself make that file unreadable.
- **Executing actions** still requires the repository's current scope, prerequisites and user authorization. Reading a commit contract does not authorize a commit.

## Express policy for the target host

`description`, `disable-model-invocation` and `agents/openai.yaml` are not interchangeable controls. The frontmatter field is interpreted by hosts that support it; Codex has its own `policy.allow_implicit_invocation` metadata. A generated projection proves that files were distributed, not that another host enforces the same policy.

For YSS registry and metadata consistency, use [the maintained authoring contract](../maintaining-skills/references/authoring.md). Preserve existing interface and dependency metadata. Verify the actual installed host's catalog and invocation behavior; record unsupported or unknown capabilities instead of treating an ignored field as enforcement.

Do not claim that a description is always loaded, that explicit-only skills have zero context cost, or that a policy field is a filesystem sandbox. Measure observable reads and runtime usage for the task being optimized, and leave absent telemetry unknown.

## Share references without adding unintended entry points

An authorized public skill may read an internal contract by its registered path while that internal skill remains excluded from independent automatic selection. The YSS commit skills use this pattern with `git-commit-core`. Retain the public caller's action-authorization boundary and the dependency's ownership and distribution rules.

Put shared material in a plain reference file or an internal skill according to its ownership and consumers. Neither location requires a new automatic workflow. Preserve the dependency closure, and do not publish a second copy that can drift independently.

## Split and route by responsibility

Create a separate discoverable skill when it has a distinct task, trigger and useful outcome. Move conditional detail into references when it serves the same task. Avoid mechanical splits based on leading words, length or assumptions about permanent context load.

A router can explain which entry or reference applies. It must preserve host-specific explicit-invocation requirements and the repository's approval boundaries; routing alone cannot grant execution authority. Check a natural-language positive, a nearby non-trigger, explicit invocation and any affected dependency or authorization boundary.
