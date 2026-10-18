---
doc_type: maintenance-plan
status: active
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-18
---

# SHA-256 使用减负 Implementation Plan

> 执行状态更新（2026-10-19）：daily 输入摘要准备已随 2f470248 合入并通过定向验证；固定版本采用、Context 第二轮与后续子项目仍待处理。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 复用已有普通材料与验证提效计划，为无 API 变化的日常任务自动准备必要输入摘要，保留实际证据和批准的有效性边界。

**Architecture:** 在 Go 原生 CLI 的现有 route 上添加可选只读参数，复用当前记录读取、来源读取、候选计算及结束复验；模板 Skill 消费其准备记录，不新增 Node 领域实现或文件写入协议。普通材料读取与 CI 提效分别使用已有独立计划；Context 第二轮先独立设计。

**Tech Stack:** Go 原生 yss、现有 Node.js 原生集成测试、Markdown / YAML 政策与现有技能同步工具；无新增运行依赖。运行时和 Go 版本沿用实施仓当前入口及固定来源配置，不另增常量。

**Spec:** [SHA-256 使用减负设计](../specs/2026-10-18-sha256-usage-optimization-design.md)。实施者同时读取设计与本计划；本文状态为待用户审阅，所有代码任务尚未执行。

## Global Constraints

- 不更换 SHA-256，不引入算法配置、通用摘要服务、跨轮结果缓存或新审批。
- 首版只支持记录的 `delivery_path: daily`、`api.mode: none`；Backend 的 `business_input` 只支持 `mode: standalone`。
- 命令不写文件、不执行测试、不创建批准。
- 以下内容绝不自动更新：tests / review 的摘要及候选绑定、执行日志、exit_code、时间、实现 provenance、标准变更决定、批准记录、API 事件、Freeze 和任何状态。
- 原 route、verify-daily、API Freeze、standard 与正式任务的规则和默认输出保持原义。
- yss-cli 本地 AGENTS 明确不恢复 Go / Node 测试源码；该仓仅做构建、格式、静态检查及现有黑盒 smoke。
- 默认固定 CLI 的 pin 不会因计划获审阅或本地构建成功而自动更新。
- 本轮规划只新增本设计和本计划；执行前先核对根仓与 CLI 的 HEAD、index、工作区，使用适用 worktree 技能隔离代码写入，不复制无关脏工作。
- 未授权提交、推送、安装或发布时，只保留可审阅差异和真实结果。Task 末的提交检查点不能视为 Git 授权。

## Review Focus

1. 输入变化后旧测试 / 审查不能被准备操作续期；Task 1 的“准备不续期完成证据”固定此边界。
2. 中文路径、唯一标题、重复标题、自摘要和越界输入必须沿用真实读取规则；Task 1 的“准备复用记录引用边界”覆盖。
3. Backend 正式上游、standard、API 和已有正式绑定不能通过新参数降级；Task 1 的“准备不扩大支持路线”覆盖。
4. 输出后再次变化仍必须使正式验证失败；Task 1 的“准备重复运行及返回后漂移”与 Task 3 的现有验证阶段回归覆盖。
5. 旧 CLI 不支持参数时不能被文档当成已就绪，固定来源也不能悄悄切换；Task 2 能力分支核对与 Task 3 双二进制回归覆盖。

---

## 执行范围与现有计划

| 顺序 | 独立子项目 | 动作与完成标准 |
|---|---|---|
| A | [普通材料直读与手动交接](2026-10-18-spec-backend-material-intake-and-manual-handoff.md) | 按其三项任务执行；本计划不复制政策对象、验收或任务，也不修改该文件。尚未实施时标 planned，不能仅凭文档存在标完成 |
| B | 本计划 Task 1–3 | 新增输入准备能力、模板使用说明和候选集成证据，可独立交付 |
| C | [验证入口提效](2026-10-18-template-gate-verification-efficiency.md) | 按其已有任务统一检查归属与按需工具准备，不重建缓存；无需等待 B |
| D | Context 第二轮 | 按设计第 5 节形成独立可审阅设计及计划后实施；B 不修改快照、Schema 或批准 |
| E | 阅读视图 | 当前不改；由现有报告出现的具体重复调用触发有限调查，没有证据不增加任务 |

A / C 与 B 属于不同子系统，使用各自计划及验证范围。不能把三份文档合成一轮全量检查，也不能在同一工作区并行编辑相同技能、验证登记或分发锁。

## 文件结构与责任

