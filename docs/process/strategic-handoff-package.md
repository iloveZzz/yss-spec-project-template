# 战略交接快照包

本合同用于批准后的战略交付和研发接收，不增加生命周期阶段或门禁。`scripts/strategic-handoff` 是统一入口；Node 22+、Python 3 和现有 `jsonschema` 环境即可运行，不下载依赖、不执行交接包中的代码。新交付统一使用 Handoff v5，并生成 `Strategic Delivery Bundle`；交付记录、验证记录、逻辑包和可选 ZIP 的 schema 分别见 `schemas/strategic-handoff-delivery.schema.json`、`schemas/strategic-handoff-delivery-verification.schema.json`、`schemas/strategic-handoff-package.schema.json`。源规则仍由战略合同持有，README、索引与快照不成为第二套事实源。

## 源资产准备

1. 源仓必须为 `project-instance`。新交付使用 Domain Strategy v3 与 Stage Decision Package v3；规则、场景、决定、假设、约束、成功标准、测试 seam 与 downstream mapping 使用稳定 ID 和证据。v2 仅用于历史 Handoff v3 的只读验证；修改或重发须显式迁移、重新批准。不得用行号、文字 hash 或导出顺序生成业务身份。
2. 每个场景明确 `critical`、`rule_refs`、`success_results` 和既有 `failure_results`；兼容字段 `rules` 必须与引用规则正文一致。不变量使用 `rule_ref`，并通过 `scenario_refs` 指向确实覆盖该规则的场景。缺身份或关联先回战略方确认、更新并重新批准，导出器不猜测。
3. 新原型与既有 UI 交接都使用 Handoff v5，分别选择 `prototype` 或 `existing-ui-baseline`。历史 Handoff v3/v4 与既有裸 v5 包继续按冻结 schema 执行 `verify/import`，但 v3/v4 不再创建新 export；修改或重新交付必须迁移到 v5 并重新批准。校验器先读取 `schema_version` 再选择固定 schema，未知版本输出支持列表并 fail closed。`package_export` 的 `approvals` 按 `source` 字段及 `handoff` 绑定批准记录，声明 `record_ref`、`gate_id`、`digest_kind`。当前战略 profile 的领域战略、阶段决策和业务 Ticket 绑定 `gate.plan-approved`，Spec 绑定 `gate.spec-baseline-approved`，原型、视觉或既有 UI 基线绑定 `gate.product-design-approved`，交接自身绑定 `gate.strategic-design-handoff-approved`。历史包仍按包内明确登记的源批准规则验证，但旧门禁只能作为历史证据，不能作为当前输入继续流转。
4. 批准记录除既有会签字段，还要在 `artifact_bindings` 中逐项绑定 `{id, version, digest}`。战略/阶段建议 `canonical-json`；普通文件使用 `sha256-bytes`；视觉基线使用 `visual-baseline`。正文中的 `approved` 和可读取批准路径不能替代当前字节的批准绑定。源角色表要求用户决定记录时，接收端必须支持并核验该策略；旧工具缺少该能力时阻断并要求升级，不能按旧规则放行。
5. `additional_files` 明确补充依赖；`reference_map` 将 `evidence.*` 稳定证据引用解析为仓内路径。源资产、批准记录、证据引用、Markdown 本地链接和显式目录共同形成依赖闭包。HTTP 引用保留为引用，不在导出时下载网页。
6. 原型分支的 `prototype` 指定 `profile`、`preview_root`、`entry_ref`、`verification_ref`、`verification_digest`（验证记录的字节摘要）；H2 另须 `source_root`、`lock_ref` 和 `source_digest`（源码目录树摘要，算法同下述预览树）。源码交付目录不含 node_modules / .git；锁文件与源码一同保存。预览目录须资源闭合，可通过本地静态服务离线浏览。源码、锁文件或验证记录变化须更新交接摘要并重新批准。
7. 原型分支的离线浏览验证记录必须有 `network_mode: offline`、实际 `command`、`executed_at`、`exit_code: 0`、`case_ids`、`evidence_refs` 和 `preview_digest`。后者为按路径排序的预览文件 `{path: 相对preview_root路径, sha256: 字节摘要}` 数组的 canonical JSON SHA-256。记录须覆盖视觉基线 case；采集时禁用外网，动态资源与交互由实际浏览器验证。验包不执行来源代码；静态闭包检查不能替代浏览器证据。

