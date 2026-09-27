# UI 延长窗口补充评测

主批次双方的 UI 两次运行均在 300 秒内未完成，保留为原 48 次中的失败。本补充实验双方各两次，单 turn 上限 600 秒、无自动重试；来源、runner、场景全文、运行时、模型和推理档位与原对照相同，仅过滤 E08。记录见 [配置](C2-ui-supplement-config.json)、[运行命令](C2-ui-supplement-execution.json)、[汇总](ui-supplement-summary.json)。

| 版本 | 重复 | 自动 / 语义结果 | 实际秒数 | 完成工具调用 |
|---|---:|---|---:|---:|
| baseline | 1 | passed / passed | 508.17 | 20 |
| baseline | 2 | passed / passed | 510.39 | 21 |
| candidate | 1 | passed / passed | 524.64 | 18 |
| candidate | 2 | passed / passed | 523.88 | 15 |

语义复核按实际三份文档检查 R1 无权限时零写请求、R2 成功回执及超时保留/同键重试、R3 空态/字段校验/提交忙态。原文件字节与允许产物也核对，逐项结论在 [复核记录](ui-supplement-semantic-review.json)。通过只说明该预算内的隔离文档起草满足上述输入，不等于原型、真实 API、生产代码、浏览器或阶段批准已验证。

加长时间限额与主批次是不同实验条件，不能把追加成功填回原 300 秒评分。提示词本身已要求“上游范围只引用”，因此不能将引用复用归因为模板改动；后续若测自主采用效果，需要单独控制这项提示。两次重复、固定执行顺序及共享主机维护活动不足以推断稳定性能差异。最终模板验证以 nice 15 在候选补测期间运行，具体起止见 fast-verification-post-docs.json；未隔离主机负载，不将差异归因于模板。模型未报告的 usage 保持未知；已报告输入包含缓存，不虚构金额。校准和故障消耗同样计入 [完整资源台账](all-evaluation-resource-ledger.json)。

双方源快照、依赖、runner 与场景由 [主归档](formal-archive.json)保留。本补充的原始轨迹、逐步输入清单、最终产物和复核包另见 [补充归档](ui-supplement-archive.json)，不复制凭据。实际起止与原 3 小时正式评测窗口的关系在运行记录和预算台账中保留。