下文 `T` 表示模板仓 `/Users/zhudaoming/Projects/yss-spec-project-template`，`C` 表示 CLI 仓 `/Users/zhudaoming/Projects/yss-cli`；代码路径分别相对其实施副本。只有标 Create 的文件需要新建。

| 文件 | 责任 | 任务 |
|---|---|---|
| C `internal/governance/lifecycle/daily_prepare.go`（Create） | 允许集合的输入摘要准备与报告类型 | 1 |
| C `internal/governance/lifecycle/daily.go` | 调用准备、复用既有 route、候选及 Finish | 1 |
| C `internal/governance/governance.go` | 原生参数白名单 | 1 |
| C `internal/cli/commands.go`、`internal/cli/help_topics.go`、`internal/cli/cli.go` | 布尔选项、命令专属约束、帮助、能力声明 | 1 |
| T `tests/daily-input-preparation.test.mjs`（Create） | 真实二进制的准备、拒绝、兼容和只读断言 | 1 |
| T `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` | 能力探测、准备、编辑同一 Ticket 和实际验证顺序 | 2 |
| T `.template-source/process/template-verification-profiles.yaml` | 精确文档输入与候选集成检查的资源 / 输入登记 | 2 |
| T `tests/verification-selection.test.mjs` | 新输入能选中真实消费者，未知输入仍拒绝 | 2 |
| T `.claude/skills/`、`skills-lock.json` | 只由现有生成器产生实际需要的变化；Profile 用组合目录验证继承 | 2 |
| C `docs/cli-help.md`、`internal/helpview/assets/` | 由当前 artifacts 的 derived 范围生成，不手改 | 2 |

不改 `context-contract.mjs`、Context 相关 Schema、正式 handoff 包、API、安装事务、Bundle 格式或发布证据协议。未点名的生成产物先由生成器列出，不能顺手覆盖。

## 开始前

- [ ] **核对基线与独立入口。** 本轮调查模板 HEAD 为 `900e386c4cd4baeb3d184d3381b725d2f74b2ced`，CLI HEAD 为 `34f1ee0069095b4398c34691e181153c4fa4048d`；它们是调查定位，不替代实施时新基线。CLI 已有 `docs/compatibility.md`、`internal/bundle/upgrade.go`、`internal/governance/contracts/task_semantic.go`、`internal/project/upgrade.go` 修改，全部保护。若发现准备能力已实现，先按验收核对，跳过已完成改动。
- [ ] **检查必要验证计划。** 在 T 执行 `scripts/verify-template-fast --plan --json`。未登记文档或缺工具导致拒绝时保留原结果，只修本任务输入映射，不扩大为全量发布检查。
- [ ] **建立候选目录。** 在仓外准备本次构建 / 日志新目录，后续 `CANDIDATE_BIN` 指向该次实际构建文件；变量保存绝对路径，不修改全局 PATH、安装程序或 pin。

### Task 1: 原生 route 输入准备与真实集成断言

**Files:** 上表 CLI 六个既有入口、一个新实现文件，以及 T 新集成测试。

**Interfaces:**

- Consumes: `lifecycle.Run(ctx context.Context, action, root string, args map[string]string) (any, error)`、`(*dailySession).recordRef(ref string) ([]byte, error)`、`(*dailySession).basisRef(ref, digest string) ([]byte, error)`、`candidateDigest() string` 与现行 SemanticSession 的 `Finish() error`；不复制其规则。
- Produces: CLI 布尔参数 `prepare-inputs`；`DailyReport.InputPreparation *DailyInputPreparation` 使用 `json:"input_preparation,omitempty"`；新类型按设计第 3.3 节逐字段序列化。
- Add: `func (d *dailySession) prepareInputBindings() (*DailyInputPreparation, error)`，只计算允许输入、更新本次解析所得 record，并返回 changes；不打开写文件句柄。不生成候选或完成结论，候选仍由原 run 路径计算。
- Capability: `governanceCandidate.interfaces` 增加字符串 `lifecycle.route:prepare-inputs`；不改变 envelope / protocol 版本。
- Test seam: 新测试文件内私有 `dailyFixture(t, {profile='spec'}={})` 返回 `{root, repo, base, record, writeTask(record), run(extraArgs), cleanup()}`。`writeTask(record): void` 保留既有正文，只序列化一个合法 footer；`run(extraArgs: string[]): {exitCode: number, envelope: object}` 使用当前 Ticket 执行真实 route，不自动重写文件。复用现有 daily 场景的隔离初始化方法和同一现行政策，不模拟校验器；cleanup 交给 t.after。

