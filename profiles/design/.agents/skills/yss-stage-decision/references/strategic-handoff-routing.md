## 战略交接快照包

使用 `scripts/strategic-handoff export / verify / import`；源资产冻结、规则身份与批准绑定、目标术语对账和逐条承接合同以 `.template-spec/process/strategic-handoff-package.md` 为准。来自导入包时，战术合同绑定 `strategic_handoff`；批准/流转前执行 `scripts/verify-strategic-handoff-consumption --root <target> <tactical>`，切片消费追加 `--slice <slice-id>`。存在延期时仅允许无依赖且核验通过的切片继续；未知依赖扩大阻断。
