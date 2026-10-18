# 过时测试与验证重复清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修复过时筛选导致的漏测，删除已无消费者的代码，并在保留发布必跑与历史读取的前提下消除测试重复执行。

**Architecture:** 在现有检查注册表中明确消费者，复用 `planTemplateVerification` 的 `mandatoryChecks` 选择与独立报告编译。先恢复产物覆盖、完成直接删除和原生测试迁移，再统一发布必跑登记；不重写调度器。

**Tech Stack:** 现有 Node.js ESM、`node:test`、YAML 注册表、固定原生 yss CLI、现有 Go 夹具；版本要求沿用根及工具包 `package.json` 与 CLI pin。

**Spec:** [过时测试与验证重复清理设计](../specs/2026-10-18-test-retirement-and-verification-dedup-design.md)。本文件是模板维护计划，不是产品阶段 Plan、Ticket 或批准。

## Global Constraints

- 只修改模板仓；不修改、采用或发布 yss-cli，不改变 CLI pin、Bundle、来源锁或证据 Schema。
- 不新增依赖、测试框架、跨轮缓存或通用测试去重器；复用现有 `mandatoryChecks`、任务编译和独立报告核验。
- 未知路径、缺输入映射、非法依赖和陈旧证据继续拒绝；fast 保持 `limited`，release 保持 `committed`。
- 历史固定提交、117 条覆盖、历史摘要及恢复语义保持原义；不批量删除历史路径映射。
- 不按 retirement、legacy 或 frontend 等文件名批量删除测试；用户资产保全、协议拒绝和权限回流反例继续保留。
- 实现使用隔离工作树并保留用户原有修改；提交、推送、合并、安装和发布须有对应授权。
- 验证只覆盖本轮改动及真实消费者；没有执行的检查、正式发布或平台资格不得声明通过。

## Review Focus

1. 名称筛选未匹配任何业务用例但 Node 文件级条目仍通过：Task 1 用真实登记参数和 sentinel 证明目标实际运行。
2. release 无变化或已选中普通检查：Task 4 仍选齐八项必跑且目标模块只执行一次；普通 fast 不受发布清单扩大。
3. 合并登记损失 Gate、committed、资源或依赖：Task 4 校验并集和独立报告拒绝，错误配置在执行前失败。
4. checkpoint 被其他门禁提前拒绝、旧输入变化或草案离开正式化：Task 3 必须看到真实 `business-checkpoint` 结果，不能把非零退出泛化成目标检查有效。
5. 历史基线、未映射新路径与无关文档：Tasks 1、2、4 分别验证文档窄映射、固定历史摘要及历史读取；不能通过删映射或扩大通配豁免获得通过。

---

## 基线、文件职责与执行顺序

规划基线为 `c37b6869c472891fc515e8e7e98200870762fca0`。执行前按 using-git-worktrees 建立或复用本计划专属隔离工作树，记录真实 HEAD、index、status；原工作树有未跟踪设计 / 计划，CLI 原工作树也有其他修改，均不得恢复或覆盖。先核对已实现记录；本计划不重做 `900e386c` 的 CI 工具准备优化，也不混入尚在另一工作树的 SHA-256 输入准备能力。

| 文件 | 职责 / 任务 |
|---|---|
| `.template-source/process/template-verification-profiles.yaml` | 检查、输入、资源及发布必跑清单；Tasks 1、3、4 顺序维护 |
| `scripts/lib/template-verification.mjs` | 校验并合并 release.required_checks；Task 4 |
| `.template-source/scripts/lib/verification-gates.mjs` | 必跑普通任务 committed 与 Gate 责任；Task 4 |
| `tests/verification-selection.test.mjs` | 消费者选择和入口隔离；Tasks 1、4 |
| `tests/verification-execution.test.mjs`、`tests/verification-report-v2.test.mjs` | 真实编译 / 调度和独立报告拒绝；Task 4 |
| `.template-source/scripts/lib/verification-artifacts.mjs`、`tests/verification-artifacts.test.mjs` | 退役空壳与无效 Go 准备；Task 2 |
| `scripts/lib/legacy-coverage.mjs`、`tests/legacy-coverage.test.mjs` | 删除反向压缩器，保留历史展开；Task 2 |
| `scripts/lib/business-tickets.mjs`、`scripts/fixtures/business-tickets/business-tickets.test.mjs`、`tests/business-ticket-native-report.test.mjs` | 两场景迁到公开入口后删除旧函数；Task 3 |
| 本设计与本计划 | 实施时给 doc-facts 登记两个精确路径；Task 1 |

