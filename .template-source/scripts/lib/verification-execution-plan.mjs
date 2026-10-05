import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDeliveryPreparationTasks} from './verification-delivery-run.mjs';
import {compileVerificationCheck} from './verification-gates.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;

export function addVerificationExecutionTasks(plan,{root,repositoryMode='template-source',reference=false,checkpoints=[],taskPackages=[],purpose='verification',reportDir}={}) {
  plan=structuredClone(plan);plan.selection??={requested:'legacy',effective:'legacy',omitted:[]};plan.groups??=[...new Set(plan.commands.map(task=>task.group))];
  if(reference)plan.gates=[];
  plan.not_applicable??=[];
  plan.commands=plan.commands.filter(task=>{if(task.when&&task.when!==repositoryMode){plan.not_applicable.push({...task,reason:'repository-mode'});return false;}return true;});
  const append=item=>{if(!plan.commands.some(task=>task.task_id===item.task_id))plan.commands.push(item);};
  if(plan.effective_profile==='release'||plan.strategy==='qualified-gates') {
    const selected=(plan.syntax_files||[]);
    const extras=reference?[]:(plan.changed_files||[]).filter(ref=>fs.existsSync(path.join(root,ref))&&fs.statSync(path.join(root,ref)).isFile()).filter(ref=>/\.(mjs|cjs|js)$/.test(ref)||ref.startsWith('scripts/')&&!path.extname(ref)&&/^#!\s*(?:\S*\/)?(?:node(?:\.exe)?|env\s+(?:-S\s+)?node(?:\.exe)?)(?:\s|$)/.test(fs.readFileSync(path.join(root,ref),'utf8').split(/\r?\n/,1)[0]));
    const files=reference?selected:[...new Set([...selected,...extras])];
    files.forEach((file,index)=>{const suffix=hash(file).slice(0,16),id=`check.syntax.${suffix}`,taskId=`syntax.${suffix}`;append({id,task_id:reference?`${taskId}.${index}`:taskId,kind:'syntax',group:'postchecks',command:`${quote(process.execPath)} --check ${quote(file)}`,gate_ids:['check.verification-governance-syntax'],depends_on:[]});});
    const roots=['scripts','.template-source/scripts'].filter(ref=>fs.existsSync(path.join(root,ref)));
    const runtime=['ru','by'].join('');
    for(const [id,args] of [
      ['check.verification-post-legacy-runtime-call',['-n',`^#!.*${runtime}|\\b${runtime}\\b`,...roots,'--glob','!*.md']],
      ['check.verification-post-legacy-runtime-path',['--files',...roots,'--glob','*.rb']],
    ]) {
      const code=`const r=require('node:child_process').spawnSync('rg',${JSON.stringify(args)},{encoding:'utf8'});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exit(r.status===1?0:1);`;
      append({id,task_id:id.replace('check.verification-',''),kind:'postcheck',group:'postchecks',gate_ids:['check.verification-governance-syntax'],depends_on:[],command:`${quote(process.execPath)} -e ${quote(code)}`});
    }
  }
  if(!reference)for(const raw of plan.supplemental_checks||[]){
    const task={...compileVerificationCheck(raw,{group:'postchecks',profile:plan.requested_profile,gateIds:raw.gate_ids||['check.verification-final-integrity'],taskId:raw.task_id||raw.id}),kind:'postcheck',...(raw.source_requirement?{source_requirement:raw.source_requirement}:{})};
    if(task.when&&task.when!==repositoryMode){if(!plan.not_applicable.some(row=>row.task_id===task.task_id&&row.reason==='repository-mode'))plan.not_applicable.push({...task,reason:'repository-mode'});}else append(task);
  }
  for(const [kind,files,entry] of [['checkpoint',checkpoints,'scripts/verify-maintenance-checkpoint'],['task-package',taskPackages,'scripts/verify-digital-human-task-package']])for(const file of files){const suffix=hash(file).slice(0,16),id=`check.verification-post-${kind}.${suffix}`;append({id,task_id:`post.${kind}.${suffix}`,kind:'postcheck',group:'postchecks',gate_ids:['check.verification-final-integrity'],depends_on:[],command:`${quote(entry)} ${quote(file)}`});}
  append({id:'check.verification-post-git-diff-check',task_id:'post.git-diff-check',kind:'postcheck',group:'postchecks',gate_ids:['check.verification-final-integrity'],depends_on:[],command:'git diff --check'});
  if(!plan.groups.includes('postchecks'))plan.groups.push('postchecks');
  if(!plan.commands.some(task=>task.kind==='artifact-prepare')) {
    const preparation=compileDeliveryPreparationTasks(plan,{root,reportDir});
    if(preparation.tasks.length){const tasks=[...preparation.tasks,...preparation.cleanupTask?[preparation.cleanupTask]:[]];plan.commands.unshift(...preparation.tasks);if(preparation.cleanupTask)append(preparation.cleanupTask);if(!plan.groups.includes('artifact-preparation'))plan.groups.unshift('artifact-preparation');if(preparation.cleanupTask&&!plan.groups.includes('cleanup'))plan.groups.push('cleanup');for(const gate of plan.gates||[]){const related=tasks.filter(task=>task.gate_ids.includes(gate.id));if(related.length){gate.selected=true;gate.selection_reason='four-family-release-preparation';gate.check_ids=[...new Set([...(gate.check_ids||[]),...related.map(task=>task.id)])];gate.task_ids=[...new Set([...(gate.task_ids||[]),...related.map(task=>task.task_id)])];}}}
  }
  if(!plan.commands.some(task=>task.task_id==='check.verification-environment')) {
    const preflightPlan={source_requirement:plan.source_requirement,commands:plan.commands.map(task=>({command:task.command}))};
    const command=`${quote(process.execPath)} ${quote(path.join(root,'.template-source/scripts/lib/verification-preflight.mjs'))} --root ${quote(root)} --purpose ${quote(purpose)} --plan-json ${quote(JSON.stringify(preflightPlan))}`;
    plan.commands.unshift({id:'check.verification-environment',task_id:'check.verification-environment',kind:'preflight',group:'preflight',command,gate_ids:['check.verification-environment'],depends_on:[]});
    plan.groups.unshift('preflight');
    for(const task of plan.commands.filter(task=>task.kind!=='preflight'))task.depends_on=[...new Set(['check.verification-environment',...(task.depends_on||[])])];
    const gate=plan.gates?.find(gate=>gate.id==='check.verification-environment');if(gate){gate.selected=true;gate.selection_reason='mandatory-preflight';gate.check_ids=['check.verification-environment'];gate.task_ids=['check.verification-environment'];}
  }
  for(const gate of plan.gates||[])if(gate.selected){const tasks=plan.commands.filter(task=>task.gate_ids?.includes(gate.id));gate.check_ids=[...new Set(tasks.map(task=>task.id))];gate.task_ids=tasks.map(task=>task.task_id||task.id);}
  return plan;
}
