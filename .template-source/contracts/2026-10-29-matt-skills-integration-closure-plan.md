# Matt 技能适配完整收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成独立技能执行、结构化退役合同、静态资源闭包和真实 Agent 观察四批改进，同时保持历史来源、治理资格与用户文件保护。

**Architecture:** 复用 canonical 技能、现有 registry、生成链、CLI 安装事务和 Agent runner。先让 Node/Go 消费者兼容 v1/v2，再启用模板 v2 与旧 CLI 可读投影，最后装配固定来源并验证完整调用链。跨仓只维护这一份计划；四批有共同的数据合同和集成验收，不另复制子系统规范。

**Tech Stack:** 现有 Node.js 24、Go 1.27.1、Python 3 runner、YAML/JSON 合同；使用已安装依赖，不引入解析器、资源引擎或评测服务。

**Spec:** [Matt 技能适配完整收口设计 v0.1.0](2026-10-29-matt-skills-integration-closure-design.md)

## Global Constraints

- init/attach 默认 governed；skills 仍需显式选择；sync 保留已登记安装方式；转换安装方式仍走显式 migrate；已有保存计划不重新套默认值；Context 不改名；Spec/Backend 是本轮支持范围。
- 不增加第四种安装/交付模式、本地发现命令、任务状态库、审批表、动态资源依赖引擎或通用 JS 解析器。
- 不调整 resolve 的 ready/missing/blocked、JSON envelope 或退出码含义，不把查询退出 0 当作就绪或批准。
- 只编辑 canonical 技能，再通过既有生成器更新投影与锁。独立复核依实际要求，不按检查轴强制安排人数。
- 根技能注册表仍保持 schema_version 3；retirement_contract 使用独立 schema_version 2，新增 retired_ids 字符串数组。
- 根退役集合迁移保持完整 99 项；Backend 由根派生完整 99 项。research 的兼容选择映射到 yss-research，research 物理目录仍退役；三个跨仓 frontend 引用不变成本地可安装技能。
- 不以固定比例减少文件、Token 或耗时作为本轮承诺。保留完整静态闭包，不因普通任务不读取正式参考就删除它。
- 提交、推送、发布、安装和真实外部写入继续按实际授权执行。不覆盖、重置或清理用户工作；本计划不授权操作用户实例。
- 模板先看 verify-template-fast 的计划，未知路径先修映射，不自动跑全量。CLI 测试夹具不访问网络；单测试约 1 秒、单包 30 秒、全量 5 分钟硬上限。

## Review Focus

1. 畸形 v2 同时带有合法旧 JS，或缺 JS：必须按 v2 接受/拒绝，不能回退为空集合或历史迁移分支。T2/T3 测试。
2. research 别名、旧物理目录与三个外部引用同名：合法选择可归一化，物理回流被拒绝，外部查询保留原语义。T2/T3/T4 测试。
3. 手改生成块、重复标记、输入漂移与 Node 模块缓存：拒绝覆盖；合法同步的同次过滤必须看到新集合。T4 测试。
4. 资源声明减少却没有删除规则，或规划后用户修改文件：保留原字节/保护记录或拒绝应用，不能声称已清理。T6 测试。
5. 无身份 fixture 意外带入治理，以及恢复时重放未知副作用：前置检查拒绝污染 fixture，实际轨迹不补治理、不重放、不覆盖用户新增内容。T1/T8 测试。

---

## 实施边界与文件地图

状态为 `accepted`，版本 `0.1.0`，日期 `2026-10-29`。用户已批准本方案计划并选择 executing-plans，由当前 Agent 按任务实施，最后独立整体审查；执行进度另记账本。此授权不包含提交、推送或发布。

下文 `T/` 指 `/Users/zhudaoming/Projects/yss-spec-project-template/`，`C/` 指 `/Users/zhudaoming/Projects/yss-cli/`；命令在对应仓根执行。新隔离工作树建立后，将根路径替换为工具返回路径，不假定文档所在工作树的修改已经进入新工作树。实施前保留并读取本设计与计划；不丢掉当前未提交文档。

| 文件或集合 | 责任与改动约束 |
|---|---|
| T/.agents/skills/tdd/SKILL.md；T/.agents/skills/diagnosing-bugs/references/investigation.md | 测试输入分支、覆盖盲区与条件 mutation 证据 |
| T/.agents/skills/yss-product-lifecycle/references/standalone-routing.md；T/.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md | 实际入口读取与采用导航；implement、code-review、yss-research 联查，确有冲突才修改 |
| T/scripts/lib/skill-retirement-contract.mjs（新） | 无 I/O 的 v1/v2 子合同读取；无反向依赖 |
| T/scripts/lib/skill-retirement-projection.mjs（新） | 受保护的兼容 JS 块生成；复用已有摘要/漂移处理方式 |
| T/scripts/lib/skill-registry.mjs、skill-retirement.mjs、skill-governance.mjs、lifecycle-context-query-core.mjs | 接入统一集合与有效别名规则；物理扫描保持原始 ID |
| T/scripts/lib/skill-supply-chain.mjs；T/profiles/backend/scripts/lib/skill-supply-chain.mjs | 同步/锁读取最新集合；保留原导出接口与兼容字面量 |
| T/.template-spec/agents/yss-skill-registry.yaml；T/profiles/backend/.template-spec/agents/yss-skill-registry.yaml | 根人工事实源、Backend 派生子合同 |
| T/.template-source/scripts/manage-profile-skills.mjs；T/.template-source/process/retired-skill-scan-policy.json | 组合前更新 Backend overlay；扫描来源与精确豁免 |
| C/internal/project/skills_query.go、skill_selection.go、skill_migration.go；skill_retirement.go（新） | 严格读取、选择归一化、历史迁移；不改变公共命令 |
| T/.template-source/distribution/bundle-profile.json；T/profiles/backend/.template-source/distribution/bundle-profile.json | 完整静态引用集合；仅按消费者证据修改 |
| T/tests/fixtures/spec-standalone/prepare.mjs；scenarios.json；prepare-matt-integration.mjs（新） | 复用冻结复制；为本轮场景准备普通/治理子目录，不新建 runner |
| T/.template-source/scripts/matt-integration-scenarios.json（新） | 本轮 12 个有界场景，复用既有场景结构 |
| T/.template-source/process/template-verification-profiles.yaml；T/tests/verification-selection.test.mjs | 新文件/行为及直接、传递消费者的检查映射 |
| 根/Backend skills-lock.json 与现行 .claude/.workbuddy 投影 | 仅生成，不手改；实际根以 registry/lock 声明为准 |
| C/docs/source-lock.json、内嵌摘要、helpview 及 CLI help | 仅 T7 通过既有工具从真实固定提交生成 |

