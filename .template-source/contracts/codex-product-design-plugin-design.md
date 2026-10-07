# YSS 需求到产品设计插件：实施合同

本文描述当前插件接入边界；具体业务批准、Git 与发布授权分别核验。

## 范围与来源

新增 `yss-product-design:product-design`，从 Plan、Spec 到有 UI 的产品设计和 Handoff v5；后端由 `yss-backend-delivery` 正式导入、目标对账、逐条消费并继续工程设计与实现。首版支持新原型和既有 UI，纯无 UI 正式交付不适用。三个独立目录保存设计治理、后端治理和实现代码。

设计和后端使用同一固定原生 `yss` 二进制，分别选择 `design` 与 `spec` Profile。程序版本、二进制 SHA-256、平台、协议版本、模板 commit 与 Bundle/manifest 摘要由各插件的 `assets/native-lock.json`、`bundle-lock.json` 及项目绑定记录持有。维护运行材料保存在仓外 maintenance 命名空间。

## 当前适配

战略设计模板主控实际名为 `yss-strategic-design`，专职研发主控为 `harness-orchestrator`。设计 profile 新增本地 `yss-product-lifecycle` 兼容入口，实际读取原战略主控及其同一合同；历史 workflow_reference、资产所有者、checkpoint 不改名。公开插件仍只暴露 product-design。主模板的 consumer_entry_routes 通过共享同步投影到各 profile 原主控合同，保留各自其余规则。

两插件共用 `native-build.mjs`，经公开 `bundle inspect` / `bundle export` 获取对应 Profile 的完整治理资产，并逐文件核验 bytes、mode 与摘要。各 Profile 保持独立 Bundle 来源锁，项目使用原生 `.yss.json` 身份与插件绑定。旧 compat `templatePlan/templateApply` 仅返回 `UNPORTED`，不能作为当前项目接入或同步入口。

匹配且未绑定的原生项目通过 `project-bind-plan` / `project-bind-apply` 接入；旧身份通过 `project-migration-plan` / `project-migration-apply` 显式迁移，既有原生绑定通过 `project-upgrade-plan` / `project-upgrade-apply` 更新。插件升级不自动改写既有项目。

## 接口与状态

- 设计：verify、doctor、project-plan/apply、project-check、project-bind-plan/apply、project-entry new/reuse/resume。
- 后端：新增 project-import-design；project-entry reuse/resume 可传 import_receipt_ref，保持旧 artifact_refs/checkpoint 输入。
- 共享：strategic-consumer-entry --root --bundle 导入，--receipt 只读复验。先验包和目标路线，后导入，返回 ready_for_agent=false。
- 源消费者 work-unit.technical-design 不变；完整主模板与 plan-to-backend 映射 technical-analysis，专职后端保持 technical-design。
- 设计终点复用战略 checkpoint 的正式交付记录和整包验证；后端终点继续使用既有 Backend Delivery 合同。

目录运输保留 Import Receipt v3。现有 package.zip 不包含外层 delivery-record，按既有协议使用 v2 收据；不制造 v3 记录。两种输入均验源包、批准、身份、摘要与消费者路线。

## 兼容、验证与交付

显式迁移或升级使用保存的原生计划，绑定来源摘要与项目输入；治理文件、原生身份和插件绑定由同一事务应用并验证，保留备份和失败回滚。未知来源、身份或绑定冲突、输入漂移、过期计划、已完成后端终点保持阻断。设计 Profile 入口兼容不改变阶段门禁。Bundle provenance 与程序 commit / sourceState 分别核验，固定二进制本身不授予发布资格。

维护强度 L3：跨仓合同、生成语义和权限边界。模板维护执行自检、聚焦回归、fast/candidate 适用验证，正式分发执行完整门禁和 committed 来源验证；不把业务切片审查要求扩展成所有模板修改的额外批准。

机制测试使用合成包与批准 fixture 验证校验行为。真实工程仍需自身的批准、平台制品来源绑定、构建与消费者运行证据，不能用模板工具测试声明真实后端链路完成。
