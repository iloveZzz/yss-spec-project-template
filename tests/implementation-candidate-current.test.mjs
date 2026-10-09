import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectImplementationCandidate, candidateSourceCommit, candidateChangedPaths, candidateCoverageSource, candidateCoverageInventory, inspectCandidateBaseCommit} from '../scripts/lib/implementation-candidate-current.mjs';
import {captureMaintenanceCandidate, inspectMaintenanceCandidate} from '../scripts/lib/maintenance-candidate.mjs';
import {resolveMaintenanceReference} from '../scripts/lib/maintenance-storage.mjs';
import {legacyReviewCandidate} from '../scripts/fixtures/backend-standards/legacy-review-candidate.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const source=path.resolve(import.meta.dirname,'..');
function treeSnapshot(root,prefix=''){const out=[];for(const name of fs.readdirSync(path.join(root,prefix)).sort()){const ref=prefix?prefix+'/'+name:name,stat=fs.lstatSync(path.join(root,ref));if(stat.isDirectory())out.push(...treeSnapshot(root,ref));else out.push({ref,mode:stat.mode,mtime:stat.mtimeMs,digest:sha(fs.readFileSync(path.join(root,ref)))});}return out;}
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
function fixture(t,rootProject=false){
 const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-candidate-current-'))),root=path.join(base,'repo');fs.mkdirSync(root);
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const put=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
 put('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
 put('.yss.json',{schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:'b'.repeat(64),manifestHash:'c'.repeat(64),variables:{},distribution:{},managedFiles:{},baselineDigest:sha('{}')});
 put('.template-spec/process/harness-profile.yaml','profile_id: harness.spec-template\n');
 put('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml',fs.readFileSync(path.join(source,'.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml')));
 put('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');
 const cp='.work/feature/checkpoint.json',asset='.work/feature/slice.yaml',config='.work/feature/progression-target.json';
 put(cp,{feature_id:'feature.fixture',artifacts:{'slice-contract':{ref:asset}}});put('.work/feature/map.md',`---\ncheckpoint_ref: ${cp}\n---\n`);
 put(asset,{schema_version:3,scope:{project_roots:[rootProject?'.':'apps/backend/demo'],implementation_path_policy:rootProject?'external-repository-native':'harness-apps-projects'}});
 put(config,{schema_version:1,kind:'lifecycle-progression-target',feature_id:'feature.fixture',checkpoint_ref:cp,target:'spec-approved',intent_source:'fixture',consumers:[]});
 put('apps/backend/demo/src/Main.java','class Main {}\n');put('pom.xml','<project/>\n');put('shared/common.txt','fixed\n');
 git(root,'init','-q');git(root,'config','user.name','Fixture');git(root,'config','user.email','fixture@example.invalid');git(root,'add','.');git(root,'commit','-qm','baseline');
 const commit=git(root,'rev-parse','HEAD'),input={review_mode:'committed',implementation_candidate_ref:commit,candidate_digest:git(root,'rev-parse','HEAD^{tree}'),slice_contract_ref:asset};
 const binary=path.join(base,'native-mock');fs.writeFileSync(binary,`#!/usr/bin/env node
const fs=require('fs'),path=require('path'),crypto=require('crypto');const hash=x=>crypto.createHash('sha256').update(x).digest('hex');const root=process.argv[process.argv.indexOf('--root')+1],cp=process.argv[process.argv.indexOf('--checkpoint')+1],config='.work/feature/progression-target.json',c=fs.existsSync(path.join(root,config))?JSON.parse(fs.readFileSync(path.join(root,config))):{feature_id:'feature.fixture',target:'business-accepted'};if(process.env.TEST_NATIVE_GIT_STATUS==='1')require('child_process').execFileSync('git',['status','--porcelain'],{cwd:root});const contract='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';const p={enabled:true,root,feature_id:c.feature_id,checkpoint_ref:cp,target:c.target,config_ref:config,config_digest:fs.existsSync(path.join(root,config))?'sha256:'+hash(fs.readFileSync(path.join(root,config))):null,checkpoint_digest:'sha256:'+hash(fs.readFileSync(path.join(root,cp))),contract_digest:'sha256:'+hash(fs.readFileSync(path.join(root,contract))),read_only:true,inputs_current:true,execution_authorization:'not-evaluated',status:'pending'};if(!process.env.TEST_NO_MATERIALS)p.intent_materials={schema_version:1,kind:'lifecycle-target-intent-materials',root,feature_id:c.feature_id,checkpoint_ref:cp,config_ref:config,files:JSON.parse(process.env.TEST_FILES||'[]').map(ref=>({ref,digest:'sha256:'+hash(fs.readFileSync(path.join(root,ref))),mode:fs.statSync(path.join(root,ref)).mode&511}))};console.log(JSON.stringify({status:'ok',code:'OK',outputVersion:1,protocolVersion:1,command:'lifecycle',result:{action:'target',progression:p}}));
`);fs.chmodSync(binary,0o755);
 const env={...process.env,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:sha(fs.readFileSync(binary))};
 return {base,root,put,cp,asset,config,input,commit,env,options:{root,projectRoot:rootProject?root:path.join(root,'apps/backend/demo'),assetRef:asset,env}};
}
function target(f){const c=JSON.parse(fs.readFileSync(path.join(f.root,f.config)));c.target='business-accepted';f.put(f.config,c);}

test('target-only tracked change and certified transaction preserve original committed candidate',t=>{
 const f=fixture(t),before=fs.readFileSync(path.join(f.root,'.git/index')),tree=f.input.candidate_digest;target(f);
 const ref='.yss/transactions/'+ 'a'.repeat(32)+'/journal.json';f.put(ref,'fixture protocol material');fs.chmodSync(path.join(f.root,ref),0o600);f.env.TEST_FILES=JSON.stringify([ref]);
 const current=inspectImplementationCandidate(f.input,f.options);
 assert.equal(candidateSourceCommit(current),f.commit);assert.deepEqual(candidateChangedPaths(current,f.commit),[]);
 assert.equal(f.input.candidate_digest,tree);assert.deepEqual(fs.readFileSync(path.join(f.root,'.git/index')),before);
 git(f.root,'add',f.config);git(f.root,'commit','-qm','intent only');
 assert.equal(candidateSourceCommit(inspectImplementationCandidate(f.input,f.options)),f.commit);
});
for(const [name,change] of [
 ['parent build',f=>f.put('pom.xml','changed')],['shared source',f=>f.put('shared/common.txt','changed')],
 ['source bytes',f=>f.put('apps/backend/demo/src/Main.java','class Changed {}')],['source mode',f=>fs.chmodSync(path.join(f.root,'apps/backend/demo/src/Main.java'),0o755)],
 ['new source',f=>f.put('apps/backend/demo/src/New.java','class New {}')],['unknown transaction',f=>f.put('.yss/transactions/unknown/file','unsafe')],
 ['other feature intent',f=>f.put('.work/other/progression-target.json','{}')],['approval bytes',f=>f.put('.work/feature/review.json','changed')]
])test(`${name} remains a candidate blocker`,t=>{const f=fixture(t);target(f);change(f);assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/candidate.*stale|candidate.*current|untracked/);});
test('missing material capability, wrong project and forged material path reject',t=>{
 const f=fixture(t);target(f);assert.throws(()=>inspectImplementationCandidate(f.input,{...f.options,env:{...f.env,TEST_NO_MATERIALS:'1'}}),/intent.*material|CAPABILITY/);
 fs.mkdirSync(path.join(f.root,'apps/backend/other'),{recursive:true});assert.throws(()=>inspectImplementationCandidate(f.input,{...f.options,projectRoot:path.join(f.root,'apps/backend/other')}),/project/);
 f.env.TEST_FILES=JSON.stringify(['shared/common.txt']);assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/transaction/);
});
test('default target with no config keeps strict full-repo currentness',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.root,f.config));assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/candidate.*current|candidate.*stale/);});

