---
doc_type: maintenance-design
status: active
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-18
---

# SHA-256 使用减负设计

> 执行状态更新（2026-10-19）：daily 输入摘要准备已随 2f470248 合入并通过定向验证；固定版本采用、Context 第二轮与后续子项目仍待处理。

状态：待审阅。用户已要求依据本轮建议编写计划；本文不表示实现、提交或发布已获批准。

## 1. 目标与取舍

维护者应把时间用于判断输入、差异和验证结果。工具负责计算必要摘要；普通材料读取不默认引入冻结包、来源锁和持续同步。工件完整性、事务防覆盖、批准对象与当前验证证据继续绑定真实内容。

不更换 SHA-256，不引入算法配置、通用摘要服务、跨轮结果缓存或新审批。首次交付限于普通材料政策及无 API 变化的日常输入准备；Context 的有效性规则单独设计，避免一次修改所有消费者。

## 2. 五个方向的归属

| 方向 | 实施入口 | 本轮处理 |
|---|---|---|
| 普通材料按需读取 | [材料直读设计](../../../.template-source/contracts/spec-backend-direct-consumption-design.md)与[已有计划](../plans/2026-10-18-spec-backend-material-intake-and-manual-handoff.md) | 直接复用；普通来源说明与本端正式依据分开，正式包仍按原义验证 |
| 必要输入摘要自动准备 | 本文第 3 节与[实施计划](../plans/2026-10-18-sha256-usage-optimization.md) | 首轮新增能力；复用现有 route，不增加写入协议 |
| Context 失效范围 | 本文第 5 节 | 第二轮单独设计；首轮不修改快照或旧批准 |
| 检查归属与按需准备 | [验证提效设计](2026-10-18-template-gate-verification-efficiency-design.md)与[已有计划](../plans/2026-10-18-template-gate-verification-efficiency.md) | 复用既有任务；不另建 runner、缓存或耗时门禁 |
| 可再生阅读视图 | 现有 reading render / check-views 和 manual / managed 政策 | 保留现行行为；仅在实际测量证明重复后，再提出具体删除项 |

这些是独立可交付的子项目。先执行材料直读计划；摘要准备可以独立开发；验证提效按自身计划执行。Context 与阅读视图不成为首轮完成的前置条件，也不宣称已优化。

## 3. 首轮：在 route 中准备输入摘要

### 3.1 命令与兼容

扩展现有命令：

```text
yss lifecycle route --root <治理仓> --task <同一Ticket.md> \
  --implementation-root <实现仓绝对Git根> --base <完整SHA> \
  --prepare-inputs --json
```

`--prepare-inputs` 是默认 false 的布尔参数，仅允许 `lifecycle route` 使用；与 `--view agent` 互斥。原 route、verify-daily、API Freeze、standard 与正式任务的规则和默认输出保持原义。

首版只支持记录的 `delivery_path: daily`、`api.mode: none`；Backend 的 `business_input` 只支持 `mode: standalone`。不支持的路线返回明确能力拒绝，不自动转换路线。正式绑定的识别仍先执行，不能通过准备操作降级。

`capabilities.result.governanceCandidate.interfaces` 增加 `lifecycle.route:prepare-inputs`。技能仅在这项存在时使用新参数；旧 CLI 继续原有 route / verify-daily 工作流，不借缺能力跳过必要检查。

### 3.2 唯一可更新集合

命令只在内存中更新以下既有输入的 `digest`，不新增、删除或重排任何引用：

- `skills[i].digest`，对应 `skills[i].ref`。
- `inputs[i].digest`，对应 `inputs[i].ref`。
- Backend standalone 的 `business_input.digest`，对应其 `ref`。

缺失或陈旧的输入摘要均可重新计算，并在结果逐项列出旧值与新值。列表类型、引用、来源身份和实际风险仍按现行规则校验；不补猜缺失正文、路径、actor 或命令。

复用 `dailySession.recordRef` / `basisRef`，使文件与 `#唯一标题` 使用现行字节规则。重复标题、空章节、整份 Ticket 自摘要、路径越界、符号链接等继续按原读取边界拒绝，不另写 Markdown 解析器。实际读取经现行 SemanticSession 记录，并在返回前执行 `Finish()` 检测变化。

