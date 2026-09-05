# `awesome-design-md` 参考前的 YSS 内部设计规范差距分析

## 1. 研究边界

- 任务：只读盘点当前 YSS 设计规范与相关技能，为主研究包判断是否吸收外部 `design.md` 实践提供内部基线。
- Profile / mode：`technical-evidence` / `quick`。
- 仓库身份：`template-source`，本结论是模板维护证据，不生成产品 Spec、原型或实现资产。
- 纳入：`DESIGN.md`、`docs/design/`、`yss-design-system`、`yss-prototype-stage`、`prototype-review`、两个 H2 Provider skill、技能注册表。
- 排除：未读取、未评价 `VoltAgent/awesome-design-md`；不对外部仓库的具体章节或质量作任何推断。
- 检索限制：已先执行 CodeGraph，但 Markdown 语义查询误召回非目标源码，未把该结果用于结论；随后只在任务包允许路径内逐文件复核。

## 2. 结论

**可以参考外部项目补充，但应采取“增量吸收、先修内部合同”的方式，不应再引入一套平行设计规范或平行 skill。**

当前 YSS 已经覆盖 `design.md` 的机器可读视觉基线、中文治理说明、原型阶段顺序、H1/H2 渐进披露、Provider 事实隔离、独立评审和六轴 Design QA。真实缺口集中在四点：

1. `DESIGN.md` 已被全局规则声明为视觉 token 与组件变体的规范源，但 `yss-design-system`、原型证据和部分 Provider freshness 合同仍把 `docs/design/design.md` 或 token 快照当作主入口，导致规范源未被强制消费。
2. `docs/design/design.md` 一边声明“不重新定义 token 具体值”，一边大段重复精确 token；现有内容已出现与 `DESIGN.md` 不一致的按钮颜色、排版层级、间距命名等事实。
3. 已有 `lint` / `drift` 工具说明，但 skill 的维护流程与证据 schema 没有完整闭环到 `DESIGN.md` digest；一些验证只检查字段或文件存在，无法证明真正消费了规范。
4. 原型适配器存在可直接复现的规范消费偏差，说明“文档写了规则”还没有转成足够强的自动校验。

因此，若主研究包确认外部仓库在结构、按需阅读、反模式或验证方面有可复用实践，推荐将其映射进现有 `yss-design-system` / `yss-prototype-stage` 的 references 与校验器；不要新增 `awesome-design-md` 平行入口，不要覆盖 YSS 生命周期、Token 或 Provider 边界。

## 3. 当前职责映射

| 资产 / 技能 | 当前职责 | 内部证据 | 判断 |
|---|---|---|---|
| `DESIGN.md` | 机器可读紧凑视觉合同；视觉 token、组件视觉变体的规范源；业务行为留在 Spec、交互说明和状态矩阵 | `DESIGN.md:4`、`DESIGN.md:208-212`；`AGENTS.md:27` | 应继续作为视觉值的 canonical source |
| `docs/design/design.md` | 中文治理、YSS/Ant Design 双轨、生命周期衔接、页面约束与验证说明 | `docs/design/design.md:1-10` | 适合承载 why/how/boundary，不应复制 canonical value |
| `docs/design/tokens/*` | 从规范源派生的运行时 JSON/CSS 快照 | `docs/design/design.md:7-9`、`docs/design/README.md:7-10` | 应只生成和消费，不应手改为新事实源 |
| `yss-design-system` | 设计任务入口、项目风格基线、实现/评审检查表及其他技能路由 | `.agents/skills/yss-design-system/SKILL.md:8-29`、`:81-107` | 正确入口，但其 SSOT 描述和更新步骤需要校准 |
| `yss-prototype-stage` | 原型阶段主合同：低保真/状态矩阵 → 独立评审 → H1/H2 → 浏览器/QA/无障碍 → 用户确认 | `.agents/skills/yss-prototype-stage/SKILL.md:8-26`、`:35-49` | 顺序和渐进披露已较完整 |
| `prototype-review` | 产品设计影响命中时的独立、fail-closed 低保真评审 | `.agents/skills/prototype-review/SKILL.md:8-20`、`:22-45` | 与构建和门禁裁决边界清楚 |
| `yss-antdv-next-design` | 默认 H2 Vue/Antdv Next 精确版本事实 Provider | `.agents/skills/yss-antdv-next-design/SKILL.md:8-25`、`:39-48` | 只提供事实，不生成页面或批准门禁，边界正确 |
| `yss-antd-design` | 显式 H2 React/AntD 兼容路线的版本事实 Provider | `.agents/skills/yss-antd-design/SKILL.md:8-25`、`:27-35` | 与默认 Vue 路线隔离明确 |
| 技能注册表 | canonical root、分层、可发现性、条件依赖和确定性闭包 | `docs/agents/yss-skill-registry.yaml:1-24`、`:64-69`、`:315-320`、`:435-446`、`:483-488`、`:591-596` | `yss-design-system` / `yss-prototype-stage` / `prototype-review` 为 core，Provider 为按条件加载的 specialist，符合渐进披露 |

