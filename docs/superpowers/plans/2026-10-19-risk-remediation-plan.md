---
doc_type: maintenance-plan
status: completed
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-19
moved_to: maintenance:archive/2026-10-19/2026-10-19-risk-remediation-plan.md
scope: risk-remediation
---

# YSS 风险整改实施执行计划

版本：v1.0。状态：已批准，已完成（completed）。

- 文档类型：maintenance-plan
- 基线提交：e1337581036f55f66c00c7d40c042ad60f6c8190
- 创建时间：2026-10-19
- 执行开始：2026-10-19 01:06 CST；执行 worktree 分支 codex/risk-remediation-20261019，基线 main@e1337581。
- 依据：已审阅通过的风险整改规格 docs/superpowers/specs/2026-10-19-risk-remediation-design.md（v0.1.0，基线 main@e1337581）。
- 维护强度：L2（触发项：core-validator、generation-semantics、release-semantics、lifecycle-gate、template-structure）。
- 基线：template-source，main @ e1337581，yss-cli pin 2.5.0 / 212698b3；实施前重新核对 HEAD、index、工作树与未跟踪文件。
- 当前工作树：仅 5 个 docs/superpowers 未跟踪文档（4 个既有 + 整改规格），受跟踪文件无改动。

## 0. 交付范围与执行方式

1. 本计划批准后，先执行 Task 0：把本计划写入 docs/superpowers/plans/2026-10-19-risk-remediation-plan.md，并更新整改规格的元数据与计划链接。完成 Task 0 后暂停，向用户报告计划落盘位置与审阅入口。
2. P0-P6 的代码整改在用户明确给出开始实施的指令后执行；批准本计划本身不授予 Git 提交、推送、发布、刷新公开技能仓或安装外部工具的权限。
3. 代码整改在隔离 worktree 中进行；当前工作树中的用户未跟踪文档与本地修改保持原字节，不复制、不覆盖、不清理。
4. 本计划包含设计决策与验收条件；实施中若发现与规格冲突的事实，先停止受影响范围，更新计划与规格后再继续，不自行扩大或缩小范围。

## 1. 目标与成功标准

### 1.1 目标

- G1：公开技能导出构建通过并进入受影响检查；退役技能 ID 检查由注册表声明的 OBSOLETE 单一来源驱动，可区分真伪并转绿。
- G2：Profile 的 active / legacy 语义显式；现役 Profile 的组合技能、锁、注册表、分发排除项由可复现检查覆盖；陈旧排除项分类处置。
- G3：维护文档有生命周期元数据、索引与基线；文档事实（计数、CLI 版本、投影根、生命周期分级、本机绝对路径）由现有或新增最小检查约束。
- G4：验证策略棘轮、通用检查超时、Node 版本声明与实际运行器一致；不减少既有 required checks、Gate 或 CI 守卫。

### 1.2 成功标准

- 整改规格的 AC-01 至 AC-12 全部能从实际命令、退出码、报告或测试结果得到证据；fast 报告仍为 limited，未执行项如实记录。
- 公开导出、退役扫描、Profile 组合一致性、维护文档检查、分发面路径检查、策略基线检查在最终 fast 选择中按输入被选中且恰好执行一次；既有 CI 守卫集合与 release 必跑集合不减少。
- 用户工作树与未跟踪文档未被覆盖；整改 worktree 的改动可逐批审阅和回退。

## 2. 已确认决策、假设与细化

### 2.1 从已批准规格继承的决策

- D1：越界链接改为可移植文本，不复制模板内部文件进技能包。
- D2：公开导出构建检查进入 fast 与 G03；公开仓 freshness check 保留为发布前人工步骤，不进 CI。
- D3：退役 ID 使用 OBSOLETE 单一来源；保留 teach、yss-components 的上下文特例。
- D4：Profile 状态采用 spec kernel / backend active / design legacy；design 冻结不迁 schema v3。
- D5：docs/superpowers 继续作为在办维护文档工作区，但必须有元数据、状态与完成后迁移规则；长期依据迁入 .template-source/contracts 并进入索引。
- D6：陈旧 excludePaths 采用「模板源/覆盖层存在性 + 实例侧例外清单」分类，不批量删除整类路径。
- D7：策略棘轮、timeout_ms 透传、Node 声明对齐纳入本轮；不新增 CI 守卫，不重构验证调度器。
- D8：跨 Profile 生命周期稳定 ID 的完整对齐另立设计，本轮只记录并避免扩大。

### 2.2 实施中发现需要细化的决策

