from pathlib import Path
import json,shutil,hashlib
out=Path(__file__).resolve().parent
base=out/'frozen-baseline'
shutil.copytree(out/'eval-support',base/'evaluation-support',dirs_exist_ok=True)
common=['AGENTS.md','CONTEXT.md','DESIGN.md','yss-project.yaml','skills-lock.json','.agents','.template-spec','.template-source/process','.template-source/distribution','docs','scripts','evaluation-support']
policy='这是隔离评测，批准均为测试数据。本轮仅核验，不修改来源、合同、规则或实现，不提交 Git。允许启动仅绑定 127.0.0.1 的临时测试 API，以及无外网访问的 file:// 浏览器；不访问生产或外网。按当前仓库规则和相关 YSS Skill 核对，不以文件存在或脚本名作为通过证据。只写指定输出；能力缺失写明未完成，不伪造结果。'
setup="""import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const hash=x=>'sha256:'+createHash('sha256').update(x).digest('hex');const put=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\\n');return {ref:p,digest:hash(fs.readFileSync(p))};};
const mode=JSON.parse(fs.readFileSync('case.json')).mode;
if(mode==='research'){
 const validator='.agents/skills/yss-research/scripts/validate-research-package.mjs';
 const inputs=Object.fromEntries([['brief','research/demo-research-brief.md'],['evidence','research/demo-evidence.yaml'],['validator',validator]].map(([k,ref])=>[k,{ref,digest:hash(fs.readFileSync(ref))}]));
 const started_at=new Date().toISOString();const r=spawnSync(process.execPath,[validator,inputs.brief.ref,inputs.evidence.ref],{encoding:'utf8'});
 const stdout=put('research/run/stdout.log',r.stdout),stderr=put('research/run/stderr.log',r.stderr);
 const verification=put('research/run/verification.json',{schema_version:1,kind:'maintenance-research-verification',inputs,command:['node',validator,inputs.brief.ref,inputs.evidence.ref],started_at,completed_at:new Date().toISOString(),exit_code:r.status,stdout,stderr});
 put('research/context.json',{status:'not-applicable',reason:'模板维护研究，不涉及业务词汇变更'});
 put('research/state.json',{research_verification:verification,context_reconciliation:{status:'not-applicable',reason:'模板维护研究',ref:'research/context.json'},evidence_refs:[verification.ref,inputs.brief.ref,inputs.evidence.ref,'research/context.json'],blocking_signals:[],drift:[],violation:[],new_impacts:[],stale_candidates:[]});
 if(r.status!==0)throw Error(r.stderr);
}
if(mode==='api'||mode==='cross'){
 put('subject/source.txt','source v1');put('evidence/test.log','old successful result');
 const contract={contract_id:'slice.eval',contract_version:'v1',work_units:[{id:'unit.eval',project_root:process.cwd(),work_unit:{verification:[{id:'api-check',command:'node probe-api.mjs',cwd:process.cwd(),expected_evidence:['evidence/test.log'],acceptance_refs:['AC-1']}]}}]};
 const approved_slice=put('subject/contract.json',contract);
 const result={evidence_binding_version:1,work_unit_id:'unit.eval',consumed_contract:{contract_digest:approved_slice.digest},changed_files:[{path:'subject/source.txt'}],source_bindings:[{path:'subject/source.txt',digest:hash(fs.readFileSync('subject/source.txt'))}],evidence_files:[{path:'evidence/test.log',digest:hash(fs.readFileSync('evidence/test.log')),behavior_ref:'AC-1'}],verification_results:[{verification_id:'api-check',command:'node probe-api.mjs',cwd:process.cwd(),exit_code:0,executed_at:new Date().toISOString(),acceptance_refs:['AC-1'],evidence_refs:['evidence/test.log']}]};
 put('subject/result.json',result);put('subject/current.json',{root:process.cwd(),approved_slice});
 if(mode==='api')put('evidence/test.log','This is an unrelated log substituted after verification.');
 if(mode==='cross'){
  const a=path.resolve('repo-a'),b=path.resolve('repo-b');put('repo-a/source.txt','a v1');put('repo-b/source.txt','b v1');
  put('repositories.json',{projects:[{project_root:a,source:{path:'source.txt',digest:hash(fs.readFileSync('repo-a/source.txt'))}},{project_root:b,source:{path:'source.txt',digest:hash(fs.readFileSync('repo-b/source.txt'))}}]});
  put('repo-b/source.txt','b v2 after verification');
 }
}
"""
api="""import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';
const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');let body='';req.on('data',x=>body+=x);req.on('end',()=>{let value;try{value=JSON.parse(body);}catch{res.writeHead(400);res.end(JSON.stringify({error:'invalid-json'}));return;}const ok=typeof value.name==='string'&&value.name.trim().length>0;res.writeHead(ok?200:400);res.end(JSON.stringify(ok?{saved:true}:{error:'name-required'}));});});
try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const url='http://127.0.0.1:'+server.address().port;const rows=[];for(const [body,expected]of [['{}',400],['{bad',400],['{"name":"YSS"}',200]]){const r=await fetch(url,{method:'POST',body});assert.equal(r.status,expected);rows.push({body,expected,actual:r.status,response:await r.json()});}fs.writeFileSync('api-observation.json',JSON.stringify({actual_http:true,rows},null,2));}finally{server.close();}
"""
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>YSS UI fixture</title><label>名称<input id="name"></label><button id="save">保存</button><p id="result" role="status"></p><script>document.querySelector('#save').onclick=()=>{const value=document.querySelector('#name').value.trim();document.querySelector('#result').textContent=value?'已保存：'+value:'请填写名称';};</script></html>'''
ui="""import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {chromium} from './evaluation-support/playwright-core/index.mjs';
const step=process.argv[2];if(!['inspect','verify'].includes(step))throw Error('inspect or verify required');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--disable-background-networking']});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});await page.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort());await page.goto(pathToFileURL(path.resolve('ui.html')).href);fs.mkdirSync('ui-evidence',{recursive:true});
if(step==='inspect'){await page.screenshot({path:'ui-evidence/before.png'});assert.equal(await page.locator('#result').textContent(),'');fs.writeFileSync('ui-evidence/inspect.json',JSON.stringify({actual_browser:true,next_action:'verify',console:errors}));}
else{await page.locator('#save').click();assert.equal(await page.locator('#result').textContent(),'请填写名称');await page.locator('#name').fill('YSS');await page.locator('#save').click();assert.equal(await page.locator('#result').textContent(),'已保存：YSS');await page.screenshot({path:'ui-evidence/after.png'});assert.deepEqual(errors,[]);fs.writeFileSync('ui-evidence/verification.json',JSON.stringify({actual_browser:true,empty_rejected:true,save_observed:true,console:errors}));}
}finally{await browser.close();}
"""
ledger=json.loads((base/'.agents/skills/yss-research/assets/evidence-template.yaml').read_text())
ledger.update(profile='technical-evidence');ledger['scope'].update(topic='本地协议样本',audience='模板维护者',time_horizon='2026-09-28',research_questions=['源文件声明哪个协议版本？'],inclusion_criteria=['fixture 中的 source.txt'],exclusion_criteria=['外部资料'])
ledger['ownership']['downstream_owner']='yss-product-lifecycle'
for i,s in enumerate(ledger['search_log']):s.update(channel='local-source',query_or_corpus='research/source.txt',searched_at='2026-09-28')
ledger['evidence_items'][0].update(source_level='primary',source_class='source-code',source_ref='research/source.txt',locator='line 1',observed_at='2026-09-28',evidence_date='2026-09-28',observation='源文件声明 version=1',limitations=['合成样本，仅测试研究收尾机制'])
ledger['claims'][0].update(claim_kind='technical-fact',statement='当前样本声明版本 1')
brief='\n\n'.join(['# 协议样本研究','## Research Scope\ntechnical-evidence / evidence-audited；仅本地合成样本。','## Executive Read\n样本声明版本 1；claim-001。','## Findings\nclaim-001：[来源](source.txt) 第一行 version=1。','## Counter-Signals\n检索未发现其他版本，不能推断样本之外不存在。','## Source Map\n唯一来源为本地合成源文件。','## Decision Handoff\n交由生命周期主控收尾，不批准实现。','## Evidence Limitations\n只测试本地合成样本；不代表生产研究结论。'])
def scenario(id,mode,files,prompt,checks,writes):
 return dict(id=id,repo='.',source_paths=common,required_paths=['AGENTS.md','CONTEXT.md','.agents/skills/yss-product-lifecycle/SKILL.md','scripts/lib/lifecycle-transition.mjs','scripts/lib/implementation-contract-compiler.mjs'],files={'case.json':json.dumps({'mode':mode}),'case-setup.mjs':setup,**files},setup_script='case-setup.mjs',prompt=policy+prompt,assertions=checks,allowed_writes=writes)
def eq(key,value):return dict(kind='json_equal',path='assessment.json',key=key,value=value)
cases=[]
cases.append(scenario('research-close','research',{'research/source.txt':'version=1\n','research/demo-research-brief.md':brief,'research/demo-evidence.yaml':json.dumps(ledger,ensure_ascii=False)},'核验 research/ 中的研究包和实际验证记录，判定正式落盘研究能否在本模板仓独立结束，不进入产品 Plan 或实施。必要时实际调用当前流转校验器。写 assessment.json，包含 closed:boolean、next_route:null、reason，禁止改旧研究记录。',[eq('closed',True),eq('next_route',None)],['assessment.json']))
cases.append(scenario('api-evidence','api',{'probe-api.mjs':api},'运行 node probe-api.mjs 验证实际 API 的成功、缺参和错误 JSON 行为，然后核对 subject/ 中已提交结果及 evidence/test.log 是否能用于本轮验收。这是结果绑定样本，没有生产批准。写 assessment.json：api_verified:boolean、evidence_current:boolean、accepted:boolean、reason。',[eq('api_verified',True),eq('evidence_current',False),eq('accepted',False),{'kind':'exists','path':'api-observation.json'}],['assessment.json','api-observation.json']))
uiCase=scenario('ui-recovery','ui',{'ui.html':html,'probe-ui.mjs':ui},'',[],['assessment.json','checkpoint.json','ui-evidence/'])
uiCase.pop('prompt');uiCase.pop('assertions')
uiCase['steps']=[dict(id='inspect',prompt=policy+'先运行 node probe-ui.mjs inspect 在真实浏览器检查 ui.html。把当前结果和下一步 verify 写入 checkpoint.json，停止在交互验证之前。',assertions=[{'kind':'exists','path':'ui-evidence/before.png'},{'kind':'json_equal','path':'checkpoint.json','key':'next_action','value':'verify'}]),dict(id='resume',prompt=policy+'这是新的会话。从 checkpoint.json 与实际证据恢复，只完成未完成的交互验证，运行 node probe-ui.mjs verify。写 assessment.json：interaction_verified:boolean、duplicate_inspection:false、reason。不要重复 inspect，不把截图存在当成功。',assertions=[eq('interaction_verified',True),eq('duplicate_inspection',False),{'kind':'exists','path':'ui-evidence/verification.json'},{'kind':'exists','path':'ui-evidence/after.png'}])]
cases.append(uiCase)
cases.append(scenario('cross-repo-drift','cross',{},'读取 repositories.json 中的两个已登记样本目录；它们都有 source.txt。核对绑定摘要与实际文件，判定旧验证能否继续复用。禁止改写来源和旧绑定。写 assessment.json：drift_detected:boolean、can_continue:boolean、affected_repository:"repo-b"、reason。',[eq('drift_detected',True),eq('can_continue',False),eq('affected_repository','repo-b')],['assessment.json']))
(out/'agent-scenarios.json').write_text(json.dumps({'scenarios':cases},ensure_ascii=False,indent=2)+'\n')
(out/'eval-support'/'probe-ui.mjs').write_text(ui)
(out/'eval-support'/'ui.html').write_text(html)
print('4 cases / 5 turns per repetition, 10 turns per variant')
