---
name: yss-domain
description: 在已确认的 DDD 边界内实现或重构领域行为、不变量、状态机与 Gateway；按当前交付路线消费输入，不负责起草领域设计。
---

# yss-domain

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

这是一个领域实现 skill。核心目标是消费当前路线已确认的领域模型，将领域行为落实为代码；`yss-technical-design` 组织 DDD 分支，由 `yss-tactical-design` 设计、`yss-product-lifecycle` 维护批准。

既有工程先读取 `references/existing-project.md`，按实际工程职责与当前路线边界审计或整改；只读审计不要求批准 Slice，`daily` 修改不因调用本技能补造 Slice。

本 skill 在新脚手架链路只支持 `domain-driven` / `target-domain-model`。`layered-mvc-service` 与 `mvc-data-analysis-v1` 是独立 MVC Profile，不是失败的 DDD 工程；它们不加载本 skill，也不生成 Domain Gateway。既有旧架构不在本链路内迁移。

## 何时使用

- 当前 `governed` 的已批准 DDD Slice Contract，或合格 `daily` 同 Ticket 的已确认验收，要求在既有 DDD 边界内实现或修复领域行为、不变量或状态机。
- 在既有已确认领域边界内重构 Entity、Value Object、Domain Event 或 Gateway。
- 需要从需求、页面或 DDL 决定聚合及领域边界时，回交 `yss-technical-design` / `yss-tactical-design`，不先写领域代码。

## 不适用

- 只生成持久层时，优先 `yss-repository`。
- 只生成 Controller 时，优先 `yss-web-controller`。
- 只初始化项目骨架时，优先 `yss-ddd-scaffold-generator`。

## 工作方式

1. `governed` 先读取批准且版本当前的 Technical Design Contract 的 DDD `design` 分支和 Slice Implementation Contract；旧 v1 tactical-design contract 只按 DDD 显式兼容读取。合格 `daily` 读取同 Ticket 的范围、验收、已确认行为 seam 和已有工程领域基线；缺领域事实先调查，不由历史代码推定未确认规则或创建批准资产。
2. 数据库字段只做补充，不直接决定领域对象结构。
3. 按当前路线输入实现领域行为、状态机、不变量和 Gateway 边界；`daily` 只改同 Ticket 范围内的既有行为。
4. 规则不清晰或模型需要扩展时，返回 `new_impacts` / `drift` 并停止，不要静默猜测。

## 产物范围

- `domain/{segment}/model/*Entity.java`
- `domain/{segment}/gateway/*Gateway.java`
- DTO/VO 属于 client/web 契约，转交 `yss-dto` / `yss-web-controller`；Domain skill 不顺带生成。

## 建模约束

<a id="domain.dependencies"></a>
<!-- yss-rule {"id":"domain.dependencies","when":"domain","level":"mandatory","evidence":"code-and-verification"} -->
- Domain 层不依赖 Repository、Mapper、Controller。
<a id="domain.behavior"></a>
<!-- yss-rule {"id":"domain.behavior","when":"domain","level":"mandatory","evidence":"code-and-verification"} -->
- 领域行为放在模型方法，不要放在 Web 层。
<a id="domain.gateway"></a>
<!-- yss-rule {"id":"domain.gateway","when":"domain","level":"mandatory","evidence":"code-and-verification"} -->
- Gateway 只暴露领域能力，不暴露持久化细节。
- 对关键状态流转给出明确方法，如 `publish()`、`cancel()`、`terminate()`。
<a id="domain.invariants"></a>
<!-- yss-rule {"id":"domain.invariants","when":"domain","level":"mandatory","evidence":"code-and-verification"} -->
- 明确 Aggregate Root、Entity identity、Value Object、不变量、Domain Event 和一致性边界；没有业务行为时不要伪造富领域模型。
- `unsupported` 只阻断不支持的生成方式。既有 DDD 按登记边界整改；目录差异不是领域违规。架构身份转换或公开契约迁移单独立项，MVC 不套用 DDD 规则。

## 质量要求

- 命名体现业务语义，不照抄表名缩写。
- 生成代码应可编译，且没有跨层依赖泄漏。
<a id="domain.gateway-owner"></a>
<!-- yss-rule {"id":"domain.gateway-owner","when":"domain","level":"mandatory","evidence":"code-and-verification"} -->
- Domain Gateway interface 由本 skill 唯一拥有；Infrastructure 只能实现，不得由 `yss-repository` 反向创建或改写其签名。
- 对不确定规则返回 `new_impacts` / `drift` 并暂停；不要把未批准假设或 TODO 写进实现冒充已确认事实。

## 协同顺序

- 需要用例编排时，再接 `yss-application`
- 需要持久层时，再接 `yss-repository`
- 需要 Web 层时，再接 `yss-web-controller`
- 需要完整工程时，先 `yss-ddd-scaffold-generator`

## 分层开发规范

脚手架生成或进入 Domain 实现前，必须加载 `references/domain-layer-guide.md`：其中定义 Aggregate、Domain Gateway、Domain Error、依赖门禁与旧架构 `unsupported` 边界；HTTP DTO/VO 明确不属于 Domain。

## 阶段 7 合同

- `governed` 只消费生命周期已批准的 `Slice Implementation Contract` 和当前 `work_unit`，不得扩大 `allowed_write_paths`；合格 `daily` 消费同 Ticket 的验收、真实工程基线和 `scope.paths`，不要求正式 Slice 或阶段批准。
- `governed` 的 `Slice Implementation Contract` 必须引用批准且版本当前的 `technical_design` 绑定（旧 DDD 显式兼容 `tactical_design_ref`）。两条路线均不得在实现阶段重新批准、猜测或替换聚合、不变量和一致性策略。
- 领域规则、状态机和不变量必须使用 `behavior-tdd`，先形成失败测试，再实现最小行为。
- `daily` 将实际文件、领域约束、行为测试、真实命令/退出码、偏离和新增影响写入同 Ticket，并接受当前候选的独立审查；`governed` 按 `yss-implementation-contract-compiler/references/yss-skill-execution-result.md` 返回正式 `YSS Skill Execution Result`。
- 发现超出当前范围的新 API、权限、状态机、数据模型或架构影响时停止受影响实现、保留已有修改与证据并回生命周期调查；`daily` 由当前政策重新分诊，未知风险或排除影响升级 `governed`，正式切片继续按 `new_impacts` 与原合同恢复。
