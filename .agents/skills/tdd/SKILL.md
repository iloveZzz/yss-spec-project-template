---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
---

# 测试优先开发

仅在用户明确要求 TDD、red-green-refactor 或测试优先开发时使用，不作为其他任务的前置。

围绕用户可观察的行为选择公共接口与最小案例：先写一个能复现问题的失败测试，再实现使其通过的最小变化，随后在行为保持的前提下整理代码。每轮只解决当前案例，不提前建设测试框架。

测试断言来自需求、已知样例或独立推导，避免重写实现作为期望值。优先行为而非私有方法或内部调用顺序；mock 放在真实外部边界。按需参考 [测试例子](tests.md) 和 [mock 指南](mocking.md)。

沿用工程现有工具，报告实际运行结果和缺少的环境。不要求任务路由、合同、独立复核、证据包或发布资格。
