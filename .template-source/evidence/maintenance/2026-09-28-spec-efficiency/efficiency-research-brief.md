# 研发规格执行效率研究简报

## Research Scope

Profile：technical-evidence；Mode：evidence-audited。日期：2026-09-28。范围：模板及四个 CLI/三个专职 Profile 的本地源码和合成运行。下游：模板维护主控；研究本身不批准资产、门禁或发布。此前 quick 结论在本包中逐项补充原始源码、反例和可复核命令。

## Findings

- claim-digest：基线查询把 public_description 用作返回说明，而 semanticProjection 排除 public_*。这是结果绑定缺口，并非稳定 ID 应变化的证据。保留语义摘要，增加原字节和完整上下文绑定；同次读取和返回前漂移复核由 validation-phase 负责。定位：`scripts/lib/lifecycle-context-query.mjs`、`scripts/lib/lifecycle-registry.mjs`，回归：`tests/lifecycle-query-freshness.test.mjs`。
- claim-intake：原 task-package 只有三种正式合同，template-maintenance 路径要求 checkpoint。单纯研究在此路径产生无必要的维护前置材料。v2 专用只读合同隔离这一需求；不得以轻量路径批准、实现或流转。定位：`scripts/lib/task-package.mjs`、任务包 schema 和 `tests/read-only-intake.test.mjs`。
- claim-selection：现有 runner 已去重、并发和流式日志，不应重复宣称这些是新增优化。当前 Skill 分组仍把两项无依赖专项场景带入文档样本；shadow 候选去除这两项，保持治理/投影/锁与所属研究场景。局部合成样本出现命令和中位时间减少，不能推算整体研发收益或证明所有语义失败都覆盖。
- claim-context：现有合同视图和 validation-phase 已提供执行边界内复用基础。原始 Slice v2/v3 字段位置不同，v3 运行时 common 别名不能写回原 YAML。prepare-review 只生成机械材料，语义等价和批准延续仍需原校验及独立审查。

## Counter-Signals

原 semantic_sha256 的目标是稳定 ID 语义，不能通过改历史基线修复展示绑定。原 v1 正式任务的 checkpoint/验证要求仍有价值，轻量入口不得弱化它们。原 runner 的去重/资源锁已存在；上下文读取量、进程数量和字节量不等于真实 Token 或人工节省。

测量命令：`node scripts/fixtures/contract-efficiency/measure.mjs <output.json> 30 query`（预热 3 次）；`node scripts/fixtures/contract-efficiency/measure-selection.mjs <new-dir> 3`（同一候选交替先后、每策略顺序三次）。原始结果归档为 query-measurement.json 与 selection-measurement/。函数内部时间和含模块加载的进程时间分别记录，不能与此前 82–94 ms 未同口径样本计算加速率。环境、负载、来源摘要、退出码和日志详见结果。

未取得真实低风险单仓/API/跨仓任务的端到端样本；不触发额外付费评测。查询没有百分比目标。白名单仍为 shadow，缺少完整“相关失败不遗漏”资格证据时不启用，即使局部计时下降。文件前后观测不能取代 OS 只读隔离，恶意伪造可信派发器证据和执行中改后恢复是已声明边界。

## Decision Handoff

已批准的实施范围见相邻 design.md；来源、claims、反证和审计状态以 efficiency-evidence.yaml 为准。当前工程验证见 validation-summary.md 与 checkpoint.yaml。历史批准、项目及快照不自动迁移；固定提交完整发布验证和真实发布仍在本轮授权之外。

## Executive Read

先补正确性与观测，再按证据减少重复执行。

## Source Map

仅使用仓库主源、回归及本地合成结果，出处对应 evidence claim；未调用外部市场资料。

## Evidence Limitations

样本和隔离边界已在反证段声明，不承诺整体提速或发布。
