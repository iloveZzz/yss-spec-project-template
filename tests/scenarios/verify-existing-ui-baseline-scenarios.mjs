import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync,copyFileSync,cpSync,existsSync,statSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {pathToFileURL} from 'node:url';
import { baselineFixture, handoffFixture } from '../../scripts/fixtures/existing-ui-baseline/fixture.mjs';
import { validateExistingUiBaseline } from '../../scripts/lib/existing-ui-baseline.mjs';
import { exportBundle,openBundle,importBundle,inspectSource,finalizeDelivery } from '../../scripts/lib/strategic-handoff.mjs';
import { read,json,hash,digest,treeDigest,schema,ROOT } from '../../scripts/lib/strategic-handoff-io.mjs';
import { loadDeliveryProfile } from '../../scripts/lib/harness-execution-scope.mjs';
import { context } from '../../scripts/fixtures/strategic-handoff/fixture.mjs';
const root=t=>{const root=mkdtempSync(path.join(tmpdir(),'existing-ui-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;};
function useCustomRouteIds(f) {
 const ids={'route.backend':'route.custom-backend','route.frontend':'route.custom-frontend','route.coordination':'route.custom-coordination'};
 for(const route of f.handoff.consumer_routes){route.route_id=ids[route.route_id];route.dependencies=(route.dependencies||[]).map(id=>ids[id]);}
 f.save();
}
test('既有 UI 验证真实文件闭包并拒绝源码/锁文件/构建/API/截图篡改',t=>{
 const base=root(t),f=baselineFixture(base),validate=()=>validateExistingUiBaseline(f.data,{bundleRoot:base});assert.deepEqual(validate().errors,[]);
 for(const file of ['source/src/App.vue','source/pnpm-lock.yaml','build/index.html','api/openapi.json','api/response.json','images/submit.png','actions.txt','evidence/build.log']){
   const p=path.join(base,file),original=readFileSync(p);writeFileSync(p,'tampered');assert(validate().errors.length,file);writeFileSync(p,original);
 }
 f.put('unbound.txt','unapproved extra payload');assert.match(validate().errors.join(' '),/未绑定/);
});
test('既有 UI 拒绝未知版本、UI 变更和自洽但跨来源 capture',t=>{
 const base=root(t),f=baselineFixture(base),check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors;
 for(const [key,value]of [['schema_version',2],['source_kind','generated'],['ui_change','changed']]){const old=f.data[key];f.data[key]=value;assert(check().length);f.data[key]=old;}
 const capture=read(path.join(base,'capture.json'));capture.cases[0].actions={...capture.cases[0].actions,digest:`sha256:${'9'.repeat(64)}`};f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check().join(' '),/动作绑定/);
});
test('Handoff v5 既有基线从源导出、离线只读验包、前端导入 v2 预检草案',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source),output=path.join(base,'package');
 useCustomRouteIds(f);
 const result=await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output,zip:true});const before=treeDigest(base,'package');
 assert.equal(await openBundle(output,b=>b.manifest.bundle_digest,{readOnly:true}),result.bundle_digest);assert.equal(treeDigest(base,'package'),before);
 await assert.rejects(()=>openBundle(`${output}.zip`,()=>null,{readOnly:true}),/readonly-extraction-required/);
 const delivered=await finalizeDelivery({sourceRoot:source,handoffRef:'handoff.yaml'}),wrapper=path.join(base,'delivery');cpSync(delivered.delivery,wrapper,{recursive:true});
 rmSync(source,{recursive:true});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind),'existing-ui-baseline');
 const target=path.join(base,'target');mkdirSync(target);writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');writeFileSync(path.join(target,'CONTEXT.md'),context);
 await assert.rejects(()=>importBundle({bundle:output,targetRoot:target}),/delivery wrapper/);
 const imported=await importBundle({bundle:wrapper,targetRoot:target}),receipt=read(path.join(target,imported.receipt_ref));assert.equal(receipt.schema_version,3);
 assert.equal(existsSync(path.join(target,path.dirname(imported.receipt_ref),'frontend-strategic-preflight-draft.json')),false,'前端已移除：导入不再生成前端预检草案');
});
test('Handoff v5 原型仍验证离线原型；v4 原版本保持，未知版本拒绝',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source,{kind:'prototype'}),output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'prototype');
 f.handoff.schema_version=3;f.sign();await assert.rejects(()=>inspectSource(source,'handoff.yaml'),error=>error.code==='MIGRATION_REQUIRED');
 f.handoff.schema_version=99;f.sign();await assert.rejects(()=>inspectSource(source,'handoff.yaml'),error=>error.code==='CAPABILITY');
});
test('真实用户决定必须覆盖既有 manifest 当前原字节；结构批准不能代替',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source);await inspectSource(source,'handoff.yaml');
 const file=path.join(source,'approvals/existing-ui.json'),approval=read(file);delete approval.user_decision_ref;f.put('approvals/existing-ui.json',approval);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision/);
});
test('重算包内摘要不能复用旧用户批准；UI=true 不能走既有分支',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source),file=path.join(source,'existing-ui/existing-ui-baseline.json');
 writeFileSync(file,`${readFileSync(file,'utf8')}\n`);const next=hash(readFileSync(file));f.handoff.source.existing_ui_baseline_ref.digest=next;const approval=read(path.join(source,'approvals/existing-ui.json'));approval.artifact_bindings[0].digest=next;f.put('approvals/existing-ui.json',approval);f.save();await assert.rejects(()=>inspectSource(source,'handoff.yaml'),error=>error.code==='APPROVAL_CURRENT_INVALID');
 f.stage.impact_assessment.ui=true;f.put('source/stage.yaml',f.stage);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/UI 影响/);
});
test('自洽摘要不能掩盖 build/source、API operation 与截图 viewport 冲突',t=>{
 const base=root(t),f=baselineFixture(base),check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors.join(' ');
 const manifest=read(path.join(base,'source-manifest.json'));manifest.project_id='other';f.put('source-manifest.json',manifest);f.data.source.manifest=f.binding('source-manifest.json');assert.match(check(),/源码身份/);manifest.project_id=f.data.source.project_id;f.put('source-manifest.json',manifest);f.data.source.manifest=f.binding('source-manifest.json');
 const build=read(path.join(base,'build.json'));build.source_commit='2'.repeat(40);f.put('build.json',build);f.data.build=f.binding('build.json');assert.match(check(),/当前源码/);build.source_commit=f.data.source.source_commit;f.put('build.json',build);f.data.build=f.binding('build.json');
 const api=read(path.join(base,'api/exchange.json'));api.exchanges[0].operation_id='anotherOperation';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');const capture=read(path.join(base,'capture.json'));capture.cases=f.data.cases;f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check(),/operation/);
 api.exchanges[0].operation_id='submitSupplier';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');f.data.cases[0].viewport.width=500;capture.cases=f.data.cases;f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check(),/viewport/);
});
test('固定 Vite 代理映射保留真实前缀 URL；错误 prefix、未绑定配置与任意 rewrite 拒绝',async t=>{
 const {files}=await import('../../scripts/lib/strategic-handoff-io.mjs');const base=root(t),f=baselineFixture(base);
 f.put('source/vite.config.ts',"const apiBase = env.VITE_API_BASE_URL || '/api'\nconst server = {proxy: {[apiBase]: {target: proxyTarget, changeOrigin: true, rewrite: (path) => path.replace(new RegExp(`^${apiBase}`), '')}}}");
 f.put('source/.env.production.standalone','VITE_API_BASE_URL=/api/quality-v3\n');
 const source=f.data.source;source.digest=treeDigest(base,'source');const manifest=read(path.join(base,source.manifest.ref));manifest.source_digest=source.digest;manifest.files=files(base,'source').map(ref=>({path:ref.slice(7),digest:f.binding(ref).digest}));f.put(source.manifest.ref,manifest);source.manifest=f.binding(source.manifest.ref);
 const build=read(path.join(base,'build.json'));build.source_digest=source.digest;f.put('build.json',build);f.data.build=f.binding('build.json');
 const api=read(path.join(base,'api/exchange.json'));api.source_digest=source.digest;api.build_digest=f.data.build.digest;api.exchanges[0].url='http://127.0.0.1:9999/api/quality-v3/supplier';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');
 const capture=read(path.join(base,'capture.json'));Object.assign(capture,{source_digest:source.digest,build_digest:f.data.build.digest,cases:f.data.cases});f.put('capture.json',capture);f.data.capture=f.binding('capture.json');
 const check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors;
 assert.match(check().join(' '),/API URL/);f.data.api_route_mapping={kind:'vite-env-prefix-rewrite',config:f.binding('source/vite.config.ts'),environment:f.binding('source/.env.production.standalone'),prefix:'/api/quality-v3',replacement:''};assert.deepEqual(check(),[]);
 f.data.api_route_mapping.prefix='/api/other';assert.match(check().join(' '),/prefix/);f.data.api_route_mapping.prefix='/api/quality-v3';
 f.data.api_route_mapping.config=f.binding('actions.txt');assert.match(check().join(' '),/固定源码/);
 f.data.api_route_mapping.config=f.binding('source/vite.config.ts');f.data.api_route_mapping.replacement='/anything';assert(check().length);
});
test('真实战略专职 policy 使用产品设计聚合门禁；ready-for-human 原字节确认可导出且状态改写失效',async t=>{
 const {dedicatedDesignHandoffFixture}=await import('../../scripts/fixtures/existing-ui-baseline/fixture.mjs');
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await dedicatedDesignHandoffFixture(source);
 assert(f.roles.user_decision_policy.gates.includes('gate.product-design-approved'));assert(!f.roles.user_decision_policy.gates.includes('gate.user-confirmation'));
 assert.equal(f.baseline.data.status,'ready-for-human');assert.equal(f.handoff.package_export.approvals.existing_ui_baseline_ref.gate_id,'gate.product-design-approved');
 const output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'existing-ui-baseline');
 const missingPolicy=structuredClone(f.roles);missingPolicy.user_decision_policy.gates=missingPolicy.user_decision_policy.gates.filter(gate=>gate!=='gate.product-design-approved');f.put('.template-spec/agents/digital-human-roles.yaml',missingPolicy);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),error=>error.code==='HANDOFF_POLICY');f.put('.template-spec/agents/digital-human-roles.yaml',f.roles);
 const approvalRef=path.join(source,'approvals/existing-ui.json'),approval=read(approvalRef),original=structuredClone(approval);delete approval.user_decision_ref;f.put('approvals/existing-ui.json',approval);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision/);
 f.baseline.data.status='approved';f.baseline.put('existing-ui-baseline.json',f.baseline.data);const changed=f.baseline.binding('existing-ui-baseline.json').digest;f.handoff.source.existing_ui_baseline_ref.digest=changed;original.artifact_bindings[0].digest=changed;f.put('approvals/existing-ui.json',original);f.put('handoff.yaml',f.handoff);
 await assert.rejects(()=>inspectSource(source,'handoff.yaml'),error=>error.code==='APPROVAL_CURRENT_INVALID');
});
test('既有 UI 全目录作为已验证观测文件集：源删除后可验包，治理悬空引用仍拒绝',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source,{sourceDocumentation:true});
 f.handoff.package_export.additional_files.push('missing-governance.md');f.save();await assert.rejects(()=>exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output:path.join(base,'invalid')}),error=>error.code==='HANDOFF_CLOSURE'&&error.message.includes('missing-governance.md'));
 assert.equal(f.handoff.package_export.additional_files.pop(),'missing-governance.md');f.save();const output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});
 rmSync(source,{recursive:true});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'existing-ui-baseline');
 const raw=readFileSync(path.join(output,'payload/files/existing-ui/source/README.md'),'utf8');assert.match(raw,/original-source/);
});
