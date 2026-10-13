import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyLegacyManifest,compileLegacyPlan,loadLegacyManifest,readHistoricalProfiles,compileHistoricalVerificationPlan} from '../.template-source/scripts/lib/legacy-verification.mjs';
const root=new URL('..',import.meta.url).pathname;
// 固定包含历史 manifest、迁移映射和 legacy_coverage 的提交；当前 HEAD 已退役这些资产。
const commit='0abbe49ee4cfd8608beab95243520888228dad41';
const manifest=loadLegacyManifest(root,commit);
test('历史只读台账保留117原任务及115语法责任，显式绑定固定提交',t=>{
  verifyLegacyManifest(root,manifest);
  const plan=compileLegacyPlan(manifest);assert.equal(plan.commands.length,117);assert.equal(plan.syntax_files.length,115);
  assert.equal(new Set(plan.commands.map(row=>row.task_id)).size,117);
  assert.throws(()=>loadLegacyManifest(root),/完整 SHA/);
  assert.throws(()=>readHistoricalProfiles(root,'HEAD'),/完整 SHA/);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'legacy-history-head-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  execFileSync('git',['clone','--shared','--no-checkout','--quiet',root,directory]);
  const git=(args,input)=>execFileSync('git',args,{cwd:directory,encoding:'utf8',input}).trim();
  // 仅在临时副本创建删除所有资产的后继提交，历史读取必须仍绑定旧提交。
  const tree=git(['mktree'],''),head=git(['-c','user.name=History fixture','-c','user.email=history-fixture@example.invalid','commit-tree',tree,'-p',commit,'-m','Retire historical assets']);
  git(['update-ref','HEAD',head]);assert.equal(git(['rev-parse','HEAD']),head);assert.notEqual(head,commit);
  assert.equal(git(['ls-tree','-r','--name-only','HEAD']),'');
  assert.throws(()=>loadLegacyManifest(directory,head),/does not exist/);
  assert.throws(()=>readHistoricalProfiles(directory,head),/does not exist/);
  assert.deepEqual(loadLegacyManifest(directory,commit),manifest);
  assert.equal(readHistoricalProfiles(directory,commit).legacy_coverage.length,117);
  assert.equal(compileHistoricalVerificationPlan({root:directory,commit}).commands.length,117);
});
test('历史映射被裁剪或命令篡改仍拒绝，现役策略不参与历史编译',()=>{
  const altered=structuredClone(manifest);altered.commands.pop();assert.throws(()=>verifyLegacyManifest(root,altered),/不等价/);
  const tampered=structuredClone(manifest);tampered.commands[0].run='true';assert.throws(()=>verifyLegacyManifest(root,tampered),/不等价/);
  const config=readHistoricalProfiles(root,commit),plan=compileHistoricalVerificationPlan({root,commit,config});
  assert.equal(plan.commands.length,117);assert.equal(plan.strategy,'legacy-full');
  config.gate_policy.activation='qualified-gates';assert.throws(()=>compileHistoricalVerificationPlan({root,commit,config}),/HISTORICAL_QUALIFIED_BASELINE_REFUSED/);
});
