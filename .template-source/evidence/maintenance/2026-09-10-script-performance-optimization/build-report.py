from pathlib import Path
import json,hashlib,collections,statistics,subprocess
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];REF=str(OUT.relative_to(ROOT))
s=json.loads((OUT/'measurement-summary.json').read_text());d=json.loads((OUT/'disposition-summary.json').read_text());p=json.loads((OUT/'preservation.json').read_text());runs=[json.loads(x) for x in (OUT/'runs.jsonl').read_text().splitlines()]
full=[r for r in runs if r['label']=='validation-after-recovery'];assert full and full[-1]['exit_code']==0 and not full[-1]['timeout']
for prefix in ['verified-init-backend','verified-init-frontend','before-distribution','after-distribution']:
 rows=[r for r in runs if r['label']==prefix or r['label'].startswith(prefix+'-')];assert len(rows)==3 and all(r['exit_code']==0 for r in rows),prefix
assert all(r['exit_code']==0 for r in json.loads((OUT/'final-refresh-results.json').read_text()))
assert all(r['exit_code']==0 for r in json.loads((OUT/'recovery-refresh-results.json').read_text()))
assert len(s['comparisons'])==9
labels={'plan-entry':'Plan entry（每进程 5 次 API 调用）','strategic-handoff':'战略交接场景','backend-frontend-delivery':'后端/前端交付源场景','query':'已有合并查询','projections':'默认技能投影检查','sync-core':'固定 commit 的 syncCore','init-backend':'后端 CLI init','init-frontend':'前端 CLI init','distribution':'完整专职 CLI 分发场景'}
table=[]
for name,row in s['comparisons'].items():
 b,a=row['before']['wall_ms'],row['after']['wall_ms'];table.append(f"| {labels[name]} | {b['n']}/{a['n']} | {b['median']:.1f} [{b['minimum']:.1f}, {b['maximum']:.1f}] | {a['median']:.1f} [{a['minimum']:.1f}, {a['maximum']:.1f}] | {row['median_reduction_percent']:.1f}% |")
api=s['api_measurements'];batchB=api['before-batch100']['timing_ms'];batchA=api['after-batch100']['timing_ms'];matrixB=api['before-projection-matrix']['timing_ms'];matrixA=api['after-projection-matrix']['timing_ms']
trace=s['instrumented_counts'];counts=[]
for side in ['backend','frontend']:
 b=trace['trace-before-init-'+side];a=trace['trace-verified-init-'+side];counts.append(f"| {side} init | {b['operations']['fs.fsyncSync']} → {a['operations']['fs.fsyncSync']} | {b['write_bytes']['progress']:,} → {a['write_bytes']['wal']:,} | {b['operations']['fs.readFileSync']} → {a['operations']['fs.readFileSync']} |")
mem=[]
for side in ['backend','frontend']:
 row=s['comparisons']['init-'+side];b=row['before']['peak_rss_bytes']['maximum']/1048576;a=row['after']['peak_rss_bytes']['maximum']/1048576;mem.append(f"{side} {b:.1f} → {a:.1f} MiB")
