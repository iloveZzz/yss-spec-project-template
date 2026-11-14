# Spec 技能定向优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正状态/Delta 模板，增强规则组合与业务效果表达，并以实际观察说明方法表现和限制。

**Architecture:** 直接修改既有权威模板与叶子参考，各任务同步自己的实际副本。技能入口、引用路径和默认集合保持，最后在共同适配记录中登记上游比较与本轮观察；不增加新的执行系统。

**Tech Stack:** Markdown、现有 JSON 锁与分发配置、Git、Node/Python 临时只读检查、宿主已有的独立上下文能力；不新增依赖或维护脚本。

**Spec:** [Spec 技能定向优化设计](2026-11-13-spec-skills-optimization-design.md)。执行者先读设计和当前相关源文件；设计是方案建议，不是已执行结果。

日期：2026-11-13。状态：计划已完成，全部实施任务待执行。仓库忽略 `docs/superpowers/`，沿用 `.template-source/design/` 保存设计与计划，不修改忽略规则。

## Global Constraints

- 仅修改本仓模板、技能源、实际副本、必要的既有哈希与来源记录；不修改 CLI 源码或用户业务项目。
- 保留业务规格、高保真交互原型、交互说明三类交付；业务票仅按明确拆票请求组织，技术设计与实现切片由研发承担。
- 保持技能名称、发现描述、调用政策、默认集合和分发路径；Spec 16、Backend 41、Frontend 13 项默认集合不变。
- 不新增技能、依赖、脚本、测试套件、强制 Gherkin/TDD、阶段审批、固定报告或产品成果。
- 普通查询仅回答问题，局部修订只处理受影响范围；未知不等于不适用，模拟和历史检查不证明本次实际效果。
- 保留并行主题改动、Backend 专有覆盖、许可证及原始来源字段；同步仅限本次实际改变的文件。
- 本次方案与实施范围均不自动包含提交、推送、远程写入、用户实例同步或发行。

## Review Focus

1. 请求失败但业务仍为草稿：业务和界面状态分别表达，不把 error 当成业务阶段；Task 1 案例 E1，Task 4 观察 O1。
2. 局部修改没有可读旧基线：保留无法比较与未验证，不补造旧行为或冻结资格；Task 2 案例 E2，Task 4 观察 O2。
3. 转交与撤回规则组合：可推导的结果直接给出，冲突的优先级不擅自选择；Task 3 案例 E3，Task 4 观察 O3。
4. 只有功能成功、没有业务效果数据：不填虚构改善值，不强制 KPI 或新报告；Task 3 案例 E4，Task 4 观察 O4。
5. 纯研究/局部文案及混杂工作树：不扩大写入或同步范围，保留主题与专有内容；各任务逐文件核对，Task 4 观察 O5。

---

## 文件结构与执行方式

路径相对仓库根。所有实施文件及副本以设计第 5 节为完整清单：13 份内容文件加 1 份 Backend 锁文件；本计划和设计另计。没有生产代码、固定测试文件或新运行接口。

Task 1、2 可独立完成；Task 3 同时维护同一业务方法中的两个增强点；Task 4 消费前三项的最终结果。建议当前会话顺序实施，采用 `superpowers:executing-plans`，因为改动以少量共享文档为主，观察需要统一比较基线。独立取证可以委派，计划自审由主执行者完成。

本次规划不以提交作为每项任务完成条件。实施前记录实际工作树和相关文件内容，给后续语义观察保留当前方法的临时只读快照；快照留在系统临时目录，不进入仓库。已有 28 个主题相关改动仅是本轮观察到的基线，后续新增并行修改同样保护。

## Task 1：消除状态矩阵的两类状态歧义

**Files:**

- Modify: `.template-spec/design/templates/state-matrix-template.md` 的开头、页面状态标题、转换表。
- Sync: `profiles/backend/.template-spec/design/templates/state-matrix-template.md`。
- Check only: 根及 Frontend `bundle-profile.json` 的现有状态矩阵引用；Backend 配置不增加分发项。

