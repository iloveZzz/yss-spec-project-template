# 轻量迭代交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 在已有项目中贯通轻量需求、可执行任务、连续实施和末端质检，首轮覆盖单仓无 API 的 daily / standard。

**Architecture:** Agent 和宿主负责实际执行与判断，现有 CLI 保持原校验职责。保留独立技能入口，Backend 交付说明从 canonical 原文确定性生成；新增一个无执行、无文件写入的测试证据整理模块，产出交给宿主的定点编辑。已有记录、日志、决定及完成语义不另起协议。

**Tech Stack:** 现有 JavaScript ES modules、node:test、内置 crypto、既有严格 JSON 解析器；现行固定 YSS CLI 仅作真实消费者。无新增依赖。

**Spec:** [已批准设计](2026-10-25-lightweight-iteration-design.md)。

状态：accepted / 已实施。用户已明确回复“批准计划，执行这个计划直到完成”；实际实施与验证结果单独记录。计划与设计保存在现有模板源 contracts 目录，不使用被本仓忽略的 docs/superpowers。

## Global Constraints

- 单一实现仓、无 API 变化的修复和小功能；包括 daily 与 standard 的衔接。兼容新增 API 沿用现有流程。
- 首轮不增加外部依赖、常驻服务、全局任务发现或新日志协议。
- 默认顺序实施；本轮不新增多 Agent 调度。
- 首轮只做当前任务的接续，不建设通用恢复系统。
- 已启用治理时，request_triage 继续持有路线条件，普通任务交付继续持有记录与完成语义。
- 独立技能不强制治理身份、标准 evidence block 或 route；显式正式绑定不因文件缺失或标签变化降级。
- 不生成真人回复、审查结论、实施 provenance、未执行的成功结果；旧日志保持原字节。
- Skill 仅改 canonical，再用原生成器更新必要投影和锁；不手改 WorkBuddy 文件。
- 本计划不修改 CLI 生产代码、模板来源 pin、初始化模式、迁移或发布流程。
- 提交、推送和发布仍须具体授权。下列任务收口不默认执行提交；获得授权后按现行 yss git 合同逐任务提交，不夹带用户修改。

## Review Focus

1. **RF1：异常宿主结果**——取消、信号终止、未知退出或日志存储失败，即使框架 status 为 0 也不能产出可登记通过结果；Task 3 的真实进程与异常输入测试负责。
2. **RF2：写回竞争和不合法 Ticket**——重复 footer、尾随正文、重复 JSON 键、用户改动或命令绑定不符均拒绝，原正文及旧日志不被覆盖；Task 3 的定点编辑测试负责。
3. **RF3：章节边界和原始字节**——新增日志不得被最后一个风险/验收章节吸入；中文、CRLF、围栏及换行摘要与 CLI 一致，写后候选不漂移；Task 3 的 unit 与原生 fixture 负责。
4. **RF4：standard 的稳定主体**——任务细化不改 Spec-lite 或续期真实决定，原提问者可以确认，撤回仍拒绝；Task 2 的代表性任务核对和 Task 3 的原生 standard 场景负责。
5. **RF5：入口及分发边界**——独立技能不被重新治理，正式/高风险不降级，Backend 确实能读到当前原文且 --check 无写入；Task 1 的生成 fixture、Task 2 的代表性请求和 Task 3 的双 Profile 消费负责。

---

## 基线、准备与文件责任

模板基线为设计中的 8eb6e09d72b31f53ddcce154394f0ac0312d8ecd。开始执行时重读根入口和实际差异，保留本轮设计、计划及文档检查登记；不要重置或遗漏未提交文件。需要隔离时按工作树技能办理，不能只从 HEAD 创建空白分支后丢掉这些批准依据。

CLI 源码排重参考固定 a411612ae595239dff2de78c05aa5a8cbc6b7ea8（v2.7.2）：已核对公开命令、daily.go、daily_prepare.go、daily_standard.go、daily_v2.go 和 runtime.go。其职责是读取、校验或运行记录，本计划不声称所有内部函数均已遍历。

