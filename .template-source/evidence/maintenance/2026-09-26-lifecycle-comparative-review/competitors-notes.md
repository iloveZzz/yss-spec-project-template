# 同类研发规格工具与 Skill 机制核验

研究日期：2026-09-26。Profile：`technical-evidence`；Mode：`evidence-audited`。本文件是主控研究包的子研究输入，逐条来源、检索记录、反证和访问限制见 `competitors-sources.json`。只研究公开官方文档和发行说明，未安装或运行竞品。中文表达按 `i-have-adhd` 与仓库文档写作规范组织。

## 结论与适用边界

五个样本都已超出“生成三份 Markdown”的早期形态。可恢复编排、按实际复杂度调整流程、实现后回查需求、跨仓共享规划和版本化契约都有直接官方证据。YSS 更值得验证的方向是：把既有治理规则变成少量可执行入口和可定位诊断，证明它们在真实交接与恢复中减少了错误，而不是继续靠增加阶段、角色或表单表达完整性。

这是机制比较的推断，不是竞品性能、市场份额或 YSS 收益结论。各工具的“批准”“完成”“跨仓”含义不同；有这些术语不代表具备 YSS 的合同、原始回复、版本新鲜度和接收责任语义。

## 当前版本边界

| 产品 | 本次直接读取的发行/文档边界 | 限制 |
|---|---|---|
| Spec Kit | latest `v1.0.12`，页面日期 2026-09-25；官方在线工作流和契约指南 | 在线文档可变；未逐一证明每项文档能力已进入该 tag 的安装包 |
| OpenSpec | latest `v1.13.2`，页面日期 2026-09-23；main workflow；Stores guide | Stores 明确为 beta，命令、格式和 JSON 可能变化 |
| Kiro | Specs 页面更新 2026-08-27；Quick/Bugfix 页面更新 2026-08-04；Web GitHub 页面更新 2026-08-22 | 托管产品文档，未确认账号、套餐和各运行端的实际可用性 |
| BMAD | latest `v6.12.0`，页面日期 2026-09-04；`v6.11.0` 发行说明与当前在线指南 | 在线指南已包含 `bmad-preview-ticketing`；该功能不是普通安装器默认稳定能力 |
| AWS AI-DLC Workflows | latest 稳定 `v2.10.0`（2026-09-24）；main 参考；最新 preview `v2.10.1-preview.20260925.1` | preview 明示 Full Suite failed；不能把 main 或 preview 当稳定版运行认证 |

版本证据：`evidence-sk-release`、`evidence-os-release`、`evidence-bmad-release`、`evidence-aidlc-release`、`evidence-aidlc-preview`；可定位链接见台账。

## 机制矩阵