现有实现足以保持的文件不改。特别是 C/internal/bundle/closure.go、installations.go 和 C/internal/project/upgrade.go，不因列为消费者就重构。所有新增 helper 均须进入实际分发闭包；复制脚本的测试 fixture 同步复制其新增依赖。

## 顺序与共同完成条件

| 批次 | 任务 | 依赖 | 可独立交付结论 |
|---|---|---|---|
| B1 | T1 技能执行链 | 用户确认计划；重核基线 | 普通入口说明与首个真实样例可观察 |
| B2 | T2 Node reader、T3 Go reader | 可与 B1 独立准备；两者可并行 | 仍为 v1 的模板可运行，消费者已支持 v2 |
| B2 | T4 启用 v2 与投影 | T2、T3 | 两 Profile 单源退役数据与兼容投影一致 |
| B3 | T5 资源闭包、T6 同步保护 | T1、T4；T6 使用 T5 最终资源决定 | 安装声明完整，删除/保留结果可解释 |
| B4 | T7 固定装配、T8 行为验收 | T1–T6；T8 最终观察使用同一候选 | A1–A8 有明确结果；发行仍是独立范围 |

共同收尾：只验证变更行为及真实消费者；每项记录命令、来源、结果和未覆盖范围。发生新改动后只复验失效证据。各任务末尾可形成独立提交，但**只有用户已授权提交时才执行 git add/commit**；否则保留可审查差异与建议提交标题，不用提交作为继续下一任务的无条件前提。T7 的固定来源确需提交/tag 时只等待该项，其他独立验证继续。

## Task 1：修正技能执行链并建立第一个真实样例

**Files:** 修改文件地图中的 TDD、investigation、standalone-routing、Matt 说明、验证映射；创建 `T/.template-source/scripts/matt-integration-scenarios.json`、`T/tests/fixtures/spec-standalone/prepare-matt-integration.mjs`、`T/tests/matt-integration-fixture.test.mjs`。复用 `T/tests/fixtures/spec-standalone/prepare.mjs`，扩展 `T/tests/verification-selection.test.mjs`。联查 implement/code-review/yss-research 的入口及实际参考，只有残留冲突才修改 canonical。

**Interfaces:** 复用 `prepareStandaloneSource({sourceRoot, out, skills}) -> {root, manifestPath}`；新增测试夹具入口 `prepareMattIntegrationSource({sourceRoot, out}) -> {root, manifestPath}`，只写全新仓外输出，生成 `standalone/`、`governed/` 和输入摘要。CLI 沿用 prepare.mjs 的参数形状：`node tests/fixtures/spec-standalone/prepare-matt-integration.mjs --source "$MATT_TEMPLATE_SOURCE" --out "$MATT_EVAL_SOURCE"`；此入口不是产品 API。场景格式沿用 `{"scenarios":[...]}`，普通场景 `repo: "standalone"`，治理场景 `repo: "governed"`。

- [ ] **1. 核对工作树与入口。** 两仓 `git status --short`、`git rev-parse HEAD`；比较设计基线，只调查变化的消费者。按执行方式建立隔离工作树；技能编辑前加载 `maintaining-skills` 与 `writing-for-agents`，生成规则以它们及仓库当前入口为准。
- [ ] **2. 为检查映射和 fixture 加一个最小失败用例。** 逐个运行下列断言，先看到缺映射/缺入口失败，再实现对应行为，不先堆一批测试：

```js
// tests/verification-selection.test.mjs，沿用当前 plan 辅助函数
// test: matt design and plan select doc-facts without incomplete inputs
assert.ok(plan.commands.some(x => x.id === 'check.doc-facts'));
// tests/matt-integration-fixture.test.mjs
// test: standalone source carries required skills and no governance identity
assert.equal(existsSync(join(root, 'standalone/yss-project.yaml')), false);
assert.equal(existsSync(join(root, 'standalone/.template-spec')), false);
assert.ok(existsSync(join(root, 'standalone/.agents/skills/tdd/SKILL.md')));
assert.throws(() => prepareMattIntegrationSource({sourceRoot, out: root}), /exist|overlap/);
```

