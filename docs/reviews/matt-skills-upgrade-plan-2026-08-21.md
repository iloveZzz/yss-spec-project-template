# Matt Skills 上游升级与 YSS 适配计划

## 状态与范围

- 状态：`ready-for-human`
- 仓库身份：`template-source`
- 当前项目基线：`mattpocock/skills@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`
- 已核验上游目标：`mattpocock/skills@0ab1b63a410a03d3627979a109c8695de27af954`
- 目标：升级 Matt 通用工作方法，保留 YSS 仓库身份、门禁、状态、授权、前端还原和专项工程规则。

本文是实施计划，不是升级完成证据。本轮不修改 skill、编排契约、门禁、校验器或投影。

## 已确认决策

1. 使用“上游技能基线 + YSS 技能适配”，不将最新 Matt 目录整体覆盖到 `.agents/skills`。
2. `yss-product-lifecycle` 是唯一默认生命周期入口。Matt user-invoked skills 只作为显式兼容入口。
3. `to-spec`、`to-tickets`、`implement` 在任何写入前执行生命周期 preflight，完成后回交 `Workflow Execution Result`。
4. 前端还原在实现期使用 Visual Baseline Contract 和可重复的视觉反馈环，不把问题留到最终 Review 才发现。
5. `wizard` 不进入本轮主链；文档将其表达为“YSS 有意排除”，不再声称上游已退役。
6. 升级分为三个独立 L3 批次；每批必须有 RED、GREEN、REFACTOR、压力场景、fresh verification 和正式独立审查。

ADR-0007 已覆盖“原生工作单元 + Matt 显式兼容入口”的难逆决策，本计划不创建重复 ADR。

## 当前差距

### 上游与供应链

- 本项目锁定 33 个 Matt skills，最新上游包含 35 个，双方同名 32 个。
- `batch-grill-me` 只存在于项目锁文件；它在声明的上游 revision 和目标 revision 中均不存在，其行为已由 `grilling` 覆盖。
- 上游包含 `wizard`、`claude-handoff`、`git-guardrails-claude-code`，本项目已选择不分发它们。本轮仅更正 `wizard` 的排除理由。
- `skills-lock.json` 记录 `upstreamHash` 和 `effectiveHash`，却没有可由工具验证的上游 `sourceRevision`。现有 `sync-skills --check` 和 `update-skill-lock --check` 不能发现上游过期或来源路径不存在。

### 调用与生命周期

- 最新 Matt 将 invocation 作为唯一分类轴：user-invoked skill 只能由用户显式启动；一个 skill 只能自动调用 model-invoked skill，且每次 Skill tool 调用只传一个 skill。
- 项目中 `triage`、`wayfinder`、`diagnosing-bugs` 仍有旧的 user-invoked 跳转语义。
- `matt_invocation_boundary.model_invoked_skills` 只列出 `grilling`、`domain-modeling`、`code-review`，但工作单元实际还使用 `research`、`prototype`、`codebase-design`、`tdd` 等。
- `AGENTS.md` 仍将 `grill-with-docs → to-spec → to-tickets` 写成项目实例的默认路径，与 ADR-0007 和当前生命周期原生入口冲突。

### 显式兼容入口

- `to-spec` 仍直接输出 `ready-for-agent`，而 YSS Spec 初稿必须为 `ready-for-human`。
- `to-tickets` 仍直接创建 `ready-for-agent` Ticket，而 YSS 只允许生命周期在完整 readiness 公式通过后晋升状态。
- `implement` 仍包含无条件 commit，且未在 skill 内消费已批准、已持久化、版本当前的 Slice Implementation Contract。
- 当前适配规则主要存在于外围文档。用户直接启动兼容 skill 时，仍有状态或授权规则被越过的风险。

### 前端实现还原

- Matt `prototype` 用于回答 runnable 设计问题，不是生产前端实现 skill。
- Matt `tdd` 主要验证可观察行为；两轴 `code-review` 主要验证 Standards 和 Spec。二者都不单独保证视觉还原。
- 当前 YSS 已有实现前计划和实现后验证，但生产实现过程中尚缺少“同视口、同状态截图 → 差异分级 → 修复 → 重新截图”的阻断反馈环。

## 目标分层

```text
上游技能基线（sourceRevision + upstreamHash）
                    │
                    ▼
YSS 技能适配（adaptationRef + effectiveHash）
                    │
                    ▼
.agents/skills 权威内容 → 六个生成投影
                    │
                    ▼
yss-product-lifecycle 按工作单元选择 model-invoked skill
                    │
                    └─ 用户显式兼容入口 → preflight → 执行 → return
```

