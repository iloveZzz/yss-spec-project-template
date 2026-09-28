# 摄取外源

只处理用户点名 URL、粘贴、文件或已经落盘的 research 笔记。映射的 live 来源变更使用 refresh；单次搜索不是自动 ingest。禁止把 docs/reviews、scratch、Agent 投影或完整 lock 文件当普通文档摄取。

1. 检测现有 wiki；v1 写入前需显式迁移。
2. **先只读**准备来源、候选页及 New/Update/Disputed/No material 影响。已确认的一组输入复用同一范围；缺少真实确认时展示候选，不写 raw、manifest、日志或文章。用户拒绝时零写入。
3. 按 [schema](schema.md) 标记 location、快照来源、抽取器及全部输入。外部快照不得虚构 repo livePath；未在线核验保持 unverified。
4. 对已确认候选准备 raw、页面及索引；Disputed 保留双方证据和 stale，人工正文保持不动。
5. 使用 [transactions](transactions.md) 的计划/应用流程，仅写准确清单；结构 lint、status、advise 后报告摄取结果及剩余可信度限制。未完成证据的文章不能冒充 current。

候选审批不写单独 inbox 配置，不向外发布，不因查询自动收集更多资料。
