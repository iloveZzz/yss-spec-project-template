# Slice 合同 v3 试点交付记录

本轮按用户批准的 v3 方案实现 Slice 合同及其直接消费者，替代上层 `implementation-design.md` 中“不改 schema”的旧方案。本轮目标为 **implementation-ready**；Slice v3 代码与专项验证已完成，但并行改动后的全仓统一状态尚未闭合。现有工作区改动保留，未提交、推送或发布。技术设计、脚手架、审批记录与交付合同没有因 Slice v3 联动升级。

## 实现结果

- `docs/process/schemas/slice-implementation-contract-v3.schema.json` 定义严格 v3 结构。权威 YAML 只保存上游绑定、共同范围、冻结编译结果、验收定位、共享验证、工作单元差异和适用扩展；不适用扩展整段省略。
- `scripts/lib/slice-contract.mjs` 提供 v2/v3 读取、原字节来源核验和内存规范化；验证范围继承、验收覆盖、来源别名、版本、写边界和验证目录。v2 保持原检查路径和原有摘要失效规则。
- `scripts/lib/slice-contract-preparation.mjs` 从 Ticket 和已有 checkpoint 的稳定 artifact 引用提取事实，复用已有 Skill 编译接口，输出草案、来源索引、缺口与原因链。登记范围只作为上限，不能代替切片授权。重复来源、未知字段、版本冲突、缺输入均阻断。普通非结构化说明仍由 Agent 整理，工具不猜测需求语义。
- `scripts/slice-contract` 提供 prepare、view、diff、migrate、verify。审阅/任务视图绑定合同 ID、版本和原字节摘要，工程约束可展开。迁移写入新文件、新版本，不覆盖旧合同、不继承批准。
- 批准、用户授权范围、任务包、freshness、交付预检和执行结果共用规范化入口。批准仍绑定权威 YAML 原始字节。v3 必须有当前合同的独立 `check.design-reviewed` 记录与有效实施范围确认；编译器仅起草。
- `compileSliceTaskPackage` 从批准 YAML 派生任务包，执行时重读来源。Execution Result 保持 v2，核验工作单元、实际命令及 cwd、写范围和预期证据。合同不保存运行进度、检查结果或实时 freshness。
- canonical Skill、Agent 投影、锁文件、后端/前端 Profile 补丁和共享分发快照在本轮验证快照已同步通过；收尾后另一任务继续修改相同 canonical Skill，引起新的适配基线漂移，见下方边界。接收端直接读取同一份 v3 合同并比较有效约束；重路由条件在准备时冻结一次，避免不同 Profile 的本地默认值改变同一合同含义。

直接入口：

```sh
scripts/slice-contract prepare <ticket.md> --input <切片补充.yaml> --output <新合同.yaml> --root <治理根>
scripts/slice-contract view <合同.yaml> --root <治理根>
scripts/slice-contract view <合同.yaml> --unit <工作单元ID> --root <治理根>
scripts/slice-contract migrate <旧v2.yaml> --input <迁移补充.yaml> --output <新v3.yaml> --root <治理根>
```

`--input` 只需来源选择和切片新增细化，也可由 Agent 直接调用准备 API；它不是第二份批准合同。`verify` 仅检查合同/来源，不授予执行权限。

## 同一组合成 MVC 合同的测量

原始结果见 `metrics.json`，重现命令：

```sh
node scripts/fixtures/slice-contract-v3/measure.mjs
```

| 指标 | v2 对照 | v3 | 变化 |
|---|---:|---:|---|
| 字段数 | 185 | 105 | 减少 43.2% |
| YAML 字节 | 8285 | 5260 | 减少 36.5% |
| YAML 行数 | 273 | 167 | 减少 38.8% |
| 冻结 Skill 清单保存次数 | 4 | 1 | 只保留 resolution |
| 写范围保存次数 | 4 | 1 | 工作单元默认继承 |
| 同一验证命令保存次数 | 3 | 1 | 工作单元引用验证 ID |
| 准备操作分组 | 6 | 3 | 来源选择、细化、自动准备与查看 |

