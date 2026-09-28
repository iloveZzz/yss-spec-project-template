"""Rebuild the research ledger from this run's recorded observations."""
import json
from pathlib import Path
base=Path(__file__).resolve().parent
date='2026-09-28'
head='79c405998388ee1b13e166377cdfc3bfaa9f0c14'
root='/Users/zhudaoming/Projects/yss-spec-project-template'
evidence=[]
def add(i,ref,loc,obs,limits=None,stance='support',public=False,kind='source-code'):
    evidence.append(dict(id='evidence-'+i,source_level='primary',visibility='public' if public else 'internal',source_class=kind,source_ref=ref,locator=loc,stance=stance,observed_at=date,observation=obs,limitations=limits or []))
def local(p):return root+'/'+p
skill='.agents/skills/llm-wiki/'
add('001',local(skill+'SKILL.md'),'L1-55; references/schema.md, writing.md','入口55行3419字节，模式拆分引用，live优先，查询只读，人工页保护；manifest与raw/wiki分层。',['协议存在不代表每次Agent执行符合协议。'])
add('002',local(skill+'scripts/inventory.mjs'),'L29-33, L55-74, L96-131','hashSources覆盖来源摘要、compiledAt与gitCommit；drift只比较live哈希，缺livePath归unchanged；只依据manifest标记humanOwned；只匹配直接sourceIds。')
add('003',local(skill+'scripts/lint-wikilinks.mjs'),'L62-74, L77-135','来源标题存在即可；校验部分manifest关系、raw存在与live哈希；未校验raw内容/编译输入、完整schema和路径包含关系。',['不是语义校验器，结论限定所读实现和反例。'])
add('004',local(skill+'references/query.md'),'L9-17','选页前核验全部来源，存在漂移时询问refresh；最多8篇；逐断言回读live；标题首段零命中可报告不覆盖。',['未运行真实Agent问答；不能推出实际延迟或token节省比例。'])
add('005',local(skill+'references/compile.md'),'L7-60, L64-75, L90-126','manifest依赖模型、derived recipe、删除源标注、refresh完成要求与rebuild规则。',['refresh删除源保留文章与lint无条件missing错误需一致化；未执行真实refresh。'])
add('006',str(base/'unit-tests.txt'),'18 tests, 18 pass, 0 fail','当前四个测试文件的18项测试执行通过。',['不是端到端Agent评测，不包含本次补充反例的保护断言。'],kind='test-execution')
add('007',str(base/'gap-results.json'),'findings[0..6]; reproduce-gaps.mjs','7个临时fixture复现hash掩盖旧内容、missing无法闭合、external未核验归unchanged、human标记遗漏、schema/空来源放行、raw越界放行、缺依赖时汇总不命中。',['只观察脚本输出；未证明真实Agent覆盖人工正文；传递依赖反例刻意使用不完整来源映射。'],kind='reproducible-experiment')
add('008',str(base/'current-wiki-status.json'),'sources/articles/status/liveBytes/statusMs','真实wiki16来源23文章，14来源漂移影响23文章；liveBytes=215108；一次warm status约5ms。',['单次本地观测不是规模benchmark；未修改或刷新真实wiki。'],kind='runtime-observation')
add('009',str(base/'github-activity.json'),'repos[].head/windows/latest/shallow/commitsWithin90Days','6仓完整默认分支HEAD可达历史，统一截止2026-09-28T03:02:28Z；nvk30天22/90天108提交；po4yka0/530；jack0/1；其余0/0。',['包含merge，作者时间可由Git作者控制，未审计所有分支/issue响应；提交数不是质量。'],kind='git-history')
nvk='https://github.com/nvk/llm-wiki/blob/1224fbcdf3827f4ba56d225a9e359f5e8a5594e5/'
po='https://github.com/po4yka/llm-wiki-skills/blob/fd1bf9be2e479a255dde047e45530543b7f2dac8/'
jack='https://github.com/jackwener/llm-wiki/blob/cd5466678341885fa29ca9e27fa9604c2e9c11c5/'
lewis='https://github.com/lewislulu/llm-wiki-skill/blob/d7751c0a2bb4c58d0808ccd6ddae2fdcc0de4824/'
add('010',nvk+'plugins/llm-wiki/skills/wiki-query/SKILL.md','L14-55','Query Lite规定只读、按索引选单主题、最小文件集、有界搜索及资料不是指令。',['是协议，未测真实运行收益；默认事实层是compiled wiki，与我方live-first不同。'],public=True,kind='skill-protocol')
add('011',nvk+'tests/budgets/token-budgets.json','L48-62','query相关资料和入口设3000/3200/3300bytes预算。',['bytes不是token；本次未运行上游预算测试。'],public=True,kind='test-configuration')
add('012',po+'skills/llm-wiki-eval/SKILL.md','L66-145','按检索、事实支持、质量、用途与成本分层评估；同模型对照，无基线不编造。',['方法协议不是收益实验结果。'],public=True,kind='skill-protocol')
add('013',po+'skills/llm-wiki-claim-anchors/SKILL.md','L38-75','高风险断言使用稳定claim/source锚点和支持类型，不伪造依据。',['增加锚点不等于来源支持断言。'],public=True,kind='skill-protocol')
add('014',po+'scripts/source-refresh-scan.mjs','L135-156, L232-257; docs/operations/refresh.md L26-34','离线检查stale_after、来源缺口、外部URL；生成待核验报告而非在线验证。',['过期阈值不是内容变化证据。'],public=True)
add('015',jack+'src/lib/search.ts','L3-37, L111-154; src/commands/search.ts L7-58','CJK tokenization、BM25与RRF有源码；可选DB9混合检索。',['未安装或执行上游；内存索引不是大规模持久索引。'],public=True)
add('016',lewis+'llm-wiki/references/audit-guide.md','L23-66, L95-127; audit-shared/src/anchor.ts L42-98','持久反馈含文件/行号/文本/上下文；accepted/partial/rejected/deferred处置；锚点匹配有实际实现。',['未运行上游；行范围内首个文本匹配不能当重复文本唯一性保证。'],public=True)
add('017','https://github.com/MinhMPA/llm-wiki/blob/42c8d032daa8e7716e4c6b947ef51cfae2e8422c/README.md','Add A Source; Link Sources For Obsidian Graphs; Manage A Wiki','source records及duplicate/superseded字段；关系渲染只改managed区；保存查询成果须显式确认。',['README协议范围，本次未验证其所有脚本；90天无提交。'],public=True,kind='first-party-documentation')
add('018','https://github.com/micuintus/llm-wiki/blob/62c7f0d92966285d9a4d29bb2a3aaead16a02974/llm-wiki/SKILL.md','L34-87','区分登记与编译，compile pending作为待完成状态；共享索引/日志串行汇总。',['纯Skill约定，不是可执行事务保证；90天无提交。'],public=True,kind='skill-protocol')
add('101',local(skill+'references/writing.md'),'Human-owned; Fact order; references/lint.md Agent checks','现有规范确实保护人工正文并要求live抽查；未按文档执行造成的缺口不能解释成所有Agent必然出错。',stance='counter',kind='skill-protocol')
add('102',str(base/'gap-results.json'),'all findings','18项旧测试通过与额外反例暴露缺口可以同时成立。',stance='counter',kind='reproducible-experiment')
add('103',str(base/'current-wiki-status.json'),'liveBytes/statusMs','现有语料215108字节且warm status约5ms，不能假定哈希是现实性能瓶颈。',stance='counter',kind='runtime-observation')
add('104',po+'scripts/validate-claim-anchors.mjs','L8-10, L180-202','上游锚点检查格式、重复和附近support标签，不判定语义蕴含。',stance='counter',public=True)
add('105',nvk+'plugins/llm-wiki/skills/wiki/references/compilation.md','L17-20, L54-60','编译协议使用ingested日期；不足以直接替代强摘要新鲜度。',stance='counter',public=True,kind='skill-protocol')
add('106',jack+'src/lib/sync.ts','L60-72','mtime相同直接unchanged，不能直接复用为严格内容校验。',stance='counter',public=True)
add('107',str(base/'github-activity.json'),'po4yka windows and latest; nvk windows','po4yka90天530提交只分布8个UTC日且30天无提交；nvk近30天22提交仅2个UTC日。',stance='counter',kind='git-history')
add('108',lewis+'audit-shared/src/anchor.ts','L83-98','行范围内使用首个indexOf匹配，不能保证重复文本定位唯一。',stance='counter',public=True)
claims=[]
def claim(n,text,support,counter):
 claims.append(dict(id=f'claim-{n:03}',claim_kind='technical-fact',statement=text,decision_bearing=True,evidence_refs=['evidence-'+s for s in support],counter_signal_refs=['evidence-'+c for c in counter],audit_status='supported',confidence='high',disposition='publish'))
