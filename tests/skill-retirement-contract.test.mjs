import test from 'node:test';
import assert from 'node:assert/strict';

const v2=(ids)=>({skills:[],platform_skills:[],external_skills:[],retirement_contract:{schema_version:2,stages:['deprecated','retired'],deprecated_new_use:'forbidden',cleanup_statuses:['migration-only','remove-ready'],hard_retirement_tombstone:'.template-spec/agents/skill-migrations.md',retired_id_source:'.template-spec/agents/yss-skill-registry.yaml#/retirement_contract/retired_ids',failure_codes:{deprecated:'skill-deprecated',retired:'skill-retired'},retired_ids:ids}});
test('v2 retirement reads its explicit data without consulting legacy data',async()=>{
 const {readRetirementContract}=await import('../scripts/lib/skill-retirement-contract.mjs');
 const legacy={get legacyIds(){throw new Error('legacy accessed');}};
 assert.deepEqual([...readRetirementContract(v2(['research']),legacy)],['research']);
 assert.equal(readRetirementContract(v2([]),legacy).size,0);
});

test('malformed retirement data never falls back to an available legacy set',async()=>{
 const {readRetirementContract}=await import('../scripts/lib/skill-retirement-contract.mjs');
 const legacyIds=new Set(['safe-old']);
 const bad=[null,{}, {...v2([]).retirement_contract,schema_version:7}, {...v2([]).retirement_contract,extra:true}];
 for(const ids of [null,undefined,'research',[3],['Bad'],['research','research']])bad.push({...v2([]).retirement_contract,retired_ids:ids});
 for(const [key,value] of [['stages',['retired']],['deprecated_new_use','allowed'],['cleanup_statuses',[]],['hard_retirement_tombstone','other'],['retired_id_source','legacy'],['failure_codes',{deprecated:'changed',retired:'skill-retired'}]])bad.push({...v2([]).retirement_contract,[key]:value});
 for(const retirement_contract of bad)assert.throws(()=>readRetirementContract({retirement_contract},{legacyIds}),TypeError,JSON.stringify(retirement_contract));
});
test('legacy contract is explicit and returns an independent set',async()=>{
 const {readRetirementContract}=await import('../scripts/lib/skill-retirement-contract.mjs');
 const legacyIds=new Set(['research']),registry=v2([]);delete registry.retirement_contract.retired_ids;
 Object.assign(registry.retirement_contract,{schema_version:1,retired_id_source:'scripts/lib/skill-supply-chain.mjs#OBSOLETE'});
 assert.deepEqual([...readRetirementContract(registry,{legacyIds})],['research']);
 readRetirementContract(registry,{legacyIds}).clear();assert.equal(legacyIds.size,1);
 assert.deepEqual([...readRetirementContract({},{legacyIds})],['research']);
 assert.throws(()=>readRetirementContract(registry,{}),/legacy|历史/);
});
test('retired ids cannot collide with local canonical skills but external references and aliases survive',async()=>{
 const {readRetirementContract}=await import('../scripts/lib/skill-retirement-contract.mjs');
 for(const key of ['skills','platform_skills','external_skills'])assert.throws(()=>readRetirementContract({...v2(['research']),[key]:[{id:'research',source:'canonical'}]}),/retired|退役/);
 const registry={...v2(['research','yss-ui']),skills:[{id:'yss-research',aliases:['research']}],external_skills:[{id:'yss-ui',source:'cross-repo-reference'}]};
 assert.deepEqual([...readRetirementContract(registry)].sort(),['research','yss-ui']);
});

