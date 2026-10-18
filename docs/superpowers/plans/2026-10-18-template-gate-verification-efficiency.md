---
doc_type: maintenance-plan
status: draft
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-18
---

# template-gate 与日常验证精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩短模板维护者日常与 PR / MR 验证的反馈时间，保留现有放行标准和完整发布回归。

**Architecture:** 先执行不依赖重工具的入口守卫，将四项重叠守卫作为 fast 的 CI 必跑项，由同一执行器记录真实结果。复用现有计划选择、工具预检和输入观察，按所选任务准备依赖；最后只合并两组已知重复登记。

**Tech Stack:** Node 24、内置 `node:test`、现有 YAML vendor、Bash、Python 3.12 / jsonschema 4.23.0、pnpm 10.15.0、由现有 CLI pin 指定的 Go 与 yss；不新增运行依赖。

**Spec:** [设计 v0.1.0](/Users/zhudaoming/Projects/yss-spec-project-template/docs/superpowers/specs/2026-10-18-template-gate-verification-efficiency-design.md)。用户本轮回复“审批通过 继续”，批准该书面设计并授权编写本计划。设计文件保留审阅时原字节，SHA-256 为 `6afd4ff14c4815fc9e729415819985d850cb9d11c99b5c826fb1ed7664ccc214`；实施者同时读取设计与本计划。

## Global Constraints

- 保留现有放行标准和完整发布回归。以减少实际执行与环境准备成本验收，不以删除文件数量验收。
- 现有 PR 常驻守卫继续每轮适用，同一输入只执行一次；行为回归继续按影响选择。
- 纳入当前 README 文档事实与上下文预算失败的最小修复；不放宽阈值，不改成非阻断。执行基线复核（2026-10-19）：README 文档事实与上下文预算检查已通过；fast 当前 135 项，其中 16 项为 slow。
- 用文档、技能、核心验证器三类改动对比耗时及执行次数；本轮不增加固定秒数门禁。
- 保留 `ci-gate`、fast、slow、release 的职责，不新增验证框架、缓存服务、跨轮“已检查”凭据或验证档。
- Node 24、Python 3.12 / jsonschema 4.23.0、pnpm 10.15.0 沿用现有基线；Go、CLI 提交、构建配方与平台摘要读取 `.template-source/distribution/yss-cli-pin.json`，不另写版本常量。
- 不改 `RESIDENT_FILES`；常驻上下文不超过当前 14000 字节。其他预算保持 4000 字符、12500 字节，不上调。
- 保留原测试用例；首批不删除 `verification-qualification.test.mjs`、`legacy-verification.test.mjs`、`cli-core-retirement.test.mjs` 或 `ar12b-retirement.test.mjs`。`existing-ui-baseline` 继续保留。
- 历史固定提交、旧记录和批准不重写，不能把旧 ID 的成功换算为当前成功。fast 结果始终为 `limited`。
- 本次仅修改模板仓；不修改 yss-cli、独立前端工程或已有无关文档。基础运行时供给成本与重依赖准备耗时分开报告。
- 仓根为 `/Users/zhudaoming/Projects/yss-spec-project-template`；下文代码路径相对实际实施仓根。先用适用 worktree 技能复用或准备隔离目录；保留现有未跟踪设计、其他计划、`docs/process` 及用户修改。
- 本计划不授予实施、Git 提交、推送、发布或本机全局安装权限。任务末保留可审阅差异；只有会话另有相应授权才按现行 Git 工作流提交，不以技能的 commit 示例替代授权。

## Review Focus

1. 无关文档改动甚至没有变化时，也不能漏掉错误技能锁或注册表；Task 2 的“CI 空变化仍必跑守卫”和“无关文档仍拒绝坏锁”固定此行为。
2. 子进程退出 0 但返回缺项、诊断、旧 invocation 或坏日志时，CI 仍须失败；Task 2 的 fast 报告正反例及外层消费测试覆盖，默认 release 消费继续拒绝 limited。
3. 工具需求缺字段、来源资源漏报或导出值包含 shell 片段时，不得少准备依赖或执行字符串；Task 3 的严格需求输入、schema 前置和环境数据测试覆盖。
4. 准备依赖会产生 Git 忽略文件；不能将正常产物误判为源码漂移，也不能忽略源码、锁、模式或既有无关忽略文件变化；Task 3 的准备边界与最终观察测试覆盖。
5. 合并登记不能丢失历史路径、传递依赖或 Gate 关联；Task 4 的路径 / Gate 并集、单次执行与历史策略测试覆盖。