共享 skill 不直接依赖 Codex 私有 skill。共享生命周期只定义前端还原能力合同；Codex 投影可将该合同映射到 `product-design:index`、`product-design:image-to-code` 和 Design QA，其他 Agent 提供等价证据。YSS 的已批准合同、组件路由、安装版本和允许写路径始终优先。

## 批次一：上游来源与调用拓扑

### L3 分级

```yaml
intensity: L3
triggers: [permission-boundary, core-validator, aggregate-behavior-change]
classification_reason: 改变 skill 调用权限、默认入口、上游来源验证和核心场景校验。
```

### 权威修改面

- `skills-lock.json`：增加可机器验证的 `sourceRevision`；适配后 skill 增加 `adaptationRef`。
- `scripts/lib/skill-supply-chain.mjs` 及相关入口：验证 revision、source path、上游哈希、有效哈希和适配依据。
- `.agents/skills`：选择性吸收最新 invocation 修复；保留 YSS 的 `grill-with-docs`、`code-review`、`ask-matt` 适配。
- 退役 `batch-grill-me`，同步清理六个投影、锁文件、编排契约和场景期望。
- `AGENTS.md`、`docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md`、`docs/agents/skills-maintenance.md`：统一默认原生入口和上游排除语义。
- `orchestration-contract.yaml` 与 `scenario-checks.mjs`：把“完整 invocation inventory”与“单个工作单元白名单”分开，从 frontmatter 和 route 派生校验。

### RED 基线

1. 锁文件声明 `batch-grill-me` 来自锁定 revision，但来源路径不存在，当前 lock/projection 检查仍返回成功。
2. 在工作单元路由中加入未登记或 invocation 类型不匹配的 skill，当前校验不能从元数据完整拒绝。
3. `triage`、`wayfinder` 遇到 setup 缺失时仍使用旧语义跳转 user-invoked skill。
4. `AGENTS.md` 将 Matt 显式入口表达为默认主链，而 lifecycle skill 将原生工作单元表达为默认主链。

### GREEN 完成条件

- 所有上游 skill 都能解析到锁定 revision 中的真实路径，且原始目录哈希等于 `upstreamHash`。
- 存在项目差异时必须有可读 `adaptationRef`；无差异时 `effectiveHash` 与上游目录哈希一致。
- invocation inventory 与 skill frontmatter 一致，每个工作单元只调用其声明的 model-invoked skill。
- 共享流程只有一个默认入口：`yss-product-lifecycle`。
- `batch-grill-me` 不再存在于权威目录、投影、锁文件或活跃路由中。

### 压力场景

- revision 存在，但 skill path 不存在。
- upstreamHash 与锁定 revision 的真实内容不一致。
- user-invoked skill 被写入原生工作单元的可自动调用集合。
- 上游新增 model-invoked skill，硬编码 inventory 没有同步。
- YSS 适配 skill 被上游同步机械覆盖。

### REFACTOR 检查

- 上游 revision 只在锁文件的权威来源模型中定义一次；说明文档读取或引用，不再手工重复固定值。
- 调用类型从 frontmatter 派生；场景测试只固定业务不变式，不复制整份 skill 清单。
- 项目适配差异集中指向可读依据，不在多个说明文档分别复述。

## 批次二：显式兼容入口的两阶段握手

### L3 分级

```yaml
intensity: L3
triggers: [ticket-state, permission-boundary, aggregate-behavior-change]
classification_reason: 改变 Spec/Ticket 状态所有权、代码写入前置条件和 Git 授权语义。
```

### Preflight 协议

显式兼容入口在写入前向 `yss-product-lifecycle` 提交 `compatibility-preflight-v1`：

```yaml
schema_version: compatibility-preflight-v1
entry_skill: to-spec | to-tickets | implement
work_unit: <stable-work-unit-id>
repository_mode: <manifest-value>
requested_action: <create-spec | create-tickets | implement-slice>
input_refs: []
input_digest: <digest>
requested_write_paths: []
requested_git_actions: []
```

编排器返回：

```yaml
decision: allowed | blocked | needs-human
preflight_ref: <persisted-reference>
input_digest: <same-digest>
allowed_write_paths: []
initial_asset_role: ready-for-human | null
required_contract_refs: []
gate_snapshot_ref: <reference>
missing_requirements: []
git_authorization:
  commit: false
  push: false
```

preflight 只对同一 `input_digest`、同一输入引用和同一允许写范围有效。任一上游资产、门禁、合同版本或写路径改变都使它失效。

### 执行与 return

