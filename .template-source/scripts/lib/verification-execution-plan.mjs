import {contextExecution, contextBinary} from '../../../scripts/lib/native-context.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {compileDeliveryPreparationTasks} from './verification-delivery-run.mjs';
import {compileVerificationCheck} from './verification-gates.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;

// Frozen legacy commands retain their identity; only their observed execution
// and source locations move. Do not infer a replacement from a missing path.
const retiredScenarios = [
  'verify-business-language-scenarios', 'verify-context-contract-scenarios',
  'verify-context-reconciliation-scenarios', 'verify-delivery-preflight-scenarios',
  'verify-digital-human-roles-scenarios', 'verify-digital-human-task-package-scenarios',
  'verify-existing-backend-architecture-scenarios', 'verify-existing-ui-baseline-scenarios',
  'verify-frontend-delivery-scenarios', 'verify-frontend-implementation-evidence-scenarios',
  'verify-frontend-scaffold-generator-scenarios', 'verify-implementation-path-scenarios',
  'verify-lifecycle-context-query-scenarios', 'verify-lifecycle-operator-scenarios',
  'verify-lifecycle-scenarios', 'verify-lifecycle-transition-scenarios',
  'verify-maintenance-intensity-scenarios', 'verify-maintenance-review-workflow-scenarios',
  'verify-maintenance-risk-scenarios', 'verify-matt-yss-integration-scenarios',
  'verify-openapi-draft-validation-scenarios', 'verify-openapi-json-handoff-scenarios',
  'verify-openapi-yaml-first-scenarios', 'verify-plan-requirements-context-scenarios',
  'verify-plan-review-control-scenarios', 'verify-plan-spec-entry-scenarios',
  'verify-prototype-backend-scaffold-scenarios', 'verify-repository-scope-scenarios',
  'verify-scaffold-architecture-decision-scenarios', 'verify-scaffold-generator-scenarios',
  'verify-script-performance-scenarios', 'verify-strategic-context-import-scenarios',
  'verify-strategic-handoff-package-scenarios', 'verify-template-cache-scenarios',
  'verify-template-verification-scenarios', 'verify-user-decision-scenarios',
  'verify-yss-dto-openapi-scenarios', 'verify-yss-implementation-contract-compiler-scenarios',
  'verify-yss-prototype-contract-scenarios', 'verify-yss-ui-scenarios',
];
const retiredSources = new Map(retiredScenarios.map(name=>[`scripts/${name}`, `tests/scenarios/${name}.mjs`]));
if(new Set(retiredScenarios).size!==retiredScenarios.length)throw new TypeError('RETIRED_SCRIPT_SOURCE_DUPLICATE');
retiredSources.set('scripts/verify-context-contract','scripts/lib/native-context.mjs');
retiredSources.set('scripts/verify-scaffold-generator-scenarios','tests/scenarios/verify-scaffold-generator-scenarios.py');
retiredSources.set('scripts/verify-subagent-task-package-scenarios','tests/scenarios/verify-digital-human-task-package-scenarios.mjs');
retiredSources.set('scripts/node-verify-lifecycle-registry.mjs','scripts/verify-lifecycle-registry');
retiredSources.set('scripts/node-generate-lifecycle-artifacts.mjs','scripts/generate-lifecycle-artifacts');
retiredSources.set('scripts/verify-subagent-task-package','scripts/verify-digital-human-task-package');
retiredSources.set('scripts/instantiate-harness','tests/cli-retirement.test.mjs');
retiredSources.set('scripts/implementation-path-policy','scripts/lib/implementation-path-policy.mjs');
retiredSources.set('scripts/repository-scope-policy','scripts/lib/repository-scope-policy.mjs');
retiredSources.set('scripts/verify-prototype-design','.agents/skills/yss-prototype-stage/scripts/verify-prototype-design.mjs');
retiredSources.set('scripts/design-md','.agents/skills/yss-design-system/scripts/design-md.mjs');
retiredSources.set('scripts/lib/design-md.mjs','.agents/skills/yss-design-system/scripts/design-md.mjs');
retiredSources.set('.template-source/tooling/node/scripts/design-md.mjs','.agents/skills/yss-design-system/scripts/design-md.mjs');
retiredSources.set('scripts/sync-harness-upgrade','.template-source/scripts/sync-harness-upgrade.mjs');
retiredSources.set('scripts/lib/api-contract-decision.test.mjs','tests/api-contract-decision.test.mjs');
retiredSources.set('scripts/lib/legacy-backend-scaffold-audit.test.mjs','tests/legacy-backend-scaffold-audit.test.mjs');
const designMdAliases=new Set(['scripts/design-md','scripts/lib/design-md.mjs','.template-source/tooling/node/scripts/design-md.mjs']);
const sourceTargets=new Map();
for(const [source,target]of retiredSources) {
  const previous=sourceTargets.get(target);
  if(previous&&!(target==='.agents/skills/yss-design-system/scripts/design-md.mjs'&&[previous,source].every(ref=>designMdAliases.has(ref)))&&!(target==='tests/scenarios/verify-digital-human-task-package-scenarios.mjs'&&[previous,source].every(ref=>['scripts/verify-digital-human-task-package-scenarios','scripts/verify-subagent-task-package-scenarios'].includes(ref))))throw new TypeError(`RETIRED_SCRIPT_TARGET_DUPLICATE: ${target}`);
  sourceTargets.set(target,source);
}
export function resolveVerificationSource(ref) {
  if(retiredSources.has(ref))return retiredSources.get(ref);
  if(/^scripts\/verify-[^/]+-scenarios$/.test(ref))throw new TypeError(`RETIRED_SCRIPT_MAPPING_MISSING: ${ref}`);
  return ref;
}
export function verificationSourceIdentities(ref) {
  const historical=[...retiredSources].filter(([source,target])=>source!==ref&&target===ref).map(([source])=>source);
  // Relocation preserves the original impact boundary. Existing public entries
  // and independent test suites still retain their own current-path rules.
  return historical.length&&ref.startsWith('tests/scenarios/')?historical:[ref,...historical];
}
export function assertVerificationSources(plan,root) {
  const missing=[];
  for(const ref of plan.required_files||[]) {
    if(retiredSources.has(ref))observedRetiredTarget(root,ref);
    else if(!fs.existsSync(path.join(root,resolveVerificationSource(ref))))missing.push(ref);
  }
  if(missing.length)throw new TypeError(`缺少模板必需文件: ${missing.join(', ')}`);
}
function observedRetiredTarget(root,ref) {
  const target=resolveVerificationSource(ref),file=path.resolve(root,target);
  if(!fs.existsSync(file))throw new TypeError(`RETIRED_SCRIPT_TARGET_MISSING: ${ref} -> ${target}`);
  const relative=path.relative(fs.realpathSync(root),fs.realpathSync(file));
  if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile()||relative.startsWith(`..${path.sep}`)||relative==='..'||path.isAbsolute(relative))throw new TypeError(`RETIRED_SCRIPT_TARGET_INVALID: ${ref}`);
  return file;
}
let pythonInterpreter;
function pythonExecution(task,root,file,args=[]) {
  if(!pythonInterpreter) {
    const result=spawnSync('python3',['-c','import sys; print(sys.executable)'],{encoding:'utf8'});
    if(result.status!==0||!path.isAbsolute(result.stdout.trim())||!fs.existsSync(result.stdout.trim()))throw new TypeError('RETIRED_SCRIPT_PYTHON_UNAVAILABLE');
    pythonInterpreter=fs.realpathSync(result.stdout.trim());
  }
  return {requested_command:task.command,file:pythonInterpreter,args:[file,...args],cwd:root,environment:{}};
}