| 产品 | 阶段 / 工件 | 编排与恢复 | 改动 / 棕地 | 验证与批准 | 跨仓 |
|---|---|---|---|---|---|
| Spec Kit | Specify、Plan、Tasks、Implement、Converge；此处 Plan 是技术实施计划，与 YSS 战略 Plan 不能按同名对应 | workflow run/status/resume、JSON 结果、持久 state/inputs/log；条件与并行步骤 | 明确区分 Flow-Forward、Living、Flow-Back 三类规格演进选择 | Analyze 检查工件一致性；Converge 仅追加剩余任务；workflow gate 可暂停，也可从非空输入默认值自动判定 | 官方 CDD 指南要求单一 owner、固定版本、消费者验证；明确不提供跨仓依赖解析或发布编排 |
| OpenSpec | change 为中心，proposal/specs/design/tasks；动作与依赖可反复调整 | CLI 返回当前状态、工件指令和待办；可回到指定 change 继续 | Delta 与归档回写 canonical specs；同意图细化与新变更有区分 | verify 检查完整性、正确性、一致性；默认可选且不阻断 archive | Stores beta 将共享契约置于独立 Git 仓，组件保留本地任务和 review；不会自动向仓库分派任务 |
| Kiro | Feature / Bugfix 三阶段；Quick 生成同格式工件 | tasks UI 展示进度；依赖图按波次并行 | Bugfix 明写缺陷行为、预期行为、须保留行为 | 标准 Feature 有审阅；Quick 没有阶段间审批；Analyze Requirements 面向跨需求逻辑冲突 | Web 文档支持一个任务操作多个授权仓；仍依赖 GitHub PR/保护分支完成审阅合并 |
| BMAD | Build 是共同实现入口；大任务额外规划；当前指南有短 Spec、PRD、UX、Architecture 选择 | 可接续未完成 plan；当前文档按 ready ticket 推进 | 调查代码和上游资产后评估意图缺口、不可逆动作、改动范围，再决定轻 / 完整计划 | 独立 reviewer、逐 finding triage；Build 文档包含本地提交；v6.12 修复 review 静默遗漏 | preview-ticketing 的 initiative store 可独立为 Git 仓，位于多仓 workspace；不是稳定版本能力证明 |
| AWS AI-DLC | 声明式阶段、scope、agent；编译图与状态机；阶段和角色分离 | 薄 conductor 转发 typed directive；engine 决定 next；status 和可执行恢复指引 | 棕地 codekb 按新鲜度选择复用/重扫；各仓独立有序回执 | artifact / sensor / human-reply / review receipt 检查；current main 的已完成阶段漂移仍是 advisory | 支持多仓 codekb 和回执；每个扫描仓的管线链闭合后才进入相应批准 |

矩阵的 `Spec Kit Plan`、`Kiro Design`、`AI-DLC stage` 与 YSS 同名词不能直接等同；比较应落在工件责任和流转语义。

## 最有价值的八项发现

### 1. “可执行下一动作”已是编排能力的一部分

Spec Kit 把暂停、失败、输入更新与精确恢复暴露为 CLI；AI-DLC 的稳定发行说明专门强调拒绝后应给可执行恢复动作。对 YSS 的建议是以当前 checkpoint / registry / 合同为输入输出一次诊断：阻塞原因、责任人、可读依据、下一条有效命令，而不是新增状态文件。来源：`evidence-sk-workflow`、`evidence-aidlc-release`。

反证：Spec Kit gate 的默认输入可自动作答，shell 无能力沙箱；YSS 若借鉴交互，不应连带借用其授权语义。只看命令存在不能证明恢复更快。

### 2. 流程裁剪宜基于已调查事实，而非用户提示词长短

BMAD v6.12 发行说明和 Build 指南都把流程深度判断放在调查之后；OpenSpec v1.12 把 code-grounded planning 写进发行说明；Kiro Quick 的适用面限定为熟悉特性与快速原型。YSS 可以把现有影响面裁剪展示为“命中什么、为何命中、还缺什么”，并用低风险配置、小型既有功能、高风险契约改动做对照。来源：`evidence-bmad-release`、`evidence-bmad-build`、`evidence-os-release-112`、`evidence-kiro-quick`。

反证：Quick 明确没有阶段审批；BMAD 轻路径仍是一种产品取舍。资料不支持无条件免除 YSS 已触发的门禁。

### 3. 规格质量检查与实现覆盖检查应分别可见

Kiro Analyze Requirements 关注需求之间的矛盾、模糊和缺失；Spec Kit Analyze 关注规格 / 计划 / 任务一致性，Converge 在实现后找遗漏并只追加任务。两种检查解决的问题不同。建议在 YSS 已有审查包里分别呈现“需求可判定性”和“验收证据覆盖”，让用户能区分是需求缺口还是实现遗漏。来源：`evidence-kiro-analyze`、`evidence-sk-sdd`。

反证：这些都是文档能力，没有本轮同题检出率证据；不建议仅因竞品有命令而新增一个永远必跑的 Skill。

### 4. 修复模板中的保留行为是有价值的可选视角