原生消费者回归使用模板当时现行 .template-source/distribution/yss-cli-pin.json 的完整 tuple；当前为 2.6.0-dev.1 / cc408fd0cee708a8f52e2abd67febf1f8901d141。它与上述公开源码参考分别记录，不互换资格。执行前只读核验缓存摘要和源码；缺缓存才按既有准备工具构建，不使用脏的本地旧 CLI 代替。

macOS 本轮已发现默认临时目录别名导致一项预检 fixture 失败；执行验证使用真实路径 TMPDIR=/private/tmp，保留此前失败，不在本计划修改该路径逻辑。固定二进制环境由现有 ensure-native-yss 入口提供；不要修改来源 pin 来让测试通过。

| 文件或集合 | 责任及任务 |
|---|---|
| AGENTS.md、profiles/backend/AGENTS.md；两端 .template-spec/process/agent-entry-policy.md | Task 1：普通路径与授权边界的导航。 |
| .agents/skills/yss-product-lifecycle/SKILL.md、references/conditional-guidance.md、references/daily-delivery.md | Task 1–3：唯一普通交付协议及其按需入口。 |
| profiles/backend/.agents/skills/harness-orchestrator/SKILL.md | Task 1：Backend 接入原普通协议，不复制规则。 |
| .template-source/scripts/manage-profile-skills.mjs；生成的 Backend references/daily-delivery.md | Task 1：固定一对源到目标，在组合和平台投影前生成。 |
| .template-spec/templates/spec-lite-template.md、local-parent-ticket-template.md；.template-spec/user-guide/cli/daily-and-targets.md 的非生成正文 | Task 1–2：一次需求确认、任务进度及适用复核说明。 |
| .agents/skills/implement/SKILL.md；.template-source/contracts/skill-first-task-cases.md | Task 2：渐进任务与连续质检的代表性行为。 |
| 新增 scripts/lib/daily-test-evidence.mjs；tests/daily-test-evidence.test.mjs | Task 3：纯整理接口与真实结果/拒绝测试。 |
| tests/skill-sync-efficiency.test.mjs；scripts/fixtures/role-independent-draft/daily.test.mjs | Task 1 / 3：现有生成及真实 CLI 消费 seam。 |
| .template-source/process/template-verification-profiles.yaml、scripts/lib/doc-facts-patterns.json、必要现有测试登记 | 各任务内登记新输入与直接消费者；不另建校验体系。 |
| .workbuddy/skills、profiles/backend/.workbuddy/skills、现有 skills-lock.json | 每项涉及技能的任务收口时用原生成器更新；只接收其实际相关差异。 |

共享现有函数：byteDigest(bytes) 和 parseAsset(bytes, file) 来自 scripts/lib/structured-assets.mjs；runCommand / runCommandSync 来自 scripts/lib/command-runner.mjs。不要改写这些公共函数的既有语义。to-spec / to-tickets 是显式正式兼容入口，本轮不改、不把普通请求路由过去。

### 通用生成与验证方式

涉及技能的任务结束时，从模板根按以下顺序执行；当前工具不支持单 Skill 范围参数，不添加假参数：

~~~sh
scripts/sync-skills
scripts/update-skill-lock
node .template-source/scripts/manage-profile-skills.mjs sync --profile backend
node .template-source/scripts/manage-profile-skills.mjs lock --profile backend
scripts/sync-skills --check
scripts/update-skill-lock --check
node .template-source/scripts/manage-profile-skills.mjs sync --profile backend --check
node .template-source/scripts/manage-profile-skills.mjs lock --profile backend --check
~~~

每项任务先看 scripts/verify-template-fast --plan：映射必须覆盖实际改动并保留直接/传递消费者。以下命令是任务的直接反馈循环，不能替代最后按实际差异选出的必要检查。未授权 Git 动作只保留差异与验证记录。

### Task 1：统一普通入口并修复 Backend 普通交付说明分发

