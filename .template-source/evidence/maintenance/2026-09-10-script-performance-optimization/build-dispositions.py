"""Preserve all 338 audit identities; distinguish ownership from equal content."""
from pathlib import Path
from urllib.parse import urlparse,unquote
import csv,json,hashlib,collections
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];AUDIT=OUT.parent/'2026-09-10-script-performance-audit'
original=list(csv.DictReader((AUDIT/'hotspots/implementation-assessments.csv').open()))
groups={r['sha256']:r for r in json.loads((AUDIT/'inventory/unique-implementations.json').read_text())}
edges=list(csv.DictReader((AUDIT/'inventory/dependency-edges.csv').open()));callers=collections.defaultdict(set)
for edge in edges:
 if edge['target']:callers[edge['target']].add(edge['source'])
candidate_sources=collections.defaultdict(list)
for row in json.loads((AUDIT/'hotspots/candidates.json').read_text())['candidates']:
 for ref in row['sources']:candidate_sources[ref['path']].append(row['id'])
# V8 counts are only observations for the chosen maintenance workload, not production frequency.
loads=collections.Counter();functions=collections.Counter();raw_count=0;unresolved=set()
for raw in (OUT/'coverage/raw').glob('*.json'):
 raw_count+=1
 for script in json.loads(raw.read_text()).get('result',[]):
  url=script.get('url','')
  if not url.startswith('file:'):continue
  p=Path(unquote(urlparse(url).path))
  if not p.is_file():
   unresolved.add(url);continue
  sha=hashlib.sha256(p.read_bytes()).hexdigest();loads[sha]+=1
  functions[sha]+=sum(fn['ranges'][0]['count'] for fn in script.get('functions',[]) if fn.get('ranges'))
def shared_projection(ref):
 if not ref.startswith('submodules/yss-harness-'):return False
 local=ref.split('/',2)[2]
 explicit={'scripts/strategic-handoff','scripts/verify-strategic-handoff-consumption','scripts/verify-strategic-handoff-package-scenarios','scripts/verify-strategic-context-import','scripts/verify-strategic-context-import-scenarios','scripts/lib/context-contract.mjs','scripts/lib/context-reconciliation.mjs','scripts/lib/json-schema.mjs','scripts/lib/command-runner.mjs','scripts/verify-context-reconciliation','scripts/instantiate-harness','scripts/backend-delivery','scripts/verify-frontend-delivery','scripts/lib/backend-delivery.mjs','scripts/lib/frontend-delivery.mjs','scripts/lib/frontend-delivery-boundary.mjs'}
 return local in explicit or local.startswith(('scripts/lib/strategic-handoff','scripts/fixtures/strategic-handoff/')) or ('yss-harness-design-agent/' not in ref and local in {'scripts/verify-frontend-delivery-scenarios','scripts/fixtures/backend-delivery/revision-server.mjs'})
def distributed(ref):
 return shared_projection(ref) or '/template/' in ref or '/vendor/' in ref or any(('/'+r+'/skills/') in '/'+ref for r in ['.claude','.codex','.cursor','.pi','.qoder','.trae'])
def route(ref):
 if shared_projection(ref):return '本体 '+ref.split('/',2)[2]+' → sync-strategic-handoff-tools → 所属 Harness（backend wire import 适配）→ CLI'
 if '/vendor/cli-core/' in ref:return '.template-source/cli-core → sync-core（正式 commit 锁延后，本地临时锁已消费）'
 if '/template/' in ref:return '所属 CLI 的 template.manifest.json / template.snapshot.json → 该 CLI sync-template；不手改'
 if '/vendor/' in ref:return '所属仓供应商 bundle；原样保留，后续通过已声明供应链更新'
 if '/.agents/skills/' in '/'+ref:return '所属仓 .agents/skills 权威目录 → update-skill-lock / sync-skills → 所属 CLI sync-template'
 if ref.startswith('.template-source/cli-core/'):return '本体 canonical core → sync-core → 专职 CLI vendor（临时仓已验证，正式锁待提交）'
 if ref.startswith('submodules/create-yss-'):return '所属 CLI 自有源码；test:unit / test:prepared / sync-template；不以同名合并来源'
 if ref.startswith('scripts/lib/strategic-handoff') or 'scripts/lib/backend-delivery' in ref or 'scripts/lib/context-' in ref or ref.endswith('scripts/lib/json-schema.mjs') or 'scripts/fixtures/strategic-handoff/' in ref:return '本体共享工具 → sync-strategic-handoff-tools → 四 Harness（backend wire import 适配）→ CLI 快照'
 if ref.startswith('submodules/yss-harness-'):return '所属 Harness 持有 profile 变体；仅移植已核对的性能变更 → 所属 CLI sync-template'
 return '本体脚本权威；通过本体 CLI manifest/sync-template 分发；入口由完整核验 profile 选择'
