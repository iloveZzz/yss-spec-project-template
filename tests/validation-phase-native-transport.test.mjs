import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withValidationPhase,registerValidationTransport,readdirSync,atValidationFinish,readFileSync} from '../scripts/lib/validation-phase.mjs';
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'owned-transport-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function transport(root){const work=path.join(root,'.work'),base=path.join(work,'native-candidates'),directory=path.join(base,'input-1-12345678-1234-1234-1234-123456789abc'),created=[];for(const ref of [work,base,directory])if(!fs.existsSync(ref)){fs.mkdirSync(ref);created.push(ref);}registerValidationTransport(directory,created);atValidationFinish(()=>{},()=>{fs.rmSync(directory,{recursive:true,force:true});for(const ref of created.slice(0,-1).reverse())if(fs.existsSync(ref)&&!fs.readdirSync(ref).length)fs.rmdirSync(ref);});return {directory,base};}

test('nested native transport does not become a business directory dependency',t=>{
 const root=fixture(t);
 assert.doesNotThrow(()=>withValidationPhase({root,purpose:'outer'},()=>{
  assert.deepEqual(readdirSync(root),[]);
  withValidationPhase({root,purpose:'native'},()=>{const {directory}=transport(root);fs.writeFileSync(path.join(directory,'candidate.json'),'{}');});
  assert.deepEqual(readdirSync(root),[]);
 }));
 assert.deepEqual(fs.readdirSync(root),[]);
});
test('transport exclusions preserve ordinary file and directory freshness checks',t=>{
 const root=fixture(t),work=path.join(root,'.work');fs.mkdirSync(work);fs.writeFileSync(path.join(work,'source.txt'),'original');
 assert.throws(()=>withValidationPhase({root,purpose:'outer'},()=>{
  readFileSync(path.join(work,'source.txt'));readdirSync(work);
  withValidationPhase({root,purpose:'native'},()=>transport(root));
  fs.writeFileSync(path.join(work,'source.txt'),'user edit');
 }),/VALIDATION_INPUT_CHANGED/);
 assert.equal(fs.readFileSync(path.join(work,'source.txt'),'utf8'),'user edit');
});
test('a concurrent file in a newly created transport parent is preserved and detected',t=>{
 const root=fixture(t);let foreign;
 assert.throws(()=>withValidationPhase({root,purpose:'outer'},()=>{
  readdirSync(root);
  withValidationPhase({root,purpose:'native'},()=>{const {base}=transport(root);foreign=path.join(base,'user.txt');fs.writeFileSync(foreign,'user edit');});
 }),/VALIDATION_INPUT_CHANGED/);
 assert.equal(fs.readFileSync(foreign,'utf8'),'user edit');
});