**Files:**
- Modify：上述根及 Backend 入口、agent-entry-policy、yss-product-lifecycle/SKILL.md、conditional-guidance.md、harness-orchestrator/SKILL.md。
- Modify：.template-spec/templates/spec-lite-template.md、local-parent-ticket-template.md、.template-spec/user-guide/cli/daily-and-targets.md 的非生成正文。
- Modify：.template-source/scripts/manage-profile-skills.mjs:12、tests/skill-sync-efficiency.test.mjs:205。
- Generate：profiles/backend/.agents/skills/harness-orchestrator/references/daily-delivery.md，以及通用生成步骤的实际相关投影/锁。
- Modify：.template-source/agents/skills-maintenance.md，说明这一个固定生成关系及禁止手改目标；验证映射只补当前消费者。

**Interfaces:**
- Consumes：现有 request_triage.delivery_path、daily-delivery canonical 原文及 assertWorkBuddyProfilePaths(root)。
- Produces：内部 syncDailyDeliveryReference(root, {check}) -> {changed:boolean}；不是公共 CLI 或通用映射框架。
- 源固定为 .agents/skills/yss-product-lifecycle/references/daily-delivery.md，目标固定为 profiles/backend/.agents/skills/harness-orchestrator/references/daily-delivery.md。
- 目标为 UTF-8 生成注释 + 源原字节。注释精确为“<!-- Generated from .agents/skills/yss-product-lifecycle/references/daily-delivery.md; source-sha256=<64hex>. Do not edit. -->”加 LF；摘要使用源字节。
- sync 在 composeProfileTree 前生成；sync --check 和 lock / lock --check 均只校验此引用，不隐式修复。源缺失、输出路径逃逸/符号链接、无生成标识或目标正文不匹配其声明摘要时拒绝写入。已验证的旧生成目标才可随源更新。

- [x] **Step 1：扩展既有真实临时源仓 fixture，先得到失败。** 在 tests/skill-sync-efficiency.test.mjs 现有 Profile 子进程用例补齐 canonical 原文、既有 harness-orchestrator 入口和锁；覆盖源更改、目标缺失/过期、用户改动、符号链接及只读检查。测试内定义 targetFile、lockFile、expectedGeneratedBytes、originalLockBytes、userEditedBytes，使用现有 run(action, check)；这些仅是本 fixture 的路径和原字节。不要写“必须包含某句话”的文案测试。

~~~js
assert.equal(run('sync', true).status, 1);          // 目标缺失或过期
assert.deepEqual(readFileSync(lockFile), originalLockBytes);
assert.equal(run('sync').status, 0);
assert.deepEqual(readFileSync(targetFile), expectedGeneratedBytes);
// 写入 userEditedBytes 后，另一次 sync 必须拒绝且不覆盖。
assert.equal(run('sync').status, 1);
assert.deepEqual(readFileSync(targetFile), userEditedBytes);
~~~

- [x] **Step 2：运行失败基线。** Run：node --test tests/skill-sync-efficiency.test.mjs。Expected：新增固定引用生成断言失败，原身份/路径保护用例保留；不得以环境缺失作为红灯。
- [x] **Step 3：实现固定生成关系。** 在现有入口内增加上述内部函数，沿用已有 Profile 路径和身份检查；同步前读取目标并核对原字节，写前再核对，遇冲突保留现场。普通读写检查不宣称操作系统级 CAS。维护文档记录所有者与生成顺序。
- [x] **Step 4：对齐入口正文。** 明确 daily / standard，保留 governed / needs-info；移除 Spec-lite 中“决定人不能是实现者或审查者”的额外限制，继续核验真实原提问者决定。将无条件“独立审查”改为现行适用复核，不改机器路线或历史批准。Backend 链接生成参考。
- [x] **Step 5：生成并复验。** 执行通用生成步骤；Run：node --test tests/skill-sync-efficiency.test.mjs tests/workbuddy-entry.test.mjs tests/claude-entry.test.mjs；node scripts/verify-profile-distribution；node scripts/verify-doc-facts。Expected：退出 0；Backend 组合树和 WorkBuddy 中参考均为当前源，原身份、linked-profile 及路径拒绝不回退。
- [x] **Step 6：任务收口。** 核对实际生成差异只来自本任务；保存命令和结果，有提交授权时再按现行 Git 合同提交。

