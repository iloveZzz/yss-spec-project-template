# YSS 路由与实现合同编译

`yss-router` 技能在 YSS 垂直切片进入实现时选择最小 YSS skill 集合，编译 Slice Implementation Contract 草案并检查实现就绪度。路由发生在垂直切片需要跨 Frontend / Backend / API 区域、需要实现就绪检查或需要 TDD 模式与证据计划时（见 [[垂直切片Ticket]]）。

Router 的职责边界：使用 `yss-router` 选择最小 YSS skill 集合——后端领域、Application、Repository / Gateway、Web / DTO 分别路由到对应 YSS skill（见 [[YSS工程技能体系]]）；涉及 POJO 样板或对象转换时必须加载 `lombok`、`mapstruct` 和 `alibaba-java-code-style`。Router 编译 Slice Implementation Contract 草案后，由生命周期编排器核验并持久化（见 [[切片实现合同]]）。

Router 不得自行批准合同或设置 `ready-for-agent`；批准、持久化与最终就绪判定属于编排器与门禁（见 [[条件强制门禁]] 与 [[Ticket与流程状态]]）。实现就绪检查还包括确认受影响的 frontend / backend 工程是 `existing`、`required` 还是 `initialized`，并登记实现仓库、分支、CI、验证命令和回滚点（见 [[实现仓库与跨仓库契约]]）。

YSS Skill Execution Result 是 YSS 专项 skill 完成工作单元后返回的结构化执行证据，记录合同版本、变更文件、证据文件、实际验证、延期 seam、偏离和新增影响；实现者自报不构成最终通过，必须由 Router、生命周期编排器和独立 Reviewer 复核（见 [[Fresh验证与独立审查]]）。
