import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseDocument } from '../vendor/yaml.mjs';
import { assertCheckpointBoundary } from './checkpoint-boundary.mjs';
import { safeFile, fileBinding, readDocument, digest, orchestrationRef } from './governance-io.mjs';

export const CI_CONFIG='.template-spec/process/project-ci.yaml';
export const TRACKER='.template-spec/agents/issue-tracker.md';
export function parseGovernance(bytes, ref) {
  const source=String(bytes), yaml=ref.endsWith('.md')?source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]:source;
  if(yaml===undefined)return null;
  const doc=parseDocument(yaml,{uniqueKeys:true,maxAliasCount:0});
  if(doc.errors.length)throw new Error(`${ref}: ${doc.errors[0].message}`);
  return doc.toJS({maxAliasCount:0});
}
export function governanceScope(root) {
  const identity=readDocument(root,'yss-project.yaml');
  if(identity?.schema_version!==1||identity.repository_mode!=='project-instance')throw new Error('project-ci 仅适用于 project-instance');
  const tracker=parseGovernance(fs.readFileSync(safeFile(root,TRACKER)),TRACKER)?.tracker;
  if(!tracker||!['local-markdown','github','gitlab'].includes(tracker.platform)||typeof tracker.root!=='string')throw new Error('主 tracker 配置无效');
  const config=fileBinding(root,CI_CONFIG)?readDocument(root,CI_CONFIG):{schema_version:1,provider:'github',branch:'main',additional_paths:[]};
  if(config.schema_version!==1||config.provider!=='github'||!Array.isArray(config.additional_paths)||config.additional_paths.some(x=>typeof x!=='string'))throw new Error('project-ci 配置无效');
  const roots=[...new Set([tracker.root.replace(/\/$/,''),...config.additional_paths])].sort();
  roots.forEach(ref=>safeFile(root,ref));
  return {roots,config,trackerRoot:tracker.root.replace(/\/$/,'')};
}
export function governanceFiles(root, roots) {
  const result=[];
  const visit=ref=>{
    const full=safeFile(root,ref);
    if(!fs.existsSync(full))return;
    const st=fs.lstatSync(full);
    if(st.isDirectory()) for(const name of fs.readdirSync(full).sort())visit(`${ref}/${name}`);
    else if(st.isFile())result.push(ref);
    else throw new Error(`治理范围含不支持的文件: ${ref}`);
  };
  roots.forEach(visit);return [...new Set(result)].sort();
}
const checkpoint=(value,ref)=>/(?:^|\/)checkpoint\.(?:yaml|yml|json)$/.test(ref)||Boolean(value?.repository_mode&&value?.stage&&value?.gates);
const claimed=value=>Boolean(value&&typeof value==='object'&&(['approved','completed','ready-for-agent','running','paused-human-gate'].includes(value.status)||['active','paused','failed','resolved'].includes(value.workflow_status)||value.result==='completed'||value.decision==='approved'||Object.values(value.gates||{}).some(x=>x?.status==='approved')||Object.values(value.artifacts||{}).some(x=>x?.status==='approved')));
const identityRefs=new Set(['term_refs','skill_refs','principal_ref','drafter_principal_ref','requester_ref','responder_ref','runtime_instance_ref','original_ref','owner_ref']);
const fileReference=item=>typeof item==='string'&&!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(item)&&! /^(?:gate|artifact|work-unit|stage|evidence|check|skill|runtime|role)\.[a-z0-9-]+$/.test(item)&&/[./]/.test(item);
function references(value, found=new Set()) {
  if(Array.isArray(value))for(const item of value)references(item,found);
  else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)) {
    if(identityRefs.has(key))continue;
    if((key==='ref'||key.endsWith('_ref'))&&fileReference(item))found.add(item);
    else if((key.endsWith('_refs')||key==='inputs')&&Array.isArray(item))for(const ref of item)if(fileReference(ref))found.add(ref);
    if(item&&typeof item==='object')references(item,found);
  }
  return found;
}
function bindings(value, output=[]) {
  if(Array.isArray(value))for(const item of value)bindings(item,output);
  else if(value&&typeof value==='object') {
    if(typeof value.ref==='string'&&(value.digest||value.sha256))output.push([value.ref,value.digest||value.sha256]);
    for(const [key,item] of Object.entries(value)) {
      if(key.endsWith('_ref')&&typeof item==='string'&&value[key.replace(/_ref$/,'_digest')])output.push([item,value[key.replace(/_ref$/,'_digest')]]);
      if(item&&typeof item==='object')bindings(item,output);
    }
  }
  return output;
}

