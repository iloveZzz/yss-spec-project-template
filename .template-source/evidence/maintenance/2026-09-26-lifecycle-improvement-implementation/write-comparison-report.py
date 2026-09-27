"""Render measured primary results; supplemental results stay separate."""
import json,pathlib
E=pathlib.Path(__file__).resolve().parent
D=json.loads((E/'evaluation-summary.json').read_text());assert D['complete']
B=D['variants']['baseline'];C=D['variants']['candidate']
names=['状态只读','模板维护路由','小型无行为修订','有效 Plan 入口','有效授权延续','实质扩围阻断','MVC 技术计划','UI 三文档试填','磁盘恢复与漂移','既有任务仍运行','跨仓导出拒绝反例','真实验证失败']
rows=[]
for i,r in enumerate(D['by_scenario']):
 vals=[]
 for v in ['baseline','candidate']:
  runs=r[v]['runs'];vals += [str(sum(x['semantic']=='passed' for x in runs))+'/2', ' / '.join(str(x['seconds']) for x in runs)]
 rows.append('| '+r['scenario']+' '+names[i]+' | '+' | '.join(vals)+' |')
secs=lambda d:d['scenario_elapsed_seconds']['sum']
delta=(secs(C)/secs(B)-1)*100
s=f'''# 真实 Agent 对照评测结果

状态：主批次 48 次运行及逐次语义复核完成。两侧各 22/24 通过，均有 2 次 UI 超时；未发现已完成非 UI 场景的关键错误放行、错误拒绝、重复决定或重复执行。本次结果支持所测行为未回归，**不支持“整体效率已提升”**。

## 同一条件与评分

输入来源是开始时真实工作树基线及优化候选 v2，均有字节清单；并非仅使用 HEAD。双方使用同一评测器、场景、Desktop CLI、模型 `gpt-6-astra`、推理档位 `xhigh`、Python 3.12 与离线依赖；[摘要一致性核验](evaluation-summary.json)全部为 true。12 场景 × 2 版本 × 2 重复，含恢复步骤，共 52 个 Agent turn。单 turn 上限 300 秒，不自动重试。

自动断言和[逐次维护者语义复核](semantic-review.json)分开保存。复核检查实际命令、原始轨迹、输入字节变化、产物和状态；它不是独立审查。任务受提示引导，只有两次重复、固定执行顺序，不能作统计显著或生产可靠性结论。两个代表样本、环境失败与补依赖后的校准另外保留，没有混入 48 次分母。

| 场景 | 基线通过 | 基线两次秒数 | 候选通过 | 候选两次秒数 |
|---|---:|---|---:|---|
'''+ '\n'.join(rows)+f'''

UI 两侧各两次均在 300 秒内未生成请求的三个文档。其未完成既不记通过，也不能视为模板必要内容已被验证。随后保持来源 / 场景 / 模型不变，双方各两次延长至 600 秒的补测均完成且通过维护者语义复核，实际每次 508.17–524.64 秒。见[单独补测报告](ui-supplement-report.md)；原主批次分母与失败不变，不将不同预算条件混为同一评分。

## 时间与资源

| 指标 | 基线 | 候选 |
|---|---:|---:|
| 场景时间合计（秒） | {secs(B)} | {secs(C)} |
| 场景时间中位数（秒） | {B['scenario_elapsed_seconds']['median']} | {C['scenario_elapsed_seconds']['median']} |
| 完成工具调用数 | {B['tool_calls']['sum']} | {C['tool_calls']['sum']} |
| 已报告 input tokens | {B['usage']['input_tokens']} | {C['usage']['input_tokens']} |
| 其中 cached input tokens | {B['usage']['cached_input_tokens']} | {C['usage']['cached_input_tokens']} |
| 已报告 output tokens | {B['usage']['output_tokens']} | {C['usage']['output_tokens']} |
| 未报告 usage 的超时步骤 | {B['usage_unreported_steps']} | {C['usage_unreported_steps']} |

候选场景时间合计相对基线变化为 **{delta:+.1f}%**；波动、串行顺序、共享主机上的维护与验证活动及样本量使该数值不能解释为稳定因果效应；这不是隔离性能基准。场景时间含模型、工具和运行时，CLI 事件没有足够时间戳拆出纯推理 / 工具等待。输入 token 是各轮运行时累计报告，含缓存，不能当作不同输入字节数；超时 usage 未知，不按 0 计费。没有可核验单价或账单，因此不编造人民币/美元费用。fixture 内没有实时人工回复，人工等待为 0，仅限此评测。

正式比较以外的校准、CLI 故障和隔离依赖故障消耗也计入 [完整资源台账](all-evaluation-resource-ledger.json)。这些消耗未进入 48 次评分，但不能当作免费或不存在；主控自身会话用量不在 CLI 台账可见范围。

## 发现与覆盖限制

- 候选场景发现两处残余说明冲突：原型证据历史描述易被误读为现行版本，以及 OpenAPI 职责段版本。见 [补充发现](supplemental-findings.json)。主比较期间冻结来源不变；原型历史描述保留其不可变语义快照，并注释当前 public_description 的阅读入口；OpenAPI 消除重复版本声明。比较后的纯说明修正与同步单独留在 `post-comparison-source-delta.json`，不将此 48 次结果冒充最终字节重跑。
- 基线 E12 第 2 次文档给出精确开始/结束时间，原轨迹不能验证这些时间值。已登记证据质量缺口；实际 exit 7 和阻断结论可核验。统计只用 runner 实测时间，不采信文档中的该项时间。
- E07 仅覆盖技术计划与两个既有 API 兼容测试，未完整跑新 v2 required 的 Draft/Review/Freeze。E10 仅覆盖结果未知时不重派，未覆盖外部已完成结果接收。E11 是本地复合拒绝测试，未覆盖真实跨仓修复后接收。E12 为真实失败码，未单独注入 mandatory skipped。逐场景边界及后续目标见 [覆盖矩阵](evaluation-coverage.md)。
- 当前结论来自合成批准、隔离工具和本地测试，不证明 auth-backend 正式 Slice 接收、浏览器登录或部署成功。

## 可复核证据

[运行配置](C2-v2-config.json)、[运行过程](C2-v2-execution.json)、[48 次明细与汇总](evaluation-summary.json)、[语义复核](semantic-review.json)、[归档清单](formal-archive.json)共同记录来源和原始证据。归档保留双方来源各一份、依赖、场景、评测器、逐步输入清单、JSONL 轨迹和最终产物；原始临时目录同时保留。校准与环境失败归档另列，不覆盖历史失败。
'''
(E/'agent-comparison-report.md').write_text(s)
