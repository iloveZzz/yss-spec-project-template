"""Summarize and archive four supplemental runs without modifying primary score."""
import datetime,hashlib,json,pathlib,tarfile
E=pathlib.Path(__file__).resolve().parent;C=json.loads((E/'C2-ui-supplement-config.json').read_text());root=pathlib.Path(C['root'])
results=[json.loads(p.read_text()) for p in sorted(root.glob('*/*/result.json'))];reviews=json.loads((E/'ui-supplement-semantic-review.json').read_text());assert len(results)==4 and len(reviews)==4
bykey={(r['variant'],r['scenario'],r['repeat']):r for r in reviews};rows=[];equality={}
for variant in ['baseline','candidate']:
 primary=json.loads((pathlib.Path(json.loads((E/'C2-v2-config.json').read_text())['root'])/variant/'run-config.json').read_text());supp=json.loads((root/variant/'run-config.json').read_text());equality[variant]={k:primary[k]==supp[k] for k in ['runtime_sha256','runner_sha256','suite_sha256','model','reasoning_effort','repetitions','source','python_dependencies','python_runtime']};assert all(equality[variant].values())
for r in results:
 key=(r['variant'],r['scenario'],r['repeat']);review=bykey[key];usage=r['usage'];row={'variant':r['variant'],'repeat':r['repeat'],'automatic_result':r['automatic_result'],'semantic_result':review['semantic_result'],'seconds':r['elapsed_seconds'],'tool_calls':r['tool_calls'],'usage':{k:sum(u.get(k,0) for u in usage) for k in ['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens']},'usage_reported':bool(usage),'timeout':r['timeout']};rows.append(row)
summary={'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'records':rows,'same_variant_configuration_as_primary':equality,'primary_48_unchanged':True,'per_turn_timeout_seconds':600,'score_scope':'Separate supplementary experiment; does not replace primary failures','review_type':'Primary maintainer semantic review, not independent','money':None}
(E/'ui-supplement-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
table='\n'.join(f"| {r['variant']} | {r['repeat']} | {r['automatic_result']} / {r['semantic_result']} | {r['seconds']} | {r['tool_calls']} |" for r in rows)
text=f'''# UI 延长窗口补充评测

主批次双方的 UI 两次运行均在 300 秒内未完成，保留为原 48 次中的失败。本补充实验双方各两次，单 turn 上限 600 秒、无自动重试；来源、runner、场景全文、运行时、模型和推理档位与原对照相同，仅过滤 E08。记录见 [配置](C2-ui-supplement-config.json)、[运行命令](C2-ui-supplement-execution.json)、[汇总](ui-supplement-summary.json)。

| 版本 | 重复 | 自动 / 语义结果 | 实际秒数 | 完成工具调用 |
|---|---:|---|---:|---:|
{table}

语义复核按实际三份文档检查 R1 无权限时零写请求、R2 成功回执及超时保留/同键重试、R3 空态/字段校验/提交忙态。原文件字节与允许产物也核对，逐项结论在 [复核记录](ui-supplement-semantic-review.json)。通过只说明该预算内的隔离文档起草满足上述输入，不等于原型、真实 API、生产代码、浏览器或阶段批准已验证。

加长时间限额与主批次是不同实验条件，不能把追加成功填回原 300 秒评分。提示词本身已要求“上游范围只引用”，因此不能将引用复用归因为模板改动；后续若测自主采用效果，需要单独控制这项提示。两次重复、固定执行顺序及共享主机维护活动不足以推断稳定性能差异。最终模板验证以 nice 15 在候选补测期间运行，具体起止见 fast-verification-post-docs.json；未隔离主机负载，不将差异归因于模板。模型未报告的 usage 保持未知；已报告输入包含缓存，不虚构金额。校准和故障消耗同样计入 [完整资源台账](all-evaluation-resource-ledger.json)。

双方源快照、依赖、runner 与场景由 [主归档](formal-archive.json)保留。本补充的原始轨迹、逐步输入清单、最终产物和复核包另见 [补充归档](ui-supplement-archive.json)，不复制凭据。实际起止与原 3 小时正式评测窗口的关系在运行记录和预算台账中保留。
'''
(E/'ui-supplement-report.md').write_text(text)
archive=E/'ui-supplement-evidence.tar.gz';assert not archive.exists()
excluded={'.agents','.codex','.template-spec','.template-source','scripts','.eval-python','.eval-bin','.eval-tmp','.git','__pycache__'}
with tarfile.open(archive,'w:gz') as tar:
 for ref in ['C2-ui-supplement-config.json','C2-ui-supplement-plan.json','C2-ui-supplement-execution.json','ui-supplement-summary.json','ui-supplement-semantic-review.json','ui-supplement-review-packets','ui-supplement-report.md']:
  tar.add(E/ref,arcname=ref)
 for variant in ['baseline','candidate']:
  for ref in ['run-config.json','results.jsonl']:tar.add(root/variant/ref,arcname=f'runs/{variant}/{ref}')
  for result in sorted((root/variant).glob('*/result.json')):
   run=result.parent;workspace=run/'workspace';packet=json.loads((E/'ui-supplement-review-packets'/f'{variant}-{run.name}.json').read_text());changed=set(packet['original_files_changed'])|set(packet['new_files'])
   for file in sorted(run.rglob('*')):
    if not file.is_file() or file.is_symlink() or not file.resolve().is_relative_to(run.resolve()):continue
    relative=file.relative_to(run)
    if '__pycache__' in relative.parts:continue
    if relative.parts[0]=='workspace':
     local=file.relative_to(workspace)
     if any(part in excluded for part in local.parts) and str(local) not in changed:continue
    tar.add(file,arcname=f'runs/{variant}/{run.name}/{relative}')
with tarfile.open(archive) as tar:
 names=tar.getnames();assert sum(n.startswith('runs/') and n.endswith('/trace.jsonl') for n in names)==4;assert sum(n.startswith('runs/') and n.endswith('/result.json') for n in names)==4;assert not any(pathlib.PurePosixPath(n).name=='auth.json' for n in names)
record={'archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'trace_count':4,'result_count':4,'archive_readback_verified':True,'source_archive':'formal-agent-evaluation-evidence.tar.gz','original_raw_root':str(root),'original_files_retained':True}
(E/'ui-supplement-archive.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'summary':summary,'archive':record},ensure_ascii=False))