### Task 2：把简短 SDD 接到渐进任务和连续质检

**Files:**
- Modify：.agents/skills/yss-product-lifecycle/references/daily-delivery.md:11、.agents/skills/implement/SKILL.md:7、.template-spec/templates/spec-lite-template.md:15。
- Modify：.template-source/contracts/skill-first-task-cases.md；只追加本轮场景与观察，不改写其历史结果。
- Generate：Task 1 的 Backend 参考及实际相关平台投影/锁；入口只按需要补导航。

**Interfaces:**
- Consumes：Task 1 的普通路径入口、原需求/验收/授权、原 Ticket 和 standard 决定。
- Produces：现有任务正文中的“验收—实施任务—验证办法—当前结果”阅读对应；不增加 schema、任务编号注册或状态库。
- 总清单覆盖全部已确认 AC，当前实施项有行为、范围、必要依赖与验证办法；后续细化不得删减承诺。
- 独立技能保持直接消费已有材料。治理实例的任务进度单独记录，不改已批准 Spec-lite 来写进度；确需改主体时遵循原字节与真实决定规则。

- [x] **Step 1：建立代表性请求及预期。** 在现有样例文件追加六类输入：已授权修复、缺关键验收的新功能、已确认的 standard、同范围任务细化、会话中断、发现 API/高风险/正式绑定。每类记录输入、预期下一动作、观察依据和结果；未执行写 not-run。
- [x] **Step 2：核对当前行为。** 使用隔离小工程与现有技能入口逐项观察；已满足项直接复用，仅对实际歧义修订。不能用静态短语匹配声称 Agent 做出了正确决定。
- [x] **Step 3：补齐最小技能约定。** 明确先调查再集中问关键决定、一次汇总确认、任务渐进细化、默认自检、范围内自动修复、同类失败先诊断及具体阻塞回交。implement 已有自检/修复/独立工作边界，只补缺失的渐进组织与按需治理引用，不重复整份协议。
- [x] **Step 4：验证主体稳定和最小接续。** 用已确认 standard 场景更新任务进度，确认 Spec-lite 原字节与决定不变；改变 AC 时回交，不能续期原决定。恢复时区分运行中、结束未登记和未知结果，不重复未知副作用命令或有效确认。
- [x] **Step 5：生成、结构回归及行为核对。** 执行通用生成步骤；Run：node --test tests/public-skill-export.test.mjs tests/role-independent-contracts.test.mjs；node scripts/verify-profile-distribution；node scripts/verify-doc-facts。Expected：退出 0；独立 implement 仍可在无治理目录和无关技能损坏时使用。实际场景同时核对：每项 AC 有实施及验证对应；没有多余确认/正式资产；缺证据不宣称完成。结构通过与行为观察分开登记。
- [x] **Step 6：任务收口。** 保存真实样本数、缺失类别及实际观察；无原始时间或消息时写 unavailable，不填提效比例。获得提交授权才提交本任务。

### Task 3：真实测试结果整理、定点回写与原生完成校验

**Files:**
- Create：scripts/lib/daily-test-evidence.mjs、tests/daily-test-evidence.test.mjs。
- Modify：scripts/fixtures/role-independent-draft/daily.test.mjs:29；复用其真实 Git 仓、daily、standard 真决定 fixture 和 Backend standalone。
- Modify：.agents/skills/yss-product-lifecycle/references/daily-delivery.md 的收证段、.template-spec/process/daily-input-preparation.md 的适用边界说明。
- Modify：.template-source/process/template-verification-profiles.yaml；登记下面两个实际消费者及输入，既有同命令检查已登记时复用其 ID，不重复运行。
- Generate：Task 1 的 Backend 参考及实际相关平台投影/锁；不改 CLI 代码、prepare-inputs 参数或 schema。

**Interfaces:**
- Consumes：byteDigest(bytes)、parseAsset(bytes, "record.json")；runCommand / runCommandSync 的真实结果。
- Produces 两个纯函数；不使用 fs、spawn、Date.now、当前时间默认值、随机 ID 或治理 Authorities：

