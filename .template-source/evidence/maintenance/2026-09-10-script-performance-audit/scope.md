# 脚本性能分析范围

用户已确认：本体和9个Git子项目全量分析；优先日常Plan → Spec → Ticket，其次fast，最后完整验证；本轮只交付证据和优化方案，不改运行脚本。包含scripts的目录外调用闭包；分发快照/投影按源分组，历史及临时目录单列。写入型基准在临时隔离副本运行。

这是template-source分析，不生成产品资产；context reconciliation为not-applicable。此范围说明已经核对.gitmodules、根yss-project.yaml，后续分析结果尚未完成。