test('new-use resolution accepts a direct research alias before physical retirement',async()=>{
 const {resolveSkillForNewUse}=await import('../scripts/lib/skill-registry.mjs');
 const canonical={id:'yss-research',aliases:['research'],maturity:'supported'};
 for(const registry of [{skills:[canonical]}, {...v2(['research']),skills:[canonical]}])assert.equal(resolveSkillForNewUse(registry,'research').id,'yss-research');
});
test('new-use resolution rejects ambiguous aliases and preserves external reference meaning',async()=>{
 const {resolveSkillForNewUse}=await import('../scripts/lib/skill-registry.mjs');
 const shared={id:'yss-research',aliases:['research'],maturity:'supported'};
 assert.throws(()=>resolveSkillForNewUse({skills:[shared,{id:'second',aliases:['research']}]},'research'),/alias|别名/);
 assert.throws(()=>resolveSkillForNewUse({skills:[shared,{id:'second',aliases:['yss-research']}]},'research'),/alias|别名/);
 assert.throws(()=>resolveSkillForNewUse({skills:[{...shared,maturity:'deprecated',deprecation:{remove_after:'2026-01-01'}}]},'research'),/skill-deprecated/);
 const ref={id:'yss-ui',source:'cross-repo-reference',maturity:'supported'};
 assert.equal(resolveSkillForNewUse({...v2(['yss-ui']),external_skills:[ref]},'yss-ui'),ref);
});