- [ ] **Step 1: 编写成功与保全断言。** 新测试 `准备只更新允许输入且不写原件`：沿用 daily 场景的 schema_version / policy_version、目标、验收、仓库、scope、commands、api.mode:none；令 skill.md 为 `本次适用检查\n`，inputs 指向中文名 `资料.md`，二者 digest 缺失或陈旧。保存命令前的 Ticket / 输入 / 实现文件字节、Git HEAD 与 index；真实调用带 `--prepare-inputs` 的 route 后断言 schema_version=1、read_only=true、approval_created=false、evidence_state=not-evaluated，摘要等于对实际原字节计算的 `sha256:` 值，changes 顺序为 `/skills/0/digest`、`/inputs/0/digest`，原件和 Git 状态未变。

```javascript
test('准备只更新允许输入且不写原件', t => {
  const f = dailyFixture(t);
  delete f.record.skills[0].digest;
  f.writeTask(f.record);
  const file = path.join(f.root, 'task.md'), before = fs.readFileSync(file);
  const {exitCode, envelope} = f.run(['--prepare-inputs']);
  assert.equal(exitCode, 0);
  const p = envelope.result.input_preparation;
  assert.equal(p.record.skills[0].digest,
    'sha256:' + createHash('sha256').update(fs.readFileSync(path.join(f.root, 'skill.md'))).digest('hex'));
  assert.equal(p.evidence_state, 'not-evaluated');
  assert.deepEqual(fs.readFileSync(file), before);
});
```
- [ ] **Step 2: 编写不续期证据断言。** `准备不续期完成证据`：按现有 daily 场景的 populate 方法真实运行 Node 检查、保存输出与实际复核，使 baseline verify-daily 先成功；再改变输入，准备时保留旧 tests / review / implementation 的 candidate / log_digest 及已有 user_decisions。断言这些子对象深相等；把返回 record 保存到隔离 Ticket，再运行原 route 得到与准备报告相同的 candidate；运行 verify-daily 必须因陈旧证据拒绝，不能以缺字段替代此断言。另测缺少测试 / 审查的准备记录仍不能完成。
- [ ] **Step 3: 编写引用边界断言。** `准备复用记录引用边界`：唯一非空 `#验收` 可以使用现行正文原字节；重复标题、空章节、引用整份 Ticket、`../`、链接和不可读文件按既有错误原义拒绝，且没有 input_preparation。非字符串 digest 输入亦拒绝，不自动抹平类型错误。
- [ ] **Step 4: 编写路线和幂等断言。** `准备不扩大支持路线` 覆盖 Backend standalone 成功、upstream / standard / api.mode 非 none 明确 `PREPARE_INPUTS_UNSUPPORTED`、已有正式绑定不被降级；`--view agent` 或 verify-daily 使用新参数返回 ARGUMENT。`准备重复运行及返回后漂移` 覆盖将 record 保存后再准备 changes=[]、candidate 不变，之后改输入则原 route / verify-daily 检出陈旧绑定；不让测试依赖竞态时序。
- [ ] **Step 5: 观察明确红灯。** 用修改前的真实开发二进制执行 `YSS_NATIVE_BINARY="$CANDIDATE_BIN" node --test tests/daily-input-preparation.test.mjs`。预期命中新参数未支持而失败；准备好的相同 fixture 用旧 route 的有效输入先成功，避免把初始化 / 工具缺失当功能红灯。
- [ ] **Step 6: 实现参数和允许集合。** commands / governance 两层都只为 route 放行布尔参数，拒绝 agent view 组合。d.run 在身份、政策、任务结构与正式绑定判定后调用新 helper；已有正式绑定且请求准备时，在原 govern 返回之前以 Unavailable 返回 `PREPARE_INPUTS_UNSUPPORTED`，不继续准备；未请求新参数的正式路由不变。其他记录先检查本版支持路线和 API，再使用 recordRef / basisRef 计算允许字段。非法输入或不支持路线返回明确非零结果，不改普通 route 的错误和输出。
- [ ] **Step 7: 接回原路由与报告。** 准备后继续现有 skills / inputs、业务输入、实际 diff、风险及 API 判定，计算当前候选。在原 Finish 成功且 route 成功后才暴露 input_preparation；helper 或后续路由失败不返回部分准备记录。记录解析、列表及字段仍用原逻辑，不把新选项传播为通用豁免。
- [ ] **Step 8: 注册能力与帮助。** 只为 route 显示参数、允许集合及“只读准备，不验证完成”；verify-daily 帮助不显示该参数。能力数组出现设计指定字符串；默认 route 不附 input_preparation。不增加写入子命令。
- [ ] **Step 9: 构建并转绿。** 在 C 如归档缺失，先执行 `node tools/fetch-bundle.mjs`，不能重生成或接受不同期望摘要。运行 `CGO_ENABLED=0 go build ./...` 及 `CGO_ENABLED=0 go build -o "$CANDIDATE_BIN" ./cmd/yss`；在 T 运行 Step 5 同一集成命令，应全部通过。运行现有 `node scripts/fixtures/role-independent-draft/daily.test.mjs` 与 `daily-api.test.mjs`，均显式设置同一候选；证明未使用新参数的日常、standard、API 原路径兼容。
- [ ] **Step 10: 形成审阅检查点。** 保留跨仓差异、候选摘要、实际命令 / 退出与未覆盖边界；若已有对应提交授权，按本地 Git 政策仅提交本任务路径，否则不提交。构建成功不写成测试或发行通过。