test('staged code with restored working bytes cannot appear clean',t=>{const f=fixture(t);target(f);f.put('shared/common.txt','staged');git(f.root,'add','shared/common.txt');f.put('shared/common.txt','fixed\n');assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/candidate.*current/);});
test('original source head and intent inventory remain byte-bound through intent-only commit',t=>{const f=fixture(t,true);const original={path:f.config,mode:fs.statSync(path.join(f.root,f.config)).mode,digest:sha(fs.readFileSync(path.join(f.root,f.config)))};target(f);git(f.root,'add',f.config);git(f.root,'commit','-qm','intent only');const c=inspectImplementationCandidate(f.input,f.options);assert.equal(candidateCoverageSource(c,f.commit),f.commit);assert.deepEqual(candidateChangedPaths(c,f.commit,[f.config]),[f.config]);assert.deepEqual(candidateCoverageInventory(c,[{...original,digest:'new'}],[original]),[original]);f.put('pom.xml','parent changed');git(f.root,'add','pom.xml');git(f.root,'commit','-qm','shared input changed');assert.throws(()=>candidateCoverageSource(c,f.commit),/coverage.*stale/);});
function packed(f){
 const merge=f.commit;const tracked=execFileSync('git',['diff','--no-ext-diff','--binary','--full-index',merge],{cwd:f.root});const paths=execFileSync('git',['ls-files','-z','--others','--exclude-standard'],{cwd:f.root}).toString().split('\0').filter(Boolean).sort();
 const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;},u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n>>>0);return b;};const chunks=[Buffer.from('YSS-WORKTREE-CANDIDATE-V1\0'),Buffer.from([0x54]),u64(tracked.length),tracked];
 for(const p of paths){const b=fs.readFileSync(path.join(f.root,p)),ref=Buffer.from(p);chunks.push(Buffer.from([0x55]),u64(ref.length),ref,u32(fs.statSync(path.join(f.root,p)).mode),Buffer.from([0x52]),u64(b.length),b);}
 const stream=Buffer.concat(chunks),dir='candidate',ref=dir+'/candidate-manifest.yaml';f.put(dir+'/candidate.bin',stream);f.put(dir+'/tracked.diff',tracked);f.put(ref,{schema_version:1,storage:'packed-stream',candidate_snapshot_ref:ref,candidate_digest:sha(stream),merge_base:merge,snapshot_stream_ref:dir+'/candidate.bin',tracked_diff_ref:dir+'/tracked.diff',untracked_path_bytes:paths.map(p=>Buffer.from(p).toString('base64')),excluded_paths:[]});return {review_mode:'worktree',candidate_snapshot_ref:path.relative(f.options.projectRoot,path.join(f.root,ref)).split(path.sep).join('/'),candidate_digest:sha(stream),slice_contract_ref:f.asset};
}
test('full original packed binary/rename/delete/mode patch stays unchanged while intent changes',t=>{
 const f=fixture(t);f.put('binary.dat',Buffer.from([0,1,2,3]));f.put('delete.txt','old');f.put('.gitignore','candidate/\n');git(f.root,'add','.');git(f.root,'commit','-qm','packed base');f.commit=git(f.root,'rev-parse','HEAD');
 f.put('binary.dat',Buffer.from([0,9,8,7]));fs.renameSync(path.join(f.root,'shared/common.txt'),path.join(f.root,'shared/name with space.txt'));fs.unlinkSync(path.join(f.root,'delete.txt'));fs.chmodSync(path.join(f.root,'apps/backend/demo/src/Main.java'),0o755);f.put('new.dat',Buffer.from([0,17]));
 const options={...f.options,projectRoot:f.root};const asset=JSON.parse(fs.readFileSync(path.join(f.root,f.asset)));asset.scope.project_roots.push('.');asset.scope.implementation_path_policy='external-repository-native';f.put(f.asset,asset);git(f.root,'add',f.asset);git(f.root,'commit','-qm','register root');
 // Registration belongs in the captured baseline, not in the permitted materials.
 f.commit=git(f.root,'rev-parse','HEAD');const captured=packed(f);captured.candidate_snapshot_ref='candidate/candidate-manifest.yaml';const raw=fs.readFileSync(path.join(f.root,'candidate/candidate.bin'));target(f);
 const index=fs.readFileSync(path.join(f.root,'.git/index')),gitBefore=treeSnapshot(path.join(f.root,'.git'));const c=inspectImplementationCandidate(captured,options);assert.deepEqual(fs.readFileSync(path.join(f.root,'candidate/candidate.bin')),raw);assert.deepEqual(fs.readFileSync(path.join(f.root,'.git/index')),index);assert.deepEqual(treeSnapshot(path.join(f.root,'.git')),gitBefore);assert.ok(c);
 f.put('pom.xml','changed outside project');assert.throws(()=>inspectImplementationCandidate(captured,options),/tracked candidate stale/);
});

