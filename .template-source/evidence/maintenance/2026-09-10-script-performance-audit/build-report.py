from pathlib import Path
import json,statistics,csv
base=Path(__file__).resolve().parent;m=base/'measurements'
runs=[json.loads(x) for x in (m/'runs.jsonl').read_text().splitlines()]
groups={}
for r in runs:groups.setdefault(r['label'],[]).append(r)
def ms(label):
 rows=groups.get(label,[])
 return f"{statistics.median(r['wall_ms'] for r in rows)/1000:.3f} 秒" if rows else '未测量'
def row(label,title):
 rs=groups.get(label,[])
 if not rs:return f'| {title} | 未测量 | — | — |'
 return f"| {title} | {ms(label)} | {len(rs)} | {' / '.join(str(r['exit_code']) for r in rs)} |"
labels=[('root-repository-mode','本体身份识别'),('root-verify-context-contract','本体词汇校验 CLI（含扫描）'),('root-query-lifecycle-context','本体路由查询 CLI'),('root-sync-skills-check','本体技能投影 check'),('root-update-skill-lock-check','本体技能锁 check'),('isolated-verify-plan-spec-entry-scenarios','Plan 入口场景'),('isolated-verify-lifecycle-transition-scenarios','生命周期转换场景'),('isolated-verify-strategic-handoff-package-scenarios','战略交接包场景'),('isolated-verify-frontend-delivery-scenarios','前后端联合接收场景'),('cli-backend-verify-bundle','后端 CLI 包验证'),('cli-frontend-verify-bundle','前端 CLI 包验证'),('cli-backend-init-physical-path','后端 CLI init'),('cli-frontend-init-physical-path','前端 CLI init'),('create-yss-spec-sync-template','综合 CLI 本地源同步'),('create-yss-strategic-design-sync-template','战略 CLI 本地源同步'),('create-yss-harness-dev-sync-template','开发 CLI 本地源同步')]
table='\n'.join(row(label,title) for label,title in labels)
plan=[]
for r in groups.get('isolated-plan-entry',[]):plan.extend(json.loads((m/r['stdout_ref']).read_text())['times_ms'])
plan_range=f'{min(plan):.1f}–{max(plan):.1f} 毫秒' if plan else '未测量'
experiment=json.loads((m/'schema-batch-experiment.json').read_text()) if (m/'schema-batch-experiment.json').exists() else None
exp=(f"使用真实 context reconciliation schema，对同样的20份合成输入（10合法、10非法）作3组对照，逐条启动20个Python进程的中位数为 **{experiment['median_separate_ms']/1000:.3f} 秒**，一次进程批量校验为 **{experiment['median_batch_ms']/1000:.3f} 秒**；错误列表完全一致。该实验只证明启动摊销可行，未实现生产替代，也未覆盖文件新鲜度、用户回复来源、全部schema及跨schema引用。" if experiment else '批量对照实验未测量。')
coverage=json.loads((m/'coverage-summary.json').read_text()) if (m/'coverage-summary.json').exists() else {}
active=json.loads((base/'inventory/summary.json').read_text())['active_by_repo']
repo_table='\n'.join(f"| {'本体' if k=='.' else k.removeprefix('submodules/')} | {v['files']} | {v['code_files']} |" for k,v in active.items())
text=f'''# 本体与子项目 scripts 性能分析

日期：2026-09-10。范围由用户“按推荐继续”确认：全量分析，优先日常 Plan → Spec → Ticket，再看 fast 与完整验证；本轮只交付分析和优化方案，未修改运行脚本、门禁、技能投影或子仓源码，未提交/推送。

## 结论

**可以优化，优先处理重复启动校验进程和事务刷盘，不建议先优化 referenced_terms_digest。** 日常单次入口并不慢，但同一验证链可重复启动数百次 Python；完整实例生成则存在单次分钟级成本。两者应分开处理，不能把脚本提速比例直接当成整个 Agent 对话提速比例。

本轮完成全量文件盘点、内容去重、静态风险归类及关键链路实测。**没有逐个执行所有脚本，也不声称全部脚本性能已验证正常。** 缺真实输入、真实工程、网络或发布条件的脚本仅作静态分析；生成和同步测试的写入均发生在临时隔离目标。

## 覆盖范围与逐项台账

本体＋`.gitmodules`登记的9个子项目，递归覆盖精确命名为 `scripts` 的目录；包含根脚本、库、fixture、canonical技能脚本、`.template-source/scripts`、tooling脚本和CLI模板快照。另追踪脚本调用到的 `src`、canonical/两份vendor `cli-core` 等目录外实现。

- 活跃源及分发面：1390个文件，其中1248个代码文件，按SHA256去重为320份代码。
- 目录外闭包：56个物理文件，19个内容hash，其中18份是活跃scripts之外的新增实现，共338份活跃唯一代码归类。
- 另列968个Agent投影文件、397个staging文件、9个历史快照文件。它们仍在原始清单中，未删除，也不作为独立权威源优化。
- 合计2820个文件完成可读性、路径及SHA256核对；词法/显式依赖边7132条，其中261条未解析字面量、355条动态引用。词法候选含注释或字符串，不冒充完整语义调用图。
- 每个唯一实现均有分类：30组直接候选、53组候选调用者、42组薄包装、94组fixture/测试、12组依赖外部运行环境、2组vendor bundle、105组尚无已确认热点。后者不是“性能正常”的证明。

| 仓库 | 活跃 scripts 文件 | 代码文件 |
|---|---:|---:|
{repo_table}

权威源与分发关系须按配置确认，不能只凭文件名或hash。`.agents/skills`是技能权威，Agent roots是投影；旧CLI `template`是生成快照；专职CLI的`vendor/cli-core`来自本体`.template-source/cli-core`。`sync-strategic-handoff-tools`明确承载部分共享脚本向4个Harness子仓的传播；其他归属不明项已标unknown，不直接批改全部副本。

可筛选的完整台账：

- [逐文件清单 CSV](inventory/inventory.csv) / [JSON](inventory/inventory.json)
- [所有内容组及副本](inventory/unique-implementations.json)
- [338份实现的分析结论](hotspots/implementation-assessments.csv)
- [目录外调用实现](inventory/closure.csv) / [调用边](inventory/dependency-edges.csv)
- [实测覆盖映射](measurements/coverage.csv)：直接测量、被拒绝输入、同内容但未测该上下文、仅静态分析分别标注；不能把同hash副本的成绩互相挪用。

## 实测结果

环境详见[environment.json](measurements/environment.json)。每次测量顺序执行；便宜命令3次，慢场景/初始化1次，表内为无追踪基线中位数。没有清空系统文件缓存，没有控制用户其他应用；单次慢路径只代表本机样本，不提供p95或稳定SLA。追踪有额外开销，另列，不能与基线直接做优化前后比较。

| 命令/路径 | 基线耗时 | 样本数 | 退出码 |
|---|---:|---:|---|
{table}

当前共记录{len(runs)}次命令运行，含追踪和失败输入；不是{len(runs)}份不同实现。完整逐次命令、时间、CPU、退出码、输出和追踪见[timings.csv](measurements/timings.csv)、[runs.jsonl](measurements/runs.jsonl)和[trace-summary.json](measurements/trace-summary.json)。

有效的合成Plan入口直接API调用测了15次，每次 **{plan_range}**。5次调用的追踪里，主进程等待Node对账CLI约542ms、等待Python用户决定schema约335ms；对账CLI内部又启动Python。读取和摘要成本与这些子进程启动成本不是同一量级。

### 重复Python校验有明确证据

战略交接场景追踪中，主进程启动260次Python，其中253次是schema调用；包括子Node中的调用，整棵进程树共有277次schema启动，累计等待约19.9秒。前后端接收场景整棵进程树共有425次schema启动，累计约29.8秒。这里累加的是Python调用自身等待，没有再把外层Node等待加进去；持续运行的本地测试服务寿命也不作为额外耗时相加。

实际链路示例：`Plan入口 → Node词汇对账CLI → Python schema`，并另行执行`Python用户决定schema`；交接包则反复校验handoff/domain-strategy/stage-decision/export/package等schema。测试中的合法与非法情况都付出了启动成本。

{exp}

### 分钟级init主要是持久化写入

后端包3915个逻辑文件/791个唯一blob，前端4884/1114。加载和验证包的基线约0.2秒；即使完全消除这部分，也解释不了分钟级初始化。

`applyTransaction → 每个operation写progress.json → 写目标文件`，两次`durable`各有文件和目录`fsync`。后端追踪执行15672次fsync，累计91.0秒，占该次114.6秒追踪的约79.5%；前端19548次，累计82.2秒，占100.8秒追踪的约81.5%。数据波动说明存储状态影响显著，不能按单次样本预测所有机器。

这不是可以直接删除的“多余IO”：日志顺序、恢复进度、并发身份检查、metadata最后提交和崩溃后的回滚都有语义。应先设计批量持久化/进度日志方案，保留恢复能力，再以中断、断电模型、并发变更和回滚测试验证。

### 失败输入单独解释

开发/后端/前端Harness源及开发CLI的template根CONTEXT缺schema头或预期表头，直接运行通用`verify-context-contract`被拒绝。其几十毫秒耗时是失败路径，不是正常工作单元速度；是否为profile差异或待迁移，应回各仓合同核对，本轮未修复。

专职CLI初次测试使用macOS `/var`临时路径，因系统符号链接被现有路径保护拒绝；改用同一临时目录的物理`/private/var`路径后成功。这4条拒绝记录保留为测量准备错误，不据此提出放宽路径保护。未将历史上一轮228秒套件数据混入本轮基线。

## 优化排序与建议实施顺序

下列是待确认的方案，不是已经实现的优化；完整12项及61处源码证据见[候选详情](hotspots/findings.md)和[candidates.json](hotspots/candidates.json)。

| 顺序 | 对应候选 | 建议 | 收益与验收重点 |
|---|---|---|---|
| 1 | P01 | 同一次验证批量提交schema；复用Python validator，给Node对账提供可组合入口 | 有重复启动实证。比较同输入耗时、进程数、所有合法/非法错误和退出码；不换引擎作为第一步，不跨新鲜度边界缓存通过结果 |
| 2 | P03 | 合并同工作单元查询；输出命令开始/结束、耗时和升级原因 | 减少Agent调用轮次并解释等待。进度输出改善可见性，不冒充CPU提速；默认JSON stdout保持可解析 |
| 3 | P02/P04/P09 | 单次调用内复用Context扫描、canonical hash、包清单及解析结果，批量Git受跟踪清单 | 必须绑定完整输入和schema/验证器；新增嵌套CONTEXT、symlink变化、包篡改仍能阻断。先按trace确认收益，避免为几十毫秒引入复杂持久缓存 |
| 4 | P06/P07/P12 | 旧CLI显式区分同步与单测，缩小syncCore归档到所需子树；复用不可变fixture | 保留本地工作树/commit语义、投影完整性及包内容校验。不能把取消pretest误当作模板集成已验证 |
| 5 | P08 | 专职CLI事务持久化重设计，优先消除每文件进度持久化的写放大 | 收益大、风险高；先设计WAL/批量恢复边界。禁止简单删fsync或仅调并发。验证中断恢复、回滚、并发变化和输出内容/权限完全一致 |
| 6 | P05 | 区分源版场景和生成实例场景，减少公共fixture重复构造 | 两者来源不同，不能直接删一遍。并行仅限已证明无共享写入、端口、锁和持久化依赖的部分 |
| 按输入 | P10/P11 | 真实Maven/pnpm和网络命令拆分计时、复用已有commit缓存，补有边界的超时与进程清理 | 未有真实工程/网络基准；mock场景不能代表依赖下载速度，不绕过真实工程验收 |

推荐首先实施第1项和第2项，单独观察日常工作单元累计时间；第5项独立设计和验证，避免把高风险事务改造混入简单提速。没有新增硬性门禁、固定性能SLA或发布承诺。

## 本轮没有测量或不能推断的内容

- 未执行全部生成器、上传/发布、远程更新或真实业务验证。输入不足的脚本在逐实现台账写明需要的工程、数据、网络或参数。
- 真实Maven/pnpm执行成本尚未测量；仓库内部分脚手架测试使用mock wrapper，不能归因为真实依赖下载。
- 目录扫描、解析和hash需按仓库规模看曲线。当前小样本不能证明未来大仓库不存在瓶颈。
- 无真实用户那次十分钟对话的逐调用时间线，Agent推理、工具往返和人工等待占比仍unknown。脚本基准不是端到端对话基准。
- 当前主工作区本就存在Plan改动。本轮在已复制的工作树快照或原仓只读入口测量；隔离源摘要见[isolated-source-hashes.json](measurements/isolated-source-hashes.json)。外部提交状态不是本轮分析完成的依据。

## 复现与验证

[测量方法与复现入口](measurements/README.md)说明了隔离准备、命令计划、追踪开销与超时；不要直接把已经存在的init目标再次作为新建目标。所有试验辅助工具在本报告目录内，不接入产品运行链。

盘点和候选核验分别运行 `python3 inventory/verify.py` 与 `python3 hotspots/verify_report.py`（从本目录引用），核对2820份文件摘要和338份实现分类。测量日志核验、最终返回码及模板fast核验结果记录在[最终验证](verification.json)。

本轮是 `template-source` 的分析资产维护，context reconciliation为not-applicable（未生成产品术语或产品工作单元）。没有产品Ticket、Slice Contract或ready-for-agent裁决；没有Git checkpoint提交。分析完成不表示候选优化已实现、模板可发布或所有脚本均已实测。
'''
(base/'report.md').write_text(text)
print('report generated',len(text.encode()),'bytes')
