## 战略交接快照包

跨仓交接使用 `scripts/strategic-handoff export / verify / import`。正式导出前补齐源战略的稳定规则 ID、关键场景和当前批准绑定；源资产原字节冻结、包内路径通过清单解析。目标导入只产生快照和对账/承接草案，正式 reconciliation 通过后才能进入战术设计。流程与字段见 `docs/process/strategic-handoff-package.md`。