只创建上面两份规划文档；实施不新增测试文件、Schema 或公共 API。Tasks 1 → 2 → 3 → 4；若 Task 3 的固定 CLI 前置不成立，记录该项待处理并保留旧代码，Task 4 可以继续，但不得把 AC4 标完成。

### Task 1: 恢复产物实际覆盖并固定消费者

**Files:**
- Modify: `.template-source/process/template-verification-profiles.yaml`（check.template-release-sources、fast checks、G20、doc-facts）
- Test: `tests/verification-selection.test.mjs`
- Regression: `tests/verification-artifacts.test.mjs`、`.template-source/scripts/tests/template-ci.test.mjs`

**Interfaces:**
- Consumes: `planTemplateVerification({profile,changedFiles,config,root})` 和 `compileTaskExecution(task,{root,reportDir,environment})`。
- Produces: `check.verification-artifacts`，完整文件命令 `node --test tests/verification-artifacts.test.mjs`，资源 `[native-cli, go]`，group `feature-assets`，Gate `check.verification-final-integrity`；既有函数签名不变。

- [x] **Step 1: 加入行为回归。** 在 selection 文件增加“产物消费者实际执行来源收集且不依赖旧名称”。用配置选出的命令经 `compileTaskExecution` 得到真实 argv，只将测试文件操作数替换为仓外临时模块；产物模块注册与当前“发行来源收集”相同完整名称的测试并写 marker，其他文件为空模块。保留登记的名称参数，删除子进程环境中的 `NODE_TEST_CONTEXT`。断言子进程真实退出零且 marker 存在；另外固定消费者断言：

```javascript
for (const ref of ['tests/verification-artifacts.test.mjs', '.template-source/scripts/lib/verification-artifacts.mjs']) {
  const p = planTemplateVerification({changedFiles: [ref]});
  assert.equal(p.commands.filter(x => x.id === 'check.verification-artifacts').length, 1);
}
const onlyTest = planTemplateVerification({changedFiles: ['tests/verification-artifacts.test.mjs']});
assert.ok(!onlyTest.commands.some(x => x.id === 'check.template-release-sources'));
assert.throws(() => planTemplateVerification({changedFiles: ['tests/new-unregistered-audit.test.mjs']}), /UNKNOWN_VERIFICATION_PATH/);
// child 和 marker 来自本步骤的真实 sentinel 子进程。
assert.equal(child.status, 0);
assert.equal(fs.existsSync(marker), true);
```

- [x] **Step 2: 运行 RED。** `node --test --test-name-pattern='产物消费者实际执行来源收集' tests/verification-selection.test.mjs`。Expected: 因缺新检查或 marker 未产生失败；不能以 import、环境错误或零匹配代替 RED。
- [x] **Step 3: 修正登记。** 按设计 3.1 拆开两个消费者；新检查输入为适配器源码、产物测试和 `.template-source/distribution/yss-cli-pin.json`。旧检查保留来源源码、template-ci 测试及旧删除路径，移出产物测试路径和旧名称分支；保留其余旧资源 / 依赖。doc-facts 增加本设计、本计划两个精确路径，不加 `docs/**` 通配。同步 G20 绑定与新增测试的选择映射。
- [x] **Step 4: 运行 GREEN。** 重跑 Step 2。再用选择计划断言新检查有 native-cli、go 资源，两个新文档选中 doc-facts，无关文档不选择产物检查。Expected: 断言全部通过。
- [x] **Step 5: 跑真实消费者。** 在已供给的固定原生环境运行 `node --test tests/verification-artifacts.test.mjs`，以及 `node --test --test-name-pattern='固定发行拒绝缺失|发行验证在有 yss-cli 固定文件时|浮动版本与脏树' .template-source/scripts/tests/template-ci.test.mjs`。Expected: 产物当前五项、来源三个具名场景实际执行并通过；固定工具缺失如实阻断，不临时安装用户 CLI。
- [x] **Step 6: 留审阅检查点。** 记录实际命令和结果；有独立提交授权才提交本任务路径，建议消息 `fix(test): restore artifact consumer coverage`，无授权保留差异，不运行 git commit。

### Task 2: 删除三个无消费者函数和旧夹具准备

