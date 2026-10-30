# T07：Spec 旧逻辑清理与改造范围设计

日期：2026-10-29。本文为已获批准的设计记录；当前实施及验证状态见下方更新。

状态更新：用户于 2026-10-29 确认汇总设计及关联方案，后续已完成本地实现；2026-10-30 用户授权提交和发行并确认模板 v5.0.0、CLI v3.0.0。实际实施和尚未完成的验证见 [实施报告](spec-profile-implementation-report.md)及[外部验证记录](spec-profile-external-validation-2026-10-30.md)。下文结尾的设计审查记录保留其形成时的历史状态，不表示当前仍待设计批准。
依据：[最终决议](spec-skill-optimization-notes.md)、[T01](spec-profile-current-state-diagnosis.md)、[T02](spec-profile-target-flow-design.md)、[T03](spec-profile-approval-state-design.md)、[T04](spec-profile-product-design-depth.md)、[T05](spec-profile-tracker-design.md)、[T06](spec-profile-initialization-design.md)。

本文把目标设计映射到当前已找到的事实源和消费者，为后续实施计划提供范围；不声称已穷尽所有运行时引用。实施时按依赖搜索补齐遗漏，不以未列出的文件自动视为可删除。

## 核心改造边界

采用新 Spec 工作流，不把旧四阶段内核的检查改成恒通过。新 Spec 路径必须在进入旧内核之前明确分流，否则模板减法会变成缺文件错误或错误放行。

共享 Backend、模板维护、独立脚手架及其他安装用途保持实际职责。移出 Spec 默认路径与分发不等于从整个仓库删除能力；共享资产只有在证明没有保留消费者后才删除。旧实例不自动迁移，也不为新 Spec 再建设旧新双轨工作流。

## 新流程识别与旧实例边界

建议在受管安装 metadata 的 distribution 中增加可核验、带版本的 Spec 工作流标识，例如 `specWorkflow: matt-spec-v1`。这是设计字段建议，最终命名由实现与 schema 对齐。该标识由支持新流程的固定 Bundle 与 CLI 在 init/attach 时生成，必须同时绑定来源和实际安装政策，不能仅靠手写一行切换资格。

- 新 Spec init/attach 默认 governed，同时具备新工作流标识、所需配置及来源；进入新路径。
- 已按新工作流初始化的项目按任务检查和恢复，复用身份与 tracker。
- 未带标识的旧 Spec 或未知工作流版本，只读说明人工迁移要求，不自动 sync/migrate/改字段启用。
- Backend 不新增 Spec 标识，不受新 Spec 默认路由影响。
- 普通工程无 YSS metadata 时，仅在已授权接管后生成新配置；只读材料分析不要求先接管。

识别要在安装、任务入口、恢复和 CLI 的受影响消费者一致实施，不能只在 life 提示词判断。新标识不代替已有身份、文件保护和事务完整性校验。

这里保留的是 metadata、来源、路径与事务真实性保护。旧身份验证器混入的产品资产前提必须按新 Spec 重新定义，不能整体继承后继续强制根 CONTEXT.md、完整治理目录、Plan 或 checkpoint。已有稳定术语材料按实际需要消费，不作为最小初始化的必填产品资产。

不要求旧实例在新执行器下继续运行旧产品工作流。共享旧政策如因 Backend 或历史材料读取仍有用途可保留，但不能成为新 Spec 的运行分支。是否提示使用旧执行器仅提供信息，不自动下载或切换。

## 文件与消费者改造清单

以下路径相对模板仓；CLI 路径单独标注。