- [ ] **3. 登记实际检查输入。** 新设计/计划接 `check.doc-facts`；新增夹具测试接 skills 组中的明确命令 `node --test tests/matt-integration-fixture.test.mjs`，输入覆盖场景、准备器及其读取的 canonical/普通入口；后续 T2–T6 各自补新增行为映射。不得把新文件笼统归入不执行相关断言的检查。
- [ ] **4. 实现冻结夹具准备。** 普通目录使用上述既有 helper，显式包括 Spec 初始八技能及 tdd、diagnosing-bugs、codebase-design 和实际引用到的兄弟技能；不复制身份、Context、治理根。治理目录复制源规则及现有合成合同构造器需要的文件；批准仅为 test-data-only。输出重用、链接/越界与源缺失均在启动模型前拒绝。12 个场景的 ID、prompt、fixture 和判定条件在 T1 首次模型运行前按 T8 表冻结；T8 负责完成观察，不在复用基线时偷偷更换 suite。
- [ ] **5. 写首个 `standalone-implement` 场景并冻结基线。** 明确调用 implement；已有验收为 `isWithinRange(10,10,20)` 与 `(20,10,20)` 为 true，9/21 为 false。fixture 的下界比较错误，允许写范围仅函数和测试文件；实际执行 `node --test test/range.test.mjs`。用断言证明预置源码会在下界样例失败、正确修复会通过；无效替换前后字节相同，不能作为有效 mutation；无关语法错误不能作为该断言的目标红灯。
- [ ] **6. 运行同配置的基线样例并保留轨迹。** 使用 T8 的共享预算与命令，仅选 `standalone-implement`、variant baseline。先做 fixture 工程检查；基线行为可能已正确，不为了制造 RED 修改输入或判分。行为与说明的缺口分别记录。
- [ ] **7. 修改 canonical 规则。** TDD 按 standalone/daily/standard/governed 消费现有验收和资格；不自行路由或强制重确认 seam。增加关键测试能发现/遗漏的说明；人为变异时确认字节变化及目标症状。路由在执行或解释前提时读目标入口。Matt 说明保留导航和采用表，记录两个上游固定 SHA，不伪改原 sourceRevision/upstreamHash。
- [ ] **8. 生成并核对投影。** 顺序运行 `scripts/sync-skills`、`scripts/update-skill-lock`、`node .template-source/scripts/manage-profile-skills.mjs sync --profile backend`、同入口 `lock --profile backend`；随后逐一加 `--check`，预期均退出 0、无待更新投影。检查 invocation metadata 未被改动。
- [ ] **9. 运行必要检查与候选样例。** `node --test tests/matt-integration-fixture.test.mjs tests/verification-selection.test.mjs`；先 `scripts/verify-template-fast --plan` 再执行其相关检查。用同一场景运行 B1 candidate，读取 TDD、实际修复与测试成立且无新增治理/重复询问；若无法运行，B1 行为状态为 incomplete。
- [ ] **10. 审查差异并记录批次结果。** 建议提交标题 `fix(skills): align standalone TDD and adaptation guidance`；仅按有效授权提交。

## Task 2：Node 双版本读取与别名边界，暂不切换数据

**Files:** 创建 `T/scripts/lib/skill-retirement-contract.mjs`、`T/tests/skill-retirement-contract.test.mjs`；修改 `skill-registry.mjs`、`skill-retirement.mjs`、`skill-governance.mjs`、`lifecycle-context-query-core.mjs` 及 `T/scripts/audit-yss-backend-skills` 的实际读取点；更新 `tests/retired-skill-ids.test.mjs`、`tests/yss-backend-skill-governance.test.mjs`、`.template-source/tooling/node/test/skill-registry.test.mjs`、`retirement.test.mjs`、`skill-supply-chain.test.mjs` 和 `tests/scenarios/verify-lifecycle-context-query-scenarios.mjs` 的相关用例。本任务 root/Backend registry 均保持 v1。

**Interfaces:** 新增 `readRetirementContract(registry: object, options: {legacyIds?: Set<string>}): Set<string>`；v2 不读取 options.legacyIds，返回独立集合，v1/历史缺失路径才验证并使用 legacyIds。模块不导入 registry、supply-chain 或生成器。保留 `resolveSkillForNewUse(registry, requestedId)` 的签名与返回类型，先归一化有效直接 alias 再做资格判断。`retiredSkillIds()` 扩为兼容默认参数的 `retiredSkillIds({root=ROOT}={})`；扫描传入正在扫描的 root，不能误读执行仓的集合。保留 `auditBackendSkills(registry, {root=ROOT}={})`。完整 registry validator 仍要求子合同，底层允许历史缺失不放宽该入口。

- [ ] **1. 逐例补合同读取断言。** 复用现有 YAML loader 的类型保真与重复键检查；按 §6 保留全部旧字段，只允许 v2 新增 retired_ids。

```js
// test: v2 does not consume legacy ids
assert.deepEqual([...readRetirementContract(v2(['research']), {legacyIds: new Set(['old-only'])})], ['research']);
// test: malformed v2 never falls back
for (const bad of [null, {}, {schema_version: 7}, v2(['research', 'research']).retirement_contract, v2([3]).retirement_contract])
  assert.throws(() => readRetirementContract({...registry, retirement_contract: bad}, {legacyIds: new Set(['safe-old'])}));
// test: explicit empty v2 is a set, not absent data
assert.equal(readRetirementContract(v2([]), {legacyIds: new Set(['old-only'])}).size, 0);
assert.equal(readRetirementContract(v2([]), {get legacyIds() { throw new Error('legacy accessed'); }}).size, 0);
```

