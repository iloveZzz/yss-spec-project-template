---
name: yss-formily-schema-generator
description: Use this skill when the user wants to generate YssFormily JSON Schema or YssFormily-rendered form code from natural-language requirements, screenshots, local images, mockups, or Figma designs. Covers converting input intent into field models, layout sections, schema structure, slots, detail mode behavior, and handoff artifacts that are compatible with the repository's YssFormily conventions.
---

# YssFormily Schema Generator

Use this skill to turn upstream input into downstream YssFormily form artifacts.

Supported input forms:

- user text descriptions
- product or UX requirements
- screenshots and local images
- Figma links or node-based design references

Expected output forms:

- a YssFormily JSON Schema or `ISchema`
- a recommended `v-model` data shape
- optional `scope`, `effects`, and slot plan
- optional Vue render snippet showing how to mount `YssFormily`

This skill designs the schema.
For implementation rules and exact YssFormily behavior, also read:

- [yss-formily](../yss-formily/SKILL.md)

For conversion workflow and field mapping, read:

- [references/workflow.md](references/workflow.md)

## Activation rules

Use this skill when the request is any of the following:

- “根据需求描述生成表单 schema”
- “根据原型图生成 YssFormily”
- “根据图片/截图还原表单”
- “根据 Figma 生成表单 JSON Schema”
- “把业务字段整理成 YssFormily schema”
- “输出 schema 和渲染代码”

## Core principle

Do not mirror the visual surface blindly.
Translate the input into a stable form model:

1. business intent
2. field semantics
3. validation and dependency rules
4. layout grouping
5. YssFormily schema

The schema must reflect business meaning, not just pixel arrangement.

## Input-specific workflow

### Text requirement

Extract, in order:

1. form purpose
2. mode: query, create, edit, detail, mixed
3. sections or groups
4. fields
5. required rules
6. options or dictionaries
7. linkage rules
8. submit and action area

If some details are missing, make reasonable defaults and state the assumptions.

### Screenshot or image

Treat image understanding as approximate.
First identify:

- section boundaries
- labels
- control types
- action buttons
- required markers
- visible dependency hints

Infer likely field types from UI controls, but do not overclaim hidden business rules from appearance alone.
If the image contains only visual cues and no validation semantics, generate a schema skeleton and explicitly mark uncertain fields.

### Figma input

When a Figma link or node is provided, use the Figma workflow to inspect the design first.
Extract:

- field labels
- control kinds
- layout groups
- helper text
- required indicators
- readonly versus editable patterns
- footer actions

Then convert that structure to YssFormily, following local YSS conventions instead of raw design-tool naming.

## Required outputs

Unless the user asks for less, produce these artifacts:

1. schema
2. model shape
3. assumptions
4. open questions only if they block correctness

If the user asks for code generation, also produce:

5. `scope` plan
6. `effects` plan if needed
7. Vue usage snippet

## Schema design rules

Always align with `yss-formily`:

- wrapper component is `YssFormily` or `YFormily`
- schema is `FormLayout -> FormGrid -> fields`
- use `FormItem` for ordinary fields
- prefer one shared schema for create/edit/detail when feasible
- for detail rendering, plan `mode=2` and `detail-*` slots where needed
- rich custom input uses `Slot`

Do not emit schema that depends on React Formily UI packages.
Treat Ant Design Vue semantics as the underlying component behavior.

## Output quality bar

A good generated schema should:

- have stable field keys
- use domain-oriented group names
- distinguish required from optional fields
- choose plausible component types
- reflect obvious linkage and readonly behavior
- leave non-inferable business rules as assumptions instead of hallucinating them

## Generation sequence

Follow this sequence every time:

1. Classify the input source.
2. Extract business structure.
3. Normalize field list.
4. Decide field types and components.
5. Decide sections and layout spans.
6. Identify validation, enum, and linkage requirements.
7. Produce YssFormily schema.
8. Produce render snippet if requested.
9. Call out assumptions and uncertain inferences.

## When the input is incomplete

Use these defaults unless the existing code or user input says otherwise:

- text fields -> `Input`
- long description -> `Input.TextArea`
- boolean toggle -> `Switch`
- single choice -> `Select` or `Radio.Group`
- date -> `DatePicker`
- grouped sections -> `GroupHeader`
- footer buttons -> `AutoButtonGroup`

Prefer conservative defaults over speculative complexity.

## Do not do these things

- Do not invent backend dictionaries that were never described.
- Do not infer hidden async validation from visuals alone.
- Do not flatten all fields into one group if the input clearly has sections.
- Do not produce only a screenshot-level description when the user asked for schema.
- Do not skip assumptions when confidence is low.

## Recommended final structure

When delivering a full conversion, prefer this output order:

1. brief understanding
2. assumptions
3. field model
4. schema
5. optional render snippet
6. optional next-step questions
