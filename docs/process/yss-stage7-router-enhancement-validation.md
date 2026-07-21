---
status: complete
owner: ai
method: writing-skills-red-green-refactor
---

# YSS 阶段 7 Router 增强验证记录

> 日期：2026-07-21
> 当前范围：Router、核心 YSS skills、实现合同、执行结果、共享投影及模板门禁。

## RED 动态证据

两名独立 Agent 使用当前未增强技能完成只读模拟：

1. Router 的端到端 CRUD 组合遗漏 Application 和 Alibaba；MapStruct/Lombok 依赖只能等专项 skill 二次触发。
2. Router 无法稳定生成 `allowed_write_paths`、真实 evidence paths、模块级 verification commands 和 seam。
3. UI 正式原型未确认时，Router 仍可能路由页面实现。
4. API 变化能触发自然语言回退，但没有结构化合同失效、`new_impacts` 和恢复条件。
5. 状态机与机械生成没有 TDD 模式区分。
6. 核心 Router/YSS skills 只投影到 Codex，非 Codex Agent 无法执行同等阶段 7 流程。
7. scaffold references 的 `@Data` 推荐与当前 Lombok 风险规范冲突。
8. 核心 skills 均缺统一合同输入和结构化执行结果。

## GREEN 验收合同

实现结果必须证明：

- Router 输出统一合同且不能自行批准。
- 技能闭包自动补齐强制依赖，并输出不适用理由。
- UI/API/数据/后端结构门禁缺失时输出 `blocked`。
- `behavior-tdd` 与 `controlled-generation` 能按场景唯一选择。
- 工作单元新增影响能触发合同 stale 和完整重路由。
- 核心 skills 在所有共享 Agent root 可用，投影和 lock 一致。
- Execution Result 缺字段、路径越界、无实际验证或含 violation 时必须阻断。

## GREEN：实现结果

- `yss-router` 已从技能选择器增强为阶段 7 实现合同编译器，并由 `router-contract.yaml` 提供机器契约。
- 统一 `Slice Implementation Contract` 已覆盖 Common、Frontend、Backend、Contract、Cross-repo 和工作单元。
- `yss-product-lifecycle` 保留合同批准、持久化、`ready-for-agent` 和阶段结论的唯一裁决权。
- 核心 YSS skills 已消费批准合同并返回结构化 `YSS Skill Execution Result`。
- Router 已实现技能依赖闭包、`behavior-tdd` / `controlled-generation`、三级路由、合同失效和恢复规则。
- 核心实现链已提升为 `.agents/skills` 权威内容，并投影到 Claude、Codex、Hermes、Pi 和 Trae。

## REFACTOR：反例闭环

GREEN 后的变异和独立审查推动补齐：

1. Execution Result 的 status、合同 ref/id/version、skill/slice/work-unit identity、路径双重交集、证据 item、实际命令、ISO 时间、约束结果、deviation、seam 和 `new_impacts` 深层校验。
2. `controlled-generation` 缺任一例外、生成器输入、预期文件、验证命令或生成后行为测试时必须阻断。
3. 完整重路由动态验证 `stale → version increment → history → paused work units`，并分离 API schema 与 database schema 回退目的地。
4. UI、API/no-API、数据、后端和跨仓库 readiness 的逐字段反向变异。
5. `blockers`、`stale_inputs` 或 readiness 缺失时，合同只能为 `blocked`；全部满足时必须为 `ready-for-lifecycle-review`。ready 合同的生命周期证据必须是非空、与 readiness 同源的引用，布尔占位不能通过。
6. UI/Backend 影响与子合同 `required/not-applicable` 状态一致；适用子合同的 skills、边界、路径、测试 seam、证据和验证命令不得为空。
7. Backend 合同必须消费 Router 计算出的完整依赖闭包；闭包参数不可省略，Common 和 Backend 子合同均不得漏项。
8. Ready 合同必须有非空、ID 唯一、结构完整的工作单元；其主辅 skills、路径、证据和命令必须受父 Slice Contract 约束。
9. API 影响必须提供独立 `freeze_ref`，无 API 影响必须提供独立 `no_api_impact_ref`，两者不得混用。
10. 四个顶层 backend scaffold skills 在每个共享投影可发现；DDD generator 内嵌路径只保留指向顶层权威 skill 的薄 wrapper。
11. Scaffold 与 Lombok 示例不再默认对实体使用 `@Data`；YSS 对象转换不再推荐 `BeanUtils`；Maven 验证统一使用 Wrapper。
12. GitGuardian RED 扫描发现 Maven settings 资产包含仓库凭据；已改为 `${env.MAVEN_REPO_USERNAME}` / `${env.MAVEN_REPO_PASSWORD}`，并增加 XML 结构化验证，任何硬编码用户名、明文密码或 Maven 加密密码都会阻断模板校验。

## Fresh Verification

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |
| `scripts/verify-yss-router-scenarios` | 阶段 7 正反场景通过 |
| `scripts/verify-lifecycle-scenarios` | 五类基础场景与生命周期编排器压力场景通过 |
| `scripts/sync-skills --check` | 通过 |
| `scripts/update-skill-lock --check` | 通过 |
| `scripts/verify-template` | 模板发布校验通过 |

## 独立审查

- 审查者独立于实现者，全程只读。
- 首轮发现 Execution Result 假绿、合同标识错配、controlled-generation 未真实阻断及重路由仅检查静态配置，均已修订并补反例。
- 第二轮发现合同状态/影响面不变量和适用子合同深层字段仍不充分，已补齐决策到合同的正反 fixtures。
- 最终定点复审以布尔 evidence、错误/省略技能闭包、越界工作单元路径/证据/命令和 Frontend 错误 skill 为反例，全部得到预期阻断；确认无 P1/P2 遗留。

本地模板门禁通过不等于整体可发布；外部 `create-yss-spec` 跨仓库集成验证仍是发布阻断门禁。
