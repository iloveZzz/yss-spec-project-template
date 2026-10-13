import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateHarnessSkillScope, assertLocalSkillReferences } from '../scripts/lib/harness-skill-scope.mjs';
import { ROOT } from '../scripts/lib/skill-supply-chain.mjs';
import { parseDocument } from '../scripts/vendor/yaml.mjs';

const profile = parseDocument(readFileSync(path.join(ROOT,'profiles/backend/.template-spec/process/harness-profile.yaml'),'utf8')).toJS();
function fixture(run) {
  const root=mkdtempSync(path.join(tmpdir(),'harness-skill-scope-'));
  const write=(file,data)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),JSON.stringify(data));};
  const lock={canonicalRoot:'.agents/skills',projectionRoots:['.codex/skills','.cursor/skills','.pi/skills'],skills:{shared:{'local-skill':{}},platform:{}}};
  const registry={skills:[{id:'local-skill',aliases:[]}]};
  write('.template-spec/process/harness-profile.yaml',profile);write('skills-lock.json',lock);write('.template-spec/agents/yss-skill-registry.yaml',registry);
  try {run({root,write,lock,registry});} finally {rmSync(root,{recursive:true,force:true});}
}
test('every excluded skill is rejected in canonical, all runtimes, lock and aliases',()=>fixture(({root,write,lock,registry})=>{
  assert.doesNotThrow(()=>validateHarnessSkillScope(root));
  for(const retired of profile.skill_scope.retired_local_skills) {
    for(const dir of [lock.canonicalRoot,...lock.projectionRoots]) {
      const target=path.join(root,dir,retired);mkdirSync(target,{recursive:true});
      assert.throws(()=>validateHarnessSkillScope(root),/重新进入发现面/);rmSync(target,{recursive:true});
    }
    lock.skills.shared[retired]={};write('skills-lock.json',lock);assert.throws(()=>validateHarnessSkillScope(root),/仍被锁定或注册/);
    delete lock.skills.shared[retired];write('skills-lock.json',lock);
    registry.skills[0].aliases=[retired];write('.template-spec/agents/yss-skill-registry.yaml',registry);assert.throws(()=>validateHarnessSkillScope(root),/仍被锁定或注册/);
    registry.skills[0].aliases=[];write('.template-spec/agents/yss-skill-registry.yaml',registry);
  }
}));
test('cross-repository prohibitions remain representable but cannot execute or expand',()=>fixture(({root,write,registry})=>{
  const id=profile.skill_scope.retired_local_skills[0];
  registry.external_skills=[{id,source:'cross-repo-reference'}];write('.template-spec/agents/yss-skill-registry.yaml',registry);
  assert.doesNotThrow(()=>validateHarnessSkillScope(root));
  assert.doesNotThrow(()=>assertLocalSkillReferences(['local-skill'],registry,profile));
  assert.throws(()=>assertLocalSkillReferences([id],registry,profile),/不得进入本地执行闭包/);
  registry.capabilities=[{id:'local.test',primary_skill:id}];write('.template-spec/agents/yss-skill-registry.yaml',registry);
  assert.throws(()=>validateHarnessSkillScope(root),/不得进入本地执行闭包/);
  registry.capabilities=[];
  for(const type of ['context-required','context-conditional']) {
    registry.skill_dependencies={'local-skill':[{skill:id,type,when:'test'}]};write('.template-spec/agents/yss-skill-registry.yaml',registry);
    assert.throws(()=>validateHarnessSkillScope(root),/不得进入本地执行闭包/);
  }
  registry.skill_dependencies={'local-skill':[{skill:id,type:'coordination-only'}]};write('.template-spec/agents/yss-skill-registry.yaml',registry);
  assert.doesNotThrow(()=>validateHarnessSkillScope(root));
}));
test('optional tools may be deliberately installed and are not permanent exclusions',()=>fixture(({root,write,registry,lock})=>{
  for(const {id} of profile.skill_scope.optional_skills??[]) {
    registry.skills.push({id,aliases:[]});lock.skills.shared[id]={};mkdirSync(path.join(root,'.agents/skills',id),{recursive:true});
  }
  write('skills-lock.json',lock);write('.template-spec/agents/yss-skill-registry.yaml',registry);
  assert.doesNotThrow(()=>validateHarnessSkillScope(root));
}));

// Exercise the actual project-instance execution boundary, including a globally supplied skill.
test('project instance accepts local skills and rejects cross-end skills even with misleading impacts', async()=>{
  const {enforceHarnessSkillScope}=await import('../scripts/lib/harness-execution-scope.mjs');
  fixture(({root,write,registry})=>{
    write('yss-project.yaml',{schema_version:1,repository_mode:'project-instance'});
    assert.doesNotThrow(()=>enforceHarnessSkillScope(['local-skill'],registry,{root}));
    const id=profile.skill_scope.retired_local_skills[0];
    registry.skills.push({id,impacts:['lifecycle','frontend','backend']});
    assert.throws(()=>enforceHarnessSkillScope([id],registry,{root}),/不得进入本地执行闭包/);
  });
});
