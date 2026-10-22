---
design_id: matt-method-optimization
version: 0.1.0
status: proposed
repository_mode: template-source
updated_at: 2026-10-22
template_base: a9f24bfff07fef9201ae6c4c4bf6029fb6ea8142
cli_base: 75ef66aff6c38481f06b233fdefc8958b37f83f4
---

# Matt 方法适配后的第二轮能力优化设计

本文是用户要求构建的**方案 PR**，状态为待审阅；本 PR 增加设计、执行计划、索引及其既有文档检查的输入登记，不表示下述修复已实施或新能力已验证。日期按 Asia/Shanghai。实施步骤见[执行计划](2026-10-22-matt-method-optimization-plan.md)。CLI 侧设计见[关联方案](https://github.com/iloveZzz/yss-cli/blob/docs/matt131-optimization-proposal-20261022/docs/superpowers/specs/2026-10-22-matt-method-optimization-design.md)。

## 1. 目标和已有能力

将已吸收的集中准备、受控协作、真实反馈、交付证据，进一步接入可运行、可观测、可复核的工程流程。先修已确认问题，再用真实任务结果决定准备适配和跨 Slice 预检的投入。

| 已有升级 | 本轮承接方式 |
|---|---|
| [#107](https://github.com/iloveZzz/yss-spec-project-template/pull/107)：review mode、Ticket/Slice、深模块判据一致性 | 清理仍可达的旧说明；不增加固定审查角色 |
| [#108](https://github.com/iloveZzz/yss-spec-project-template/pull/108)：真实信号复盘、Before/After、daily 当前字节重验 | 接通已有诊断，观察改进行动是否被验证及是否复发 |
| [#109](https://github.com/iloveZzz/yss-spec-project-template/pull/109)：集中准备、受控并行、串行汇合、CI 依赖接线 | 恢复持续验证；后续先设计只读集合预检 |
| v4.7.1 / CLI v2.7.1：WorkBuddy 目录修正与受管迁移 | 当前指标纳入 `.workbuddy/skills`；不恢复已退役目录 |

Matt [v1.3.1](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/CHANGELOG.md) 本身是路由说明修复；主要参考思想来自 v1.3.0 的 implement-spec、pr、retro。YSS 保留原锁定来源，按本地合同选择性适配。既有研究、诊断、领域建模、TDD、路由与授权核验不重复列为本轮新增。

## 2. 固定证据与问题级别

| 对象 | 核验事实 | 设计影响 |
|---|---|---|
| 已发布模板 | [v4.7.1](https://github.com/iloveZzz/yss-spec-project-template/releases/tag/v4.7.1) 固定在 `a435d0693b374e58f803b61817c9d8f9402c72e9` | 当前 main 的后续变化不使已发布 tag 自动失效 |
| P1 持续检查 | [#111 后的工作流](https://github.com/iloveZzz/yss-spec-project-template/blob/a9f24bfff07fef9201ae6c4c4bf6029fb6ea8142/.github/workflows/template-slow-checks.yml) 将定时 slow job 换成固定 v4.7.1 上传器 | 恢复既有入口，底层 slow 命令继续复用 |
| P1 CLI 发布入口 | [#55 后的工作流](https://github.com/iloveZzz/yss-cli/blob/75ef66aff6c38481f06b233fdefc8958b37f83f4/.github/workflows/publish-release.yml) 被固定旧草稿上传器占用 | CLI C1 单独修复；不声称所有手动发布路径不可用 |
| P2 政策说明 | [tailoring](https://github.com/iloveZzz/yss-spec-project-template/blob/a9f24bfff07fef9201ae6c4c4bf6029fb6ea8142/.template-spec/process/harness-process-tailoring.md#L8) 仍将 daily/普通功能与固定独立审查绑定 | 对照现行机器政策逐段修正，保留历史原义 |
| P2 诊断消费 | [发行 runner](https://github.com/iloveZzz/yss-cli/blob/75ef66aff6c38481f06b233fdefc8958b37f83f4/tools/release-evidence/run-program-installation.py#L137) 未传已有 `--diagnostics` | CLI C2 最小接线；不重建日志系统 |
| P2/P3 指标 | [projectionStats](https://github.com/iloveZzz/yss-spec-project-template/blob/a9f24bfff07fef9201ae6c4c4bf6029fb6ea8142/scripts/lib/harness-metrics.mjs#L111) 的旧根列表没有 WorkBuddy | 增加明确版本的当前视图，不悄悄改历史管道口径 |

本次没有新的 Agent 效果实验。安装、迁移、回滚断言和 CI 通过只能支持各自覆盖范围，不能证明分析准确率或交付效率提升。

## 3. 方案选择与工作包

考虑过三个方向：整体替换上游技能、直接增加自动调度、先修工程接线并观察效果。选择第三个方向：它保留 YSS 已有治理与证据能力，能够用明确反例验收；前两者会扩大迁移面，却不能先解决已确认缺口。

| 包 | 交付 | 实现 PR 边界 | 优先级 |
|---|---|---|---|
| T1 | 恢复模板定时/手动慢检查 | workflow、必要的恢复材料退役及入口说明 | P1 |
| T2 | 可达政策说明一致 | 当前规范和实际受影响的派生消费者 | P2 |
| T3 | 当前平台注册投影指标 | metrics、消费界面、针对性测试 | P2/P3 |
| T4 | 真实任务观察与反馈关闭 | 观察协议及实际样本报告；先不改业务记录 schema | P2/P3 |
| C1 / C2 | 通用发布恢复 / 发行诊断接线 | CLI 仓分别实施，见关联方案 | P1 / P2 |
| C3 / C4 | 准备适配 / 跨 Slice 只读集合预检 | 后续设计包；根据真实需求细化接口再实施 | 条件性后续 |

T1、C1 可在独立工作树并行；审阅集成按 **T1/C1 → T2 → C2 → T3 → T4 → C3/C4** 推进。技术上无依赖的工作不制造人工等待，但每个实现 PR 都需完成自身 review、修复和受影响复验。C4 不代表批准自动派发。

### T1：恢复持续检查

恢复 `.github/workflows/template-slow-checks.yml` 的 schedule、workflow_dispatch、只读权限、完整历史、按需工具准备、`scripts/ci-gate --mode slow` 和始终保留报告。以已发布 v4.7.1 的工作流为职责基准，核对当前工具 pin 后恢复；不把旧版本号带进新入口。

现有 `tests/ci-adapters.test.mjs` 已覆盖大部分合同，优先复用；对未覆盖且会造成真实回归的条件补最小反例。正常入口不调用 `.release-recovery`。固定恢复器及大附件从现役树退役前，先核对其历史 commit、摘要和对应 Release 的可追溯性；不清理未登记的用户文件、不改写 Git 历史。若确有未来恢复需求，再以独立明确命名的人工入口设计，不能覆盖正常验证入口。

预算保持分层：slow 验证为现行 300 秒硬上限，job 总上限 20 分钟；此前用户指定的 1000 秒只用于模板发布准备。手动运行能证明 slow 路由及执行，schedule 触发还需合入后的一次实际定时记录；两者不混报。

### T2：统一可达说明

权威来源为 `.template-spec/process/orchestration/domain/review.yaml` 的 `review_modes` 及现行 Profile 政策。修正 `harness-process-tailoring.md` 中 daily、普通功能、推进职责和延续证据的措辞，联查 `agent-entry-policy.md`、`subagent-collaboration.md` 与实际引用的 lifecycle references。

规则保持：默认诚实自检；实际用户或已知外部要求命中时才要求独立复核，且独立性必须可核验；历史记录按来源政策读取。当前治理入口不得把旧规则重新提升为现行前提。不能全局替换“独立审查”字符串，也不能凭说明修改放宽机器合同。

仅在 canonical Skill 确实变化时使用现有生成器同步锁、投影和实际 Profile 消费者；不因纯维护方案文档触发无关分发刷新。

### T3：补齐当前指标，保留历史可比性

现有 `pipeline_commits`、时间窗口和历史路径分类保持原义。现有投影字段继续保持 v1 语义，新增独立标识 `projection_coverage_v2` 的当前注册视图；实施前核对所有消费者对新增字段的兼容性，不能复用旧字段名悄悄改变意义。

新视图只读消费 `.template-spec/agents/yss-skill-registry.yaml`（Backend 使用对应 Profile 来源）的 `instance_distribution.projection_roots` / `agent_runtime_roots`，通过现有轻量读取函数取得当前根集合，不再维护第二份平台常量，也不加载完整治理执行器。输出至少包含口径标识、Profile、注册来源及摘要、声明根、实际存在状态、观察计数和无法统计原因。

按根去重；Spec/Backend 各按自身政策统计 `.workbuddy/skills`。仅属于私有或退役平台的目录不加入“当前已声明覆盖”分母；历史字段仍可展示旧根。缺注册表、非法根、权限不足返回不可统计原因，不能退回猜测列表或把未知记零。缺少一个已声明投影根应明确显示 missing。文件计数不代表 WorkBuddy 桌面发现、调用或语义理解。

### T4：真实任务小样本观察

先观察接下来实际发生的少量任务，目标约 6 项，尽量包含功能、缺陷和跨仓任务；未自然出现的类别标为缺样本，不制造业务任务凑数。复用同一 Ticket/PR、实际命令日志和现有 metrics；运行材料按维护留存政策放仓外 maintenance，报告只保留可访问引用、摘要及结果。

| 观察项 | 定义和证据 | 缺数处理 |
|---|---|---|
| 重复澄清 | 同一已提供且仍有效事实再次索取，引用两次消息和已有事实；排除新范围/失效决定 | 无完整对话则 unavailable |
| 返工 | 实际检查或 review 发现缺陷后的修订与复验，关联 diff、失败原因和真实消费者 | 无历史轮次则 unavailable，不能从当前通过状态推算 |
| 定位阻碍 | 有问题症状、实际诊断命令及已确认机制；假设单列 | 未定位保留 unknown |
| 改进行动关闭 | 原行动关联修复 PR、消费者验证及开放问题状态 | 只有建议/提交/自评不算关闭 |
| 同类复发与耗时 | 写明观察窗口；耗时区分执行、等待，须有开始/结束记录 | 无再次观察不等于不复发；无时间不记零 |

使用历史真实样本作比较时，必须列出任务复杂度、模型、工具、输入和环境差异；无法配对只作描述。报告必须列样本总数、缺失数和逐项依据，不以模型自评分、测试数或虚构 Token 节省宣称效果。现有 Agent replay 的自动断言和 `semantic_review` 分开保留；read 成功不能替代理解复核。

### C3/C4：后续设计入口

C3 复用 route/query/next_action、现有 prepare 与原始决定证据，针对样本中的重复准备或有限句法阻碍设计适配。不能改写用户原话，不能用关键词猜批准；未知范围明确说明不支持。

C4 先形成跨 Slice 的只读集合预检合同，原生判断由 CLI 持有。输入复用实际任务包、依赖、实施合同、工程根、基线、观测范围、允许写域、资源和集成验证；不建立第二套状态数据库。缺资源或依赖事实时只返回无法判定，不判为可并行。

至少覆盖两个独立任务和一个依赖任务，以及不同文件但共享 `source.roots/source.files`、不同批准根、端口/构建目录冲突、基线变化、缺集成验证。预检不派发、不写入、不批准；实施前仍核验当前性。单一集成人串行汇合，合并后按实际影响重验，最终候选满足整体验收。`validateTaskPackageSet` 的同 Slice 语义不放宽为多 Slice。具体 CLI/JSON 接口留给后续专项设计，本文不声明其已存在。

## 4. 风险、验证和交付边界

- 每项实现先明确验收反例，再修改最小消费者；复用已有测试。纯说明不增加仅匹配文字的测试。
- 发布入口和授权边界变化必须验证拒绝路径；自检通过或静态 YAML 检查不替代实际 slow job、原生安装或公开下载验证。
- T3 先证明旧指标兼容，再报告新平台覆盖；T4 不新增强制表单、业务批准或常驻采集服务。
- 回滚采用独立 revert 或关闭新增的可选视图；保留失败证据。T1 回滚仍需保留正常检查入口，不能把单次上传器重新当作 slow job。
- 当前模板发布为已披露的 limited 验证，完整 release 档及延期慢检查需按未来候选实际范围补证；不把本方案 PR 当成清偿验证债。
- WorkBuddy 真实 Mac 项目由用户测试；Windows 继续 build-only。真实宿主未验证保持 unknown，不凭目录计数改变资格。
- 本方案不设置下一发行版本、不改正式 tag/附件、不升级用户实例。后续发行绑定最终模板与 CLI 源码、当前验证及届时有效的发布授权。

## 5. 审阅标准

审阅者需确认：每个缺陷有固定来源；已有能力没有被重复建设；近期工作能独立验收和回滚；历史政策及指标不被重解释；C3/C4 的接口不确定性没有被伪装为可直接实施。对方案提出的修订先核实事实，再更新设计及相应计划，保持两仓交叉引用和工作包编号一致。