function shellWords(command){
  const words=[];let word='',quoted=null,started=false;
  for(let index=0;index<command.length;index++){
    const char=command[index];
    if(quoted){if(char===quoted){quoted=null;continue;}if(char==='\\'&&quoted==='"'){if(++index===command.length)throw new TypeError('NODE_TEST_COMMAND_INVALID');word+=command[index];continue;}if(quoted==='"'&&(char==='$'||char==='`'))throw new TypeError('NODE_TEST_COMMAND_EXPANSION_REFUSED');word+=char;continue;}
    if(char==='"'||char==="'"){quoted=char;started=true;continue;}
    if(char==='\\'){if(++index===command.length)throw new TypeError('NODE_TEST_COMMAND_INVALID');word+=command[index];started=true;continue;}
    if(/\s/.test(char)){if(started){words.push(word);word='';started=false;}continue;}
    if(/[;$`|&<>]/.test(char))throw new TypeError('NODE_TEST_COMMAND_EXPANSION_REFUSED');
    word+=char;started=true;
  }
  if(quoted)throw new TypeError('NODE_TEST_COMMAND_INVALID');if(started)words.push(word);return words;
}
export function compileTaskExecution(task,{root,reportDir,sourceReceipt,fixedCommit}={}){
  const requested=task.command.trim();
  if(/^(?:node\s+)?scripts\/verify-context-contract(?:\s|$)/.test(requested)) {
    const words=shellWords(requested);if(words[0]==='node')words.shift();words.shift();
    const execution=contextExecution(root,words);
    return {requested_command:task.command,...execution,source_bindings:{mapping_sha256:hash(fs.readFileSync(path.join(root,'.template-source/scripts/lib/verification-execution-plan.mjs'))),target:'scripts/lib/native-context.mjs',target_sha256:hash(fs.readFileSync(observedRetiredTarget(root,'scripts/verify-context-contract')))}};
  }
  if(/^yss\s+context\s+check(?:\s|$)/.test(requested)) {
    const words=shellWords(requested),{binary,digest}=contextBinary();words.shift();
    return {requested_command:task.command,file:binary,args:words,cwd:root,environment:{},binary_sha256:digest,protocol:"context-envelope-v1",source_bindings:{mapping_sha256:hash(fs.readFileSync(path.join(root,'.template-source/scripts/lib/verification-execution-plan.mjs'))),target:'scripts/lib/native-context.mjs',target_sha256:hash(fs.readFileSync(observedRetiredTarget(root,'scripts/verify-context-contract')))}};
  }
  const retiredRequest=/^(?:node(?:\.exe)?|['"][^'"]*[\\/]node(?:\.exe)?['"]|\S*[\\/]node(?:\.exe)?)\s/.test(requested)
    ? null : /^scripts\/(?:verify-[^/\s]+-scenarios|verify-subagent-task-package|instantiate-harness|implementation-path-policy|repository-scope-policy|verify-prototype-design|design-md|sync-harness-upgrade)(?:\s|$)/.test(requested);
  if(retiredRequest) {
    const [ref,...args]=shellWords(requested);
    if(ref==='scripts/instantiate-harness')throw new TypeError('RETIRED_SCRIPT_REQUEST_UNSUPPORTED: instantiate-harness');
    const file=observedRetiredTarget(root,ref);
    return file.endsWith('.py')?pythonExecution(task,root,file,args):{requested_command:task.command,file:process.execPath,args:[file,...args],cwd:root,environment:{}};
  }
  if(!/^(?:node(?:\.exe)?|['"][^'"]*[\\/]node(?:\.exe)?['"]|\S*[\\/]node(?:\.exe)?)\s/.test(requested))return null;
  const words=shellWords(requested),binary=words.shift();
  if(!/^node(?:\.exe)?$/.test(path.basename(binary)))return null;
  // Map only actual script operands, never source text passed to -e.
  if(!words.includes('-e')&&!words.includes('--eval')&&!words.includes('--input-type=module')) {
    const refs=words.filter(word=>retiredSources.has(word)||/^scripts\/verify-[^/]+-scenarios$/.test(word));
    if(refs.length) {
      const mapped=words.map(word=>refs.includes(word)?observedRetiredTarget(root,word):word);
      const python=mapped.filter(word=>word.endsWith('.py'));
      if(python.length) {
        if(python.length!==1||mapped.length!==2||mapped[0]!=='--check')throw new TypeError('RETIRED_SCRIPT_PYTHON_REQUEST_UNSUPPORTED');
        const execution=pythonExecution(task,root,python[0]);
        execution.args=['-c','import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"), filename=sys.argv[1])',python[0]];
        return execution;
      }
      if(!words.includes('--test'))return {requested_command:task.command,file:process.execPath,args:mapped,cwd:root,environment:{}};
      words.splice(0,words.length,...mapped);
    }
  }
  if(!words.includes('--test'))return null;
  const args=[];
  for(let index=0;index<words.length;index++){
    const word=words[index];
    if(word==='--test-concurrency'){if(!/^[1-9]\d*$/.test(words[++index]||''))throw new TypeError('NODE_TEST_CONCURRENCY_INVALID');continue;}
    if(word.startsWith('--test-concurrency=')){if(!/^[1-9]\d*$/.test(word.slice('--test-concurrency='.length)))throw new TypeError('NODE_TEST_CONCURRENCY_INVALID');continue;}
    if(!word.startsWith('--')&&/[?*[]/.test(word)){const matches=fs.globSync(word,{cwd:root}).sort();if(!matches.length)throw new TypeError(`NODE_TEST_GLOB_EMPTY: ${word}`);args.push(...matches);}else args.push(word);
  }
  const test=args.indexOf('--test');args.splice(test+1,0,'--test-concurrency=1');
  const execution={requested_command:task.command,file:process.execPath,args,cwd:root,environment:{}};
  const retired=new Map([['legacy.001','content-identity.test.js'],['legacy.010','sync-fast-smoke.test.js']]);
  const old=retired.get(task.task_id);
  if(old){
    if(task.command!==`node --test submodules/create-yss-spec/tests/${old}`)throw new TypeError('RETIRED_CHECK_REQUEST_MISMATCH');
    execution.args=['--test','--test-concurrency=1',path.join(root,'tests/cli-retirement.test.mjs')];
  }
  return execution;
}

export function addVerificationExecutionTasks(plan,{root,repositoryMode='template-source',reference=false,checkpoints=[],taskPackages=[],purpose='verification',reportDir,fixedCommit}={}) {
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
  for(const task of plan.commands){const execution=compileTaskExecution(task,{root,reportDir,fixedCommit});if(execution)task.execution=execution;}
  for(const gate of plan.gates||[])if(gate.selected){const tasks=plan.commands.filter(task=>task.gate_ids?.includes(gate.id));gate.check_ids=[...new Set(tasks.map(task=>task.id))];gate.task_ids=tasks.map(task=>task.task_id||task.id);}
  return plan;
}
