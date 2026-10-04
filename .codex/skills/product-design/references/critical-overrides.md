# Critical Overrides

These rules override generic assistant defaults for Product Design work.

## Context

- When working inside an existing project or product, find similar flows, screens, components, and UX patterns first. Build on the product's existing design system. Do not reinvent the wheel. Look for style sheets, tokens, and other materials that constitute the design and adhere to them in your work.

## Saved User Context

- Follow [User Context](../skills/user-context/SKILL.md#saved-user-context) for saved sources and preferences. Use its [conditional Preflight](../skills/user-context/SKILL.md#preflight) when saved context is needed, and reuse the loaded result while its state paths, digests, and relevant scope are unchanged.
- Inspect only references needed for the current task. When visual grounding is needed, include the relevant saved images, tokens, design language, and component references in the current workflow; user-requested changes still take precedence.

## Design Brief Gate

- For Product Design requests that design, build, prototype, clone, redesign, extend, or generate product UI directions, run `$get-context` before `$ideate`, `$prototype`, `$url-to-code`, or `$image-to-code`.
- `$get-context` can run in question mode or playback mode. If required product, visual, or interactivity details are missing, ask for them. If those details are already present, play back the brief in a pithy format before moving to the next workflow.
- Do not proceed to ideation or implementation until the brief has been played back and either confirmed by the user or already confirmed earlier in the thread.
- A confirmed design brief is not a visual target. Use the confirmed brief as input to `$ideate` unless the user has already provided a concrete visual source such as a URL, screenshot, image, mockup, or Figma frame.
- Reuse a brief already confirmed in the current thread while its scope and inputs remain current; missing or changed decisions still require a real user response.
- After the user approves the brief and the next step is an involved app, prototype, clone, redesign, or build, briefly explain the next work, its checks, and any material uncertainty. Give a time estimate only with a stated basis, scope, and conditions. Skip this note for tiny static changes, quick audits, simple research, setup-only, or share-only requests.

## How to communicate

- Follow [communication-protocol](communication-protocol.md)

## Build Handoff

- After a successful app, prototype, clone, redesign, or image-to-code build, return the prototype link first. This handoff is not blocked by sharing setup.
- Add one short iteration nudge: ask the user what they want changed next, and mention that annotations are useful for pointed edits.
- Add one short share nudge. Before naming a share target, check saved Product Design context and current available tools for targets that `$share` can use, such as `@Sites`, `@Vercel`, or another selected deployment tool. If a target is available or preferred, ask whether to share with the team through that target. If no target is clear, ask whether they want to share with the team and route to `$share` to choose the target.
- Keep the wording plain and human. Example: `Tell me what you'd like to change and we'll iterate. Annotations are great for pointed edits too. Want to share this with your team via @Sites?`

## Re-read this file

- Read this file on first entering a Product Design workflow. Re-read only when context was lost, the file changed, or a new workflow/decision requires it; do not use a message-count cadence.

## Explore vs. Design vs. Build

- Do not build from under-specified product context alone.
- Do not treat "try to fulfill first" as permission to skip source capture or design mock creation. Follow the workflows prescribed in this plugin as contracts.
- For URLs, capture and open a screenshot first. If the reference cannot be captured, opened, or attached, stop before generating options from prose only.
- Never invent a better first screen, landing page, hero, card style, icon set, image style, color palette, radius, spacing, or typography when cloning or matching a provided source. Match the source.
- Check the work like a senior designer. Look for broken layouts, cropped images, bad padding, bad margins, wrong font styles, wrong font weights, incorrect borders, and incorrect border radii.
- Screenshots are not QA by themselves. Put the reference image and the prototype screenshot together in the same comparison input, then judge the visible differences from that combined input. Use the same viewport and state, fix visible mismatches, then compare again.
- Carry the confirmed interactivity level and required states into every downstream workflow and QA. Static review requires visual/state representation only; interactive prototypes implement the agreed flows and key failure states. Do not add CRUD, real data writes, new pages or routes beyond the agreed scope.

## Browser user

- Only use the user's chosen browser. If you need to use the Playwright CLI or MCP directly, ask the user before proceeding.
- Provide URLs, screenshots, mocks, Figma files, or other visual sources, including detailed art direction to ImageGen when generating designs and assets.

## Working with and making assets

- Never fake visible assets with ASCII, prose, text symbols, emoji, placeholder boxes, CSS art, div art, handcrafted SVGs, inline SVGs, or approximate code drawings. Preserve approved source assets, including existing SVGs and code-native brand components. The prohibition concerns unapproved approximations replacing the target, not faithful reuse. Use real source assets when available. Use the built-in Image Gen tool for image assets when source assets are missing. Use the closest matching icon library for icons.
- Work like a designer. Measure the component or section first, then create or place the asset to fit that slot. Match the needed dimensions, crop, subject, palette, and density. Do not lazily crop sprite sheets, stretch screenshots, or use images that do not fit seamlessly into the design.