test('rollback to absent original config permits certified archive only',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.root,f.config));git(f.root,'add',f.config);git(f.root,'commit','-qm','original default with no intent');f.commit=git(f.root,'rev-parse','HEAD');f.input.implementation_candidate_ref=f.commit;f.input.candidate_digest=git(f.root,'rev-parse','HEAD^{tree}');
 const ref='.yss/transactions/'+ 'b'.repeat(32)+'/journal.json';f.put(ref,'synthetic already validated rollback material');fs.chmodSync(path.join(f.root,ref),0o600);f.env.TEST_FILES=JSON.stringify([ref]);
 assert.equal(candidateSourceCommit(inspectImplementationCandidate(f.input,f.options)),f.commit);f.put('.yss/transactions/'+ 'b'.repeat(32)+'/extra.json','unknown');assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/untracked.*stale/);
});
test('external project and old policy never receive an intent exclusion',t=>{
 const f=fixture(t);target(f);const external=path.join(f.base,'external');fs.mkdirSync(external);git(external,'init','-q');git(external,'config','user.name','Fixture');git(external,'config','user.email','fixture@example.invalid');fs.writeFileSync(path.join(external,'file'),'old');git(external,'add','.');git(external,'commit','-qm','baseline');const input={review_mode:'committed',implementation_candidate_ref:git(external,'rev-parse','HEAD'),candidate_digest:git(external,'rev-parse','HEAD^{tree}')};fs.writeFileSync(path.join(external,'progression-target.json'),'{}');assert.throws(()=>inspectImplementationCandidate(input,{...f.options,projectRoot:external}),/untracked.*stale/);
 f.put('.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml','schema_version: 1\n');assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/candidate.*current/);
});
test('architecture base allows only exact intent HEAD movement and current materials',t=>{
 const f=fixture(t);target(f);git(f.root,'add',f.config);git(f.root,'commit','-qm','intent only');assert.ok(inspectCandidateBaseCommit({...f.options,baseCommit:f.commit}));f.put('shared/common.txt','shared parent dependency');git(f.root,'add','shared/common.txt');git(f.root,'commit','-qm','shared changed');assert.throws(()=>inspectCandidateBaseCommit({...f.options,baseCommit:f.commit}),/base commit stale/);
});
test('candidate context rechecks material bytes, binding and permissions',t=>{
 const f=fixture(t);target(f);const c=inspectImplementationCandidate(f.input,f.options);fs.chmodSync(path.join(f.root,f.config),0o600);assert.throws(()=>candidateSourceCommit(c),/material changed/);
});

