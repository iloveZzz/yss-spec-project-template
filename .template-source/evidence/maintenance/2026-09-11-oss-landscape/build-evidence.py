import json,pathlib,copy
b=pathlib.Path(__file__).parent
D='2026-09-11'
evidence=[];searches=[]
for name in ['spec-frameworks','agent-workflows','platforms']:
 d=json.loads((b/'agents'/f'{name}.json').read_text())
 for n,s in enumerate(d['search_log'],1):
  if 'query_or_corpus' in s:q=s['query_or_corpus']
  else:q='; '.join(s.get('queries',[])) or json.dumps(s,ensure_ascii=False)
  searches.append({'id':f'search-{name}-{n}','channel':s.get('channel',s.get('platform','public-web')),'query_or_corpus':q,'searched_at':D,'result':s.get('result') if s.get('result') in ['results-found','none-found','access-failed','excluded'] else 'results-found','detail':s})
 for e in d.get('evidence_items',d.get('evidence',[])):
  level=e.get('source_level',e.get('source_class','primary'))
  if level not in ['primary','direct-experience','near-primary','secondary','lead-only']:level='primary'
  lim=e.get('limitations',e.get('limitation',[]));lim=[lim] if isinstance(lim,str) else lim
  evidence.append({'id':e['id'],'source_level':level,'visibility':e.get('visibility','public'),'source_class':e.get('source_class') if 'source_level' in e else ('issue-or-discussion' if level in ['direct-experience','near-primary'] else 'official-docs-or-source'),'source_ref':e.get('source_ref',e.get('url')),'locator':e['locator'],'stance':'support','observed_at':e.get('observed_at',e.get('accessed_at',D)),'evidence_date':e.get('evidence_date',e.get('published_at')),'observation':e['observation'],'limitations':lim,'contributor_record':f'agents/{name}.json#{e["id"]}'})
def ev(id,ref,loc,obs,lim,visibility='public',level='primary'):
 evidence.append(dict(id=id,source_level=level,visibility=visibility,source_class='source-or-docs',source_ref=ref,locator=loc,stance='support',observed_at=D,evidence_date=None,observation=obs,limitations=[lim]))