**Interfaces:**

- Consumes: 设计 D1；现有 Spec 模板关于业务/UI 状态分开的规则。
- Produces: 原路径不变的矩阵；转换表“状态类别”值为“业务 / 界面”，新增“规则 / AC”列，保留其余六列语义；页面状态仍有现有场景入口列。

- [ ] **Step 1：按设计 D1 修订源模板。** 页面状态标题改为“页面展示与请求状态”；按需覆盖，不要求为所有未命中枚举填原因；未知关键转换仍列待确认。
- [ ] **Step 2：核对 E1 文本案例。** 输入“草稿提交失败，保留输入，允许重试”，应能分别表达业务仍为草稿、界面提交失败及重试路径；输入纯展示页面时不强制业务转换表。缺权限前提时保持未决，不由示例补造。
- [ ] **Step 3：只同步 Backend 现存矩阵副本。** 使用逐文件复制；不创建 Frontend 文件、不修改 Backend 技能或清单。
- [ ] **Step 4：核对副本与差异。** 运行 `cmp .template-spec/design/templates/state-matrix-template.md profiles/backend/.template-spec/design/templates/state-matrix-template.md`，预期无输出、退出 0；运行 `git diff --check -- .template-spec/design/templates/state-matrix-template.md profiles/backend/.template-spec/design/templates/state-matrix-template.md`，预期退出 0。E1 仅是文本核对，运行观察由 Task 4 完成。

## Task 2：清理历史 Delta 模板中的旧流程

**Files:**

- Modify: `.template-spec/templates/spec-delta-template.md`。
- Check only: 现行技能导航及三份 bundle-profile.json；保持 Delta 无新增调用/安装路径。

**Interfaces:**

- Consumes: 设计 D2；现有 Spec 局部修订和来源复读方法。
- Produces: 同路径可选差异模板，包含来源、ADDED/MODIFIED/REMOVED、受影响规则/AC/页面、复查及未决影响；不产出技术契约或实施资格。

- [ ] **Step 1：替换适用范围与差异结构。** 使用设计 D2 的六类信息，保留旧引用和缺失基线处理；允许并入原 Spec，不要求单独文件、版本号或稳定 ID。
- [ ] **Step 2：移除旧流程要求。** 删除 `inspect-plan-spec diff`、Freeze/Design Review 阶段资格、技术切片约束及强制测试层级表；保留业务权限、异常与已知外部约束的影响说明。
- [ ] **Step 3：核对 E2 文本案例。** 有旧新材料时准确表达“主管可撤回→仅提交人可撤回”及受影响 AC/页面；旧材料不可读时标明旧行为无法核实，不编造 Before。仅改排版时不要求审批、技术设计或全量原型重做；行为改变后的旧检查不能直接沿用。
- [ ] **Step 4：核对模板无旧命令和资格句。** 运行 `rg -n 'inspect-plan-spec|是否允许进入|OpenAPI Freeze|垂直切片' .template-spec/templates/spec-delta-template.md`，预期无匹配、退出 1；再运行该文件的 `git diff --check`，预期退出 0。人工复读确认只是旧流程被移除，业务边界与来源保护仍在；无匹配不等于语义验证通过。

## Task 3：补强规则组合判断、业务效果与对应复核

**Files:**

- Modify: `.agents/skills/yss-stage-decision/references/business-analysis.md`。
- Modify: `.template-spec/templates/spec-template.md` 的“问题与目标”短提示。
- Modify: `.agents/skills/prototype-review/references/review-method.md`。
- Sync: `.workbuddy/skills/yss-stage-decision/references/business-analysis.md`。
- Sync: `profiles/backend/.workbuddy/skills/yss-stage-decision/references/business-analysis.md`。
- Sync: `.workbuddy/skills/prototype-review/references/review-method.md`。
- Sync: `profiles/frontend/.workbuddy/skills/prototype-review/references/review-method.md`。
- Modify: `profiles/backend/skills-lock.json`，仅 `skills.shared.yss-stage-decision.effectiveHash`。