test('persistent protocol mutex requires a certified archive and exact empty 0600 bytes',t=>{
 const f=fixture(t);target(f);const ref='.yss/transactions/'+ 'c'.repeat(32)+'/journal.json',lock='.yss/transactions/.lock';f.put(ref,'certified protocol archive');fs.chmodSync(path.join(f.root,ref),0o600);f.put(lock,'');fs.chmodSync(path.join(f.root,lock),0o600);f.env.TEST_FILES=JSON.stringify([ref,lock]);assert.ok(inspectImplementationCandidate(f.input,f.options));
 f.put(lock,'unknown lock owner');assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/mutex/);f.put(lock,'');fs.chmodSync(path.join(f.root,lock),0o644);assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/mutex/);fs.chmodSync(path.join(f.root,lock),0o600);f.env.TEST_FILES=JSON.stringify([lock]);assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/mutex/);
});

test('restored source bytes do not refresh the source Git index during readonly verification',t=>{
 const f=fixture(t);f.env.TEST_NATIVE_GIT_STATUS='1';target(f);const source='apps/backend/demo/src/Main.java',original=fs.readFileSync(path.join(f.root,source));f.put(source,'temporary code mutation');assert.throws(()=>inspectImplementationCandidate(f.input,f.options),/candidate.*current/);f.put(source,original);const before=treeSnapshot(path.join(f.root,'.git'));assert.ok(inspectImplementationCandidate(f.input,f.options));assert.deepEqual(treeSnapshot(path.join(f.root,'.git')),before);
});

