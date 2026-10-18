---
doc_type: maintenance-design
status: reviewed
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-19
scope: skill-supply-chain, profile-convergence, documentation-alignment, policy-hardening
---

# 风险整改规格：技能供应链、Profile 双轨与文档事实

版本：v0.1.0。状态：已审阅（reviewed）；实施计划见 [2026-10-19 风险整改实施执行计划](../plans/2026-10-19-risk-remediation-plan.md)。本文不表示实现、提交或发布已批准。

- 维护强度：L2（触发项：core-validator、generation-semantics、release-semantics、lifecycle-gate、template-structure）。
- 基线：template-source，main @ e1337581（2026-10-19 00:41 CST），yss-cli pin 2.5.0 / 212698b3。
- 输入证据：仓内分析报告 .work/analysis/2026-10-19-yss-template-source-project-analysis/REPORT.md；分析期间 HEAD 曾从 main@5041d154 切到 codex 分支再合回 main@e1337581，实施前必须重新核对。
- 本规格只提出整改设计与验收条件，不包含实现、提交、推送或发布授权。

## 0. 先回答读者当前需要判断的问题

当前模板源有三个需要在本轮收敛的问题：技能供应链的两个红点（公开导出失败、退役 ID 检查失败且无门禁覆盖）、旧 Profile 与内核的双轨漂移、维护文档事实与边界漂移。本轮按「先恢复可观测的真实失败，再收敛边界，最后固定防回归」整改，不减少任何现有放行标准，不新增验证框架或跨轮缓存。

完成后应能观察到：公开技能导出构建通过并进入受影响检查；退役 ID 检查由注册表声明的单一来源驱动并转绿；Profile 有显式 active / legacy 语义且现役组合一致性由检查固定；维护文档有状态、基线与索引；文档事实中的计数、版本、投影根和本机绝对路径由现有检查或新增最小检查发现。

## 1. 目标与非目标

### 1.1 目标

- G1 技能供应链红点清零：公开导出构建通过；退役 ID 检查可区分真伪并转绿；两项进入现有 fast / Gate 影响面，不再依赖人工记忆。
- G2 Profile 边界收敛：active / legacy 显式声明；现役 Profile 的组合技能、注册表、锁和分发清单由可复现检查覆盖；陈旧排除项得到分类处置。
- G3 文档与事实一致：在办维护文档有生命周期元数据与索引；计数、CLI 版本、投影根、生命周期分级等事实不再互相矛盾；本机绝对路径不进入实例分发面。
- G4 防回归：策略棘轮、通用超时和 Node 版本声明与实际验证运行器一致；新增检查不减少既有 required checks、Gate 或 CI 守卫。

### 1.2 非目标

- 不做跨 Profile 生命周期稳定 ID 的完整对齐与迁移映射（本轮只记录冲突证据，另立设计）。
- 不刷新 iloveZzz/yss-spec-dev-skills 公开仓，不执行提交、推送、打 tag、创建 Release 或安装。
- 不做全仓测试覆盖补齐、不重构验证调度器、不引入缓存或新的验证档位。
- 不清理 Git 历史与仓库体积，不调整 CLI pin（除现有 pin 文件已固定的事实），不删除历史批准或历史证据。
- 不追平所有文档的叙事时效；只处理本轮涉及的事实与边界。

### 1.3 假设

1. 实施使用隔离 worktree，起点为记录在本规格元数据中的基线提交；用户当前未跟踪文档和本地修改保持原字节，除非另有授权。
2. 公开技能发布仓在本轮不要求联网核验；CI 只做构建与链接/凭据/可移植性验证，发布仓的 freshness check 保留为发布前人工步骤。
3. design Profile 处于旧线维护状态，本轮冻结而不迁移 schema v3；活跃产品线为 spec 内核与 backend 覆盖层。
4. 当前红点可在基线重新复现；若 HEAD 已变化，先重跑证据命令，按实际结果修正结论后再实施。
5. 不新增运行时依赖；仅使用 Node 内置模块、现有测试框架和现有工具库。

## 2. 能力地图

| 模块 id | 责任 | 依赖 | 可独立交付 |
|---|---|---|---|
| W1-skill-supply-red | 导出链接修复、公开导出检查、退役 ID 单一来源与检查 | 无（退役检查的 legacy 放行依赖 W2-profile-status） | 是 |
| W2-profile-status | Profile active/legacy 声明、现役组合一致性、陈旧排除项分类 | W1 的退役 ID 扫描接口（allowlist 需要 legacy 标记） | 部分（status 可先交付） |
| W3-doc-fact-alignment | 维护文档归属与元数据、文档事实修复、分发面路径卫生 | W2 的 legacy 结论（文档需要描述） | 是 |
| W4-policy-hardening | 策略棘轮、检查超时、Node 版本声明一致 | W1 / W2 / W3 的新检查与文档 | 否（最后一批） |

构建顺序：W1（链接与导出检查）→ W2（status 标记）→ W1（退役扫描）→ W2（组合一致性与陈旧排除）→ W3 → W4 → 终检。W1 与 W2 的接口在 batch 边界交付，不并行修改同一文件。

## 3. 当前事实与问题

以下均按基线 e1337581 的只读核验收录；标记「已复现」的结论可直接作为验收反例，标记「推断」的实施前需再次确认。