## 4. 覆盖与缺口矩阵

| 维度 | 已有覆盖 | 真实缺口 / 冲突 | 优先级 |
|---|---|---|---|
| `design.md` 职责 | 根规范明确只负责视觉 token 与组件视觉变体，不负责产品行为；中文治理文档也声明了边界 | `yss-design-system` 将 `docs/design/design.md` 称为“团队可读的唯一规范来源”，快速/深读顺序完全未要求读取根 `DESIGN.md`；其更新流程也只说更新中文文档和 skill | P0 |
| 结构 | 根文件包含 YAML frontmatter 和 Overview / Colors / Typography / Layout / Elevation / Shapes / Components / Do’s and Don’ts；中文文档补充治理、原型和实现说明 | 中文文档声明“不重新定义 token 的具体值”，实际却维护颜色、字号、间距、圆角和动效精确值；canonical 与 explanatory 内容未真正分离 | P0 |
| 值一致性 | `design-system-sync.yaml` 的 `baseline_sha256` 与本轮 `DESIGN.md` SHA-256 一致，说明至少存在规范源摘要 | `DESIGN.md` 的 primary button 使用 `primary-control=#245bdb`、hover `#2f68eb`，中文文档和 skill 则称主按钮使用 `#3371ff`、hover `#4096ff`；根文件只定义 24/18px heading 与无 20px spacing key，中文文档另定义 38/32/26/22/18px 和 `sizeMD=20` | P0 |
| 消费顺序 | `yss-prototype-stage` 已定义“项目覆盖 → 功能语义 → Provider 事实”的优先级；Provider 边界也把项目资产置于上游事实之前 | 原型阶段主 skill、schema v3 模板和 validator 只要求 `docs/design/design.md` + token refs，不要求 `DESIGN.md` ref/digest；根规范的 prose 或组件变体变化可能不使原型证据失效 | P0 |
| Provider freshness | Antdv Next fact pack 校验 exact version、组件集合、CLI、文件 digest 和项目 token baseline | fact-pack 合同的 `project_baseline` 只列 `docs/design/design.md` 和 Token 文件；虽 Provider 边界列出根 `DESIGN.md`，freshness 合同没有它，形成“优先级声明强、失效检测弱”的断点 | P1 |
| 验证 | 中文治理文档提供 `design-md lint DESIGN.md` 与 `design-md drift`，并说明校验 frontmatter、章节、属性、引用和全部派生物 hash；原型证据 validator 覆盖 profile、视口、QA、状态和 fact pack digest | `yss-design-system` 的更新步骤只运行 skill frontmatter validator/test，不要求执行 `design-md lint/drift`；其 validator 实际只校验 `SKILL.md` 的 `name` / `description`，不能检查规范结构或消费关系 | P0 |
| 实际消费验证 | H2 adapter 从 `docs/design/tokens/theme.json` 生成主题配置；原型证据要求 token digest 一致 | H1 adapter 生成的 CSS 使用不存在的 `--brand-primary`、`--container-background`、`--layout-background`，靠 fallback 掩盖问题，并硬编码 32px 控件与 20/24px padding；H1 `validate-project` 只检查文件存在和禁用 lockfile，无法发现这些偏差 | P0 |
| 渐进披露 | `yss-design-system` 提供“先读 SKILL，必要时读治理文档，再读执行清单”的层次；`yss-prototype-stage` 有明确“按需读取”；注册表将两个 Provider 设为不可默认发现的 specialist，并由 H2 条件加载 | 渐进披露的第一层没有根 `DESIGN.md` 的必读/摘要策略；Agent 可能读完 384 行中文重复值仍未直接消费 canonical file | P1 |
| 反模式 | 已覆盖营销式 hero、双 primary、硬编码颜色、magic number、依赖内部 DOM、Tag 表达关键状态、重复 QA/handoff、原型源码直入生产等反模式 | 反模式分散在根文件、治理文档、skill 和 references；缺少一个围绕“规范源消费”的 fail-closed 清单，例如：未读根规范、复制 canonical values、仅凭快照/截图声称合规、未记录 digest | P1 |
| 治理边界 | 原型、生产实现、Provider、门禁审批、业务状态和 API 的职责边界清楚；`yss-ui` 在原型阶段被禁止 | 根 `DESIGN.md:212` 仍把 React AntD 描述为 high-fidelity 主路线、Vue Antdv Next 描述为 experimental，而当前合同已明确 H2 默认 Vue、React 仅显式兼容；canonical 文件正文混入易变 Provider 路由并已陈旧 | P0 |
| 维护陈旧项 | H1/H2 两档和 schema v3 已在主合同及 templates 中统一 | `docs/design/design.md:373` 仍写“三档原型适配器”，与当前 H1/H2 两档合同冲突 | P1 |

