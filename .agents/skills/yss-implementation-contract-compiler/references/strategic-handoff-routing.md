## 战略交接快照包

跨仓交接使用 `scripts/strategic-handoff export / verify / import`。正式导出前补齐源战略的稳定规则 ID、关键场景和当前批准绑定；源资产原字节冻结、包内路径通过清单解析。目标导入只产生快照和对账/承接草案，正式 reconciliation 通过后才能进入战术设计。流程与字段见 `.template-spec/process/strategic-handoff-package.md`。

来自战略交接包的技术设计合同（DDD / MVC）必须绑定 `strategic_handoff` 导入收据、包摘要、正式目标对账及逐条承接 rows。来自导入包时禁止仅填 `upstream_current: true`。批准前执行 `scripts/verify-strategic-handoff-consumption --root <target> <tactical>`；存在受控延期时按切片执行 `--slice <slice-id>`，实际核验通过且合同批准后才可继续相关切片。最新源规则、关键场景或资产变化使依赖项 stale；未知依赖扩大阻断，业务冲突回交战略方。结果绑定当前包与战术摘要，不能复用旧输出宣布 ready-for-agent。

Slice v3 的任务进度、缺口和实时就绪结果不回写合同。源事实集中在 basis，Skill 闭包只在 resolution 保存，工作单元继承共同约束；独立工程审查与已有用户确认共同交生命周期批准。详见合同引用。