rows=[]
for item in original:
 copies=[c['path'] for c in groups[item['sha256']]['copies'] if c['inventory_scope']=='active']
 authorities=[p for p in copies if not distributed(p)]
 representative=item['representative_path']; current={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in authorities if (ROOT/p).is_file()}
 changed=[p for p,s in current.items() if s!=item['sha256']]
 observed=sum(loads[s] for s in set(current.values()))
 external=item['disposition']=='external-runtime-needs-input'
 if not authorities or item['disposition']=='vendor-bundle-do-not-hand-optimize':
  status='分发副本';reason='保留锁定或 vendor 内容；临时分发生成/消费已核验，正式分发锁未更新。第三方 bundle 未手改。'
 elif external:
  status='外部环境待验证';reason='本轮只执行维护夹具；真实依赖、实际工程、远端网络或显式 self-update 缺少已选真实环境，不把 mock 用时算作外部收益。'
 elif changed:
  status='优化并验证';reason='权威实现或其受控 Harness 变体有本轮变更；验证以 Fresh Verification、相关场景和候选对照为依据，副本不冒充独立优化。'
 else:
  status='测量后保留';reason='采样维护入口调用频次、目录/输入规模后未取得应增加复杂度的独立热点证据；保留现实现。'
  if not observed:reason+=' 未取得可绑定此 SHA 的 V8 加载样本；临时模块可能已随夹具清理，不能把缺少可绑定样本解释成线上零调用或性能正常。'
 ids=sorted(set(filter(None,item['candidate_ids'].split(',')))|{cid for p in authorities for cid in candidate_sources[p]})
 row={**item,'optimization_disposition':status,'source_authorities':json.dumps(authorities,ensure_ascii=False),'source_routing':json.dumps({p:route(p) for p in authorities or [representative]},ensure_ascii=False),'known_callers_lexical':json.dumps(sorted({c for p in copies for c in callers[p]}),ensure_ascii=False),'current_source_hashes':json.dumps(current,ensure_ascii=False),'changed_sources':json.dumps(changed,ensure_ascii=False),'candidate_ids_final':';'.join(ids),'distribution_copies':json.dumps([p for p in copies if distributed(p)],ensure_ascii=False),'observed_module_loads':observed,'observed_function_entries':sum(functions[s] for s in set(current.values())),'verification_entry':'logs/validation-after-recovery-0.stdout; runs.jsonl; final-refresh-results.json; distribution-results-corrected.json','evidence_basis':reason,'measurement_limit':'V8 观察是维护夹具入口频次，非线上调用频率；未观察到的实现未作逐函数性能通过声明。输入尺度详见 report.md。'}
 rows.append(row)
assert len(rows)==338 and len({r['sha256'] for r in rows})==338
with (OUT/'implementation-dispositions.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
summary={'implementation_groups':len(rows),'dispositions':dict(collections.Counter(r['optimization_disposition'] for r in rows)),'groups_observed_in_maintenance_workload':sum(r['observed_module_loads']>0 for r in rows),'coverage_files':raw_count,'unresolved_module_urls':len(unresolved),'scope_note':'沿用原 338 个内容组作为追踪 ID，不把同 hash 当权威归属。计数只包含能绑定 SHA 的稳定文件，是样本观察下界；未观察组记录缺少样本与验证限制。'}
(OUT/'coverage/unresolved-urls.json').write_text(json.dumps(sorted(unresolved),ensure_ascii=False,indent=2)+'\n')
(OUT/'disposition-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