/** Fixed validators only. Checkpoint verification commands are data, never executable input. */
export function checkProjectGovernance({root,base,checkpointRef,taskRef,recovery=false}={}) {
  root=fs.realpathSync(root);
  const report={schema_version:1,kind:'project-governance-verification',read_only:true,execution_authorization:'not-evaluated',status:'passed',checks:[],diagnostics:[],inputs:[],scope:{roots:[],files:[],checkpoints:[],tasks:[],unrecognized:[],missing_capabilities:[]},base:base||null};
  const observed=new Map();
  const issue=(code,message,ref,exception=false)=>{report.diagnostics.push({code,message,source_ref:ref,recovery:'修复明确输入或证据后重新运行当前校验'});report.status=exception?'error':report.status==='error'?'error':'failed';};
  const observe=ref=>{const hash=fileBinding(root,ref);if(observed.has(ref)&&observed.get(ref)!==hash)throw new Error(`INPUT_DRIFT: ${ref}`);observed.set(ref,hash);return hash;};
  const read=ref=>{if(!observe(ref))throw new Error(`输入不可读: ${ref}`);return fs.readFileSync(safeFile(root,ref));};
  const run=(id,script,args,refs)=>{
    const requirements={
      'scripts/verify-lifecycle-checkpoint':['.template-spec/process/schemas/lifecycle-checkpoint.schema.json'],
      'scripts/verify-digital-human-task-package':['.template-spec/process/schemas/digital-human-task-package.schema.json','.template-spec/agents/digital-human-roles.yaml'],
      'scripts/verify-approval-record':['.template-spec/agents/digital-human-roles.yaml']
    };
    const missing=[script,...(requirements[script]||[])].filter(ref=>!observe(ref));
    if(missing.length){report.scope.missing_capabilities.push(...missing);report.checks.push({id,command:[process.execPath,script,...args],input_refs:refs,exit_code:null,status:'unavailable',missing});issue('capability-missing',`缺少适用校验能力 ${missing.join(', ')}，先显式安装对应阶段资产`,script,true);return;}
    const begin=performance.now(),result=spawnSync(process.execPath,[safeFile(root,script),...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000});
    const unavailable=result.error||result.status===null||result.status===2||/ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ModuleNotFoundError/.test(result.stderr||'');
    report.checks.push({id,command:[process.execPath,script,...args],input_refs:refs,exit_code:result.status,duration_ms:Math.round(performance.now()-begin),stdout:result.stdout||'',stderr:result.stderr||result.error?.message||'',status:result.status===0?'passed':'failed'});
    if(result.status!==0)issue(unavailable?'capability-unavailable':'validation-failed',`${id}: ${result.error?.message||result.stderr||result.stdout}`,refs[0],Boolean(unavailable));
  };
  try {
    for(const ref of ['yss-project.yaml',TRACKER,CI_CONFIG,'CONTEXT.md','.template-spec/process/harness-profile.yaml','.template-spec/process/checkpoint-boundary.yaml','.template-spec/process/lifecycle-registry.yaml','.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml'])observe(ref);
    const {roots}=governanceScope(root);report.scope.roots=roots;
    const registry=readDocument(root,'.template-spec/process/lifecycle-registry.yaml');
    observe(orchestrationRef(root));
    const initial=governanceFiles(root,roots);report.scope.files=initial;
    // Validator code/schema changes invalidate this run too; do not import future Skill validators.
    const toolFiles=governanceFiles(root,['scripts','.template-spec/process/schemas','.template-spec/agents','.agents/skills/yss-product-lifecycle']);
    toolFiles.forEach(observe);
    run('context','scripts/verify-context-contract',['--root',root,'--json'],['CONTEXT.md']);
    report.recovery = recovery ? {sequence:['context','checkpoint','approval','transition','task-package'],dispatch:false,action:'复核实际任务结果及当前证据后由主控继续',prerequisites:['当前适用检查通过','原任务结果明确']} : null;
    const queue=checkpointRef?[checkpointRef]:initial.filter(ref=>/\.(?:ya?ml|json|md)$/.test(ref));
    if(taskRef)queue.push(taskRef);
    const strictRefs=new Set([checkpointRef,taskRef].filter(Boolean));
    const seen=new Set(),values=new Map(),claimFiles=new Set(),tickets=[];
    while(queue.length) {
      const ref=queue.shift();if(seen.has(ref))continue;seen.add(ref);
      let bytes,value;
      try{bytes=read(ref);value=parseGovernance(bytes,ref);}catch(error){issue('input-invalid',error.message,ref,true);continue;}
      values.set(ref,value);
      const isCheckpoint=checkpoint(value,ref),isTask=Boolean(value?.task_id&&value?.work_unit_id&&(value?.contract||['active','paused','failed','resolved'].includes(value.workflow_status)));
      if(isCheckpoint) {
        report.scope.checkpoints.push(ref);
        if(value.repository_mode!=='project-instance')issue('checkpoint-identity-mismatch','checkpoint 身份与项目实例不一致',ref);
        const nextUnit=registry.work_units.find(x=>x.id===value.next_work_unit);
        if(nextUnit?.scope==='template-source'&&nextUnit.id!=='work-unit.entry-triage')issue('work-unit-scope-invalid','项目实例不得路由模板维护工作单元',ref);
        for(const id of Object.keys(value.artifacts||{}))if(!registry.artifacts.some(x=>x.id===id))issue('artifact-id-unknown',`未识别生命周期资产 ID: ${id}`,ref);
        try{assertCheckpointBoundary(value,{root});}catch(error){issue('checkpoint-boundary-invalid',error.message,ref);}
        run('checkpoint','scripts/verify-lifecycle-checkpoint',[ref],[ref]);
        if(claimed(value))claimFiles.add(ref);
        if(value.stage_trace?.completed_work_unit)run('transition','scripts/project-ci-transition',[ref],[ref]);
        else if(['running','completed'].includes(value.status)&&['resume','orchestrate'].includes(value.mode))issue('transition-origin-missing','当前流转缺少 stage_trace.completed_work_unit，无法核验前后因果',ref);
        if(recovery&&(value.blockers?.length||['blocked','stale'].includes(value.status)))issue('recovery-blocked','当前 checkpoint 存在阻塞',ref);
      } else if(isTask) {
        report.scope.tasks.push(ref);run('task-package','scripts/verify-digital-human-task-package',[ref],[ref]);
        if(recovery) {
          const status=value.workflow_status;
          if(status==='resolved'&&!value.result?.evidence_refs?.length&&!value.verification_results?.length)issue('task-result-unknown','resolved 任务缺少实际结果引用，不能判定完成',ref);
          if(status!=='resolved')issue('task-not-resolved',`任务状态 ${status||'unknown'}；先核查原任务，禁止重复派发`,ref);
        }
      } else if(value?.gate_id&&value?.decision==='approved') {
        run('approval','scripts/verify-approval-record',['--require-approved',ref],[ref]);
      } else if(claimed(value)) {
        // Claimed assets need an owning checkpoint; owner-specific validators are called through it.
        claimFiles.add(ref);
      } else report.scope.unrecognized.push(ref);
      if(/(?:^|\n)Status:\s*ready-for-agent\s*(?:\n|$)/.test(bytes.toString()))tickets.push(ref);
      if(isCheckpoint||isTask||claimed(value)||value?.gate_id||strictRefs.has(ref)) {
        for(const dependency of references(value)) {
          if(!strictRefs.has(dependency)){strictRefs.add(dependency);seen.delete(dependency);}
          try{read(dependency);if(/\.(?:ya?ml|json|md)$/.test(dependency))queue.push(dependency);}catch(error){issue('reference-unreadable',error.message,ref);}
        }
        for(const [target,hash] of bindings(value)) {
          try{const actual=observe(target);if(actual!==String(hash).replace(/^(?!sha256:)/,'sha256:'))issue('evidence-drift',`摘要不一致: ${target}`,ref);}catch(error){issue('evidence-unreadable',error.message,ref);}
        }
      }
    }
    if(checkpointRef&&!report.scope.checkpoints.includes(checkpointRef))issue('checkpoint-unrecognized','指定引用不是可识别的 checkpoint',checkpointRef);
    if(taskRef&&!report.scope.tasks.includes(taskRef))issue('task-unrecognized','指定引用不是可识别的任务包',taskRef);
    const owned=new Set();
    const owningQueue=[...report.scope.checkpoints];
    while(owningQueue.length)for(const dependency of references(values.get(owningQueue.shift())))if(!owned.has(dependency)){owned.add(dependency);owningQueue.push(dependency);}
    for(const ref of claimFiles)if(!report.scope.checkpoints.includes(ref)) {
      if(!owned.has(ref))issue('claim-without-checkpoint','已声明完成或批准的资产缺少 checkpoint 归属',ref);
      else {
        const asset=values.get(ref),contract=asset?.slice_contract||asset;
        if(contract?.contract_id&&contract?.work_units)run('slice-contract','scripts/slice-contract',['verify',ref,'--root',root,'--json'],[ref]);
        else {report.scope.unrecognized.push(ref);report.scope.missing_capabilities.push(ref);issue('asset-validator-missing','当前声称批准或完成的结构化资产缺少已接入的专属校验能力；补齐资产校验适配后重验',ref,true);}
      }
    }
    for(const ref of tickets)if(!owned.has(ref)&&!report.scope.tasks.some(t=>references(values.get(t)).has(ref)))issue('ticket-without-readiness','ready-for-agent Ticket 缺少当前 checkpoint/任务包证据',ref);
    if(base) {
      if(!/^[a-fA-F0-9]{40}$/.test(base))throw new Error('--base 必须为完整 40 位 commit');
      const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw new Error(r.stderr||'Git 基线不可读');return r.stdout;};
      git(['cat-file','-e',`${base}^{commit}`]);
      const oldFiles=git(['ls-tree','-r','--name-only','-z',base]).split('\0').filter(Boolean);
      const oldTracker=parseGovernance(git(['show',`${base}:${TRACKER}`]),TRACKER)?.tracker;
      const oldConfig=oldFiles.includes(CI_CONFIG)?parseGovernance(git(['show',`${base}:${CI_CONFIG}`]),CI_CONFIG):{additional_paths:[]};
      const oldRoots=[oldTracker?.root?.replace(/\/$/,''),...(oldConfig.additional_paths||[])].filter(Boolean);
      for(const ref of oldRoots)if(!roots.some(r=>ref===r||ref.startsWith(r+'/')))issue('scope-reduced',`相对基线缩小检查范围: ${ref}`,CI_CONFIG);
      const oldValues=new Map();
      const oldRead=ref=>{if(!oldValues.has(ref))oldValues.set(ref,parseGovernance(git(['show',`${base}:${ref}`]),ref));return oldValues.get(ref);};
      const oldScope=oldFiles.filter(ref=>oldRoots.some(r=>ref===r||ref.startsWith(r+'/'))&&/\.(?:ya?ml|json|md)$/.test(ref));
      const oldEvidence=new Set(),oldQueue=[];
      for(const ref of oldScope)if(claimed(oldRead(ref)))oldQueue.push(ref);
      while(oldQueue.length){const ref=oldQueue.shift();if(oldEvidence.has(ref))continue;oldEvidence.add(ref);if(!observe(ref))issue('approved-evidence-deleted',`基线批准依据已删除: ${ref}`,ref);if(/\.(?:ya?ml|json|md)$/.test(ref)&&oldFiles.includes(ref))for(const dep of references(oldRead(ref)))if(oldFiles.includes(dep))oldQueue.push(dep);}
      for(const ref of oldScope.filter(ref=>/\.(?:ya?ml|json)$/.test(ref))) {
        const old=parseGovernance(git(['show',`${base}:${ref}`]),ref);
        if(!checkpoint(old,ref))continue;
        if(!observe(ref)){issue('checkpoint-deleted',`基线 checkpoint 已删除: ${ref}`,ref);continue;}
        const now=values.get(ref);
        if(!report.scope.checkpoints.includes(ref))issue('checkpoint-unassessed',`基线 checkpoint 不再被识别或检查: ${ref}`,ref);
        for(const [id,state] of Object.entries(old.gates||{}))if(state.status==='approved'&&!now?.gates?.[id])issue('approval-claim-removed',`基线批准 ${id} 被移除，须保留历史与当前处置`,ref);
        if(claimed(old))for(const dep of references(old))if(!observe(dep))issue('approved-evidence-deleted',`基线批准依据已删除: ${dep}`,ref);
      }
    }
    if(JSON.stringify(initial)!==JSON.stringify(governanceFiles(root,roots))||JSON.stringify(toolFiles)!==JSON.stringify(governanceFiles(root,['scripts','.template-spec/process/schemas','.template-spec/agents','.agents/skills/yss-product-lifecycle'])))throw new Error('INPUT_DRIFT: 检查范围发生变化');
    for(const [ref,hash] of observed)if(fileBinding(root,ref)!==hash)throw new Error(`INPUT_DRIFT: ${ref}`);
  }catch(error){issue('input-or-execution-error',error.message,checkpointRef||null,true);}
  report.scope.files=[...new Set([...report.scope.files,...observed.keys()].filter(ref=>!ref.startsWith('scripts/')&&!ref.startsWith('.agents/')))].sort();
  report.inputs=[...observed].sort(([a],[b])=>a.localeCompare(b)).map(([ref,sha256])=>({ref,sha256}));
  report.input_digest=digest(JSON.stringify(report.inputs));
  return {report,exitCode:report.status==='passed'?0:report.status==='error'?2:1};
}