| 编号 | 现状 | 证据 | 影响 |
|---|---|---|---|
| E1 | 公开导出构建失败 | scripts/export-yss-skills --check --output /tmp/yss-export-check 退出 1，报错「link escapes public export: yss-layered-mvc-scaffold-generator/SKILL.md -> ../../../.template-spec/engineering/backend-platforms.md」 | 公开技能仓无法刷新；发布流程被阻断 |
| E2 | 第二处越界链接由 df11bfb6 新增 | .agents/skills/yss-product-lifecycle/references/daily-delivery.md 第 25 行链接到 ../../../../.template-spec/process/daily-input-preparation.md | 与 E1 同类，入口技能受影响 |
| E3 | 退役 ID 检查失败 | scripts/verify-retired-skill-ids 退出 1，输出 216 行命中；脚本内建清单 55 个 ID，canonical OBSOLETE 实测 99 个 | 真正的退役回流不可信，门禁噪声高 |
| E4 | 扫描器 allowlist 有实现缺口 | allowed 判断只匹配 relative.includes("/tests/")，根 tests/ 文件不命中；合同正文、identity.yaml、profile 旧状态等未登记 | 误报来源明确，需按来源逐项修正而不是整体放宽 |
| E5 | 注册表已声明单一来源 | .template-spec/agents/yss-skill-registry.yaml 的 retirement_contract 写有 retired_id_source: scripts/lib/skill-supply-chain.mjs#OBSOLETE | E3 的本地清单与该合同冲突，应以合同为准 |
| E6 | 旧 Profile 双轨 | design 覆盖层 registry 仍 schema_version 2；design lock 的 25 个 shared 技能含已退役 ask-matt；design lock 的 25 个 shared 技能含已退役 ask-matt；backend 覆盖层对 8 个内核技能做同名覆盖、另新增 4 个内核不存在的 profile-local 技能；backend 组合目录技能、锁、注册表均为 61 项 | 旧线和新线的验证语义不同，但没有显式声明；同名覆盖与 profile-local 技能缺少组合一致性检查，内核变更不会自动传导 |
| E7 | design 锁校验被隐式跳过 | tests/profile-tree.test.mjs 的现役 Profile 锁测试以 name !== "design" 过滤 | 跳过没有合同依据，新增 Profile 可能被静默漏检 |
| E8 | 分发清单存在陈旧排除项 | 按当前文件存在性初筛，backend 109 条 excludePaths 中 31 条、design 192 条中 44 条在模板源不存在；其中部分可能是实例侧合法排除 | 陈旧项与真实排除混在一起，容易误判分发行为 |
| E9 | 维护文档边界含糊 | docs/superpowers 有 3 个 tracked、5 个 untracked 计划/设计（含本规格）；.template-source/README.md 要求运行材料存仓外 maintenance | 归属与生命周期不清，旧规划没有被清理的机制 |
| E10 | 文档事实漂移 | 未跟踪计划仍写 135 项/6 slow、README 文档事实/预算失败待修；基线 6f8f19d5/900e386c 已落后；contracts 中部分快照数字过期；lifecycle-registry.yaml 的 maintenance-intensity-checkpoint description 仍写 L1/L2/L3 | 下一轮 Agent 可能按过期事实实施 |
| E11 | 投影事实与代码不一致 | skills-maintenance.md 与 template-engineering-overview.md 宣称 .codex/.cursor/.pi 是生成投影；模板源实际只生成 .claude/skills，实例投影根由锁声明 | 文档与实现互相矛盾，影响技能维护判断 |
| E12 | CLI 版本硬编码过期 | .template-spec/user-guide/unified-cli.md 仍写 1.3.5；当前 pin 为 2.5.0 | 用户按错误版本操作 |
| E13 | 分发面绝对路径 | git grep 检出 83 个受跟踪文件含 /Users/ 路径；多为 scaffold evidence 日志，另含分发技能 yss-design-system/SKILL.md | 进入实例后路径不可解析；历史证据需要显式白名单 |
| E14 | 验证策略缺少防自指机制 | 策略文件既是规则又是被验证对象；required_checks/Gate 数量无棘轮 | 一次提交可能同时削弱映射和放行集合而自洽通过 |
| E15 | 超时能力与文档不一致 | 运行器支持 timeoutMs 并映射退出码 124，但 compileVerificationCheck 不保留 timeout_ms，策略中也没有超时字段；文档宣称 5 分钟硬上限只对 slow 步骤生效 | 普通检查可能长期挂起，只能靠 job timeout |
| E16 | Node 声明与实际要求不一致 | 根 package.json engines.node 为 >=22，.nvmrc 与 ci-setup 为 24，验证预检要求 Node 24 | 本地 Node 22 可以通过声明检查却在预检失败 |

推断项：E8 的具体陈旧/合法分类需要在实施时逐条核对；E13 的 83 个文件中 evidence 日志占比需要在实施时确认；跨 Profile 生命周期 ID 冲突（root 已弃用 intensity-aware-review 等，design/backend 仍有当前条目）本轮只登记为后续设计，不在本轮整改范围。

## 4. 整改原则与边界

### 4.1 原则