statuses='、'.join(f'{name} {count} 组' for name,count in d['dispositions'].items())
changed=json.loads((OUT/'changes-from-baseline.json').read_text());extended=[r['path'] for r in p['initial_dirty_entries'] if r['result']=='optimization-extends-existing-change']
text=f'''# 脚本性能整体优化交付报告

本地优化与集成验证完成，维护状态为 **L3 / implementation-ready**。已处置 P01–P12，并为原审计的 **338 组实现**保留逐组追踪记录。未提交、未推送、未发布；正式分发锁更新与真实外部环境验证仍在本轮边界之外。

本轮授权以用户批准计划为准；原审计报告只作为问题及源码出处证据。原审计目录未改写。本体及 9 个子项目的 HEAD、分支保持初始状态，既有 Plan 改动保留，详见 [工作区保护记录](preservation.json)。

## 实现、归属与逐项处置

[实现说明与 L3 自检](implementation-notes.md) 按 P01–P12 记录实现、调用边界、同步链、事务顺序和回归修正；[本轮专属差异](optimization.diff) 相对于包含既有改动的隔离基线生成，便于从原有 Plan 差异中单独检查本轮改动。

[逐项处置台账](implementation-dispositions.csv) 保留原 SHA 组 ID、各权威源及受控副本、调用者线索、同步工具、当前 SHA、候选归属和证据入口。结果为：{statuses}。这不是“338 个实现都被改写或逐函数证明已优化”。完整维护 workload 观察到 {d['groups_observed_in_maintenance_workload']} 组内容版本被加载；其余行明确记录缺少可绑定 SHA 的频次样本或外部环境限制。部分临时模块随夹具清理，不能把缺少样本解释为线上零调用或性能正常。

调用频次观察来自最终完整验证的 V8 数据，目录规模覆盖 10 / 1,000 / 10,000，schema 输入覆盖 1 / 100 条，投影覆盖实体与 symlink 混合、120 个未跟踪目录，前端生成覆盖 1,002 个受跟踪文件及 5,000 个未跟踪缓存文件。未确认独立热点的实现保留，不据词法标记删除检查。新增的共享依赖已进入同步清单，第三方 bundle 未手改。

## 性能对照

同一机器、本地输入、顺序执行。表内为无插桩 wall time，单位毫秒，格式为“中位数 [最小, 最大]”。短路径至少 5 次，慢路径至少 3 次。原始 argv、cwd、时间、退出码、stdout/stderr、CPU 与峰值 RSS 见 [runs.jsonl](runs.jsonl)；完整统计见 [measurement-summary.json](measurement-summary.json) 和 [对照 CSV](performance-comparison.csv)。

| 路径 | 前/后次数 | 优化前 ms | 优化后 ms | 中位耗时下降 |
|---|---:|---:|---:|---:|
{chr(10).join(table)}

P05 分发对照复用同一冻结 CLI 基底，仅切换场景源版与优化版；[实验绑定](distribution-measurement-bindings.json) 保留具体 core 锁和模板快照。最终恢复修正版另由完整生成实例回归核验，不把两个基底的时长直接相减。

100 个 value 使用同一 schema（50 项非法）的 API 测量，各 5 次：**{batchB['median']:.1f} ms → {batchA['median']:.1f} ms**，Python 启动 **100 → 1**，逐项结果一致。混合投影 API 各 5 次：**{matrixB['median']:.1f} ms → {matrixA['median']:.1f} ms**；独立插桩确认 Git 启动 **120 → 1**、读取 **607 → 405**，修改投影后再次调用仍拒绝漂移。

Context 扫描保持原实现。10,000 个目录的 5 次扫描中位数为 {api['before-context-scale']['sizes']['10000']['median']:.1f} → {api['after-context-scale']['sizes']['10000']['median']:.1f} ms，未发现应新增缓存的收益；新增嵌套 CONTEXT 仍被拒绝。已有合并查询的差异处于小幅波动，保留查询实现，P03 的交付是执行反馈与既有合并入口的复用。默认技能投影补测后仍有明显区间重叠，不能将表内 4.5% 当作已确认收益；P04 保留依据是混合投影负载下可重复的 Git、读取和耗时下降。

前端生成存在取舍：干净模板 API 中位数 **{api['before-frontend-generator-clean']['timing_ms']['median']:.1f} → {api['after-frontend-generator-clean']['timing_ms']['median']:.1f} ms**；包含未跟踪缓存时 **{api['before-frontend-generator-cached']['timing_ms']['median']:.1f} → {api['after-frontend-generator-cached']['timing_ms']['median']:.1f} ms**，生成清单从误带缓存的 6,002 项恢复为批准范围的 1,002 项。保留固定 commit 导出是批准边界要求，且减少该输入下的实际复制成本；不宣称它在干净小模板上也提速。

## 进程、读取与持久化成本

下表来自单独插桩，插桩耗时不混入上述 wall time。字节列只比较旧 progress 重写与新 WAL append；journal 和目标文件另外保留原始统计。最终事务插桩使用与 verified-init 相同的恢复修正版；之前的 trace-after-init 仅作为中间记录保留。

| 路径 | fsync 次数 | 进度日志写入字节 | 文件读取次数 |
|---|---:|---:|---:|
{chr(10).join(counts)}

战略交接场景总体 Python 启动 **286 → 230**，文件读取 **5,838 → 4,731**；目录扫描 **2,174 → 2,174**，说明没有以省略目录检查换取收益。Plan entry 的 5 次 API 调用消除内部 Node 启动 **5 → 0**，其 Python 校验次数 **10 → 10**；schema 批量收益来自真正合批的边界。

内存没有全面下降：init 样本峰值 RSS 最大值为 **{'；'.join(mem)}**。单次 blob 字节复用、逻辑文件独立 Buffer 与事务记录存在内存取舍。RSS 使用 `/usr/bin/time -l` 口径，不代表整个进程树同时驻留内存总和；本轮主要确认进程、读取、日志写放大和 init 延迟下降。

## Fresh Verification 与集成

最终 `scripts/verify-template-fast` **退出 0**；核心验证/生成改动触发自动完整 profile，未裁剪。最终命令、环境和输出见 [完整核验 stdout]({full[-1]['stdout_ref']})、[stderr]({full[-1]['stderr_ref']})。覆盖源版、core 测试、技能治理/投影/锁、Context 与交接阻断、脚手架场景、旧 CLI 和专职 CLI 生成实例。

[证据一致性核验](verification.json) 检查样本数量、日志存在、338 个审计 ID、P01–P12 覆盖、init 前后模板输入一致、当前 core 与临时 vendor 一致、共享依赖同步及原有改动保留，并记录维护 checkpoint 的实际退出码。机器与运行时版本见 [environment.json](environment.json)。

三个旧 CLI 完整准备态套件：Spec **172**、Design **37**、Dev **82** 项均通过。最终共享执行器同步后再次运行独立单测和快照生成；专职前后端 CLI 最终测试与 bundle 检查均通过，见 [完整套件记录](distribution-results-corrected.json)、[共享执行器同步/单测记录](final-refresh-results.json) 与 [最终恢复修正版同步记录](recovery-refresh-results.json)。固定 commit 的 core 与模板均在临时仓生成并检查，生成实例验证源仓移除后的独立交接、身份、错端、篡改、过期、权限和恢复。

core 的 40 项测试包含 14 个 throw / SIGKILL 持久化边界子场景。事务验证覆盖日志、备份、目标 fsync、rename、目录和提交边界的异常或中断、旧事务恢复、用户后续修改保护及目录/mode 恢复；另有持久化顺序观察和丢失未刷盘 rename 的 before/after 混合模型。**这些不是物理断电验证。** 本地跨 schema 文件引用结果与原 Python 引擎一致；超时、AbortSignal、父进程退出、进程树和 fetch 临时资源清理也已验证。

失败与修正记录均保留，详见自检说明。无效 Context 隔离输入、遗漏投影刷新、误用 Node 执行 shell 的记录不计作成功或收益。中间 init 样本含隔离修复干扰或早于临时文件恢复修正，最终仅使用独立的 `verified-init-*` 三次样本。未清理 OS 页缓存，因此不声称物理冷盘结果；真正 Maven 私服、实际工程、远端网络和真实 self-update 未测。

## 交付边界

- 本地源码优化完成；[维护 checkpoint](checkpoint.json) 为 `implementation-ready`，包含 self-check 与 Fresh Verification。
- 正式源码提交、分发 commit 锁更新和发布尚未进行。临时 revision 见 [integration.json](integration.json)，未写入正式锁。
- 既有改动中仅 {len(extended)} 个文件被本轮有意扩展（如 Plan entry、profile、技能锁）；其余已核对内容保留，路径和前后摘要见 `preservation.json`。本轮源码差异共 {len(changed)} 个路径，包含生成副本，不等同于 {len(changed)} 个独立优化。
- 外部真实环境待按原选定范围验证。产品 Spec、Ticket、Slice Contract、`ready-for-agent` 不适用。
'''
(OUT/'report.md').write_text(text)
checkpoint={'schema_version':2,'intensity':'L3','classification_reason':'核心 schema、事务持久化、生成与跨仓分发工具维护；按用户批准计划停在 implementation-ready。','triggers':['core-validator','generation-semantics','cross-repo-contract','aggregate-behavior-change'],'changed_assets':[r['path'] for r in changed],'verification_evidence':[{'kind':'fresh-verification','command':'scripts/verify-template-fast','result':'pass'},{'kind':'self-check','command':f'python3 {REF}/check-preservation.py；维护者自检见 {REF}/implementation-notes.md','result':'pass'}],'review_mode':'self-check','escalation':'none；fast 因核心影响自动执行完整 profile，不推进维护状态','target_state':'implementation-ready','current_state':'implementation-ready','verification_profile':'fast','review_round':0,'candidate_digest':None}
(OUT/'checkpoint.json').write_text(json.dumps(checkpoint,ensure_ascii=False,indent=2)+'\n')
print('report and L3 checkpoint written')