以下内容绝不自动更新：tests / review 的摘要及候选绑定、执行日志、exit_code、时间、实现 provenance、标准变更决定、批准记录、API 事件、Freeze 和任何状态。新候选使旧证据过期时，仍由 verify-daily 拒绝；route 成功不表示完成。

### 3.3 输出

仅在准备与后续 route 均成功时，在现有 DailyReport 添加可选字段：

```text
input_preparation: {
  schema_version: 1,
  record: <仅修改允许集合的完整footer对象>,
  changes: [{pointer: "/skills/0/digest", ref: "skill.md", before: "", after: "sha256:..."}],
  read_only: true,
  approval_created: false,
  evidence_state: "not-evaluated"
}
```

`changes` 固定按 skills、inputs、business_input 顺序产生，同一列表保持原下标；没有变化时为 `[]`。`before` 对缺字段或空值统一表示为 `""`；非字符串且非空的 digest 属于非法输入，拒绝而不擦掉其类型错误。

现有 `candidate_digest` / `diff_digest` / `changed_files` 继续由 route 返回。候选根据准备后的实际输入计算；报告中的 input_preparation 不写进候选计算，从而避免循环摘要。无新参数时不出现可选字段；失败结果不携带可被误用的准备记录。

命令不写文件、不执行测试、不创建批准。执行 Agent 可以在用户已授权的同一 Ticket 写范围内审阅差异后更新 footer；这沿用普通编辑能力，不新增 apply 子命令。用户只需审阅输入变化和实际结论，不手抄摘要。

## 4. 首轮验收与采用边界

| 验收 | 必须观察到的行为 |
|---|---|
| AC-01 | 缺失或陈旧的允许输入摘要被计算；正文、列表顺序和未授权字段保持原值 |
| AC-02 | 既有日志、测试、审查、决定和状态逐项保持；旧证据不能因准备而续期 |
| AC-03 | 重复 / 空章节、自摘要、越界或不可读引用拒绝，不返回可用准备记录 |
| AC-04 | 原 route / verify-daily 兼容；新参数在错误命令、agent view、API 或正式来源上不误用 |
| AC-05 | 同一输入重复准备 changes 为空，candidate 与将准备记录保存后原 route 的 candidate 一致；输入变化仍由 Finish 拒绝 |
| AC-06 | 支持能力与旧 CLI 的两条使用路径明确；开发候选、固定版本采用和正式发行分别记录 |

行为断言放在模板仓现有原生集成测试体系。yss-cli 本地 AGENTS 明确不恢复 Go / Node 测试源码；该仓仅做构建、格式、静态检查及现有黑盒 smoke。模板集成断言不得移入 CLI 或扩写 CLI smoke 为测试套件。

开发二进制可以在隔离模板副本中执行必要集成检查；结果为候选范围。默认固定 CLI 的 pin 不会因计划获审阅或本地构建成功而自动更新。正式采用须固定完整来源并完成现行集成；若需提交、推送、安装或发布，分别消费实际用户授权。

## 5. 第二轮与后续：明确停止条件

Context 第二轮应先保存独立设计，再编写其实施计划。设计必须决定：旧快照维持双摘要原义；新模式如何显式选择；全文来源记录与生效规则如何区分；未引用术语新增冲突、删除、禁用别名及 Global 规则如何处理；Node / Go、结构 Schema、正式包和阅读消费者如何兼容。

首个候选只考虑“未引用且不造成全局冲突的业务表格行变化”不触发当前引用失效。说明文字、注释和未结构化全局规则继续保守处理，除非设计证明其完整语义已被绑定。不得假定只比较 referenced_terms_digest 就足够；不得自动升级快照、复制旧批准或默认放宽正式包。

阅读视图首轮不删 manifest / 摘要。后续只有在明确一个实际重复的生成或核验调用，并能证明所有消费者始终取得当前内容时，才删除该重复项。manual 不调用原生阅读、managed 缺能力拒绝及来源漂移检测继续保留。没有具体重复证据时结束调查，不创建重构任务。

## 6. 观测与恢复

复用原报告字段记录实际命令、退出、执行次数及耗时；不设提速百分比或固定秒数门禁。SHA-256 局部计算测量不能证明完整 gate 的瓶颈。

新参数是可选只读能力。停止使用它即可恢复原有手工填充输入、route、实际验证、verify-daily 流程；已编辑的 Ticket 不自动回滚，任何恢复都保留用户后续修改。正式工件、安装事务、备份、批准主体和日志的完整性校验保持现行要求。