**Files:**
- Modify: `.template-source/scripts/lib/verification-artifacts.mjs`、`tests/verification-artifacts.test.mjs`
- Modify: `scripts/lib/legacy-coverage.mjs`、`tests/legacy-coverage.test.mjs`
- Regression: `tests/verification-execution.test.mjs`、`tests/verification-report-v2.test.mjs`

**Interfaces:**
- Consumes: Task 1 完整产物检查，以及现有 `sourceTuple`、`produceCliArtifact`、`validateArtifact`、`expandLegacyCoverage(config)`。
- Produces: 上述现役接口保持不变；移除三个内部导出 `prepareCliSourceConsumer`、`validateCliSourceConsumer`、`compactLegacyCoverage`。不定义替代函数。

- [x] **Step 1: 记录删除前基线。** `node --test tests/legacy-coverage.test.mjs`；`node --test --test-name-pattern='旧源码消费任务|当前报告拒绝挂靠退役源码回执' tests/verification-execution.test.mjs tests/verification-report-v2.test.mjs`。Expected: 历史读取、固定摘要以及执行前拒绝均通过。
- [x] **Step 2: 确认调用闭包。** 全仓搜索三个导出名，包含无扩展脚本、测试、配置、分发与字符串引用，排除生成 vendor / 索引；核对结果仍只有原定义与待删除测试。Expected: 无新消费者；若出现，先保留对应函数并记录变化，不将“调用者是测试”扩展为其他函数都能删。
- [x] **Step 3: 删除空壳与无效准备。** 删除两条抛错函数、其说明和两个对应断言，调整 import；只删除产物测试生成 `tools/package/main.go` 的语句，保留真实 `main.go`、`go.mod` 和 `go build`。将第三项产物测试名改为“固定原生消费保留完整 Bundle 并绑定二进制 bytes”。
- [x] **Step 4: 删除迁移压缩器。** 删除 `compactLegacyCoverage`、对应 import 及“压缩再展开是恒等变换（用真实的 117 条验证）”一项测试。保留所有展开错误反例，以及历史长度 117 和摘要 `8fdcd99b97a508b39602fd0e0ec4048c9c9cbfdb84fc1444b316e3a9b5ea70c5` 的断言。
- [x] **Step 5: 跑删除后回归。** 重跑 Step 1，再运行 `node --test tests/verification-artifacts.test.mjs`。Expected: 均通过，来源收集场景仍实际编译 Go，安装树污染与受管升级 / 回退仍执行。本任务为无消费者删除，不新增“导出不存在”测试，不伪造 RED。
- [x] **Step 6: 留审阅检查点。** 记录真实净删除和保留行为；有对应授权才提交，建议消息 `refactor(test): remove retired consumers and unused fixture setup`。

### Task 3: 将两个旧 checkpoint 场景迁到原生入口

**Files:**
- Modify: `tests/business-ticket-native-report.test.mjs`
- Modify: `scripts/lib/business-tickets.mjs`、`scripts/fixtures/business-tickets/business-tickets.test.mjs`
- Modify: `.template-source/process/template-verification-profiles.yaml`（现有业务原生检查的精确输入）

**Interfaces:**
- Consumes: 原生报告测试的 `run(args)`、`approvedSpecFixture(root,{nativeSeed})`、`f.plan.write(ref,value)`、`f.state`、`f.checkpointRef`；真实 `yss lifecycle verify --root <root> --checkpoint <ref> --json`。
- Produces: 两个公开入口场景；删除 `assertBusinessCheckpoint(root,state)`，其余业务函数签名不变。业务结果读取 `envelope.result.checks.find(x => x.id === 'business-checkpoint')`。

- [x] **Step 1: 核对固定原生前置。** 使用现有固定工具供给方式，先运行 `node --test --test-name-pattern='严格消费者：Spec baseline、checkpoint 与 progression' tests/business-ticket-native-report.test.mjs`。Expected: 原有公开入口基线通过。若 CLI 能力 / 身份 / 政策不支持，保留本任务代码并标待处理，不修改 CLI/pin；Task 4 可继续。
- [x] **Step 2: 加入“原生 checkpoint：进入设计缺集合拒绝、恢复集合接受”。** 复用当前已批准 Spec fixture 和已有 artifact.plan → artifact.plan-record 兼容处理。基线先证明公共结果有业务检查；保存集合绑定，删除 `state.artifacts['artifact.business-ticket-set']` 与可能的 `state.business_ticket_set_ref`，保持 `stage.spec-architecture`、`next_work_unit=work-unit.prototype-design-v2`，写回当前 checkpoint 后调用公开入口。固定断言：

