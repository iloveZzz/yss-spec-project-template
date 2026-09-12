# Spec Kit、OpenSpec、BMAD 对比研究

日期：2026-09-11。strategy-evidence / evidence-audited。范围：公开 GitHub、官方文档与公开讨论；模板维护研究，不是产品 Plan 或批准记录。应用 yss-research、competitive-intelligence 与 i-have-adhd 的研究写法。所有来源、定位、限制和 claim 映射见同目录 spec-frameworks.json。

这三项竞品已把规格、已有工程、自定义与治理发展成可组合的工作流。YSS 的机会不能建立在“别人只有提示词”“别人没有人工门禁”或“别人不支持跨仓”的假设上。更值得验证的是：在共享规划进入多个实现仓之后，谁负责哪一段、每段消费哪个版本、证据不足如何停止，能否以较少人工成本闭合。

## 竞争位置与可比边界

| 维度 | Spec Kit | OpenSpec | BMAD |
|---|---|---|---|
| 当前公开定位 | 可扩展的 Agent 研发过程工具 | 以 change/delta 为单位的规格演进 | 按工作规模裁剪的敏捷研发方法 |
| 版本快照 | v1.0.6，2026-09-10 [SK05] | v1.13.0，2026-09-09 [OS07] | v6.12.0，2026-09-04 [BM08] |
| 分发/许可 | uv/PyPI，MIT [SK01] | npm，MIT [OS01] | Skills CLI、Claude/Codex plugin、uv；MIT，另有商标声明 [BM01] |
| 生命周期 | constitution 到 implement/converge；另有 assess、bug 流程 [SK01] | explore/propose/apply/archive [OS01] | 意图缺口分别调用规划工具，Spec 交给 Build [BM03] |
| 已有工程 | 社区扩展、walkthroughs；核心并非仅 greenfield [SK03,SK06] | 当前规格 + Delta，存量修改是一级概念 [OS02] | 先读代码；已有有效规则可直接复用 [BM02] |
| 治理 | 状态化 workflow、human gate、暂停恢复；不是 shell 沙箱 [SK02] | 确定性 CLI 校验/事务归档与 Agent 指导并存 [OS05,OS06] | 五类组织签批、单一 owner、独立 review layers [BM04,BM06] |
| 定制 | extensions、presets、workflow、bundle [SK04,SK07] | Schema DAG、项目 config、Stores [OS02,OS03,OS09] | 团队/个人 TOML、按 skill 覆盖、review layers [BM05] |
| 跨仓 | 通用编排可扩展；本轮未审计全部跨仓扩展 | Stores beta 共享规划与只读 references；不按仓路由任务 [OS03] | 多 epic 共用 spine、变更向下重跑；本轮未证明跨仓编排等价 [BM04] |
| 公开关注 | 约 135.4k stars / 12.2k forks | 约 68.0k / 4.7k | 约 52.9k / 6.0k |

关注数字只是 2026-09-11 页面快照，不是用户、企业采用或市场份额。主分支内容与正式包可能不同，本轮没有安装运行。表中能力是已读官方合同，不是本研究通过了这些能力的测试。

## 哪些优势必须承认