| 范围 | 具体事实源/消费者 | 动作 | 保留边界 |
|---|---|---|---|
| 根入口 | AGENTS.md、CLAUDE.md、.template-spec/process/agent-entry-policy.md | 对新 Spec 声明非技术职责与轻量入口，移除旧阶段资格默认要求 | template-source 维护和共享用户工作保护保持有效；实例渲染需按身份区分 |
| Profile 职责 | .template-spec/process/harness-profile.yaml | 删除新 Spec 的 backend execution、技术工程/切片/实现/发布终点，声明非技术规格出口 | schema 与 CLI 读取同步调整，不只改 purpose |
| life 原生入口 | .agents/skills/yss-product-lifecycle/SKILL.md 与 references/standalone-routing.md、request-triage.md、orchestration.md、state-model.md、conditional-guidance.md | 新 Spec 在旧阶段内核之前分流，按 T02 连续推进 | 保留模板维护与实际共享场景；不为普通路径额外加注册资格 |
| 规格入口与方法 | .agents/skills/to-spec/SKILL.md、life references/standalone-spec.md、plan-requirements.md | 统一非技术规格方法，取消强制 Plan、测试 seam、领域阶段包、业务票集合及批准机器包前提 | to-spec 显式调用限制保留；必要业务决定仍真实澄清 |
| 审批与用户决定消费者 | life references/user-decisions.md 及其实际调用者、批准/状态读取入口 | 按 T03 核查动作授权、业务批准、有效延续和可读内容绑定，移除新 Spec 对阶段批准包、checkpoint 与固定门禁的依赖 | 保留真实原始决定及外部动作授权边界，不让轻量入口重新进入旧决定协议 |
| 模板 | .template-spec/templates/spec-template.md 及适用产品设计模板 | 保留业务规则/AC，删除技术模型、端点定义和全套原型前置 | 已确认技术约束可引用，不能因此要求生成 API |
| 产品设计 | yss-prototype-stage、prototype-review、yss-design-system 的 canonical 技能及参考 | 按 T04 风险选择深度，审查不要求端点映射或 Slice | 实际原型检查、用户文件和既有视觉规范保留 |
| 调用元数据 | 上述技能的 SKILL.md、agents/openai.yaml、.template-spec/agents/yss-skill-registry.yaml | 同步产品设计自动调用权限、触发条件、依赖和描述 | user-only to-spec 不隐式调用；独立复核由真实要求触发 |
| tracker | .template-spec/agents/issue-tracker.md、triage-labels.md、相关模板与路径消费者 | 按 T05 减少父票/checkpoint/实现目录要求，支持选定主平台 | 不将 GitHub 镜像扩成同步引擎，不默认复制远程可编辑正文 |
| 流程政策 | lifecycle-registry.yaml、orchestration/entry、domain、workflow 及 orchestration-contract.yaml 生成物 | 从新 Spec 路由撤出旧阶段、四门禁、业务正式化、技术准备、Slice、Handoff、实现和发布要求 | Backend 或维护仍消费的 ID/定义不能全局删除；按实际引用决定保留位置 |
| 共享规则拆分 | stage-gates.md、business-tickets.md、work-layout.md、stage-tracking.md 和相关 scripts/lib | 删除新 Spec 默认读取与校验依赖；必要时明确其保留消费者 | 不删除 Backend 所需校验器或将其改成空操作 |
| setup 与技能供应 | .agents/skills/setup-yss-harness 及参考、scripts/lib/skill-supply-chain.mjs、skill-discovery.mjs、skill-registry.mjs | 对新工作流接入最小配置与按需补装，保留身份和事务保护 | Backend 初始化、独立 skills 安装和发行完整性不全局放宽 |
| Spec 分发 | .template-source/distribution/bundle-profile.json、入口渲染、锁及技能清单 | 定义新 Spec 最小资源，不再按全部八阶段供给实现资产 | 不能只改 installations.skills 的八项列表冒充 governed 裁剪 |
| Backend 派生与共享投影 | .template-source/scripts/manage-profile-skills.mjs、scripts/lib/profile-tree.mjs、profiles/backend、profiles/_specialist、各运行时投影 | 通过现有生成器更新，并核对 Backend 最终有效树 | 不手改派生掩盖 canonical 变化；发现共享行为受影响应隔离 Spec 分支 |
| 用户文档与发现 | README、用户手册、阶段接入文档和技能描述 | 统一非技术主线、tracker 及自动引导说明 | 不再宣传 Spec 本端实现或必经 Backend Handoff |

### CLI 必要改造范围

| CLI 位置 | 需要处理 | 明确不做 |
|---|---|---|
| internal/identitymeta/native.go、internal/project/identity.go、installation.go、project inspection 及对应 schema | 新工作流标识验证、生成、识别与清晰的旧实例诊断；同步计划/恢复的必要输入绑定 | 不自动转换旧实例，不改变 Backend 身份语义 |
| internal/cli/project_commands.go、internal/project 的初始化与补装消费者 | 支持新 Spec 最小受管安装和当前任务补装；使 inspect/doctor/sync 不继续强制旧产品资产 | 不以删除现行保护校验获得表面通过 |
| internal/project/skills_query.go | 新 Spec 能查询实际可用技能及正确闭包，尊重调用元数据 | 不将受管 resolve 变成所有宿主发现前置 |
| internal/governance/profile_guidance.go、internal/governance/lifecycle 及 kernel 的实际受影响入口 | 新 Spec 入口不再要求旧 checkpoint、Spec 基线门禁或 Handoff；旧命令在新实例上给出不适用诊断或明确支持的新语义 | 不重写 Backend 的导入、Slice 准入和实现执行内核 |
| internal/project/profile_prepare.go、internal/cli/profile_commands.go | 取消新 Spec 固定 Backend 准备和旧交接输入默认要求；旧动作不能在新实例静默执行 | 不用新 Spec 自动创建下游工程 |
| internal/tracker、internal/cli/tracker_commands.go、worklayout 相关消费者 | 分清现有 GitHub 标签镜像与新 Spec 平台发布；新布局不误入旧阶段资格 | 不要求扩建三平台原生 CRUD；优先 T05 已有工具适配 |
| tools/refresh-source-lock.mjs、tools/artifacts.mjs、tools/fetch-bundle.mjs、docs/source-lock.json、internal/bundle | 根据已完成改造的确切模板源装配，更新规则/锁/生成物并核对 Spec 与 Backend | 本轮设计不提交、推送或正式发行，不用模板工作区修改冒充已发布 CLI 能力 |