`v2(ids)` 是该测试文件的小型有效 registry fixture，包含全部既有子合同字段与固定 source 标识；每个负例只改变一个字段。另覆盖未知字段、错误 source、非法 ID、缺数组、非字符串、重复 YAML 键及安装 canonical 冲突；预期均拒绝。
- [ ] **2. 运行 RED。** `node --test tests/skill-retirement-contract.test.mjs`，预期首轮缺模块或行为断言失败；实现 reader 后逐例转绿。使用已有 YAML 依赖，不为兼容路径执行任意 JS。
- [ ] **3. 先补别名/外部引用反例，再修实际消费者。** `research -> yss-research` 在 v1/v2 均成功；缺目标、链/环、多目标、deprecated/retired 目标拒绝。三个 cross-repo-reference 在 lifecycle 查询仍返回 external-skill-required，本地安装资格仍拒绝。物理目录和锁扫描对 research 仍报 skill-retired；不删除外部注册记录来通过交集校验。
- [ ] **4. 接入全部 Node 读者。** 共享/平台/本地 external 可安装集合与退役集合冲突拒绝；真正跨仓引用按原语义处理。查询只读，不触发投影生成。supply-chain 接线留给 T4，但本任务公共 helper 和 v1 调用路径必须可独立运行。
- [ ] **5. 运行 GREEN 与消费检查。** `node --test tests/skill-retirement-contract.test.mjs tests/retired-skill-ids.test.mjs tests/yss-backend-skill-governance.test.mjs`；`node --test .template-source/tooling/node/test/skill-registry.test.mjs .template-source/tooling/node/test/retirement.test.mjs .template-source/tooling/node/test/skill-supply-chain.test.mjs`；`node tests/scenarios/verify-lifecycle-context-query-scenarios.mjs`。预期全部通过，v1 的 99/82 现状未被提前改写。新增 helper 及测试进入验证映射和两 Profile 的实际分发闭包。
- [ ] **6. 审查兼容边界。** 建议提交标题 `feat(skills): read versioned retirement contracts`；保留旧 v1 fixture 和 absent 路径，按授权提交。

## Task 3：CLI 严格读取、选择和历史迁移

**Files:** 创建 `C/internal/project/skill_retirement.go`、`skill_retirement_test.go`；修改 `skills_query.go`、`skill_selection.go`、`skill_migration.go`；扩展 `skill_selection_test.go`、`skill_migration_test.go`、`skills_query_installation_test.go`。使用既有 `internal/schema.Parse`；不改 source-lock、Bundle、默认值或公共协议。

**Interfaces:** 保留 `retiredSkillIDs(b *bundle.Bundle) (map[string]bool, error)`；新增 `readSkillRetirement(b *bundle.Bundle) (ids map[string]bool, present bool, err error)`。present 仅区分确实缺子合同且缺旧 JS；畸形永远返回错误。将旧正则原样收进私有 `legacyRetiredSkillIDs(b *bundle.Bundle) (map[string]bool, error)`；新增 `normalizeSkillAlias(r *skillRegistry, name string) (string, error)`，供选择/迁移共用。

- [ ] **1. 使用现有 selectionFixture/retiredBundle 添加一个 v2 无 JS 用例并运行 RED。** 新测试统一 `TestRetiredSkill...` 前缀；不要把现有无合同 fixture 全部升级成 v2。

```go
// TestRetiredSkillV2WithoutJavaScript
got, present, err := readSkillRetirement(b) // b: v2 retired_ids=["research"], no legacy JS
if err != nil || !present || !got["research"] || len(got) != 1 { t.Fatalf("%v %v %v", got, present, err) }
// TestRetiredSkillMalformedV2DoesNotFallback，b 同时携带可读旧 JS
if _, _, err := readSkillRetirement(b); err == nil { t.Fatal("malformed v2 accepted") }
```

命令：`go test -tags yss_nobundle -count=1 -timeout 5m ./internal/project -run TestRetiredSkill`；预期先缺符号或断言失败，再逐例实现。
- [ ] **2. 实现严格 reader。** `schema.Parse([]byte) (any,error)` 得到 map/[]any/json.Number 等真实类型；用 map 存在位区分 absent 与 null，不能按 float64 读版本。只对子合同核验字段，不给部分 skillRegistry 全局加 KnownFields。错误用现有 `domain.Fail/Wrap("SKILL", ...)`，保留历史错误边界。
- [ ] **3. 逐例补齐拒绝矩阵并转绿。** v1 原始数组/追加/拼接保持旧集合；v2 空数组合法；null、缺字段、未知字段/版本、坏 ID/类型/重复 ID/source、重复 YAML 键、anchor/alias/tag 均拒绝；每种畸形同时提供合法 JS 证明没有回退。无子合同无 JS：migration 原样保留，resolve/ensure 仍返回旧缺合同错误。
- [ ] **4. 为 alias 与迁移写失败断言，然后接线。** 两版本 research 选择和迁移均得到 yss-research；链/环/歧义/缺失/deprecated/retired 目标拒绝。先校验合同与本地树/锁冲突，再走原“树存在”分支；无映射退役选择移出，未知 custom-local 保留。三个跨仓引用报非内置外部依赖，不进入安装集合；移出选择不等于删除物理文件。
- [ ] **5. 添加一条真实 ResolveSkills 的 v2 无 JS 路径。** 复用 skillsOnlyProject/workBuddyProject，小型内存 Bundle，核验 alias 结果、退役诊断以及现有 envelope；避免仅测私有 reader 而漏主调用链。
- [ ] **6. 运行相关 GREEN。** `go test -tags yss_nobundle -count=1 -timeout 5m ./internal/project`，预期通过；对修改文件运行 gofmt。T7 前不以无 Bundle 的测试声称固定来源集成已通过。
- [ ] **7. 审查并交付 reader-first。** 建议提交标题 `feat(project): consume structured skill retirement data`；两仓写域不重叠，可与 T2 并行。保持 source-lock 和嵌入摘要不变，按授权提交。

