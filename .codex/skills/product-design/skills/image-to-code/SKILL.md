---
name: image-to-code
description: "Implement a selected image, screenshot or mockup as a responsive frontend after confirming the design brief."
---

# Image to Code

You're tasked with translating the visual target image into a high-quality, interactive website or web app.

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

Before starting, load [$user-context](../user-context/SKILL.md) and run its preflight script when local shell access is available.

Use saved product URLs, Figma files, screenshots, reference images, codebase paths, Storybook, tokens, design systems, brand assets, component refs, browser preferences, and share targets as grounding material when relevant.

Do not inspect every saved reference. Inspect only what the current task needs.

## Workflow

CRITICAL: THIS IS NOT GUIDANCE. THIS IS A CHECKLIST TO COMPLETE.

0. Do not start unless `$get-context` has played back and confirmed the design brief for this exact request. If this skill was directly at-mentioned without a clear visual target or the current thread does not already contain a confirmed brief, route to [$get-context](../get-context/SKILL.md) first.

1. Do not start unless you have a selected image, screenshot, mockup, or Image Gen result to recreate. A written brief is not enough.

2. Treat the provided image as the design to recreate.

3. If the provided design is a mobile viewport, build a mobile app. If it's unclear, default to desktop.

4. Review the reference design and inventory its assets. Reuse provided or authorized source assets unchanged unless modification is requested. Generate only a genuinely missing asset when its creation is in scope and the tool is available; name unresolved asset gaps.

    Examples include:

    - Hero images including full bleed image backgrounds
    - Featured article imagery
    - Thumbnails
    - Decorative illustrations
    - Textures and background motifs
    - Logos
    - Product images
    - Avatars

    Rules:

    - CRITICAL RULE: Do not replace approved source assets with unapproved approximate drawings or placeholders. Reuse provided SVGs and other original assets; only missing in-scope assets require a generation or library capability.
    - If text is part of an image asset, keep it in the image asset. Examples include full bleed hero images, signs, posters, packaging, storefronts, article art, and illustrations where the type belongs to the visual itself. Do not crop the background image and recreate that text with transparent text boxes, HTML, CSS, or separate overlay layers unless the source clearly shows editable UI text sitting on top of the image.
    - Do not use generic placeholders where the reference implies custom visual content.
    - Generated assets must share the same art direction, palette, rendering style, and design language as the reference mockup.
    - The built-in Image Gen tool does not support transparent images; post-process generated assets when transparency is required.

5. Define all sections of the page. For each section, meticulously measure the layout, spacing between elements, and the size and space of the elements themselves.

6. Find freely available fonts that match the target design.

7. Find a freely available icon library that matches the target design. Do not default to Lucide icons. Search for the best match.

    Rules:

    - CRITICAL RULE: Preserve original SVGs, icon assets and code-native visual components. Do not substitute approximate drawings without approval. Use a matching library or generation tool only for missing in-scope assets.

8. Build the app starting with [local-prototype-preflight](../../references/local-prototype-preflight.md). Carry the confirmed brief's `interactivity` and `required_states`. For static scope, implement faithful visual states without adding action workflows; for interactive scope, implement and verify the agreed controls and recovery states.

    Examples include:

    - Header, sidebar, tooltip, and modal interactions
    - Hover and focus states
    - Responsive navigation
    - Clickable cards and buttons
    - Animated affordances if implied by the design
    - Newsletter forms, tags, filters, or navigation elements shown in the mockup
    - A static prototype is complete when the agreed visual/state review is supported; do not expand it into a functional product.

    Rules:

    - Place every image asset you generated into its position before proceeding. I repeat, replace all placeholders, including CSS/SVG placeholders, before proceeding.
    - For interactive scope, required controls must work; for static scope, clearly label simulated controls. Do not create new pages or routes unless requested.

9. Run the local app.

10. Capture the local app using [browser-order](../../references/browser-order.md).

11. Run [design-qa](../design-qa/SKILL.md) as the blocking build gate.

    Steps:

    - Open the reference image and the latest prototype screenshot before writing the QA report.
    - Compare the same viewport and the same interaction state. If they do not match, capture the missing view first.
    - Save the QA report as `design-qa.md` in the project root.
    - Fix P0/P1/P2 issues, capture the app again, and repeat until the QA report says `final result: passed`.
    - Do not keep looping on P3 polish. Include any remaining P3s as follow-up iteration notes.
    - If source capture, prototype capture, or visual comparison is blocked, stop. `design-qa.md` must say `final result: blocked`.
    - Do not hand off unless `design-qa.md` exists and says `final result: passed`.

12. Handoff the app or website.

    - Only hand off after [design-qa](../design-qa/SKILL.md) passes.
    - Keep the prototype running locally.
    - Provide the clickable local URL.
    - Briefly describe the work as a designer would.
    - Include the post-build iteration and share nudge from [critical-overrides](../../references/critical-overrides.md#build-handoff).
