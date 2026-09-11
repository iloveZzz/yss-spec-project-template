# A/B 工作包：具体变更与行为反例

本轮只准备实施输入和运行临时合成探针，没有修改业务运行逻辑、Skill 或正式合同。设计依据见 [design-decisions.md](design-decisions.md)；执行记录见 [ab-baseline-results.json](ab-baseline-results.json)。下列路径均相对当前父仓；D 表示 submodules/yss-harness-design-agent。拟新增符号及字段是实施设计，不是已存在能力。

## 本轮已复现的差异

执行 `node .template-source/evidence/maintenance/2026-09-11-strategic-design-preparation/probe-ab-baseline.mjs`，退出码 0 表示 13 个观测已采集，不表示目标行为全部通过。探针复用项目合成 fixture，在系统临时目录生成、执行并删除数据，原始批准文件不会进入任何实例。

- A-02：初始 routing checkpoint 指向 work-unit.slice-implementation，当前 CLI 退出 0。
- A-03：同一 checkpoint 登记 artifact.parent-ticket，当前 CLI 退出 0。
- B-01/B-03：Spec 数字人会签缺 subject、scope 和 user decision，CLI 默认校验及库 requireApproved:true 均接受。
- B-02：CLI --require-approved 退出 1，但原因是未知选项；不能算作缺用户回复的语义拦截。
- B-04—B-10：底层用户决定库已支持有效回复、缺回复、数字人代答、源资产变化、撤销、范围错误及无关文件变化的相应通过/拒绝行为。

这些结论限于所调用 seam；初始 checkpoint 探针不证明完整生命周期会执行禁止动作，库探针也不证明离线交接已具备相同覆盖。

## A：文件与落点

| 文件/范围 | 具体改动 | 验收映射 |
|---|---|---|
| D/docs/agents/issue-tracker.md | 战略模式只登记业务 Ticket；map.md 引用 checkpoint 和业务资产，删除本地创建技术父 Ticket/切片的要求；历史项标明只读边界 | A-03、A-06、A-08 |
| D/.agents/skills/yss-strategic-design/references/state-model.md | 统一唯一状态源；新示例使用 ticket_sync.status/refs；历史 parent_ticket 不触发创建文件；导航摘要落后时重建导航 | A-01、A-04—A-07 |
| D/.agents/skills/yss-strategic-design/SKILL.md 及 references/orchestration.md、orchestration-contract.yaml | 入口、恢复、下一工作单元均消费 profile 的有界主链；主控归属统一为战略主控；保持 terminal next_route=null | A-02、A-08、A-09 |
| D/.agents/skills/yss-stage-decision/SKILL.md | 本地状态归属改为战略主控；父仓保持已登记的本体薄适配，不全局替换所有 yss-product-lifecycle 文本 | A-09、A-10 |
| D/docs/process/harness-process-tailoring.md、AGENTS.md、checkpoint 模板 | 对齐战略任务和状态语义；维护审查政策差异另由问题 6 核实，不夹带改变 | A-03、A-08 |
| D/scripts/lib/harness-profile.mjs | 拟增加 assertStrategicCheckpointScope(value, options) 或等价导出，复用现有 profile/registry；检查允许的工作单元、禁止产物、业务 Ticket 状态和历史引用歧义 | A-02—A-08 |
| D/scripts/verify-lifecycle-checkpoint | schema 校验后、进入状态推进前调用 profile 语义检查；template-source 不套用实例禁止规则 | A-01—A-08、A-11 |
| D/docs/process/templates/lifecycle-checkpoint-template.yaml | 沿用 schema v1、ticket_sync.status/refs；初始 refs=[] 合法，已有任务恢复须有可核验输入 | A-01、A-04 |

历史引用算法：仅有 parent_ticket 时作为旧索引输入读取，不自动写父 Ticket；refs 同时包含旧索引和业务资产并不天然冲突。先解析文件声明的资产身份及 checkpoint 指向，两个索引指向不同权威 checkpoint 或无法明确对应时才阻断。不得凭文件名或 refs 的顺序猜哪个是主索引，也不得把任意普通业务 Ticket 当作冲突索引。

map.md 的展示状态没有反向权威；纯派生展示过时可重建。源引用缺失、越界、循环或不一致时报告原因并停止恢复。校验器保持只读，重建由主控有界动作完成。

## B：文件与落点

