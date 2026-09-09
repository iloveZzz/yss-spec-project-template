# 生命周期对话耗时诊断与执行优化

日期：2026-09-10。仓库身份：`template-source`。范围：生命周期入口、编排执行策略、查询回归场景及生成的技能投影/锁文件。强度：L3（`aggregate-behavior-change`），维护者自检。当前结论：修改已落盘，聚合验证未闭合；不宣称 implementation-ready、可合并或可发布。未创建产品 Spec、原型、OpenAPI 或 Ticket，context reconciliation 为 not-applicable，原因是本轮仅维护模板流程规则。未提交或推送 Git。

## 问题与测量

用户澄清慢的是整个 Plan → Spec → Ticket 对话，未提供那次运行的逐调用时间线。不能把十分钟总时长归因于脚本，也不能用下面的微基准声称整条流程已提速。

本机 Node v23.9.0；先测量、后修改；单位为毫秒。测量与其他工作区活动并存，不作为 CI 性能阈值。

| 测量对象 | 实际结果 |
|---|---|
| `parseContextContract()`，包含目录扫描，3 次 | 25.34 / 16.20 / 15.76 |
| 读取根 CONTEXT、`parseContextSource()` 后 `resolveContextTermRefs(contract, [])`，3 次 | 0.28 / 0.20 / 0.45 |
| `queryLifecycleContext({mode: 'route'})`，3 次 | 54.00 / 25.54 / 24.36 |
| 分别启动 CLI 查询 mode / Plan stage / Plan work-unit，5 组 | 277.5 / 270.1 / 269.0 / 267.8 / 272.2 |
| 同一组参数合并为一次 CLI 调用，5 组 | 91.0 / 90.8 / 88.7 / 90.4 / 89.4 |
| 分别查询 / 合并查询返回字节 | 8376 / 5988 |
| `verify-context-reconciliation-scenarios`，修改前 | 783，退出码 0 |
| `verify-lifecycle-context-query-scenarios`，修改前 | 351，退出码 0 |
| `verify-lifecycle-transition-scenarios`，修改前 | 1778，退出码 0 |

CLI 基准分别执行 `node scripts/query-lifecycle-context --mode route`、`--stage stage.plan`、`--work-unit work-unit.plan-requirements`，与把这三组参数合到一次调用比较；通过 `performance.now()` 包围 `spawnSync`，每种方式 5 组。基准发生在后续并行 Plan 入口规则修改前；查询输出扩展后应重新测量，不把旧字节数用于新的整轮成本估计。

实际运行 `scripts/verify-template-fast` 自动因已有 `AGENTS.md` 改动升级为 release。运行器记录：

- `node .template-source/scripts/verify-delivery-harness-distribution.mjs`：228049 ms。
- `scripts/verify-frontend-delivery-scenarios`：35474 ms。
- `scripts/verify-strategic-handoff-package-scenarios`：23743 ms。

这些是模板测试，不是普通产品阶段流转本身。运行器直到所有组结束才显示各命令详情。完整运行退出码 1（`verify-subagent-task-package-scenarios` 等场景未通过）；上述时长可用于定位成本，不构成通过证据。曾尝试终止此前的实例初始化子进程，但该进程已经自然结束，kill 返回进程不存在；全量运行最终自然结束。

## 本轮调整

权威定义为 `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml.execution_efficiency`，技能入口与执行协议引用该策略。

- mode、stage、work-unit 及所需 include 合并查询；只消费当前工作单元和命中影响面需要的资料。
- 当前任务内复用已读且未变化的资料，变化、冲突、新影响及恢复时重读。
- 当前资产落盘后，在批准或流转前验证。同一边界内，仅在输入、上游、验证器/schema、参数与仓库根均确认未变且实际结果可读时复用；新鲜度未知就重跑。
- 每个工作单元仍生成并校验 context reconciliation；恢复、交接、实现、合并及发布重新执行适用验证；命中门禁不跳过。
- 产品流转不自动重复模板回归套件，显式合同检查仍执行。独立问题可合并，依赖未来资产的批准不能提前取得。
- 在已有验证证据中区分脚本时间、Agent 编排时间和人工等待，未测量的时间记 unknown。

未修改 `scripts/lib/context-contract.mjs`、摘要算法、目录排除范围、批准语义或阶段状态。尚无用户实际项目的端到端计时，以上属于局部成本优化和执行指导，不能保证固定分钟数。

## 验证、自检与下一步

- `scripts/verify-lifecycle-context-query-scenarios`：本轮最终实际退出码 0。新增场景验证合并查询保留独立查询的阶段、门禁、路由、技能与转换信息；效率策略按需加载，不改变门禁。
- `scripts/verify-context-contract-scenarios`、`scripts/verify-context-reconciliation-scenarios`：本轮实际退出码 0。
- `scripts/sync-skills`、`scripts/update-skill-lock`：实际退出码 0；最终聚焦核验中的投影、锁文件、技能注册表及治理检查通过。
- 入口保持 8192 字节预算内，YAML 严格解析通过。模板说明与配置不采用业务 behavior-tdd；使用真实 CLI 查询等价检查和既有阻断场景验证。
- `scripts/verify-template-fast --changed-file .agents/skills/yss-product-lifecycle/SKILL.md --changed-file .agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml --changed-file .agents/skills/yss-product-lifecycle/references/orchestration.md --changed-file scripts/verify-lifecycle-context-query-scenarios --changed-file skills-lock.json`：退出码 1，见 [实际日志](focused-verification.log)。失败为已有 Plan 用户决定场景预期 allowed、实际 blocked；不删除或放宽检查来通过。
- 验证期间存在其他 Plan 入口改动：注册表、语义基线、流转器及共享 Skill 持续变化。曾遇到摘要不一致和投影漂移，随后查询验证已恢复通过；本轮不覆盖这些修改。

下一步：Plan 改动收敛后重新执行上述聚焦核验；在真实项目下一次完整流转中记录逐调用耗时，才能判断十分钟中脚本、Agent 和人工等待的占比。模板发布与跨仓分发集成不在本轮完成范围内。本轮不创建冻结候选或独立审查任务包，不对其他维护 Ticket 作完成裁决。
