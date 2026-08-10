# 垂直切片 Ticket

垂直切片（Vertical Slice）是贯穿所有受影响层、可独立验证的窄功能路径。契约冻结后，使用 `to-tickets` 将需求拆成可独立验证的窄垂直切片 Ticket，禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分。

垂直切片 Ticket 记录范围、阻塞关系、验收标准和验证证据，是 Agent 直接实现的工作单元。只有通过必要门禁、阻塞边已清除并具备直接实现条件时，才能标记 `ready-for-agent`；其余切片保持 `ready-for-human`（见 [[Ticket与流程状态]] 与 [[条件强制门禁]]）。

切片拆分以冻结的 Spec 与 OpenAPI 契约为输入（见 [[Spec基线]] 与 [[OpenAPI契约]]）。每个切片进入实现前，先由 `yss-router` 编译 Slice Implementation Contract 草案，再由生命周期编排器核验并持久化（见 [[切片实现合同]] 与 [[YSS路由与合同编译]]）。后端切片必须在统一合同中补齐 Backend Slice Implementation Contract，包含 `required_skills`、`allowed_write_paths`、`forbidden_patterns`、`expected_evidence_files`、`seam_deferred` 与 `verification_commands`。

垂直切片按 `tdd` 使用已确认的公开 seam 逐切片实现，核心 YSS skills 必须消费批准合同并返回 YSS Skill Execution Result；路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 阻断继续实现或触发重路由。切片模板见 raw 源 `vertical-slice-ticket-template.md`。