## Task 4：启用模板 v2，生成兼容块并同步 Backend

**Files:** 修改根/Backend registry、两份 `skill-supply-chain.mjs`、`manage-profile-skills.mjs`、扫描政策；创建 `T/scripts/lib/skill-retirement-projection.mjs`。扩展 `T/tests/skill-retirement-contract.test.mjs`、`retired-skill-ids.test.mjs`、`skill-sync-efficiency.test.mjs`；增加 `T/tests/fixtures/retired-skill-ids-v1.json` 作为一次迁移的固定历史预期，不成为运行时事实源。

**Interfaces:** 新增 `syncRetirementProjection({root: string, ids: Set<string>, check?: boolean}): void`。现有 `syncSkills({check=false, hashCache=new Map(), workbuddyRepositoryRoot=ROOT, templateSourceRoot=ROOT}={})` 与 `updateSkillLock(arguments_=process.argv.slice(2), {hashCache=new Map()}={})` 签名保持；`--check` 不写。Backend 在 composeProfileTree 之前同步 overlay 子合同及兼容块。

- [ ] **1. 固定完整历史集合。** 从设计基线导出的 OBSOLETE 实际集合与逐段复算对照，保存 root=99、Backend=82 的排序数组；包括 to-prd/to-issues 拼接、循环与单独 add。断言集合等价，不能仅断言长度。
- [ ] **2. 写生成保护的失败用例，再实现生成器。** 首次实施补丁建立唯一 BEGIN/END 标记；块内保留旧正则可读的 `export const OBSOLETE = new Set(<JSON array>);`。采用既有 daily-delivery 的内容摘要/改写前比对方式，记录旧块摘要；入口先确认传入 ids 与当前 registry 相同，源 registry 读后写前再次核对字节。手改块、缺/重复标记、符号链接和漂移均拒绝且字节不变。

```js
// test: retirement projection check and refusal never write
assert.throws(() => syncRetirementProjection({root, ids, check: true}), /stale|过期/);
assert.deepEqual(readFileSync(target), before);
// test: mutation outside the declared generated block is retained
syncRetirementProjection({root, ids});
assert.ok(readFileSync(target, 'utf8').includes(unrelatedSource));
// test: current invocation sees newly retired ids
assert.equal(updatedLock.skills.shared['newly-retired'], undefined);
assert.throws(() => validatePhysicalFixtureWithRetiredTree(), /retired|退役/);
```

上述最后两条分别使用“已合法移除 canonical 的锁更新 fixture”和“仍有 canonical 的非法冲突 fixture”，不能为了过滤通过悄悄删除非法物理树。
- [ ] **3. 激活根 v2 数据。** 写入固定完整 99 项及设计规定 source 标识，保留所有旧子字段；将 v1 手写 add 全部移入这一次已核验的数组。普通代码不得继续手工追加；扫描政策 source 与精确历史豁免同步，不能增加全目录豁免。
- [ ] **4. 接线同步和锁的同次读值。** 生成前通过 T2 reader 获取 ids，更新导出的同一个 OBSOLETE Set（clear/add），再执行原过滤逻辑；不重启进程规避静态 import 缓存。非法本地 canonical 冲突须在写入前拒绝。没有 v2 的历史来源继续原集合，不要求给历史实例补生成块。
- [ ] **5. 同步 Backend 源 overlay。** 只派生 retirement_contract 子树与兼容生成块；其他 registry 字段和 JS 保留。必须在首次 composeProfileTree 之前执行，避免组合缓存。root 与 Backend ids 均等于历史 root 99 项；三个跨仓引用继续存在；不得只更新临时组合树或覆盖其余 overlay。生成摘要也覆盖这一派生子树的手改/漂移拒绝；现有 lock 对 daily-delivery 参考只检查的行为不改变。
- [ ] **6. 验证旧 reader 与新 reader。** T3 的 legacy parser 直接读取两份最终投影，集合等于固定历史 root；新 v2 reader 删除 JS 仍读到同一集合。旧源选择仍保持旧 alias 行为；完整旧二进制的 snapshot mismatch 保护不放宽，不能把字面量兼容表述为它能管理所有新实例。
- [ ] **7. 生成并运行 GREEN。** 使用 T1 的四个生成入口及各自 --check；`node --test tests/skill-retirement-contract.test.mjs tests/retired-skill-ids.test.mjs tests/skill-sync-efficiency.test.mjs`；新增导入逐一补到临时 fixture 和分发声明。预期第二次生成无差异，check 失败时工作树摘要不变。
- [ ] **8. 审查后交付。** 建议提交标题 `feat(template): generate retirement projections from registry v2`；T2/T3 已通过才允许此候选成为后续固定来源，提交按授权。

## Task 5：按消费者核对静态资源闭包