```javascript
assert.equal(missing.envelope.result.checks.find(x => x.id === 'business-checkpoint')?.status, 'failed');
assert.equal(restored.envelope.result.checks.find(x => x.id === 'business-checkpoint')?.status, 'passed');
```

恢复原绑定再验证。缺业务检查、Schema 提前拒绝或单纯非零退出均不能代替以上结果。

- [x] **Step 3: 加入“原生 checkpoint：正式化入口允许草案、出口拒绝草案并观察变化”。** 在独立同类 fixture 中，将集合和其中业务票改为 `draft`，重算票绑定、集合审查 subject 等夹具输入；只使用测试自身新生成证据。令 `stage=stage.ticket-formalization`、`next_work_unit=work-unit.business-ticket-formalization`，业务检查须 passed；随后改为 `next_work_unit=work-unit.strategic-design-handoff`，业务检查须 failed；再回到正式化入口，只改变原始票字节而不刷新摘要，业务检查须从 passed 变为 failed。每次写回并重新执行 CLI，不复用旧返回。场景只证明该业务检查，其他门禁结论原样保留：

```javascript
assert.equal(enter.envelope.result.checks.find(x => x.id === 'business-checkpoint')?.status, 'passed');
assert.equal(leave.envelope.result.checks.find(x => x.id === 'business-checkpoint')?.status, 'failed');
assert.equal(stale.envelope.result.checks.find(x => x.id === 'business-checkpoint')?.status, 'failed');
```
- [x] **Step 4: 执行迁移对照。** `node --test --test-name-pattern='原生 checkpoint：' tests/business-ticket-native-report.test.mjs`。Expected: 两项具名场景均运行并满足结果。已存在的正确行为可直接通过，记迁移基线；失败须先定位真实缺口。原生语义缺陷超出本计划写范围时保留旧函数并报告，不以只调用内部校验或桩替代公共入口。
- [x] **Step 5: 删除旧实现与两项测试。** 只有 Step 4 完成才删除 Node `assertBusinessCheckpoint`，以及“手改 checkpoint 进入 Design 不能跳过 Spec 业务草案”“Design 可携带草案进入业务正式化，离开前必须正式化”两项旧测试和 import。给现有 `check.business-ticket-native-report` 增补旧业务源码 / 夹具的精确输入，复用该检查，避免发明第二套入口。
- [x] **Step 6: 运行迁移后回归。** `node --test tests/business-ticket-native-report.test.mjs scripts/fixtures/business-tickets/business-tickets.test.mjs`。Expected: 全部通过，来源越界、旧摘要、审查和严格消费者不退化。必要时复用 Step 1 供给；不额外启动服务或修改 Go 源码。
- [x] **Step 7: 留审阅检查点。** 记录两项旧断言到公开场景的对应关系、原生二进制身份和未覆盖门禁；有授权才提交，建议消息 `test(lifecycle): cover business checkpoint through native entry`。

### Task 4: 统一发布必跑、拆开重叠套件并验证责任不丢失

**Files:**
- Modify: `.template-source/process/template-verification-profiles.yaml`
- Modify: `scripts/lib/template-verification.mjs`、`.template-source/scripts/lib/verification-gates.mjs`
- Modify/Test: `tests/verification-selection.test.mjs`、`tests/verification-execution.test.mjs`、`tests/verification-report-v2.test.mjs`
- Regression: `tests/verification-gates.test.mjs`、`tests/verification-baseline.test.mjs`、`tests/verification-qualification.test.mjs`、`tests/legacy-verification.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `check.verification-artifacts`；`applyDailyVerificationSelection(...,{mandatoryChecks})`；`addVerificationExecutionTasks(plan,{root,reportDir,environment})`；`validateVerificationReport(report,options)`。
- Produces: 可选 `profiles.release.required_checks: string[]`，本仓固定为设计 3.2 的八项；现有公开函数签名不变。非法显式清单抛出 `RELEASE_REQUIRED_CHECKS_INVALID`。历史配置缺字段仍按原规则读取。

- [x] **Step 1: 固定“发布必跑唯一覆盖”回归。** 在 selection 测试中，对 `changedFiles=[]`、策略文件、CLI pin 三类 release 计划断言八项 ID 各出现一次、来源 committed；编译完整执行计划，逐项检查 legacy、pin、gates、baseline、qualification、delivery-run、legacy-verification、execution、script-retirement、preflight、report-v2、artifacts 这些测试文件只出现在一个待执行检查的 argv 中。fast 的 README 变化不因 required_checks 增加这些必跑；显式 `selection:'legacy'|'shadow'` 命中 candidate-integrity 时仍包含 release-profile-consumers、daily-report，两个模式命令集合保持相同。加入非法值 `null`、`'check.x'`、`['']`、重复已知 ID、未知 ID 的拒绝反例。

```javascript
const required = ['check.release-profile-consumers', 'check.daily-execution',
  'check.verification-script-retirement', 'check.daily-preflight',
  'check.verification-report-v2', 'check.verification-artifacts',
  'check.legacy-coverage', 'check.yss-cli-pin'];