---

## 文件结构与任务关系

四项依次执行，共享计划编译与 CI 入口，不并行改同一文件。复用原有模块，不为本次优化增加通用 runner 或独立工具路由文件。

| 文件 | 责任 | 任务 |
|---|---|---|
| `README.md`、`AGENTS.md` | 既有失败的等义修复 | 1 |
| `scripts/lib/ci-gate.mjs`、`scripts/ci-gate` | 守卫定义、执行归属、报告消费及工具准备 | 2、3 |
| `scripts/lib/template-verification.mjs`、`scripts/lib/verification-selection.mjs` | 加法式 CI 必跑上下文与依赖闭包 | 2 |
| `.template-source/scripts/lib/template-verification-worker.mjs` | 无工具副作用的选择阶段与原执行阶段衔接 | 2、3 |
| `.template-source/scripts/lib/verification-report-validator.mjs` | 独立重算 CI fast 计划并核验 limited 报告 | 2 |
| `.template-source/scripts/lib/verification-preflight.mjs`、`scripts/ci-setup` | 共用工具需求及既有安装 / 摘要校验 | 3 |
| `.github/actions/setup-template/action.yml`、`.github/workflows/template-gate.yml`、`.github/workflows/template-slow-checks.yml`、`.gitlab-ci.yml` | 运行时供给、公共入口参数、报告归档 | 3 |
| `.template-source/process/template-verification-profiles.yaml` | Python 资源前置、消费者映射与重复登记合并 | 2–4 |
| `.template-source/process/github-workflows.md` | 同步实际入口行为，保留发布段落 | 3 |
| 现有 `tests/*` 中下列任务点名的文件 | 新分支及回归验证 | 对应任务 |

## 开始执行前

- [ ] 核对实施目录本地入口、HEAD、index、工作区与本设计摘要。调查 HEAD 为 `6f8f19d5a4ee7e62cbb73c9cc9ed0142ff4730c0`；若已有相关实现先复用，不能重复执行历史清理。
- [ ] 运行 `scripts/verify-template-fast --plan --json`，只查看计划。已有无关未登记文件导致拒绝时记录原因，通过隔离目录保护现场；不删除用户文件或自动扩大到 release。
- [ ] 确认当前受影响检查使用的运行时；不运行真实 `ci-setup` 改写本机工具。测试使用现有临时目录、桩与固定工具；缺工具记录边界，不伪造成功。

### Task 1: 修复当前文档与上下文预算失败

**Files:**
- Modify: `README.md:11`
- Modify: `AGENTS.md`
- Verify existing: `scripts/verify-doc-facts`、`scripts/harness-metrics`、`scripts/verify-governance-layout`

**Interfaces:**
- Consumes: 当前文档事实规则、`collectMetrics(root)` 与 `checkContextBudget(metrics, budget)`，不修改这些接口或预算 JSON。
- Produces: 文档事实与预算检查通过的现有文档；无新增生产接口、测试文件、Skill 投影或锁变化。

- [ ] **Step 1: 记录现有失败。** 分别运行 `scripts/verify-doc-facts` 与 `scripts/harness-metrics --check-budget`；调查基线分别因 README 数量复述及 `14374 > 14000` 非零退出。当前结果若变化，按实际结果确定是否仍需修复。
- [ ] **Step 2: 等义修改 README。** 删除“两个 Profile”的数量复述，保留新建 Spec / Backend、旧 Design 显式迁移、原记录与批准保护，继续链接权威入口。
- [ ] **Step 3: 等义压缩 AGENTS。** 保留身份、中文入口、授权、脏工作保护、正式合同、验证范围与模板源维护边界；不改 CONTEXT、生命周期 Skill、统计文件集或任何阈值。
- [ ] **Step 4: 运行原检查。** `scripts/verify-doc-facts`、`scripts/harness-metrics --check-budget`、`scripts/verify-governance-layout` 均须退出 0；人工逐项对照上述规则仍在。此项是文档修复，复用已有失败与检查，不新增镜像文本的测试。
- [ ] **Step 5: 保留本项差异与结果。** 记录耗时与范围；若尚有无关失败，单独记录，不扩大修复或声称 gate 已全部通过。

