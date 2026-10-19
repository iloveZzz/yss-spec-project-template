import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const retired=['approval-record','approval-current','approval-consumption','approval-record-io','approval-checkpoint-discovery','user-decision','user-decision-reuse','decision-continuation'];
const sourceCommit='7ac487880dcbda5ca6e121e1641ee7ebc8a55996';
const sources={
  spec:['48e6d1ec8c5c6a6780678b970e5463c58c54445f31efbb971b827aa1b3d493f1','343a828bfc887319b67165a6663c05f62c03e3e4a7c210f4eebd23542c8da4a3'],
  backend:['8d6e01e45d02a6d9f156fdfbec8de2477363db4377e8d0b6e0d9204db518f16b','ea3f2f98c59abdd3e53ae60b7139fa7e5d6ad2f7fe80cbce17049dae5a27d440'],
};

test('AR12b 旧校验路径与生产回退全部退役',()=>{
  for(const name of retired)assert.equal(fs.existsSync(path.join(root,`scripts/lib/${name}.mjs`)),false,name);
  const oldImport=new RegExp(`(?:from\\s*|import\\s*\\(?)['\"][^'\"]*/(?:${retired.join('|')})\\.mjs['\"]`);
  function scan(directory){
    if(!fs.existsSync(directory))return;
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())scan(file);
      else if(entry.isFile()&&(/\.(?:mjs|js)$/.test(entry.name)||!entry.name.includes('.'))){
        const text=fs.readFileSync(file,'utf8');
        assert.ok(!oldImport.test(text),`${path.relative(root,file)} imports a retired validator`);
        if(!file.includes(`${path.sep}fixtures${path.sep}`)&&!file.includes(`${path.sep}testing${path.sep}`))assert.ok(!/\b(?:nativeDelegationAvailable|attachExpectationBinding|rootBoundRead|defaultAuthorities)\b/.test(text),`${path.relative(root,file)} retains fallback scaffolding`);
      }
    }
  }
  for(const ref of ['scripts','.agents/skills','profiles/backend/scripts','profiles/backend/.agents/skills'])scan(path.join(root,ref));
});

test('现役 Spec/Backend 的 AR12b 删除只匹配已发布 v4.0.3 精确来源',()=>{
  for(const [profile,[snapshot,bundle]]of Object.entries(sources)){
    const prefix=profile==='spec'?'':`profiles/${profile}/`;
    const policy=JSON.parse(fs.readFileSync(path.join(root,prefix,'.template-source/distribution/bundle-profile.json')));
    const rules=policy.upgradePolicy.rules.filter(rule=>rule.id.startsWith('ar12b-'));
    assert.equal(rules.length,retired.length,profile);
    for(const name of retired){
      const rule=rules.find(row=>row.sourcePath===`scripts/lib/${name}.mjs`);
      assert.ok(rule,`${profile}/${name}`);
      assert.deepEqual(rule.from,{profile,templateCommit:sourceCommit,sourceSnapshotHash:snapshot,bundleHash:bundle});
      assert.equal(rule.action,'delete');assert.equal(rule.targetPath,undefined);
    }
  }
});

test('AR12b 原生交接校验的动态 Schema 进入 Spec 基础分发',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,'.template-source/distribution/bundle-profile.json')));
  // Native validators do not leave JavaScript imports for the Producer to follow.
  for(const name of ['strategic-handoff-export','strategic-handoff-export-v2','strategic-handoff-package']){
    const ref=`.template-spec/process/schemas/${name}.schema.json`;
    assert.ok(policy.common.files.includes(ref),ref);
    assert.ok(fs.existsSync(path.join(root,ref)),ref);
  }
});
