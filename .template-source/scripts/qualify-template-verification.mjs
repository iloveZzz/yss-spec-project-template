#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {loadVerificationProfiles,planTemplateVerification} from '../../scripts/lib/template-verification.mjs';
import {verificationInputDigest} from '../../scripts/lib/verification-report.mjs';
import {loadLegacyManifest,verificationPolicyDigest,verificationHash} from './lib/verification-gates.mjs';
import {compileLegacyPlan} from './lib/legacy-verification.mjs';
import {executeVerificationPlan} from './lib/template-verification-worker.mjs';
import {qualificationBindings,qualificationRunEvidence,validateQualification,qualificationPerformance,collectQualificationCounterexamples,QUALIFICATION_ROUTE_REGISTRY,measureQualificationRun,validateQualificationSideEvidence} from './lib/verification-qualification.mjs';
import {validateBaseline} from './lib/verification-baseline.mjs';
import {validateBaselineReport,validateQualificationIntegration} from './lib/verification-report-validator.mjs';
import {assembleQualificationIntegration} from './lib/verification-delivery-run.mjs';
import {compileQualificationPlans} from './lib/verification-qualification-plan.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function completeChangedFiles(root,base,additional=[]) {
  const files=new Set(additional),collect=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(r.stderr||'qualification-diff-failed');r.stdout.split('\0').filter(Boolean).forEach(file=>files.add(file));};
  if(base)collect(['diff','--name-only','-z','--no-renames',`${base}...HEAD`]);
  for(const args of [['diff','--name-only','-z','--no-renames'],['diff','--cached','--name-only','-z','--no-renames'],['ls-files','-z','--others','--exclude-standard']])collect(args);
  return [...files].sort();
}
export function makeQualificationPlans({root=ROOT,config=loadVerificationProfiles(),base,changedFiles=[]}) {
  const changed=completeChangedFiles(root,base,changedFiles);
  const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});if(commit.status!==0)throw Error('qualification-representative-commit-unobserved');
  return compileQualificationPlans({root,config,changedFiles:changed,commit:commit.stdout.trim()});
}

export async function executeQualificationSide(options) {
  const result=await executeVerificationPlan(options);
  if(result.observed&&result.code===0) {
    const integration=assembleQualificationIntegration({root:options.root,directory:options.reportDir});
    return {...result,integrationReportFile:integration.file};
  }
  return result;
}
const interruption=()=>Object.assign(new Error('qualification-interrupted'),{code:'QUALIFICATION_INTERRUPTED'});
const interruptedOutcome=(result,signal)=>signal?.aborted||result.code===130||result.report?.status==='interrupted'||['SIGINT','SIGTERM'].includes(result.signal);

/** The main process owns a persistent signal, even between worker lifetimes. */
export async function runQualificationWithSignals(options) {
  const controller=new AbortController(),abort=name=>{if(!controller.signal.aborted)controller.abort(name);};
  const onInt=()=>abort('SIGINT'),onTerm=()=>abort('SIGTERM'),onExternal=()=>abort(options.signal.reason||'external-abort');
  process.on('SIGINT',onInt);process.on('SIGTERM',onTerm);options.signal?.addEventListener('abort',onExternal,{once:true});
  if(options.signal?.aborted)onExternal();
  try {return await runQualification({...options,signal:controller.signal});}
  finally {process.off('SIGINT',onInt);process.off('SIGTERM',onTerm);options.signal?.removeEventListener('abort',onExternal);}
}

