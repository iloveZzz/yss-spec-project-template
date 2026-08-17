# ADR-0005: 使用生态发布清单协调模板、CLI 与公开技能

> 状态：proposed。生态发布清单、schema 与跨仓闭合校验尚未实现；当前发布只可声明模板仓库和 CLI 固定模板快照的双仓验证，不得宣称模板、CLI 与公开技能已形成生态级可发布闭环。

YSS 研发操作系统跨模板仓库、`create-yss-spec` 和公开技能仓库发布，单仓测试通过不能证明整体版本一致。提案是在后续 Phase 使用生态发布清单关联生命周期 schema、Matt snapshot、模板 commit/tree hash、CLI version/固定模板快照和公开技能来源 commit/导出 hash，并要求发布校验闭合这些引用；各仓只记录发布时已经存在的上游身份，避免循环引用未来 commit。该设计增加了发布记录和集成验证成本，但在 manifest、schema、校验器和跨仓测试同时落地前不构成当前发布门禁。