默认审阅摘要为 769 字节，完整工程约束仍可展开。步骤详情在 `metrics.json`。这些数据来自同一套已登记 MVC 工程、来源和工作单元的合成夹具；v2 按既有 required 表展开，未把内存规范化产生的额外字段算入旧权威格式。它们不是历史生产合同、真实人工耗时或真实审批次数。示例中的临时工程路径已替换为 `/synthetic/project-root`，摘要仅用于说明，不构成可执行合同。

有效确认复用回归重复读取同一批准，并断言原回复数量及文件字节不变；新增确认次数为 0。合同字节变化后，即便调用方更新 digest，也不能复用旧审查/批准。

## 验证与自检

L3，维护者自检；本轮未声称完成独立模板审查。产品切片执行前的独立专业审查是已实现的运行门禁，测试批准与回复全部为合成夹具。

最新针对性结果见 `verification.json` 及 `check-*.log`，覆盖：

- v3 MVC 准备、批准、派发、结果核验，前端、DDD、跨仓条件扩展；两类接收端直接读取和 CLI 查看。
- 缺来源、来源冲突/版本冲突、别名循环、未知字段、越界、漏验收、缺验证/证据、非独立审查、伪造执行上下文、缺原回复、原始摘要漂移。
- v2/v3 对等约束、旧文件不被覆盖、重复字段迁移冲突、批准不继承；用户确认延续协议回归。
- 审批与两类任务包、交付预检、Profile 同步、共享工具锁、Skill 治理、上下文预算、仓库边界与 diff 空白检查。

自检发现并修复：旧前端部分合同被误套 v3 规范化、生命周期入口超出阅读预算、文档兼容性标记缺失、接收端重路由默认值不一致，以及准备输入未知字段/版本冲突可能被忽略的问题。当前编译器和架构消费者还引用工作区已有的 backend-platform 读取模块，本轮仅把该现有间接依赖及其目录数据纳入分发，未修改平台规则。

## 全仓验证边界

执行了 `scripts/verify-template-fast`。由于工作区已有 AGENTS.md 等核心治理改动，命令自动升级为 release profile；61 项检查中当时有 3 项失败，原始结果完整保存在 `template-verification.log/json`：

1. Profile 中既有控制器生成器变动尚未同步：之后已完成同步，最新 `check-07.log` 复验通过。
2. `scripts/verify-scaffold-generator-scenarios`：当前工作区已有脚手架变动导致“脚手架不得把 app/backend 作为工程输出路径”用例失败。本轮保留相关源文件，不扩展为脚手架重构。
3. `scripts/verify-strategic-handoff-tools-lock --require-committed`：快照来源为 working-tree；用户未授权提交，本轮不绕过该发布门禁。

收尾复核又发现新的并行改动：后端平台规则修改了编译器 Skill 及 compiler-contract.yaml，两个 Profile 的 source_tree_sha256 因此失配，另外有 5 个 Skill 等待同步。最新原始状态见 `profile-final.log`，先前通过的 `check-07.log` 不代表这些新改动已经闭合。用户已明确确认另一任务正在修改同一工作区，要求“保留双方改动，报告本轮验证边界”。本轮因此保留这些变动，不重写平台规则或追赶其适配补丁。

交付预检在并行读取期间曾报编译依据漂移；停止并行后单独重验通过，失败和重验都保存在 `verification.json` 与 `preflight-recheck.log`。

本记录确认 **Slice v3 核心实现及专项回归通过**，尚不宣称当前共享工作区形成统一的 implementation-ready 快照、全仓验证通过、可合并或可发布。下一次整体收敛需要将并行任务的最终 canonical 内容合入 Profile 补丁并刷新锁与投影，再处理脚手架回归和最终验证。正式发布另需已提交来源与完整发布验证；外部 CLI 固定版本集成也不由本地读取测试替代。

`context_reconciliation: not-applicable`：本仓为 template-source，仅校验模板合同与根 CONTEXT.md，不生成产品工作单元的词汇对账记录。
