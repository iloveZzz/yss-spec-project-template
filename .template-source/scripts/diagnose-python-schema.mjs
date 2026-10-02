#!/usr/bin/env node
// Runs existing synthetic lifecycle fixtures; never records real approval input bodies.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const {values}=parseArgs({options:{output:{type:'string'}},strict:true});
if(!values.output)throw Error('用法: node .template-source/scripts/diagnose-python-schema.mjs --output <仓库外新目录>');
const requested=path.resolve(values.output),output=path.join(fs.realpathSync(path.dirname(requested)),path.basename(requested));
if(output===root||output.startsWith(root+path.sep)||fs.existsSync(output))throw Error('输出必须为仓库外的新目录');
const source=fs.readFileSync(path.join(root,'scripts/verify-lifecycle-transition-scenarios'),'utf8');
const marker='const valid = validateTicketFormalization(validTicketState, options);';
if(source.split(marker).length!==2)throw Error('流转 fixture 边界已变化；先更新诊断适配器');
const prefix=source.slice(0,source.indexOf(marker)).replace(/from "\.\/([^"\n]+)"/g,(_,ref)=>`from ${JSON.stringify(pathToFileURL(path.join(root,'scripts',ref)).href)}`);
const probeUrl=pathToFileURL(path.join(root,'.template-source/scripts/lib/python-schema-probe.mjs')).href;
const suffix=`
import {installSchemaProbe} from ${JSON.stringify(probeUrl)};
const trace=process.argv[2]==='trace',probe=trace?installSchemaProbe({root:${JSON.stringify(root)}}):null;
const outcomes=[];
const call=(id,state,expected,entrypoint='validateNextRoute')=>{const invoke=()=>entrypoint==='validateTicketFormalization'?validateTicketFormalization(state,options):validateNextRoute('work-unit.implementation-repository-preparation','work-unit.ticket-decomposition',state,options);const r=probe?probe.withOperation({id,entrypoint},invoke):invoke();assert.equal(r.result,expected,id);outcomes.push({id,entrypoint,result:r.result,blocking_signals:r.blocking_signals||[]});};
try {
 call('valid-1',validTicketState,'allowed');call('valid-2',validTicketState,'allowed');
 call('ticket-formalization',validTicketState,'allowed','validateTicketFormalization');
 const missing=structuredClone(validTicketState);missing.implementation_repository_preparation.projects[0].design_prerequisites.api_contract_decision.ref='missing.json';call('missing-api',missing,'blocked');
 call('ticket-missing-api',missing,'blocked','validateTicketFormalization');
 const original=readFileSync(apiDecision.file);writeFileSync(apiDecision.file,JSON.stringify({...apiDecisionValue,reason:'changed after binding'}));
 try {call('changed-api',validTicketState,'blocked');}finally{writeFileSync(apiDecision.file,original);}
 call('restored-api',validTicketState,'allowed');
 const report={outcomes,...(probe?{trace:probe.report(),python_costs:probe.measurePython(5)}:{})};
 console.log(JSON.stringify(report));
}finally{probe?.close();}
`;
fs.mkdirSync(output);const fixture=path.join(output,'fixture.mjs');fs.writeFileSync(fixture,prefix+suffix);
const runs=[];
for(const mode of ['baseline','trace']){
 const start=performance.now(),r=spawnSync(process.execPath,[fixture,mode],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,env:{...process.env,NODE_OPTIONS:'',PYTHONDONTWRITEBYTECODE:'1'}});
 fs.writeFileSync(path.join(output,mode+'.stdout'),r.stdout||'');fs.writeFileSync(path.join(output,mode+'.stderr'),r.stderr||'');
 runs.push({mode,exit_code:r.status,wall_ms:performance.now()-start});
 if(r.error||r.status!==0){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({runs,error:r.error?.message||'fixture failed'},null,2));throw Error('诊断 fixture 失败，保留日志；不能当作通过');}
}
const baseline=JSON.parse(fs.readFileSync(path.join(output,'baseline.stdout'))),traced=JSON.parse(fs.readFileSync(path.join(output,'trace.stdout')));
if(JSON.stringify(baseline.outcomes)!==JSON.stringify(traced.outcomes))throw Error('插桩改变了返回值或阻断信号');
if(!traced.trace.batches.length||traced.trace.batches.some(x=>x.diagnostic_error||x.operation_id==='unscoped'))throw Error('诊断记录缺失或未绑定公开调用，不生成成功报告');
const sourceBindings=Object.fromEntries(['scripts/verify-lifecycle-transition-scenarios','.template-source/scripts/diagnose-python-schema.mjs','.template-source/scripts/lib/python-schema-probe.mjs','scripts/lib/json-schema.mjs'].map(ref=>[ref,createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex')]));
const report={schema_version:1,kind:'python-schema-diagnostic-run',source_bindings:sourceBindings,environment:{node:process.version,platform:process.platform,arch:process.arch},runs,outcomes_equal:true,...traced,limitations:['Synthetic lifecycle fixture only; no real user approval','Instrumentation timings are separate from performance baselines','Current fixture uses a legacy minimal Slice contract; no v3 coverage claim']};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:path.join(output,'report.json'),outcomes_equal:true,batches:report.trace.batches.length,groups:report.trace.groups},null,2));
