// Sequential same-candidate comparison; never enables production allowlist by itself.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadVerificationProfiles,planTemplateVerification,ROOT} from '../../lib/template-verification.mjs';
import {runGroups} from '../../lib/template-verification-runner.mjs';
import {verificationInputDigest} from '../../lib/verification-report.mjs';
import {selectionBindings} from '../../lib/verification-selection.mjs';
const controller=new AbortController(),interrupt=()=>controller.abort();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
const dir=process.argv[2],runs=Number(process.argv[3]||3);if(!dir||runs<3||!Number.isInteger(runs))throw Error('measure-selection.mjs <new output directory> [runs>=3]');
fs.mkdirSync(dir);const config=loadVerificationProfiles(),before=verificationInputDigest(ROOT);
const report={kind:'verification-selection-comparison',status:'running',scope:'limited synthetic yss-research document impact',changed_files:['.agents/skills/yss-research/SKILL.md'],input_sha256:before,node:process.version,platform:`${process.platform}/${process.arch}`,load_average:os.loadavg(),cache_condition:'same working candidate; uncontrolled OS cache; alternating order',runs,bindings:selectionBindings(ROOT,config),samples:[],activation:'shadow',negative_cases_passed:null,related_failures_omitted:null};
const save=()=>fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(report,null,2)+'\n');save();
try{const plan=planTemplateVerification({changedFiles:report.changed_files,selection:'shadow',config});
 for(let run=0;run<runs;run++)for(const strategy of run%2?['candidate','baseline']:['baseline','candidate']){
  const candidate={...plan,commands:plan.selection[strategy]},start=performance.now();
  const results=await runGroups(candidate,'template-source',1,{cwd:ROOT,signal:controller.signal,logRoot:path.join(dir,`${run}-${strategy}`)});
  report.samples.push({run,strategy,wall_ms:performance.now()-start,unique_commands:results.flatMap(g=>g.results).filter(x=>!x.reused).length,results});save();if(controller.signal.aborted)throw Error("measurement interrupted");
 }
 if(verificationInputDigest(ROOT)!==before)throw Error('comparison inputs changed');
 report.status=report.samples.every(s=>s.results.every(g=>g.results.every(r=>r.code===0)))?'passed':'failed';
 const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];report.medians=Object.fromEntries(['baseline','candidate'].map(s=>[s,median(report.samples.filter(x=>x.strategy===s).map(x=>x.wall_ms))]));
 report.activation='shadow';report.reason='需要独立的负例与相关失败遗漏核对，以及当前来源绑定的 qualification；本测量不自动批准启用';
}catch(error){report.status=controller.signal.aborted?'interrupted':'failed';report.error=error.message;}finally{process.off("SIGINT",interrupt);process.off("SIGTERM",interrupt);save();if(report.status!=='passed')process.exitCode=1;}