/** The root may wrap each side with real all-four release integration; timings include the callback. */
export async function runQualification({root=ROOT,config=loadVerificationProfiles(),output,base,baselineReport,baselineReportDigest,baselineAssessment,baselineValidator=validateBaselineReport,representative,negativeCases=[],routeCases=[],runCount=5,executePairSide=executeQualificationSide,makePlans=makeQualificationPlans,scope='gates',bindings:providedBindings,signal,environment=process.env,counterexampleTimeoutMs=120000}={}) {
  if(!Number.isInteger(runCount)||runCount<5)throw Error('qualification requires at least five paired runs');
  if(scope==='gates'&&negativeCases.length)throw Error('qualification-unregistered-negative-case: use the fixed public-seam counterexample corpus');
  if(scope==='gates'&&routeCases.length&&JSON.stringify(routeCases)!==JSON.stringify(QUALIFICATION_ROUTE_REGISTRY))throw Error('qualification-route-unregistered');
  const baseline=scope==='gates'?validateBaseline({root,base,baselineReport,baselineReportDigest,assessment:baselineAssessment,validator:baselineAssessment?undefined:baselineValidator,policyDigest:verificationPolicyDigest(config)}):null;
  if(baseline&&!baseline.valid)throw Error(`qualification-bootstrap-baseline-invalid:${baseline.reasons.join(',')}`);
  if(!output||!path.isAbsolute(output)||fs.existsSync(output))throw Error('qualification-output-must-be-new-external-directory');
  const parent=fs.realpathSync(path.dirname(output)),canonicalRoot=fs.realpathSync(root);
  if(parent===canonicalRoot||parent.startsWith(canonicalRoot+path.sep))throw Error('qualification-output-must-be-external');
  fs.mkdirSync(output);output=fs.realpathSync(output);
  const frozen=scope==='gates'?loadLegacyManifest(root):null;
  const bindings=providedBindings||qualificationBindings({root,config,policyDigest:verificationPolicyDigest(config),legacyManifestDigest:frozen?.coverage_digest});
  const originalInput=verificationInputDigest(root);
  const proof={schema_version:1,kind:'template-verification-qualification',scope,status:'running',bindings,baseline:baseline?.bindings,
    ...(scope==='gates'?{baseline_report_ref:fs.realpathSync(baselineReport),baseline_report_sha256:baselineReportDigest}:{}),
    representative_changed_files:[...new Set(representative?.changed_files||[])].sort(),
    input_sha256:originalInput,pairs:[],route_cases:[],negative_cases:[],performance:null,activation:'experimental-only'};
  const reportFile=path.join(output,'qualification.json'),save=()=>fs.writeFileSync(reportFile,JSON.stringify(proof,null,2)+'\n');save();
  const interruptCheckpoint=async()=>{await new Promise(resolve=>setImmediate(resolve));if(signal?.aborted)throw interruption();};
  const run=async(side,plans,directory,caseRoot=root,caseEnvironment=environment,onEvidence=()=>{})=>{
    if(signal?.aborted)throw interruption();
    let evidence;
    const measured=await measureQualificationRun({directory:output,reference:`${path.basename(directory)}.measurement.json`,execute:async()=>{
      const result=await executePairSide({side,root:caseRoot,plan:plans[side],reportDir:directory,purpose:'qualification',concurrency:side==='legacy'?1:2,toolingMode:side==='legacy'?'legacy':'optimized',environment:caseEnvironment,signal});
      evidence=qualificationRunEvidence(result,{directory:output,diagnostic:!result.observed||result.code!==0||interruptedOutcome(result,signal)});
      onEvidence(evidence);
      if(scope==='gates'&&result.observed&&result.code===0) {
        const reportFile=fs.realpathSync(result.reportFile),report=JSON.parse(fs.readFileSync(reportFile));
        validateQualificationSideEvidence({root:caseRoot,config,proof,report,reportDirectory:path.dirname(reportFile),side,observedExitCode:result.code});
        if(!result.integrationReportFile)throw Error('qualification-all-four-release-missing');
        const integrationFile=fs.realpathSync(result.integrationReportFile),checked=validateQualificationIntegration({root:caseRoot,reportFile:integrationFile,expectedDigest:verificationHash(fs.readFileSync(integrationFile)),expectedCommit:proof.representative_commit});
        if(!checked.valid)throw Error(`qualification-all-four-release-invalid:${checked.reasons.join(',')}`);
      }
      if(result.integrationReportFile){const file=fs.realpathSync(result.integrationReportFile);evidence.integration={report_ref:path.relative(output,file),report_sha256:verificationHash(fs.readFileSync(file))};}
      return result;
    }});
    evidence.wall_ms=measured.wall_ms;
    evidence.measurement=measured.measurement;
    return {evidence,result:measured.result};
  };
  try {
    const plans=makePlans({root,config,base,changedFiles:representative?.changed_files||[]});
    proof.representative_commit=plans.legacy.representative_commit;save();
    for(let index=0;index<runCount;index++) {
      await interruptCheckpoint();
      const order=index%2?['candidate','legacy']:['legacy','candidate'],pair={pair_id:`pair.${index}`,scenario_id:representative?.id||'fixed-all-four-candidate',order,status:'running',unexecuted_sides:[...order]};
      proof.active_pair=pair;save();
      for(const side of order) {
        await interruptCheckpoint();
        pair.active_side=side;save();
        const observed=await run(side,plans,path.join(output,`${pair.pair_id}-${side}`),root,environment,evidence=>{pair[side]=evidence;save();});
        pair[side]=observed.evidence;pair.unexecuted_sides=order.filter(name=>!pair[name]);delete pair.active_side;save();
        if(interruptedOutcome(observed.result,signal))throw interruption();
        if(!observed.result.observed||observed.result.code!==0||observed.result.signal)throw Error('qualification-pair-execution-failed');
      }
      pair.status='passed';proof.pairs.push(pair);delete proof.active_pair;save();
      if(verificationInputDigest(root)!==originalInput)throw Error('qualification-input-drift');
    }
    const registeredRoutes=scope==='gates'?QUALIFICATION_ROUTE_REGISTRY:routeCases;
    for(const [index,caseInput]of registeredRoutes.entries()) {
      await interruptCheckpoint();
      let actual,error=null;
      try {const planned=planTemplateVerification({root,config,base,profile:'release',changedFiles:caseInput.changed_files});actual={strategy:planned.strategy,task_ids:planned.shadow_commands.map(task=>task.task_id),gate_ids:planned.shadow_commands.flatMap(task=>task.gate_ids||[])};}
      catch(failure){error=failure.message;}
      const passed=caseInput.expected_error?Boolean(error?.includes(caseInput.expected_error)):!error&&(caseInput.expected_gate_ids||[]).every(id=>actual.gate_ids.includes(id));
      const relative=`route.${index}.json`,bytes=JSON.stringify({kind:'verification-route-observation',input:caseInput,actual,error,observed:true,passed},null,2)+'\n';fs.writeFileSync(path.join(output,relative),bytes);
      proof.route_cases.push({category:caseInput.category,observed:true,passed,evidence_ref:relative,evidence_sha256:verificationHash(bytes)});save();
      if(!passed)throw Error('qualification-route-rejected');
    }
    for(const [index,caseInput]of negativeCases.entries()) {
      await interruptCheckpoint();
      const caseRoot=caseInput.root||root,plans=makePlans({root:caseRoot,config,base,changedFiles:caseInput.changed_files||[]});
      const environmentForCase={...environment,...caseInput.environment};
      for(const name of caseInput.unset_environment||[])delete environmentForCase[name];
      const row={id:caseInput.id,category:caseInput.category,covered_old_ids:caseInput.covered_old_ids,expected_gate_ids:caseInput.expected_gate_ids};
      for(const side of ['legacy','candidate']){await interruptCheckpoint();const observed=await run(side,plans,path.join(output,`negative.${index}-${side}`),caseRoot,environmentForCase);row[side]=observed.evidence;if(interruptedOutcome(observed.result,signal))throw interruption();}
      proof.negative_cases.push(row);save();
      if(row.legacy.actual_close.code===0||row.candidate.actual_close.code===0)throw Error('qualification-negative-escaped');
    }
    await interruptCheckpoint();
    if(scope==='gates') {
      proof.counterexamples=await collectQualificationCounterexamples({root,directory:output,signal,timeoutMs:counterexampleTimeoutMs,
        onProgress:corpus=>{proof.counterexamples=corpus;save();}});
      // Retain the actual active/partial corpus before propagating any failure.
      save();
      if(proof.counterexamples.status==='interrupted'||signal?.aborted)throw interruption();
      if(proof.counterexamples.status!=='passed')throw Error(proof.counterexamples.error||'qualification-counterexamples-failed');
    }
    await interruptCheckpoint();
    if(verificationInputDigest(root)!==originalInput)throw Error('qualification-input-drift');
    proof.performance=qualificationPerformance(proof.pairs.map(pair=>pair.legacy.wall_ms),proof.pairs.map(pair=>pair.candidate.wall_ms));
    proof.status='passed';save();
    const validation=validateQualification({root,config,reportFile,expectedDigest:verificationHash(fs.readFileSync(reportFile)),expectedBindings:bindings,scope});
    if(!validation.valid){proof.status='failed';proof.errors=validation.reasons;save();}
    else {await interruptCheckpoint();if(verificationInputDigest(root)!==originalInput)throw Error('qualification-input-drift');}
  }catch(error){proof.status=signal?.aborted||error.code==='QUALIFICATION_INTERRUPTED'?'interrupted':'failed';proof.errors=[error.message];
    if(proof.active_pair){proof.active_pair.status=proof.status;proof.active_pair.unexecuted_sides=proof.active_pair.order.filter(side=>!proof.active_pair[side]);proof.active_pair.stop_reason=error.message;}
    if(signal?.aborted)proof.interruption_reason=String(signal.reason||'aborted');save();}
  return {status:proof.status,reportFile,proof};
}