- R1 退役扫描的 ID 集合必须分模式。OBSOLETE 共 99 个，其中 qa、research、wizard 是通用英文词，不能做全仓边界匹配；当前脚本只扫描 55 个，剩余 44 个中既有应补扫的 distinctive ID，也有必须排除或上下文匹配的通用词。实施采用「扫描策略配置 + OBSOLETE 单一来源」：每个 OBSOLETE ID 必须被分类为 exact、contextual 或 not-text-scanned 并给出理由；物理目录、注册表、锁、投影与公开导出名单始终做硬检查，不受文本白名单影响。
- R2 「Profile 锁的 effectiveHash 需要随 canonical 技能修改刷新」是实施强制步骤。编辑 .agents/skills 的 SKILL.md 会改变后端/设计 Profile 组合目录的技能树哈希，profiles/backend/skills-lock.json 与 profiles/design/skills-lock.json 必须同步重算；否则现有 profile-tree 测试与新增一致性检查会失败。
- R3 未跟踪的既有计划文档按用户已批准规格进入整改范围；修改前记录逐文件 SHA-256 与原字节备份到仓外 maintenance 目录，异常时可恢复，不覆盖用户其他未跟踪内容。
- R4 Profile 组合一致性以现有 composeProfileTree 为基础，但陈旧排除项存在性检查使用「根仓 tracked 文件 + _specialist/该 Profile 覆盖层文件」的完整集合，不用 composeProfileTree 的受限 KERNEL_SCOPE 判断，避免把 .template-spec/architecture 等实际分发内容误判为不存在。
- R5 政策注册集中执行。所有新检查、路由、Gate、doc-facts 输入模式与 check.frontend-removed 死路径清理在 P5 一次编辑完成，避免多个批次冲突 template-verification-profiles.yaml；此前各任务用 node --test 直接验证，不依赖 --plan。
- R6 维护文档检查对 .template-source/contracts 下的 19 个历史文件不强制新增 frontmatter；以 contracts README 索引中的类型/状态/基线作为历史文件的元数据来源。docs/superpowers 下的在办文档必须写 frontmatter。
- R7 Timeout 默认值需由数据支撑。P5 先运行一次代表性 fast 报告取得任务耗时，再确定默认值与例外；未取得数据前不得声称 5 分钟硬上限已对普通检查生效。

### 2.3 假设

- A1 用户批准规格后，7 个既有维护文档的元数据与事实更新属于本轮授权范围；若实施期间发现某文档被用户并发修改，按 FS 冲突处理并回交，不覆盖。
- A2 公开技能发布仓在本轮不访问、不校验 freshness，不刷新。
- A3 design Profile 冻结期间无新增功能需求；backend 为唯一活跃覆盖层。
- A4 本机具备 Node 24；固定 yss CLI 与 Python/pnpm 依赖按现有入口准备；不新增依赖。
- A5 最终提交、推送、打 tag、发布、CI 远程验证均不在本计划执行范围，除非另有书面授权。

## 3. 变更总览

### 3.1 公共接口与数据流变化

| 对象 | 变化 | 消费方 |
|---|---|---|
| scripts/lib/export-skills.mjs | exportSkills(argv, options) 支持注入 root/sourceRoot；校验函数可测 | scripts/export-yss-skills、新测试 |
| .template-source/process/retired-skill-scan-policy.json | 新增：OBSOLETE 的扫描模式、上下文规则与允许清单来源 | scripts/lib/skill-retirement.mjs、verify-retired-skill-ids、测试 |
| scripts/lib/skill-retirement.mjs | 新增：retiredSkillIds、scanRetiredSkillIds、allowedRetiredReference | verify-retired-skill-ids、测试 |
| .template-source/process/profile-status.yaml | 新增：spec kernel / backend active / design legacy 及原因 | scripts/lib/profile-status.mjs、verify-profile-distribution、测试 |
| scripts/lib/profile-distribution.mjs | 增加状态校验、INSTANCE_ONLY_EXCLUDES、stale-exclude-path / stale-allowlist finding | scripts/verify-profile-distribution、新测试 |
| .template-source/process/maintenance-docs.json | 新增：文档目录、状态枚举、contracts 索引路径、基线规则 | scripts/lib/maintenance-docs.mjs、verify-maintenance-docs |
| scripts/lib/maintenance-docs.mjs 与 scripts/verify-maintenance-docs | 新增：frontmatter、基线祖先、索引覆盖、完成/取代迁移目标检查 | 新测试、fast 检查 |
| .template-source/process/distribution-hygiene-allow.json | 新增：分发面宿主路径允许清单（路径/前缀 + 原因） | scripts/lib/distribution-hygiene.mjs、verify-distribution-hygiene |
| scripts/lib/distribution-hygiene.mjs 与 scripts/verify-distribution-hygiene | 新增：分发面绝对路径与 Agent root 路径扫描 | 新测试、fast 检查 |
| .template-source/process/template-verification-profiles.yaml | 新增 6 个 fast 检查、路由条目、Gate 绑定、doc-facts 输入、死路径清理、timeout_ms 字段 | 现有验证选择器、CI、测试 |
| .template-source/process/verification-policy-baseline.json | 新增：required_checks / Gate / CI 守卫的冻结基线 | 新测试与 fast 检查 |
| package.json | engines.node 改为与验证运行器一致的 Node 24 范围 | ci-gate 的 node-engines 步骤、文档 |
| profiles/backend/skills-lock.json、profiles/design/skills-lock.json | 因 canonical 技能编辑重算受影响 effectiveHash | profile-tree 测试、实例打包 |

数据流变化：变更文件 → routing 判定是否已登记 → fast 检查按 input_patterns 选择 → Gate 绑定进入 release 影响面；Profile 组合目录 → 锁/注册表/物理目录集合与 effectiveHash 比较 → 一致性结果；维护文档 → frontmatter/索引/基线祖先 → 检查结果；分发面文件 → 宿主路径扫描 → 允许清单或失败。