### Task 2: 统一 CI 守卫归属与 fast 报告消费

**Files:**
- Modify: `scripts/lib/ci-gate.mjs`、`scripts/ci-gate`
- Modify: `scripts/lib/template-verification.mjs`、`scripts/lib/verification-selection.mjs`
- Modify: `.template-source/scripts/lib/template-verification-worker.mjs`、`.template-source/scripts/lib/verification-report-validator.mjs`
- Modify: `.template-source/process/template-verification-profiles.yaml`
- Test: `tests/ci-gate.test.mjs`、`tests/verification-selection.test.mjs`、`tests/verification-report-v2.test.mjs`
- Regression: `tests/agent-hook.test.mjs`、`tests/flow-verification-routing.test.mjs`

**Interfaces:**
- Consumes: Task 1 修复后的入口文档、现有 `STEPS`、fast 检查定义及 `resolveVerificationScope` / 现有输入观察与报告 v2 接口。
- Produces: 下述 CI 守卫绑定、无工具副作用的原始选择和已核验 fast 报告；Task 3 使用这些接口决定准备及执行范围。
- Add to `STEPS`: 四项移交守卫各有 `verification_check_id`，值逐项使用设计第 3.2 节的现有 ID；原 `id/title/command/fix` 不变。导出 `ciVerificationCheckIds(): string[]`，只从该绑定派生。
- Extend `planTemplateVerification({...existing, ciGuards=false, includeSlow}={})`；`includeSlow` 是 `false | true | 'only'`，缺省保持原环境变量语义。`ciGuards` 只支持普通 fast，其他组合抛出 `CI_GUARDS_FAST_ONLY`；只添加必跑项，原因记为 `ci-required`。
- Add `selectVerificationInputs(argv: string[], root: string, {environment=process.env}={}): Promise<SelectedVerificationInputs | {help:true,values}>`，导出于 worker。正常返回 `{values, plan, scope, root, concurrency, toolingMode, purpose, invocation}`；`plan` 是原始选择，尚未调用 `addVerificationExecutionTasks`，不创建报告目录、探测工具或构建制品。`prepareVerificationPlan` 复用它，保留 help 分支，之后继续原目录校验与任务编译。
- Extend worker CLI 与 `compileExpectedVerificationPlan({...existing, environment=process.env})` 的参数解析：接受 `--ci-guards`，保持执行与独立期望同义；`environment.YSS_VERIFY_SLOW` 经同一转换生成 `includeSlow`。CI 上下文只允许默认 / allowlist 选择且不能是 slow-only；独立编译器从 root、调用参数和当前策略重算，不读 `report.plan` 作为事实。
- Extend `validateVerificationReport(report, options)`：保持默认 `requireRelease=true` 原义。仅当 `requireRelease=false` 且独立期望为 `fast/daily-necessary/current` 时，核验 `limited`、`purpose=verification`，不强制生成 release sources；其余任务、日志、实际退出、输入与 invocation 校验不减。
- `runGate` 返回形状仍为 `{status, exitCode, report, reportPath}`；外层只执行四项前移守卫，内部 fast 使用 `--ci-guards`。`report.verification` 记录 `{report_file, guard_task_ids}` 指向真实结果，不伪造四项外层进程或成功退出。

- [ ] **Step 1: 在现有测试中固定 CI 必跑集合。** 使用现有 imports，加入以下测试，并对发布 / slow 误用及失效绑定各加拒绝用例。

```javascript
test('CI 空变化仍必跑守卫且每个 ID 只出现一次', () => {
  const ids = ciVerificationCheckIds();
  assert.deepEqual(ids, ['check.skill-projection-identity', 'check.skill-lock-current',
    'check.9f66238a57e457bf', 'check.022dccdddca70b70']);
  const p = planTemplateVerification({changedFiles: [], ciGuards: true});
  for (const id of ids) assert.equal(p.commands.filter(x => x.id === id).length, 1);
  assert.equal(planTemplateVerification({changedFiles: []}).commands.length, 0);
  assert.throws(() => planTemplateVerification({profile: 'release', ciGuards: true}), /CI_GUARDS_FAST_ONLY/);
});
```