## 命令

以下路径参数由当前资产提供，不从目录 glob 猜测业务含义。

```bash
scripts/strategic-handoff finalize --source-root <战略项目根> --handoff <Handoff-v5相对路径> [--previous <上一交付目录或package>] [--zip]
scripts/strategic-handoff verify --bundle <交付目录|package目录|历史ZIP>
scripts/strategic-handoff import --bundle <交付目录|package目录|历史ZIP> --target-root <研发项目根>
```

生命周期在交接批准后自动调用 `finalize`，不要求业务用户提供 `--output`。固定输出为：

```text
docs/deliveries/strategic/<handoff-id>/<version>/
  delivery-record.json
  verification.json
  package/
    README.md
    manifest.json
    payload/
    indexes/
  package.zip  # 仅 --zip 时生成
```

`package/` 是权威不可变交付件。相同 ID/version 且逻辑摘要一致时重新整包验证并返回 `already-packaged`；内容不一致返回 `delivery-version-conflict`，必须提升版本。README 由工具确定性生成，只列范围、来源引用、消费者、待决项和接收命令，不复制业务正文。ZIP 只负责运输，不参与逻辑版本判定，也不要求提交 Git。

战略 checkpoint 不新增产物 ID：`artifact.strategic-design-handoff.ref` 继续指向批准的 Handoff v5，其 `evidence_refs` 必须同时包含交付目录内的 `delivery-record.json` 与 `verification.json`。`verification.strategic_delivery` 记录实际命令、`exit_code: 0`、`result: verified` 和同一 `bundle_digest`。缺记录、包缺失、摘要漂移或验证失败时，`work-unit.strategic-design-handoff` 保持 `blocked`；已成包并验证通过后允许阶段完成，不等待后端或前端 Import Receipt。

目录是逻辑包；ZIP 只负责运输。源资产原始字节进入 payload，清单以 `original_ref → path` 映射原路径到包内路径；v3/v4 的原 Handoff 保存在 `handoff.yaml`，源根词汇表保存为 `payload/source-context.snapshot.md`。v5 的原文件映射为 `payload/files/<original_ref>`，只有根词汇表使用固定物理别名 `payload/files/source-context.snapshot.md`；该别名不成为第二个根词汇表。包中不创建嵌套 `CONTEXT.md`。常规独立验包时工具在临时目录重建验证视图，完成后清理；不把临时源词汇表注册为目标权威。

`manifest.json` 的 `files` 声明所有文件的字节摘要和大小。`bundle_digest` 是删除自身字段后 canonical JSON 的 SHA-256；不把整 ZIP 摘要当逻辑版本摘要。目录与 ZIP 的逻辑摘要相同。源合同的既有语义 digest 另行复核。目录/ZIP 已存在时拒绝覆盖，同身份版本不同内容的导入拒绝；已验过且相同的重复导入返回 `already-imported`。限制为 20,000 文件、512 MiB 展开内容；拒绝 ZIP 路径穿越、重复路径、大小写碰撞和符号链接。

## 既有 UI 基线与严格只读核验

Handoff v5 必须声明 `ui_baseline_kind: prototype | existing-ui-baseline`，`package_export` v2 使用相同类型。prototype 分支保留上述原型、视觉包、离线浏览和批准规则。existing-ui-baseline 分支只承接无 UI 改动的工程，`source.existing_ui_baseline_ref` 替代原型/视觉引用；不可混填两类来源。完整文件合同见 [既有 UI 基线](existing-ui-baseline.md)。

既有基线以 `existing-ui-baseline.json` 原字节摘要作为当前资产，由 `gate.product-design-approved` 的真实用户决定覆盖；批准主体必须是同一 manifest。固定源码、锁文件、构建输出、动作、截图、API 请求/响应和原始执行记录逐项绑定。历史原型批准不能自动转成基线批准；任何 UI/体验变化返回产品设计。