ev('evidence-yss','scripts/lib/backend-delivery.mjs','backendDeliveryBasis; verify functions lines 8-59; strategic-handoff.mjs 129-185, 227-260','本地交付检查绑定包摘要、批准、OpenAPI、切片合同和战略来源；当前源码有拒绝不匹配逻辑。','静态核查，未执行本轮完整跨仓交付；根源码摘要在local-source-manifest.json。','internal')
ev('evidence-yss-governance','AGENTS.md','sections 1-10; CONTEXT.md 流程术语; scripts/lib/context-reconciliation.mjs 13-32','当前治理合同区分身份、词汇对账、会签、实现合同、Fresh Verification及Git授权。','规则/源码存在不是不可旁路或用户收益证明。','internal')
ev('evidence-yss-supply','scripts/lib/skill-supply-chain.mjs','SOURCE_ROOT/PROJECTION_ROOTS; updateSkillLock; docs/agents/yss-skill-registry.yaml','本地以canonical和投影分离、锁哈希及注册表管理技能。','本轮不重测供应链与分发包，不把记录的来源能力当原创。','internal')
ev('evidence-doc-drift','docs/user-guide/用户手册.md','lines 12-13,40 versus 78,91; docs/process/template-engineering-overview.md lines31-37','手册列五家族且前后端支持attach/sync，后文却排除专职sync；工程说明仍称三产品。','证明说明不一致，不裁定外部CLI真实支持；不是本轮修复范围。','internal')
ev('evidence-yss-onboarding','docs/user-guide/用户手册.md','第一次让 Agent 工作; 已有项目接管与升级; 设备借用贯穿案例链接','已有只读检查提示词、贯穿案例及升级说明；CLI包快照与GitHub当前状态分别解释。','不能说没有文档或案例；未做新用户可用性实验。','internal')
ev('evidence-aidlc','https://github.com/awslabs/aidlc-workflows/blob/main/docs/harness-engineering/00-overview.md','The mental model; engine/conductor; sensors; source versus distribution','确定性engine决定下一指令，conductor执行；核心源生成各harness投影；sensors可 advisory或blocking。','滚动文档；未安装运行，不能推断所有旁路被阻断。')
ev('evidence-aidlc-doctor','https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/01-getting-started.md','configure project; doctor; Updating','doctor诊断runtime/project/provider/hook/trust/state；更新runtime与项目config分开；项目内容有ownership保护。','未实测诊断准确性或全部升级路线。')
ev('evidence-aidlc-profiles','https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/workflow-profiles.md','Quick chooser; express; enterprise','有Express/Bugfix/Feature/Enterprise等路由，阶段深度测试与review按任务裁剪。','较短路线以删除不适用决策面为条件；不能套给跨团队高风险工作。')
ev('evidence-ghaw','https://github.com/github/gh-aw','README: How Agentic Workflows work; Security and permissions','Markdown编译为Actions lock workflow，默认只读Agent job，配置写入由独立safe outputs步骤校验执行。','可配置安全边界，不能证明适配YSS语义或绝对安全。')
ev('evidence-ghaw-cross','https://github.github.com/gh-aw/patterns/spec-ops/','How SpecOps Works; Propagate Changes','SpecOps将规格变更传播至消费者仓，更新实现/测试并创建关联PR及追踪issue。','模式文档，不是本轮真实跨仓运行结果。')
ev('evidence-ghaw-cost','https://github.github.com/gh-aw/reference/cost-management/','Cost Components; Monitoring Costs; best-effort AIC note','模型推理和Actions费用分开；logs/audit导出时长、token、回合与成本估计；估计不保证等于账单。','不引用页面示例价格作当前YSS成本；未跑账单核对。')
ev('evidence-ghaw-otel','https://github.github.com/gh-aw/reference/open-telemetry/','OpenTelemetry overview','官方提供执行观测集成，供运行监控接入参考。','本轮不测试导出完整度或服务端配置。')
ev('evidence-ccsdd','https://github.com/gotalab/cc-sdd','README v3; What is new; Supported Agents','Agent Skills按任务隔离实现/审查，边界依赖标注、批量规格与可恢复执行；区分stable/beta适配；Kiro规格可移植。','文档合同，未运行；作者速度/效率宣传不采用。')
ev('evidence-speckitty','https://github.com/spec-kitty/spec-kitty','README; original Priivacy-ai/spec-kitty redirects here','当前项目公开展示工作包、看板/worktree和治理；原地址已跳转到新组织。','API访问403限流；只作有限深挖，未给API关注数或整体成熟度评分。')
ev('evidence-speckitty-governance','https://github.com/Priivacy-ai/spec-kitty/blob/main/docs/architecture/governed-profile-invocation.md','governed profile invocation; spec-kitty next','next按mission step解析action，把治理context渲染到prompt。','不等同于执行所有YSS门禁或安全隔离。')
ev('evidence-lock','https://github.com/luisalima/skills-lock','Why; Commands','manifest/commit/content lock/frozen install等确定性安装工具已存在。','极小关注量的设计参考；未运行、不证明生态采用。')
ev('evidence-skillock','https://github.com/skills-lock/skil-lock','What it actually does; License','记录shell/network/path能力面差异并生成PR审阅报告；主仓Apache-2.0。','未验证静态检测准确率；README自报统计不作市场结论。')
ev('evidence-metadata','github-metadata.json','18 requested repositories; source_url + observed_at per record','GitHub API保存了身份、归档、许可证及关注量快照；Spec Kitty条目403保留。','18为请求数，含旧仓/迁移，不是18个独立深研产品；star不是活跃用户；pushed_at不等于最新Release。','internal')
ev('evidence-scope','scope.md','研究范围和限制预声明','本轮没有竞品运行对照、客户访谈或账单数据；建议验证而不承诺效果。','证据边界，不是外部市场反证。','internal')
# Counter entries explicitly preserve the substantive counter-signal and its source.
index={e['id']:e for e in evidence}
for id in ['evidence-yss-onboarding','evidence-aidlc','evidence-aidlc-profiles','evidence-ghaw-cross','evidence-ghaw-cost','SK02','SK03','SK06','OS03','OS06','BM04','BM05','evidence-aw-04','evidence-aw-06','evidence-aw-10','evidence-aw-12','evidence-aw-16','evidence-platforms-002','evidence-platforms-003','evidence-platforms-006','evidence-platforms-009','evidence-platforms-010','evidence-lock','evidence-scope','evidence-doc-drift']:
 c=copy.deepcopy(index[id]);c['id']='counter-'+id;c['stance']='counter';evidence.append(c)