- `to-spec`：只能在 preflight `allowed` 后写入；Spec 初稿固定为 `ready-for-human`；不设置垂直切片 `ready-for-agent`。
- `to-tickets`：只在 OpenAPI Freeze 或 `no-api-impact` 以及必要门禁证据齐全后写入；新 Ticket 固定为 `ready-for-human`。
- `implement`：只消费当前已批准、已持久化的 Slice Implementation Contract；只写 `allowed_write_paths`；使用 model-invoked `tdd` 和 `code-review`；不从“实现”授权推导 commit/push 授权。
- 完成后统一返回 `Workflow Execution Result`。编排器校验 `preflight_ref`、输入摘要、变更资产、证据、新影响和阻塞信号，再决定状态传播。

### RED 基线

1. 直接运行 `to-spec` 可生成 `ready-for-agent` Spec。
2. 直接运行 `to-tickets` 可跳过 readiness 复算并生成 `ready-for-agent` Ticket。
3. `implement` 在缺少当前合同、前端实现计划或结构化 Git 授权时仍指示写代码和 commit。
4. preflight 后更改上游资产或允许路径，旧 preflight 仍可被使用。

### GREEN 完成条件

- 三个兼容入口在没有可验证 `preflight_ref` 时保持只读并返回 `blocked/needs-human`。
- Spec/Ticket 初始状态与 YSS 状态模型一致，`ready-for-agent` 只由生命周期复算。
- 实现发生在合同限定的仓库、分支和写路径中；越界写入稳定失败。
- commit 和 push 分别消费完整的结构化授权，自然语言意向不被解释为授权。
- return 中的证据可读，且 `drift/new_impacts/violation/missing_evidence/stale_candidates` 能阻断 completed。

### 压力场景

- `repository_mode=template-source` 时显式运行三个兼容入口。
- 伪造或重放不匹配 `input_digest` 的 preflight。
- UI 影响 Ticket 缺少已批准的前端实现计划。
- 合同已持久化但不是当前版本。
- 用户只说“做完提交”，没有 `commit_scope` 或 `commit_authorization_ref`。
- 执行期发现新 API、新状态或越界路径。

### REFACTOR 检查

- readiness、gate 和 Git 授权计算只存在于生命周期权威契约；兼容 skill 只读取 preflight 决策，不复制公式。
- `compatibility-preflight-v1` 与 `Workflow Execution Result` 共享稳定工作单元 ID，不新增生命周期状态。
- Matt 原始工作方法留在适合的 skill；YSS 硬门禁集中在适配层。

## 批次三：前端实现中的还原反馈环

### L3 分级

```yaml
intensity: L3
triggers: [lifecycle-gate, release-semantics, aggregate-behavior-change]
classification_reason: 改变 UI 影响切片的实现准入、完成公式和发布阻断证据。
```

### Visual Baseline Contract

优先扩展现有 `frontend-implementation-plan` 和 `frontend-implementation-evidence` schema，不创建一套平行证据模型。UI 影响切片在 `ready-for-agent` 前至少固定：

- Spec、交互说明、状态矩阵和已确认高保真原型引用。
- 页面/路由、桌面与窄屏视口、浏览器与主题条件。
- 默认、loading、empty、error、no-access、selected、Modal/Drawer 等已触发状态。
- 每个基线的参考图像、可重复捕获步骤和允许差异。
- 对应的行为测试 seam、`pnpm` 命令和证据路径。

### 实现反馈环

```text
读取已批准 Visual Baseline Contract
  → 用 YSS 组件与工程合同实现一个窄切片
  → 执行行为 TDD 和最小 pnpm 检查
  → 在同视口、同状态捕获实现截图
  → Design QA 对照并分级差异
  → 修复 P0/P1/P2
  → 重新捕获与复验
  → 返回 YSS Skill Execution Result
```

P3 可作为明确的后续迭代项；任何 P0/P1/P2、截图缺失、视口/状态不同、无法进行可比较捕获、console warning 或必需 `pnpm` 失败都返回 `blocked`。发现新 API、新用户可见状态或原型与冻结 Spec 冲突时返回 `new_impacts/drift`。

### 技能路由

- 共享合同：`yss-ui`、`yss-page-module-development`、Router 编译的最小 YSS 专项 skills、`tdd`、浏览器捕获和 UI fidelity Review。
- Codex 适配：在 Product Design get-context 已确认且存在明确视觉目标时，使用 `product-design:index` 路由到 `product-design:image-to-code` 和 Design QA。
- 其他 Agent：必须返回同样的基线、截图、差异、修复和通过证据；不得因平台没有同名 skill 而降低门禁。
- 优先级：已批准 Slice Implementation Contract → 项目安装版本和既有用法 → YSS 组件路由 → 产品设计还原方法。通用 image-to-code 不得自行替换 YSS 组件、字体、图标或资产策略。

### RED 基线

