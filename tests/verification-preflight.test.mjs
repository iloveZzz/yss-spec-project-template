import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verificationPreflight,validateVerificationReportDirectory} from '../.template-source/scripts/lib/verification-preflight.mjs';
import {PIN_FILE,platformKey} from '../.template-source/scripts/lib/yss-cli-pin.mjs';
test('日常 Node 检查无需 Python 或无关子模块环境',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',environment:{},plan:{strategy:'daily-necessary',commands:[{command:'node --test .template-source/tooling/node/test/plan-spec-quality.test.mjs'}]},probe:()=>{throw new Error('不应探测未选工具');}});
 assert.equal(result.status,'passed',JSON.stringify(result.errors));
 assert.deepEqual(result.observations.map(row=>row.name),['node']);
});
test('日常所选 Schema 检查仍必须具备 Python 环境',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/schema.test.mjs',resources:['python-jsonschema']}]},probe:()=>({status:1,stderr:'missing Python'})});
 assert.equal(result.status,'failed');assert.deepEqual(result.errors.map(row=>row.name),['python-jsonschema']);
});
test('日常 Python 语法检查不要求 jsonschema',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',plan:{strategy:'daily-necessary',commands:[{command:'python3 -c ast'}]},probe:(file,args)=>{assert.equal(file,'python3');assert.ok(!args[1].includes('jsonschema'));return {status:0,stdout:JSON.stringify({version:[3,12],executable:'/fixture/python'})};}});
 assert.equal(result.status,'passed');assert.deepEqual(result.observations.map(row=>row.name),['node','python']);
});
test('日常所选 Go 与原生消费者缺实际工具时提前拒绝',()=>{
 const base={root:process.cwd(),nodeVersion:'v24.21.0',environment:{}};
 const go=verificationPreflight({...base,plan:{strategy:'daily-necessary',commands:[{command:'go test ./...'}]},probe:(file,args)=>{assert.equal(file,'go');assert.deepEqual(args,['version']);return {status:1,stderr:'missing go'};}});
 assert.deepEqual(go.errors.map(row=>row.name),['go']);
 const native=verificationPreflight({...base,plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/cli-retirement.test.mjs',resources:['native-cli']}]},probe:()=>assert.fail('不应启动无关工具')});
 assert.deepEqual(native.errors.map(row=>row.name),['native-cli']);assert.match(native.errors[0].error,/YSS_NATIVE_BINARY/);
});
test('仅选定原型时要求Vue，缺项在昂贵场景前失败',()=>{
  const probe=(file,args)=>({status:0,stdout:file==='python3'?JSON.stringify({version:[3,12],jsonschema:'4.0',executable:'/fixture/python'}):'',stderr:''});
  const base={root:process.cwd(),nodeVersion:'v24.1.0',environment:{},probe};
  assert.equal(verificationPreflight({...base,plan:{commands:[{command:'node simple-test'}]}}).status,'passed');
  const result=verificationPreflight({...base,plan:{commands:[{command:'scripts/verify-yss-prototype-contract-scenarios'}]}});
  assert.equal(result.status,'failed');assert.match(result.errors[0].error,/YSS_VUE_TOOLCHAIN/);
  assert.equal(verificationPreflight({...base,nodeVersion:'v22.0.0',plan:{commands:[]}}).status,'failed');
});
test('报告目录拒绝仓内、已有目录和符号链接逃逸',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verification-preflight-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'root');fs.mkdirSync(root);
  assert.throws(()=>validateVerificationReportDirectory(root,path.join(root,'report')),/仓库外/);
  assert.throws(()=>validateVerificationReportDirectory(root,root),/新目录/);
  fs.symlinkSync(root,path.join(temp,'link'));
  assert.throws(()=>validateVerificationReportDirectory(root,path.join(temp,'link/report')),/仓库外/);
  assert.equal(validateVerificationReportDirectory(root,path.join(temp,'new')),path.join(temp,'new'));
});

