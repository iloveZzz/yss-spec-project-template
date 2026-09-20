---
name: ideate
description: "Generate visual alternatives or remixes after the Product Design brief is confirmed."
---

# Ideate

You're tasked with generating design concepts for a user's idea.

Follow the shared Product Design routing guidance in [$index](../index/SKILL.md).

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

Before starting, load [$user-context](../user-context/SKILL.md) and run its preflight script when local shell access is available.

Attach provided product URLs, Figma files, screenshots, reference images, codebase paths, Storybook, tokens, design systems, brand assets, component refs, browser preferences, and share targets to the Image Gen generations to align them to the design brief.

Do not inspect every saved reference. Inspect only what the current task needs.

## Workflow

Do not generate images until `$get-context` has played back and confirmed the design brief for this exact request. If this skill was invoked directly and the current thread does not already contain that confirmed brief, route to [$get-context](../get-context/SKILL.md) first.

Before generating images:

1. Understand the brief.

- Identify the target: component, screen, feature/workflow, or broad product idea.
- Identify the intended user, product surface, and goal.
- Preserve hard constraints from the user.
- Run `get-context` if the brief has not already been played back and confirmed.

2. Resolve context.

- Use provided files, screenshots, links, and visible references.
- In a local workspace, look for nearby design documentation and other local visual context.
- Check likely design context folders such as `user-context`, `storybook/`, `.storybook/`, `design-system/`, `design-systems/`, `tokens/`, `components/`, `app/`, and generated prototype roots.
- In an existing project, look for existing product screenshots, similar flows, Storybook captures, design tokens, and component references before generating. Ask if the user can provide example screens similar to the one they are building if the existing app isn't accessible. Ensure you add design language and tokens to the Image Gen prompt.

3. Inspect references directly.

- Look at screenshots, images, Figma frames, app surfaces, or other visual references before generating.
- Do not infer from filenames alone.
- If a named local path or reference is not visible, stop and ask the user to confirm the path, upload the file, start the local app, or point to the correct workspace.

4. Decide the variation mode.

- If useful local design context exists and the user has not asked for a new style, stay within that existing direction.
- If no useful design context exists, or the user asks for broad exploration, vary both concept and visual system.
- For a specific component or existing surface, vary structure, interaction, hierarchy, and emphasis before varying brand style.
- For a broad product idea, explore three meaningfully different product directions.

5. Choose target dimensions before Image Gen.

- Pick the dimensions that best match the user's request and any provided visual reference.
- Mobile app: `390 x 844`.
- Tablet app: `834 x 1194`.
- Desktop app, dashboard, admin, or SaaS: `1440 x 1024`.
- Landing or marketing page: `1440` wide and scrollable.
- Modal, panel, widget, or component: natural container size.
- Provided screenshot, Figma frame, mockup, or reference image: match its dimensions and aspect ratio when the user wants to continue from that visual.
- Avoid crowding. Make the design fit the chosen dimensions cleanly, with realistic spacing, readable type, and no clipped content.
- Include the chosen dimensions in every Image Gen prompt.

6. Check for access gaps.

- If a connector, reference, or file cannot be accessed because of auth, permissions, expired login, missing scope, suspiciously empty results, or unavailable local state, stop.
- Name the gap clearly and ask whether to troubleshoot access or continue without that source.
- Do not generate images while silently ignoring a named reference.

7. Ask only if context is too thin.

- Ask one targeted question only when available context is insufficient to generate useful directions.
- Prefer asking about style direction, target audience, or the reference surface.

8. Attach images and mocks provided by the user to the Image Gen call along with your design brief.

9. Generate 3 independent options that have distinct information hierarchy, layout strategy, interaction model, or product framing.

Rules you must follow:

- Use the Image Gen prompt below.
- Use the built-in Image Gen tool.
- Respect the user-requested count; default to three distinct options only when exploration is needed. Stop after the selected direction answers the current design decision.
- Generate options in parallel when possible.
- Each option must be its own Image Gen result. Do not put multiple ideas in one image.
- Attach provided screenshots, files, app captures, Figma references, and visual source material as moodboard inspiration when available.
- Attach existing product screenshots, similar flows, Storybook captures, design tokens, and component references as grounding material when available.
- If a screenshot, image, or visual file is available, attach the actual image to the Image Gen call. Do not rely on text descriptions of it.
- Only claim a visual reference was attached if the Image Gen call actually received that image or a readable local image path.
- If you cannot attach the image, say that clearly and ask whether to continue with text-only direction.
- Preserve hard constraints from the brief in every image.
- After generating options, stop for the user's selection before any build work begins.
- The selected option is the visual target for `$image-to-code`.

## Feedback Loop

If the user gives feedback after seeing options, generate revised options with that feedback.

If the user selects an option and gives feedback, generate a revised option with that feedback before build.

If the user likes parts of more than one option, combine those choices into a new Image Gen design and show it before build.

## Image Gen Prompt

在实际生成方案图前，按目标尺寸、布局和字体需要读取 [图像提示模板](references/image-prompt-patterns.md)。用户已选来源、方案数量与当前设计决策优先；模板不要求补造无关维度。

## Output

After generation, provide

1. A short, memorable name for each concept that distills its choices down.

2. A short closing question that asks whether the user wants to keep exploring or choose one direction to continue.

If the image tool already displayed the generated images in the thread, do not embed the same images again in the final message.

If the image tool did not display the generated images, include one image per option.

Do not show the same generated image twice.

Example closing question:

> Want to explore more directions, or should I build one of these? If one works, tell me 1, 2, or 3.

Done means the requested number of independent images was generated and the user has been asked to select one.
