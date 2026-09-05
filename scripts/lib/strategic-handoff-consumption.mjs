import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openBundle } from './strategic-handoff.mjs';
import { read, safe, ensure, ROOT, digest, project } from './strategic-handoff-io.mjs';
import { parseContextContract } from './context-contract.mjs';
const present=x=>typeof x==='string'&&x.trim();
const list=x=>Array.isArray(x)&&x.length&&x.every(present);
const without=(value,keys)=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
const strategyBasis=value=>({
  ...without(value,['domain_version','approval','rule_catalog','scenarios','invariants']),
  invariants:(value.invariants||[]).map(item=>without(item,['statement'])),
});
export async function verifyConsumption(data,{root=process.cwd(),sliceRef}={}) {
  project(root);
  if (sliceRef) ensure(data.status === "approved", "切片只能消费 approved 战术合同");
  const binding=data.strategic_handoff;
  ensure(binding && present(binding.import_receipt_ref) && present(binding.context_reconciliation_ref),'缺少战略交接导入收据与目标对账引用');
  const receipt=read(safe(root,binding.import_receipt_ref));
  const expectedBase=`docs/handoffs/${receipt.bundle_id}/${receipt.version}`;
  ensure(binding.import_receipt_ref===`${expectedBase}/import-receipt.json` && receipt.package_ref===`${expectedBase}/package`,'导入收据路径与包身份不一致');
  ensure(binding.bundle_digest===receipt.bundle_digest,'战术绑定与导入收据摘要不一致');
  const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/verify-context-reconciliation'),'--root',root,safe(root,binding.context_reconciliation_ref)],{encoding:'utf8'});
  ensure(result.status===0,`目标术语对账未通过: ${result.error?.message || result.stderr}`);
  const context=parseContextContract({root});
  const parent=safe(root,`docs/handoffs/${receipt.bundle_id}`);
  const versions=readdirSync(parent).filter(x=>/^v[1-9][0-9]*$/.test(x)&&existsSync(path.join(parent,x,'import-receipt.json'))).sort((a,b)=>Number(b.slice(1))-Number(a.slice(1)));
  const latestReceipt=read(safe(root,`docs/handoffs/${receipt.bundle_id}/${versions[0]}/import-receipt.json`));
  ensure(latestReceipt.version===versions[0]&&latestReceipt.package_ref===`docs/handoffs/${receipt.bundle_id}/${versions[0]}/package`,'最新收据路径无效');
  return openBundle(safe(root,receipt.package_ref),async original=>{
    ensure(original.manifest.bundle_digest===receipt.bundle_digest,'导入收据与包不一致');
    return openBundle(safe(root,latestReceipt.package_ref),async current=>{
      ensure(current.manifest.bundle_id===receipt.bundle_id && current.manifest.bundle_digest===latestReceipt.bundle_digest,'最新导入收据无效');
      for(const op of ['added','updated'])for(const term of current.handoff.context_delta[op]) {
        const actual=context.terms_by_ref.get(term.term_ref);ensure(actual,`目标缺少术语: ${term.term_ref}`);
        for(const key of ['term','meaning','english_identifier','context_id','forbidden_aliases'])ensure(digest(actual[key])===digest(term[key]),`目标术语未对账: ${term.term_ref}`);
      }
      for(const term of current.handoff.context_delta.deprecated)ensure(!context.terms_by_ref.has(term.term_ref),`目标尚未处理废弃术语: ${term.term_ref}`);
      ensure(Array.isArray(binding.rows),'缺少逐条承接 rows');
      const known=new Map([...current.indexes.rules.map(x=>[x.rule_id,x]),...current.indexes.scenarios.filter(x=>x.critical).map(x=>[x.scenario_id,x])]);
      const rows=new Map();for(const row of binding.rows){ensure(!rows.has(row.source_id),`重复承接: ${row.source_id}`);rows.set(row.source_id,row);}
      const issues=[], blocked=new Set();let all=false;
      const mark=(id,reason,row)=>{issues.push({source_id:id,reason});if(row?.dependency_status!=='known'||!list(row.dependent_slice_refs))all=true;else row.dependent_slice_refs.forEach(x=>blocked.add(x));};
      const catalogs=['aggregate_catalog','entity_catalog','value_object_catalog','behavior_catalog','invariant_catalog','state_transition_catalog','domain_event_catalog','gateway_catalog'];
      const ids=new Set(catalogs.flatMap(k=>(data[k]||[]).flatMap(x=>Object.entries(x).filter(([k])=>k.endsWith('_id')).map(([,v])=>v))));
      const seams=new Map((data.test_seams||[]).map(x=>[x.seam_id,x]));
      for(const[id,source]of known){
        const row=rows.get(id);
        if(!row){mark(id,'missing-mapping');continue;}
        ensure(['known','unknown'].includes(row.dependency_status) && Array.isArray(row.dependent_slice_refs),'缺少切片依赖判定');
        if(row.source_digest!==source.source_digest){mark(id,'stale-source',row);continue;}
        if(row.disposition==='implemented'){
          ensure(list(row.tactical_refs)&&row.tactical_refs.every(x=>ids.has(x)),`战术落点悬空: ${id}`);
          ensure(list(row.test_seam_refs)&&row.test_seam_refs.every(x=>seams.has(x)&&row.tactical_refs.includes(seams.get(x).subject_ref)),`测试 seam 未关联战术落点: ${id}`);
          if(id.startsWith('scenario.'))ensure(['success','failure'].every(outcome=>(row.scenario_tests||[]).some(x=>x.outcome===outcome&&row.test_seam_refs.includes(x.seam_ref))),`关键场景缺少成功/失败测试: ${id}`);
          ensure(list(row.evidence_refs),`缺少落实证据: ${id}`);row.evidence_refs.forEach(ref=>safe(root,ref));
        }else if(row.disposition==='deferred'){
          for(const key of ['reason','risk','owner','followup_ticket_ref','verification_plan','target_version'])ensure(present(row[key]),`延期缺少 ${key}: ${id}`);
          mark(id,'deferred',row);
        }else if(row.disposition==='not-applicable'){
          ensure(present(row.reason)&&list(row.evidence_refs),`不适用缺少依据: ${id}`);row.evidence_refs.forEach(ref=>safe(root,ref));
        }else {ensure(['pending','conflict'].includes(row.disposition),`非法承接状态: ${id}`);mark(id,row.disposition,row);}
      }
      for(const[id,row]of rows)if(!known.has(id))mark(id,'removed-or-unknown-source',row);
      for(const key of ['spec_ref','prototype_ref','visual_baseline_ref','business_ticket_set_ref'])if(original.handoff.source[key].digest!==current.handoff.source[key].digest){all=true;issues.push({source_id:key,reason:'upstream-asset-stale'});}
      // Rule changes can be scoped to declared dependencies. Boundary/decision or
      // runnable-prototype changes need the tactical contract rebound as a whole.
      const stageKeys=['package_version','approval','domain_strategy_ref'];
      if(digest(strategyBasis(original.strategy))!==digest(strategyBasis(current.strategy)) || digest(without(original.stage,stageKeys))!==digest(without(current.stage,stageKeys)) || digest(original.config.prototype)!==digest(current.config.prototype)) {
        all=true;issues.push({source_id:'strategic-design-basis',reason:'upstream-design-stale'});
      }
      const blockedHere=all||(sliceRef?blocked.has(sliceRef):issues.length>0);
      return {result:blockedHere?'blocked':'verified',bundle_digest:current.manifest.bundle_digest,consumed_bundle_digest:receipt.bundle_digest,tactical_digest:digest(data),scope:sliceRef||'whole-tactical-design',coverage_complete:[...known.keys()].every(id=>rows.has(id)),block_all:all,blocked_slice_refs:[...blocked].sort(),issues};
    });
  });
}
