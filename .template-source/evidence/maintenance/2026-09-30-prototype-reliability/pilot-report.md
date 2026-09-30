# 真实 Agent 试点结果

本轮按停止条件结束：**启动 1/14 次，正式对照 0/6 组，视觉收益未确认**。未增加预算、未补跑、未静默更换模型。

- 运行时：冻结的 Codex CLI，gpt-6-astra / xhigh。实际 Agent 进程退出 0，完成 1 个 turn；评测器进程退出 1。判定在实际进程结束后进行。
- 实际 Agent 时间：616.213 秒；准备、评分及清理另计，总控制器墙钟约 620.4 秒。未超时。
- 离线依赖预先物化；共 115 个包，setup 在 Agent 启动前完成实际构建。Agent 没有安装依赖。最终写范围检查通过，仅 drafts/ 变化；该检查不宣称操作系统级写隔离。
- 使用量按原始事件计：input 1469767（含 cached 1368832），output 18358，reasoning output 4943；cache write 0。不推算价格或节省比例。
- 成功显式读取 yss-prototype-stage、yss-design-system；完整命令、实际读取证据与原始产物见 pilot/calibration-baseline。显式读取不保证整个文件被消费。

## 两个校准问题

1. 自动断言用 `node --input-type=module -e` 导入旧快照中的 prototype-contract.mjs，旧 CLI 入口未处理 argv[1] 缺失，触发 TypeError。这是实际评分失败原因。交付代码已修复，并增加无 CLI argv 导入及路径别名回归检查。
2. fixture 同时要求构建器写 drafts/DESIGN.md 和 Agent 写 drafts/design.md。在 macOS 大小写不敏感文件系统上发生冲突。Agent 自行在允许范围内保留 project-snapshot 并报告问题；这不改变原评测器失败结论。修正配置使用 drafts/design-notes.md，确定性离线检查通过，**未启动新的 Agent**。

首个浏览器补充诊断误选了隐藏的场景 option，保留初始失败记录；改用可见 alert 后，未修补原始 Agent 产物，查询、详情、编辑、失败保留、重试和重置在两个视口通过。这不是正式评分器的通过，也不撤销校准失败。

## 可归因范围与限制

两组共用场景、修复工具、依赖和 QA；冻结差异为方法、五类模式、低保真演练及导航，共 56 个文件（含物化投影）。增强组没有启动，六类正式任务的两侧均未启动，故无有效匿名 A/B。

CLI 入口与测试在试点冻结后进一步修复；逐文件差异见 pilot-delivery-drift.json。**原试点不代表最终交付源码的设计收益**。源输入、评分器、预算、原始失败、未执行项全部保留；不把维护者修复后的示例冒充 Agent 结果。修正后的 suite 只作为后续输入，沿用本轮停止状态，不自动恢复。