queries=[
 ('local','本地 yss-project.yaml CONTEXT.md README AGENTS 工程说明 用户手册; CodeGraph explore及对应脚本核查','results-found'),
 ('web-search','open source spec driven development github spec-kit OpenSpec BMAD method; open source agent workflow superpowers get shit done gsd spec driven development github','results-found'),
 ('web-open','https://www.google.com/search?q=open+source+spec+driven+development+github+spec-kit+OpenSpec+BMAD','access-failed'),
 ('Google browser','open source spec driven development framework GitHub','results-found'),
 ('web-search','site.github.com spec driven development cross-repo governance; site:github.com agent skills lock provenance update conflict workflow; site:github.com spec-kit approval extension; site:github.com cc-sdd spec-kitty','results-found'),
 ('web-search','site:github.com awslabs aidlc workflows; site:github.com spec-kitty cc-sdd spec driven development','results-found'),
 ('web-search','site:github.com/gotalab/cc-sdd cc-sdd; site:github.com/Priivacy-ai/spec-kitty spec kitty; AI 研发 规范驱动 开源 spec BMAD 中文 工作流','results-found'),
 ('GitHub API','github-metadata.json source_url for each requested repo','results-found'),
 ('GitHub API','https://api.github.com/repos/Priivacy-ai/spec-kitty ; anonymous rate limit 403','access-failed'),
 ('source exclusions','Google AI overview, sponsored links, aggregator comparisons; HumanLayer deprecated public code; old GSD historical repos','excluded'),
 ('web-open','https://github.github.com/gh-aw/reference/cost/ and /opentelemetry/; failed; followed observed navigation to cost-management/ and open-telemetry/','access-failed'),
 ('official direct open','AI-DLC engine,profiles,doctor; gh-aw README SpecOps Safe Outputs cost-management/open-telemetry; cc-sdd README guide; Spec Kitty README/governed invocation; skills-lock/SkilLock README','results-found'),
 ('owner revalidation','Spec Kit README/workflows; BMAD organization/customize; OpenSpec Stores and issue1436; OpenHands Canvas, persistence, enterprise; Aider git and issue5567; spec-kit discussion2046; Superpowers release6.3.0; GSD Core README','results-found')]
for n,(ch,q,r) in enumerate(queries,1):searches.append(dict(id=f'search-owner-{n:02}',channel=ch,query_or_corpus=q,searched_at=D,result=r))
claims=[]
def claim(id,kind,statement,refs,counters,partial=False):
 claims.append(dict(id='claim-'+id,claim_kind=kind,statement=statement,decision_bearing=kind!='background',evidence_refs=refs,counter_signal_refs=['counter-'+x for x in counters],audit_status='partially-supported' if partial else 'supported',confidence='medium' if partial else 'high',disposition='qualify' if partial else 'publish'))
