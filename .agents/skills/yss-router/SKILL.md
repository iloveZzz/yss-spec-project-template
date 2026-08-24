---
name: yss-router
description: Use when a YSS vertical slice is entering implementation, spans multiple frontend/backend/API areas, needs implementation readiness checked, or requires a minimal YSS skill set, Slice Implementation Contract, TDD mode, evidence plan, or reroute decision.
---

# YSS Router

阶段 7 的实现合同编译器。它把已批准的生命周期资产和垂直切片编译为 `Slice Implementation Contract` 草案；不批准合同、不写业务代码、不设置 `ready-for-agent`。

## 输入

先读取 Spec、切片 Ticket、需求冻结、适用的原型确认、OpenAPI Freeze/no-impact、系统/数据架构、Design Review、Build Architecture Checklist、实现仓库和验证命令。输入缺失、未批准或 `stale` 时输出 `blocked`，交回 `yss-product-lifecycle`。

## 编译循环

1. 判断 frontend/backend/API/data/cross-repo 影响，并逐项填写 backend `component_impacts`。
2. 检查工程存在性和核心/长尾 skill 可用性。
3. 选择主 skill，并按 [router-contract.yaml](references/router-contract.yaml) 计算强制依赖闭包。
4. 为切片生成基线合同；为当前行为生成工作单元增量路由。
5. 选择 `behavior-tdd` 或 `controlled-generation`。
6. 输出 `draft`、`blocked` 或 `ready-for-lifecycle-review`，交生命周期编排器核验和持久化。

合同结构见 [slice-implementation-contract.md](references/slice-implementation-contract.md)，专项返回协议见 [yss-skill-execution-result.md](references/yss-skill-execution-result.md)。

## 硬规则

- Router 不得输出 `approved`、`ready-for-agent` 或 `completed`。
- UI 影响缺少正式原型确认时，不得路由页面实现。
- Repository/数据模型影响缺少数据架构时，不得路由持久化实现。
- API 变化必须回到生命周期 Draft/Review/Freeze；半成品 backend 不得冒充稳定 source of truth。
- 后端端到端切片必须包含 Application；对象/POJO 影响按契约自动补 `mapstruct`、`lombok`、`alibaba-java-code-style`。
- 写路径由 `layout_policy` 决定。`applies_to` 仍是新建/脚手架进实例仓的 `harness-resident-runtime-code`：`harness-apps-multi-project` 必须落在 `apps/backend/<project>/` 或 `apps/frontend/<project>/` 的具体项目目录；`apps/backend/`、`apps/frontend/` 只能作为容器，`app/backend/`、`app/frontend/` 及其子路径一律阻断。`external-repository-native`（含 attach 后同仓）使用登记根；禁止把 native 根改写成 `apps/` 占位。
- 当前用户、审计事件、普通技术日志、请求校验、错误映射或加解密命中时，必须按 `router-contract.yaml` 的 `component_impact_routing` 补齐长尾 skill；不能只在 `boundaries.md` 中提及。仅复用已经验证的平台认证 / 授权能力不算 component impact，不自动增加权限专项 skill。
- 业务行为使用 `behavior-tdd`；只有机械脚手架/生成物可用 `controlled-generation`，并记录例外和验证。
- 原型确认后若 backend `scaffold_status=required`，先由本 Router 按 `scaffold_contract_schema` 编译 `yss-ddd-scaffold-generator` 的 `controlled-generation` 工作单元合同 draft；合同必须带 `contract_id`、`contract_version`、Router draft、生命周期批准、持久化引用、允许写路径、预期证据和验证命令。经生命周期编排器批准并持久化后才能运行生成器，再由受控工作单元实际执行固定的 `./mvnw validate`、`./mvnw test`、`./mvnw package` 并记录逐条结果，随后加载 `yss-backend-scaffold-parent` 并重新编译业务合同；脚手架不承载业务行为。
- 脚手架合同在 Router 阶段只能是 `draft` / `ready-for-lifecycle-review` / `blocked`；只有生命周期编排器可以把已持久化脚手架合同标记为 `approved`。脚手架合同只覆盖业务代码前的工程骨架工作单元；生成、基线校验和 Router 重编译完成后，它不能替代脚手架后的 Slice Implementation Contract。
- 脚手架输出消费批准的脚手架合同；脚手架后的所有生成后端代码都必须绑定当前批准且版本当前的 Slice Implementation Contract、主 YSS skill、依赖闭包、允许写路径、预期证据和 YSS Skill Execution Result。打印命令、`./mvnw validate` 单项通过或脚手架成功不能替代合同批准；生成范围从机械内容变成业务行为时触发完整重路由。
- 专项结果中的越界路径、缺失证据、`drift`、`violation` 或 `new_impacts` 必须阻断或重路由。
- 长尾 skill 不可用时显式 `blocked`，不得用通用知识假装已应用 YSS 规范。

## 三级路由

- 切片基线路由：生成完整合同和技能闭包。
- 工作单元增量路由：绑定一个行为、主/辅 skills、TDD 模式、路径和证据。
- 完整重路由：API/schema、状态机、数据模型、仓库、写路径、skill、测试 seam 或架构约束发生实质变化时触发。实现中出现未冻结的新行为（包括明确的权限业务行为）统一写入 `new_impacts`，由生命周期按普通影响面重新分诊。

## 输出

输出合同草案、技能依赖闭包、不适用理由、阻塞项、TDD 模式、工作单元、预期证据、验证命令、人工审查点和完整重路由触发器。自然语言说明不能替代结构化合同字段。