## 4. 任务分解

### Task 0：落盘计划与规格状态更新

- 文件：新增 docs/superpowers/plans/2026-10-19-risk-remediation-plan.md；修改 docs/superpowers/specs/2026-10-19-risk-remediation-design.md 的元数据与文末计划链接。
- 步骤：
  1. 写入本计划全文；保留文档类型、基线提交与状态字段。
  2. 在规格中把 status 改为 reviewed（用户已审阅通过），在「归档去向」附近加入本计划链接。
  3. 仅改这两个文件；不 stage、不 commit、不修改其他未跟踪文档。
- 验证：git status 显示新增/修改仅这两个文档；git diff --check 无空白错误；规格与计划可正常打开。
- 完成条件：文件落盘，向用户报告路径与差异。

### P0 基线冻结与隔离

- 前置：用户明确开始实施。
- 步骤：
  1. 读取 .template-spec/process/git-workflow.md 与 using-git-worktrees 技能；从 main@e1337581 创建隔离 worktree，分支名 codex/risk-remediation-20261019；记录 base SHA 与 branch。
  2. 在原工作树与 worktree 分别记录 git rev-parse HEAD、git status --short、git stash list、git worktree list；确认用户 5 个未跟踪文档未被复制或修改。
  3. 复现 E1、E3 与 Profile/文档关键事实：export-yss-skills --check（用仓外新目录）、verify-retired-skill-ids、verify-doc-facts、harness-metrics --check-budget、verify-template-fast --plan（干净 worktree）。
  4. 证据写入仓外 maintenance 目录（scripts/maintenance-path 生成路径），绑定文件摘要；不写仓库。
- 验证：证据命令的真实退出码、日志路径与摘要可读；基线未漂移。
- 完成条件：worktree 就绪，证据保存，未提交。

### P1 技能供应链红点（W1-D1、W1-D2）

#### T1.1 越界链接可移植化

- 文件：.agents/skills/yss-layered-mvc-scaffold-generator/SKILL.md；.agents/skills/yss-product-lifecycle/references/daily-delivery.md。
- 步骤：
  1. 第 22 行链接改为普通文本引用：说明平台目录位于模板源 .template-spec/engineering/backend-platforms.md，公开包不携带该目录。
  2. 第 25 行链接改为普通文本引用：说明输入摘要准备说明位于模板源 .template-spec/process/daily-input-preparation.md，实例按分发清单提供。
  3. 保留原语义、条件与命令名，不改变业务规则；不新增文件。
- 验证：scripts/export-yss-skills --output 新建仓外目录 退出 0；scripts/export-yss-skills --check --output 同一目录 退出 0。
- 完成条件：两处 Markdown 链接消失，语义保留，导出构建通过。

#### T1.2 导出器可测试化与公开导出测试

- 文件：scripts/lib/export-skills.mjs；新增 tests/public-skill-export.test.mjs。
- 步骤：
  1. exportSkills(argv, options = {}) 接受 root 与 sourceRoot，默认值保持现行为；loadConfig/ensureOutput/files/validateLinks 改为接收注入路径，外部 CLI 输出不变。
  2. 测试正向：用真实 canonical 根构建完整公开导出到 os.tmpdir() 新目录，断言 skills、skills.sh.json、.yss-export-manifest.json 生成且无错误。
  3. 测试反例：构造临时 root 与最小 canonical 技能，分别注入越界链接、失效链接、符号链接、禁止文件、疑似凭据、绝对路径，断言逐项失败并带可定位错误。
  4. 测试隔离：t.after 清理临时目录；不写仓库、不写公开仓；不访问网络。
- 验证：node --test tests/public-skill-export.test.mjs 在 T1.1 前后分别红、绿；正向构建重复执行结果稳定。
- 完成条件：测试可独立运行，反例覆盖导出器全部阻断规则。

#### T1.3 Profile 技能锁刷新（R2）

- 文件：profiles/backend/skills-lock.json；profiles/design/skills-lock.json。
- 步骤：
  1. 使用 composeProfileTree 与 treeHash，在 backend/design 组合目录中对受 T1.1 影响的技能（yss-layered-mvc-scaffold-generator、yss-product-lifecycle）重算实际树哈希。
  2. 只更新对应 shared 条目的 effectiveHash，保持 JSON 键序与其他字段不变；不手改其他技能哈希。
  3. 相同方法核对全部 61 项（backend）与 25 项（design）无其他漂移，报告差异。
- 验证：现有 node --test tests/profile-tree.test.mjs 通过；新一致性测试（P3）通过；锁文件差异只包含受影响技能。
- 完成条件：两 Profile 锁与组合技能树一致。

#### T1.4 公开导出检查草案（注册推迟到 P5）