~~~js
formatObservedTest(
  { argv, cwd, executed_at, candidate_digest, result },
  { command_index, log_ref }
) // -> {log_bytes: string, test: TestRow}

prepareTaskTestEdit({
  expected_task_digest, current_markdown, current_candidate_digest,
  log_bytes, test
}) // -> {expected_old_text: string, replacement_text: string}
~~~

TestRow 固定为原协议的 command_index、exit_code、candidate_digest、log_ref、log_digest；没有 result: passed。摘要均为完整 sha256:<64hex>。result 使用现有 runner 的 status、actual_exit_code_observed、actual_exit_code、actual_exit_signal、termination、stdout、stderr 和可选 storageError；执行时间及上下文由宿主在真实调用时捕获，纯函数不能补造。

formatObservedTest 只接受已观察到的整数退出码、无信号/取消/timeout/存储错误的结果；真实非零可登记为失败。验证非空 argv、绝对 cwd、RFC3339 时间、非负整数命令索引及唯一章节引用格式；不从框架 status 推断退出码。日志只含原协议的 argv、cwd、exit_code、executed_at、stdout、stderr、candidate_digest。

log_ref 首版仅支持同 Ticket 的 #标题。log_bytes 是标题之后完整 JSON 围栏正文，使用 LF、两空格 JSON 排版及尾部 LF；log_digest 对这段全部 UTF-8 原字节计算，包含围栏和换行。新日志用一级标题，插在唯一末尾 footer 前，保持原正文前缀完全不变；已有同标题拒绝，不覆写旧日志。

prepareTaskTestEdit 严格读取 record2/policy2、daily|standard、api.mode:none 且无本任务正式绑定；校验 Ticket 原字节摘要、当前候选、索引对应的登记 argv/cwd/实现根、日志内容与 test 一致。重复 marker、尾随非空内容、重复 JSON 键、数组根及非安全整数由严格解析拒绝。只替换指定 command_index 的 tests 行（无旧行时追加），保留其他行；spec_lite、standard_decision、implementation、review 保持原义。

输出仅覆盖旧 footer 到文件尾的精确文段，新文段为新日志及更新 footer，不整体替换用户正文。宿主应用前重读核对整 Ticket 摘要，再以精确旧文段执行实际定点编辑，应用后重读并 route；普通 read/rename 不称 CAS。当前输入冲突则重新读取合并；原退出与旧日志不改写。

- [x] **Step 1：写真实结果和编辑边界的失败测试。** 在新增 test 文件用既有 runCommandSync 执行本地 Node 小进程取得真实成功与非零结果，分别调用 formatObservedTest 得到 ok / failed；candidateDigest 用本 unit fixture 的完整摘要。异常形状使用小内联数据，cancelled 为带 termination: cancelled 的输入，staleTicket 为与 expected_task_digest 不符的输入。局部 test helper 只解析围栏或在字符串上应用精确文段，不实现业务 formatter；beforeRecord / afterRecord 为编辑前后 footer 的严格解析值。

~~~js
assert.equal(ok.test.exit_code, 0);
assert.equal(failed.test.exit_code, 7);
assert.equal(ok.test.log_digest, byteDigest(ok.log_bytes));
assert.equal(ok.test.candidate_digest, candidateDigest);
assert.throws(() => formatObservedTest(cancelled, options));
assert.throws(() => prepareTaskTestEdit(staleTicket));
for (const key of ['spec_lite', 'standard_decision', 'implementation', 'review']) {
  assert.deepEqual(afterRecord[key], beforeRecord[key]);
}
assert.equal(afterMarkdown.slice(0, footerOffset), beforeMarkdown.slice(0, footerOffset));
~~~

具体命名与断言：observed_exit（0/7）、unobserved_result（取消、未启动、null、信号、storageError，不接受 status=0 伪装）、record_rejection（重复/尾随/重复键/数组/unsafe integer/API/正式绑定/版本）、binding_mismatch（索引、argv、cwd、候选、摘要）、preserve_bytes（中文/CRLF/旧日志/standard 字段）、heading_boundary（末尾风险或验收章节不被日志污染）。所有 fixture 值在 test 内明确，不引用未定义公共测试 API。

