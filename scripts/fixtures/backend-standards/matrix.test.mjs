import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('matrix subset excludes unrequested candidates without calling them passed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-subset-'));
 try {
  const combination='spring-boot-2.7-jdk8:2.7.18:domain-driven';
  const result=spawnSync(process.execPath,['scripts/verify-backend-platform-matrix','--evidence-dir',root,'--require-combination',combination],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(result.status,1,result.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(root,'platform-matrix.json')));
  assert.equal(report.scope,'required-combinations');assert.equal(report.status,'blocked');
  assert.equal(report.combinations.filter(row=>row.required).length,1);
  assert.ok(report.combinations.filter(row=>!row.required).every(row=>row.status==='not-executed'&&!row.blockers.length));
  assert.ok(report.combinations.find(row=>row.required).blockers.some(x=>x.includes('contract')));
  assert.notEqual(spawnSync(process.execPath,['scripts/verify-backend-platform-matrix','--evidence-dir',root,'--require-combination','unknown']).status,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
