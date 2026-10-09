---
name: yss-application
description: 实现或排查 YSS 用例编排、事务边界、跨聚合协作、幂等和用例层模型转换；按已登记 DDD 或 MVC 架构执行。
---

# yss-application

执行路线消费当前 Profile 主控合同的 `request_triage.delivery_path` 与固定 CLI 的 `route` / `verify-daily` 结果。仅已启用且合格的 Spec、Backend、Frontend `daily` 使用同一 Ticket 的范围、验收、工程基线、实际测试与独立审查；本端写范围不扩大。缺政策或能力时保持正式路径，已有正式任务不得降级；本技能不授予执行授权。

## 任务分流

- 只读审计先读取实际用例、工程登记和可读契约；不要求先补批准 Slice 或生成 Manifest，业务 Spec 缺失须记录。
- `governed` 整改消费批准且当前的 Slice、已确认行为 seam 与登记的 Application/service/core 映射；合格 `daily` 消费同 Ticket 的验收、范围与已有工程的已确认职责/seam，保持实际允许写范围。
- 新工程按生成式 Profile 消费脚手架来源，骨架生成不替代业务实现合同。

## 架构分流

将 `architecture_identity` 与当前工程基线和仓库登记核对；仅生成式来源核对脚手架 Manifest，既有来源使用登记及独立工程观测。再且只读取 `references/profiles/<architecture_profile>.md`。生成式分支为 target-domain-model、layered-mvc-service、mvc-data-analysis-v1；既有分支为 existing-domain-driven-maven、existing-layered-mvc-maven。成熟度以注册表为准，不能把 draft 称为受支持。

以下 Application / Domain Gateway / Infrastructure / Web module 叙述仅适用于 target-domain-model；MVC 的 service/core/repository/server/client 所有权由所选 Profile 引用定义。

DDD 用例层协调 Domain 与 Gateway，定义事务边界和跨聚合流程，不承载核心领域规则。MVC 不执行 DDD 专属规则，也不加载其分层 guide；组件、安全、允许路径与真实执行证据规则共用；批准合同只作为 `governed` 的输入，`daily` 的输入来自同 Ticket 与已核验工程基线。

## 何时使用

- 用户要实现 Application Service、用例编排或 `@Transactional` 边界。
- 用户要补 App 层 MapStruct Convertor 或跨聚合协调逻辑。
- 脚手架生成完成后进入业务实现，实现合同编译器 按 `backend_impact` 加载本 skill。

## 不适用

- 只做领域建模时，优先 `yss-domain`。
- 只做持久层时，优先 `yss-repository`。
- 只做 Controller 时，优先 `yss-web-controller`。

## 工作方式

1. 按 `architecture_identity.architecture_profile` 选择且只选择对应 Profile reference；Profile 未登记、与 Manifest 不一致或成熟度不满足当前任务时返回 `blocked`。
2. `target-domain-model` 才执行 Domain Service / Gateway、跨聚合编排和下述 DDD 产物规则；`layered-mvc-service` 与 `mvc-data-analysis-v1` 分别按其 service/core Profile 承载用例、规则和事务，不加载 DDD Gateway。
<a id="application.use-case"></a>
<!-- yss-rule {"id":"application.use-case","when":"application","level":"mandatory","evidence":"code-and-verification"} -->
3. 确认 Use Case、Application/service/core 与事务边界：`governed` 由批准合同给出，合格 `daily` 由同 Ticket 的已确认用例与现有工程基线给出；不得借缺正式合同重新选择架构或猜测事务。
<a id="application.mapping"></a>
<!-- yss-rule {"id":"application.mapping","when":"application","level":"mandatory","evidence":"code-and-verification"} -->
4. Web DTO 到内部 Command/Result 的转换归 Web 边界，持久化转换归 Repository/Infrastructure；用例层确有独立模型转换时才加载 `mapstruct`，并统一 Spring Bean 与构造器注入。
5. DDD 的详细包结构、注解、示例和旧架构阻断边界见 `references/application-layer-guide.md`；MVC 不读取该 guide。

## DDD 产物范围

以下路径只适用于 `target-domain-model`；MVC 产物以选中的 Profile reference 和合同为准。

- `application/.../command/*Command.java`、`application/.../query/*Query.java`、`application/.../result/*Result.java`
- `application/.../port/*QueryPort.java`
- `application/.../service/*Service.java`
- `application/.../service/impl/*ServiceImpl.java`
- `application/.../service/convertor/*Convertor.java`（MapStruct）

## 协同顺序

- 领域建模：`yss-domain`
- 持久层：`yss-repository`
- Web 适配：`yss-web-controller`
- Web DTO / Result 契约：`yss-dto` + `yss-web-controller`

## 阶段 7 合同

- `governed` 只消费批准后的 `Slice Implementation Contract` 和当前 `work_unit`；合格 `daily` 只消费同 Ticket 的范围、验收、已有工程基线与当前候选。
<a id="application.behavior-tests"></a>
<!-- yss-rule {"id":"application.behavior-tests","when":"application","level":"mandatory","evidence":"code-and-verification"} -->
- AppService 骨架可 `controlled-generation`；用例编排、事务、幂等、权限和失败行为必须 `behavior-tdd`。
- `daily` 在同 Ticket 返回文件、适用技术约束、实际测试/命令/退出码与偏离，交独立 Reviewer 绑定当前候选；`governed` 按 `yss-implementation-contract-compiler/references/yss-skill-execution-result.md` 返回正式 `YSS Skill Execution Result`。
<a id="application.impacts"></a>
<!-- yss-rule {"id":"application.impacts","when":"application","level":"mandatory","evidence":"code-and-verification"} -->
- 发现超出当前范围的新 API、权限、状态机或跨上下文影响时停止受影响实现并回生命周期调查；`daily` 未知或排除风险升级，`governed` 按 `new_impacts` 和原合同恢复。

## 按需读取

- 分层开发规范：`references/application-layer-guide.md`

## 既有工程与条件适用

事务、幂等、提交后副作用按实际用例评估；未命中不创建空事务、空端口或空恢复实现。DDD 的领域规则归 Domain，MVC 规则允许留在已登记 service/core。
