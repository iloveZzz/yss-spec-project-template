import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withValidationPhase,readFileSync,existsSync,readdirSync,atValidationFinish} from '../../lib/validation-phase.mjs';
test('a validation operation rejects changed bytes and additions, and the next operation reads fresh input',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'validation-phase-'));const file=path.join(root,'source');fs.writeFileSync(file,'old');
 try{
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{assert.equal(readFileSync(file,'utf8'),'old');fs.writeFileSync(file,'new');assert.equal(readFileSync(file,'utf8'),'old');}),/VALIDATION_INPUT_CHANGED/);
  assert.equal(withValidationPhase({root,purpose:'test'},()=>readFileSync(file,'utf8')),'new');
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{existsSync(path.join(root,'missing'));fs.writeFileSync(path.join(root,'missing'),'added');}),/VALIDATION_INPUT_CHANGED/);
  assert.throws(()=>withValidationPhase({root,purpose:'test'},()=>{readdirSync(root);fs.writeFileSync(path.join(root,'another'),'added');}),/VALIDATION_INPUT_CHANGED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fixed finish checks wait for the outer phase and clean up on success, failure and cancellation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'validation-finish-'));
 try{
  const events=[];
  withValidationPhase({root,purpose:'parent'},()=>{
   withValidationPhase({root,purpose:'child'},()=>atValidationFinish(()=>events.push('verify'),()=>events.push('cleanup')));
   assert.deepEqual(events,[]);events.push('parent-complete');
  });
  assert.deepEqual(events,['parent-complete','verify','cleanup']);
  for(const stage of ['action','check','cancel']){
   const controller=new AbortController();let cleaned=0;
   assert.throws(()=>withValidationPhase({root,purpose:'parent',signal:controller.signal},()=>{
    withValidationPhase({root,purpose:'child'},()=>atValidationFinish(()=>{if(stage==='check')throw Error('observed git changed');},()=>cleaned++));
    if(stage==='action')throw Error('consumer rejected');if(stage==='cancel')controller.abort();
   }),stage==='check'?/observed git changed/:stage==='action'?/consumer rejected/:/VALIDATION_CANCELLED/);
   assert.equal(cleaned,1);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('all cleanup callbacks run and primary errors survive a cleanup failure',()=>{
 for(const stage of ['success','action','check']){
  const events=[],primary=Error(stage+' primary'),cleanupFailure=Error('cleanup failure');
  assert.throws(()=>withValidationPhase({purpose:'cleanup-errors'},()=>{
   atValidationFinish(()=>{if(stage==='check')throw primary;},()=>events.push('first'));
   atValidationFinish(()=>{},()=>{events.push('second');throw cleanupFailure;});
   if(stage==='action')throw primary;
  }),error=>error===(stage==='success'?cleanupFailure:primary));
  assert.deepEqual(events,['second','first']);
  assert.doesNotThrow(()=>withValidationPhase({purpose:'next'},()=>{}));
 }
});

test('falsy thrown values and rejected promises survive cleanup failure',async()=>{
 for(const value of [undefined,null,0,false]){
  let caught=false;
  try{withValidationPhase({purpose:'falsy'},()=>{atValidationFinish(()=>{},()=>{throw Error('cleanup');});throw value;});}catch(error){caught=true;assert.equal(error,value);}
  assert.equal(caught,true);
  caught=false;
  try{await withValidationPhase({purpose:'falsy-async'},()=>{atValidationFinish(()=>{},()=>{throw Error('cleanup');});return Promise.reject(value);});}catch(error){caught=true;assert.equal(error,value);}
  assert.equal(caught,true);
 }
});
