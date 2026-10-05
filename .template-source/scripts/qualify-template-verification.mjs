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
import {qualificationBindings,qualificationRunEvidence,validateQualification,qualificationPerformance,collectQualificationCounterexamples,QUALIFICATION_ROUTE_REGISTRY} from './lib/verification-qualification.mjs';
import {validateBaseline} from './lib/verification-baseline.mjs';
import {validateBaselineReport} from './lib/verification-report-validator.mjs';
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

/** The root may wrap each side with real all-four release integration; timings include the callback. */
export async function runQualification({root=ROOT,config=loadVerificationProfiles(),output,base,baselineReport,baselineReportDigest,baselineAssessment,baselineValidator=validateBaselineReport,representative,negativeCases=[],routeCases=[],runCount=5,executePairSide=executeQualificationSide,makePlans=makeQualificationPlans,scope='gates',bindings:providedBindings,signal,environment=process.env}={}) {
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
  const run=async(side,plans,directory,caseRoot=root,caseEnvironment=environment)=>{
    if(signal?.aborted)throw Error('qualification-interrupted');
    const start=performance.now();
    const result=await executePairSide({side,root:caseRoot,plan:plans[side],reportDir:directory,purpose:'qualification',concurrency:side==='legacy'?1:2,toolingMode:side==='legacy'?'legacy':'optimized',environment:caseEnvironment,signal});
    const evidence=qualificationRunEvidence(result,{directory:output,wallMs:performance.now()-start});
    if(result.integrationReportFile){const file=fs.realpathSync(result.integrationReportFile);evidence.integration={report_ref:path.relative(output,file),report_sha256:verificationHash(fs.readFileSync(file))};}
    return evidence;
  };
  try {
    const plans=makePlans({root,config,base,changedFiles:representative?.changed_files||[]});
    proof.representative_commit=plans.legacy.representative_commit;save();
    for(let index=0;index<runCount;index++) {
      const order=index%2?['candidate','legacy']:['legacy','candidate'],pair={pair_id:`pair.${index}`,scenario_id:representative?.id||'fixed-all-four-candidate',order};
      for(const side of order)pair[side]=await run(side,plans,path.join(output,`${pair.pair_id}-${side}`));
      proof.pairs.push(pair);save();
      if(pair.legacy.actual_close.code!==0||pair.candidate.actual_close.code!==0)throw Error('qualification-pair-execution-failed');
      if(verificationInputDigest(root)!==originalInput)throw Error('qualification-input-drift');
    }
    const registeredRoutes=scope==='gates'?QUALIFICATION_ROUTE_REGISTRY:routeCases;
    for(const [index,caseInput]of registeredRoutes.entries()) {
      let actual,error=null;
      try {const planned=planTemplateVerification({root,config,base,profile:'release',changedFiles:caseInput.changed_files});actual={strategy:planned.strategy,task_ids:planned.shadow_commands.map(task=>task.task_id),gate_ids:planned.shadow_commands.flatMap(task=>task.gate_ids||[])};}
      catch(failure){error=failure.message;}
      const passed=caseInput.expected_error?Boolean(error?.includes(caseInput.expected_error)):!error&&(caseInput.expected_gate_ids||[]).every(id=>actual.gate_ids.includes(id));
      const relative=`route.${index}.json`,bytes=JSON.stringify({kind:'verification-route-observation',input:caseInput,actual,error,observed:true,passed},null,2)+'\n';fs.writeFileSync(path.join(output,relative),bytes);
      proof.route_cases.push({category:caseInput.category,observed:true,passed,evidence_ref:relative,evidence_sha256:verificationHash(bytes)});save();
      if(!passed)throw Error('qualification-route-rejected');
    }
    for(const [index,caseInput]of negativeCases.entries()) {
      const caseRoot=caseInput.root||root,plans=makePlans({root:caseRoot,config,base,changedFiles:caseInput.changed_files||[]});
      const environmentForCase={...environment,...caseInput.environment};
      for(const name of caseInput.unset_environment||[])delete environmentForCase[name];
      const row={id:caseInput.id,category:caseInput.category,covered_old_ids:caseInput.covered_old_ids,expected_gate_ids:caseInput.expected_gate_ids};
      for(const side of ['legacy','candidate'])row[side]=await run(side,plans,path.join(output,`negative.${index}-${side}`),caseRoot,environmentForCase);
      proof.negative_cases.push(row);save();
      if(row.legacy.actual_close.code===0||row.candidate.actual_close.code===0)throw Error('qualification-negative-escaped');
    }
    if(scope==='gates'){proof.counterexamples=collectQualificationCounterexamples({root,directory:output});save();}
    proof.performance=qualificationPerformance(proof.pairs.map(pair=>pair.legacy.wall_ms),proof.pairs.map(pair=>pair.candidate.wall_ms));
    proof.status='passed';save();
    const validation=validateQualification({root,config,reportFile,expectedDigest:verificationHash(fs.readFileSync(reportFile)),expectedBindings:bindings,scope});
    if(!validation.valid){proof.status='failed';proof.errors=validation.reasons;save();}
  }catch(error){proof.status=signal?.aborted?'interrupted':'failed';proof.errors=[error.message];save();}
  return {status:proof.status,reportFile,proof};
}

async function main() {
  const {values}=parseArgs({options:{help:{type:'boolean'},root:{type:'string',default:ROOT},base:{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},cases:{type:'string'},output:{type:'string'},runs:{type:'string',default:'5'}},strict:true});
  if(values.help){process.stdout.write('qualify-template-verification.mjs --root <fixed checkout> --base <40 SHA> --baseline-report <absolute release report> --baseline-report-sha256 <64 SHA> --cases <case corpus JSON> --output <new external directory> [--runs 5]\nExperimental evidence only; paired timing includes actual all-four package/install/migration integration.\n');return;}
  if(!/^[a-f0-9]{40}$/.test(values.base||'')||!values.cases)throw Error('qualification requires a full base SHA and an explicit case corpus');
  const cases=JSON.parse(fs.readFileSync(values.cases,'utf8')),root=fs.realpathSync(values.root),config=loadVerificationProfiles(fs.readFileSync(path.join(root,'.template-source/process/template-verification-profiles.yaml'),'utf8'));
  const result=await runQualification({root,config,base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],output:values.output,runCount:Number(values.runs),representative:cases.representative,negativeCases:cases.negative_cases,routeCases:cases.route_cases});
  process.stdout.write(JSON.stringify({status:result.status,reportFile:result.reportFile})+'\n');if(result.status!=='passed')process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
