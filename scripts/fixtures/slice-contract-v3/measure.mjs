// Synthetic, same-input comparison. These artifacts never authorize product implementation.
import fs from 'node:fs';
import path from 'node:path';
import { stringify } from '../../vendor/yaml.mjs';
import { pilotFixture } from './pilot-fixture.mjs';
import { normalizeSliceContract } from '../../lib/slice-contract.mjs';
import { loadCompilerContract } from '../../lib/implementation-contract-compiler.mjs';
import { renderSliceContractView } from '../../lib/slice-contract-views.mjs';

const f=pilotFixture();
try {
 const normalized=normalizeSliceContract(f.contract,{root:f.root});
 const legacy={};
 for(const [section,fields]of Object.entries(loadCompilerContract().slice_contract_required)) {
  const target=section==='root'?legacy:(legacy[section]={});
  for(const field of fields)target[field]=section==='root'?normalized[field]??[]:normalized[section]?.[field]??[];
 }
 const oldUnits=normalized.work_units.map(unit=>({id:unit.id,role_id:unit.role_id,contract_id:unit.contract_id,contract_version:unit.contract_version,workflow_status:'not-started',work_unit:Object.fromEntries(['behavior','primary_skill','supporting_skills','tdd_mode','project_root','allowed_write_paths','forbidden_patterns','verification_commands','expected_evidence'].map(key=>[key,unit.work_unit[key]]))}));
 Object.assign(legacy,{schema_version:2,resolution:{...normalized.resolution,reason_chains:f.prepared.report.reason_chains},work_units:oldUnits});
 legacy.backend={...legacy.backend,required_skills:normalized.common.required_skills,allowed_write_paths:normalized.common.allowed_write_paths,verification_commands:normalized.common.verification_commands,expected_evidence_files:normalized.common.expected_evidence_files};
 const keys=value=>value&&typeof value==='object'?Object.values(value).reduce((sum,v)=>sum+keys(v),Array.isArray(value)?0:Object.keys(value).length):0;
 const occurrences=(value,key)=>value&&typeof value==='object'?Object.values(value).reduce((sum,v)=>sum+occurrences(v,key),Object.hasOwn(value,key)?1:0):0;
 const valueOccurrences=(value,needle)=>value&&typeof value==='object'?Object.values(value).reduce((sum,v)=>sum+valueOccurrences(v,needle),0):Number(value===needle);
 // Normalize temp fixture paths only for reproducible size accounting; hashes still describe the live fixture.
 const stable=value=>JSON.parse(JSON.stringify(value).replaceAll(f.root,'/synthetic/project-root'));
 const measure=value=>{const text=stringify({slice_contract:stable(value)});return{yaml_bytes:Buffer.byteLength(text),yaml_lines:text.trimEnd().split('\n').length,field_count:keys(value),repeated_fact_occurrences:{...Object.fromEntries(['required_skills','allowed_write_paths'].map(key=>[key,occurrences(value,key)])),verification_command:valueOccurrences(value,'./mvnw test')}};};
 f.write('measurement.yaml',stringify({slice_contract:f.contract}));
 const view=renderSliceContractView('measurement.yaml',{root:f.root});
 const metrics={kind:'synthetic-equivalent-contract-comparison',method:'同一已登记 MVC 工程、来源和工作单元；v2 按旧 required 表展开，v3 按实际准备结果保存；不是历史生产合同或人工工时测量。',v2:measure(legacy),v3:measure(f.contract),review_summary_bytes:Buffer.byteLength(view.markdown.split('<details>')[0]),preparation:{source:'Ticket/登记/基线一次选择，Agent 仅补切片细化',manual_refinement_fields:f.prepared.report.metrics.refinement_fields,unique_source_files:f.prepared.report.metrics.unique_source_files},additional_human_confirmations:'由当前批准/授权复用回归验证，未测量真实项目交互次数'};
 metrics.byte_reduction_percent=Number(((1-metrics.v3.yaml_bytes/metrics.v2.yaml_bytes)*100).toFixed(1));
 metrics.preparation.v2_steps=['选择上游并填写 lifecycle_refs','填写 common 范围和公共验证','编译并填写 resolution、同步 common 的 Skill','展开前后端等固定分区并复制适用事实','填写工作单元并同步路径、命令和证据','检查各处重复值及审批绑定'];
 metrics.preparation.v3_steps=['选择 Ticket 和已有来源','补切片行为、收窄范围、适用性和验证细化','prepare 自动绑定、编译、检查并生成审阅视图'];
 metrics.preparation.measurement_note='步骤为本组合成合同的整理操作分组，未测量人工耗时或真实项目步骤次数。';
 if(process.argv[2]) {const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});for(const [name,text]of [['metrics.json',JSON.stringify(metrics,null,2)+'\n'],['v3-example.yaml',stringify({slice_contract:stable(f.contract)})],['v2-equivalent-example.yaml',stringify({slice_contract:stable(legacy)})],['review-example.md',view.markdown.replaceAll(f.root,'/synthetic/project-root')]])fs.writeFileSync(path.join(dir,name),text);}
 console.log(JSON.stringify(metrics,null,2));
}finally{f.cleanup();}
