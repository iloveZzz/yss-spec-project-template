import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkNativeContext, contextExecution, decodeContext} from '../scripts/lib/native-context.mjs';
import {parseContextContract,resolveContextTermRefs} from '../scripts/lib/context-contract.mjs';
import {initializeNative} from '../.template-source/scripts/lib/native-yss.mjs';

test('原生 Context 返回可消费的空术语快照，旧参数转为明确原生参数',t=>{
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'context-native-'))),root=path.join(base,'instance');
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  initializeNative('spec',root);
  assert.equal(fs.existsSync(path.join(root,'CONTEXT.md')),false,'Spec 3.0 初始化不生成用户术语');
  fs.writeFileSync(path.join(root,'CONTEXT.md'),`---
context_schema_version: 1
---
# CONTEXT
## 流程术语
| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
## 业务术语
| 术语 | 含义 | 英文标识 | 适用限界上下文 | 避免 / 备注 |
|---|---|---|---|---|
`);
  const result=checkNativeContext({root});
  assert.deepEqual(result.context_snapshot.term_refs,[]);
  assert.equal(result.context_snapshot.referenced_terms_digest,'sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945');
  const execution=contextExecution(root,['--root','.', '--allowed-context','Reporting','--term-ref','Reporting/Report','--term-ref','Reporting/Report','--json']);
  assert.ok(execution.args.includes('--allowed-context-ids'));
  assert.equal(execution.args[execution.args.indexOf('--term-refs')+1],'Reporting/Report,Reporting/Report');
  assert.throws(()=>contextExecution(root,['--unknown']),/参数/);
  assert.throws(()=>contextExecution(root,['--term-ref','Global/A,Global/B']),/CSV/);
  assert.throws(()=>contextExecution(root,['--root','.', '--root','.']),/重复参数/);
});

test('Context transport 拒绝伪成功、旧能力、错误协议和异常退出',()=>{
  const success={outputVersion:1,protocolVersion:1,command:'context',status:'ok',code:'OK',result:{context_snapshot:{context_ref:'CONTEXT.md',context_schema_version:1,document_digest:'sha256:'+'a'.repeat(64),referenced_terms_digest:'sha256:'+'b'.repeat(64),term_refs:[]}}};
  assert.equal(decodeContext({status:0,stdout:JSON.stringify(success)}).context_snapshot.term_refs.length,0);
  for(const envelope of [{...success,protocolVersion:2},{...success,command:'doctor'},{...success,code:'CONTEXT'},{...success,result:{}},{...success,result:{context_snapshot:{}}}]){
    assert.throws(()=>decodeContext({status:0,stdout:JSON.stringify(envelope)}),/CONTEXT_NATIVE_(PROTOCOL|CAPABILITY)/);
  }
  assert.throws(()=>decodeContext({status:1,stdout:JSON.stringify(success)}),/PROTOCOL/);
  assert.throws(()=>decodeContext({status:null,signal:'SIGTERM',stdout:''}),/INTERRUPTED/);
  assert.throws(()=>decodeContext({status:0,stdout:'not json'}),/PROTOCOL/);
  assert.throws(()=>decodeContext({status:1,stdout:JSON.stringify({...success,status:'error',code:'CONTEXT',result:{message:'拒绝'}})}),/CONTEXT.*拒绝/);
});

test('Context transport 不回退缺失二进制，拒绝链接及固定摘要漂移',t=>{
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'context-binary-')));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  assert.throws(()=>contextExecution(base,[],{PATH:''}),/UNAVAILABLE/);
  fs.writeFileSync(path.join(base,'binary'),'original');
  assert.throws(()=>contextExecution(base,[],{YSS_NATIVE_BINARY:path.join(base,'binary'),YSS_NATIVE_BINARY_SHA256:'0'.repeat(64)}),/DRIFT/);
  fs.symlinkSync(path.join(base,'binary'),path.join(base,'link'));
  assert.throws(()=>contextExecution(base,[],{YSS_NATIVE_BINARY:path.join(base,'link')}),/INVALID/);
});

