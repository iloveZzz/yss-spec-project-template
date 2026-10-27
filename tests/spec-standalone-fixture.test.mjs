import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareStandaloneSource} from './fixtures/spec-standalone/prepare.mjs';

function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yss-standalone-fixture-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const sourceRoot=path.join(directory,'source'),out=path.join(directory,'frozen');
  const put=(ref,content)=>{
    const file=path.join(sourceRoot,ref);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,content);
  };
  put('.template-source/distribution/entries/spec-skills-AGENTS.md','ordinary fixture entry\n');
  for(const name of ['alpha','beta','unselected']) {
    put(`.agents/skills/${name}/SKILL.md`,`---\nname: ${name}\ndescription: Fixture\n---\n`);
    put(`.agents/skills/${name}/references/guide.md`,`${name} reference\n`);
  }
  put('yss-project.yaml','repository_mode: template-source\n');
  put('CONTEXT.md','source vocabulary\n');
  put('.template-spec/process/policy.yaml','governance\n');
  return {directory,sourceRoot,out,put};
}

test('standalone fixture copies selected resources and ordinary entry with real hashes',t=>{
  const {sourceRoot,out}=fixture(t);
  const {root,manifestPath}=prepareStandaloneSource({sourceRoot,out,skills:['alpha','beta']});
  assert.equal(root,out);
  assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'ordinary fixture entry\n');
  for(const ref of ['yss-project.yaml','CONTEXT.md','.template-spec','.agents/skills/unselected'])
    assert.equal(fs.existsSync(path.join(root,ref)),false,ref);
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.equal(manifest.sourceRoot,fs.realpathSync(sourceRoot));
  assert.deepEqual(manifest.skills,['alpha','beta']);
  assert.equal(Object.keys(manifest.files).length,5);
  for(const [ref,entry] of Object.entries(manifest.files)) {
    const file=path.join(root,ref);
    assert.equal(entry.sha256,createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    assert.equal(entry.mode,fs.statSync(file).mode&0o777);
  }
  assert.throws(()=>prepareStandaloneSource({sourceRoot,out,skills:['alpha']}),/exist/i);
});

test('standalone fixture rejects unsafe selections and source output overlap before writing',t=>{
  const {sourceRoot,out}=fixture(t);
  for(const skills of [[],['../alpha'],['/alpha'],['alpha/beta'],['alpha','alpha'],['missing']]) {
    assert.throws(()=>prepareStandaloneSource({sourceRoot,out,skills}));
    assert.equal(fs.existsSync(out),false);
  }
  assert.throws(()=>prepareStandaloneSource({sourceRoot,out:path.join(sourceRoot,'nested'),skills:['alpha']}),/source|overlap/i);
});

test('standalone fixture refuses linked resources and keeps source unchanged',t=>{
  const {directory,sourceRoot,out}=fixture(t);
  const outside=path.join(directory,'outside.md');fs.writeFileSync(outside,'private outside data');
  fs.symlinkSync(outside,path.join(sourceRoot,'.agents/skills/alpha/references/outside.md'));
  assert.throws(()=>prepareStandaloneSource({sourceRoot,out,skills:['alpha']}),/link/i);
  assert.equal(fs.existsSync(out),false);
  assert.equal(fs.readFileSync(outside,'utf8'),'private outside data');
});

test('actual Spec starter resources resolve shared references inside the frozen source',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yss-standalone-actual-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const sourceRoot=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
  const policy=JSON.parse(fs.readFileSync(path.join(sourceRoot,'.template-source/distribution/bundle-profile.json')));
  const {root,manifestPath}=prepareStandaloneSource({sourceRoot,out:path.join(directory,'source'),skills:policy.installations.skills.skills});
  const skill=path.join(root,'.agents/skills/to-spec/SKILL.md');
  const target=path.resolve(path.dirname(skill),'../yss-product-lifecycle/references/standalone-spec.md');
  assert.ok(target.startsWith(root+path.sep));
  assert.ok(fs.statSync(target).isFile());
  const text=fs.readFileSync(skill,'utf8');
  const link=text.match(/\]\(([^)]+standalone-spec\.md)\)/)[1];
  assert.equal(path.resolve(path.dirname(skill),link),target);
  const writing=path.join(root,'.agents/skills/i-have-adhd/references/document-writing.md');
  assert.ok(fs.statSync(writing).isFile());
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  for(const [ref,entry] of Object.entries(manifest.files))
    assert.equal(entry.sha256,createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex'),ref);
});