| 文件/范围 | 具体改动 | 验收映射 |
|---|---|---|
| D/docs/agents/digital-human-roles.yaml | 保留 plan-conclusion；登记 Spec、原型专业确认及交接复用策略；沿用战略 gate ID，不导入本体聚合门禁命名 | B-01—B-03、B-12、B-16 |
| D/scripts/lib/approval-record.mjs | requireApproved 路径调用用户决定校验；保持纯历史读取；传递 root/read/rolesDoc；会签资产范围与当前 checkpoint 对应资产核对 | B-03—B-09、B-11、B-14 |
| D/scripts/verify-approval-record | 支持 --require-approved 及 --history，默认校验当前批准；互斥选项报错；历史结构通过不能输出放行结论 | B-01、B-02、B-11 |
| D/scripts/lib/user-decision.mjs | 复用身份、回复、摘要、范围、撤销校验；补专业边界的确定性复用入口，不通过改写旧 boundary 或制造新回复实现复用 | B-04—B-10、B-13、B-16 |
| D/scripts/verify-lifecycle-checkpoint | 接入统一当前决定核验；等待允许保存，推进/恢复/完成须验证相应边界；不得因 stage_trace 缺少 completed_work_unit 就跳过当前适用检查 | B-12、B-14 |
| D/docs/process/schemas/lifecycle-checkpoint.schema.json | 保持 v1；gate 项增加可选 subject_ref、approval_scope 以表达当前关联，历史结构仍可读取；当前批准是否要求字段由语义校验执行 | B-11、B-14 |
| D/.agents/skills/yss-strategic-design 与 yss-prototype-stage 的实际批准调用点 | 区分可起草、等待决定及允许流转；传播当前资产和确认引用；避免全面复制造成主控与 profile 漂移 | B-12、B-16 |
| 父仓 scripts/lib/strategic-handoff.mjs、strategic-handoff-io.mjs 及同步目标 | sourceApproval/源策略归一化/导出/离线 verify 使用相同复用解析；完整携带决定和原始来源依赖；旧策略保持旧严格度 | B-15—B-18 |
| D/docs/process/instance-distribution-manifest.yaml 及实际脚本分发清单 | 新辅助模块、场景入口、协议引用全部纳入对应分发；CLI 快照重建保留到已授权的交付步骤 | B-15、B-18 |

不能整文件复制父仓 approval-record.mjs：父仓还包含聚合门禁与已退役 ID 规则，战略 profile 仍使用自身生命周期词汇。仅抽取已验证的决定校验 seam，并按真实调用点适配。

### 决定与交接复用的具体形状

普通批准继续使用 record.subject_ref、record.approval_scope、record.user_decision_ref；checkpoint gates 的当前引用须与对应 record 相符。等待和旧记录读取不由新必填规则强制改写。

交接复用拟以现有 human_review 开放对象承载 decision_reuse 条目，每项记录目标 gate、当前交接范围清单引用、源 requirement 列表和资产覆盖证明；实际离线导出所用会签记录必须携带或引用等价信息，不能只在 checkpoint 留一份使包内不可验证。具体可选字段在实现时一并加入源策略和校验器，不改变既有 user-decision 原始记录的语义。

每个源 requirement 保留原 boundary、subject_ref、scope、user_decision_ref。覆盖证明逐项绑定资产 ref/version/digest、批准范围、已经接受的风险及授权条件；这些信息必须从当前交接资产和原决定中核对，而非接受执行者自填 reuse=true。跨多个决定覆盖时逐项合并，不把一个 Plan 回复当作 Spec/原型回复；无法证实覆盖的部分走补充确认。

避免循环摘要：先冻结独立的交付范围清单与业务资产，再绑定用户决定和会签，最后组装 Handoff。用户决定的 subject 不包含它自身或引用它的会签记录摘要。完整包本身的传输摘要不构成新的业务确认范围。

缺少用户决定的历史包仍按源策略验证；当前新策略声明后缺证据必须拒绝。schema_version 不变不代表旧工具理解新策略；新增复用策略需要显式能力识别，不支持的读取器拒绝，不能忽略未知策略后放行。A/B 不实施 C 包的领域 v3 输出。

## 行为反例矩阵

标记“已运行”见 JSON；其余为待实施验收，不能算 GREEN。