1. 以合同和事实源为准：retirement_contract 已声明的 retired_id_source 优先于脚本内本地清单。
2. 只增不放：不减少 required checks、Gate、CI 守卫或既有行为断言；移动检查归属需要同时保留原 Gate 责任并记录理由。
3. 历史只读：退役、迁移、历史证据与旧 Profile 内容保留原义；不允许用统一删除获得通过。
4. 先修复接入，再补检查：已有脚本能验证的行为先接入现有门禁；只有确认现有检查未覆盖时才新增最小检查。
5. 能机械判定的才自动化：文档计数、路径、版本、集合一致性可以检查；语义叙事不做脆弱的字符串禁令。
6. 在办与归档分离：在办维护文档有状态和基线；完成或废弃的文档按规则迁移，不长期留在工作树制造漂移。
7. 证据真实：fast 始终 limited；未执行、超时、跳过如实记录；不以局部通过声明发布就绪。

### 4.2 Always / Ask first / Never

- Always：先运行 scripts/verify-template-fast --plan 并记录计划；使用现有 lib、测试与夹具风格；记录实际命令、cwd、退出码与未覆盖边界；改动前核对用户未跟踪文件的原字节。
- Ask first：修改 docs/superpowers 下用户未跟踪文档；调整 required_checks、Gate、CI 守卫或 timeout 默认值；修改分发清单 excludePaths；删除或迁移 tracked 历史文档；提交、推送、发布。
- Never：反向覆盖 canonical 技能；删除失败测试或放宽阈值；手改验证报告或历史证据；把 limited 报告当作 release 证据；在用户未授权时改写本地修改。

## 5. 方案

### 5.1 W1 技能供应链红点清零

#### W1-D1 越界链接可移植化

规则：公开导出包内的 Markdown 链接只能指向 .agents/skills 内的目标；跨根或模板内部知识以普通文本引用（可带路径文字，但不写 Markdown 链接），避免导出器把可移植性检查变成豁免竞赛。不通过把外部文件复制进技能目录来绕过。

变更：
1. .agents/skills/yss-layered-mvc-scaffold-generator/SKILL.md 第 22 行：把指向 .template-spec/engineering/backend-platforms.md 的 Markdown 链接改为普通文本引用，并说明公开包不携带模板内部资产。
2. .agents/skills/yss-product-lifecycle/references/daily-delivery.md 第 25 行：同上，改为普通文本引用；保留对 daily-input-preparation 的内容说明，不依赖链接存在性。

验收：scripts/export-yss-skills --output 新建仓外目录 退出 0；导出目录中不再出现 link escapes / broken internal link；两处链接消失且语义保留。

#### W1-D2 公开导出检查与测试

设计：
1. 为 scripts/lib/export-skills.mjs 增加可测试入口：exportSkills(argv, { root = ROOT, sourceRoot = SOURCE_ROOT } = {}) 或等价的注入参数；默认参数保持现有 CLI 行为。内部校验函数（链接、凭据、绝对路径、禁止文件）抽出为可独立调用的纯函数。
2. 新增 tests/public-skill-export.test.mjs：
   - 正向：用真实 canonical 根构建完整公开导出到临时目录，断言退出成功且生成 skills、skills.sh.json、.yss-export-manifest.json。
   - 反例：fixture 技能树包含越界链接、失效链接、符号链接、禁止文件、疑似凭据、绝对路径，逐项断言失败且错误信息可定位。
   - 隔离：临时目录置于 os.tmpdir()，t.after 清理；不写仓库与公开仓。
