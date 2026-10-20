import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withValidationPhase,registerValidationTransport,readdirSync,atValidationFinish,readFileSync,validationDependencies,verifyValidationDependencies} from '../scripts/lib/validation-phase.mjs';
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

import {pathToFileURL} from 'node:url';
import {hash} from '../scripts/lib/strategic-handoff-io.mjs';

async function designFixture(t) {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'design-receipt-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const library=new URL('../scripts/lib/',import.meta.url);
  const io=path.join(root,'io.mjs');
  fs.writeFileSync(io,`export {read,safe,ensure,hash} from ${JSON.stringify(new URL('strategic-handoff-io.mjs',library).href)}; export const ROOT=${JSON.stringify(root)};`);
  let source=fs.readFileSync(new URL('technical-design-boundary.mjs',library),'utf8');
  source=source.replace(/from '(\.\/[^']+)'/g,(_,ref)=>`from ${JSON.stringify(ref==='./strategic-handoff-io.mjs'?pathToFileURL(io).href:new URL(ref,library).href)}`);
  const module=path.join(root,'boundary.mjs');fs.writeFileSync(module,source);
  const child=path.join(root,'.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs');
  fs.mkdirSync(path.dirname(child),{recursive:true});
  fs.writeFileSync(child,`import fs from 'node:fs';import {createHash} from 'node:crypto';
const file=process.argv[2],digest=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
process.stdout.write(JSON.stringify({validation_dependencies:{schema_version:1,files:[{file,digest}],observations:Array.from({length:30000},()=>({file,kind:'exists',value:true}))}}));`);
  const file=path.join(root,'design.json');
  fs.writeFileSync(file,JSON.stringify({schema_version:2,status:'approved',version:'v1',architecture:{family:'layered-mvc'}}));
  const state={technical_design:{ref:'design.json',version:'v1',digest:hash(fs.readFileSync(file))},slice_id:'receipt-case',architecture_identity:{architecture_family:'layered-mvc'}};
  return {root,file,child,state,enforce:(await import(pathToFileURL(module))).enforceTechnicalDesign};
}

test('technical-design subprocess returns a dependency receipt larger than 2 MiB intact',async t=>{
  const f=await designFixture(t);
  withValidationPhase({root:f.root,purpose:'large-design-receipt'},()=>{
    f.enforce(f.state,{root:f.root,readOnly:true});
    assert(validationDependencies().files.some(row=>row.file===f.file));
  });
});

test('a large child receipt still detects a source edit before the parent phase returns',async t=>{
  const f=await designFixture(t);
  assert.throws(()=>withValidationPhase({root:f.root,purpose:'large-design-receipt'},()=>{
    f.enforce(f.state,{root:f.root,readOnly:true});
    fs.writeFileSync(f.file,'changed after verification');
  }),/VALIDATION_INPUT_CHANGED/);
});

test('a rejected design child still blocks the compiler boundary',async t=>{
  const f=await designFixture(t);
  fs.writeFileSync(f.child,"process.stderr.write('controlled design rejection');process.exit(2);");
  assert.throws(()=>withValidationPhase({root:f.root,purpose:'rejected-design'},()=>f.enforce(f.state,{root:f.root,readOnly:true})),/controlled design rejection/);
});

// Overlay filesystems can expose 64-bit inode identities beyond Number's range.
test('native inode receipts compare lossless 64-bit identities',t=>{
 const root=fixture(t),original=fs.lstatSync,ino=9223372036855891836n;
 const mocked=t.mock.method(fs,'lstatSync',(file,options)=>{const stat=original(file,options);if(file===root)stat.ino=options?.bigint?ino:Number(ino);return stat;});
 const stat=original(root,{bigint:true});
 assert.doesNotThrow(()=>verifyValidationDependencies({schema_version:1,files:[],observations:[{file:root,kind:'stat',value:{type:'directory',permissions:Number(stat.mode&0o7777n),ino:String(ino),dev:String(stat.dev)}}]}));
 mocked.mock.restore();
});

test('native unsigned inode receipts match signed libuv 64-bit stats',t=>{
 const root=fixture(t),original=fs.lstatSync,ino=9223372036855891836n;
 t.mock.method(fs,'lstatSync',(file,options)=>{const stat=original(file,options);if(file===root)stat.ino=options?.bigint?BigInt.asIntN(64,ino):Number(BigInt.asIntN(64,ino));return stat;});
 const stat=original(root,{bigint:true});
 assert.doesNotThrow(()=>verifyValidationDependencies({schema_version:1,files:[],observations:[{file:root,kind:'stat',value:{type:'directory',permissions:Number(stat.mode&0o7777n),ino:String(ino),dev:String(stat.dev)}}]}));
 assert.throws(()=>verifyValidationDependencies({schema_version:1,files:[],observations:[{file:root,kind:'stat',value:{ino:String(ino+1n),type:'directory',permissions:Number(stat.mode&0o7777n)}}]}),/VALIDATION_INPUT_CHANGED/);
});
