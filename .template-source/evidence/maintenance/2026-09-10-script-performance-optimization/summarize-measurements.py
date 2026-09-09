from pathlib import Path
import json,collections,statistics,re,csv
OUT=Path(__file__).resolve().parent
runs=[json.loads(line) for line in (OUT/'runs.jsonl').read_text().splitlines()]
def stats(values):return {'n':len(values),'median':statistics.median(values),'minimum':min(values),'maximum':max(values)} if values else None
def select(prefix):return [r for r in runs if (r['label']==prefix or re.fullmatch(re.escape(prefix)+r'-\d+',r['label'])) and not r['trace'] and r['exit_code']==0 and not r['timeout']]
def group(prefix):
 rows=select(prefix)
 return {'wall_ms':stats([r['wall_ms'] for r in rows]),'peak_rss_bytes':stats([r['peak_rss_bytes'] for r in rows if r['peak_rss_bytes'] is not None]),'labels':[r['label'] for r in rows]}
comparisons={}
for name,before,after in [('plan-entry','confirm-before-plan-entry','confirm-after-plan-entry'),('strategic-handoff','before-handoff','after-handoff'),('backend-frontend-delivery','before-delivery','after-delivery'),('query','before-query','after-query'),('projections','confirm-before-projections','confirm-after-projections'),('sync-core','before-archive','after-archive'),('init-backend','before-init-backend','verified-init-backend'),('init-frontend','before-init-frontend','verified-init-frontend'),('distribution','before-distribution','after-distribution')]:
 b,a=group(before),group(after)
 if b['wall_ms'] and a['wall_ms']:comparisons[name]={'before':b,'after':a,'median_reduction_percent':100*(1-a['wall_ms']['median']/b['wall_ms']['median'])}
api={}
for prefix in ['before','after']:
 for label in ['batch100','frontend-generator-clean','frontend-generator-cached','projection-matrix','projection-matrix-counts','context-scale']:
  p=OUT/'logs'/f'{prefix}-{label}-0.stdout'
  if not p.exists():continue
  try:d=json.loads(p.read_text())
  except ValueError:continue
  if 'api_times_ms' in d:api[f'{prefix}-{label}']={'timing_ms':stats(d['api_times_ms']),'results':d.get('rejected')}
  elif 'samples' in d:api[f'{prefix}-{label}']={'timing_ms':stats([r['duration_ms'] for r in d['samples']]),'samples':d['samples']}
  elif 'rows' in d:api[f'{prefix}-{label}']={'sizes':{str(r['directories']):stats(r['api_times_ms']) for r in d['rows']},'nested_rejected':d['nested_rejected']}
traces={}
for directory in (OUT/'traces').iterdir():
 ops=collections.Counter();bytes_=collections.Counter();processes=collections.Counter();files=[]
 for p in directory.rglob('*.json'):
  d=json.loads(p.read_text());files.append(str(p.relative_to(OUT)));ops.update({k:v['count'] for k,v in d['operations'].items() if k.startswith('fs.')});bytes_.update(d.get('write_bytes',{}))
  for key,value in d['operations'].items():
   if key.startswith(('spawnSync:','spawn:','fork:','execFileSync:','execSync:')):
    _,exe,*_=key.split(':');processes[exe]+=value['count']
 traces[directory.name]={'operations':dict(ops),'processes':dict(processes),'write_bytes':dict(bytes_),'trace_refs':files}
failures=[{'label':r['label'],'exit_code':r['exit_code'],'timeout':r['timeout'],'stderr_ref':r['stderr_ref']} for r in runs if r['exit_code']!=0 or r['timeout']]
summary={'comparisons':comparisons,'api_measurements':api,'instrumented_counts':traces,'rejected_samples':failures,'preliminary_init_samples':'after-init-* 与 final-init-* 为中间版本；后端部分与隔离修复重叠，后续恢复矩阵也修订了事务实现。最终只使用 verified-init-* 三次独立样本。','memory_method':'/usr/bin/time -l 的 maximum resident set size 字节值；不是整个进程树同时 RSS 总和。','cache_method':'同机本地文件系统顺序运行；未清理操作系统页缓存，不声称物理冷盘基准。'}
(OUT/'measurement-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (OUT/'performance-comparison.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['path','before_n','before_median_ms','before_min_ms','before_max_ms','after_n','after_median_ms','after_min_ms','after_max_ms','reduction_percent','before_peak_rss_bytes','after_peak_rss_bytes'])
 for name,row in comparisons.items():
  b,a=row['before'],row['after'];w.writerow([name,*[b['wall_ms'][k] for k in ['n','median','minimum','maximum']],*[a['wall_ms'][k] for k in ['n','median','minimum','maximum']],row['median_reduction_percent'],b['peak_rss_bytes']['maximum'],a['peak_rss_bytes']['maximum']])
print(json.dumps({'comparisons':len(comparisons),'failed_records_kept':len(failures)},ensure_ascii=False))