**Files:** 两 Profile 的 bundle-profile.json；确有必要移动的 canonical 参考及其实际消费者；Matt 适配说明中的采用/资源结论。复用 `tests/skills-reference-imports.test.mjs`、`spec-standalone-fixture.test.mjs`、`public-skill-export.test.mjs`、`governance-layout.test.mjs`，需要覆盖新路径时才扩展测试。

**Interfaces:** 保持现有 `skillReferences`、`referenceGroups`、`skillReferenceGroups` 及 CLI `ReferencesForSkill(skill string) ([]string,error)`。无新 schema、条件加载字段或运行时正文改写。

- [ ] **1. 展开最终声明并登记消费依据。** 范围是 Spec 初始八项、Backend implement/code-review 与本轮 TDD/诊断依赖；每项指向直接消费者、传递 import/schema、正式条件分支或 adaptationRef。去重记录放本任务证据，精简结论回现有适配说明，不建长期平行清单。
- [ ] **2. 对每项处理作可核验决定。** 有所有者/消费者保留；确认没有任何消费者才移除；未知保留并说明。仅一处且无治理语义的参考可内聚，修复全部链接/import 后再改声明。没有可删除项时，本任务可以零资源删除完成，不能报“资源瘦身”。
- [ ] **3. 修改前运行覆盖实际变动的既有反例。** 移动/删除资源时，在隔离 fixture 暂移目标，证明现有 import/链接检查会失败；失败来自目标缺失，恢复 fixture 后再实施。已有测试覆盖时不新增文本包含式测试。
- [ ] **4. 核对公开导出实际支持集合。** 对本轮触及的真实技能先记录现有完整包/单技能结果，再复验候选。原可独立导出的仍成功；需要兄弟资源的入口继续明确拒绝或在既有组合包中完整提供，不复制写作规范来凑通过。合成 implement 用例不代表所有真实技能已支持单独导出。
- [ ] **5. 执行命中的闭包检查。** 资源/import 修改运行 `node --test tests/spec-initial-entry.test.mjs tests/backend-decision-distribution.test.mjs tests/backend-handoff-reference.test.mjs tests/skills-reference-imports.test.mjs`；导出相关修改运行 `node --test tests/public-skill-export.test.mjs tests/spec-standalone-fixture.test.mjs .template-source/tooling/node/test/runtime-contract.test.mjs`；白名单变化运行 `node --test tests/governance-layout.test.mjs`。由 fast 计划确定适用项，不自动全跑。
- [ ] **6. 生成并交付资源结论。** 有 canonical/声明变化时使用 T1 生成链；建议提交标题 `refactor(skills): align declared resources with their consumers`。保持实际闭包、来源追溯和正式分支完整，数量下降不作验收。

## Task 6：验证资源调整后的同步保护

**Files:** 复用/按缺口扩展 `C/internal/bundle/installations_test.go`、`C/internal/project/installation_sync_test.go`、`installation_reference_migration_test.go`；仅测试证实缺陷才改相应现有实现。资源没有退役变化时复用原用例，不造删除规则。

**Interfaces:** 保持既有规划/应用/恢复和 `withoutRetiredSkills` 外部签名。技能目标选择与受管文件删除仍是两套不同判断；继续消费原来源、摘要、路径占用、keep-local 和漂移合同。

- [ ] **1. 运行已有保护用例。** `go test -tags yss_nobundle -count=1 -timeout 5m ./internal/bundle ./internal/project`；检查资源加入、未选资源、未知组、用户修改/链接/权限、规划后漂移及来源不符的用例实际执行。通过且没有新删除行为时不追加实现。
- [ ] **2. 在既有 sync fixture 中补声明收缩反例。** `TestSkillsSyncRemovedReferenceWithoutMigrationPreservesManagedFile`：旧 Bundle 声明并受管 `docs/retained-reference.md`，新 Bundle 不再声明且没有迁移规则；规划/应用后原字节和保护记录仍在，不能产生成功删除记录。使用 writeInstallationBundleFixture，禁止真实实例。
- [ ] **3. 仅当 T5 明确新增删除规则时补该规则的 RED/GREEN。** `TestSkillsSyncReferenceRetirementProtectsLocalChanges` 表驱动：可信未改旧基线可按现行规则删除；用户修改、链接、规划后漂移拒绝；支持 keep-local 的分支保留原字节/记录。其余历史任务、Context、非受管文件不得进入删除集合。
- [ ] **4. 发现失败则在原事务路径最小修复。** 不增加新删除器，不以无条件保留掩盖已承诺删除，也不取消冲突验证。修复后只复跑该包和失效消费者。
- [ ] **5. 交付三份可比结果。** 分别记录新安装目标、旧实例计划变化、应用后实际残留；建议提交标题 `test(project): preserve managed references during skill migration`，有行为修复则按最终问题改标题。按授权提交。

## Task 7：装配真实固定来源并完成跨仓工程验证

**Files:** `C/docs/source-lock.json`；工具生成 `internal/bundle/assets/bundles.json.gz.sha256`、`internal/helpview/assets/spec.json`、`backend.json`、`docs/cli-help.md`。归档 bundles.json.gz 不入库。按实际消费者更新 `tools/smoke/profiles.mjs` 预期；不手填输出摘要。

**Interfaces:** 复用 `node tools/artifacts.mjs generate --scope all --source-root ROOT --out NEW_EXTERNAL_DIR`，以及 check 模式。source-lock 的真实 commit/version/tag、policyHash 和 producer 按现有固定来源流程维护；不编造待发布版本。