test('旧入口与原生快照摘要等价：空集合、重复引用、非ASCII正文与失效快照',t=>{
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'context-equivalence-')));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  fs.writeFileSync(path.join(base,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  fs.writeFileSync(path.join(base,'CONTEXT.md'),`---
context_schema_version: 1
---
# CONTEXT
## 流程术语
| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
| 阶段 | 生命周期阶段 | — | |
## 业务术语
| 术语 | 含义 | 英文标识 | 适用限界上下文 | 避免 / 备注 |
|---|---|---|---|---|
| 客户😀 | 组织与个人 é 日本語 <标签> | Customer | Global | 避免：客户方、顾客 |
| 准入 | 合规结论 | Admission | Reporting | |
`);
  for(const termRefs of [[],['Global/Customer'],['Reporting/Admission','Global/Customer','Global/Customer']]){
    const contract=parseContextContract({root:base}),resolved=resolveContextTermRefs(contract,termRefs);
    const expected={context_ref:contract.context_ref,context_schema_version:contract.context_schema_version,document_digest:contract.document_digest,referenced_terms_digest:resolved.referenced_terms_digest,term_refs:resolved.terms.map(term=>term.term_ref)};
    const actual=checkNativeContext({root:base,termRefs}).context_snapshot;
    assert.deepEqual(actual,expected);
    fs.writeFileSync(path.join(base,'snapshot.json'),JSON.stringify({...actual,document_digest:'sha256:'+'0'.repeat(64)}));
    const rejected=spawnSync(process.env.YSS_NATIVE_BINARY,['context','verify','--root',base,'--snapshot','snapshot.json','--json'],{encoding:'utf8'});
    assert.equal(rejected.status,1,rejected.stdout);
    assert.equal(JSON.parse(rejected.stdout).code,'CONTEXT_SNAPSHOT_STALE');
  }
});

test('历史 Context 检查记录实际原生执行并拒绝退出0的错误协议',async t=>{
  const {compileTaskExecution}=await import('../.template-source/scripts/lib/verification-execution-plan.mjs');
  const {runCommandToFiles}=await import('../scripts/lib/template-verification-runner.mjs');
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'context-history-')));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  // Execute against a real, isolated Context. A source oracle can contain the
  // full specialist dependency trees without Git gitlink metadata; those
  // nested Context documents must not turn this protocol test into a root scan.
  const project=path.join(base,'project');fs.mkdirSync(project);
  fs.writeFileSync(path.join(project,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  fs.copyFileSync(path.resolve(import.meta.dirname,'../CONTEXT.md'),path.join(project,'CONTEXT.md'));
  const command=`scripts/verify-context-contract --root ${project} --json`,task={command,task_id:'legacy.057',id:'check.1451647ba2722b30'};
  const execution=compileTaskExecution(task,{root:process.cwd()});
  assert.equal(execution.file,process.env.YSS_NATIVE_BINARY);
  assert.deepEqual(execution.args,['context','check','--root',project,'--json']);
  assert.equal(execution.source_bindings.target,'scripts/lib/native-context.mjs');
  assert.equal(execution.protocol,'context-envelope-v1');
  const valid=await runCommandToFiles(command,{cwd:process.cwd(),execution,logRoot:base,sequence:'native'});
  assert.equal(valid.code,0,valid.error);assert.equal(valid.actual_exit_code,0);
  const nested=path.join(project,'nested');fs.mkdirSync(nested);fs.copyFileSync(path.join(project,'CONTEXT.md'),path.join(nested,'CONTEXT.md'));
  const duplicate=spawnSync(process.env.YSS_NATIVE_BINARY,['context','check','--root',project,'--json'],{encoding:'utf8'});
  assert.equal(duplicate.status,1,duplicate.stdout);assert.match(duplicate.stdout,/禁止嵌套 CONTEXT/);
  fs.rmSync(nested,{recursive:true,force:true});
  const fake=path.join(base,'fake');fs.writeFileSync(fake,'#!/usr/bin/env node\nconsole.log("{\\"status\\":\\"ok\\"}");\n');fs.chmodSync(fake,0o755);
  const invalid=contextExecution(base,[],{...process.env,YSS_NATIVE_BINARY:fake,YSS_NATIVE_BINARY_SHA256:''});invalid.requested_command=command;
  const rejected=await runCommandToFiles(command,{cwd:base,execution:invalid,logRoot:base,sequence:'invalid'});
  assert.equal(rejected.actual_exit_code,0);assert.equal(rejected.code,1);assert.match(rejected.error,/PROTOCOL/);
});

test('插件复用的原生调用层核验命令协议、实际退出及执行时二进制漂移',async t=>{
  const {invoke}=await import('../.template-source/plugins/yss-backend-delivery/native-tool.mjs');
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'context-plugin-protocol-')));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const file=path.join(base,'binary');
  const success={outputVersion:1,protocolVersion:1,command:'context',status:'ok',code:'OK',result:{}};
  for(const [envelope,exit,mutate] of [[{...success,command:'doctor'},0,false],[{...success,protocolVersion:2},0,false],[success,1,false],[success,0,true]]) {
    fs.writeFileSync(file,`#!/usr/bin/env node\n${mutate?"require('node:fs').appendFileSync(__filename,'// changed\\n');":""}\nconsole.log(${JSON.stringify(JSON.stringify(envelope))});process.exit(${exit});\n`);fs.chmodSync(file,0o755);
    assert.throws(()=>invoke(file,['context','check']),/native-(protocol|binary)/);
  }
});