- [x] **Step 2：验证失败原因。** Run：node --test tests/daily-test-evidence.test.mjs。Expected：因新导出不存在或新边界断言失败；修正测试语法/环境错误后才进入实现。
- [x] **Step 3：实现上述两个纯接口。** 使用既有 byteDigest / parseAsset，沿严格末尾 footer 边界生成定点更新。不要复用宽松统计读取器 dailyEvidence，不扩展正式 JSON 资产事务，不新增执行器或自动批准。
- [x] **Step 4：运行 unit 并确认负例。** Run：node --test tests/daily-test-evidence.test.mjs。Expected：全部通过，异常输入未生成可登记成功或文件副作用。保留一次失败日志在新候选成功后仍不变的断言。
- [x] **Step 5：接入真实消费者。** 在现有 daily fixture 的业务命令位置使用 runCommandSync 和调用前捕获时间，接入 formatter 与定点编辑；Git/CLI 准备保留原 fixture。维持原 implementation / review 的真实生产及无前缀特定字段，不拿测试日志替代内容审查。接入 daily、standard 及 Backend；新增写回前 Ticket 被改动、日志围栏摘要互认、先失败后成功、写后 route 候选不变的断言。测试决定仅使用原 buildDecisionFixture，真实使用说明禁止拿它生成用户决定。
- [x] **Step 6：原生回归并登记检查。** 已核验固定 CLI 环境下 Run：node scripts/fixtures/role-independent-draft/daily.test.mjs；Expected：退出 0，保留原撤回、过期、伪独立等拒绝场景。在现有验证配置登记 unit 检查 check.daily-test-evidence 和原生消费者 check.daily-test-evidence-native（后者 resources:native-cli）；输入覆盖本模块、各自测试、解析依赖及相关交付引用，非法依赖/未知输入仍拒绝。
- [x] **Step 7：接入实际 Agent 使用说明。** 明确顺序：route 绑定 → 宿主真实执行 → route 确认未漂移 → 整理 → 重读及定点编辑 → 再读与 route → 实际内容复核 → verify-daily。辅助只整理 tests；实施 provenance 和 review 仍由原流程生成。standard 保持原准备，不传 prepare-inputs 或改成 daily。候选变了就保存旧结果并重新验证，不修改旧摘要来续期。
- [x] **Step 8：生成、分发及最终任务收口。** 执行通用生成步骤，Run：node scripts/verify-profile-distribution；node scripts/verify-distribution-hygiene；scripts/verify-template-fast --plan；按计划运行必要检查。核对 Spec / Backend 组合中 helper 及其现有依赖可读，独立技能导出不被要求包含它。再完成 Task 2 的修复、standard、小功能接续观察；保存实际命令、失败和未覆盖边界，获提交授权才提交。

## 计划自检与交付边界

设计覆盖：§1–4、§8 的入口与分发由 Task 1；§5、§7 和效果观察由 Task 2；§6 的真实收证与完成闭环由 Task 3；§9 的场景分别落入 RF1–RF5、既有原生拒绝及实际请求观察。两种入口、三路线政策、一次确认、渐进任务、自动修复、最小接续均有责任任务。

类型一致：仅 Task 3 生产上述两个导出，原生 fixture 和普通交付说明消费相同字段及完整摘要；Task 1 的内部函数不成为运行时接口。三项任务均包含其必需文档、投影、锁与验证映射，不设置独立“最后补配置”的任务。

用户已批准并选择 executing-plans；由同一实现者顺序完成三个共享 canonical / 投影接口的任务，最后以新上下文复核整体。实际验证命令、结果及未覆盖边界记录在本轮 maintenance 执行记录；结构检查、宿主观察与原生 fixture 分别报告。

实施完成只表示当前验收与适用检查达到相应技术终点。CLI 2.7.2 的实机资格、全部宿主发现、兼容 API 自动收证、跨仓/高风险治理改造及真实提效比例不在首轮通过声明中。
