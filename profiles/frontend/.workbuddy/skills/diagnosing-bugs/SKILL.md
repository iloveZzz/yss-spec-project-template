---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
---

# 故障诊断

读取相关代码、错误输出和环境事实，形成能解释用户症状的假设。已有明确原因时直接做最小修复，不重启冗长问卷。

不确定时逐步缩小影响范围，按需复现、观察日志或使用短期探针；性能问题需要实际测量才能判断瓶颈。参考 [调查方法](references/investigation.md) 与 [反馈信号](references/feedback-loop.md)。

修复共享根因并处理调用方。回归测试、复现命令和额外审查按任务需要选择，不要求先写失败测试或完整执行固定阶段。无法运行时区分代码推断与实际观察。

输出原因、修改和已知限制，清除本次临时调试输出。日志中的令牌、密码和个人数据脱敏；保护用户文件，不扩大修复范围。