claim(1,'现有Skill有轻量分层、只读query、live优先和人工保护规则；18项现有脚本测试本次通过，但不构成端到端问答质量证明。',['001','005','006'],['102'])
claim(2,'在隔离fixture中，live改变后只执行hashSources可令旧raw/旧文章同时通过status、lint和advise；没有编译输入绑定。',['002','003','007'],['101'])
claim(3,'保留缺失来源并在文章标注Outdated仍触发MANIFEST SOURCE MISSING；refresh的保留要求与lint0出口缺少一致的状态协议。',['003','005','007'],['101'])
claim(4,'无livePath的来源被drift归为unchanged，raw替换不导致相关漂移，未核验外源与当前来源没有被区分。',['002','007'],['101'])
claim(5,'只在frontmatter标human-owned时，drift不会把文章放入humanOwned；这是状态遗漏，未证明Agent实际覆盖正文。',['002','007'],['101'])
claim(6,'未知schemaVersion、重复source ID、空sourceIds和空来源小节的组合fixture被lint接受；rawPath越出wiki根的单独fixture也被接受。',['003','007'],['101'])
claim(7,'query在选页前检查全部来源并逐断言回读live；真实wiki14/16来源漂移影响23页。小规模warm status观测不证明哈希是性能瓶颈。',['004','008'],['103'])
claim(8,'drift依赖直接sourceIds且以完整live字节摘要触发；不完整来源映射的汇总页反例不会传递命中，需要校验依赖完整性。',['002','005','007'],['101'])
claim(9,'固定HEAD完整Git历史显示nvk有近30天维护，po4yka有近90天集中建设；jack低频，另三仓近90天无提交。',['009'],['107'])
claim(10,'nvk提供只读Query Lite与字节预算配置，可参考阅读范围和预算治理；本次未证明真实token或质量收益。',['010','011'],['105','103'])
claim(11,'po4yka提供基线对照评测、claim/source锚点、离线刷新报告协议和相应扫描/格式校验代码；不等于语义正确性或效果证明。',['012','013','014'],['104'])
claim(12,'jackwener有CJK/BM25/RRF检索源码，适合作为可选词法检索参考；其同步mtime优化不适合直接替代我方强摘要检查。',['015'],['106'])
claim(13,'lewislulu提供持久反馈及文本锚点实现，MinhMPA提供结构化来源记录协议，micuintus区分登记与待编译；这些是设计参照而非当前活跃或运行效果保证。',['016','017','018'],['108','107'])
searches=[
('001','local-memory-registry','rg llm-wiki|LLM wiki|wiki|competitive-intelligence|yss-research MEMORY.md; no relevant wiki history used','none-found'),
('002','CodeGraph + canonical filesystem','llm-wiki inventory/lint/advise/extract, matching tests, all references, registry/lock entry','results-found'),
('003','web search','github "llm-wiki" "SKILL.md"; github "llm wiki" Karpathy skill; site:github.com "llm-wiki" "SKILL.md" -site:reddit.com','results-found'),
('004','first-party web','Open GitHub nvk/jackwener/MinhMPA/po4yka and original Karpathy gist','results-found'),
('005','subagent GitHub REST and web commit pages','GET /repos/{owner}/{repo} returns403; commits/HEAD pages429; gh bad CPU type','access-failed'),
('006','public Git protocol','git ls-remote; clone --bare --filter=blob:none; full HEAD-reachable log for six repositories','results-found'),
('007','fixed-SHA first-party source','nvk Query Lite/budgets/compilation; jack search/sync; lewis audit/anchor; mic register/compile; po4 eval/anchors/source-refresh-scan; Minh README','results-found'),
('008','local test execution','node --test .agents/skills/llm-wiki/scripts/*.test.mjs','results-found'),
('009','isolated experiment','node .template-source/evidence/maintenance/2026-09-28-llm-wiki-research/reproduce-gaps.mjs','results-found'),
('010','local read-only runtime','inventory.drift against .template-source/wiki and raw/live copy digest comparison','results-found'),
('011','scope-excluded material','Reddit, skill aggregators, unsupported performance claims, broad repo scans that included archived candidate diffs','excluded'),
('012','path discovery','skills/wiki-refresh/SKILL.md absent in po4yka; continued using docs/operations/refresh.md and scripts/source-refresh-scan.mjs','none-found')]
data={'schema_version':1,'profile':'technical-evidence','mode':'evidence-audited','scope':{'topic':'本地llm-wiki可靠性、提效与GitHub技能比较','audience':'YSS模板维护者','time_horizon':'2026-09-28快照；Git活跃度近30/90天','research_questions':['哪些现有能力应保留？','哪些脚本缺口可复现？','哪些外部机制适合当前规模？','如何证明优化提升效率且不降低可信度？'],'inclusion_criteria':['canonical源码/协议/测试','公开第一方GitHub源码及完整默认分支历史','可重放隔离实验'],'exclusion_criteria':['聚合排名或stars替代活跃度','未验证性能宣称','安装/运行竞品或自动刷新实际wiki']},'ownership':{'research_owner':'yss-research','downstream_owner':'template-source维护者与maintaining-skills','decision_ref':None},'search_log':[{'id':'search-'+i,'channel':ch,'query_or_corpus':q,'searched_at':date,'result':r} for i,ch,q,r in searches],'evidence_items':evidence,'claims':claims,'source_gaps':['GitHub API限流；已由完整Git历史替代提交活跃度核验，未统计issue响应。','未运行真实LLM问答/编译，无法证明token、耗时或准确率收益。','未安装或执行竞品，源码和协议存在不等于端到端能力通过。','本地反例不是修复后的验收；传递依赖fixture刻意使用不完整sourceIds。'],'audit_summary':{'status':'complete','audited_claim_ids':[x['id'] for x in claims],'notes':['结论限定于观察范围；所有建议均未实现或批准。','主控独立复核subagent固定SHA源码关键结论及完整Git活动统计。','只有研究目录新增；技能、wiki、锁文件保持不变。']}}
(base/'llm-wiki-evidence.yaml').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'{len(claims)} claims, {len(evidence)} evidence items, {len(searches)} searches')