test('retirement projection checks are read-only and guarded writes preserve unrelated bytes',async()=>{
 const fs=await import('node:fs'), path=await import('node:path'), os=await import('node:os');
 const {createHash}=await import('node:crypto');
 const {syncRetirementProjection}=await import('../scripts/lib/skill-retirement-projection.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'retirement-projection-'));
 const registry=path.join(root,'.template-spec/agents/yss-skill-registry.yaml'),target=path.join(root,'scripts/lib/skill-supply-chain.mjs');
 const body='export const OBSOLETE = new Set([]);\n';
 const original='// keep this\n// YSS_RETIREMENT_BEGIN sha256='+createHash('sha256').update(body).digest('hex')+'\n'+body+'// YSS_RETIREMENT_END\n// keep this too\n';
 try{
  fs.mkdirSync(path.dirname(registry),{recursive:true});fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(registry,JSON.stringify(v2(['research'])));fs.writeFileSync(target,original);
  const ids=new Set(['research']);
  assert.throws(()=>syncRetirementProjection({root,ids,check:true}),/stale|过期/);assert.equal(fs.readFileSync(target,'utf8'),original);
  syncRetirementProjection({root,ids});const generated=fs.readFileSync(target,'utf8');
  assert.ok(generated.startsWith('// keep this\n')&&generated.endsWith('// keep this too\n'));assert.match(generated,/new Set\(\["research"\]\)/);
  syncRetirementProjection({root,ids,check:true});assert.equal(fs.readFileSync(target,'utf8'),generated);
  for(const bad of [generated.replace('new Set','new WeakSet'),generated.replace('YSS_RETIREMENT_END','MISSING'),generated+'// YSS_RETIREMENT_END\n']){
   fs.writeFileSync(target,bad);assert.throws(()=>syncRetirementProjection({root,ids}),/改动|marker|标记/);assert.equal(fs.readFileSync(target,'utf8'),bad);
  }
  fs.writeFileSync(target,generated);assert.throws(()=>syncRetirementProjection({root,ids:new Set(['wrong'])}),/drift|变化|不一致/);
  fs.renameSync(target,target+'.real');fs.symlinkSync(target+'.real',target);
  assert.throws(()=>syncRetirementProjection({root,ids}),/普通|symbolic|symlink/);assert.equal(fs.readFileSync(target+'.real','utf8'),generated);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('projection detects source and target drift after its initial snapshot',async()=>{
 const fs=await import('node:fs'),path=await import('node:path'),os=await import('node:os');
 const {createHash}=await import('node:crypto');const {syncRetirementProjection}=await import('../scripts/lib/skill-retirement-projection.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'retirement-drift-'));
 const reg=path.join(root,'.template-spec/agents/yss-skill-registry.yaml'),js=path.join(root,'scripts/lib/skill-supply-chain.mjs');
 const body='export const OBSOLETE = new Set([]);\n',original=`// YSS_RETIREMENT_BEGIN sha256=${createHash('sha256').update(body).digest('hex')}\n${body}// YSS_RETIREMENT_END\n`;
 try{
  fs.mkdirSync(path.dirname(reg),{recursive:true});fs.mkdirSync(path.dirname(js),{recursive:true});
  for(const changed of [reg,js]){
   fs.writeFileSync(reg,JSON.stringify(v2(['research'])));fs.writeFileSync(js,original);
   const ids=new Set(['research']);ids[Symbol.iterator]=function*(){fs.appendFileSync(changed,'\n');yield 'research';};
   assert.throws(()=>syncRetirementProjection({root,ids}),/发生变化/);
   assert.equal(fs.readFileSync(js,'utf8'),original+(changed===js?'\n':''));
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Backend derivation preserves other bytes and rejects edited subtree before either target write',async()=>{
 const fs=await import('node:fs'),path=await import('node:path'),os=await import('node:os');
 const {createHash}=await import('node:crypto');const {syncBackendRetirementProjection}=await import('../scripts/lib/skill-retirement-projection.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'retirement-backend-'));const hash=x=>createHash('sha256').update(x).digest('hex');
 const reg=path.join(root,'.template-spec/agents/yss-skill-registry.yaml'),target=path.join(root,'profiles/backend/.template-spec/agents/yss-skill-registry.yaml'),js=path.join(root,'profiles/backend/scripts/lib/skill-supply-chain.mjs');
 const contract='retirement_contract: {}\n',body='export const OBSOLETE = new Set([]);\n';
 const beforeRegistry=`# outside\nkept: true\n# YSS_RETIREMENT_BEGIN sha256=${hash(contract)}\n${contract}# YSS_RETIREMENT_END\n`;
 const beforeJS=`// before\n// YSS_RETIREMENT_BEGIN sha256=${hash(body)}\n${body}// YSS_RETIREMENT_END\n// after\n`;
 try{
  for(const file of [reg,target,js])fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(reg,JSON.stringify(v2(['research'])));fs.writeFileSync(target,beforeRegistry);fs.writeFileSync(js,beforeJS);
  assert.throws(()=>syncBackendRetirementProjection({root,check:true}),/过期/);assert.equal(fs.readFileSync(target,'utf8'),beforeRegistry);assert.equal(fs.readFileSync(js,'utf8'),beforeJS);
  fs.writeFileSync(target,beforeRegistry.replace('{}','{user: true}'));assert.throws(()=>syncBackendRetirementProjection({root}),/手工改动/);assert.equal(fs.readFileSync(js,'utf8'),beforeJS);
  fs.writeFileSync(target,beforeRegistry);syncBackendRetirementProjection({root});syncBackendRetirementProjection({root,check:true});
  assert.ok(fs.readFileSync(target,'utf8').startsWith('# outside\nkept: true\n'));assert.ok(fs.readFileSync(js,'utf8').endsWith('// after\n'));
  const yaml=await import('../scripts/vendor/yaml.mjs');assert.deepEqual(yaml.parse(fs.readFileSync(target,'utf8')).retirement_contract,v2(['research']).retirement_contract);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('root and Backend v2 preserve the full historical root retirement set',async()=>{
 const fs=await import('node:fs'),yaml=await import('../scripts/vendor/yaml.mjs');const {readRetirementContract}=await import('../scripts/lib/skill-retirement-contract.mjs');
 const history=JSON.parse(fs.readFileSync('tests/fixtures/retired-skill-ids-v1.json','utf8'));assert.equal(history.root.length,99);assert.equal(history.backend.length,82);
 for(const prefix of ['', 'profiles/backend/']){
  const registry=yaml.parse(fs.readFileSync(prefix+'.template-spec/agents/yss-skill-registry.yaml','utf8'));
  assert.deepEqual([...readRetirementContract(registry)].sort(),history.root);
  const source=fs.readFileSync(prefix+'scripts/lib/skill-supply-chain.mjs','utf8');
  const literal=source.match(/export const OBSOLETE = new Set\((\[[^;]*\])\);/)[1];assert.deepEqual(JSON.parse(literal),history.root);
  assert.equal((source.match(/YSS_RETIREMENT_BEGIN/g)||[]).length,1);
 }
});

test('aliases cannot shadow registered shared, platform or cross-repo identities',async()=>{
 const {resolveSkillForNewUse}=await import('../scripts/lib/skill-registry.mjs');
 for(const [key,id] of [['skills','tdd'],['platform_skills','platform-probe'],...['yss-ui','yss-formily','yss-frontend-scaffold-generator'].map(id=>['external_skills',id])]){
  const registry=v2([]);registry[key]=[{id,source:'cross-repo-reference'}];registry.skills.push({id:'other',aliases:[id]});
  assert.throws(()=>resolveSkillForNewUse(registry,id),/alias|别名/);
 }
});