const fixedSHA='a'.repeat(40);
const agentStatus=['design','backend','frontend'].map(name=>` ${fixedSHA} submodules/yss-harness-${name}-agent`).join('\n');
test('日常只查所选子模块，允许当前 SHA，拒绝未初始化或冲突',()=>{
 for(const prefix of [' ','+','-','U']){
  const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.1.0',plan:{strategy:'daily-necessary',commands:[{command:'go -C submodules/yss-harness-design-agent test ./internal/bundle'}]},probe:(file,args)=>{if(file==='go')return {status:0,stdout:'go version'};assert.equal(file,'git');assert.deepEqual(args,['submodule','status','--recursive','--','submodules/yss-harness-design-agent']);return {status:0,stdout:`${prefix}${fixedSHA} submodules/yss-harness-design-agent`};}});
  assert.equal(result.status,['-','U'].includes(prefix)?'failed':'passed');
 }
});
function preflightWithSubmodules(status) {
  const probe=(file,args)=>({status:0,stdout:file==='python3'?JSON.stringify({version:[3,12],jsonschema:'4.0',executable:'/fixture/python'}):args[0]==='submodule'?status:'',stderr:''});
  return verificationPreflight({root:process.cwd(),nodeVersion:'v24.1.0',environment:{YSS_NATIVE_SOURCE_ROOT:path.resolve('/fixture/fixed-yss-source')},probe,plan:{commands:[]}});
}
test('三个 Agent 固定源已初始化时通过；yss-cli 不再是 submodule，没有例外',()=>{
  const result=preflightWithSubmodules(agentStatus);
  assert.equal(result.status,'passed',JSON.stringify(result.errors));
  assert.equal(result.observations.find(item=>item.name==='submodule-source').status,'passed');
});
test('仍拒绝必需 Agent 缺失、任意 gitlink 漂移或冲突和未知未初始化源',async t=>{
  const invalid=[
    ...['design','backend','frontend'].map(name=>`${agentStatus}\n-${fixedSHA} submodules/yss-harness-${name}-agent`),
    `${agentStatus}\n-${fixedSHA} submodules/yss-cli`,
    `${agentStatus}\n+${fixedSHA} submodules/yss-cli`,
    `${agentStatus}\nU${fixedSHA} submodules/yss-cli`,
    `${agentStatus}\n+${fixedSHA} submodules/yss-harness-design-agent`,
    `${agentStatus}\nU${fixedSHA} submodules/yss-harness-backend-agent`,
    `${agentStatus}\n-${fixedSHA} submodules/unknown-source`,
    `${agentStatus}\n-${fixedSHA} submodules/yss-cli/nested-source`,
    `${agentStatus}\n-${fixedSHA} submodules/yss-cli-extra`,
    `${agentStatus}\n-bad-sha submodules/yss-cli`,
  ];
  for(const [index,status] of invalid.entries())await t.test(`invalid state ${index+1}`,()=>{
    const result=preflightWithSubmodules(status);
    assert.equal(result.status,'failed');
    assert.deepEqual(result.errors.map(item=>item.name),['submodule-source']);
    assert.match(result.errors[0].error,/子模块未初始化或与 gitlink 不匹配/);
  });
});

test('原生消费者的二进制必须与固定文件一致，本地联调可显式覆盖且 CI 不接受',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verification-pin-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const write=(name,bytes)=>{const file=path.join(temp,name);fs.writeFileSync(file,bytes,{mode:0o755});return file;};
  const pinned=write('pinned','pinned bytes'),other=write('other','other bytes');
  fs.mkdirSync(path.join(temp,'.template-source/distribution'),{recursive:true});
  fs.writeFileSync(path.join(temp,PIN_FILE),JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:'c'.repeat(40),go_version:'1.27.1',build:'go build',binaries:{[platformKey()]:{sha256:sha('pinned bytes')}}}));
  const run=(binary,extra={})=>verificationPreflight({root:temp,nodeVersion:'v24.21.0',environment:{YSS_NATIVE_BINARY:binary,...extra},plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/cli-retirement.test.mjs',resources:['native-cli']}]},probe:()=>assert.fail('不应启动无关工具')});
  const ok=run(pinned);
  assert.equal(ok.status,'passed',JSON.stringify(ok.errors));assert.equal(ok.observations.find(item=>item.name==='native-cli').observed.pin.pinned,true);
  const bad=run(other);
  assert.deepEqual(bad.errors.map(item=>item.name),['native-cli']);assert.match(bad.errors[0].error,/与固定版本不符/);
  const local=run(other,{YSS_NATIVE_BINARY_OVERRIDE:'1'});
  assert.equal(local.status,'passed');assert.equal(local.observations.find(item=>item.name==='native-cli').observed.pin.pinned,false);
  const ci=run(other,{YSS_NATIVE_BINARY_OVERRIDE:'1',CI:'true'});
  assert.match(ci.errors[0].error,/CI 不接受覆盖/);
});
