import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Break caught: a frozen ordinary source accidentally inherits project identity or drops TDD.
test('standalone integration fixture supplies TDD without governance identity',async t=>{
 const {prepareMattIntegrationSource}=await import('./fixtures/spec-standalone/prepare-matt-integration.mjs');
 const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'matt-fixture-')));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const sourceRoot=path.join(temp,'source'),out=path.join(temp,'frozen');
 const put=(ref,value)=>{const f=path.join(sourceRoot,ref);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,value);};
 for(const skill of ['yss-product-lifecycle','grilling','yss-research','domain-modeling','to-spec','i-have-adhd','code-review','implement','tdd','diagnosing-bugs','codebase-design'])put(`.agents/skills/${skill}/SKILL.md`,`${skill}\n`);
 put('.template-source/distribution/entries/spec-skills-AGENTS.md','ordinary entry\n');
 for(const ref of ['AGENTS.md','CONTEXT.md','yss-project.yaml','.template-spec/process/policy.yaml','scripts/fixture.mjs','.template-source/process/policy.md'])put(ref,ref+'\n');
 const {root,manifestPath}=prepareMattIntegrationSource({sourceRoot,out});
 for(const ref of ['yss-project.yaml','CONTEXT.md','.template-spec'])assert.equal(fs.existsSync(path.join(root,'standalone',ref)),false,ref);
 assert.equal(fs.readFileSync(path.join(root,'standalone/.agents/skills/tdd/SKILL.md'),'utf8'),'tdd\n');
 assert.equal(fs.readFileSync(path.join(root,'governed/AGENTS.md'),'utf8'),'AGENTS.md\n');
 assert.ok(JSON.parse(fs.readFileSync(manifestPath)).files['standalone/.agents/skills/tdd/SKILL.md']);
 assert.throws(()=>prepareMattIntegrationSource({sourceRoot,out:root}),/exist|overlap/);
 const nativeSeed=path.join(temp,'native');fs.mkdirSync(path.join(nativeSeed,'.git'),{recursive:true});fs.mkdirSync(path.join(nativeSeed,'.yss/transactions'),{recursive:true});
 fs.writeFileSync(path.join(nativeSeed,'.yss.json'),'synthetic native fixture');fs.writeFileSync(path.join(nativeSeed,'.git/config'),'test only');fs.writeFileSync(path.join(nativeSeed,'.yss/transactions/old'),'old root');
 const seeded=prepareMattIntegrationSource({sourceRoot,out:path.join(temp,'seeded'),nativeSeed});
 assert.equal(fs.readFileSync(path.join(seeded.root,'governed/native-backend-seed/.yss.json'),'utf8'),'synthetic native fixture');
 assert.equal(fs.existsSync(path.join(seeded.root,'governed/native-backend-seed/.git')),false);assert.equal(fs.existsSync(path.join(seeded.root,'governed/native-backend-seed/.yss/transactions')),false);
 assert.throws(()=>prepareMattIntegrationSource({sourceRoot,out:path.join(nativeSeed,'nested'),nativeSeed}),/overlap/);
 fs.symlinkSync(path.join(sourceRoot,'AGENTS.md'),path.join(nativeSeed,'linked'));
 assert.throws(()=>prepareMattIntegrationSource({sourceRoot,out:path.join(temp,'linked'),nativeSeed}),/linked/);
});

// Break caught: no-op mutation or unrelated syntax error mistaken for the target red.
test('range scenario has the claimed red and green behavior',t=>{
 const suite=JSON.parse(fs.readFileSync(new URL('../.template-source/scripts/matt-integration-scenarios.json',import.meta.url)));
 const scenario=suite.scenarios.find(x=>x.id==='standalone-implement');
 assert.equal(suite.scenarios.length,12);
 const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'matt-range-')));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const [ref,bytes] of Object.entries(scenario.files)){const f=path.join(temp,ref);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,bytes);}
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const run=()=>spawnSync(process.execPath,['--test','test/range.test.mjs'],{cwd:temp,encoding:'utf8',env});
 const red=run();assert.notEqual(red.status,0);assert.match(red.stdout,/inclusive range boundaries/);assert.match(red.stdout,/false !== true/);
 const before=fs.readFileSync(path.join(temp,'src/range.mjs'),'utf8');
 assert.throws(()=>assert.notEqual(before.replace('not-present','changed'),before));
 const after=before.replace('value > min','value >= min');assert.notEqual(after,before);
 fs.writeFileSync(path.join(temp,'src/range.mjs'),after);const green=run();assert.equal(green.status,0,green.stdout+green.stderr);
 fs.writeFileSync(path.join(temp,'src/range.mjs'),'export function {');const syntax=run();assert.notEqual(syntax.status,0);assert.doesNotMatch(syntax.stdout,/false !== true/);
});

// Break caught: a declared positive governance state is not a verified current fixture.
test('governed observations require prepared current inputs and protected evidence',()=>{
 const suite=JSON.parse(fs.readFileSync(new URL('../.template-source/scripts/matt-integration-scenarios.json',import.meta.url)));
 const cases=suite.scenarios.filter(x=>x.repo==='governed');assert.equal(cases.length,6);
 for(const scenario of cases){
  assert.equal(scenario.setup_script,'eval-setup.mjs',scenario.id);
  assert.ok(scenario.source_paths.includes('eval-setup.mjs'));
  assert.ok(scenario.required_paths.includes('eval-setup.mjs'));
  assert.ok(scenario.fixture_git.baseline_files['src/range.mjs']);
  assert.equal(JSON.parse(scenario.files['scenario-input.json']).id,scenario.id);
  assert.ok(scenario.assertions.some(x=>x.kind==='node'&&x.code.includes('input.protected')));
 }
});