test('rollback with no tracked diff retains the source index stat cache',t=>{
 const f=fixture(t),source='apps/backend/demo/src/Main.java',original=fs.readFileSync(path.join(f.root,source));const ref='.yss/transactions/'+ 'd'.repeat(32)+'/journal.json';f.put(ref,'certified already rolled back intent archive');fs.chmodSync(path.join(f.root,ref),0o600);f.env.TEST_FILES=JSON.stringify([ref]);f.put(source,'temporary actual code change');f.put(source,original);const before=treeSnapshot(path.join(f.root,'.git'));assert.ok(inspectImplementationCandidate(f.input,f.options));assert.deepEqual(treeSnapshot(path.join(f.root,'.git')),before);
});

test('actual apps capture keeps project-relative untracked paths and full-repo tracked diff',t=>{
 const f=fixture(t),project=f.options.projectRoot,identity='apps/backend/demo/yss-project.yaml';
 f.put(identity,'schema_version: 1\nrepository_mode: project-instance\n');
 assert.throws(()=>captureMaintenanceCandidate({root:project,outputDir:'maintenance:probe'}),/maintenance 引用仅适用于 template-source/);
 // This separate supported producer probe is a template-source project, not a
 // native project-policy workaround or a newly supported capture route.
 f.put(identity,'schema_version: 1\nrepository_mode: template-source\n');git(f.root,'add',identity);git(f.root,'commit','-qm','synthetic source capture identity');
 f.put('pom.xml','captured parent build input');f.put('apps/backend/demo/src/Captured.java','class Captured {}\n');
 const previous=process.env.YSS_RUNTIME_HOME;process.env.YSS_RUNTIME_HOME=path.join(f.base,'runtime');
 try{
  const captured=captureMaintenanceCandidate({root:project,outputDir:'maintenance:probe'});
  const original=inspectMaintenanceCandidate({root:project,manifestPath:resolveMaintenanceReference(captured.manifest_ref,{root:project})});
  assert.deepEqual(original.entries.map(entry=>entry.path),['src/Captured.java']);
  assert.match(original.trackedDiff.toString(),/a\/pom\.xml/);
  assert.equal(original.manifest.workspace_id,sha(project));
 }finally{if(previous===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=previous;}
});

test('proper apps packed candidate preserves project-relative inventory through intent and rollback',t=>{
 const f=fixture(t),project=f.options.projectRoot;
 f.put('pom.xml','original approved parent build change');
 f.put('apps/backend/demo/src/Captured.java','class Captured {}\n');
 const captured=legacyReviewCandidate(project),input={review_mode:'worktree',candidate_snapshot_ref:captured.manifest_ref,candidate_digest:captured.candidate_digest,slice_contract_ref:f.asset};
 const original=inspectMaintenanceCandidate({root:project,manifestPath:path.join(project,captured.manifest_ref)});
 assert.deepEqual(original.entries.map(entry=>entry.path),['src/Captured.java']);assert.match(original.trackedDiff.toString(),/a\/pom\.xml/);
 const streamRef=path.join(project,'.template-source/evidence/maintenance/review/candidate.bin'),stream=fs.readFileSync(streamRef),config=fs.readFileSync(path.join(f.root,f.config));
 const ref='.yss/transactions/'+ 'e'.repeat(32)+'/journal.json';target(f);f.put(ref,'certified applied target archive');fs.chmodSync(path.join(f.root,ref),0o600);f.env.TEST_FILES=JSON.stringify([ref]);
 const verify=()=>{const before=treeSnapshot(path.join(f.root,'.git'));assert.ok(inspectImplementationCandidate(input,f.options));assert.deepEqual(treeSnapshot(path.join(f.root,'.git')),before);assert.deepEqual(fs.readFileSync(streamRef),stream);};
 verify();f.put(f.config,config);verify();
 for(const [ref,bytes] of [['pom.xml','changed captured parent'],['shared/common.txt','changed shared source'],['apps/backend/demo/src/Captured.java','changed captured untracked source'],['outside-new.txt','uncaptured root source']]){
  const absolute=path.join(f.root,ref),before=fs.existsSync(absolute)?fs.readFileSync(absolute):null;f.put(ref,bytes);
  assert.throws(()=>inspectImplementationCandidate(input,f.options),/candidate.*stale|untracked/);
  if(before===null)fs.unlinkSync(absolute);else fs.writeFileSync(absolute,before);
 }
 const file=path.join(project,'src/Captured.java'),mode=fs.statSync(file).mode;fs.chmodSync(file,0o755);assert.throws(()=>inspectImplementationCandidate(input,f.options),/mode\/kind stale/);fs.chmodSync(file,mode&0o777);verify();
});
