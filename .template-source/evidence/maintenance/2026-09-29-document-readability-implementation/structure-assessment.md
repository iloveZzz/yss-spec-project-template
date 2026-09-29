# P3 结构精简评估

本批保留 v2/v3，不引入 v4。源结构迁移仍需单独完成消费者闭包与人工效果验证，未声称已迁移。

实测 dataingest 的 domain-strategy.yaml：23,998 字节，9 条规则、5 个场景；5 个场景的 rules 均与 rule_refs 对应正文一致，可去除的正文 JSON 表达共 995 字节，约为原文件 4.15%。这只是文本量估算，不是最终 YAML 压缩率或阅读效率。阅读层已经把场景与失败路径按中文段落组织，尚无人工证据表明破坏性改版带来额外收益。

| 候选 | 读写者与约束 | 本批处置 |
|---|---|---|
| 领域场景重复 rules | yss-stage-decision 的 schema / validator / 模板；strategic-handoff-rules.mjs 的 extractTraceability；交接索引与消费摘要 | 不删除。现行规则索引要求逐字一致，场景摘要绑定包含 rules；v4 需新导出/导入兼容矩阵及 draft 迁移协议，不能只删字段。 |
| 阶段包重复绑定 | validate-stage-decision-package.mjs 校验实际 ID、版本、状态和规范化摘要；v3 明确要求领域 v3 | 不删除。状态与摘要不等价；历史离线包和原批准不能被新字段推导代替。 |
| checkpoint 证据重述 | stage-tracking 当前工作状态、完成证据、definition 引用及恢复校验 | 保留权威结构，阅读层区分登记、当前检查、未检查。 |
| items / work-items | seed 是输入，checkpoint 是当前状态，独立说明不是进度源 | 通过事务成功后的生成及说明修正职责，不新增状态源。 |
| 迁移 after / Base64 | stage-tracking-migration.mjs 原字节事务、恢复、权限与回执 | 协议原样保留，增加限额、摘要核验和明确缺失历史的阅读报告。 |

若后续人工试验仍将源重复判为主要负担，再对精确相等的规则做候选 v4：保留场景特有条件和结果，显式生成 draft，新候选不继承批准。无证据收益候选不迁移，符合设计中 P3 的独立推进及收益前置条件。
