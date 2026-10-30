import test from 'node:test';
import assert from 'node:assert/strict';
import {readHistoricalProfiles,compileHistoricalVerificationPlan,parseTrustedReportSources} from '../.template-source/scripts/lib/legacy-verification.mjs';

const root=new URL('..',import.meta.url).pathname;

test('固定提交策略只读，旧产品策略不能重建为当前报告',()=>{
 const current='1e49127842c358caf552af8ebec58f438a35c5a6';
 const old='0abbe49ee4cfd8608beab95243520888228dad41';
 const policy=readHistoricalProfiles(root,current);
 assert.ok(policy.profiles.fast&&policy.profiles.release);
 assert.throws(()=>readHistoricalProfiles(root,'HEAD'),/完整 SHA/);
 assert.throws(()=>compileHistoricalVerificationPlan({root,commit:old}),/REPORT_SOURCE_UNSUPPORTED/);
 policy.gate_policy={activation:'qualified-gates'};
 assert.throws(()=>compileHistoricalVerificationPlan({root,commit:current,config:policy}),/HISTORICAL_QUALIFIED_BASELINE_REFUSED/);
});

test('受审查登记按完整提交和报告摘要识别 5.x，拒绝旧版本和重复来源',()=>{
 const v5='1e49127842c358caf552af8ebec58f438a35c5a6',later='a'.repeat(40),report='b'.repeat(64);
 const sources={schema_version:1,releases:[{version:'5.0.0',commit:v5,reports:[]},{version:'5.1.0',commit:later,reports:[report]}]};
 const registry=parseTrustedReportSources(sources);
 assert.equal(registry.get(v5).version,'5.0.0');
 assert.deepEqual(registry.get(later).reports,[report]);
 for(const bad of [
  {...sources,releases:[{version:'4.9.0',commit:v5,reports:[]}]},
  {...sources,releases:[{version:'5.1.0',commit:'HEAD',reports:[]}]},
  {...sources,releases:[{version:'5.1.0',commit:later,reports:['short']}]},
  {...sources,releases:[sources.releases[0],sources.releases[0]]},
  {...sources,releases:[{version:'5.1.0',commit:later,reports:[report,report]}]},
  {...sources,unexpected:true},
 ]) assert.throws(()=>parseTrustedReportSources(bad),/REPORT_SOURCE_REGISTRY_INVALID/);
});
