---
name: get-context
description: "Establish the Product Design brief before ideation or builds; reuse supplied context and clarify missing decisions."
---

# Get Context

Gather only the context needed for the next design action. This skill resolves or confirms the design brief; it does not implement UI or create durable design artifacts.

Run this skill at the start of Product Design requests that ask to design, build, prototype, clone, redesign, extend, or generate product UI directions.

Use question mode when any of the following are unclear:

- what product, site, feature, workflow, component, or screen is being designed
- what visual source should determine how it looks
- what concrete preferences or avoidances should shape visual exploration when no source exists
- what level of interactivity the user expects

Use playback mode when the user already provided the needed details. In playback mode, do not re-ask answered questions; play back the brief in a pithy format and name the next workflow.

Hard boundary: do not implement UI, scaffold a prototype, start a server, or create files while context is still missing.

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

When the workflow needs saved product or design context, load [$user-context](../user-context/SKILL.md) and follow its [conditional Preflight](../user-context/SKILL.md#preflight). Reuse the loaded result while its state paths, digests, and relevant scope are unchanged.

Use relevant saved sources and preferences as grounding material under [Saved User Context](../user-context/SKILL.md#saved-user-context). Inspect only references needed for the current task.

## Get Context Script

Resolve the product goal, visual source or direction, and interactivity level. Reuse supplied details and current confirmations; ask only about missing decisions. If the fields are known, summarize the design brief in your own words.

The questions to answer are:

> What do you want the thing to do?

> What existing product, design system, Figma file, screenshot, URL, image, or other visual source should it match? If none, what look are you going for? Mention existing design systems already in user-context if they exist.

> What level of interactivity should the thing have?

One of:

- Full interactivity: all controls and states are completely functional and implemented.
- Static: visual/state review only; simulated controls are labelled and no functional workflow is implied.
- Pass `interactivity`, `required_states`, selected visual source and asset-reuse decisions to the next skill and its QA; reuse an already confirmed brief unless its scope changes.

After the questions, reply with a pithy design brief that summarizes what you're about to explore. Avoid walls of text at all costs. Be clear and concise.

Example script to follow:

```
Before I build, the Product Design workflow needs a quick design brief.

What should the login page do? Email/password only, magic link, SSO, sign-up link, forgot password?
Do you have an existing design system, app, Figma, or screenshot to match?
If not, what look are you going for?
Interactivity level: full working form states, or a faster mostly-static mock?

```

## Final message

1. Reuse the exact brief already confirmed in the current thread while its scope and inputs remain current. Otherwise, before proceeding to `$ideate`, `$prototype`, `$url-to-code`, or `$image-to-code`, explain the brief back to the user as a concise `final` message for confirmation.

2. Proceed only after the user confirms the design brief, unless the current thread already contains confirmation of that exact brief. If the user provides feedback, continue to refine the design brief with them.

3. After the user confirms the design brief, send a short note before starting an involved app, prototype, clone, redesign, or build. Explain the next work and how it will be checked; state any material uncertainty. Give a time estimate only when it has a stated basis, scope, and conditions. For example:

```text
The brief is confirmed. I'll build the agreed screens, verify their states, and compare the rendered result with the selected design before handing it back.
```

Do not send this note for tiny static changes, quick audits, simple research, setup-only, or share-only requests.

Done means the user has confirmed the design brief.
