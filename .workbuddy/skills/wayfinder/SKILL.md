---
name: wayfinder
description: "显式调用时，为跨多个会话的大型工作建立决策地图，逐项收敛后交回主流程。"
disable-model-invocation: true
---

A loose idea has arrived — too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** — questions whose resolution is a decision, not slices of a build to execute — one at a time until the route is clear.

The destination varies per effort, and naming it is the first act of charting — it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration. The map is domain-agnostic — engineering work, course content, whatever fits the shape.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone goes and does the thing. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes** — carrying execution into the map itself — but absent that, produce decisions, not deliverables.

## Refer by name

Every map and ticket is an issue, so it has a **name** — its title. In everything the human reads — narration, the map's Decisions-so-far — refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish — a name wraps its link — but they ride _inside_ the name, never stand in for it.

## The Map

The map is a single issue on this repo's issue tracker, labelled `wayfinder:map` — the canonical artifact. Its tickets are child issues of the map.

Return the decision map to the active orchestrator for formal asset/state acceptance. Explicit invocation does not authorize remote publication or Git commits; preserve those action boundaries.

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place — its ticket — so the map never restates it, only gists it and links.

**Where the map, its child tickets, blocking, and frontier queries physically live is tracker-specific.** The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`. Consult the tracker doc's "Wayfinding operations" section for how _this_ repo expresses them. If no tracker has been provided, default to the local-markdown tracker.

### Map and ticket format

创建或更新地图 / Ticket 时读取 [资产结构](references/map-format.md)。地图只索引决定，详情留在 Ticket；先认领再处理，以原生依赖表示阻塞。

## Ticket Types

选择或处理 Ticket 类型时，读取 [类型与参与方式](references/ticket-types.md)。Research 为 AFK；Prototype / Grilling 为 HITL，真实用户回复不能由 Agent 代答；Task 只为解除决定阻塞。

## Scope and frontier

划分未知范围、生成新 Ticket 或剔除越界工作时，读取 [范围与决策前沿](references/scope-and-frontier.md)。能明确提问的工作可成票；范围外工作不作为待细化事项。

## Invocation

Two modes. Keep each decision traceable and stop at a real dependency, decision or context boundary; related small tickets may share a session when their evidence remains clear.

### Chart the map

用户给出模糊想法、尚无地图时，读取 [建立地图](references/chart-map.md)。先确认目标和范围，再创建可明确提问的 Ticket；建立地图不代替执行。

### Work through the map

用户给出已有地图时，读取 [推进地图](references/work-map.md)。先加载地图再认领一个未阻塞的决定，相关 Ticket 详情按需读取；完成后记录决定并更新前沿。
