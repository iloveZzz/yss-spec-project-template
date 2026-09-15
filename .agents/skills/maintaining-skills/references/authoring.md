# Skill authoring and discovery

Use this reference when changing a skill's trigger, prompt structure or runtime metadata. These are authoring criteria, not a replacement for the host repository's approval or verification policy.

## Discovery

- Front-load the distinctive capability and triggering task. Put implementation inventories, output formats and background in the body. Avoid universal triggers such as every code edit or every database mention.
- Keep a working narrow description unchanged when shortening would lose its boundary. There is no universal character or line limit in this guidance.
- For explicitly invoked compatibility entries, preserve existing invocation metadata and include `policy.allow_implicit_invocation: false` in `agents/openai.yaml` for Codex. Keep any existing interface and dependency metadata. This policy controls implicit selection, not authorization to perform external actions.
- Keep source, projection and compatibility entry identities distinct. Do not delete generated runtime roots just because the current client also discovers the canonical root.

## Instructions

- State the necessary inputs, result, fragile invariants and completion evidence. Let the agent choose routine steps within the authorized scope.
- Put conditional examples and detailed variants in named reference sections; explain when to read each. Keep essential permission and correctness constraints visible in the entry.
- Reference the owning repository rule rather than repeating a second policy. Remove unavailable tool names and unregistered skill dependencies; describe the capability and fallback instead.
- Preserve support for other models and runtimes. Do not encode a model name, reasoning effort or assumed tool availability into shared workflow rules unless the task is specifically a runtime configuration change.

## Evaluate the change

Use realistic prompts covering a direct request, a paraphrase, a neighboring task that should not trigger, an explicit compatibility request and any permission boundary affected. Review whether the description selects the right entry and whether required references are reachable. Keep structural checks separate from observed model behavior: a metadata or keyword check is not an end-to-end model evaluation.

Run the checks warranted by the change and the repository policy. After success, repeat only when a new edit, failure or unresolved concern requires it. Do not replace required suites with a smaller check or infer release readiness from reduced prompt length.

## Sources

Authoring guidance reviewed on 2026-09-16: [OpenAI's Astra Skills guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [Codex Skills documentation](https://developers.openai.com/codex/skills). These support concise discovery and conditional loading; repository-specific gates remain local decisions.