### Task 2: 能力受控的模板入口与检查登记

**Files:** T 的 daily-delivery、verification profiles、selection 测试及其必要生成产物；C 由既有 artifacts 工具生成的帮助。

**Interfaces:**

- Consumes: Task 1 能力字符串、可选 `input_preparation.record` 和现有 `planTemplateVerification` 选择接口。
- Produces: 原 daily 工作流中的可选准备步骤；`check.daily-input-preparation` 运行 `node --test tests/daily-input-preparation.test.mjs`，资源为 `native-cli`；精确输入为新测试、daily-delivery 和本次分发 / pin 消费路径，不全仓匹配。
- Prepare 不替代 route / verify-daily；能力不存在时继续原流程，不填假字段或 fallback 到 Node 校验。当前固定 pin 不支持时，该新能力的集成结果保持“待采用”，不能 skip 后记 passed。

- [ ] **Step 1: 加入选择回归断言。** 在现有 selection 测试添加 `输入准备只选择真实消费者`：逐一触发新测试 / daily-delivery，确认新检查恰好一次且带 native-cli；本设计 / 本计划精确路径映射到 doc-facts；未知文档路径仍按原策略处理。运行对应 test-name-pattern，预期新检查或映射缺失失败。
- [ ] **Step 2: 修改 canonical 指引。** 先使用 maintaining-skills，再修改 daily-delivery 的现有“route→回填→实际验证→verify-daily”说明：先读 capabilities；支持时准备输入、审阅 changes、在同一 Ticket 授权范围更新 footer，再执行正常 route 和真实验证；旧证据陈旧须重做受影响验证。清楚列出首版不自动处理日志 / 审查 / API 的范围，不让用户手填本工具已经提供的输入摘要。
- [ ] **Step 3: 登记最小输入与资源。** 在 profiles 增加上述检查及文档精确路径。检查当前 release / direct-consumer 路径对新检查的实际依赖，不把整套历史回归全部设成 mandatory。新检查在固定 CLI 尚未采用时报告缺能力，不能把受影响输入移出登记以制造通过。
- [ ] **Step 4: 生成实际分发变化。** 运行 `scripts/sync-skills` 和 `scripts/update-skill-lock`；在 selection 测试用已有 `composeProfileTree('backend', {root})` 组合并断言 daily-delivery 与根 canonical 字节一致。当前覆盖层没有该文件，不新建副本或同步器；实例 effectiveHash 仍由正式打包器按分发树现算。只接受能解释的生成差异，不手改投影、恢复根锁本地 effectiveHash 或刷新无关上游。C 执行 `node tools/artifacts.mjs generate --scope derived --out "$DERIVED_EVIDENCE_DIR"`，其中变量指仓外新目录；此范围重建帮助视图和帮助文档，不更新 Bundle 来源。
- [ ] **Step 5: 核对两个能力分支。** 用 Task 1 候选确认能力存在，按文档完成一次准备与原验证；用当前固定二进制确认无该能力时仍使用原流程。人工核对指引的完整流程，不用关键词测试替代 Agent 操作判断。记录旧 CLI 的新参数拒绝，不能升级成本机安装。
- [ ] **Step 6: 运行针对性检查。** 运行 `node --test --test-name-pattern='输入准备只选择真实消费者' tests/verification-selection.test.mjs`、`scripts/sync-skills --check`、`scripts/verify-skill-governance`；如 Skill 没有实际变化则无需重跑其检查。新能力场景显式使用候选；当前 pin 和开发候选的结果分开，失败不删除断言或扩大豁免。
- [ ] **Step 7: 形成审阅检查点。** 列出 canonical、投影、Profile 与锁的真实变化；授权存在才提交。A / C 的既有计划未执行时继续标 planned，不把本任务文字更新当其实现。

