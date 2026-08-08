---
name: wireframe-prototype
description: Use when low-fidelity product screens, user flows, whiteboards, Excalidraw, Figma, Penpot, tldraw, Axure, or prototype links are needed before detailed API or UI implementation work.
---

# Wireframe Prototype

Use this skill for low-fidelity product decisions. It favors fast, inspectable artifacts over polished visuals.

## Choose The Medium

| Situation | Recommended medium |
|---|---|
| Fast async discussion, page flow, rough layout | Excalidraw or Markdown wireframe |
| Design-system or high-fidelity collaboration | Figma or Penpot |
| Infinite-canvas workshop or AI-assisted whiteboard | tldraw |
| Enterprise clickable prototype already standard in team | Axure or equivalent link |

Do not make the tool the deliverable. The deliverable is the page/flow/state decision captured in `docs/design/`.

## Minimum Artifact

For each page or major interaction, capture:

- Page name and entry route.
- Key regions: search/filter, table/list, form, drawer/modal, validation panel, footer actions.
- Primary action and next screen.
- Empty, error, no-permission, readonly, conflict, and unsaved-change behavior.
- Prototype link, exported image path, or Markdown wireframe.

## Data Modeling Example

Sketch:

```text
模型列表
[筛选: 关键字][状态][负责人]              [新建模型]
--------------------------------------------------
| 模型编码 | 模型名称 | 状态 | 最近发布 | 操作 |
| CUSTOMER | 客户模型 | 草稿 | v3       | 编辑/校验/发布 |
--------------------------------------------------

模型详情
[基础信息] [字段] [版本历史]
字段表格 + 字段编辑抽屉 + 校验结果侧栏 + 发布确认弹窗
```

Then link or paste this into `docs/design/<feature>-interaction-spec.md`.

## Handoff

After the wireframe is captured, return to `product-design-prototype` to fill state matrix and API implications, then run `prototype-review`.