1. 原型已批准，但生产实现可只用 type-check 作为完成证据。
2. 实现截图与参考图使用不同视口或不同状态，仍能被标记为已对齐。
3. Design QA 仍有 P1/P2 差异，但 fresh verification 和回滚点通过后即可发布。
4. Codex 通用 image-to-code 建议绕过已批准的 YSS 组件或安装版本。

### GREEN 完成条件

- UI 影响切片在 `ready-for-agent` 前具有已批准、非模板、引用可读的 Visual Baseline Contract。
- 实现中反馈环至少完成一次可比较截图和修订后复验；不可比较时稳定阻断。
- Design QA 没有未解决的 P0/P1/P2，剩余 P3 有责任人和后续 Ticket。
- console、必需 `pnpm` 命令、行为测试和视觉证据指向同一候选快照。
- `gate.frontend-implementation-verified` 仍是 UI 影响切片进入 release-ready 的必需依赖。

### 压力场景

- 只有默认态截图，缺少 loading/error/no-access 等已触发状态。
- 参考图更新后仍使用旧基线合同。
- 截图存在，但没有浏览器、视口、路由或状态元数据。
- 实现修复后没有重新捕获，审查结论指向旧候选。
- 视觉通过但 console warning、键盘/焦点或行为测试失败。

### REFACTOR 检查

- Visual Baseline Contract 扩展现有前端实现证据 schema，不复制原型、Spec 或状态矩阵内容。
- 截图捕获、差异分级和候选摘要由一个可重复的证据契约表达，不散落在多个 checklist。
- 平台适配只负责把共享能力合同映射到平台 skill，不改变通过标准。

## 分批验证和独立审查

每批建立独立 maintenance checkpoint，至少包含：

```yaml
schema_version: 1
intensity: L3
classification_reason: <对应批次理由>
triggers: []
changed_assets: []
verification_evidence:
  - kind: red
    command: <修改前可复现的失败场景>
    result: pass
  - kind: green
    command: <针对性校验>
    result: pass
  - kind: refactor
    command: <重复、死路由和投影漂移检查>
    result: pass
  - kind: pressure-scenario
    command: <压力 fixture 或行为证据>
    result: pass
  - kind: fresh-verification
    command: scripts/verify-template
    result: pass
  - kind: formal-independent-review
    command: <冻结候选的独立审查引用>
    result: pass
review_mode: formal-independent
escalation: none
```

通用验证集合：

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-lifecycle-registry
scripts/verify-frontend-implementation-evidence
scripts/verify-template
git diff --check
```

每批的针对性测试必须在通用验证之前运行；通用命令通过不能替代 RED 和压力场景。正式独立 Reviewer 不得由对应批次的实施者担任。

## 实施顺序与回滚边界

1. 先冻结当前工作区候选摘要，区分已有生命周期精简改动和新升级批次。
2. 批次一先修复来源、inventory 和默认入口；这为后续两批提供可信调用基线。
3. 批次二只改显式兼容入口及其 schema/校验/场景，不同时扩展前端证据模型。
4. 批次三在前两批通过独立审查后扩展前端还原能力。
5. 每批的撤回边界是该批权威内容、派生投影、锁文件和测试 fixture 的同一候选；不通过单独撤回投影或锁文件制造混合版本。
6. Git commit/push 仍需用户对每个范围单独授权。

当前工作区中 `.ua/.understandignore` 的删除不属于本计划，任何批次都不得修改、恢复或纳入其候选范围。

## 整体完成条件

- Matt 上游 revision、每个导入 skill 的来源路径和原始哈希均可机器验证。
- YSS 适配差异有可读依据，上游同步不会静默覆盖。
- 默认原生入口、user/model invocation、工作单元路由和场景测试一致。
- 显式兼容入口无法绕过仓库身份、Spec/Ticket 状态、Slice Implementation Contract、允许写路径或 Git 授权。
- UI 影响切片只有在同一视觉基线、同一实现候选和必需工程验证全部通过后才能进入 release-ready。
- 三个批次分别具有完整 L3 checkpoint 和非实施者的正式独立审查通过证据。

## 未决阻塞与下一步

当前没有影响本计划成立的未决产品或领域决策。实施时仍需在每批开始前确认：

- 当前未提交生命周期改动的固定候选摘要和该批允许写路径。
- 批次一的锁文件 schema 升级是否需要兼容旧版读取器，以现有公开分发面检索结果为准。
- Codex Product Design 平台投影的实际能力和当前版本；平台不可用时必须使用等价证据路由。

下一个建议动作是实施“批次一：上游来源与调用拓扑”。该动作将修改权威 skill、锁文件、编排契约、场景测试和投影，不在本轮“只生成计划”的授权范围内。