## 5. 关键证据详述

### 5.1 规范源声明与 skill 路由冲突

- 全局入口明确规定：视觉令牌与组件视觉变体以根 `DESIGN.md` 为权威；中文治理文档与 token 快照承担解释/派生角色（`AGENTS.md:15-29`）。
- `docs/design/design.md` 自身也重复这一边界（`:3-10`）。
- 但 `yss-design-system` 没有把根 `DESIGN.md` 列为权威资料，反而将 `docs/design/design.md` 称为“唯一规范来源”，并要求设计产出只明确引用后者（`.agents/skills/yss-design-system/SKILL.md:10-20`、`:60-69`）。
- 更新设计系统的步骤同样从“将稳定规范落到 `docs/design/design.md`”开始，没有要求先改根规范、再派生和 drift（`.agents/skills/yss-design-system/SKILL.md:98-107`）。

这不是措辞问题：它会让 Agent 按 skill 合法地产生绕过 canonical 文件的变更路线。

### 5.2 声称不复制，但已出现多处双写与值冲突

- `docs/design/design.md:7-10` 明确承诺不重复具体 token。
- 实际上 `docs/design/design.md:89-118`、`:144-205`、`:225-249` 重新列出颜色、排版、间距、圆角和动效值；`references/design-system.md:36-123` 又复制一轮。
- `DESIGN.md:7-10` 的 `primary-control` / hover 为 `#245bdb` / `#2f68eb`，且按钮变体直接引用它们（`:77-91`）；中文规范把主按钮和 hover 定为 `#3371ff` / `#4096ff`（`docs/design/design.md:93-118`，`.agents/skills/yss-design-system/SKILL.md:31-42`）。
- `DESIGN.md:29-59` 只提供 24px / 18px heading，`:68-75` 的 spacing 没有 20px；中文规范另列 38/32/26/22/18px 标题和 `sizeMD=20`（`docs/design/design.md:144-184`）。

这证明现状不能仅靠“文档声明是派生说明”避免漂移；需要减少双写或把可重复内容变成确定性生成。

### 5.3 证据 schema 没有绑定 canonical `DESIGN.md`

