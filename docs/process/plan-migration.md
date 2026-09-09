# Plan 阶段切换说明

新流程仅使用 `stage.plan`、`artifact.plan-record`、`work-unit.plan-opportunity` 和 `work-unit.plan-requirements`。不提供 Discovery 阶段别名、旧标识解析或兼容入口；旧 ID 在注册表中仅作为弃用清单保留，以防重新分配，不可执行。

新工作从 `docs/plan/templates/plan-template.md` 起草，工作目录为 `docs/.scratch/<feature>/plan/`。问题、机会和事实探索是 Plan 内按影响面执行的活动。

历史冻结文档、批准记录和摘要保持原字节。旧状态不能直接恢复执行；如需继续，按当前 Plan 模板重新整理输入并核查当前退出条件，不把旧批准自动视为新流程批准。已有事实和结论可引用，但须记录当前版本、适用范围和复用理由。

综合模板和战略设计模板共同采用 Plan。它为 Spec 提供战略输入；后续 Spec、页面原型、契约、Ticket 及交接边界仍由各自 profile 和生命周期注册表定义。Plan 不等同于实现合同中的 Context Plan。

影响业务边界、关键规则或 MVP 的未决项必须在进入 Spec 前解决；其他细节须经用户确认延期，并具备不影响当前决定的依据、责任人、解决时点和接收方。既有 runnable blocker 不得降为普通延期项。

Plan 是借鉴 AI-DLC 前置规划职责的本地名称，不宣称是 AWS 官方阶段名称或完整 Inception。
