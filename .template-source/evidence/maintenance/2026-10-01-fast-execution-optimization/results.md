# 完整 fast 执行优化结果

保留 `legacy` 默认。依赖覆盖修复、单次准备复用、受控并行与分段计时已经实现；三档性能验收尚未完成，未启用 optimized 默认。用户明确确认主动停止基准，并要求“保留 legacy 并汇总现有结果”。没有提交、推送、发布或迁移既有项目实例。

## 实际性能结果

正式样本使用同一冻结源码副本、独立锁定安装的依赖、相同必跑测试集合；每对随机交错运行 legacy / optimized。基线包含本轮依赖修复和观测，不以原有漏检路径作为速度标准。墙钟计时包含整个验证进程、准备、校验、复制和清理；p95 为 nearest-rank，21 项取排序后的第 20 项。没有剔除慢样本，也没有将各档混合。

| 状态 | 有效样本（legacy / optimized） | 中位数（秒） | p95（秒） | 验收 |
| --- | --- | --- | --- | --- |
| 首次运行 | 21 / 21 | 270.82 → 194.66，减少 28.12% | 378.93 → 281.12 | 本档通过 |
| 重复运行 | 13 / 14 | 不作最终判断 | 不作最终判断 | 未完成 21 对 |
| 相关输入变化 | 0 / 0 | 未测 | 未测 | 未开始 |

计划 126 次，完成 69 次有效运行。随后 `repeat-13-legacy` 的外层计时进程收到人工 SIGTERM，退出码 130；即使其内层验证报告已经通过，也因缺少完整外层计时而不计入有效样本。源码已恢复、运行锁已释放，未发现本轮遗留进程。原始报告保留 `failed` 和信号记录，人工决定另记在 [acceptance.json](acceptance.json)，没有把中断改写成性能失败或验收通过。

开发阶段三档各 3 对曾得到约 27.71%–28.84% 的中位数减少，但当时是较早的 193 项 Node 测试版本和不同输入变化重放。这 18 次开发运行只作诊断，不并入正式验收。历史约 248 秒的原始版本结果继续保留在 `../2026-10-01-execution-efficiency-pilot/verification-summary.md` 及其 `verification-frozen-fast-standalone/report.json`，不作为本轮正式比较基线。

## 实现与正确性证据

- Schema 运行时和 validation phase 变更升级完整验证；business-ticket 变更选中业务票合同测试。保留未知路径升级规则。实际“全部接受”的 Schema 变异会被选中的拒绝测试发现，恢复后通过。
- 原 runner、Node、Python 保留。每次运行重新准备固定 CLI 和插件产物；3 个消费文件使用独立复制，4 个明确登记的慢文件最多 2 个 worker；其他及新增文件默认串行。未增加跨运行缓存、后台服务或框架迁移。
- 产物绑定源码摘要、pins、snapshot 和实际 Node/Python 指纹。复制前后检查内容、文件类型和完整权限位，拒绝符号链接；消费副本互不影响，不用硬链接。构建专项测试保留两次真实构建及原有断言；单文件无共享上下文时自行构建。
- 有效正式样本均为 194 项 Node（原 185 项保留，新增 9 项）和 39 项 Python；逐项比较文件、父级测试名、名称、执行次数及结果，没有跳过或 todo，全部 `input_drift=false`。历史清单兼容对照见 [original-identity-preservation.json](original-identity-preservation.json)。选择规则与 Schema 等专项测试另行执行，不混入这份 pnpm 测试清单。
- 实测成功插件构建从 6 次变为 4 次，消费复制为 3 次。首对分段指标显示主要墙钟收益来自并行；复制和完整性校验本身有成本，已计入，不将局部构建耗时下降当作整体收益。
- 定向检查 30 项通过。反例覆盖源码、Schema、引用、lock、pins、运行时、删除、篡改、普通及特殊权限位、符号链接、类型、重复失败/恢复、两个进程并发消费、超时、取消及孙进程回收。真实 wrapper 的取消探针还验证了自有临时目录清理和外部日志保留。它们是已声明边界的有限反例证据，不是所有可能故障的无漏检证明。
- `optimized --concurrency 1` 的完整 fast 实测通过：21 个文件各执行一次，时间区间无重叠，194 / 39 项与 legacy 身份一致，`input_drift=false`。详见 [serial-compatibility.json](serial-compatibility.json)。release 强制 legacy，并约束外层与内部都串行。

## 交付验证与适用范围

本轮完整实际改动触发 fast / candidate 升级为 release；没有把性能重放的限定变更集当作交付范围。冻结副本的 `scripts/verify-template --concurrency 1` 已通过：213 条结果记录、211 个唯一命令、2 次去重复用、无未执行项，`input_drift=false`，墙钟 743.445 秒。见 [完整报告](verification/report.json) 和 [摘要](full-verification-summary.json)。完整验证后仅补充基准控制器的信号处理与自身摘要记录，另有实际中断 RED/GREEN 探针；运行时优化实现不变。

共享主工作区在采样期间有其他任务继续修改，包括同一个 profiles 文件新增 structured-assets 路由。已保留这些内容；本轮完整通过结果只证明冻结的本轮改动，不代表这些并行改动的完整集成验证。主 HEAD 仍为 `8fc0122a9e417a91c62cfe78afc1c0cb70ca56d6`，最初 111 个无关未跟踪文件字节未变。差异与保存范围见 [workspace-preservation.json](workspace-preservation.json)。

分发检查确认本轮模板维护资产不进入 generic CLI 的实例 manifest，三个专用 Agent 仓库的治理共享输入也没有本轮变更；因此本轮不生成 Skill 投影或实例分发更新。其他任务的 Skill、锁和子模块变更不计作本轮工作。见 [distribution-scope.json](distribution-scope.json)。

验证平台为 macOS ARM64。OS 页缓存未控制；首次和重复档均按每次新建准备目录执行，没有持久产物缓存。观测到同机其他验证进程及慢样本，保留了观察记录，不据此删除样本或认定因果。结论不外推为 Windows/Linux 的性能或进程树回收保证，也不表示整个 SDD 流程等比例提速。

## 当前决定与证据入口

默认保持 legacy；optimized 仅显式试用。只有未来重新完成三档各 21 对、所有中位数减少至少 20%、p95 不回退及适用正确性核验后，才考虑切换 fast 默认。当前没有这项完成结论。

- [复现与回退](reproduction.md)
- [维护 checkpoint](checkpoint.json)、[自检](self-check.md)、[缺陷复盘](retrospective.md)
- [正式原始样本](formal-benchmark.json)、[验收状态](acceptance.json)
- [原始日志与探针归档](raw-evidence.tar.gz)、[逐文件与归档 SHA-256](raw-evidence-index.json)

归档内报告仍保留执行时的绝对路径。将原 `/tmp/yss-fast-optimization-20261001/` 或 `/private/tmp/yss-fast-optimization-20261001/` 前缀映射到解包目录即可定位原始日志；没有重写原报告的时间、状态或路径。
