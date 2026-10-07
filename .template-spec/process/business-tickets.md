# Spec 业务拆分与实现 Slice 衔接

结构化阶段、产物和工作单元以 `lifecycle-registry.yaml` 为准。本协议不新增主阶段、Skill 或常规人工批准节点。

## 流程与职责

Spec 综合同时起草业务 Ticket；完成条件是可读取的集合和 FR/AC 覆盖。Design 按页面流、状态、失败与恢复路径校准原 Ticket，保持稳定 ID。无产品设计影响时记录不适用依据并进入业务正式化，不生成空原型。尚未批准、尚未冻结、缺工程是待满足前置，不能写为不适用。

业务正式化消费当前 Spec、适用的产品设计批准和独立专业审查。语义不变按现有授权延续协议核验；范围、规则、验收或风险实质变化交回原决定边界。全生命周期随后进入技术分析；本地已确认资产直接消费，无需导出再导入自己。独立 Design profile 到战略交接结束。

研发可以在技术分析期间形成实现 Slice 草案。正式实现 Slice 仍需当前工程契约、实现仓库准备、Slice 合同批准和完整就绪检查。业务票只能为 `draft` 或 `ready-for-human`，不能授予实现权限。业务票与阶段工作项即使移动到 `issues/` 仍不能作为实现票。

## 文件合同

功能包中每票一份 `business-tickets/BT-<id>.md`，集合为 `business-ticket-set.yaml`；实现票保留 `issues/`。使用共享 business-ticket、business-ticket-set、business-ticket-review 模板及 `schemas/business-tickets-v1.schema.json`。集合只保存引用、版本、原字节 SHA-256 和覆盖处置；Spec、map、父 Ticket、checkpoint 均引用同一集合。先固定 Spec 内容再计算其摘要；Spec 只写集合路径，不能嵌入集合摘要造成循环。

业务票按用户行为与可验收结果划分，不机械地每条 FR 一票，也不按 Controller、Service、Repository 分票。每票关联原始 FR/NFR、AC 和 Spec 版本/摘要。适用规则、场景、设计放入 source_refs，包含 ref/version/digest 以及精确 locator 和 locator_kind（id 或 heading）；不适用需在正文说明并由专业审查判定。版本是作者登记的稳定版本，digest 校验实际字节，二者不能互相替代。

草案可有具名未决项，但不得静默漏掉需求。暂不能分票的需求在 coverage_deferred 记录 reason、risk、owner、target_version、followup_ticket_ref、verification_plan；正式化还需绑定已有有效决定，不补造历史批准。专业审查检查业务粒度、行为完整性、语义保真和延期授权；校验器仅证明结构、引用与摘要，不用文本相似度判断业务正确性。

```sh
node scripts/verify-business-tickets .work/<feature>/business-ticket-set.yaml --root . --mode draft --json
node scripts/verify-business-tickets .work/<feature>/business-ticket-set.yaml --root . --mode formal --json
```

命令只读，0 表示所选结构检查通过，1 表示阻断，2 表示命令错误；任何结果都不批准资产、不设置 ready-for-agent。正式检查需要绑定当前集合摘要的独立专业审查；真实批准仍由生命周期原验证器核验。

## 实现承接与变化

实现票 frontmatter 声明 `kind: vertical-slice-ticket`、`business_ticket_set_ref`、`business_ticket_refs`（稳定 ID 数组）、`acceptance_refs`（原始 AC 数组）。编译器将集合加入 Slice v3 既有 basis.business_ticket_set；acceptance 必须仍指向原始 Spec 的 AC，且属于所引用业务票。一个业务票可对应多个 Slice，汇总时按 AC 覆盖集合计算，不能把一个子 Slice 完成当成业务票全部完成。

接收方保留既有战略交接、词汇对账以及规则/场景到技术设计的映射。来源变化沿已登记依赖影响 Ticket/Slice；依赖缺失或未知时阻断相关整个范围。集合、Spec 或其他全局依据变化尚不能确定局部影响时保守阻断，不能无依据缩小。

## 批准与交接兼容

Handoff v5 外层结构不变。新 Design 源角色策略声明 required_capabilities: [business-ticket-approval-v1]，最终业务集合绑定 `gate.strategic-design-handoff-approved` 的当前资产批准；不能借用更早的 Plan 批准。旧工具拒绝未知能力。无能力声明的历史包沿原策略只读核验，不能补写历史 Plan 回复。包导出必须包含集合、票据、专业审查、原始来源和延期证据闭包。

## 启用、迁移与回退

新项目 tracker frontmatter 默认 `business_ticket_version: 1`。旧项目缺失配置时状态显示 legacy-unassessed，不自动判断已拆分，也不自动启用。显式迁移时保留原资产与批准，补齐当前业务草案、校准/审查及引用，再启用版本配置；同步工具不得覆盖用户 tracker。旧 Spec 格式不能机械解析时报告 unassessed，先显式适配内容格式，不能推断覆盖为空或已完成。

回退可停用新规则入口但保留业务资产和读取能力。类型隔离、显式来源绑定与新能力拒绝始终有效；不得把业务票降格解释为旧实现票。

## 状态投影

`lifecycle-status` 分别展示业务拆分、实现拆分、实现就绪与批准未验证状态。阶段工作项 completed 仅表示该工作项完成。map/父 Ticket 引用集合，不复制正文；声明已同步时绑定当前集合 digest，过期则报告 sync-stale，不能改写历史批准。缺业务拆分、缺工程前置、tracker 状态过期和 checkpoint 失败分别报告。

实现映射汇总可在上述命令追加多个 `--slice-ticket <issues/ref.md>`，输出每个业务票的 AC→Slice 引用和未映射 AC；covered 仅指映射覆盖，不代表任何实现已完成。接收方可直接使用既有导入协议下的 `docs/handoffs/<id>/<version>/package/payload/files/` 业务集合引用，校验器在不可变源根内解析绑定，并继续保留目标仓的批准/接收门禁。