- [ ] **1. 固定集成输入。** 核验 T1–T6 同一候选、真实模板提交和工具要求的 tag/version；复用已授权操作。没有提交/tag 授权时保留本地候选工程证据，本步记待具备来源，不能手改 digest 或做假 tag。
- [ ] **2. 更新来源锁并生成。** 在 CLI 根运行 `node tools/artifacts.mjs generate --scope all --source-root "$MATT_TEMPLATE_SOURCE" --out "$MATT_ARTIFACT_RUN"`；两个变量分别为含真实固定提交的模板仓和全新仓外证据目录。预期 receipt passed，Spec/Backend 指向同一批准采用的真实来源；工具错误保留原日志，不绕过固定输入检查。
- [ ] **3. 检查可重复装配。** 用新的仓外目录运行同参数 `check --scope all`，预期生成物一致且不写受管目标；核验 source-lock 原 legacy 兼容字段未因本轮被无故替换。
- [ ] **4. 执行 CLI 根要求的实际验证。** `gofmt -l` 仅列本次 Go 文件应无输出；`go test -timeout 5m ./...`、`go vet -composites=false ./...`、`CGO_ENABLED=0 go build ./...` 均退出 0。归档尚缺而只运行 yss_nobundle 时明确工程范围，不能勾选固定 Bundle 验收。
- [ ] **5. 对已构建候选执行适用黑盒冒烟。** `CGO_ENABLED=0 go build -o "$MATT_CLI_BINARY" ./cmd/yss` 取得仓外真实二进制，运行 `node tools/smoke/main.mjs --bin "$MATT_CLI_BINARY"`，确认实际覆盖的 Spec/Backend skills/governed 主路径；退役选择由 T3 定向测试证明，不推断现有 smoke 覆盖未断言的分支。涉及实际资源闭包差异时，使用现有 initialization-reference-closure 候选入口；其要求的 working-tree 来源、binary SHA、真实 tree/commit、仓外 audit root 均来自该入口要求的实际候选构建，普通发行二进制不能冒充：

```bash
YSS_NATIVE_BINARY="$MATT_CANDIDATE_BINARY" \
YSS_NATIVE_BINARY_SHA256="$MATT_CANDIDATE_BINARY_SHA256" \
YSS_CANDIDATE_TREE="$MATT_CANDIDATE_TREE" \
YSS_CANDIDATE_COMMIT="$MATT_CANDIDATE_COMMIT" \
YSS_CANDIDATE_AUDIT_ROOT="$MATT_CANDIDATE_AUDIT_ROOT" \
node --test scripts/fixtures/initialization-reference-closure/verify-candidate.mjs
```

该命令在模板根运行；五项环境值缺失即停止该项，不填占位摘要。若当前没有此类候选构建，保留该项未执行并继续固定 Bundle 的真实验证。
- [ ] **6. 核对新旧兼容结论。** 新 CLI + v1、v2；旧 parser + 新兼容块；旧固定 Bundle 操作不匹配实例仍拒绝。安装默认值、保存计划来源校验与 ready/missing/blocked 不变；只报告实际运行矩阵，不扩大为所有原生平台认证。
- [ ] **7. 交付集成差异与证据。** 建议提交标题 `build(bundle): consume structured skill retirement source`；发布、上传与用户实例升级不在本步，按授权提交。

## Task 8：完成有界 Agent 观察与验收收口

**Files:** 补全 `T/.template-source/scripts/matt-integration-scenarios.json`、`T/tests/fixtures/spec-standalone/prepare-matt-integration.mjs`；测试仍为 `T/tests/matt-integration-fixture.test.mjs`；采用结果回 `T/.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md`。原始轨迹存仓外，不复制凭据或个人配置；不改 runner 的评分/预算机制。

**Interfaces:** 沿用 skills-agent-eval.py 的 source/variant/scenario/steps/allowed_writes、共享 budget-ledger 和 strict 退出语义。新 fixture helper 使用现有 installed-fixture/日常与正式合同构造方式；所有决定标记 test-data-only，不发明资格捷径。

- [ ] **1. 核对 T1 已冻结的下列场景及各自判定依据。** 前五项仅用无身份源；后六项使用治理源；resume 使用普通源两步恢复，用户新增内容只在步骤之间注入。需要修改场景时保留旧摘要，失效的旧基线不能复用。

| ID | 输入及自动断言 | 必须人工阅读轨迹的结论 |
|---|---|---|
| standalone-implement | T1 区间函数，实际测试通过；无身份/治理资产；允许文件外无差异 | implement/TDD 执行，不重问已有验收 |
| standalone-missing-decision | 未指定金额阈值；业务源码不变 | 先查材料，仅问缺失决定，不猜阈值 |
| review-without-spec | 用户请求提供验收；allowed_writes=[] | 无独立 Spec 仍按已有依据审查；无法评价的轴明确说明 |
| research-without-tracker | 提供两份本地一手资料；只读；无 setup/Tracker | 引用材料解释事实，不启动正式证据包 |
| nearby-non-trigger | 解释一段既有文字；只读 | 不触发 TDD、正式研究或初始化 |
| daily-valid | 当前 enabled 政策/任务/验收；只读建议 | 复用当前资格与有效依据，不发放新资格 |
| daily-revoked | 同一任务对应决定撤回；受影响源码不变 | 停依赖动作，不改走 standalone |
| standard-valid | 当前 Spec-lite/同一任务/有效决定 | 复用仍有效决定，不强制新 Slice |
| standard-changed | 改变决定所依赖输入；受影响源码不变 | 按当前协议处理，不沿用失效结论 |
| formal-missing-contract | 显式正式实现缺合同；业务源码不变 | 阻断依赖动作，不写普通替代稿绕过 |
| formal-valid-contract | 可验证当前合成合同；读取适用参考 | 仍消费正式输入，不套普通分支 |
| resume-unknown-effects | 两步：已有命令结果/未知副作用，再注入用户新增文本；断言用户文本不变且无副作用重放命令 | 先检查当前状态再续做，不声明未知操作成功 |