- [ ] **Step 2: 固定原始选择与报告消费测试。** 原始选择沿用现有真实临时 Git fixture，断言提交差异、index、工作树、未跟踪及中文路径不丢失；没有 native / Python / pnpm 时仍能完成选择。用现有 report-v2 fixture 生成独立 fast 期望：正确 limited 在显式非发布消费中通过，默认发布消费仍拒绝；删一个守卫、改 invocation、删日志或改为 diagnostic 分别拒绝。
- [ ] **Step 3: 固定外层行为。** 扩展 `tests/ci-gate.test.mjs` 现有 `fixture(t)` / `gate(t)`，用真实 worker 或现有报告构造器产生可核验 v2 测试报告，不能仅把桩的 exit 0 当成功。测试“无关文档仍拒绝坏锁”“四项前移失败不启动 fast”“子进程退出 0 但缺守卫报告仍拒绝”；按调用日志断言移交守卫不再由外层额外执行。
- [ ] **Step 4: 运行新增测试确认失败。** `node --test --test-concurrency=1 --test-name-pattern='CI|原始选择|limited|无关文档|守卫报告' tests/ci-gate.test.mjs tests/verification-selection.test.mjs tests/verification-report-v2.test.mjs`。应因缺接口或行为不符失败；不能因语法错误、零匹配或环境缺失代替预期失败。
- [ ] **Step 5: 绑定守卫身份。** 在 `STEPS` 上添加绑定并实现 `ciVerificationCheckIds()`；保留 hook 原名称、命令和修复说明。
- [ ] **Step 6: 扩展计划选择。** 在 `planTemplateVerification` 复用既有 mandatory-check 和依赖闭包；为 `applyDailyVerificationSelection` 的既有 mandatory 入口增加可选 `mandatoryReason='release-required'`，CI 调用传 `ci-required`。ID 缺失、绑定命令不符、release / slow-only / legacy / shadow 误用均在执行前拒绝。为生命周期注册表补足 `python-jsonschema`，并登记本任务真实消费者，不加宽为全仓匹配。
- [ ] **Step 7: 提取原始选择接口。** 实现 `selectVerificationInputs`，让原 `prepareVerificationPlan` 复用，保留 help 和目录 / 任务编译行为；选择阶段不要求 native 二进制存在。
- [ ] **Step 8: 贯通调用上下文。** CLI、worker 和独立期望编译器同义解析 `--ci-guards`；slow 模式的选择、执行、期望编译均使用同一 `YSS_VERIFY_SLOW=only` 环境，不能只给执行子进程设置。
- [ ] **Step 9: 实现受控 fast 消费。** 按上述 `validateVerificationReport` 接口扩展 limited 分支；默认 release 与历史分支原义不变，诊断报告不能借 `requireRelease:false` 混入 CI。
- [ ] **Step 10: 连接外层核验。** 子进程关闭后，按实际 fast 参数及执行环境独立编译期望，以真实 `observedExitCode`、当前 input digest、报告目录和预期 invocation 调用验证器；使用 `requireRelease:false`。错误报告使 gate 非零退出。PR / push 的 base、首提交、仓外日志和失败上报保持原义。
- [ ] **Step 11: 运行本任务检查。** `node --test --test-concurrency=1 tests/ci-gate.test.mjs tests/verification-selection.test.mjs tests/verification-report-v2.test.mjs tests/agent-hook.test.mjs tests/flow-verification-routing.test.mjs`。应全部通过，覆盖外层消费、守卫集合、默认发布拒绝和 hook 原命令引用。
- [ ] **Step 12: 保留差异及必要结果。** 本阶段仍使用已供给工具，不提前启用自动准备；任务完成不表示真实 CI、发布或平台资格已通过。

### Task 3: 复用需求判断并按需准备工具

