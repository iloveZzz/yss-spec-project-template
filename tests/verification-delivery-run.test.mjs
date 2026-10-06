import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {compileDeliveryPreparationTasks, runDeliveryTask} from '../.template-source/scripts/lib/verification-delivery-run.mjs';

test('固定来源任务使用候选入口并将路径作为数据传给shell',t=>{
  const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'delivery-plan-')));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,"source ' $(touch escaped)"),reportDir=path.join(temp,"report ' $(touch escaped)");fs.mkdirSync(root);
  const module=path.join(root,'.template-source/scripts/lib/verification-delivery-run.mjs');fs.mkdirSync(path.dirname(module),{recursive:true});
  fs.writeFileSync(module,"process.stdout.write(JSON.stringify(process.argv.slice(2)))\n");
  const compiled=compileDeliveryPreparationTasks({strategy:'qualification-shadow',effective_profile:'release'},{root,reportDir});
  const outcome=spawnSync(compiled.tasks[0].command,{cwd:temp,shell:true,encoding:'utf8'});
  assert.equal(outcome.status,0,outcome.stderr);
  const args=JSON.parse(outcome.stdout);
  assert.equal(args[args.indexOf('--root')+1],root);
  assert.equal(args[args.indexOf('--directory')+1],reportDir);
  assert.equal(fs.existsSync(path.join(temp,'escaped')),false,'路径不能执行命令替换');
  assert.throws(()=>compileDeliveryPreparationTasks({strategy:'qualification-shadow'},{root,reportDir:path.join(root,'evidence')}),/源码仓库外/);
});

test('legacy-full准备任务显式登记，清理只删除本轮可写实例',t=>{
  const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'delivery-cleanup-')));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'source'),directory=path.join(temp,'report');fs.mkdirSync(root);fs.mkdirSync(directory);
  const plan={strategy:'legacy-full',commands:[{task_id:'legacy.010',command:'node --test submodules/create-yss-spec/tests/sync-fast-smoke.test.js'},{command:'node .template-source/scripts/verify-cli-upgrade.mjs'}]};
  const prepared=compileDeliveryPreparationTasks(plan,{root,reportDir:directory});
  assert.equal(prepared.tasks.length,9);
  assert.deepEqual(plan.commands[0].depends_on,['check.cli-artifact-consumers']);
  assert.deepEqual(plan.commands[1].depends_on,['check.cli-artifact-consumers']);
  assert.equal(prepared.tasks.some(task=>task.kind==='source-test-consumer'),false);assert.equal(prepared.tasks.filter(task=>task.kind==='artifact-prepare').length,4);assert.equal(prepared.tasks.filter(task=>task.kind==='artifact-migration').length,4);
  const keep=path.join(directory,'artifacts/spec/consumer/package.txt'),discard=path.join(directory,'migration/spec/user.txt');
  for(const file of [keep,discard]){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'evidence');}
  const record=runDeliveryTask({root,directory,action:'cleanup'});
  assert.equal(record.status,'passed');assert.equal(fs.readFileSync(keep,'utf8'),'evidence');assert.equal(fs.existsSync(discard),false);
  assert.throws(()=>runDeliveryTask({root,directory:path.join(root,'escape'),action:'cleanup'}),/源码仓库外/);
});
