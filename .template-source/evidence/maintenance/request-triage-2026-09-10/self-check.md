# 请求分诊优化维护者自检

范围：template-source，L3（aggregate-behavior-change、permission-boundary、ticket-state）。
用户依据：当前会话“确认，达成共同理解，开始实施”；覆盖已收敛的十三项讨论决定。不包含 Git 提交、推送或发布授权。

本轮在已有脏工作区上增量修改；已有门禁合并、OpenAPI 和设计相关修改不属于本轮实现。技能投影与锁由标准脚本按整个当前 canonical 集合生成，可能包含既有变更的派生同步。

## 维护者桌面推演

以下为规则与模拟输入的人工式对照自检，不是独立审查，不是模型回放或命中率测量。

| 场景 | 自检结论 |
|---|---|
| short-clear | 上下文已有函数，直接解释，不因短句补问。 |
| short-missing | 缺少页面与现象会改变调查目标，最小澄清。 |
| evidence-first | 已给接口和日志，先取证；排查不授权修改。 |
| cannot-answer | 缩小操作和时间范围，仍缺信息保持未决。 |
| resume | 已约定下一步且证据当前，复核后恢复。 |
| resume-ambiguous | 多个待办且无约定，先明确继续对象。 |
| action | 明确实施且当前合同就绪，进入有界执行。 |
| blocked-action | 缺合同不能写生产代码，继续独立授权调查。 |
| discussion-only | 只讨论限制优先，保持只读。 |
| multiple | 先性能调查再评估重构，逐目标验收。 |
| correction | 停止旧目标动作，说明已有改动并协商处理。 |
| template-boundary | 模板源拒绝产品资产生成，说明正确接入方向。 |
| state-shortcut | 状态请求不能绕过批准合同与就绪计算。 |
| external-action | 实现授权不代替 Git 和发布动作授权。 |

## 自动验证的能力边界

扩展既有 verify-lifecycle-context-query-scenarios，检查新增策略可按需查询、阶段/技能/转换不漂移、只读模式保持，以及场景结构与兼容入口约束。场景集是 synthetic / not-model-replayed，不能据此声称准确率提升。完整模型回放需要保存模型、技能版本、输入和原始动作轨迹；真实案例基线尚缺。

本轮不新增产品术语。context_reconciliation: not-applicable，原因是模板源规则维护，仅核验根 CONTEXT.md 合同及模板投影。

目标：implementation-ready；不冻结候选，不创建正式独立审查，不宣称可发布。行为实现类 TDD 不适用：本轮是编排文档与配置规则，执行合同查询、兼容集成、投影与模板核验。

## 最终验证

- `checks.json`：合同查询、投影、锁与 diff 检查实际退出码均为 0，附耗时和输出。
- `final-fast.log`：固定当前内容后执行 `scripts/verify-template-fast`，自动升级到 release profile，整体退出码 0。升级原因是工作区已有核心资产变更，不等同于本轮申请发布。
- `first-fast.log`：第一次运行退出码 1；运行中修正文档触发工作树只读检查，结果无效。保持内容固定后完整重跑通过，未以首次结果宣告完成。
- 未执行独立模型回放；未建立真实失败样本基线，分诊命中率变化未知。
- Git checkpoint：仅记录本轮范围；无 commit/push 授权，未执行。模板维护记录即本轮追踪，产品 Ticket 不适用。
- 复盘判断：本轮无架构返工或 IMPORTANT/CRITICAL finding；核验顺序返工原因已在此记录。后续应在最后一次编辑和投影同步结束后启动只读全套核验，证据落盘置于运行结束后。
