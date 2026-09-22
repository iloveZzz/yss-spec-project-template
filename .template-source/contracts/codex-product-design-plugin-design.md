# YSS 需求到产品设计插件：实施合同

状态：已获用户实施授权；正式业务批准、Git 与发布授权分别核验。

## 范围与来源

新增 `yss-product-design:product-design`，从 Plan、Spec 到有 UI 的产品设计和 Handoff v5；后端由 `yss-backend-delivery` 正式导入、目标对账、逐条消费并继续工程设计与实现。首版支持新原型和既有 UI，纯无 UI 正式交付不适用。三个独立目录保存设计治理、后端治理和实现代码。

设计分发固定 `create-yss-harness-design@0.8.4`、后端保留原有固定 `create-yss-spec`；精确 SHA、snapshot、manifest、core 和开发覆盖层由各插件 cli-pin、bundle-lock 及项目绑定记录持有。当前工作区基线另存 maintenance evidence，不清理已有改动。

## 实施时核实的适配

战略设计模板主控实际名为 `yss-strategic-design`，专职研发主控为 `harness-orchestrator`。设计 profile 新增本地 `yss-product-lifecycle` 兼容入口，实际读取原战略主控及其同一合同；历史 workflow_reference、资产所有者、checkpoint 不改名。公开插件仍只暴露 product-design。主模板的 consumer_entry_routes 通过共享同步投影到各 profile 原主控合同，保留各自其余规则。

设计 CLI 的 vendor/cli-core、blob snapshot、metadata 与后端 CLI 不同，使用独立适配。原始 fixed CLI 包不可改写，当前设计 profile 的 canonical 技能生成物化投影并作为显式开发覆盖层；只在新建实例中应用。绑定既有实例只允许当前精确匹配核心，不自动升级。

## 接口与状态

- 设计：verify、doctor、project-plan/apply、project-check、project-bind-plan/apply、project-entry new/reuse/resume。
- 后端：新增 project-import-design；project-entry reuse/resume 可传 import_receipt_ref，保持旧 artifact_refs/checkpoint 输入。
- 共享：strategic-consumer-entry --root --bundle 导入，--receipt 只读复验。先验包和目标路线，后导入，返回 ready_for_agent=false。
- 源消费者 work-unit.technical-design 不变；完整主模板与 plan-to-backend 映射 technical-analysis，专职后端保持 technical-design。
- 设计终点复用战略 checkpoint 的正式交付记录和整包验证；后端终点继续使用既有 Backend Delivery 合同。

目录运输保留 Import Receipt v3。现有 package.zip 不包含外层 delivery-record，按既有协议使用 v2 收据；不制造 v3 记录。两种输入均验源包、批准、身份、摘要与消费者路线。

## 兼容、验证与交付

后端 M4 和登记的 0.2 开发包可通过显式迁移计划升级；来源摘要、全部项目文件、备份和失败回滚沿用原机制。未知来源、核心漂移、过期计划、已完成后端终点拒绝迁移。设计 profile 入口兼容不改变阶段门禁。

维护强度 L3：跨仓合同、生成语义和权限边界。模板维护执行自检、聚焦回归、fast/candidate 适用验证，正式分发执行完整门禁和 committed 来源验证；不把业务切片审查要求扩展成所有模板修改的额外批准。

机制测试使用明确标注的合成包与批准 fixture，只证明校验行为。真实设备借用试点采用 H2、MVC、Boot 3.5.16 / JDK 17；Plan、Spec、产品设计、工程与 Slice 批准必须来自真实过程。当前本地 JDK 与父 POM validate 通过，但平台制品来源绑定与消费者运行证据缺失，不能宣称真实后端链路完成。Maven、平台检测与业务阻塞记录见本轮 maintenance evidence。