for (const changedFiles of [[], ['.template-source/process/template-verification-profiles.yaml'], ['.template-source/distribution/yss-cli-pin.json']]) {
  const p = planTemplateVerification({profile: 'release', changedFiles});
  assert.equal(p.source_requirement, 'committed');
  for (const id of required) {
    assert.equal(p.commands.filter(x => x.id === id).length, 1, id);
    assert.equal(p.commands.find(x => x.id === id).source_requirement, 'committed');
  }
}
for (const value of [null, 'check.x', [''], [required[0], required[0]], ['check.not-registered']]) {
  const config = loadVerificationProfiles(); config.profiles.release.required_checks = value;
  assert.throws(() => planTemplateVerification({profile: 'release', config}), /RELEASE_REQUIRED_CHECKS_INVALID/);
}
```
- [x] **Step 2: 固定隐式重复的行为反例。** 在 execution 文件增加“套件入口独立：显式 gates 用例只运行一次”。子进程真实执行 `node --test --test-reporter=tap --test-name-pattern='补充检查拒绝' tests/verification-selection.test.mjs tests/verification-gates.test.mjs`；只统计匹配具名 Subtest 的记录，不能统计文件级假通过，断言一次。该子进程不运行 execution 文件自身，避免递归。
- [x] **Step 3: 固定“必跑责任报告”反例。** 在现有 report-v2 fixture 上验证普通必跑任务被独立重建进 expectedPlan；正确报告通过，删除一项必跑任务及结果、丢失原 Gate、改实际执行 tuple 均拒绝。用现有受控 diagnostic fixture 真实运行两个不同计数器任务，证明一个退出 7 时结果仍失败、未被成功复用掩盖；不拿 diagnostic 报告冒充 release。历史固定提交的编译不附加当前必跑清单。
- [x] **Step 4: 跑 RED。** `node --test --test-name-pattern='发布必跑唯一覆盖|套件入口独立|必跑责任报告' tests/verification-selection.test.mjs tests/verification-execution.test.mjs tests/verification-report-v2.test.mjs`。Expected: 缺 required_checks、重复具名用例或责任未迁移导致失败；不是工具缺失。
- [x] **Step 5: 接入小范围必跑配置。** 仅在 `planTemplateVerification` 的 release 分支，用 `Object.hasOwn(config.profiles.release,'required_checks')` 区分缺字段和显式非法值：缺字段按 `[]`，显式 `null` 等非法值拒绝。校验 ID 后与原 Gate 必跑 ID 去重合并，传给原 mandatoryChecks；未知 ID 在选择前拒绝。`buildReleasePlan` 为显式必跑检查标明 `source_requirement:'committed'`，从当前 Gate 绑定取责任；不要修改 runner 的复用 key、资源锁或失败语义。
- [x] **Step 6: 收敛配置和测试入口。** 按设计 3.2–3.3 填入八项清单，移除三个 supplemental；拆分 daily-report 与新 `check.verification-report-v2`，保留旧输入 / 资源并集。去掉 selection 的三个副作用 import；daily-selection 完整执行 selection 文件；组内 selection 移出 report。在 candidate-integrity 组以同 ID、同命令、同资源登记 release-profile-consumers 与 daily-report，保留 legacy / shadow 覆盖。把 gates 输入移交 release-profile-consumers，并将旧 group report 来源补给 daily-report。补齐 pin 的 lifecycle Gate 与原 optimization 批次的 final-integrity 责任，保留原 distribution Gate。
- [x] **Step 7: 运行 GREEN 与历史回归。** 重跑 Step 4；再运行 `node --test --test-concurrency=1 tests/verification-selection.test.mjs tests/verification-gates.test.mjs tests/verification-baseline.test.mjs tests/verification-qualification.test.mjs tests/legacy-verification.test.mjs tests/verification-execution.test.mjs tests/verification-report-v2.test.mjs tests/verification-preflight.test.mjs tests/verification-delivery-run.test.mjs`。Expected: 当前选择、独立报告、历史源读取与失败拒绝均通过；同一测试命令不因多个任务重复执行。
- [x] **Step 8: 记录同场景观察与收尾。** 对策略变化、pin 变化保留前后计划和实际调度次数；轻量计数器实验只证明路由，至少真实运行一次目标套件确认具名用例。运行 `scripts/verify-doc-facts`、`git diff --check` 和 `scripts/verify-template-fast --plan --json`；后者必须消费完整当前差异，不用子集掩盖未知路径。必要检查通过即结束；完整发行验证另按授权处理。
- [x] **Step 9: 最终复核与交接。** 按已选执行方式做整轮复核，列出实际完成、延期的 A4、风险与回退。保留原工作树；发生回退时只撤销本计划对应修改，不能重置用户后续编辑。有对应授权才提交，建议消息 `perf(test): consolidate required verification consumers`；不自动合并、推送或发布。

## 自检与执行交接

覆盖关系：A1 / AC1 → Task 1；A5–A7 / AC5 → Task 2；A4 / AC4 → Task 3；A2–A3 / AC2–AC3 / AC6 → Task 4。五项 Review Focus 均有归属测试；纯删除复用现有行为测试，不增加镜像测试。跨任务只共享现有检查 ID 和 Task 1 新增检查；配置修改顺序执行，避免并行覆盖。

本计划沿用用户此前选择的 Native / executing-plans：同一执行者顺序完成，最后一次独立上下文复核。请先审阅本设计和计划是否符合本轮范围；本文件没有授予实现、提交、采用固定 CLI 或发布资格，也没有将审计实验写为实现通过。

规划期自检：需求 A1–A7、验收 AC1–AC6、五项 Review Focus 均已对应到任务；函数与字段名按现行源码核对，并补齐 legacy / shadow 的组覆盖及缺字段 / 显式 null 的区别。本轮只新增设计和计划；本地链接、代码围栏、空白及两文档全局约束一致性检查通过，根文档事实与治理布局检查通过。完整当前差异的 fast 只读计划成功，实际选择治理布局、前置和差异终检；实现、TDD、真实去重收益、完整 Gate 与发布验证均未执行。


## 本轮执行记录（隔离工作树）

实现基线 `c37b6869c472891fc515e8e7e98200870762fca0`；Tasks 1–4 已完成对应实现与验证，独立终审完成，无 Critical / Important / Minor。未提交、合并、推送或发布；原工作树保留。详细命令、RED/GREEN 与裁决见本计划的 `.superpowers/sdd/2026-10-18-test-retirement-and-verification-dedup/progress.md`。

- Task 1：真实配置 sentinel 从零匹配失败转为通过；完整产物 5/5、来源三个具名场景 3/3 通过。
- Task 2：删除前历史 7/7，删除后 6/6；保留旧任务与旧回执拒绝 2/2，产物 5/5 通过。
- Task 3：固定原生前置通过；两个公开 checkpoint 场景有实际 business-checkpoint 行；迁移后业务相关 41/41 通过，A4 未延期。
- Task 4：四项独立反例观察到 RED，修正后新场景 5/5；九个相关套件 106/106 通过。策略变化的 legacy、pin 变化的 pin 目标计数器调度均从 2 次降为 1 次；真实具名套件另有上述执行证据。计数器仅证明路由，完整计划任务数量受补齐必跑影响，未测量发行总耗时。

原生供给使用本地既有精确提交 `5f0b14080625070471ea62cfdf34ffdec33dffa4` 的独立干净 clone 与原构建命令，产物 SHA-256 `f867c9ff2ff16ade944b314d8ec4296955cee14f4c65368b2f301d24dfecbbf9` 匹配当前 darwin-arm64 pin，无 override。远端读取该提交失败；本次不证明远端可复现性，也不证明其他平台。未修改 CLI、pin、Bundle 或 Schema。

独立终审补充：独立上下文按冻结差异与 15 文件摘要审查，Standards / Spec 均通过本轮范围审查；另行定向复验 8/8 通过。审查报告为同计划证据目录 `final-review.md`。无延期 minor，无需修复轮。技术可交付为 implementation-ready；不授予提交或发行资格。终审后仅更新本执行记录与台账，实施字节保持冻结候选。