- 原型证据模板只记录 `project_design_ref: docs/design/design.md` 和 token refs/digest（`docs/design/templates/prototype-evidence-template.yaml:32-38`）。
- validator 只要求 `project_design_ref` 是非空字符串，并验证 `project_token_baseline_digest`；没有路径固定或 `DESIGN.md` digest 校验（`.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs:73-78`）。
- Antdv Next fact-pack 合同也只把中文设计文档和 Token 文件列入 `project_baseline`，freshness 只监听这些材料（`.agents/skills/yss-antdv-next-design/references/fact-pack.md:11-18`、`:20-29`）。

所以根文件只改 Do/Don’t、组件变体或 Provider 边界而 token 快照不变时，已有原型与 Provider 证据未必会 stale。

### 5.4 自动验证尚未证明“按规范消费”

- `docs/design/design.md:12-21` 已定义 `lint` 与 `drift`，覆盖根规范结构和派生快照 hash，这是良好基础。
- `yss-design-system` 的维护出口只要求 frontmatter validator/test（`.agents/skills/yss-design-system/SKILL.md:98-107`）；该 validator 的实现仅解析 `SKILL.md` 的 `name`、`description`（`.agents/skills/yss-design-system/scripts/validate-frontmatter.mjs:6-29`）。
- H1 adapter 的生成 CSS 使用 `--brand-primary` 等与实际 `variables.css` 中 `--brand-color-primary` / `--brand-color-bg-container` 不同的名字（`.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs:200-208` 对比 `docs/design/tokens/variables.css:1-44`），并生成 32px button，而当前默认原型规格是 compact 28px（`DESIGN.md:222-224`、`docs/design/design.md:192-205`）。
- H1 validator 只检查 `index.html`、adapter、`styles.css` 存在和禁止 package/lockfile（`.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs:281-289`），因此这些偏差不会失败。

这给出了一个内部可复现的反例：具备规范、快照和验证命令，并不等于消费链已经闭环。

## 6. 建议的补充方向

以下是供主研究包复核的内部改造目标，不是本 Explorer 对权威资产的修改授权。

### P0：先统一单一事实来源合同

1. 在 `yss-design-system` 中明确固定顺序：`DESIGN.md` canonical visual contract → `docs/design/design.md` governance/lifecycle explanation → `docs/design/tokens/*` generated runtime projection → feature semantics / Provider facts。
2. 把“稳定视觉值先落 `docs/design/design.md`”改为“先判断 Google `design.md` schema 是否支持：支持则落 `DESIGN.md` 并生成投影；不支持则在治理文档中明确标成非-canonical extension，并说明 owner/validator”。
3. 清理或生成化中文文档与 skill reference 中的精确值；至少先裁决 primary button、heading、spacing、motion 的 owner 和当前正确值。
4. 从根 `DESIGN.md` 移出易变 Provider 路由，或让其由生命周期路由的稳定摘要生成，避免视觉规范正文再次陈旧。

### P0：把消费与 freshness 变成机器合同

1. schema v3 `design_baseline` 增加固定的 `design_md_ref: DESIGN.md` 与 `design_md_digest`；validator 校验路径、文件存在、digest 和 token projection digest。
2. Provider fact pack 的 `project_baseline` 纳入根 `DESIGN.md` digest，使 canonical 视觉合同变化能使旧 fact pack stale。
3. `yss-design-system` 的维护验证必须调用现有 `design-md lint` / `drift`，而不只是 frontmatter test。
4. 增加负向场景：根规范变了但 token 未重派生、证据缺根 digest、中文说明复制值漂移时必须失败。

### P0：修复适配器的真实消费偏差

1. H1 starter 只使用 `variables.css` 中存在的变量名，并避免 fallback 掩盖别名错误。
2. starter 的默认控件高度、页面 padding、Card padding/圆角应从 compact 投影或稳定 adapter token 生成；validator 对实际引用和值关系做断言，而非只检查文件存在。
3. 为 H1/H2 starter 增加“canonical → projection → adapter”最小端到端场景。

### P1：在现有 skill 内增强渐进披露与反模式