初始化和构建前运行 `scripts/preflight-delivery --input <输入清单> --stage prepare|build|export|accept --json`；完整阶段语义见 [交付预检](delivery-preflight.md)。`openBundle(...,{readOnly:true})` 对已展开 v5 包以固定别名映射核验，不写临时源目录、不执行来源代码；ZIP 返回 `readonly-extraction-required`，旧布局返回 `readonly-source-layout-required`，均不得视为验证通过。实际导出和接收仍在执行边界重新校验。

## Handoff v5 消费者路由

`consumer_routes` 固定表达三种能力，不绑定仓名：`backend-technical-design`、`frontend-engineering-design`、`delivery-coordination`。每条路由记录稳定 `route_id`、`required | optional | not-applicable`、影响引用、入口工作单元、预期输出、依赖和 Context Reconciliation 要求；`optional` / `not-applicable` 必须有原因与证据，不能产生 `ready-for-agent`。

- Backend/API/Data 任一影响为真时，backend 路由必须 `required`，入口是 `work-unit.technical-design`；架构只在下游按已批准决定分流 DDD/MVC。
- Frontend/UI 任一影响为真时，frontend 路由必须 `required`，入口是 `work-unit.frontend-engineering-design`；仅在 backend 路由生效时依赖后端交付。
- 任一交付路由生效时 coordination 必须 `required`；全部无实现影响时三条路由均为有证据的 `not-applicable`。

## 下游接收与逐条追溯

导入落盘到 `docs/handoffs/<handoff-id>/<version>/`。Handoff v3 继续生成 Import Receipt v1；历史裸 Handoff v4/v5 包继续生成 Import Receipt v2。新的 v5 交付目录生成 Import Receipt v3，保存源 `delivery-record.json` 原始字节及摘要，按目标 profile 的消费者能力登记 route、产物引用和状态，并分别生成后端追踪、Frontend Strategic Preflight / 前端追踪、协调状态索引草案。共同生成 route-aware Context Reconciliation 和 upstream impact 草案，所有入口固定 `ready_for_agent: false`。接收回执由研发仓持有，不反向修改战略仓；协调索引只保存回执引用。目标侧确认增量后更新唯一根 `CONTEXT.md` 并完成正式 reconciliation。

Technical Design Contract v2（DDD / MVC 共用）的 `strategic_handoff` 绑定 `import_receipt_ref`、`bundle_digest`、`context_reconciliation_ref` 和 `rows`。逐条覆盖全部规则与 `critical: true` 的成功/失败场景；行字段如下：

- `source_id`、源对象 `source_digest`、`disposition`、`dependency_status: known | unknown`、`dependent_slice_refs`。
- `implemented`：`tactical_refs`、`test_seam_refs`、`evidence_refs` 必须可解析；关键场景另用 `scenario_tests` 分别绑定 `outcome: success | failure` 与 `seam_ref`。
- `deferred`：`reason`、`risk`、`owner`、`followup_ticket_ref`、`verification_plan`、`target_version` 完整。仍阻断依赖切片。
- `not-applicable`：必须有 `reason` 和可读取 `evidence_refs`，不允许用它掩盖未决冲突。
- `pending` / `conflict`：阻断相关部分，冲突回交战略方更新和批准。依赖未知或未解释时阻断全部相关切片。

```bash
scripts/verify-strategic-handoff-consumption --root <研发项目根> <战术合同>
scripts/verify-strategic-handoff-consumption --root <研发项目根> --slice <切片ID> <已批准战术合同>
node .agents/skills/yss-technical-design/scripts/validate-technical-design.mjs <技术设计合同> --root <研发项目根>
```

Handoff v4/v5 后端消费必须绑定 `backend-technical-design` 的 `route_id`，先对账，再由 `yss-technical-design` 依据已批准架构调用 `yss-tactical-design` 或 `yss-mvc-design`。Handoff v3/v4 仅作历史只读兼容，不修改已冻结包。`tactical_refs` 在 v2 Technical Design 可指向 MVC 或 DDD 分支对象；无战略交接包的 MVC 项目直接消费批准需求，不补造战略 DDD。

