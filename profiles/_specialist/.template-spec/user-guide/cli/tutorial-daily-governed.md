# 项目日常使用

Rust CLI `3.8.0` 已支持 `project` 与 `skills` 两种安装范围。project 含技能及项目资料，skills 含项目内技能、宿主入口及必要引用。新项目或 Home 使用 init，已有普通工程使用 attach，已受管安装使用 sync。完整命令见 [安装与接入](install-and-verify.md)。

日常目标直接在当前会话向 Agent 提出，并提供相关资料和允许修改的工程。Agent 依据目标选择研究、规格、设计、实现或审查工作。项目采用个人工作台时，可记录 Spec 状态、阶段、答复与确认，查看过程见 [日常工作](daily-and-targets.md)。

维护项目资源时，直接执行已有授权内的命令，需要查看影响时使用同一命令的 dry-run 预览。文件冲突和中断按 [维护与恢复](tutorial-maintenance.md) 处理。