**Files:**
- Modify: `.template-source/scripts/lib/verification-preflight.mjs`、`scripts/ci-setup`
- Modify: `scripts/lib/ci-gate.mjs`、`scripts/ci-gate`
- Modify: `.github/actions/setup-template/action.yml`、`.github/workflows/template-gate.yml`、`.github/workflows/template-slow-checks.yml`、`.gitlab-ci.yml`
- Modify: `.template-source/process/template-verification-profiles.yaml`、`.template-source/process/github-workflows.md`
- Test: `tests/verification-preflight.test.mjs`、`tests/ci-gate.test.mjs`、`tests/ci-adapters.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 `SelectedVerificationInputs.plan`、CI 守卫绑定和独立报告消费接口，以及现有 pin / lock / 运行时供给规则。
- Produces: 下述共用需求、按需准备入口与准备后的受控环境；Task 4 使用它们生成代表场景的实际结果和计时记录。
- Add `verificationToolRequirements(plan): ToolRequirements` 与 `validateVerificationToolRequirements(value): ToolRequirements` 到 preflight 模块；共用原有识别条件，数据固定为 `{schema_version:1, python:'none'|'runtime'|'jsonschema', go:boolean, native_cli:boolean, tooling:boolean, vue:boolean}`，不接受缺字段、未知字段或错误类型。
- `go` 表示所选检查直接需要 Go；原生 CLI 构建另由 `native_cli` 驱动现有固定 Go 供给，不使独立 fast 的预构建二进制消费者额外依赖 Go。安装 pnpm 运行器的需求由 `tooling || vue` 派生；`tooling=false` 不安装模板工具依赖。
- `verificationPreflight` 消费同一需求，保持现有 Node、Python、pin、lock 与 Vue 校验。未标 daily 的旧计划保留原有保守前置语义。
- Add `scripts/ci-setup --requirements-file <绝对 JSON 文件> [--dry-run]`；严格读取上述数据，不能与 `--no-python/--toolchain/--yss-commit` 混合使用。无需求文件的原有参数行为保持兼容；`--print-versions` 不变。
- Extend `runGate({...existing, prepareTools=false})` 与 CLI `--prepare-tools`。开启后先完成入口守卫与 Task 2 原始计划，写仓外需求文件，再调用 `ci-setup`；本机仍受现有 CI / 显式本地允许限制。
- Add 私有 `readCiSetupEnvironment(file): Record<string,string>`；仅接受 `YSS_NATIVE_SOURCE_ROOT`、`YSS_NATIVE_BINARY`、`YSS_NATIVE_BINARY_SHA256`、`YSS_VUE_TOOLCHAIN`，校验绝对目录 / 文件和摘要形状；作为数据合并进子进程环境，不 source、不 eval。本轮使用 report 目录下专用 `setup.env`，不读取整份 GitHub 环境文件。
- Add setup action 输入 `runtime-only`，默认 `'false'`；`'true'` 仅沿用原基础运行时供给，不调用重依赖安装。两个 GitHub workflow 开启此值并调用公共 gate `--prepare-tools`；GitLab 移除外层全量 setup / source，使用同一公共选项。

- [ ] **Step 1: 固定需求与准备测试。** 在 preflight 测试中加入下列测试；补齐 direct Go、pnpm、Vue、非 daily 保守前置及非法字段矩阵。沿用现有探针桩证明最终预检和准备需求一致。

```javascript
test('CI 文档计划保留 schema 前置但不准备无关重工具', () => {
  const p = planTemplateVerification({changedFiles: ['README.md'], ciGuards: true});
  assert.deepEqual(verificationToolRequirements(p), {
    schema_version: 1, python: 'jsonschema', go: false,
    native_cli: false, tooling: false, vue: false,
  });
  assert.throws(() => validateVerificationToolRequirements({schema_version: 1}));
});
```

- [ ] **Step 2: 固定安装与导出边界测试。** 在现有 ci-setup 临时 shell / CLI fixture 中传需求文件：仅 schema 时没有 CLI 获取 / 构建、模板 pnpm install 或 Vue install；native 时仍核验精确 Go 和摘要；Vue-only 不安装模板 tooling。错误 JSON / 类型 / 路径及参数混用在准备前非零退出。环境字符串中的 `$()` / 反引号不得产生 sentinel 文件；未知变量、坏摘要或非法路径拒绝。不启动真实安装或使用本机全局工具作为桩。
- [ ] **Step 3: 固定输入观察边界测试。** 复用 `createIntakeSnapshotObserver`，在前移守卫前、守卫后、准备后及最终结束观察输入。守卫阶段任意变化拒绝；准备阶段只能接受本轮明确请求生成的、Git 确认忽略且未被跟踪的 `.template-source/tooling/node/node_modules/` 内容变化；其他源码、锁、模式、gitlink、index、HEAD 或无关忽略文件变化拒绝。准备结束后 fast 与外层恢复完整原口径，依赖内容再次变化同样失败。测试正常安装产物不误报，以及同一已有脏文件再次变化仍能被发现。
- [ ] **Step 4: 运行新增测试确认失败。** `node --test --test-concurrency=1 --test-name-pattern='需求|准备|导出|输入观察|schema 前置' tests/verification-preflight.test.mjs tests/ci-gate.test.mjs`；应命中新接口和新行为并失败，不能以无匹配作为红灯。
- [ ] **Step 5: 实现共用需求接口。** 在 preflight 模块实现上述纯函数、严格 validator 并让原探测消费其结果。核对会追加制品准备任务的所选检查，其资源声明须覆盖实际 native / tooling 前置；用现有 CLI 内容检查的计划固定这一点，不在依赖未准备时提前编译原生执行 tuple。
- [ ] **Step 6: 扩展现有 setup。** `ci-setup` 以同一 validator 读取需求文件并只输出受控枚举 / 布尔量给 Bash；复用既有安装、pin、frozen lock 和导出逻辑，不重新实现它们。
- [ ] **Step 7: 连接准备选项与环境。** `runGate` 调用 Task 2 的原始选择、计算需求，再调用 setup；实现私有环境数据读取。准备失败、中断或输入变化时不启动 fast，保留日志与实际失败；用准备后的同一环境执行和独立编译报告。
- [ ] **Step 8: 实现分段观察。** 前移守卫先证明只读；准备时比较现有 snapshot 的完整 Git 部分与允许产物之外的文件。产物例外必须同时满足 `requirements.tooling===true`、该目录被 Git 忽略且没有任何被跟踪条目；只存在于该次准备比较，不修改 `read-only-intake.mjs`、`RESIDENT_FILES` 或 fast 的全局排除规则。准备后重算原始计划及需求，必须与准备前一致；由完整现有观察口径核对 fast 结果和本轮终态。
- [ ] **Step 9: 更新适配器和说明。** 保留 `template-gate` 名称、触发、完整 base、只读仓库权限、取消策略与报告路径；slow 保留仅定时 / 手动及测试步骤 5 分钟上限。适配器只转发公共入口，不写检查或需求判断。更新当前行为说明，保持轻量发布与完整发布的既有边界，不把本轮计时目标变成新增门禁。
- [ ] **Step 10: 运行本任务检查。** `node --test --test-concurrency=1 tests/verification-preflight.test.mjs tests/ci-gate.test.mjs tests/ci-adapters.test.mjs`，以及 `bash -n scripts/ci-setup`，均须通过。既有默认 setup dry-run、固定 Go 拒绝和 pin 校验测试继续通过。
- [ ] **Step 11: 保留差异及结果。** 报告中区分基础运行时、准备和测试耗时；桩测试只证明路由及拒绝行为，不写成真实构建、CI 或平台已验证。

### Task 4: 合并重复登记并完成代表场景验证

**Files:**
- Modify: `.template-source/process/template-verification-profiles.yaml`
- Test: `tests/verification-selection.test.mjs`
- Regression: `tests/verification-gates.test.mjs`（由 selection 导入）、`tests/legacy-verification.test.mjs`、`tests/verification-script-retirement.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 CI 计划、Task 3 的共用工具需求和真实 CI 报告；沿用 `verificationPolicyDigest`、`validateGateConfiguration` 与现有历史编译接口。
- Produces: OpenAPI 保留 `check.openapi-validation-scenarios`，移除当前重复登记 `check.work-layout-openapi-draft-validation`；结构化资产保留 `check.structured-assets`，移除当前重复登记 `check.work-layout-assets`。不删除测试文件或历史源记录。
- 合并保留两侧输入、资源、依赖并集；OpenAPI 保留 `native-cli` 并绑定 `check.verification-lifecycle` 与 `check.verification-governance-syntax`，结构化资产保留 `python-jsonschema` 及现有语法 Gate。只在实际命令、断言与约束可等价合并时执行，若发现独立失败语义则保留该组区分并记录证据。

