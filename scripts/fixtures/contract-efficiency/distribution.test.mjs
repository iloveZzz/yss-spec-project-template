import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {stringify} from '../../vendor/yaml.mjs';
test('design/backend/frontend receivers expose identical review and task constraints using original YAML',()=>{
 const f=pilotFixture();try{
 f.write('slice.yaml',stringify({slice_contract:f.contract}));
 let expected;
 for(const receiver of ['.','submodules/yss-harness-design-agent','submodules/yss-harness-backend-agent','submodules/yss-harness-frontend-agent']){
  for(const profile of ['review','task']){
   const args=[path.resolve(receiver,'scripts/contract'),'view','slice.yaml','--kind','slice','--profile',profile,'--unit','work-unit.slice-backend','--root',f.root,'--json'];
   const result=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(result.status,0,`${receiver}: ${result.stderr}`);
   const view=JSON.parse(result.stdout);assert.equal(view.execution_allowed,false);assert.match(view.markdown,/AC-1/);
   if(profile==='task'){const content=JSON.stringify(view.content);if(expected)assert.equal(content,expected);else expected=content;}
  }
  for(const ref of ['scripts/lib/validation-phase.mjs','scripts/lib/api-contract-decision.mjs','.template-spec/process/schemas/api-contract-decision-v2.schema.json'])assert.deepEqual(fs.readFileSync(path.join(receiver,ref)),fs.readFileSync(ref));
 }
 }finally{f.cleanup();}
});