Kiro Bugfix Spec 把当前缺陷、期望结果和须保留的行为并列，再生成复现、修复和回归验证。可在 YSS 已有 Spec Delta / bugfix 路由中检查是否能自然表达“这次改什么、哪些邻近行为必须保持”，避免只写新增验收。来源：`evidence-kiro-bugfix`。

反证：不需要为所有改动新增完整文档；本轮也没有证据说明 Kiro PBT 实际覆盖率或回归逃逸率更好。

### 5. 跨仓共享已经常见，重点是可验证接收与部署关系

OpenSpec Stores beta 有共享行为合同与组件本地 change；Spec Kit CDD 明确单一 owner、只读固定版本、provider / consumer checks，并区分合同发布与真实服务可用；Kiro Web 文档有单任务多仓，BMAD preview 有独立 initiative store。YSS 不宜以“支持跨仓”本身做差异化，更应验证旧版本、错误接收包、消费者漏场景与部署未就绪能否被准确拒收。来源：`evidence-os-stores`、`evidence-sk-cdd`、`evidence-kiro-web`、`evidence-bmad-preview`。

反证：OpenSpec 不路由仓库任务；Spec Kit 不自动同步或编排发布；BMAD 属预览；Kiro 写 GitHub 的产品授权模型也不同。不能把四者概括为已经解决跨团队联合验收。

### 6. “工具通过”必须揭示哪些验证没有执行

OpenSpec v1.13.2 特别修复了 verify 把 skipped checks 报成 passing 的问题；同一项目的 workflow 文档仍明确 verify 不阻断 archive。这支持 YSS 继续保留 Fresh Verification，并把实跑、跳过、未覆盖显示为不同结论。来源：`evidence-os-release`、`evidence-os-workflows`。

反证：这是一项发行修复声明，未在本轮安装确认；不能因此称 OpenSpec 当前总是误报或 YSS 已全面防住此类误报。

### 7. 确定性内核与薄 Skill 有外部参照，但漂移策略有取舍

AI-DLC 主分支文档把路由放进 engine，把 conductor 保持为转发循环，并从 canonical core 生成不同 runtime 投影。其已完成阶段 freshness 机制可按实际消费关系传播 stale，减少不存在的可选输入引发误失效；但当前文档明确为 advisory 后继续路由，历史无回执状态 fail-open。YSS 可借鉴“按真实依赖限定失效范围”，继续保留自己必要的 fail-closed 语义。来源：`evidence-aidlc-harness`、`evidence-aidlc-orchestrator`。

反证：main 细节不能自动归属稳定版；本轮没有竞品源码执行或漂移注入实验，不能证明并发安全或错误率。

### 8. Skill 收敛需要兼容和证据，不以数量为指标

BMAD v6.11 合并 research / review / context 入口，并为退休 ID 保留 shim；v6.12 又将新装 shim 改为 opt-in。对 YSS，可按“是否共享输入、写入责任与验收结果”寻找重复能力，把替换关系和 migration 纳入锁文件/投影，而不直接按 Skill 数量裁减。来源：`evidence-bmad-release-611`、`evidence-bmad-release`。

反证：BMAD 当前在线文档已包含预览 ticketing，不能按主站导航认定已在普通稳定安装可用；兼容 shim 也不是永久承诺。

## 建议验证方式

上述是供主控取舍的维护建议，不是批准。优先用三个小样本比较现有 YSS 与拟改入口：低风险小改动、已有基线的行为变更、API + UI 跨仓交付。每个样本注入一次上游变更或证据缺失，记录错误放行、错误阻断、澄清次数、恢复步骤、人工确认时间和实际总耗时。样本应固定任务、输入、模型及版本；报告数量小的限制，不能由主观“更顺”推出普遍效率提升。

本轮未运行竞品、未收集客户采用数据、未核验付费版本可用性，也未修改生命周期规则。所有建议由主控结合本地审计复核后再决定。
