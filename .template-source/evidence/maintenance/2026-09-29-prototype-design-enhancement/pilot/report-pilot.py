from pathlib import Path
import json,hashlib,shutil,datetime
W=Path(__file__).parent.resolve();E=Path('/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/evidence/maintenance/2026-09-29-prototype-design-enhancement');P=E/'pilot'
rows=json.loads((P/'observations.json').read_text());browser=json.loads((P/'browser-report.json').read_text());by={(r['task'],r['side']):r for r in browser}
semantics=[]
for r in rows:
 d=P/'ab'/r['task']/r['side'];b=by[(r['task'],r['side'])]
 behavior=json.loads((d/'behavior-audit.json').read_text()) if (d/'behavior-audit.json').exists() else None
 token=d/'tokens.css';source=W/r['arm']/'.template-spec/design/tokens/variables.css'
 observed=[]
 if not r['html_exists']:observed.append('HTML 缺失，无法评价画面和行为')
 if b.get('missing_resources'):observed.append('缺失运行资源：'+', '.join(b['missing_resources']))
 issues=sum(len(v['issues']) for v in b.get('observations',[]));overflow=sum(v['overflow'] for v in b.get('observations',[]))
 if issues:observed.append(f'各场景/视口共 {issues} 条浏览器错误/资源失败事件（包含同问题重复）')
 if overflow:observed.append(f'{overflow} 个场景/视口存在整体横向溢出')
 semantics.append({'task':r['task'],'arm':r['arm'],'side':r['side'],'automatic_result':r['automatic_result'],'write_scope':r['write_scope']['status'],'token_snapshot':'byte-identical' if token.exists() and token.read_bytes()==source.read_bytes() else 'missing-or-different','behavior':behavior or {'status':'unverified','reason':'incomplete output; no complete interaction sequence to compare'},'candidate_difference':'not-applicable; existing pattern preserved in supplied local change' if r['task']=='preserve-small-change' and r['design_exists'] else 'not-assessable; no completed design explanation','visual_observations':observed,'visual_quality':'not-confirmed','sources':[r['trace_ref'],str((d/'browser-audit.json').relative_to(E)) if (d/'browser-audit.json').exists() else None]})
(P/'semantic-assessment.json').write_text(json.dumps(semantics,ensure_ascii=False,indent=2)+'\n')
order=['list-detail','multi-step','approval-permission','conflict-recovery','dense-analysis','preserve-small-change'];lookup={(r['task'],r['arm']):r for r in rows}
lines=[]
for task in order:
 a=lookup.get((task,'baseline'));b=lookup.get((task,'candidate'))
 def cell(r):return '未执行' if not r else f"{'超时' if r['timeout'] else r['automatic_result']} / {r['elapsed_seconds']:.2f}s / HTML {'有' if r['html_exists'] else '无'} / 说明 {'有' if r['design_exists'] else '无'}"
 lines.append(f"| {(a or b)['title']} | {cell(a)} | {cell(b)} |")
ledger=json.loads((P/'budget.json').read_text());attempts=ledger['attempts'];done=sum(r['turn_completed'] for r in rows);timeouts=sum(r['timeout'] for r in rows);auto=sum(r['automatic_result']=='passed' for r in rows);usage=sum(bool(r['usage']) for r in rows);native_reads={}
for arm in ['baseline','candidate']:
 subset=[r for r in rows if r['arm']==arm];native_reads[arm]={'successful_read_path_mentions':sorted(set(p for r in subset for p in r['explicit_skill_reference_paths'])),'tool_calls':sum(r['tool_calls'] for r in subset),'failed_shell_commands':sum(r['failed_commands'] for r in subset),'elapsed_seconds_including_fixture_and_scoring':round(sum(r['elapsed_seconds'] for r in subset),2)}