前端先验证与交接版本匹配的 Strategic Preflight：Handoff v4 使用 v1，Handoff v5 使用 v2 的 `ui_baseline_kind/ui_baseline_ref`，只允许起草前端工程设计与实现计划，固定返回 `ready_for_agent: false`。最终 Frontend Delivery Acceptance v2（Handoff v4）或 v3（Handoff v5）在 Backend/API/Data 有影响时必须绑定真实 Backend Delivery 收据与版本探测；UI-only 时使用与战略路由一致的 `backend-not-applicable`，此时 `operation_ids` 必须为空。无论哪条路径，当前且已批准的 Slice Contract 仍是实现入口。

## 消费者反馈闭环

Consumer Feedback v1 与 Feedback Adjudication v1 独立保存在已交付 package 外，分别绑定 bundle ID/version/digest、route、source ID/digest 和 feedback 原始字节 digest。`keep` 允许消费者重新核验后继续；`amend` 保持旧路径 blocked，战略资产升版、重新批准并导出新版本 Handoff；`defer` 对 blocking 问题继续阻断，非阻断问题只有责任人、风险、验证计划和目标版本齐全时继续。任何范围或风险变化重新应用用户决定失效规则；禁止修改历史 package 或用旧摘要冒充当前裁决。

```bash
scripts/strategic-feedback verify-feedback --root <消费者项目根> <feedback.json>
scripts/strategic-feedback verify-adjudication --root <消费者项目根> <adjudication.json>
```

整体验证有未落实项时返回 blocked；按切片验证可放行有证据证明不依赖这些项的切片。输出 `block_all`、`blocked_slice_refs`、`issues`、实际消费包摘要与战术摘要。通过只证明结构化映射完整和引用可核验，业务语义仍需独立评审；不能代替 Slice Contract 批准。

每版完整快照可独立消费，差异区分 added / updated / removed。更新须提升交接版本，内容变化的源资产也须提升其版本。接收新版本后，消费校验比较最新已导入源对象摘要；规则变化按行依赖阻断，未映射的新规则扩大阻断，战略责任边界、方案决策、Spec/视觉/原型源码/既有 UI 基线等变化未重新绑定时整体阻断。`upstream-change-impact.json` 是生命周期处理 stale 的证据输入，不直接改 Tracker 或覆盖战术合同。

## 维护与同步

共享脚本和包 schema 以主模板为维护源，通过 `scripts/sync-strategic-handoff-tools` 同步到设计/研发模板；源战略 schema 的离线验证副本由该脚本从 canonical `yss-stage-decision/references` 派生。各仓技能仍只编辑 `.agents/skills`，再生成各 runtime 投影与锁。CLI 快照使用各自同步工具，工作树快照用于集成验证，不代表已发布 commit。共享同步仅从主技能注册表投影 `existing_project_profiles` 验证元数据，保留接收模板自己的 Recipe、capability 与创作技能；源注册表及目标有效字节写入工具锁。后端接收模板使用独立视觉 wire runtime，不安装原型创作技能。超出本 profile 职责的技术设计/编译资产在预检中明确标记不支持，战略交接路线不依赖这些后端资产。

## 当前用户决定与交接复核

当前用户决定只覆盖 Plan、Spec 和适用的产品设计。各批准记录使用 `subject_ref`、`approval_scope`、`user_decision_ref` 绑定最终可审阅资产与原始回复；Plan 审阅包聚合领域战略和阶段决策的内部检查结论，产品设计门禁聚合原型审查与浏览器验证结论。输入摘要、范围、风险或授权条件变化时，对应决定失效并重新确认。

`gate.strategic-design-handoff-approved` 不要求新的用户回复，也不把旧决定改写为交接决定。产品经理形成完整交接包后，由需求经理独立复核来源批准新鲜度、完整包摘要、风险与范围，并以 Fresh Verification 关闭交接门禁。缺少独立复核、来源批准过期、摘要漂移或验证失败均阻断 finalize。

历史包中的 `strategic-decision-reuse-v1`、`decision_reuse_ref` 和旧门禁批准保持可读，供离线 `verify/import` 复核当时证据。它们不能关闭当前聚合门禁；任何修改、重发或继续流转都必须先完成战略门禁迁移并重新批准。
