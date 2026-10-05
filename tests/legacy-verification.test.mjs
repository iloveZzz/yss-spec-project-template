import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyLegacyManifest,compileLegacyPlan,loadLegacyReferenceRunner} from '../.template-source/scripts/lib/legacy-verification.mjs';
const root=new URL('..',import.meta.url).pathname;
const manifest=JSON.parse(fs.readFileSync(new URL('../.template-source/process/template-verification-legacy.json',import.meta.url)));
test('legacy参考完整保留117原任务及115语法启动，不依赖新选择器',async()=>{
  verifyLegacyManifest(root,manifest);
  const plan=compileLegacyPlan(manifest);assert.equal(plan.commands.length,117);assert.equal(plan.syntax_files.length,115);
  assert.equal(new Set(plan.commands.map(row=>row.task_id)).size,117);
  const reference=await loadLegacyReferenceRunner(root,manifest);assert.equal(typeof reference.runGroups,'function');assert.match(reference.binding.runner_sha256,/^[a-f0-9]{64}$/);reference.dispose();
});
test('legacy映射被裁剪或命令篡改时拒绝执行',()=>{
  const altered=structuredClone(manifest);altered.commands.pop();assert.throws(()=>verifyLegacyManifest(root,altered),/不等价/);
  const tampered=structuredClone(manifest);tampered.commands[0].run='true';assert.throws(()=>verifyLegacyManifest(root,tampered),/不等价/);
});

test('冻结旧runner监督当前候选真实子进程，不经过新selector',async()=>{
  const reference=await loadLegacyReferenceRunner(root,manifest),directory=fs.mkdtempSync(path.join(os.tmpdir(),'legacy-reference-process-'));
  try{
    const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
    const command=`${quote(process.execPath)} -e ${quote('console.log("legacy observed")')}`;
    const results=await reference.runGroups({groups:['reference'],commands:[{id:'reference.actual',group:'reference',command}]},'template-source',1,{cwd:root,logRoot:directory});
    const row=results[0].results[0];assert.equal(row.actual_exit_code,0);assert.equal(row.actual_exit_code_observed,true);assert.match(fs.readFileSync(row.stdoutFile,'utf8'),/legacy observed/);
  }finally{reference.dispose();fs.rmSync(directory,{recursive:true,force:true});}
});