### Task 3: 候选验证、固定版本采用与后续交接

**Files:** 不新增产品文件或新的证据格式；结果写入当前维护记录的原验证段，实际日志留仓外。

**Interfaces:**

- Consumes: Task 1 候选、Task 2 检查定义和现有 input-observation / validation-phase 回归。
- Produces: `candidate-verified` 或实际失败的有限交付结论；明确 `pinned-adoption: pending|verified`。这两个描述只用于本次交付说明，不新增机器状态、Schema 或门禁。

- [ ] **Step 1: 完成 CLI 必要检查。** 在 C 对修改 Go 文件运行 gofmt 并确认无剩余格式差异，运行 `go vet -composites=false ./...` 与 `node tools/smoke/main.mjs --bin "$CANDIDATE_BIN"`。不新增该仓测试文件、不调用 go test，不将 smoke 结果表述为正式验收。
- [ ] **Step 2: 验证结束复验没有被绕开。** 在 T 运行 `node --test scripts/fixtures/contract-efficiency/phase.test.mjs tests/validation-phase-native-transport.test.mjs`，加上 Task 1 集成测试；同一命令不因多个 Gate 重复执行。现有阶段变更拒绝必须仍有效；新 helper 只能使用 session 当前依赖，不新增 stat-only 或跨轮缓存。
- [ ] **Step 3: 对照一次实际维护过程。** 保存相同任务的手工准备与新准备操作记录：人工需要填写的输入摘要字段数、新命令返回的 changes、真实命令次数及耗时。只报告观察到的变化，不承诺百分比或让计时变成门禁。摘要计算 microbenchmark 不代替此过程。
- [ ] **Step 4: 明确固定采用前置。** 若当前 pin 无能力，本轮交付为开发候选有限验证，pinned-adoption 为 pending；默认完整集成若依赖新能力不能报告通过。正式采用另按现行流程固定完整 CLI 提交、各平台真实摘要和已验证来源，并核验安装 / Bundle / Profile 消费；需要提交、推送、安装、发布时取得对应授权。未完成采用不影响阅读原材料和使用旧 daily 流程，也不能称为 main / release ready。
- [ ] **Step 5: 按地图交接剩余子项目。** A / C 沿各自计划复用实际完成记录；Context 按设计第 5 节先形成独立设计及计划，重点核对五类消费者，不启动旧快照迁移。阅读视图只有实际重复证据才提出窄变更；无证据保留现行实现。
- [ ] **Step 6: 检查差异和回退。** 两仓分别运行 `git diff --check`，核对原脏路径和未授权文件未变；记录停止使用新参数可恢复原操作流程，不能自动恢复 Ticket 或覆盖后续编辑。汇总实际范围与未执行项，结束首轮，不自动跑 release 或申请新平台资格。

## 自检与执行交接

设计 AC-01 / AC-02 由 Task 1 Steps 1–2 覆盖，AC-03 由 Step 3 覆盖，AC-04 / AC-05 由 Step 4 与原验证回归覆盖，AC-06 由 Task 2 能力分支和 Task 3 固定采用边界覆盖。五项 Review Focus 已分别落入这些场景。

新接口只涉及一个可选参数、一个报告字段和一个窄 helper；候选仍由原函数生成，正文读取、政策与完成验证不重复实现。Context 及阅读视图未混入首版；既有两个独立子项目继续引用原计划。

建议 Native：当前会话按任务执行，最后由独立上下文复核跨仓差异；共享 route 状态和证据保全边界，逐项换上下文容易重复调查。也可选择 Subagent-driven，按任务由新实施者和新复核者推进。等待用户审阅设计 / 计划并选择执行方式后再实现；本文件没有执行、提交或发布结果。

本轮计划检查：文档事实检查通过；本设计与计划的本地链接、结构及空白检查通过；原有四份设计 / 计划内容保持原样。只读 fast 选择以 `INCOMPLETE_VERIFICATION_INPUTS` 拒绝，首个报告路径为既有未登记 `.template-source/contracts/spec-backend-direct-consumption-design.md`；本轮未改政策绕过，不能将其记为通过。未运行实现测试、构建、完整 gate 或发布验证。