- [ ] **Step 1: 固定当前覆盖对照。** 从现有配置解出命令与迁移后的实际 file / argv，记录两组的输入、依赖、资源、Gate 及用例。当前两组的别名输入都是保留登记的子集；不将“缺资源声明”的别名当成可以削弱保留登记的依据。
- [ ] **Step 2: 写合并回归测试。** 命名为“重复登记合并保持输入与 Gate 并集”：逐项触发旧输入，断言保留 ID 恰好一次且旧别名不在当前清单；断言 OpenAPI 两个 Gate、结构化资产 Python 前置与依赖闭包仍在。沿用历史策略测试，旧 SHA 的旧 ID 仍由旧策略解释，不用当前新 ID 替换。

```javascript
test('重复登记合并保持输入与 Gate 并集', () => {
  const c = loadVerificationProfiles();
  const ids = c.profiles.fast.checks.map(x => x.id);
  for (const old of ['check.work-layout-assets', 'check.work-layout-openapi-draft-validation'])
    assert.equal(ids.includes(old), false);
  for (const gate of ['check.verification-lifecycle', 'check.verification-governance-syntax'])
    assert.ok(c.gates.find(x => x.id === gate).check_ids.includes('check.openapi-validation-scenarios'));
  const p = planTemplateVerification({changedFiles: ['scripts/fixtures/structured-assets/assets.test.mjs']});
  assert.equal(p.commands.filter(x => x.id === 'check.structured-assets').length, 1);
  assert.ok(p.commands.find(x => x.id === 'check.structured-assets').resources.includes('python-jsonschema'));
});
```