claim('yss-baseline','technical-fact','YSS本地已有生命周期、批准/版本绑定与交付检查基础；仅确认规则和源码存在。',['evidence-yss','evidence-yss-governance','evidence-yss-supply'],['evidence-aidlc','evidence-scope'])
claim('doc-drift','technical-fact','本地产品线数量和专职attach/sync说明不一致，未据此裁定CLI运行行为。',['evidence-doc-drift'],['evidence-yss-onboarding'])
claim('speckit','technical-fact','Spec Kit具有可定制、可恢复、含人工检查点的工作流；不是仅四步提示词。',['SK02','SK07'],['SK03'])
claim('openspec','technical-fact','OpenSpec有delta与Stores beta共享规划；指南明确不按仓派任务或自动同步Git。',['OS02','OS03'],['OS06'])
claim('bmad','technical-fact','BMAD有组织会签、文档owner和团队/个人定制；不得称无治理。',['BM04','BM05'],['evidence-scope'])
claim('aidlc','technical-fact','AI-DLC提供确定性引擎、统一核心投影、profiles和doctor，与YSS多项重叠。',['evidence-aidlc','evidence-aidlc-doctor','evidence-aidlc-profiles'],['evidence-scope'])
claim('superpowers','technical-fact','Superpowers已有验证纪律、独立审查和任务裁剪；v6.3.0调整仪式及回路。',['evidence-aw-02','evidence-aw-03','evidence-aw-04'],['evidence-aw-06'])
claim('gsd','technical-fact','当前GSD Core有持久规划、机器状态与更新保护；旧仓为迁移线索。',['evidence-aw-07','evidence-aw-08','evidence-aw-09','evidence-aw-10','evidence-aw-11','evidence-aw-12'],['evidence-scope'])
claim('matt','technical-fact','Matt技能可组合且是本地部分技能上游；不能把其能力全算为YSS原创。',['evidence-aw-15','evidence-aw-18','evidence-yss-supply'],['evidence-aw-16'])
claim('ccsdd','technical-fact','cc-sdd提供任务边界、独立审查和恢复路线，并区分stable/beta适配。',['evidence-ccsdd'],['evidence-scope'])
claim('speckitty','technical-fact','Spec Kitty已有工作包/状态面/治理调用，属于有限深挖的相邻候选。',['evidence-speckitty','evidence-speckitty-governance'],['evidence-scope'])
claim('ghaw','technical-fact','gh-aw有编译工作流、默认只读及safe outputs，SpecOps支持跨仓传播模式。',['evidence-ghaw','evidence-ghaw-cross'],['evidence-scope'])
claim('openhands','technical-fact','OpenHands当前主仓为Agent Canvas；SDK持久化与企业治理包装要分别理解。',['evidence-platforms-001','evidence-platforms-003','evidence-platforms-006'],['evidence-platforms-002'])
claim('aider','technical-fact','Aider为终端执行相邻工具，默认Git行为可配置，接入YSS需重新绑定提交授权。',['evidence-platforms-008','evidence-platforms-017'],['evidence-platforms-009','evidence-platforms-010'])
claim('supply-chain','technical-fact','commit/hash锁和行为差异工具已有公开供给；小项目只提供设计线索。',['evidence-lock','evidence-skillock'],['BM05','evidence-aw-12'])
claim('release-boundary','background','抽样正式Release为SpecKit1.0.6/OpenSpec1.13.0/BMAD6.12.0，不保证main所有能力已进入包。',['SK05','OS07','BM08'],['evidence-scope'])
claim('competition-baseline','stage-decision-basis','Spec、审批、状态、恢复、多Agent、跨仓规划不能单独证明YSS差异；应比较交付边界及操作成本。',['SK02','OS03','BM04','evidence-aidlc','evidence-aw-10','evidence-yss'],['evidence-scope'])
claim('user-signals','user-problem','所选公开讨论显示跨仓描述、审阅成本、诊断相关需求信号；只支持试验，不支持发生率结论。',['OS04','SK06','evidence-platforms-014'],['evidence-aidlc-profiles','evidence-yss-onboarding'],True)
claim('opportunity-handoff','mvp','建议用一个真实跨仓切片验证版本化交付接收闭环；收益待测。',['evidence-yss','OS03','OS04'],['evidence-ghaw-cross','BM04'],True)
claim('opportunity-frontdoor','mvp','建议统一家族版本说明并派生状态/原因/下一动作入口；是否降低成本待测。',['evidence-doc-drift','evidence-aidlc-doctor','SK02'],['evidence-yss-onboarding'],True)
claim('opportunity-import','mvp','建议有需求时先验证固定版本OpenSpec只读导入，保留来源并重新确认批准。',['OS03','evidence-ccsdd','evidence-yss-governance'],['evidence-ghaw-cross'],True)
claim('opportunity-upgrade','mvp','建议在现有lock之上验证上游/适配冲突的可解释审阅，不先重造包管理器。',['evidence-yss-supply','evidence-lock','evidence-skillock'],['BM05','evidence-aw-12'],True)
claim('opportunity-eval','success-criterion','建议同模型预算下测验收、人工时间、错误接收、恢复及成本；具体目标阈值须试验前确认。',['evidence-scope','SK06','evidence-ghaw-cost'],['evidence-aw-06'],True)
claim('opportunity-runtime','mvp','建议已有真实使用者后只读接入执行指标并绑定切片；不自动继承外部批准。',['evidence-ghaw','evidence-ghaw-otel','evidence-platforms-004','evidence-platforms-005'],['evidence-platforms-006'],True)
claim('target-segment','stage-decision-basis','优先试点多仓且验收职责明确、与YSS Java/Vue能力吻合的团队；市场需求尚未验证。',['evidence-yss','OS04','evidence-yss-governance'],['SK06','evidence-aidlc-profiles'],True)
claim('cost-license','business-constraint','主仓开源许可与模型/执行/审阅成本分开；企业包装不能证明YSS付费意愿。',['evidence-metadata','evidence-platforms-007','evidence-platforms-012','evidence-ghaw-cost'],['evidence-platforms-006'],True)
claim('non-goals','non-goal','本研究建议暂不优先通用IDE/执行平台或无接入需求的新规格语法，先验证YSS匹配的交付工作。',['evidence-yss','evidence-ghaw','evidence-platforms-001'],['evidence-scope'],True)
claim('recommendation-limits','stage-decision-basis','机会推荐基于能力与有限信号；不构成最优、独占、效率或市场规模结论。',['evidence-scope','evidence-yss'],['evidence-aidlc','evidence-ghaw-cross','SK06'])
claim('current-identity','technical-fact','GSD旧仓与GSD2均迁移；HumanLayer公开实现标为deprecated，不能以旧索引代表当前维护。',['evidence-aw-07','evidence-aw-20','evidence-platforms-016'],['evidence-scope'])
root=dict(schema_version=1,profile='strategy-evidence',mode='evidence-audited',scope={'topic':'YSS相似开源研发框架与机会','audience':'模板维护者','time_horizon':'2026-09-11快照，未来1–2迭代试验','research_questions':['哪些能力已成为基线？','跨仓交付/使用体验/生态的机会与反证是什么？','怎样验证收益而非从功能推导需求？'],'inclusion_criteria':['有公开源码并与研发工作流或治理重叠','官方源支持能力；原始issue仅为带限制需求信号'],'exclusion_criteria':['通用Agent库作为直接竞品','GoogleAI概览/广告/二手榜单作为支持证据','旧归档实现冒充当前活跃产品']},ownership={'research_owner':'yss-research','downstream_owner':'yss-product-lifecycle','decision_ref':None},search_log=searches,evidence_items=evidence,claims=claims,source_gaps=['未安装竞品、未做性能/成本/公平任务实测。','无客户访谈、活跃使用数据、收入或付费意愿；机会部分支持仅限试验建议。','API Spec Kitty 403；网页已确认组织跳转，不补造元数据。','主分支/滚动文档与正式包可能不同；GSDCore源码使用main固定SHA而默认分支为next。','Google web open失败，浏览器搜索成功；AI概览与广告排除。','部分历史issue已关闭/版本已修复，不称现存缺陷。'],audit_summary={'status':'complete','audited_claim_ids':[c['id'] for c in claims],'notes':['主控复核决策关键一手源；探索代理报告不是独立审查批准。','supported用于有边界事实；partially-supported/qualify用于有事实依据而收益待测的建议。','审计完成指主张与来源对齐，不是产品测试或市场验证。','证据条目含额外背景来源；本报告只有claims明确列出的主张构成审计结论。']})
(b/'oss-landscape-evidence.yaml').write_text(json.dumps(root,ensure_ascii=False,indent=2)+'\n')
print(len(claims),'claims',len(evidence),'evidence',len(searches),'searches')
