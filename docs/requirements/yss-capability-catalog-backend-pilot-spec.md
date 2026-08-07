---
pipeline: yss-capability-catalog-backend-pilot
stage: open
status: ready-for-human
owner: ai
---

# YSS 能力目录跨仓库集成与核心 Backend Pilot

## 功能父 Ticket

[GitHub Issue #41：YSS 能力目录跨仓库集成与核心 Backend Pilot](https://github.com/iloveZzz/yss-spec-project-template/issues/41)

Spec 初稿使用 `ready-for-human`，等待人工审查后再进入需求冻结和垂直切片拆分。

## Problem Statement

YSS skills 已完成一轮收敛：能力目录、owner、触发条件、依赖闭包、source-index、技能退役清单、共享技能权威源和平台投影已经形成模板内基线。但当前证据主要来自模板仓库自身的静态校验和压力场景，尚未证明以下跨仓库行为可以在真实使用链路中稳定成立：

1. 一个 fresh clone 通过 `create-yss-spec` 生成 `project-instance` 后，能够正确发现并使用独立的 YSS capability catalog。
2. 一个真实外部 Backend implementation repo 中的最小垂直切片，能够先经过 `yss-product-lifecycle` 分诊，再由 `yss-router` 编译最小技能依赖闭包和 Slice Implementation Contract。
3. 六个核心 backend scaffold skill、领域、Application、Repository / Gateway、Web / DTO 和 Java 规范之间的依赖关系，在实际执行时与 catalog、lock 和投影一致。
4. `yss-cloud-microservice` 作为 runtime source repository 时，source-index 的路径、新鲜度和验证证据可被追溯；模板不会因为技能治理而修改外部 runtime 源码。
5. 退役技能、nested scaffold reference、手工平台投影或过时入口不会在新项目中重新出现。

如果只停留在模板仓库内通过校验，团队无法判断能力目录是否真能驱动实际 Agent 路由，也无法发现 `create-yss-spec`、外部 implementation repo 和 YSS 技能合同之间的集成缺口。

## Solution

建立一个以独立 YSS capability catalog 为路由事实、以外部真实 Backend vertical slice 为唯一主测试 seam 的受控 Pilot：

1. 在 fresh clone 中生成 `project-instance`，验证仓库身份、生命周期资产、catalog、lock 和共享技能投影能够一起工作。
2. 选择一个低到中等风险、边界清晰、可独立验收的真实 Backend vertical slice；若没有可复用后端工程，先登记外部目标，再使用 YSS DDD scaffold 初始化，不在模板仓库承载业务源码。
3. 由 `yss-product-lifecycle` 完成入口分诊和阶段判断，由 `yss-router` 读取冻结资产、影响面和 catalog profile，输出 Slice Implementation Contract 草案；生命周期编排器负责核验、批准、版本化和持久化，Router 不自行放行。
4. 使用 `backend-vertical-slice` capability profile 编译最小依赖闭包。默认覆盖生命周期、Router、backend scaffold parent、Domain、Application、Infrastructure、Web、Repository、Controller、DTO、`domain-modeling`、MapStruct、Lombok 和 Alibaba Java code style；组件适配器、权限、审计、数据库迁移等仅在触发条件命中时加入。
5. 在真实后端实现仓库执行 TDD 和项目根目录的 `./mvnw` 验证，产出合同、技能执行结果、变更文件、证据文件、实际验证、独立审查和回滚点。
6. 对 catalog、source-index、skills-lock、平台投影、退役技能和 nested reference 执行正反压力场景，记录不适用项、阻断项、重路由和 fresh verification。
7. Pilot 完成后按指标复盘，只有稳定的结论才回流到 AGENTS、CONTEXT、ADR、模板、Skill 或自动化 backlog；不因一次试点结果批量新增长尾技能。

## User Stories

1. 作为模板维护者，我希望 YSS 能力目录独立于来源锁文件，以便能力发现和来源完整性各自保持清晰职责。
2. 作为模板维护者，我希望每个 active skill 都有明确分类、owner、触发条件、非触发条件和验证命令，以便 Agent 能判断何时加载能力。
3. 作为 YSS Backend owner，我希望每个 runtime component skill 都能追溯到 `yss-cloud-microservice` 的源码路径和 source-index，以便识别 API 或版本新鲜度风险。
4. 作为 Application Architecture owner，我希望 scaffold skill 不再以 nested reference 伪装成独立入口，以便 Agent 只看到一个 canonical entrypoint。
5. 作为工程治理 owner，我希望 retired skill 既从目录消失又不能通过平台投影、锁文件或别名重新出现，以便退役真正可验证。
6. 作为 Agent，我希望能从 `backend-vertical-slice` profile 获得最小直接与传递依赖闭包，以便避免加载过多、过杂或无关的 YSS skills。
7. 作为 Agent，我希望后端切片在进入实现前先经过生命周期分诊，以便模板维护任务、产品实例任务和实现任务不会混用。
8. 作为 Agent，我希望 `yss-router` 输出结构化 Slice Implementation Contract 草案，以便写入范围、禁止模式、验证命令和证据要求可被后续技能消费。
9. 作为生命周期编排器，我希望 Router 只能编译草案而不能批准合同，以便人工门禁、阶段状态和 `ready-for-agent` 裁决保持单一责任。
10. 作为后端实现者，我希望核心 YSS skills 消费同一合同版本并返回 YSS Skill Execution Result，以便实现结果可以被独立 Reviewer 复核。
11. 作为后端实现者，我希望不存在可复用后端工程时，流程能先登记外部目标并路由 YSS DDD scaffold，以便不会把业务代码误写入研发管理仓库。
12. 作为后端实现者，我希望实现仓库登记 Git、分支、CI、测试和回滚点，以便跨仓库切片可以独立验证和恢复。
13. 作为 Java 开发者，我希望涉及 POJO 或对象转换的切片自动包含 Lombok、MapStruct 和 Alibaba Java code style，以便核心闭包不会遗漏共同工程约束。
14. 作为 Java 开发者，我希望后端验证统一使用项目根目录的 `./mvnw`，以便验证不依赖开发机全局 Maven 版本。
15. 作为 Router owner，我希望 API、权限、数据库、状态机、数据模型、写路径、架构或测试 seam 发生变化时，旧合同自动标记为 stale 并产生 `new_impacts`，以便阻止在过期合同上继续实现。
16. 作为生命周期编排器，我希望命中但不可用的长尾 skill 默认进入 blocked，并记录 provider、fallback、approval_ref 和 resolution，以便 Agent 不会擅自用通用知识替代 YSS 规范。
17. 作为 Reviewer，我希望能看到 catalog、lock、投影、source-index 与真实执行结果的对应证据，以便独立判断“技能存在”是否真的等于“技能可用”。
18. 作为模板维护者，我希望 source-index 路径缺失、技能依赖漂移、退役入口回流和 nested reference 回流都能被自动阻断，以便模板发布不会依赖人工肉眼检查。
19. 作为项目维护者，我希望 fresh clone 的验证能够复现当前模板分支的结果，以便排除本地工作区残留和历史验证输出的干扰。
20. 作为项目负责人，我希望 Pilot 只选择低到中等风险且易回滚的真实需求，以便首次验证 Harness 时控制人工审查和跨仓库协作成本。
21. 作为产品 / 研发协作者，我希望 Pilot 的业务目标、MVP、非目标、验收标准和人审点清晰，以便它验证真实协作闭环而不是纯流程演示。
22. 作为 Ticket owner，我希望 Spec 初稿、需求冻结、OpenAPI 影响、垂直切片和验证证据都能回链到同一个功能父 Ticket，以便跨阶段追踪完整。
23. 作为 GitHub issue reviewer，我希望 Spec 初稿使用 `ready-for-human`，而只有通过门禁的垂直切片才使用 `ready-for-agent`，以便 tracker 状态不误导 Agent 直接实现。
24. 作为外部 implementation repo owner，我希望模板仓库只保存治理、契约和证据，不修改我的 runtime 源码，以便两个仓库的职责边界保持清晰。
25. 作为 YSS 技能 owner，我希望 Pilot 复盘能区分保留、合并、提升、降级和退役的技能候选，以便不因一次场景再次扩大技能数量。
26. 作为模板发布者，我希望外部 `create-yss-spec` 集成验证完成前，发布结论明确标注阻断状态，以便不会把本地门禁通过误报为整体可发布。

## Implementation Decisions

- 本 Spec 的范围是“能力目录跨仓库集成与核心 Backend Pilot”，不是重新设计已完成的 catalog，也不是在模板仓库实现某个具体业务功能。
- YSS capability catalog 负责分类、发现、owner、触发、依赖闭包、source-index 和验证入口；`skills-lock.json` 继续负责来源、版本、哈希和投影完整性。两者不得互相复制对方的事实职责。
- `.agents/skills` 是共享技能的 canonical source；其他 Agent 平台的共享技能是生成投影，禁止按平台分别手工维护。Codex-only skill 仍保持 Codex-only，不因 Pilot 自动提升为 shared。
- 当前四类能力保持为 Component Adapter、Application Architecture、Process & Contract、Platform / Frontend。核心 Backend Pilot 默认只进入前三类中受影响的最小闭包，不加载 Platform / Frontend。
- 六个 backend scaffold skill 作为 shared canonical entrypoint 使用：parent、adapter、application、domain、infrastructure、web。generator 的 reference 只保留说明性材料，不再承载同名 skill 入口。
- `yss-domain-modeling` 的领域建模职责由通用 `domain-modeling` 承担；已退役的 `yss-dir`、`yss-file`、`yss-filerunner`、`yss-mail`、`yss-mapper-dynamic`、`yss-quality` 和 `yss-variable` 不恢复兼容别名。未来若重新封装，必须由 owner 复审并建立新的 RED baseline。
- Pilot 采用唯一主测试 seam：fresh clone `project-instance` → 生命周期分诊 → `yss-router` 合同编译 → 外部真实 Backend vertical slice 执行 → 外部 `./mvnw` 验证 → 模板和跨仓库证据汇总。静态脚本作为该 seam 的支撑断言，不另造平行主流程。
- 真实 Pilot 必须选用独立实现仓库。后端工程状态必须明确为 `existing`、`required` 或 `initialized`；若为 `required`，先登记目标仓库或输出目录，再调用 `yss-ddd-scaffold-generator`，不得在本模板仓库下新增业务代码目录。
- 首次 Pilot 不选择支付、核心认证授权、加密算法、数据库迁移、审计日志、公共基础库 API 变更或依赖多个外部团队同步上线的跨系统变更。若候选需求命中这些影响，应退回试点选择或补充人工审查，不得静默降级。
- Pilot 的 slice contract 至少包含 Common、Frontend、Backend、Contract、Cross-repo 子合同、工作单元、TDD 模式、允许写路径、禁止模式、证据文件、`seam_deferred`、验证命令和回滚点。无 frontend / API / data 影响时写明 `not-applicable` 与原因。
- `yss-router` 只输出草案；生命周期编排器负责核验上游门禁、批准和持久化。合同版本变化、`drift`、`violation`、证据缺失或 `new_impacts` 会阻断当前工作单元或触发完整重路由。
- 命中但不可用的长尾 skill 默认 `blocked`。只有生命周期批准的等价规范才可使用，并且必须留下 provider、fallback、approval_ref 和 resolution 证据。
- 该 Spec 无 UI 影响、无生产 API 影响、无数据库 schema 变更；因此不生成页面原型、OpenAPI Draft 或业务数据架构。Pilot 若实际候选切片触发这些影响，必须在进入实现前升级对应门禁，而不是沿用本 Spec 的无影响结论。
- Spec 初稿和功能父 Ticket 使用 `ready-for-human`；通过需求冻结、必要架构 / 契约门禁并具备直接实现条件的垂直切片，才允许使用 `ready-for-agent`。
- Pilot 完成后以复盘指标决定后续动作：不自动批量提升所有 Codex-only backend component skills，不自动封装外部仓库中尚未覆盖的 runtime component，也不把一次性检查沉淀为新 skill。

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | fresh clone 生成的 `project-instance` 必须识别仓库身份、加载 catalog、lock 和共享投影，并拒绝缺失或非法身份配置。 | P0 |
| FR-002 | catalog 必须能为 `backend-vertical-slice` 返回稳定的最小依赖闭包，并区分 required、supporting、conditional 和 excluded 能力。 | P0 |
| FR-003 | Router 必须输出可机器检查的 Slice Implementation Contract 草案，包含路径、禁止模式、证据和验证命令。 | P0 |
| FR-004 | 生命周期编排器必须能批准、持久化和版本化合同，并阻止 Router 直接设置 `ready-for-agent`。 | P0 |
| FR-005 | 外部 Backend implementation repo 必须登记 repo、branch、CI、`./mvnw` 命令、OpenAPI / data 影响和回滚点。 | P0 |
| FR-006 | 核心 Backend skills 必须消费相同合同版本并返回包含实际变更、证据和验证的 YSS Skill Execution Result。 | P0 |
| FR-007 | API / schema、database、permission、state machine、data model、write path、repository、required skill、architecture、contract、test seam 或 verification command 变化必须触发 stale / `new_impacts` / 暂停 / 重路由。 | P0 |
| FR-008 | retired skill 和 nested scaffold entrypoint 必须在 fresh clone、catalog、lock、投影和 Router 场景中均不可发现。 | P0 |
| FR-009 | source-index 必须能验证外部 `yss-cloud-microservice` 源路径存在，并在未配置外部源码时给出明确的受控校验结果。 | P1 |
| FR-010 | Pilot 必须执行模板门禁、Router 场景、生命周期场景和外部实现仓库的 `./mvnw` fresh verification，并将结果回链到功能父 Ticket。 | P0 |
| FR-011 | Pilot 必须记录不可用长尾 skill、`not-applicable` 影响、人工审查、阻断项、回滚点和独立 Reviewer 结论。 | P0 |
| FR-012 | Pilot 复盘必须输出是否继续扩大、必须先修正的问题、自动化候选和需要人工决策的事项。 | P1 |

## Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| 可追溯性 | catalog、lock、source-index、合同、实现仓库和 Ticket 之间可以互相回链。 | 每个 P0 验收项都有文件或命令证据 |
| 确定性 | 相同 catalog、输入资产和场景应产生相同 profile 闭包和合同关键字段。 | fresh clone 与本地重跑结果一致 |
| 安全性 | 模板治理不修改外部 runtime 源码，不绕过人审、路径约束、权限或回滚门禁。 | 0 次越权写入；阻断场景可复现 |
| 可维护性 | entrypoint 数量、owner、触发条件和依赖边界可审查，reference 不冒充 skill。 | 新增 skill 必须经过复用价值和 owner 评审 |
| 新鲜度 | runtime source-index 可被刷新和验证，路径不存在或索引过期时有明确状态。 | 不以“路径存在”冒充 API 内容已覆盖 |
| 性能 | 路由只加载最小闭包，不默认扫描或加载全部 YSS skills。 | backend Pilot 不加载 Platform / Frontend 和未触发长尾能力 |
| 可回滚性 | 模板与外部实现仓库均使用隔离分支和 checkpoint，Pilot 可在不破坏主分支的情况下撤销。 | 每个切片有明确回滚点 |

## Acceptance Criteria

### A. Fresh clone 与仓库身份

```gherkin
Given 模板分支已包含 catalog、lock、共享技能投影和退役记录
When 在 fresh clone 中使用 create-yss-spec 生成 project-instance
Then 生成仓库的 repository_mode 为合法的 project-instance
And catalog、lock 和共享技能入口可被发现
And 不存在退役技能或同名 nested scaffold entrypoint
```

```gherkin
Given 生成仓库缺少 yss-project.yaml、schema_version 不支持或 repository_mode 非法
When Agent 进入任务路由
Then 路由停止并输出迁移检查
And 不根据目录、远程地址或占位符猜测仓库身份
```

### B. Catalog、依赖闭包与权威源

```gherkin
Given 一个 backend vertical slice 命中 backend-vertical-slice profile
When yss-router 编译依赖
Then 返回生命周期、Router、核心 scaffold、Domain、Application、Repository / Gateway、Web / DTO 和 Java 规范的最小闭包
And 不加载 Platform / Frontend
And 未命中的长尾能力不进入闭包
```

```gherkin
Given 共享 YSS skill 需要修改
When 维护者执行同步与锁定流程
Then 只修改 .agents/skills 的 canonical source
And 生成平台投影与 skills-lock
And 手工修改投影或锁文件参数会被校验阻断
```

```gherkin
Given 一个 runtime component skill 声明 yss-cloud-microservice source-index
When source root 已配置且执行 freshness verification
Then 声明的外部 source path 存在
And source-index、catalog 和验证命令可以回链
When source root 未配置
Then 校验只报告受控的 source-unavailable 状态
And 不伪造外部源码已验证的结论
```

### C. 生命周期、合同与重路由

```gherkin
Given 一个真实 Backend vertical slice 进入实现准备
When 先执行 yss-product-lifecycle 再执行 yss-router
Then Router 输出 Slice Implementation Contract 草案
And 草案包含 Common、Frontend、Backend、Contract、Cross-repo、工作单元、TDD、写路径、禁止模式、证据和验证命令
And Router 不批准合同或设置 ready-for-agent
```

```gherkin
Given 合同已经被生命周期编排器批准并版本化
When 核心 YSS skill 执行工作单元
Then 结果引用同一合同版本
And 返回实际变更文件、证据文件、实际验证、seam_deferred、偏离和新增影响
```

```gherkin
Given 已批准合同的 API schema、数据库、权限、状态机、数据模型、写路径、required skill 或测试 seam 发生变化
When Agent 尝试继续执行旧工作单元
Then 旧合同标记为 stale
And 输出结构化 new_impacts
And 暂停受影响工作单元并指向明确的重路由目的地
```

```gherkin
Given 命中的长尾 skill 在当前 provider 中不可用
When Agent 计算依赖闭包
Then 默认结果为 blocked
And 只有具备 provider、fallback、approval_ref 和 resolution 的生命周期批准记录时才可采用等价规范
```

### D. 外部 Backend Pilot

```gherkin
Given 外部 implementation repo 已登记为 existing 或 required
When Pilot 进入真实 Backend vertical slice
Then 允许写入范围只覆盖批准的实现仓库和治理证据范围
And 模板仓库不新增业务 runtime 源码
And 缺少外部目标确认时工作单元保持 blocked
```

```gherkin
Given 后端切片已通过必要门禁并具备直接实现条件
When 实现者执行测试与构建验证
Then 使用项目根目录的 ./mvnw
And 验证结果、失败输出或受控例外被写入 Ticket / verification evidence
And 不以裸 mvn 或历史输出替代 fresh verification
```

```gherkin
Given Pilot 选中的需求触发数据库迁移、权限接入、审计日志、支付、加密或核心认证授权
When 进行 Pilot readiness review
Then 不得静默进入默认低风险路径
And 必须补充对应人工确认、架构 / 数据 / 安全门禁或更换候选切片
```

### E. 退役、发布与复盘

```gherkin
Given 已退役的 YSS skill 名称出现在旧 reference、平台投影、lock、catalog 或新项目目录
When 执行模板与 Router 压力验证
Then 校验失败并指出回流入口
And 不创建兼容别名
```

```gherkin
Given 模板本地门禁全部通过但 create-yss-spec 跨仓库集成尚未完成
When 维护者判断是否发布
Then 结论必须标记为 external-integration-blocked
And 不得声称模板整体可发布
```

```gherkin
Given Pilot 已完成模板验证、外部 ./mvnw 验证和独立审查
When 执行阶段 checkpoint
Then 功能父 Ticket 记录 scope、验证证据、风险、人工审查点、实现仓库和下一步
And 复盘记录指标、保留 / 合并 / 退役候选及治理回流动作
```

## Testing Decisions

- 主要测试 seam 采用一个最高层的跨仓库闭环：fresh clone 生成 `project-instance`，对一个真实外部 Backend vertical slice 完成生命周期分诊、Router 合同编译、核心 YSS skill 执行、外部 `./mvnw` 验证、模板门禁和证据回链。该 seam 同时覆盖发现、路由、实现边界和 fresh verification，不再为每个 skill 单独设计主流程。
- 模板侧优先复用既有 `scripts/verify-template`、`scripts/verify-yss-capability-catalog`、`scripts/verify-yss-router-scenarios` 和 `scripts/verify-lifecycle-scenarios`。新增断言应围绕 catalog、投影、退役、nested reference、不可用 skill 和重路由的可观察行为，不测试提示词内部措辞。
- 外部后端侧按候选切片的公开行为执行 TDD；至少包括领域 / Application 行为、接口或适配器契约、必要的集成验证。具体命令以实现仓库登记为准，但后端构建和测试默认使用项目根目录的 `./mvnw`。
- 测试只断言用户和生命周期可观察的结果：依赖闭包、合同字段、阻断状态、证据文件、实际验证、回滚信息和跨仓库关联；不把具体 Java 类名、目录布局或 skill 内部段落当成不可变行为，除非它们是明确的路径安全合同。
- Source-index 测试分为 source root 已配置和未配置两种场景；前者验证声明路径存在，后者验证受控降级，不把缺少外部源码误判为源码内容验证通过。
- 共享技能投影测试以 canonical source 为输入，验证生成结果和 lock 一致；另设投影漂移、退役入口回流和 nested reference 回流的反例。
- 本 Spec 无 UI 影响，因此前端组件测试、页面原型、浏览器 E2E 和 Ant Design v6 校验为 `not-applicable`；若真实候选切片后来产生 UI 影响，必须按影响面升级，不沿用该结论。
- 本 Spec 无生产 API 变更，因此 OpenAPI Draft / Freeze 为 `not-applicable`；若 Pilot 切片含 API 变更，需先形成 API 影响记录和 review-only Draft，再按生命周期门禁冻结。
- 本 Spec 的最终通过必须由非实现者完成独立审查，审查内容包括合同版本、允许写路径、禁止模式、验证命令、fresh verification、回滚点和 Ticket 回链。

## Out of Scope

- 不在本仓库直接实现或迁移任何业务 Backend、Frontend 或 runtime component 源码。
- 不修改外部 `yss-cloud-microservice`，也不因为 source-index 覆盖缺口自动新增全部 runtime component skill。
- 不在本轮批量提升所有 Codex-only backend component skills 到 shared，也不根据单次 Pilot 结果扩大默认依赖闭包。
- 不恢复 `yss-mail`、`yss-filerunner`、`yss-file`、`yss-domain-modeling`、`yss-dir`、`yss-mapper-dynamic`、`yss-quality` 或 `yss-variable`，不保留兼容入口。
- 不把 reference、template、script 或 source-index 当作可独立触发的 skill entrypoint。
- 不新增产品 UI、业务 API、数据库 schema、权限模型、审计策略、支付、加密或核心认证授权能力。
- 不把本地模板门禁通过等同于 `create-yss-spec` 跨仓库契约已完成，也不在外部 CLI 未集成验证前宣称模板可发布。
- 不替代人工对 Spec、架构、外部目标仓库、不可逆变更、发布和完成结论的裁决。

## Further Notes

- 当前模板分支已有能力目录、49 个 entrypoint 的校验结果、RED / GREEN 记录、退役记录、核心 scaffold 提升和 Router / lifecycle 压力场景。它们是本 Spec 的输入基线，不是本 Spec 的重复交付物。
- 真实 Pilot 候选应从现有业务需求中选择一个低到中等风险、可在 1 到 3 个垂直切片内完成、至少有一个可观测接口或业务行为、测试命令可获得且回滚简单的需求。若当前没有合适候选，应先补充 Discovery，而不是制造合成业务 fixture 作为替代。
- Pilot 需要建立实现仓库登记和跨仓库切片记录，记录 Git URL、默认分支、隔离分支、CI、OpenAPI 接入（如适用）、测试命令、回滚点以及人工确认责任人。
- 完成条件不是“命令通过”，而是：唯一 seam 可复现、阻断场景确实能阻断、正向场景能产出合同和证据、外部实现仓库 fresh verification 通过、非实现者完成独立审查、Ticket 已同步、遗留风险已明确。
- 建议执行顺序为：Spec Review → 选择 Pilot 候选 → 需求 / 架构 / 契约门禁裁剪 → 功能父 Ticket 更新 → 外部仓库登记 → 垂直切片 Ticket → Router 合同编译与生命周期批准 → TDD 实现 → 独立审查 → fresh verification → Pilot 复盘。
- 若 Pilot 发现 catalog 分类、依赖闭包、source-index、平台投影、外部 CLI 或生命周期合同之间存在冲突，必须先暂停受影响工作单元，记录 `drift` / `new_impacts` 和重路由目的地，再修订权威资产；不得先完成实现再补治理记录。
