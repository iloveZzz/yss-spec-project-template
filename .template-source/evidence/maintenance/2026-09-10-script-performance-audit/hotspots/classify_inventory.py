import csv, hashlib, json, re
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[4]
INV=OUT.parent/'inventory'
groups=json.loads((INV/'unique-implementations.json').read_text())
metadata={x['path']:x for name in ['inventory.json','closure.json'] for x in json.loads((INV/name).read_text())}
candidates=json.loads((OUT/'candidates.json').read_text())['candidates']
by_hash={}
for c in candidates:
    for source in c['sources']: by_hash.setdefault(source['sha256'],[]).append(c['id'])
results=[]
for g in groups:
    active=[x for x in g['copies'] if x['inventory_scope']=='active']
    if not g['code'] or not active: continue
    active.sort(key=lambda x:(x['origin']!='scripts',x['repo']!='.',len(x['path']),x['path']))
    rep=active[0]['path']; meta=metadata[rep]; text=(ROOT/rep).read_text(errors='replace')
    assert hashlib.sha256((ROOT/rep).read_bytes()).hexdigest()==g['sha256']
    ids=sorted(set(by_hash.get(g['sha256'],[])))
    role=meta.get('role','unknown'); base=Path(rep).name
    basis='词法/路径分类，未证明性能正常'; method='按真实调用频率与输入规模采样；有证据再扩大分析'
    if ids: disposition='candidate'; basis='直接引用源码已人工核对'; method='见关联候选验证设计'
    elif '/vendor/' in rep and base in ['yaml.mjs','xml.mjs']:
        disposition='vendor-bundle-do-not-hand-optimize'; basis='锁定第三方生成bundle；改调用频率/构建源，禁止手改bundle'; method='记录解析总时间、次数和字节；依赖升级走现有vendor一致性验证'
    elif role=='fixture' or '/fixtures/' in rep:
        disposition='fixture-test-only'; basis='测试数据/服务/生成fixture，非普通产品流转入口'; method='随调用它的场景测fixture准备/清理；不当独立业务基准'
    elif role=='test' or re.search(r'(test\.(mjs|js)|-scenarios)$',base):
        disposition='fixture-test-only'; basis='断言/回归入口；是否启动真实环境需沿callee区分'; method='隔离执行对应测试，区分mock/真实构建/外部资源'
    elif len(text.splitlines())<=20 and (re.search(r'\b(?:import|exec|spawnSync|require)\b',text)):
        disposition='wrapper-follow-callee'; basis='短包装/重导出入口；主要成本落在callee'; method='计入口启动开销并追踪实际callee，保留兼容入口'
    else:
        tests=[('P01',r'python3[\s\S]*?(?:jsonschema|validator)|(?:jsonschema|validator)[\s\S]*?python3|validateJsonSchema\('),('P02',r'parseContextContract\(|verifyContextSnapshot\('),('P03',r'queryLifecycleContext\(|planTemplateVerification\(|loadVerificationProfiles\('),('P04',r'treeHash\(|syncSkills\('),('P09',r'(?:treeDigest|openBackendDelivery|openBundle|verifyFrontendDelivery)\('),('P10',r'run_scaffold_verification|run_first_slice_verification'),('P11',r'acquireTemplateCommit|AbortSignal\.timeout|fetchCandidate\(')]
        ids=[id for id,pattern in tests if re.search(pattern,text)]
        if ids: disposition='candidate-caller'; basis='命中候选函数/调用链；可能含字符串/注释，非独立瓶颈证明'; method='沿实际调用链归因，见候选设计；不要据regex删除检查'
        elif meta.get('static_flags',{}).get('network') or re.search(r'\b(?:curl|wget)\s+|\b(?:fetch|urlopen)\(',text):
            disposition='external-runtime-needs-input'; basis='可能外部访问/更新入口，需具体参数与本地注入fixture'; method='本轮不触发真实外部动作；区分cache/timeout与服务耗时'
        else: disposition='static-no-confirmed-hotspot'
    if not ids and disposition=='static-no-confirmed-hotspot':
        manual=[
            (r'(frontend-delivery-boundary|technical-design-boundary)', 'candidate-caller', 'P09', '已核对spawn边界固定60秒timeout；每次实际验包/技术设计，不缓存调用方verified标记'),
            (r'(instantiate-harness|sync-strategic-handoff-tools)', 'candidate-caller', 'P06', '已核对枚举/同步；strategic同步会比较字节再写，已具无变化快路'),
            (r'verify-strategic-handoff-distribution', 'candidate-caller', 'P05', '已核对该三旧CLI初始化已Promise.allSettled并行，不能再次建议开启并行'),
            (r'strategic-handoff-zip', 'candidate-caller', 'P09', 'Python ZIP打包遍历属于交接包链，需包规模fixture'),
            (r'scenario-checks|git-submodule-fixtures', 'fixture-test-only', '', '测试检查/合成Git仓工具，按实际回归场景测量，不独立产品基准'),
            (r'archify/scripts/(render-examples|yss-safe-deliver)', 'external-runtime-needs-input', '', '已核对调用独立renderers/archify入口；需要具体IR与输出fixture，不能从shell标记推断瓶颈'),
            (r'cli-core/io\.mjs', 'candidate-caller', 'P08', '已核对逐级safe/lstat与文件digest；按bundle/init实际调用次数测量'),
            (r'yss-mvc-scaffold-generator/scripts/(verify_project|lib/runtime)', 'static-no-confirmed-hotspot', '', '已核对这里是文件/Git状态验证，不执行真实Maven；不要因spawn误归依赖下载'),
            (r'llm-wiki/scripts/(extract|inventory|advise|lint-wikilinks)', 'static-no-confirmed-hotspot', '', '已核对本地manifest/wiki读取与hash，非默认Plan流转；按wiki页面/文件规模再采样'),
            (r'maintenance-candidate|prepare-maintenance-review|evidence-index', 'static-no-confirmed-hotspot', '', '维护冻结/证据路径；大diff或候选包需RSS规模测量，非日常产品流程优先项')
        ]
        for pattern,dis,id,reason in manual:
            if re.search(pattern,rep):
                disposition=dis; ids=[id] if id else [];basis=reason;method='只读源码抽样核对；隔离真实输入计时；若关联候选则采用其验证设计';break
    results.append({'sha256':g['sha256'],'representative_path':rep,'active_script_group':any(x['origin']=='scripts' for x in active),'active_closure_group':any(x['origin']=='closure' for x in active),'active_copy_count':len(active),'all_copy_count':len(g['copies']),'disposition':disposition,'candidate_ids':','.join(ids),'basis':basis,'measurement_method':method,'authority':'unknown-unless-candidate-explicitly-establishes-source','source_metadata_role':role,'static_flags':json.dumps(meta.get('static_flags',{}),ensure_ascii=False),'review_depth':'manual-candidate-or-automatic-classification-not-function-level-proof'})
with (OUT/'implementation-assessments.csv').open('w') as f:
    w=csv.DictWriter(f,fieldnames=list(results[0]));w.writeheader();w.writerows(results)
summary={'unique_active_code_groups':len(results),'unique_active_scripts_groups':sum(x['active_script_group'] for x in results),'unique_closure_only_groups':sum(not x['active_script_group'] for x in results),'classification_counts':dict(Counter(x['disposition'] for x in results)),'method':'Every active SHA group receives a disposition; direct candidate refs manually read, remaining rows heuristic classification. No claim of function-level exhaustive optimization proof.','unresolved_call_edges':'见 inventory/summary.json，词法闭包不是完整语义调用图'}
(OUT/'coverage-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
assert summary['unique_active_scripts_groups']==320, summary
print(json.dumps(summary,ensure_ascii=False))