CLI 是改造范围中的安装与 Spec 消费层，不是下游实现改造。若某入口不再服务新 Spec，应明确不适用，不能成功返回旧流程结果。

## 资源与技能闭包建议

核心候选：life 及其共享规格方法、to-spec、grilling、domain-modeling、i-have-adhd，加上 tracker 最小配置和必要入口。setup 可在项目外引导；research 与产品设计按真实需要安装和读取。

精确集合必须由当前真实依赖计算并检查：技能 entry 存在不代表引用资源齐全；闭包不应再次携带全套阶段、实现合同和业务票校验前置。技能注册表保留发现、调用与分发所需信息，移除新 Spec 的阶段资格作用。

governed 的新 Spec 资源选择必须在 Bundle 生产与消费者中显式一致，不能仅写空 governed 配置然后假定已裁剪。共享独立技能包是否仍发布 implement/code-review 与新 Spec 核心集合分别处理。

## 清理顺序与完整性检查

1. 固定本次模板及 CLI 输入，标明工作区改动和待实施设计；不隐式刷新来源。
2. 先落实新工作流识别和 Profile/入口职责，使新 Spec 不再进入旧产品内核。
3. 实施共享规格方法、审批表达、设计裁剪和 tracker 最小适配。
4. 对齐初始化、受管技能依赖和调用元数据，清除新路径的旧前置引用。
5. 更新分发与派生，核对 Backend 最终有效树；不能等到删除共享文件后才发现依赖。
6. 对已无保留消费者的旧 Spec 专用文件实施删除；保留文件清楚标注所有者，停止作为新 Spec 默认加载项。
7. 对齐 CLI 固定来源与生成物，在未发行构建上验证新流程；实际发布作为单独授权动作。

涉及模板或 CLI 共享行为时，实施计划要列出影响消费者和必要反例，不能为了缩减清单只改提示词。共享规则若无法安全拆分，应报告范围问题并调整组织，不静默扩大到 Backend 行为改造。

## 验证范围

| 检查类别 | 验证目的 |
|---|---|
| Spec 入口与职责 | 新 governed Spec 能进行非技术工作，不要求未来 Plan 包、技术合同或实施资格 |
| 新旧识别 | 新实例标识可信；旧实例与未知格式被清晰诊断，不自动转换或走新流程 |
| 技能与分发 | 核心及按需闭包完整，user-only 与模型调用声明一致，投影/锁由生成器维护 |
| 规格与产品设计 | 文字、流程、低保真和原型按实际风险选择，未验证事项不写通过 |
| tracker | 本地与平台适配的定位、重复执行、批准内容还原和部分失败恢复符合 T05 |
| 共享边界 | Backend 的有效资源和必要身份/事务保护不被 Spec 清理破坏 |
| CLI 装配 | 固定 Bundle 与目标模板一致，未装配版本不会声称支持新工作流 |

优先复用 tests/spec-initial-entry.test.mjs、spec-standalone-fixture.test.mjs、spec-role-free-guidance.test.mjs、plan-spec-template-contract.test.mjs、profile-tree.test.mjs、profile-distribution.test.mjs、profile-consistency.test.mjs 及 CLI 的安装、身份、技能查询和指导测试。先核对断言语义，旧阶段行为的测试不能原样成为新流程验收。

新增行为改动按仓库要求测试；新验证应能发现具体风险，不只搜索新字段或重复实现。CLI 按本仓约定执行适用测试和构建；模板按实际受影响生成与分发检查。远程能力可用性单独实际核验，无凭据时明确未覆盖，不声称通过。

当前仅文档设计，不运行上述行为测试，不修改锁/投影，不初始化实例。

## 实施前必须关闭的工程选择

这些不是重新询问业务方向：确定 metadata 标识与 schema 校验方式、逐入口分流位置、真实技能/资源闭包、tracker 工具能力及清理后保留消费者。实施计划必须把它们落到具体任务，不允许以“后续再说”结束改造。

T02–T06 已提供业务和职责约束；本清单提供改造位置。T08 先汇总审阅后的设计，再制定实施计划；设计草案不等于用户批准，也不自动授权提交或发行。

设计审查时的历史记录：已完成独立上下文的只读设计检查，补齐身份真实性保护与旧产品资产前提的拆分，并明确用户决定协议及审批消费者的清理范围。当前为 T07 设计草案完成、待用户审阅，不表示实施完成或用户批准。