- [ ] **Step 3: 运行回归测试确认失败。** `node --test --test-concurrency=1 --test-name-pattern='重复登记合并' tests/verification-selection.test.mjs`；现有重复登记应使测试失败。
- [ ] **Step 4: 合并两组当前登记。** 更新 fast 清单、当前 Gate 引用与必要输入映射。保留稳定 canonical ID、历史迁移映射、旧路径识别及全部有效用例；不清理 supplemental 的其他重复条目或扩大到整套测试重构。
- [ ] **Step 5: 运行相关检查。** `node --test --test-concurrency=1 tests/verification-selection.test.mjs tests/legacy-verification.test.mjs tests/verification-script-retirement.test.mjs` 与 `scripts/verify-work-layout` 通过。selection 已导入 gates、baseline、qualification 测试，不再逐文件单独重复执行；若无新失败不扩大验证集合。
- [ ] **Step 6: 对比三个代表场景。** 复用现有 CI / verification fixture 与报告：文档改动、技能改动、核心选择器改动。原始计划分别使用 `README.md`、`.agents/skills/yss-domain/SKILL.md`、`scripts/lib/verification-selection.mjs`；实际 CI 比较必须在对应固定场景检出上运行，不能用显式文件清单藏掉真实其他改动。记录四项守卫各一次、所需工具、实际命令与退出、准备时间、执行时间、总墙钟及 slow 延后项。
- [ ] **Step 7: 给出真实证据边界。** 同一 runner / 固定依赖上能实际执行的场景运行一次即可；优化前后只比较相同场景及已通过 Task 1 的相同文档状态。没有可用真实 CI 或固定工具时，交付本地回归和计划对照，明确耗时未验证；不得重启远程任务、推送分支或构建 CLI 仅为补性能数字。真实 CI 待已授权 PR / push 产生证据，不把已有不同提交的 123 / 81 秒直接当本轮百分比收益。
- [ ] **Step 8: 完成本轮差异检查。** `git diff --check`，核对用户已有文件及受保护测试未被修改 / 删除，记录必要检查与未覆盖项。日常交付保持 `implementation-ready/limited`；完整 release、固定 CLI 集成和平台资格只在实际集成 / 发布任务按现行合同执行。

## 自检与执行交接

设计第 3、5 节由 Task 2 覆盖，第 4 节由 Task 3 覆盖，第 6 节由 Task 1 覆盖，第 7 节由 Task 4 覆盖；第 8、10 节的失败、漂移、恢复与验证边界贯穿各任务。Review Focus 的五类输入均已分配到对应测试。

计划补明了两处现有实现限制：`requireRelease:false` 目前仍拒绝 limited / 要求发布来源，因此 Task 2 必须实现受控 fast 消费；输入观察包含忽略文件，因此 Task 3 仅对本轮合法准备产物作阶段内区分，不能扩大为全局排除。其余设计范围与阈值保持。

建议 **Native**：当前会话按上述顺序实施，再由独立上下文复核整批差异；四项共享接口，逐项开新上下文的收益有限。计划尚待用户审阅并选择执行方式；选择其他方式时按其要求执行。本计划与设计批准均不自动授予 Git 提交、推送或发布授权。