summary={'records':len(rows),'attempts':len(attempts),'turn_completed':done,'automatic_passed':auto,'timeouts':timeouts,'reported_usage_records':usage,'runtime_seconds_charged':round(sum(x.get('elapsed_seconds',0) for x in attempts),3),'max_turns':12,'max_seconds':3600,'visual_quality':'not-confirmed','effectiveness_conclusion':'not-established','semantic_scope':'artifact inspection and targeted external browser checks; no user visual acceptance','arms':native_reads}
(P/'outcome.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
common=''.join([])
report=f'''# 12 次真实 Agent 对照试点

执行日期：2026-09-29 至 2026-09-30。工程状态单独见 [实施报告](implementation-report.md)。

## 结论

实际启动 {len(attempts)} 次，形成 {len(rows)} 条结果，{timeouts} 次超时；{done} 次返回完整 turn.completed，自动通过 {auto} 次。本次预算内未建立设计质量改善证据，不声称普遍提升或节省比例。

[六组匿名 A/B 留存记录](pilot/index.html)保留原始草案、原尺寸截图和缺失标记。两侧完整性不足时不能作有效视觉对照；未用教学示例或人工修补页替换 Agent 产物。视觉收益保持未确认，本次不请求用户为不完整对照作通过判断。

## 配置与公平性

- 同一 Codex CLI 0.158.0-alpha.2.1、gpt-6-astra、xhigh；六个任务各基线一次、增强一次；相同 fixture、工具、离线约束和两个视口。
- 共用 12 次启动、3600 秒 Agent 运行预算，每次上限 300 秒；最后一次受总剩余额度约束。失败不自动重跑，不扩额补样本。任务记录耗时包含 fixture/scoring，因此可能超过 300 秒；ledger 单独记 Agent 运行时间。
- 基线来源在首次编辑前捕获，包含已有共同未提交基础改动；增强快照只叠加本轮输入及对应投影/元数据。两组 source archive、SHA 清单、场景与冻结评测器在 pilot/ 中。
- source 差异清单含 3 个生成投影中的 .DS_Store 非语义文件；不把该清单声称为只有 Markdown 文本变化。运行时是否碰到这类目录项未单独控制。
- 基线预检查首次因符号链接失败，Agent 启动为 0；在两组输入中同样物化投影链接后正式执行，保留预检查说明。真实输出写入仅允许 drafts/，全部结果附最终写入范围检查。
- 调度器把评测器持续更新的 summary.json 当成批次结束信号，导致两组部分重叠运行。两组模型/推理/fixture 未改变，但共享机器负载、provider 排队与缓存未控制；这是执行偏差，不用该数据比较速度或费用。未来批次应等待实际进程退出或终态标识，不改本轮固定预算补测。
- A/B 标签按任务交替分配，映射另存 ab-mapping.json；这是展示盲标，不是随机实验。主控知道映射，视觉优劣最终应由当前用户在有效完整对照上确认。

## 六组实际产物

| 任务 | 基线 | 增强 |
|---|---|---|
{chr(10).join(lines)}

`HTML 有`只表示文件存在；资源、脚本或设计说明仍可能不完整。全部超时仍按失败记，不因部分页面能打开而提升为通过。

## 实际读取与失败

- 基线工具调用 {native_reads['baseline']['tool_calls']} 次，失败 shell 命令 {native_reads['baseline']['failed_shell_commands']} 次；增强工具调用 {native_reads['candidate']['tool_calls']} 次，失败 shell 命令 {native_reads['candidate']['failed_shell_commands']} 次。包含原始 trace 的失败输出，不推断每次失败的单一原因。
- 成功命令中观察到两个入口 Skill 的显式读取；增强组还读取了 enterprise-craft、concept-comparison 等新增 references。完整路径与命令见 pilot/*/<task>/command-observations.json。命令引用和截断输出不能证明全文被理解。
- 仅有 {usage}/{len(rows)} 次记录返回 Token usage；缺失值为 unknown，不是 0，不从运行时长推算 Token、价格或账单。
- 共同问题包括 shell 引号/转义错误、执行时间耗尽后文件集合未写完。不能将所有失败归因于增强方法，也不能据此宣称无回归。300 秒设置没有给本次 xhigh 任务提供足够的完整输出证据；耗时和缺陷结果混合了任务范围、Agent 行为、工具执行与截断影响。

## 浏览器与语义复验

原始产物拷贝到匿名独立目录，使用 Chromium 151.0.7922.34、file://、offline=true、1440×900 和 390×844。各任务只加载其声明适用场景；记录 console、资源失败、整体溢出、控件与文本、键盘焦点及截图，见 [浏览器记录](pilot/browser-report.json)。

基线局部修改产物额外通过查询、空态说明、Enter、查询重置、场景重置和列顺序检查，两个视口均无整体横向溢出。该检查不改变 Agent 超时结论；首次探针未等待原生 reset 后的异步刷新，造成瞬时计数失败，修正为等待可观察行数后通过，首轮探针记录保留。

其余缺资源/缺页面任务的行为覆盖和候选差异标为未验证，不能以静态 HTML 数量或截图美观替代。Token 副本一致性、写入范围、可定位的画面/运行错误及逐任务行为结论见 [语义检查](pilot/semantic-assessment.json)。本轮没有完成独立原型评审或用户视觉会签。

## 可执行后续

本轮 12 次预算已用尽，停止 Agent 启动。下次在用户单独批准的新预算下，先用一个代表性任务校准时间/输入范围，等待运行终态再调度；两组同时冻结新的上限与输入后再做成对试验。不得只给增强组增加时间或仅补成功样本。当前可直接复用本轮工程验证、任务 fixture、异常记录和匿名入口，不把它们当作设计效果已提升的证据。
'''
(E/'pilot-report.md').write_text(report)
for name in ['collect-pilot.py','browser-audit.mjs','local-change-audit.mjs','build-pilot-review.py','report-pilot.py']:
 shutil.copy2(W/name,P/name)
print(json.dumps(summary,ensure_ascii=False)[:500])