| ID | 输入/触发 | 目标行为 | 当前证据 |
|---|---|---|---|
| A-01 | 初始 routing，refs=[] | 接受，不要求父 Ticket | 已运行：接受 |
| A-02 | 战略 checkpoint 下一步为 slice-implementation | 拒绝并指出 profile 越界 | 已运行：错误接受 |
| A-03 | 战略 checkpoint 登记 parent-ticket 产物 | 拒绝本地禁止产物 | 已运行：错误接受 |
| A-04 | 旧 parent_ticket 只有一个明确可读索引 | 只读恢复，不新建父 Ticket | 待端到端 |
| A-05 | 新旧索引指向不同 checkpoint | 阻断恢复，指出两个引用 | 待端到端 |
| A-06 | map.md 展示落后，checkpoint 本身有效 | 只更新派生导航，不改批准状态 | 待主控场景 |
| A-07 | refs 有索引及多个普通业务 Ticket | 正确关联，不误报多索引冲突 | 待端到端 |
| A-08 | 业务 Ticket ready-for-agent 或本地请求 implement | 拒绝/回交下游；其他业务待确认状态保持合法 | 待端到端 |
| A-09 | 交接完成或调用战略 stage-decision | 终点为 null，归属战略主控 | 待主控场景 |
| A-10 | 本体运行原有父 Ticket/全生命周期路径 | 保持本体合法行为 | 待回归 |
| A-11 | template-source 维护 checkpoint 引用工程测试 fixture | 不因实例 profile 规则误阻断 | 待回归 |
| B-01 | CLI 默认读取无决定的 Spec 批准 | 拒绝当前批准 | 已运行：错误接受 |
| B-02 | 同文件显式 --require-approved | 以缺用户决定拒绝，非未知参数 | 已运行：未知参数退出 1 |
| B-03 | 库 requireApproved:true 无决定 | 拒绝 | 已运行：错误接受 |
| B-04 | 真实回复形状完整且当前的合成 fixture | 接受 | 已运行：接受 |
| B-05 | 删除全部回复 | 拒绝 | 已运行：拒绝 |
| B-06 | 回复 actor 为数字人 | 拒绝 | 已运行：拒绝 |
| B-07 | 改变 subject 字节 | 拒绝过期依据 | 已运行：拒绝 |
| B-08 | 当前来源含后续撤回 | 拒绝复用旧同意 | 已运行：拒绝 |
| B-09 | 请求范围不在已批准范围 | 拒绝 | 已运行：拒绝 |
| B-10 | 只改无关文件 | 原决定仍可复用 | 已运行：接受 |
| B-11 | --history 读取旧记录；与 --require-approved 同传 | 历史可读、不放行；互斥拒绝 | 待 CLI |
| B-12 | 等待保存 → resume/running；缺当前决定 | 可保存等待，禁止越界流转；独立调研可继续 | 待端到端 |
| B-13 | 错负责人/错误委托、原文拒绝被归一化为同意 | 拒绝，定位身份或回复冲突 | 待目标侧回归 |
| B-14 | checkpoint 指向甲资产，approval_ref 实为乙资产 | 拒绝错绑；不得从缺字段推导放行 | 待端到端 |
| B-15 | export 后删除源目录，仅用离线 bundle verify | 有效包通过；缺决定或来源文件拒绝 | 待离线场景 |
| B-16 | 原批准覆盖全部交付 → 新增未批准风险或扩大范围 | 前者复用，后者补充确认；不重写旧回复 | 待复用场景 |
| B-17 | 相同资产仅重装包；另一包增加新专业边界 | 前者不重复询问；后者不能仅因资产相同复用 | 待复用场景 |
| B-18 | 源包声明新复用策略，接收器不支持 | 明确要求升级；不降级通过 | 待跨仓场景 |

## 实施顺序和验收入口

1. 将探针中已复现失败迁入目标仓正式场景套件，目标断言必须判失败；采集脚本本身不充当测试门禁。
2. 先做 A 的 profile 语义和文档一致性；确认本体差异仍合法。
3. 再做 B 的 CLI/会签/恢复链，复用底层决定检查；保存等待状态的正例必须同时通过。
4. 闭合 B 的交接复用、依赖打包和离线验包，然后同步实际命中的读取器。
5. 同步 canonical Skill 的来源清单、薄适配、runtime 投影和锁；按影响运行 fast。PR/main/发布的候选及全量验证按现有政策执行，不用本轮探针替代。

正式场景优先放到已有 verify-harness-profile-scenarios、verify-lifecycle-transition-scenarios、verify-plan-spec-entry-scenarios、verify-strategic-design-handoff-scenarios、verify-strategic-handoff-package-scenarios；战略仓当前缺少独立 verify-user-decision-scenarios 时新增有边界的目标侧入口，不复制本体实现范围/脚手架场景。同名脚本具体参数以实施时读取结果为准。

## 尚未验证与完成边界

已完成：13 项可重复基线观测、A/B 文件清单、引用解析边界、复用落点及 29 项验收规格。尚未完成：所有标记待运行的场景、真实用户实例验证、源策略兼容实现、正式测试和完整模板验证。没有创建批准记录、产品 Spec 或垂直切片 Ticket。

下一项实施可以先落 A-02/A-03 与 B-01/B-03 的正式反例和对应最小修复；不需要再次询问已确认的兼容选择。若真实调用链要求改变已确认权限/版本边界，再按证据重新路由。