**Interfaces:**

- Consumes: 设计 D3；当前方法中的反例、未知、规则来源与实际验证要求。
- Produces: 业务分析可说明组合结果/冲突以及效果假设；复核可区分来源冲突和产物的遗漏/额外/错误行为；Spec 原章节可记录效果依据。没有新的 ID、必填表、技能入口或跨技能依赖。

- [ ] **Step 1：增强业务分析的相关段落。** 按 D3 加入条件重叠、未覆盖结果、动作顺序/优先关系，以及功能验收与业务效果的区分。限制为当前相关规则和真实方案取舍，不要求全组合或固定指标。
- [ ] **Step 2：补充 Spec 目标章节的短提示。** 提醒预期改善、证据和重新考虑条件，未知数值不补齐；复用既有章节，不复制整段方法。
- [ ] **Step 3：补充共同复核方法。** 对相关规则组合核对遗漏、额外行为和错误结果，来源冲突单列；发现定位到实际规则和产物，继续区分模拟、真实操作及业务决定。
- [ ] **Step 4：核对 E3/E4 正例和反例。** E3 使用设计 D3 的三条教学规则：转交后 A 不能撤回、B 在前提成立时可撤回、已撤回不可转交；增加“原负责人仍可撤回”的冲突材料时应指出冲突，不自动改变规则。E4 输入“希望减少等待，暂无基线，只验证了分配功能可用”，应保留效果未知、说明所需观察，不能编造降低百分比或强制实验报告。简单按钮改名无需完整组合检查或效果测量。
- [ ] **Step 5：同步四个既有副本并更新一个哈希。** 逐文件复制源参考；按 `.template-source/agents/skills-maintenance.md` 的有效树规则，以 Node `localeCompare` 排序，输入路径/NUL/内容/NUL，处理既定换行和忽略项，重算 Backend 该技能 effectiveHash。使用临时内联命令，不加入仓库脚本；不补其他锁字段，不改变来源版本。
- [ ] **Step 6：检查实际同步边界。** 四对源/副本分别运行 `cmp`，均应退出 0；核对两条 Claude 技能目录软链接仍指向共享源。解析 Backend 锁并比较实施前对象，预期只有指定 effectiveHash 改变；运行 `git diff --check` 检查本任务八个文件，预期退出 0。保留完整读取结果，不能仅凭哈希命令退出正常声明更新正确。

## Task 4：观察方法表现并更新来源记录

**Files:**

- Modify: `.template-spec/agents/matt-skills-adaptation.md` 的当前比较说明和本轮记录。
- Sync: `profiles/backend/.template-spec/agents/matt-skills-adaptation.md`。
- Sync: `profiles/frontend/.template-spec/agents/matt-skills-adaptation.md`。
- Temporary only: 旧/新方法副本、教学输入、运行轨迹和输出；使用系统临时目录，不增加仓库文件。
- Check only: 三份 bundle-profile.json、三个 skills-lock.json 的未授权字段、公开技能清单、当前主题文件及 Backend 覆盖。

**Interfaces:**

- Consumes: Tasks 1–3 的最终文件、修改前快照，设计 D4 与已有 `i-have-adhd/references/pr-and-retro.md` 的证据分层。
- Produces: 真实范围内的观察与限制、已同步的共同来源记录；不产出整体成功率、安装成功或生产效果承诺。

- [ ] **Step 1：准备可追溯的临时观察环境。** 从实际当前文件复制所需 Spec 方法及它们引用的叶子资源到独立临时目录；记录方法版本/读取时点、可取得的宿主和模型信息。先检查所用宿主/CLI 实际帮助，使用它支持的临时项目和独立上下文能力；不改全局设置或创建用户可见聊天。源码复制只证明资源可读，不称真实 CLI 安装。
- [ ] **Step 2：运行 O1/O2。** 用下表的自然语言请求观察状态表达和局部变化。对 O2 只允许写临时资料；记录输出差异及规则/AC/说明是否一致。若比较旧新方法，分别使用独立上下文和同一输入，不把旧输出交给新运行。
- [ ] **Step 3：运行 O3/O4。** 检查组合推导、冲突报告和效果未知；为 O3 冲突变体另开独立上下文。若旧方法也正确，记录两者均正确，不能宣称新文修复了旧故障。
- [ ] **Step 4：运行 O5 并核对观察层级。** 检查纯研究与局部改名的范围边界。只根据可见读取说明是否使用本地方法；宿主不支持项目技能发现时可做显式方法演练并标明，不能将其冒充自然调用结果。执行失败和未执行分别记录，继续可完成的独立工作。