- 产出：check.public-skill-export 的定义草案：id、run（node --test tests/public-skill-export.test.mjs）、group（skills）、input_patterns（.agents/skills/**、yss-public-skills.json、scripts/export-yss-skills、scripts/lib/export-skills.mjs、tests/public-skill-export.test.mjs）、failure_mode、Gate 绑定 check.verification-skills（G03）。
- 验证：在临时测试配置中 loadVerificationProfiles 后编译命令与 ID 合法；不写入正式策略直到 P5。
- 完成条件：定义可被 P5 直接合并。

### P2 Profile 状态与退役扫描（W2-D1、W1-D3）

#### T2.1 Profile 生命周期声明

- 文件：新增 .template-source/process/profile-status.yaml；新增 scripts/lib/profile-status.mjs；修改 scripts/lib/profile-distribution.mjs、scripts/verify-profile-distribution、tests/profile-tree.test.mjs、tests/profile-distribution.test.mjs。
- 步骤：
  1. profile-status.yaml：schema_version 1；profiles 条目 spec（kernel）、backend（active）、design（legacy，reason 与 migration 必填）；不允许未知字段。
  2. lib 读取并校验：枚举 kernel/active/legacy；spec 与每个 profiles 目录必须有条目；active 必须能定位覆盖层；legacy 必须写原因。
  3. verify-profile-distribution 报告 status 缺失、未知值、active 无覆盖层、legacy 无原因；不新增独立命令。
  4. 测试改为按 status 生成 active 断言；design 的跳过仅当 status 为 legacy 且 reason/migration 非空；新增反例：删除标记、改成 active、legacy 无原因分别失败。
- 验证：scripts/verify-profile-distribution 退出 0；node --test tests/profile-tree.test.mjs tests/profile-distribution.test.mjs 通过，反例失败。
- 完成条件：状态文件成为唯一 active/legacy 事实源，硬编码 design 名称消失。

#### T2.2 退役扫描单一来源与策略化

- 文件：新增 scripts/lib/skill-retirement.mjs、tests/retired-skill-ids.test.mjs、.template-source/process/retired-skill-scan-policy.json；重写 scripts/verify-retired-skill-ids；修改 .template-source/process/template-verification-profiles.yaml 中 check.frontend-removed 的死路径（仅清理，不重排其他检查）。
- 步骤：
  1. 策略文件：source 固定为 scripts/lib/skill-supply-chain.mjs#OBSOLETE；modes 分区含 exact、contextual、not-text-scanned；通用词 qa、research、wizard 标 not-text-scanned 并写原因；teach、yss-components 标 contextual；其余默认 exact。每个 OBSOLETE 成员必须且只能落在一种模式；校验器拒绝缺项、重复、未知 ID。
  2. lib 导出 retiredSkillIds、scanRetiredSkillIds、allowedRetiredReference；扫描前先做硬检查：.agents/skills 物理目录、投影根、注册表 activities、skills-lock 条目、yss-public-skills.json 名单，任一带 OBSOLETE 即失败，不受文本 allowlist 豁免。
  3. 文本扫描按策略与 allowlist 分类：迁移与历史说明（skill-migrations、contracts、docs/superpowers、本规格与本计划）、Profile 生命周期/分发/注册表/锁配置、legacy design 内容、测试与夹具、tooling 测试、evidence、plugin legacy JSON、明确记录的兼容性说明；每条 allowlist 写原因，禁止无归属的目录级放行。指定保留的规范说明文件：.agents/skills/publish-skills-sh/references/yss-export.md 与 .agents/skills/yss-up-springboot3/SKILL.md 中的历史/禁止虚构说明。
  4. 清理 check.frontend-removed 中已不存在的 .agents/skills 输入路径与 manifest 路径；若其他检查存在同类死路径，只清理不存在的条目，保留测试与断言。
  5. 测试：策略分区覆盖 OBSOLETE 全集；脚本不再含第二份 ID 清单；fixture git 仓库注入活跃文件违规被检出；允许清单历史文件不报；当前仓库扫描退出 0；删除/新增策略条目时测试失败。
  6. 提供测试中的扫描计数输出（hard violations、text violations、allowed references），报告中可读。
- 验证：scripts/verify-retired-skill-ids 退出 0；node --test tests/retired-skill-ids.test.mjs 通过；fixture 反例失败；node --test tests/verification-selection.test.mjs 无新增失败。
- 完成条件：扫描可区分硬违规与历史引用，真实回流可被发现，无误报导致的整体豁免。

### P3 Profile 组合一致性与分发清单（W2-D2、W2-D3、W2-D4）

#### T3.1 组合一致性测试

- 文件：新增 tests/profile-consistency.test.mjs；修改 tests/profile-tree.test.mjs（如状态驱动的锁断言尚未覆盖）。
- 步骤：
  1. 对每个 active Profile 组合目录；忽略 .DS_Store；断言物理技能目录、锁 shared+platform 键、注册表 skills 声明、覆盖层与内核声明路径四个集合一致。
  2. 断言 shared 技能 effectiveHash 等于组合目录实际树哈希；同名覆盖必须由覆盖层锁/注册表登记；active Profile 不得含 OBSOLETE 成员；legacy design 仅报告不阻断（状态必须为 legacy）。
  3. 当前基线事实必须保持：backend 61/61/61 一致，design 25/25/25 且 ask-matt 由 legacy 豁免。
- 验证：node --test tests/profile-consistency.test.mjs 在当前基线通过；fixture 未登记技能、未登记同名覆盖、active OBSOLETE 成员分别失败；运行成本记录。
- 完成条件：检查可作为 check.profile-consistency 草案交付 P5。

#### T3.2 分发清单陈旧排除项分类

- 文件：profiles/backend/.template-source/distribution/bundle-profile.json、profiles/design/.template-source/distribution/bundle-profile.json、scripts/lib/profile-distribution.mjs、tests/profile-distribution.test.mjs。
- 步骤：
  1. 在 lib 中实现存在性判定：根仓 tracked 文件 + _specialist + 该 Profile 覆盖层，目录按前缀存在；新增 INSTANCE_ONLY_EXCLUDES 配置（带原因）。
  2. finding 两类：stale-exclude-path（不存在且不在 allowlist）、stale-allowlist（allowlist 路径已在模板源出现）。
  3. 清理已分类条目：
     - 删除已退役技能排除项：两个 Profile 中的 .agents/skills 下 file-export-download、formily-*、frontend-commit、theme-token-usage、yedit-table-usage、yss-api-integration、yss-formily、yss-formily-schema-generator、yss-frontend-scaffold-generator、yss-hook、yss-ui、yss-ui-business-page-generation、ytable-usage、ytree-usage。
     - 删除已不存在的脚本/manifests 条目：backend 的 scripts/instantiate-harness、scripts/verify-strategic-handoff-tools-lock、scripts/prepare-skills、scripts/verify-template-candidate、.agents/skills/.strategic-design-skills-manifest.json、.agents/skills/harness-orchestrator/references/orchestration-contract.yaml；design 的 13 个 scripts、.agents/skills/.strategic-design-skills-manifest.json、.agents/skills/.yss-skills-manifest.json、.template-spec/process/templates/frontend-implementation-verification-template.yaml、.agents/skills/yss-strategic-design/references/orchestration-contract.yaml。
     - 实例侧合法项进入 INSTANCE_ONLY_EXCLUDES：.pi/skills、.cursor/skills、.codex/skills、.claude/skills（如存在）、.codex/config.toml、.codex/skills/.DS_Store、docs 下临时、评审、ADR、发现、API、实现与发布目录以及 .work 等；每条写原因。
  4. 清理前后对真实存在路径运行 shipped 判定，断言分发边界不变；只允许删除原本不可能命中的不存在路径。
- 验证：scripts/verify-profile-distribution 退出 0；fixture 两类 finding 失败；真实路径 shipped 对比一致。
- 完成条件：manifest 差异仅含已分类删除与 allowlist 登记，实例内容不因清理改变。

#### T3.3 design legacy 冻结与文档

- 文件：profiles/design/README.md、.template-source/agents/skills-maintenance.md、.template-source/process/template-engineering-overview.md、README.md。
- 步骤：写明 design 为 legacy、仅旧实例显式迁移与历史读取、不新增功能；backend 为 active 覆盖层；内核变更对两层的传导规则；不迁移 design registry schema。
- 验证：verify-profile-distribution 报告 design legacy；文档无相反表述。
- 完成条件：状态语义在代码、测试与文档一致。

### P4 文档与事实一致（W3）

#### T4.1 维护文档归属政策

- 文件：.template-source/README.md、.template-source/process/template-engineering-overview.md、.template-source/process/runtime-storage.md、README.md。
- 步骤：明确 docs/superpowers/specs 与 plans 是模板源在办设计/计划工作区；允许 draft/reviewed/active；完成后计划迁仓外 maintenance，长期依据迁 .template-source/contracts 并进入索引；补充 docs/ 项目结构说明的例外与边界。
- 验证：文档事实检查与治理布局检查通过；新表述与 W3-D2 检查规则一致。
- 完成条件：政策文本不再与运行材料留存规则冲突。

#### T4.2 文档元数据、事实更新与 contracts 索引

- 文件：7 个既有 docs/superpowers 附件、本规格、本计划、新增 .template-source/contracts/README.md。
- 步骤：
  1. 为 docs/superpowers 下文档补 frontmatter：doc_type、status、baseline_commit（40 位且存在）、created_at、moved_to/superseded_by（完成或取代时）、owner（可选）。
  2. 按实际实现状态分类：检查各计划的任务勾选、相关提交与验证证据；已完成且验证的标 completed 并记录 moved_to（迁移到仓外 maintenance）；部分实现标 active；被新方案取代标 superseded 并指向取代者；待实施标 draft/reviewed。不得把文档存在当作完成证据。
  3. 更新过期数字与状态：135 项 fast / 16 slow、公开导出与退役检查的当前红点、pin 2.5.0、README 与预算检查已通过等。
  4. contracts README：文件、类型、状态、基线、最近复核时间；19 个历史文件按现有内容与历史用途登记，不重写历史结论；对快照类文档加基线说明。
  5. 修改前把 4 个既有未跟踪文档复制到仓外 maintenance 目录并记录 SHA-256；修改失败可恢复。
- 验证：scripts/verify-maintenance-docs 退出 0；索引覆盖 contracts 全部文件；docs 无过期计数；git diff 可逐文件审阅。
- 完成条件：7 个既有文档 + 本规格 + 本计划均有可核验元数据；完成或取代项有迁移目标。

#### T4.3 维护文档检查实现

- 文件：新增 .template-source/process/maintenance-docs.json、scripts/lib/maintenance-docs.mjs、scripts/verify-maintenance-docs、tests/maintenance-docs.test.mjs。
- 步骤：
  1. config 声明扫描目录（docs/superpowers/specs、docs/superpowers/plans）、状态枚举、contracts 索引路径、允许的 doc_type。
  2. 检查 frontmatter 完整性、status 枚举、baseline_commit 40 位且 git cat-file 存在、且为 HEAD 祖先；completed/superseded 必须有 moved_to 或 superseded_by 且目标存在（仓内路径或 maintenance: 引用）；contracts README 覆盖 contracts 下除 README 外全部文件；allowlist/索引缺项失败。
  3. 测试覆盖：缺字段、非法 status、非 40 位 SHA、非祖先、索引漏项、completed 无迁移目标分别失败；历史 contracts 文件不在 frontmatter 强制范围。
- 验证：scripts/verify-maintenance-docs 退出 0；node --test tests/maintenance-docs.test.mjs 通过；fixture 反例失败。
- 完成条件：检查可作为 check.maintenance-docs 草案交付 P5。

#### T4.4 文档事实与单一来源修复

- 文件：.template-spec/process/lifecycle-registry.yaml、scripts/verify-lifecycle-registry 或其现有测试、.template-source/agents/skills-maintenance.md、.template-source/process/template-engineering-overview.md、.template-spec/user-guide/unified-cli.md、.template-source/contracts 中 3 个快照类文档、scripts/lib/doc-facts.mjs、scripts/lib/doc-facts-patterns.json、tests/doc-facts.test.mjs。
- 步骤：
  1. 修正 evidence.maintenance-intensity-checkpoint 的 description 中 L1/L2/L3 为 L1/L2；在 verify-lifecycle-registry 或现有测试增加断言：该字段不出现未在 maintenance-intensity.yaml 定义的级别。
  2. 投影事实改为：模板源只生成 .claude/skills；.codex/.cursor/.pi 不生成投影；实例投影根由 skills-lock.json 的 projectionRoots 声明，最多四个。
  3. unified-cli.md 删除硬编码 CLI 版本，改为链接 yss-cli-pin.json 并说明以该文件为准；doc-facts 增加 pinFacts 规则：在指定文档中出现 yss 版本号时必须等于 pin 的 version，扩展 doc-facts.mjs 与测试。
  4. 对 architecture-iteration-v1.md、governance-core-layering-design.md、harness-hardening-v1.md 加历史基线说明或更新已过期数字；不重写历史结论。
  5. 按 contracts 索引复核孤儿文档，无消费者的旧设计经授权迁 maintenance 并保留摘要。
  6. 将新增维护文档、contracts README 与现有相关文档加入 check.doc-facts 的 input_patterns（P5 注册），使文档变更选中事实检查。
- 验证：scripts/verify-doc-facts 退出 0；node --test tests/doc-facts.test.mjs 与 registry 测试通过；pinFacts 反例失败；文档无新增断链。
- 完成条件：文档事实由检查或单一来源约束，历史快照有基线标识。

#### T4.5 分发面路径卫生

- 文件：新增 .template-source/process/distribution-hygiene-allow.json、scripts/lib/distribution-hygiene.mjs、scripts/verify-distribution-hygiene、tests/distribution-hygiene.test.mjs；修改 .agents/skills/yss-design-system/SKILL.md。
- 步骤：
  1. 扫描实例分发面：.agents/skills/**、.template-spec/**，排除 .template-spec/engineering/evidence/**；根文件按 bundle-profile allowRootFiles 补充；检测宿主绝对路径 /Users/、/home/、/private/、Windows 盘符与 Agent root 路径 .codex/skills 等。
  2. 允许清单仅登记历史 evidence 与测试夹具中的宿主路径（archify/test/release-package-gates.test.mjs 的 Windows 期望路径），每条写原因；扫描面消失的 allowlist 条目报告 stale。
  3. 修复 yss-design-system/SKILL.md 的历史输入包路径为可移植描述；接受当前仅 2 处命中的基线并把修复后降至 1 处允许。
  4. 测试：注入绝对路径失败；allowlist stale 报告；不修改 evidence 原字节。
- 验证：scripts/verify-distribution-hygiene 退出 0；node --test tests/distribution-hygiene.test.mjs 通过。
- 完成条件：分发面无未允许宿主路径；检查可作为 check.distribution-hygiene 草案交付 P5。

### P5 策略注册与防回归加固（W4）

#### T5.1 集中注册新检查、路由与 Gate

- 文件：.template-source/process/template-verification-profiles.yaml（单次编辑，Lead 独占）；新增 tests/verification-policy-baseline.test.mjs、.template-source/process/verification-policy-baseline.json。
- 步骤：
  1. 新增 fast 检查：check.public-skill-export（skills/G03）、check.retired-skill-ids（skills/G03 与既有 G11 绑定保留）、check.profile-consistency（hygiene/G03）、check.maintenance-docs（hygiene/G04）、check.distribution-hygiene（hygiene/G18）、check.verification-policy-baseline（candidate-integrity/G20）。
  2. 路由：新增新测试文件的路由条目（public/retired 归 skills，profile-consistency 归 hygiene，maintenance-docs 与 distribution-hygiene 归 hygiene，policy-baseline 归 candidate-integrity）；新 scripts、.template-source 文件已由既有规则覆盖。
  3. Gate：向 G03、G04、G18、G20 的 check_ids 追加对应 check id；不删除、不替换既有绑定。
  4. doc-facts：把 docs/superpowers 全部在办文档、contracts README、修复后的相关文档加入 check.doc-facts 的 input_patterns。
  5. 清理 check.frontend-removed 死输入路径（若 T2.2 未完成）。
  6. 策略基线：写入 release 8 项 required_checks、19 个 Gate 的 id/display_id/required_at_release、4 个 CI 守卫 check id 绑定、fast 检查总数；测试断言当前策略是基线超集，删除或减少即失败；更新基线必须显式修改该文件。
  7. 注册 check.verification-policy-baseline（run 为 node --test tests/verification-policy-baseline.test.mjs，输入策略、基线、测试；G20）。
- 验证：node --test tests/verification-gates.test.mjs tests/verification-selection.test.mjs tests/ci-gate.test.mjs 通过；scripts/verify-template-fast --plan 对新文件与典型改动成功选择；validateGateConfiguration 通过；CI 守卫仍为 4 项。
- 完成条件：所有新检查按输入选中且恰好一次；策略无减少；没有未知路径。

#### T5.2 通用超时

- 文件：.template-source/scripts/lib/verification-execution-plan.mjs、loadVerificationProfiles 校验、.template-source/process/template-verification-profiles.yaml、.template-source/process/github-workflows.md、相关测试。
- 步骤：
  1. compileVerificationCheck 保留 timeout_ms；loadVerificationProfiles 校验 timeout_ms 为正整数或 0（0 表示无超时，兼容旧行为）；不改变既有检查命令。
  2. 先运行一次代表性 fast 报告（--report-dir 仓外新目录），提取每个选中任务的 duration_ms；根据实际耗时确定默认值：普通检查默认 300000 毫秒，任何实测超过 240 秒的任务显式登记 timeout_ms 600000 或保留 0 并写原因；不得无数据拍板。
  3. 增加测试：timeout_ms 透传到执行计划；运行器对超时 fixture 返回 124 并保留日志；0 值保持无超时；非法值失败。
  4. 更新 github-workflows.md：普通检查超时改为实际默认值与例外；只有 slow 步骤的 5 分钟限制继续单独描述。
- 验证：相关测试通过；超时 fixture 证据可读；代表性 fast 运行通过集合不因超时改变。
- 完成条件：文档与实现一致，不再宣称未实现的硬上限。

#### T5.3 Node 声明对齐

- 文件：package.json；README.md 或验证说明。
- 步骤：根 package.json engines.node 改为 >=24 <25；.nvmrc 与 scripts/ci-setup 保持 24；tooling/node/package.json 保留自身范围并在文档说明差异；不修改验证预检的 Node 24 要求。
- 验证：scripts/ci-gate 的 node-engines 检查通过（或 tests/ci-gate.test.mjs 对应断言）；node --test tests/ci-gate.test.mjs 通过；Node 24 本地预检通过。
- 完成条件：三处声明一致，Node 22 在预检阶段明确失败。

### P6 终检与交付

- 步骤：
  1. 在隔离 worktree 运行 scripts/verify-template-fast --plan，记录所选命令与 selection.omitted。
  2. 执行所选命令；另外运行新增测试与定向检查：公开导出构建、退役扫描、profile-distribution、profile-consistency、doc-facts、maintenance-docs、distribution-hygiene、policy-baseline、sync-skills --check、update-skill-lock --check、verify-skill-registry、verify-skill-governance、verify-doc-facts、harness-metrics --check-budget、verify-governance-layout、git diff --check。
  3. 记录实际退出码、cwd、日志与 limited 范围；未执行的 release、CI 远程、公开仓 freshness、平台验收逐项说明。
  4. 对比原工作树：未跟踪文档与本地修改未被覆盖；worktree 改动可逐批审阅。
  5. 报告阶段结论：可合并候选状态、遗留风险、回滚点；不提交、不推送、不发布。
- 完成条件：所有适用检查真实通过或如实失败；证据可定位；用户可决定是否授权提交/PR。

## 5. 验证矩阵与 AC 对照

| 规格 AC | 覆盖任务 | 验证证据 |
|---|---|---|
| AC-01 公开导出通过、反例失败 | T1.1、T1.2、T5.1 | export 构建/--check；tests/public-skill-export.test.mjs |
| AC-02 退役扫描转绿、单一来源、反例可检测 | T2.2、T5.1 | verify-retired-skill-ids；tests/retired-skill-ids.test.mjs |
| AC-03 两项检查被 fast/G03 选中且不放宽 | T5.1 | --plan；validateGateConfiguration；CI 守卫断言 |
| AC-04 Profile active/legacy 可验证 | T2.1、T3.1 | verify-profile-distribution；profile-tree 测试 |
| AC-05 现役组合一致 | T3.1 | tests/profile-consistency.test.mjs |
| AC-06 陈旧排除项处置且 shipped 无漂移 | T3.2 | verify-profile-distribution；shipped 对比 |
| AC-07 维护文档元数据/索引/基线 | T4.2、T4.3 | verify-maintenance-docs；tests/maintenance-docs.test.mjs |
| AC-08 文档事实修复 | T4.4、T5.1 | verify-doc-facts；registry 断言；pinFacts 测试 |
| AC-09 分发面无未允许宿主路径 | T4.5、T5.1 | verify-distribution-hygiene；tests/distribution-hygiene.test.mjs |
| AC-10 棘轮/超时/Node 一致 | T5.2、T5.3 | policy baseline 测试；timeout fixture；node-engines |
| AC-11 实际执行与真实结果 | P6 | --plan、退出码、日志、limited 报告 |
| AC-12 用户工作与历史资产保护 | P0、P6 | git status/diff、未跟踪文档摘要对比 |

## 6. 并行执行与写范围

- 推荐单 Agent 顺序执行 P0→P6；如需并行，按以下互斥写范围：
  - Worker A：P1（两个技能文档、export-skills、导出测试、两个 Profile 锁）。
  - Worker B：P2（profile-status、skill-retirement、策略文件、退役测试）。
  - Worker C：P4（docs/superpowers 文档、contracts README、doc-facts、distribution-hygiene、政策文本）。
  - Lead 独占：.template-source/process/template-verification-profiles.yaml、tests/verification-selection.test.mjs、tests/ci-gate.test.mjs、verification-policy-baseline 与 P5/P6；所有 Gate/路由注册由 Lead 在 P5 一次完成。
- 共享 hot 文件：template-verification-profiles.yaml、两个 Profile 锁、package.json、docs/superpowers 文档。任何并行任务不得同时写这些文件；Task 0 与 P4 的文档写范围归同一 owner。
- 每个并行任务在共享任务板登记写范围、依赖与验收；Lead 合并后统一运行 P6。

## 7. 风险、失败模式与回滚

| 风险/失败 | 触发 | 缓解 | 回滚 |
|---|---|---|---|
| 新检查未注册导致 plan 拒绝未知路径 | 新文件先出现、策略未更新 | P5 集中注册；此前只用 node --test；注册后先 --plan | 补路由或回退策略文件 |
| 退役扫描误报或漏报 | 99 个 ID 含通用词、历史文档多 | 模式分区 + allowlist 原因 + 硬检查独立；总分区覆盖测试 | 恢复旧脚本与检查绑定，保留新 lib 调查 |
| 修改 canonical 技能导致 Profile 锁/测试失败 | T1.1 后未刷新 effectiveHash | T1.3 强制重算；P6 再验 | 回退技能文档与锁，重算一次 |
| 清理 excludePaths 改变实例分发 | 误删真实排除项 | 分类 + shipped 前后对比 + fixture | 还原两个 manifest |
| 文档迁移丢失历史 | 移动 tracked 文档/覆盖未跟踪文档 | 先备份到 maintenance 并记录摘要；git mv 保留历史 | 从备份或 git 恢复；不改写历史提交 |
| 维护文档检查过严阻断活跃计划 | 所有历史 contracts 强制 frontmatter | contracts 以索引为元数据；只强制 docs/superpowers | 调整配置与测试，不放宽基线祖先等核心断言 |
| 超时默认误杀长检查 | 默认值过低 | 先测量再定默认；例外显式登记 | 调整 timeout_ms 并重跑受影响检查 |
| Node 声明变更影响本地环境 | 本地仍用 Node 22 | 文档明确 Node 24 验证基线；tooling 保留自身范围 | 恢复 engines 或升级本地 Node |
| 政策注册与既有测试冲突 | 选择结果、Gate 绑定或计数变化 | 集中注册后先跑 verification-gates/selection/ci-gate 测试 | 回退策略文件到上一版并逐项重加 |

## 8. 边界与授权

- Always：先 --plan、用现有 lib 与测试风格、记录真实退出码、修改前备份用户文档原字节、使用隔离 worktree。
- Ask first：提交、推送、打 tag、发布、刷新公开技能仓、安装外部工具、删除 tracked 历史文档、调整 timeouts 以外的发布放行集合。
- Never：删除失败测试或放宽阈值、手改报告或历史证据、把 limited 当 release、覆盖用户未跟踪修改、反向覆盖 canonical 技能、把 design legacy 提回 active。

## 9. 交付物

1. 本计划文件 docs/superpowers/plans/2026-10-19-risk-remediation-plan.md（Task 0）。
2. 整改规格状态更新（reviewed）。
3. P0-P6 实际执行的代码、测试、策略与文档改动（在隔离 worktree，未提交）。
4. 终检报告：命令、cwd、退出码、日志、limited 范围、未覆盖边界与回滚点。

## 10. 自检

- [ ] 规格三个问题组与 12 项 AC 均有任务和验证证据
- [ ] 公共接口、schema、数据流变化已列出（导出器、扫描策略、Profile 状态、维护文档、分发卫生、策略基线、timeout、Node）
- [ ] 边界条件与失败模式覆盖：未知路径、锁哈希、陈旧排除、文档迁移、超时、Gate 绑定
- [ ] 未减少 required checks、Gate、CI 守卫
- [ ] 用户工作保护、提交/发布授权边界明确
- [ ] 并行写范围互斥，hot 文件集中由 Lead 注册