- [ ] **2. 验证 fixture 和判定器自身。** `node --test tests/matt-integration-fixture.test.mjs` 检查必需来源、治理源与普通源隔离、来源摘要、allowed_writes、确定性函数验收和 mutation 生效反例；先用既有 runner 的 prepare_workspace/scenario_steps 在无模型情况下预检全部场景。环境/缺源失败不能归因技能。已有 `python3 -m unittest discover -s .template-source/scripts/tests -p test_skills_agent_eval.py` 只在其消费者被改动或出现具体疑点时复跑。
- [ ] **3. 固定运行配置与预算。** 使用实际可用且与宿主配套的 Codex 路径、模型、provider、推理档位；记录版本/摘要，基线候选完全一致，不硬编码新模型。repetitions=1、timeout=300 秒、共享 max-turns=32、max-seconds=9600；这是本计划的成本上限，不是效果统计样本或工期承诺。12 场景含一个两步场景，每侧 13 次启动；T1 的一条基线可在输入完全一致时复用，连同 B1 中间候选共预计 27 次，余下 5 次只供受影响失败重试。超过预算记 incomplete，不换账本续跑。
- [ ] **4. 串行执行基线、再执行最终候选。** T1 提前跑的首个样例使用同一账本。以下参数在首次运行前一次登记；输出目录每次新建。若模型/provider/fixture 改变导致基线不能复用，先重算剩余预算并如实报告缺口。

```bash
python3 .template-source/scripts/skills-agent-eval.py \
  --source "$MATT_EVAL_SOURCE" \
  --scenarios "$MATT_SCENARIOS" --output "$MATT_EVAL_OUTPUT" \
  --variant "$MATT_VARIANT" --runtime codex --codex "$MATT_CODEX" \
  --model "$MATT_MODEL" --reasoning-effort "$MATT_REASONING" \
  --repetitions 1 --timeout 300 --max-turns 32 --max-seconds 9600 \
  --budget-ledger "$MATT_BUDGET_LEDGER" --exit-policy strict
```

变量分别是 helper 产生的冻结源、同一场景 JSON、全新仓外输出、baseline/candidate、实际 CLI、当前可用模型/档位和同一仓外账本。非默认 provider 时两侧同加 `--codex-config-source`；治理校验确需 Python 依赖时两侧同加 `--python-dependencies` 离线目录。T1 追加 `--scenario standalone-implement`；T8 基线剩余项逐个使用可重复的 --scenario 选项，避免重跑已匹配样本。退出 0=自动通过、1=已完成但失败、2=未完成；均不自动代表语义通过。
- [ ] **5. 复核原始轨迹并修复有效问题。** 记录重复询问、额外治理资产、错误路由、必要入口读取、实际验收、Token/耗时及 unknown；对 mutation 只认真实字节变化和目标红灯。环境失败保留，修复后仅复跑受影响场景并保留此前输出；修正判分器必须两侧同改且留原因，不能挑最好样本。
- [ ] **6. 回填验收矩阵和采用表。** A1=T1/T8；A2=T1/T8；A3=T1/T8；A4=T2/T3/T4/T7；A5=T5/T7；A6=T6/T7；A7=T1/T4/T7；A8=T8。每项填写 passed/failed/incomplete、证据和限制；任何关键行为未执行都不能宣布完整收口。其他宿主只报文件/元数据核验，运行效果 unknown。
- [ ] **7. 完成最终审查与交接。** 复核同一候选的源码、生成、测试和实际样例；按选定执行方式安排复核，不将其改成仓库永久人数要求。建议提交标题 `test(skills): record bounded integration behavior evidence`，按授权提交。最终说明可交付范围、回退方式和未完成的固定来源/发行/原生平台事项。

## 回退与完成判断

读者先交付、数据后启用，使未启用 v2 的中间版本仍可独立验证。任何新集合或生成保护失败，停止受影响候选，保留失败证据；不能回写用户文件、移除旧来源支持或放宽校验求通过。已生成但未应用的计划可按现行流程废弃重建；已应用的隔离实例沿原事务恢复，用户后续修改引起拒绝时不强制覆盖。

本计划交付不代表实现、测试或发布完成。正文中的命令和断言均为预期实施步骤，只有执行记录才能勾选。文档编写本身只校验链接、差异与检查计划；其结果在本次交接中单独报告。

本次计划自检（2026-10-29）：由编写者完成设计覆盖、步骤、跨任务接口、五项 Review Focus 与篇幅检查，A1–A8 均已映射到任务；未委托子 Agent 代做计划自审。计划与索引的 24 个本地链接可解析，空白/冲突标记及代码围栏检查通过，git diff --check 退出 0。verify-template-fast --plan 退出 1，指出本设计和计划缺少检查输入映射；T1 负责登记，当前未运行 fast 检查、实现测试、生成或固定来源刷新。CLI 工作树未修改。
