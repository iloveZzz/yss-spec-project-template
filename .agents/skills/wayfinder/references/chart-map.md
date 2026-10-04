# 建立决策地图

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Run a `/grilling` and `/domain-modeling` session to pin down what this map is finding its way to — the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on any one thread, surfacing the open decisions and the first steps takeable now. If no open decision remains and the work fits one session, return the settled destination, scope and evidence to the active orchestrator. Continue within the existing authorization; ask only for a missing real decision or new authorization.
3. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues of the map — then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Wiring sorts them into the frontier and the blocked; everything you can't yet specify stays in the fog — the **Not yet specified** section.
5. **Dispatch research.** Route independent research tickets to `yss-research` when the runtime supports delegation; otherwise research in the current session. Follow the registered task-package and evidence contracts, and link the resulting sources from the ticket. Read-only intake uses schema v2 with empty write scope; formal research requires a new owner-issued task package. Template maintenance evidence stays in the registered external maintenance directory. Research does not require creating a Git branch.
6. Stop — charting is one session's work; it hand-resolves nothing.