Spec Kit 的 workflow 已有可读取的运行状态、恢复和人工 checkpoint；扩展元数据也有版本、来源、许可与依赖字段。社区 catalog 覆盖 API 演进、brownfield、治理。目录维护者明确只审条目格式，不审计扩展代码，因此“已进目录”不能当安全认证。[工作流](https://github.github.io/spec-kit/reference/workflows.html)、[扩展合同](https://github.com/github/spec-kit/blob/main/extensions/EXTENSION-API-REFERENCE.md)、[社区目录](https://github.com/github/spec-kit/blob/main/docs/community/extensions.md)

OpenSpec 已经支持规划仓与代码仓分离。它建议把共享行为放 Stores，各实现仓持有本地 changes 并只读引用上游。但文档也明确：Store 不自动发现消费者，不把一份 tasks 按代码仓分派；不负责 Git 同步，磁盘版本旧，读到的规格就旧。维护者的 #1436 进一步记录了重复解释仓职责的用户信号。这支持具体的跨仓交付实验，而不支持“OpenSpec 没有跨仓”。[Stores 用户指南](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md)、[跨仓任务归属讨论](https://github.com/Fission-AI/OpenSpec/issues/1436)

BMAD 不应只按旧“四阶段重流程”理解。当前组织文档把签批附着在明确产物和阻断对象上；已有工程的小改动允许直接 Build。Context 维护采用 managed block、保留手写规则，review 逐条核实 finding 并说明剔除理由。它也是 YSS 在上下文卫生、风险裁剪和审查可解释性上的直接比较对象。[组织规划](https://docs.bmad-method.org/plan/plan-inside-an-organization/)、[已有工程](https://docs.bmad-method.org/existing-codebases/start-in-an-existing-codebase/)、[上下文维护](https://docs.bmad-method.org/existing-codebases/set-and-maintain-project-context/)、[审查](https://docs.bmad-method.org/build/review-a-change/)

## 机会候选与反证

| 候选 | 可验证价值 | 反证与验证边界 |
|---|---|---|
| 跨仓联合交付证据 [SC03/SO01] | API 与前端分别消费确定版本，漏仓、旧合同和单仓测试失败有明确阻断 | OpenSpec 已有 references，BMAD 有组织签批；比较应聚焦任务归属、新鲜度、联合证据，不能泛比“治理有无” |
| 最小可信入口 [SC04/SO02] | 小改动不重建历史全量规划，必要检查仍有效 | BMAD 已裁剪；Spec Kit 讨论既有成本抱怨，也有人认同 clarify/analyze；必须测当前 YSS，而非默认再加一条轻流程 |
| 可追溯组织技能发行 [SC05/SO03] | 上游内容、YSS 适配、有效投影和升级验证可重建 | Spec Kit 已有 bundle/元数据，BMAD 已分离覆盖文件；单纯版本锁定或定制不是差异 |
| 归档与漂移公开实验 [SC06/SO04] | 以可重放 fixture 证明无损、故障恢复和证据新鲜度 | OpenSpec 归档已有事务/验证，近期缺陷已修复，不能当现存漏洞；本轮没有竞品跑分 |

建议优先拿一个真实跨仓 API 改动与一个低风险 bug 做对照：固定输入、Agent/模型和代码基线，统计首个可实现单元耗时、必须读取的上下文、人工中断、错误放行和失败恢复。它们是拟议评价维度，没有批准阈值，也没有已取得的效率收益。需求成立与否应由实际维护者/项目团队试用判断。

## 直接用户信号不能扩大解释

Spec Kit #2046 中，一位参与者认为审阅生成文档增加时间，维护者指出可用 brownfield 与扩展，另一位参与者强调 clarify/analyze 的价值。它说明价值取决于任务和环节，不能证明整个市场拒绝规格驱动。[讨论](https://github.com/github/spec-kit/discussions/2046)

OpenSpec #872 提到长期归档/规格文件膨胀以及 summary 干扰 explore。直读页面为 Closed as not planned，搜索缓存却显示 Open；采用直读状态。BMAD #2415 曾提出模板工程启动与规划衔接需求，但现在已关闭，不能把提出者的“缺失”断言当当前产品现状。[OpenSpec #872](https://github.com/Fission-AI/OpenSpec/issues/872)、[BMAD #2415](https://github.com/bmad-code-org/BMAD-METHOD/issues/2415)

## 版本、来源与访问限制

正式 Release 快照：[Spec Kit v1.0.6](https://github.com/github/spec-kit/releases/tag/v1.0.6)、[OpenSpec v1.13.0](https://github.com/Fission-AI/OpenSpec/releases/tag/v1.13.0)、[BMAD v6.12.0](https://github.com/bmad-code-org/BMAD-METHOD/releases/tag/v6.12.0)。近期 Release 同时显示持续改进与兼容变化；不能用发布频率代替稳定性实测。

BMAD 旧 workflow-map 路径与 Spec Kit 一个 workflow 文件直读报 Internal Error；后续使用当前 README 指向的官方文档。搜索中的旧 BMAD npm installer 指南不作为当前推荐安装方式。Google 直接平台访问由主控负责，本子任务只声称执行了公开 Web 搜索、GitHub 页面和官方站点检索。没有私域、付费数据、用户访谈、安装量、收入或留存数据。

## 工作单元结果

- task_id：research-spec-frameworks；role.product-manager；runtime.skill-projection；Explorer。
- 合同：template-maintenance / research-spec-frameworks v1；只写任务包允许的两个研究文件。
- context_reconciliation：not-applicable，有原因：template-source，仅消费 CONTEXT，无产品词汇修改。
- 研究材料已交主控审计；没有批准路线、Ticket、Slice 合同或 Git checkpoint。
- 产品测试未执行；JSON 可解析性由本轮命令核验。
- 下一步：主控核实 decision-bearing claims，综合本地能力与其他项目，并运行总研究包 validator。