| 观察 | 教学输入与请求 | 具体期望 |
|---|---|---|
| O1 | “草稿提交失败，输入保留，允许重试。整理这段状态及恢复说明。” | 业务草稿和界面失败分开，不生成生产事务方案；纯展示变体不强制业务转换 |
| O2 | 临时 Spec/AC/交互说明均写“主管可撤回”；新明确要求“仅提交人可撤回，只修受影响内容” | 相关三处一致，旧实际检查不继承到新权限；旧来源不可读的变体保留限制；不重建全套 Spec |
| O3 | 设计 D3 三条教学规则，请“分析转交后撤回及拒绝情形”；另给冲突变体 | 正常组合直接推导；冲突定位 R1 与新说法，保留待决，不选隐含优先级 |
| O4 | “方案希望减少等待，尚无基线；已知分配功能能按规则工作。补充目标与验收说明。” | 功能验收与效果证据分开，指标未知，不编造收益或新增固定报告 |
| O5 | 在同样资料中分别请求“只分析风险”和“只把按钮文案改为提交” | 前者零文件写入；后者仅更新文案及必要直接引用，不改业务权限/测试资格，不外发 |

- [ ] **Step 5：更新共同来源记录。** 本次比较写固定 `5863806dd4e15c63174bee4e7515a4256792ecfa`、研究日期和 Spec 核心无增量结论，保留过去记录。分别说明两处模板修订与方法增强、本轮实际输入/读取/结果/纠正、环境限制和未验证项；没有运行证据则明确未运行。长期以后执行时可补实际复核日期，不无依据继续称该提交为最新。
- [ ] **Step 6：同步来源副本并核对总范围。** 两个 Profile 来源记录与根逐文件 `cmp` 退出 0；解析三份分发 JSON，比较实施前默认集合、路径及锁的原始来源字段，预期不变。确认改动限设计第 5 节的 14 份实施文件；对并行改动保留来源说明，不能用整树回退制造一致。逐项检查无新增脚本、测试文件或依赖。
- [ ] **Step 7：说明实际完成与剩余限制。** 对本轮文件执行 `git diff --check`，预期退出 0；报告哪些检查已运行、哪些仅文本核对、哪些观察被环境限制。不为本轮方法改动重跑无关 UI 构建，也不把旧 Bundle 安装当新源码验证。若语义观察发现属于本轮范围的缺陷，修正其拥有文件并仅重跑受影响样本及副本/哈希检查。

## 自审覆盖与交接

| 设计要求 | 实施位置 |
|---|---|
| D1 状态分类与适用范围 | Task 1，O1 |
| D2 增量差异、无旧门禁、无新增调用路径 | Task 2，O2 |
| D3 组合规则与来源冲突 | Task 3 Steps 1/3/4，O3 |
| D3 功能验收与业务效果 | Task 3 Steps 1/2/4，O4 |
| D4 实际观察及证据限制 | Task 4，O1–O5 |
| 副本、有效哈希、原始来源、主题保护 | 各任务同步步骤，Task 4 Steps 5–7 |

计划自审已核对范围覆盖、步骤可操作性、文件/字段一致性和五类风险；计划本身没有执行以上检查或案例。建议按 Task 1→2→3→4 顺序实施；没有为本次文档维护增加逐任务审批或提交要求。下一步仍是实际实施请求，不把“计划完成”标为“优化已上线”。
