#!/usr/bin/env node
// Runs existing synthetic lifecycle fixtures; never records real approval input bodies.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const {values}=parseArgs({options:{output:{type:'string'}},strict:true});
if(!values.output)throw Error('用法: node .template-source/scripts/diagnose-python-schema.mjs --output <仓库外新目录>');
const requested=path.resolve(values.output),output=path.join(fs.realpathSync(path.dirname(requested)),path.basename(requested));
if(output===root||output.startsWith(root+path.sep)||fs.existsSync(output))throw Error('输出必须为仓库外的新目录');
const fixture=path.join(root,'.template-source/scripts/lib/schema-diagnostic-fixture.mjs');
const sourceRefs=['.template-source/scripts/diagnose-python-schema.mjs','.template-source/scripts/lib/schema-diagnostic-fixture.mjs','.template-source/scripts/lib/python-schema-probe.mjs','scripts/fixtures/slice-contract-v3/pilot-fixture.mjs','scripts/fixtures/delivery-preflight/approved-execution-fixture.mjs','scripts/lib/slice-execution-preflight.mjs','scripts/lib/slice-contract.mjs','scripts/lib/approved-execution-context.mjs','scripts/lib/json-schema.mjs','scripts/lib/validation-phase.mjs'];
const sourceBindings=()=>Object.fromEntries(sourceRefs.map(ref=>[ref,createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex')]));
const initialSources=sourceBindings();
fs.mkdirSync(output);
const runs=[];
try {
for(const mode of ['baseline','trace']){
 const started_at=new Date().toISOString(),start=performance.now(),args=[fixture,'--mode',mode],r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,env:{...process.env,NODE_OPTIONS:'',PYTHONDONTWRITEBYTECODE:'1'}});
 fs.writeFileSync(path.join(output,mode+'.stdout'),r.stdout||'');fs.writeFileSync(path.join(output,mode+'.stderr'),r.stderr||'');
 runs.push({mode,command:[process.execPath,...args],cwd:root,started_at,finished_at:new Date().toISOString(),exit_code:r.status,wall_ms:performance.now()-start,...(r.signal?{signal:r.signal}:{})});
 if(r.error||r.status!==0)throw Error(`诊断 fixture 失败，保留日志；不能当作通过: ${r.error?.message||r.stderr||r.status}`);
}
const baseline=JSON.parse(fs.readFileSync(path.join(output,'baseline.stdout'))),traced=JSON.parse(fs.readFileSync(path.join(output,'trace.stdout')));
if(JSON.stringify(baseline.outcomes)!==JSON.stringify(traced.outcomes))throw Error('插桩改变了返回值或阻断信号');
if(!traced.trace.batches.length||traced.trace.batches.some(x=>x.diagnostic_error||x.operation_id==='unscoped'))throw Error('诊断记录缺失或未绑定公开调用，不生成成功报告');
if(JSON.stringify(initialSources)!==JSON.stringify(sourceBindings()))throw Error('诊断过程中源码变化，不生成成功报告');
const report={schema_version:1,kind:'python-schema-diagnostic-run',source_bindings:initialSources,environment:{node:process.version,platform:process.platform,arch:process.arch},runs,outcomes_equal:true,baseline_scenario_wall_ms:baseline.scenario_wall_ms,...traced,limitations:['Synthetic current Slice v3 mechanism fixture only; no real user approval or project end-to-end coverage','Instrumentation timings and standalone Python measurements are separate from performance baselines','Child wall time includes synthetic setup; compare baseline scenario_wall_ms separately']};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:path.join(output,'report.json'),outcomes_equal:true,batches:report.trace.batches.length,groups:report.trace.groups},null,2));
} catch(error) {
 fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({schema_version:1,kind:'python-schema-diagnostic-failure',source_bindings:initialSources,runs,error:error.message},null,2)+'\n');
 throw error;
}