1. 保留 `yss-design-system` 作为快速入口，新增一份短的 `references/design-md-consumption.md`，只承载职责、读取顺序、schema extension、禁止双写、freshness 和验证命令；不要把 384 行治理文档再复制进 SKILL。
2. 在 `yss-prototype-stage` 的“按需读取”中按任务类型路由：视觉值/组件变体读根规范；生命周期/双轨读中文治理；落地值只读派生 token；组件 API 仅 H2 条件读取 Provider fact pack。
3. 集中声明四个 fail-closed 反模式：未读 canonical、复制 canonical value、只凭截图/快照声称符合规范、规范变化但证据 digest 未刷新。
4. 清理“三档原型适配器”等陈旧措辞，继续维持 H1/H2 两档单一合同。

## 7. 反向证据与限制

- 现有体系并非完全失控：`docs/design/design-system-sync.yaml:1-12` 保存了根规范摘要；本轮 `shasum -a 256 DESIGN.md` 得到 `35438b5cdb120999ca171e7e4eb9a7fced6dccb9f8518a58137b28b578c82b70`，与清单一致。
- `design-md lint/drift` 已有明确文档入口，原型阶段也有较强的 schema v3 和六轴 QA；建议是把这些能力串起来，而非重建。
- 本分析没有读取外部仓库，不能证明外部项目具体实现了上述任一能力，也不能决定其文件可直接复制。
- 本分析没有执行任务包未授权的设计工具脚本，只执行任务包指定的输出非空验证；任何权威资产修改需由 `work-unit.ssot-update` 另行受控完成。

## 8. 给主研究包的下一决策

外部调研应逐项回答：其做法是否能以小改动补上“canonical 读取顺序、内容分层、禁止双写、digest freshness、负向验证”中的某一项；若只是增加更多 token、设计原则、组件示例或另一套生命周期，应判为重复或冲突，不采纳。

建议主结论采用以下判定门槛：

- **采纳**：能强化现有 P0/P1 缺口，且映射进既有 `yss-design-system` / `yss-prototype-stage` / validator。
- **改写后采纳**：内容有价值，但需去掉外部工具、技术栈、安装方式或平行 SSOT。
- **不采纳**：重复 YSS 已有规范、要求新增平行 skill/入口、覆盖项目 Token、绕过生命周期或把原型当生产实现。

## 9. Search Log

| 顺序 | 动作 | 结果 |
|---|---|---|
| 1 | 读取任务包、`yss-project.yaml`、`CONTEXT.md`、`AGENTS.md` | 确认 `template-source`、唯一写路径与产品经理 Explorer 边界 |
| 2 | `codegraph explore` 查询允许路径内的设计职责与消费关系 | 对 Markdown 目标召回不准确，记录限制，不采信其非目标源码 |
| 3 | `rg --files` 盘点允许目录 | 定位设计规范、skills、references、templates、validators 和 fact pack |
| 4 | 逐文件带行号读取并交叉检索 `DESIGN.md` / token / drift / validation / boundary | 建立职责映射与覆盖/缺口证据 |
| 5 | `shasum -a 256` 校验根规范与设计快照 | 根规范摘要与 `design-system-sync.yaml` 当前一致 |

## 10. workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
task_id: awesome-design-md-internal-gap-analysis-2026-09-05
work_unit_id: work-unit.entry-triage
actor_id: codex.subagent.awesome-design-md-internal-explorer
role_id: role.product-manager
runtime_id: runtime.skill-projection
execution_state: Explorer
status: completed
contract_id: maintenance.awesome-design-md-research-delegation
contract_version: 1
repository_mode: template-source
changed_files:
  - .template-source/evidence/maintenance/awesome-design-md-internal-gap-analysis-2026-09-05.md
evidence_files:
  - .template-source/evidence/maintenance/awesome-design-md-internal-gap-analysis-2026-09-05.md
findings:
  p0: 6
  p1: 4
  conclusion: conditional-adoption-recommended
external_repository_accessed: false
forbidden_actions_performed: false
context_reconciliation:
  status: not-applicable
  reason: template-source 只产出维护研究证据，未修改稳定词汇或产品资产
verification:
  - command: test -s .template-source/evidence/maintenance/awesome-design-md-internal-gap-analysis-2026-09-05.md
    result: passed
    exit_code: 0
deviations: []
next_consumer: work-unit.ssot-update
```
