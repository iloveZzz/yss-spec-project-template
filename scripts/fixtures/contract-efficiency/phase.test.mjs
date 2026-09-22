import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withValidationPhase,readFileSync,existsSync,readdirSync} from '../../lib/validation-phase.mjs';
test('a validation operation rejects changed bytes and additions, and the next operation reads fresh input',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'validation-phase-'));const file=path.join(root,'source');fs.writeFileSync(file,'old');
 try{
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{assert.equal(readFileSync(file,'utf8'),'old');fs.writeFileSync(file,'new');assert.equal(readFileSync(file,'utf8'),'old');}),/VALIDATION_INPUT_CHANGED/);
  assert.equal(withValidationPhase({root,purpose:'test'},()=>readFileSync(file,'utf8')),'new');
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{existsSync(path.join(root,'missing'));fs.writeFileSync(path.join(root,'missing'),'added');}),/VALIDATION_INPUT_CHANGED/);
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{readdirSync(root);fs.writeFileSync(path.join(root,'another'),'added');}),/VALIDATION_INPUT_CHANGED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