async function main() {
  const {values}=parseArgs({options:{help:{type:'boolean'},root:{type:'string',default:ROOT},base:{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},cases:{type:'string'},output:{type:'string'},runs:{type:'string',default:'5'}},strict:true});
  if(values.help){process.stdout.write('qualify-template-verification.mjs --root <fixed checkout> --base <40 SHA> --baseline-report <absolute release report> --baseline-report-sha256 <64 SHA> --cases <case corpus JSON> --output <new external directory> [--runs 5]\nExperimental evidence only; paired timing includes actual all-four package/install/migration integration.\n');return;}
  if(!/^[a-f0-9]{40}$/.test(values.base||'')||!values.cases)throw Error('qualification requires a full base SHA and an explicit case corpus');
  const cases=JSON.parse(fs.readFileSync(values.cases,'utf8')),root=fs.realpathSync(values.root),config=loadVerificationProfiles(fs.readFileSync(path.join(root,'.template-source/process/template-verification-profiles.yaml'),'utf8'));
  const result=await runQualificationWithSignals({root,config,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],output:values.output,runCount:Number(values.runs),representative:cases.representative,negativeCases:cases.negative_cases,routeCases:cases.route_cases});
  process.stdout.write(JSON.stringify({status:result.status,reportFile:result.reportFile})+'\n');if(result.status!=='passed')process.exitCode=result.status==='interrupted'?130:1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