3. 在 .template-source/process/template-verification-profiles.yaml 的 fast 清单新增 check.public-skill-export：run 为 node --test tests/public-skill-export.test.mjs；group 为 skills-policy；input_patterns 至少覆盖 .agents/skills/**、yss-public-skills.json、scripts/lib/export-skills.mjs、scripts/export-yss-skills、tests/public-skill-export.test.mjs；Gate 绑定 check.verification-skills（G03）。保持其他放行集合不变。
4. 发布仓 freshness check（对已有导出目录执行 --check）保留为发布任务或人工步骤，不进入 CI；在本规格中记录为已知覆盖边界。

验收：新测试在修复前对 fixture 反例失败、修复后通过；--plan 对上述输入选中 check.public-skill-export 恰好一次；G03 配置通过 validateGateConfiguration；运行时长记录在报告中，超过 60 秒才标 tier: slow。

#### W1-D3 退役 ID 单一来源

设计：
1. 新增 scripts/lib/skill-retirement.mjs，导出：
   - retiredSkillIds()：从 scripts/lib/skill-supply-chain.mjs 的 OBSOLETE 派生，允许保留 teach、yss-components 两个正则特例。
   - scanRetiredSkillIds({ root })：返回 violations，含路径、行号、命中文本、来源规则。
   - allowedRetiredReference(relative, line, { profileStatus })：集中维护历史与合同白名单。
2. scripts/verify-retired-skill-ids 改为薄包装；删除本地 55 项清单，改由 retiredSkillIds() 提供。允许清单修正至少包括：
   - 根 tests/**（修复 relative.includes("/tests/") 不匹配根 tests 的缺口）。
   - .template-spec/process/orchestration/core/identity.yaml 的 retired_shared_skills 正文。
   - 说明退役事实的 contracts、skill-migrations.md、历史插件 legacy JSON。
   - profiles/design 等 legacy Profile 的旧内容：仅当 profile-status 标记为 legacy 时允许，标记变化即失效。
   - fixtures / 历史证据 / wiki 等已存在的允许项。
3. 新增 tests/retired-skill-ids.test.mjs：
   - 唯一来源：断言脚本与 lib 使用同一集合，集合大小与 OBSOLETE 一致；不得存在第二份本地 ID 清单。
   - 真实检测：fixture git 仓库中放活跃文件含退役 ID，scan 返回违规；放允许清单中的历史文件不返回违规。
   - 回归：用当前仓库运行 scan，结果必须为空。
4. 注册 check.retired-skill-ids：run 为 node --test tests/retired-skill-ids.test.mjs；group 为 skills-policy；input_patterns 覆盖 .agents/skills/**、.template-spec/agents/**、profiles/**、scripts/lib/skill-supply-chain.mjs、scripts/lib/skill-retirement.mjs；Gate 在 check.verification-skills（G03）增加同一 check id，同时保留实现门禁（G11）的现有绑定，不新增重复命令。

验收：scripts/verify-retired-skill-ids 退出 0；fixture 反例返回 1；--plan 对技能与 Profile 改动选中新检查；G03/G11 配置通过；允许清单中不存在无归属的目录级放行。

#### W1-D4 门禁与成本边界

不扩大 CI 守卫集合（--ci-guards）是默认决策；两项检查通过 fast 输入选择与 G03 绑定生效。若实测导出检查在 CI 守卫场景超过 60 秒，先优化临时目录与文件遍历，再考虑 tier: slow；不得为省时间删除断言或改为非阻断。

### 5.2 W2 Profile 双轨收敛

#### W2-D1 Profile 生命周期声明

设计：
1. 新增 .template-source/process/profile-status.yaml（模板源内部，不进入实例），schema 固定：
   - schema_version: 1
   - profiles:
     - spec: status kernel
     - backend: status active
     - design: status legacy，附 reason 与 migration 说明（旧实例显式迁移，保留历史读取，不再新增功能）。
2. 新增 scripts/lib/profile-status.mjs 读取并校验该文件：枚举合法 status（kernel / active / legacy），spec 内核与 profiles/<name> 的每个 Profile 必须有条目，legacy 必须写 reason，不允许未知字段。
3. 在 scripts/lib/profile-distribution.mjs 中集成状态校验，由 scripts/verify-profile-distribution 报告 status 缺失、未知值、active 无覆盖层、legacy 无原因；不单独新增验证入口，除非后续证明需要独立诊断。
4. 消费者更新：
   - tests/profile-tree.test.mjs 改为按 status 选择 active 断言；design 的跳过改为「仅当 status 为 legacy 且 reason/migration 非空」，新增反例测试：删除标记或改成 active 时失败。
   - tests/profile-distribution.test.mjs 的 fixture 增加 status 文件，保持现有语义。
   - 文档（skills-maintenance、template-engineering-overview、README）写明 active / legacy。

验收：scripts/verify-profile-distribution 退出 0；标记缺失、未知 status、active 无覆盖层、legacy 无原因均失败；profile 测试按标记生成断言，不再硬编码 design 名称。

#### W2-D2 现役 Profile 组合一致性

设计：新增 tests/profile-consistency.test.mjs（并登记为 check.profile-consistency，group skills-policy，Gate 按影响面绑定 check.verification-skills 或 governance-syntax）：
1. 对每个 active Profile 用 composeProfileTree 组合目录。
2. 断言以下四个集合一致：组合树中的物理技能目录、skills-lock.json 的 shared + platform 键集合、yss-skill-registry.yaml 的 skills 声明集合、覆盖层与内核声明的技能路径集合（忽略 .DS_Store）。
3. 断言集合无 OBSOLETE 成员。
4. 断言组合目录 shared 技能的 effectiveHash 等于组合后技能树的实际哈希；同名覆盖不禁止，但必须由覆盖层锁/注册表登记并让组合内容参与哈希，未登记覆盖失败。当前 backend 的 61 项组合技能、锁、注册表已一致，可作为正向基线。
5. backend 的 4 个 overlay-only 技能（architecture-agent、backend-agent、harness-orchestrator、test-agent）作为合法 profile-local 技能保留；文档写明它们属于 backend 覆盖层 canonical，不是内核漂移。
6. 当前基线事实：backend 组合技能、锁、注册表各 61 项，effectiveHash 全部一致；design 为 25/25/25 且含 ask-matt（legacy 豁免）；组合树中的 .DS_Store 不参与集合断言。
7. legacy Profile 不要求 schema v3；仅验证 status、分发清单与退役扫描豁免。

验收：backend 通过；fixture 中增加未登记技能、未登记的同名覆盖、active Profile 的 OBSOLETE 成员分别失败；运行成本记录（组合目录与解析均在进程内，不启动固定 CLI）；不改变实例分发内容。

#### W2-D3 分发清单陈旧排除项

设计：
1. 扩展 scripts/lib/profile-distribution.mjs：新增模块级 allowlist INSTANCE_ONLY_EXCLUDES（按 Profile 分组，路径或前缀 + 原因），只登记确实只在实例侧存在、模板源无需存在的路径（例如 docs/reviews、docs/adr、用户本地配置）。
2. evaluateProfile 增加 finding：excludePaths 中的条目若在当前组合树中不存在、也不在 allowlist，记作 stale-exclude-path；allowlist 条目若已在模板源存在则记作 stale-allowlist（自身过期）。
3. 清理当前清单：逐条分类 backend 31 条、design 44 条初筛缺失项；能证明实例侧合法者进入 allowlist 并写原因，其余删除；不得批量删除整类路径。
4. 增加回归测试：stale-exclude-path、stale-allowlist、以及 shipped 判定在清理前后对真实存在路径保持一致（避免误改分发边界）。

验收：scripts/verify-profile-distribution 退出 0；fixture 反例分别失败；真实路径的 shipped 结果与清理前一致；manifest diff 只包含已分类条目。

#### W2-D4 design legacy 冻结

design 保持现有 schema v2 注册表与旧技能内容，不迁移、不删除；通过 W2-D1 标记 legacy，并在 skills-maintenance、template-engineering-overview、README 与 profiles/design/README.md 写明迁移边界。退役扫描对 design 旧文本的允许以 legacy 标记为前提。legacy 的最终退役（移除目录或迁移 v3）另立计划，不混入本轮。

### 5.3 W3 文档与事实一致

#### W3-D1 维护文档归属与生命周期

推荐决策（方案 A）：保留 docs/superpowers/specs 与 docs/superpowers/plans 作为模板源「在办维护文档」工作区，但补上生命周期：
- 允许存在的：状态为 draft、reviewed 或 active 的设计/计划，必须有元数据（见 W3-D2）。
- 完成、废弃或被取代后：计划移入仓外 maintenance 命名空间（使用 scripts/maintenance-path 取路径并保留摘要）；需要长期作为依据的设计结论迁入 .template-source/contracts/ 并进入索引。
- .template-source/README.md、.template-source/process/template-engineering-overview.md、runtime-storage.md 与 README 的项目结构说明同步写明该例外与生命周期，消解「docs 属于实例资产 / 运行材料存仓外」的现有矛盾。
- 不采用方案 B（把全部维护文档迁出仓库）：会破坏当前在办评审流程，且失去设计决策的可审阅历史；若后续仍出现陈旧堆积，再按实际证据重新评估。

验收：政策文本明确状态枚举与迁移规则；本规格自身带元数据；3 个 tracked、5 个 untracked 文档按规则分类并更新；不再存在无归属的 docs/superpowers 文档。

#### W3-D2 文档元数据、索引与陈旧检测

设计：
1. 维护文档元数据前置块（YAML frontmatter）字段：doc_type（spec / plan / contract）、status（draft / reviewed / active / completed / superseded / archived）、baseline_commit（40 位完整 SHA）、created_at（YYYY-MM-DD）、superseded_by 或 moved_to（completed/superseded 必填）、owner（可选）。
2. 新增 scripts/lib/maintenance-docs.mjs 与 scripts/verify-maintenance-docs：
   - 扫描 docs/superpowers/specs、docs/superpowers/plans 与 .template-source/contracts。
   - 校验元数据完整性、status 枚举、baseline_commit 为 40 位且 git cat-file 存在、且为当前 HEAD 的祖先。
   - completed/superseded 必须指向 moved_to 或 superseded_by，且目标存在（仓内路径或 maintenance 引用）。
   - 断言 .template-source/contracts/README.md 索引覆盖 contracts 下除 README 外的全部文件。
   - 报告 stale 提示（例如 plan 的 baseline 落后超过约定数量时不阻断，但写明建议复核），不自动修改文件。
3. 新增 .template-source/contracts/README.md：文件、类型、状态、基线、最近复核时间；对历史快照类文档加「数字以当前文件为准，本文为历史基线」说明。
4. 更新 7 个现有设计/计划文档：补元数据；把 135 项/6 slow 等过期数字改为当前数值（135 项 fast、其中 16 项 slow）；把「README 事实/预算失败」等已修复状态改为已验证通过并附验证命令；把基线改为当前提交或明确的调查提交；标注已实施、待实施或待审阅。
5. 新增 tests/maintenance-docs.test.mjs：缺少元数据、非法 status、非 40 位 SHA、非祖先、索引漏项、completed 无迁移目标分别失败。
6. 注册 check.maintenance-docs（run 为 node --test tests/maintenance-docs.test.mjs；input_patterns 覆盖 docs/superpowers/**、.template-source/contracts/**、新 lib 与测试；Gate 绑定 governance-syntax 或 skills-policy 之一，按影响面选择）。

验收：verify-maintenance-docs 退出 0；7 个文档有元数据且事实更新；fixture 反例失败；--plan 对文档改动选中该检查。

#### W3-D3 文档事实修复与单一来源

1. 生命周期注册表：修正 evidence.maintenance-intensity-checkpoint 的 description 中 L1/L2/L3 为 L1/L2；在 scripts/verify-lifecycle-registry 内部（或它的现有测试）增加最小断言，确认该字段不再写不存在的级别，并保留 public_description 与 maintenance-intensity.yaml 的级别集合一致。
2. 投影事实：修正 skills-maintenance.md、template-engineering-overview.md 的表述为「模板源只生成 .claude/skills；.codex/.cursor/.pi 不生成投影；实例投影根由 skills-lock.json 的 projectionRoots 声明，最多四个」；README 与 CLAUDE 引导处同步。
3. CLI 版本：把 unified-cli.md 中硬编码版本改为「以 .template-source/distribution/yss-cli-pin.json 为准」并链接该文件；不复制 pin 值。
4. contracts 快照：对 architecture-iteration-v1.md、governance-core-layering-design.md、harness-hardening-v1.md 等加入历史基线说明或更新数字；以 W3-D2 索引登记状态，不重写历史结论。
5. 孤儿文档：按 contracts 索引逐项确认入链或归档；对确实无消费者的旧设计，经授权后迁移到 maintenance 保留摘要，不直接删除。
6. doc-facts 扩展：在 scripts/lib/doc-facts-patterns.json 增加至少 CLI pin 版本事实（regex 与期望来源）、contracts README 的 pathRefs、修复后文档路径；不把计划类文档纳入 pathRefs（其引用的未来路径会误报）。必要时小幅扩展 doc-facts 以支持 pin 期望来源。

验收：scripts/verify-doc-facts 退出 0；unified-cli 与投影表述无冲突；registry 分级描述一致；contracts 索引覆盖完整；文档改动无新增断链。

#### W3-D4 分发面路径卫生

设计：
1. 新增 scripts/lib/distribution-hygiene.mjs 与 scripts/verify-distribution-hygiene：扫描实例分发面（至少 .agents/skills/**、.template-spec/**，排除 .template-spec/engineering/evidence/**；以 bundle-profile 的 allowRootFiles 为根文件补充范围），检测宿主绝对路径（/Users/、/home/、Windows 盘符）与 Agent root 路径（.codex/skills 等）。
2. 允许清单集中在配置中，只允许历史证据目录与被证明为迁移说明的文件；每条带原因，发现未被允许的内容即失败。
3. 修复非证据命中：至少 .agents/skills/yss-design-system/SKILL.md 的历史输入路径改为可移植描述；evidence 日志保持原字节并由 allowlist 覆盖。
4. 注册 check.distribution-hygiene（run 为 node --test tests/distribution-hygiene.test.mjs；input_patterns 覆盖 .agents/skills/**、.template-spec/**、两个 bundle-profile 与测试；Gate 绑定 governance-syntax 或 distribution）。

验收：verify-distribution-hygiene 退出 0；fixture 注入绝对路径即失败；allowlist 条目若在扫描面消失则报告 stale；不修改历史 evidence 原字节。

### 5.4 W4 防回归最小加固

#### W4-D1 验证策略棘轮

新增 .template-source/process/verification-policy-baseline.json：记录 release required_checks 的完整 ID 集合、Gate 的 ID/display_id/required_at_release、CI 守卫的 check id 绑定、以及 fast 检查总数。新增 tests/verification-policy-baseline.test.mjs 断言当前策略是基线的超集（允许新增，不允许静默删除），数量变化必须同时更新基线文件并在报告中可见。注册为 check.verification-policy-baseline，绑定 final-integrity 或 governance-syntax。

验收：删除任一 required check 或 Gate 时测试失败；新增检查时基线更新为可审阅差异；不改变 release 的 8 项必跑与 4 个 required_at_release Gate。

#### W4-D2 通用超时

在 .template-source/scripts/lib/verification-execution-plan.mjs 的 compileVerificationCheck 中保留 timeout_ms 字段；在策略中允许每个检查声明 timeout_ms；默认值按现有实测数据确定（建议普通检查 300000 毫秒，固定工具准备与多文件 tooling 等已证明更长的任务显式覆盖为 600000 或保持无超时）。运行器已支持 timeoutMs 并映射 124，保留日志与终止失败语义。更新 github-workflows.md 与实际行为一致（不再宣称普通检查受 5 分钟硬上限）。实施前从现有验证报告提取最长任务耗时，避免用拍脑袋默认值误杀。

验收：超时 fixture 返回 124、报告保留实际失败与日志；普通 fast 运行时长与通过集合不因默认值改变；文档与实现一致。

#### W4-D3 Node 声明对齐

根 package.json engines.node 改为与实际验证运行器一致的范围（当前为 24：建议 >=24 <25）；.nvmrc 与 scripts/ci-setup 的 YSS_CI_NODE_MAJOR 保持 24；tooling/node/package.json 保留其自身兼容范围并在文档说明差异。更新 README 与验证说明。

验收：scripts/ci-gate 的 node-engines 检查通过；本地 Node 24 通过预检；Node 22 在预检阶段明确失败而不是通过声明检查后失败。

## 6. 实施批次与顺序

| 批次 | 内容 | 前置 | 完成条件 |
|---|---|---|---|
| B0 基线 | 记录 HEAD/status/未跟踪文档与原字节；在隔离 worktree 复现 E1、E3；运行 --plan 记录拒绝/选择 | 用户授权实施；用户工作保护 | 证据保存；基线未漂移 |
| B1 技能红点 | W1-D1、W1-D2、W2-D1（status 文件）、W1-D3、W1-D4 | B0 | 两项检查退出 0；fixture 反例失败；--plan 选中 |
| B2 Profile | W2-D2、W2-D3、W2-D4 与相关文档 | W2-D1；W1-D3 的 allowlist 接口 | profile 测试/检查绿；分发 shipped 无变化 |
| B3 文档 | W3-D1、W3-D2、W3-D3、W3-D4 | B2 的 legacy 结论；用户授权修改未跟踪文档 | 文档检查绿；7 个文档完成分类更新 |
| B4 加固 | W4-D1、W4-D2、W4-D3 | B1–B3 的检查已注册 | 棘轮/超时/Node 测试绿 |
| B5 终检 | 按当前改动运行 verify-template-fast --plan 与受影响检查；记录 limited 范围；必要时 release 验证另获授权 | B1–B4 | 实际退出码、日志、未覆盖边界可读 |

实现顺序建议：B1 内先做 W1-D1（最小、立即恢复导出），再做 W1-D2，然后 W2-D1，最后退役扫描；这样 allowlist 的 legacy 条件在实施时已经可用。B2 的 manifest 清理与 B3 的文档修改分开提交范围，避免一个 diff 同时改分发与叙事。

## 7. 验收标准

| 编号 | 可观察结果 | 验证方式 | 边界 |
|---|---|---|---|
| AC-01 | 公开导出构建与测试通过，越界链接反例失败 | scripts/export-yss-skills --output 仓外新目录；node --test tests/public-skill-export.test.mjs | 不访问公开仓 |
| AC-02 | 退役 ID 扫描转绿，单一来源，反例可检测 | scripts/verify-retired-skill-ids；node --test tests/retired-skill-ids.test.mjs | 允许清单逐条有原因 |
| AC-03 | 两项检查被 fast/G03 选中且不放宽既有集合 | scripts/verify-template-fast --plan；validateGateConfiguration | 不新增 CI 守卫 |
| AC-04 | Profile active/legacy 显式且可验证 | scripts/verify-profile-distribution；node --test tests/profile-tree.test.mjs tests/profile-consistency.test.mjs | legacy 仅 design |
| AC-05 | 现役 Profile 组合技能/锁/注册表一致 | tests/profile-consistency.test.mjs；composeProfileTree | 不改变实例分发内容 |
| AC-06 | 陈旧排除项分类处置且 shipped 无漂移 | scripts/verify-profile-distribution；差异对比 | manifest 修改需审阅 |
| AC-07 | 维护文档有元数据/索引/正确基线 | scripts/verify-maintenance-docs；node --test tests/maintenance-docs.test.mjs | 未跟踪文档修改先获授权 |
| AC-08 | 文档事实修复且检查绿 | scripts/verify-doc-facts；scripts/verify-lifecycle-registry（含新增一致性断言） | 历史快照加基线说明 |
| AC-09 | 分发面无未允许的宿主绝对路径 | scripts/verify-distribution-hygiene；node --test tests/distribution-hygiene.test.mjs | evidence 原字节保留 |
| AC-10 | 策略棘轮、超时与 Node 声明一致 | 对应测试；scripts/ci-gate 的 node-engines | 默认超时需实测数据 |
| AC-11 | 受影响检查实际执行且记录真实结果 | --plan 选中的命令；报告 limited；未执行项逐项说明 | 不运行未授权 release |
| AC-12 | 用户工作与历史资产未被覆盖 | git status/diff 核对；未跟踪文档原字节对比 | 提交/推送/发布未授权 |

## 8. 影响文件清单

新增文件（按批次）：
- B1：tests/public-skill-export.test.mjs；scripts/lib/skill-retirement.mjs；tests/retired-skill-ids.test.mjs；.template-source/process/profile-status.yaml；scripts/lib/profile-status.mjs（由 profile-distribution 消费）。
- B2：tests/profile-consistency.test.mjs；scripts/lib/profile-distribution.mjs 的 INSTANCE_ONLY_EXCLUDES 与 findings；相关测试更新。
- B3：.template-source/contracts/README.md；scripts/lib/maintenance-docs.mjs；scripts/verify-maintenance-docs；tests/maintenance-docs.test.mjs；scripts/lib/distribution-hygiene.mjs；scripts/verify-distribution-hygiene；tests/distribution-hygiene.test.mjs；scripts/verify-lifecycle-registry 与既有 registry 测试更新；doc-facts patterns 更新。
- B4：.template-source/process/verification-policy-baseline.json；tests/verification-policy-baseline.test.mjs；verification-execution-plan.mjs 超时字段；package.json engines。

修改文件（主要）：
- .agents/skills/yss-layered-mvc-scaffold-generator/SKILL.md；.agents/skills/yss-product-lifecycle/references/daily-delivery.md。
- scripts/verify-retired-skill-ids；scripts/lib/export-skills.mjs；scripts/lib/profile-distribution.mjs；scripts/lib/skill-supply-chain.mjs（如需导出辅助）；.template-source/process/template-verification-profiles.yaml；scripts/lib/ci-gate.mjs（仅当守卫绑定变更）。
- profiles/backend/.template-source/distribution/bundle-profile.json；profiles/design/.template-source/distribution/bundle-profile.json；tests/profile-tree.test.mjs；tests/profile-distribution.test.mjs。
- docs/superpowers 下 7 个既有附件与本规格的状态更新；.template-source/README.md；.template-source/process/template-engineering-overview.md；.template-source/process/runtime-storage.md；README.md；skills-maintenance.md；.template-spec/process/lifecycle-registry.yaml；.template-spec/user-guide/unified-cli.md；.template-source/process/github-workflows.md；package.json。
- 具体行号以实施时最新文件为准；不在此穷举所有测试断言变更。

## 9. 工程约定与测试策略

- 命令（实施与验证使用）：
    scripts/verify-template-fast --plan
    scripts/verify-template-fast
    scripts/ci-gate --mode pr --base <完整 SHA>（仅授权时）
    node --test tests/<新增测试>.test.mjs
    scripts/export-yss-skills --output <仓外新目录>
    scripts/verify-retired-skill-ids
    scripts/verify-profile-distribution
    scripts/verify-maintenance-docs
    scripts/verify-distribution-hygiene
    scripts/verify-doc-facts
    scripts/harness-metrics --check-budget
    git diff --check
- 代码风格：Node ESM，沿用现有 lib 的命名与错误前缀（如 PROFILE_DISTRIBUTION、export-yss-skills）；测试使用 node:test 与 assert/strict；真实临时 Git 仓与子进程，不引入 mock 框架；不新增依赖。
- 测试位置：test 放在 tests/（顶层行为）或对应模块旁（现有 .template-source/scripts/tests）；fixtures 使用临时目录，t.after 清理；禁止向仓库写临时文件。
- 验证登记：每个新增检查只登记一次；检查的最小输入集合要能选中真实消费者；不复制既有套件；运行时长写入报告，不新增性能门禁。
- 文档：按 .template-spec/process/document-writing.md 写；事实、推断与建议分开；计划类文档不写未经授权的时间或收益承诺。

## 10. 风险、回滚与恢复

| 风险 | 触发 | 影响 | 缓解 | 回滚 |
|---|---|---|---|---|
| 新增检查放大 fast 时间 | 导出构建或 profile 组合超预期 | 日常反馈变慢 | 先测量；必要时拆分或标 slow，不删断言 | 从策略移除新检查并更新基线（需审阅） |
| 退役扫描误报多 | 合同/历史/legacy 文本多 | 无法转绿 | 逐项 allowlist + 原因；legacy 标记约束 | 恢复旧脚本与检查绑定，保留新 lib 供调查 |
| stale exclude 清理误改分发 | 删除实例仍需的排除项 | 实例多出模板源脚本 | 先分类、对照 shipped 结果；保留 allowlist | 还原两个 manifest 文件 |
| 文档迁移丢失链接/历史 | 移动 tracked 文档 | 审阅历史断裂 | 使用 git mv；更新索引与引用；保留摘要 | git mv 反向恢复；不改写历史提交 |
| 修改用户未跟踪文档 | W3 更新 4 个计划 | 覆盖用户工作 | 先获授权并记录原字节摘要 | 从备份/原字节恢复 |
| 超时默认值误杀 | 长检查未显式覆盖 | 验证失败 | 从报告提取时长；exceptions 显式登记 | 调整 timeout_ms；保留实际失败日志 |
| 当前 HEAD 继续变化 | 并行开发 | 基线与数字再次漂移 | 实施前重核 HEAD；每批结束重跑证据 | 以当前 HEAD 重新登记基线并更新文档 |

恢复总则：任何检查失败先恢复相互兼容的选择器、执行器、profile 与消费者，再对当前输入重跑受影响检查；不得手改报告、跳过失败或降低阈值。历史证据与批准只读保留。

## 11. 待确认问题

1. docs/superpowers 的最终归属：推荐方案 A（在办工作区 + 元数据 + 完成后迁移）；是否接受？备选方案 B 为全部迁出仓库。
2. design Profile 本轮只冻结 legacy 还是同时迁 schema v3？推荐冻结，迁移另立计划。
3. 公开发布仓的 --check freshness 是否进入发布人工步骤清单？推荐进入发布任务，不进 CI。
4. 退役扫描是否允许 design legacy 文本豁免？推荐允许但绑定 profile-status，标记变化即失效。
5. 超时默认值采用 300000 还是按任务类型分级？需实施前从验证报告提取实际耗时后确认。
6. 跨 Profile 生命周期稳定 ID 对齐是否单独立项？推荐单独立项，不在本轮扩大。
7. CI 守卫是否新增导出/退役检查？推荐不新增，依赖 fast 输入选择与 G03 绑定；若实测证明 CI 漏检，再评估。

## 12. 附录 A：基线复现命令与当前结果

以下为只读复现命令，结果按 2026-10-19 00:50 CST 基线记录；实施前需重跑并保留实际退出码。

    scripts/export-yss-skills --check --output /tmp/yss-export-check
    # 当前：退出 1，link escapes public export

    scripts/verify-retired-skill-ids
    # 当前：退出 1，216 行命中

    node --test tests/profile-tree.test.mjs
    # 当前：通过；design 的锁校验被过滤（待整改）

    scripts/verify-doc-facts
    # 当前：退出 0

    scripts/harness-metrics --check-budget
    # 当前：退出 0

    scripts/verify-template-fast --plan
    # 当前：仅文档改动时选择少量命令；新增检查后应能选中新检查

    git status --short
    # 当前：5 个 docs/superpowers 未跟踪文档（4 个既有 + 本规格）

## 13. 附录 B：本规格的归档去向

实施执行计划见 [2026-10-19 风险整改实施执行计划](../plans/2026-10-19-risk-remediation-plan.md)。

本规格属于在办维护设计。评审通过并实施完成后：设计结论与最终决策迁入 .template-source/contracts/ 并在其索引登记；实施计划与过程材料移入仓外 maintenance 命名空间并保留摘要；本文件按 W3-D2 状态标记 archived 并记录 moved_to。评审未通过时保留 draft，不进入实现。

## 14. 自检

- [ ] 三个问题组均有目标、证据、方案、验收与回滚
- [ ] 未减少任何现有 required checks、Gate 或 CI 守卫
- [ ] 新增检查均有真实消费者与最小输入集合
- [ ] 用户未跟踪文档、历史证据与旧 Profile 均有保护边界
- [ ] 未包含实现结果、提交、推送或发布声明
- [ ] 待确认问题列出推荐方案与影响
