import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyFirstSliceTests} from '../../lib/first-slice-tests.mjs';
test('an empty, skipped or historical test report cannot prove first slice behavior',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-test-binding-'));
 try {
  const contract={backend:{first_slice:{artifacts:[{role:'test',type:'demo.Behavior',path:'mod/src/test/java/demo/Behavior.java'}]}}};
  const arch={module:'mod',type:'demo.ArchitectureRulesTest'};
  const dir=path.join(root,'mod/target/surefire-reports');fs.mkdirSync(dir,{recursive:true});
  const report=(name,cases)=>fs.writeFileSync(path.join(dir,`TEST-demo.${name}.xml`),`<testsuite>${cases}</testsuite>`);
  const started=Date.now()-1000;
  report('ArchitectureRulesTest','<testcase classname="demo.ArchitectureRulesTest" name="boundaries"/>');
  for(const cases of ['', '<testcase classname="demo.Behavior" name="test"><skipped/></testcase>']) {
   report('Behavior',cases);assert.equal(verifyFirstSliceTests(contract,root,started,arch).status,'failed');
  }
  report('Behavior','<testcase classname="demo.Behavior" name="rejectInvalidState"/>');
  assert.equal(verifyFirstSliceTests(contract,root,started,arch).status,'passed');
  assert.equal(verifyFirstSliceTests(contract,root,Date.now()+1000,arch).status,'failed');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
