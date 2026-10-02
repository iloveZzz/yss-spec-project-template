import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const pinned='/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-followup-review-5z0ytly8/root';
const output='/tmp/yss-lifecycle-followup-status-review';
const {parseDocument}=await import(path.join(pinned,'scripts/vendor/yaml.mjs'));
const copyRefs=['.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/digital-human-roles.yaml','.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml','scripts/verify-lifecycle-checkpoint','scripts/verify-plan-spec-entry'];
const checkpointSchema=path.join(pinned,'.template-spec/process/schemas/lifecycle-checkpoint.schema.json');
const taskSchema=path.join(pinned,'.template-spec/process/schemas/digital-human-task-package.schema.json');
const validator="import json,sys;from jsonschema import Draft202012Validator;s=json.load(open(sys.argv[1]));v=json.load(open(sys.argv[2]));e=list(Draft202012Validator(s).iter_errors(v));print('schema-valid' if not e else '\\n'.join(x.message for x in e));sys.exit(bool(e))";
const cases=[];
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
for(const name of ['task-failed','task-paused','task-result-failed','check-failed','artifact-stale','route-missing','tracking-drift','pause-shape']){
 const root=path.join(output,name);mkdirSync(root,{recursive:true});
 const put=(ref,v)=>{mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});writeFileSync(path.join(root,ref),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
 for(const ref of copyRefs){mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});cpSync(path.join(pinned,ref),path.join(root,ref));}
 put('yss-project.yaml',{schema_version:1,repository_mode:'project-instance'});
 const checkpoint=JSON.parse(readFileSync(path.join(pinned,'.template-spec/process/templates/lifecycle-checkpoint-template.json')));
 checkpoint.stage='stage.plan';checkpoint.next_work_unit='work-unit.plan-requirements';
 let task;
 if(name.startsWith('task-')){
  task=parseDocument(readFileSync(path.join(pinned,'scripts/fixtures/maintenance-review/maintenance-review/task-package.yaml'),'utf8')).toJS();
  task.stage_id=checkpoint.stage;task.work_unit_id=checkpoint.next_work_unit;task.convergence.parent_work_unit=checkpoint.next_work_unit;task.contract.kind='lifecycle-work-unit';delete task.contract.maintenance_ref;task.contract.lifecycle_ref='docs/checkpoint.json';task.execution_state='Worker';delete task.review_context;task.workflow_status=name==='task-paused'?'paused':name==='task-result-failed'?'resolved':'failed';
  task.result={result_schema:'workflow-execution-result-v1',work_unit:task.work_unit_id,result:'failed',blocking_signals:['预算模型输入格式错误，无法生成需求分析'],evidence_refs:['docs/failure.log']};
  task.verification_results=[{command:'fixture-validation',exit_code:1,executed_at:'2026-10-02T11:00:00+08:00',evidence_ref:'docs/failure.log'}];
  put('docs/failure.log','预算模型输入格式错误，退出码 1\n');
  put('docs/task.json',task);
 }
 if(name==='check-failed')checkpoint.checks={'check.stage-decision-package-approved':{status:'failed',reason:'决策包缺少业务边界',evidence_refs:['docs/check.log']}};
 if(name==='artifact-stale')checkpoint.artifacts={'artifact.plan':{status:'stale',ref:'docs/plan.md',evidence_refs:[],stale_by:['业务边界已变化']}};
 if(name==='pause-shape'){checkpoint.status='paused-human-gate';checkpoint.pause={reason_code:'external-input-required',owner_or_authority:'预算负责人',resume_condition:'补充真实预算说明',next_work_unit:checkpoint.next_work_unit};}
 if(name==='route-missing'||name==='tracking-drift'){
  checkpoint.next_work_unit='work-unit.spec-synthesis';put('docs/plan.md','# 已变更 Plan\n');
  checkpoint.stage_tracking={schema_version:1,feature_id:'feedback',checkpoint_ref:'docs/checkpoint.json',entry_stage:'stage.plan',entry:{kind:'checkpoint',ref:'docs/checkpoint.json'},items:[{id:'spec',kind:'stage-work-item',title:'Spec',stage:'stage.spec-architecture',work_unit:checkpoint.next_work_unit,owner:'需求负责人',scope:'反馈验证',acceptance:['当前路由通过'],dependencies:[],source_refs:name==='tracking-drift'?[{ref:'docs/plan.md',digest:sha('# 原始 Plan\n')}]:[],progress:'pending',split_reasons:[],completion:[]}]};
  if(name==='route-missing'){const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';const contract=parseDocument(readFileSync(path.join(root,ref),'utf8')).toJS();delete contract.work_unit_routes[checkpoint.next_work_unit];put(ref,contract);}
 }
 put('docs/checkpoint.json',checkpoint);
 const schema=spawnSync('python3',['-c',validator,checkpointSchema,path.join(root,'docs/checkpoint.json')],{encoding:'utf8'});
 let taskValidation=null;if(task)taskValidation=spawnSync('python3',['-c',validator,taskSchema,path.join(root,'docs/task.json')],{encoding:'utf8'});
 const args=[path.join(pinned,'scripts/lifecycle-status'),'--root',root,'--checkpoint','docs/checkpoint.json',...(task?['--task','docs/task.json']:[])];
 const json=spawnSync(process.execPath,args,{encoding:'utf8'}), text=spawnSync(process.execPath,[...args,'--format','text'],{encoding:'utf8'});
 writeFileSync(path.join(root,'status.json'),json.stdout);writeFileSync(path.join(root,'status.txt'),text.stdout);writeFileSync(path.join(root,'schema-check.txt'),schema.stdout+schema.stderr+(taskValidation?taskValidation.stdout+taskValidation.stderr:''));
 const result=JSON.parse(json.stdout);
 cases.push({name,checkpoint_schema_exit:schema.status,task_schema_exit:taskValidation?.status??null,json_exit:json.status,text_exit:text.status,blockers:result.blockers,next_stage:result.next_stage,action_type:result.next_step.action_type,next_action:result.next_action,task_recovery:result.verification_scope.find(x=>x.id==='task-recovery'),registered_gates:result.verification_scope.find(x=>x.id==='registered-gates'),next_stage_association:result.verification_scope.find(x=>x.id==='next-stage-association'),diagnostics:result.diagnostics});
}
writeFileSync(path.join(output,'results.json'),JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify(cases,null,2));
