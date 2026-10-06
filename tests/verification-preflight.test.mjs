import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verificationPreflight,validateVerificationReportDirectory} from '../.template-source/scripts/lib/verification-preflight.mjs';
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
function preflightWithSubmodules(status) {
  const probe=(file,args)=>({status:0,stdout:file==='python3'?JSON.stringify({version:[3,12],jsonschema:'4.0',executable:'/fixture/python'}):args[0]==='submodule'?status:'',stderr:''});
  return verificationPreflight({root:process.cwd(),nodeVersion:'v24.1.0',environment:{YSS_NATIVE_SOURCE_ROOT:path.resolve('/fixture/fixed-yss-source')},probe,plan:{commands:[]}});
}
test('三个 Agent 固定源已初始化时允许独立 CLI 的未初始化 gitlink',()=>{
  const result=preflightWithSubmodules(`${agentStatus}\n-${fixedSHA} submodules/yss-cli`);
  assert.equal(result.status,'passed',JSON.stringify(result.errors));
  assert.equal(result.observations.find(item=>item.name==='submodule-source').status,'passed');
});
test('仍拒绝必需 Agent 缺失、任意 gitlink 漂移或冲突和未知未初始化源',async t=>{
  const invalid=[
    ...['design','backend','frontend'].map(name=>`${agentStatus}\n-${fixedSHA} submodules/yss-harness-${name}-agent`),
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
