# 两组模板前后试填复核

这是一轮维护者控制试填：同一作者、同一输入，分别消费优化前后模板；不是独立 Agent 盲测或真实业务批准。原模板摘要、输入与输出清单见 [comparison.json](comparison.json)，实际构造过程见 [build-trials.py](build-trials.py)。真实 Agent UI 试填另以 C2 的 E08 两侧轨迹为准。

| 输入 | 优化前 | 优化后 | 复核结果 |
|---|---|---|---|
| UI：权限、字段校验、忙态、空态、超时与幂等重试 | [总体设计](ui-recovery/baseline/overview.md)、[交互](ui-recovery/baseline/interaction.md) | [总体设计](ui-recovery/candidate/overview.md)、[交互](ui-recovery/candidate/interaction.md) | R1–R3 均可追溯；超时保留输入、复用幂等标识、禁止重复提交和他租户信息泄露均保留 |
| 无 UI：MVC 只读 API、成功、未找到、拒绝、参数错误、超时与重试 | [总体设计](api-no-ui/baseline/overview.md)、[适用性](api-no-ui/baseline/interaction-applicability.md) | [总体设计](api-no-ui/candidate/overview.md)、[适用性](api-no-ui/candidate/interaction-applicability.md) | 不生成空页面；无 UI 不裁掉 API 异常和拒绝验收，不改选 DDD |

两侧都填写了验证、发布和复盘文档。两个 fixture 的 `node checks.mjs` 均真实返回 7，日志与命令时间写入各自 `run.json`；两侧验证文档都保持阻断、未发布，未把历史结果或 skipped 当通过。这里只验证失败表达，未执行业务实现验收。当前链接目标均存在；页面引用返回同一份总体设计，行动引用同一份 `actions.json`，未另外创建权威状态。

本次观察到：每例在优化前总体设计中重复 5 条完整目标定义，优化后改为引用 5 个来源 ID 并写设计约束，完整定义的重复次数为 0。此指标仅统计原句，不能解释为业务信息减少 100%、总体篇幅下降或效率收益。两侧均覆盖全部规则 ID，静态复核未发现必要行为丢失。

首次填写时间未作独立分组测量：两侧由同一程序写入、共享作者思考，不报告比较耗时或提速比例。当前未发现需补证的正文缺项，未进行第二次业务试填；真实负责人、原型、契约与运行环境作为已知未决项保留，不能通过填表消除。C2 的实际 Agent 时间另报，不能把本静态结果计入其样本分母。
