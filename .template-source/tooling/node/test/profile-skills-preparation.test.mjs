import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {applySkillPreparation, planSkillPreparation, skillCompositionDigest} from '../../../scripts/lib/profile-skills-preparation.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-preparation-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source=path.join(root,'source'),target=path.join(root,'target');
  fs.mkdirSync(path.join(source,'.agents/skills/shared'),{recursive:true});
  fs.mkdirSync(path.join(target,'.agents/skills/local'),{recursive:true});
  fs.writeFileSync(path.join(source,'.agents/skills/shared/SKILL.md'),'shared\n');
  fs.writeFileSync(path.join(source,'.agents/skills/shared/probe'),'#!/bin/sh\n',{mode:0o755});
  fs.writeFileSync(path.join(target,'.agents/skills/local/SKILL.md'),'local\n');
  const config={schema_version:1,profiles:{backend:{exact:[{id:'shared'}],adapted:[],local_only:['local'],materialization:'generated'}}};
  return {source,target,config};
}

test('first preparation creates discoverable projections and repeating it writes nothing',t=>{
  const {source,target,config}=fixture(t);
  const plan=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  assert.equal(plan.issues.length,0);
  applySkillPreparation(plan);
  for(const runtime of ['.agents','.codex','.cursor','.pi']) assert.equal(fs.readFileSync(path.join(target,runtime,'skills/shared/SKILL.md'),'utf8'),'shared\n');
  assert.equal(fs.statSync(path.join(target,'.agents/skills/shared/probe')).mode&0o777,0o755);
  assert.equal(fs.readFileSync(path.join(target,'.agents/skills/local/SKILL.md'),'utf8'),'local\n');
  const repeat=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  assert.equal(repeat.changes.length,0);
  assert.equal(applySkillPreparation(repeat).written,0);
  assert.match(skillCompositionDigest(plan.view),/^[a-f0-9]{64}$/);
});

test('edited generated files and unknown occupied paths block all writes',t=>{
  const {source,target,config}=fixture(t);
  applySkillPreparation(planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'}));
  fs.writeFileSync(path.join(target,'.agents/skills/shared/SKILL.md'),'user edit\n');
  fs.writeFileSync(path.join(source,'.agents/skills/shared/probe'),'new source\n');
  let p=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  assert.ok(p.issues.some(x=>x.path.endsWith('SKILL.md')));
  assert.throws(()=>applySkillPreparation(p),/冲突/);
  assert.equal(fs.readFileSync(path.join(target,'.agents/skills/shared/probe'),'utf8'),'#!/bin/sh\n');
  fs.writeFileSync(path.join(target,'.agents/skills/shared/unknown'),'business asset');
  p=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  assert.ok(p.issues.some(x=>x.path.endsWith('unknown')));
});

test('link escape and a later write failure preserve unrelated files and roll back',t=>{
  const {source,target,config}=fixture(t);
  fs.symlinkSync(source,path.join(target,'.agents/skills/shared'),'dir');
  assert.throws(()=>planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'}),/链接/);
  fs.unlinkSync(path.join(target,'.agents/skills/shared'));
  const p=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  let writes=0;
  assert.throws(()=>applySkillPreparation(p,{write:(...args)=>{if(++writes===2)throw Error('injected failure');fs.writeFileSync(...args);}}),/injected/);
  assert.equal(fs.existsSync(path.join(target,'.agents/skills/shared/SKILL.md')),false);
  assert.equal(fs.readFileSync(path.join(target,'.agents/skills/local/SKILL.md'),'utf8'),'local\n');
});

test('source absence, mode ambiguity and preview drift fail before any write',t=>{
  const {source,target,config}=fixture(t);
  const plan=planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'});
  fs.mkdirSync(path.join(target,'.agents/skills/shared'),{recursive:true});
  fs.writeFileSync(path.join(target,'.agents/skills/shared/SKILL.md'),'concurrent user file');
  assert.throws(()=>applySkillPreparation(plan),/预览后/);
  assert.equal(fs.readFileSync(path.join(target,'.agents/skills/shared/SKILL.md'),'utf8'),'concurrent user file');
  config.profiles.backend.exact[0].file_modes={'SKILL.md':'0644suffix'};
  assert.throws(()=>planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'}),/权限/);
  config.profiles.backend.exact[0].file_modes={};
  config.profiles.backend.exact[0].files=['SKILL.md'];
  assert.throws(()=>planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'}),/完整适配树/);
  delete config.profiles.backend.exact[0].files;
  fs.rmSync(path.join(source,'.agents/skills/shared'),{recursive:true});
  assert.throws(()=>planSkillPreparation({root:source,targetRoot:target,config,profile:'backend'}),/缺少/);
});

test('source maintenance accepts staged copy retirement but still blocks generated user edits',t=>{
  const {source,target,config}=fixture(t),consumer=path.join(source,'profiles/backend');
  fs.mkdirSync(path.dirname(consumer),{recursive:true});fs.renameSync(target,consumer);
  config.profiles.backend.target='profiles/backend';
  fs.writeFileSync(path.join(consumer,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  const repo=fileURLToPath(new URL('../../../../',import.meta.url));
  for(const ref of ['scripts/sync-profile-skills','scripts/lib/profile-skill-sync.mjs','.template-source/scripts/lib/profile-skills-preparation.mjs']){const f=path.join(source,ref);fs.mkdirSync(path.dirname(f),{recursive:true});fs.copyFileSync(path.join(repo,ref),f);}
  fs.mkdirSync(path.join(source,'.template-source'),{recursive:true});fs.writeFileSync(path.join(source,'.template-source/profile-skill-sync.json'),JSON.stringify(config));
  applySkillPreparation(planSkillPreparation({root:source,targetRoot:consumer,config,profile:'backend'}));
  const git=(...args)=>{const r=spawnSync('git',['-C',consumer,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture');git('add','.');git('commit','-qm','tracked copies');
  git('rm','--cached','-r','--quiet','.agents/skills/shared','.codex/skills/shared','.cursor/skills/shared','.pi/skills/shared');
  fs.writeFileSync(path.join(source,'.agents/skills/shared/SKILL.md'),'new source\n');
  const run=()=>spawnSync(process.execPath,[path.join(source,'scripts/sync-profile-skills'),'--apply','--profile=backend'],{encoding:'utf8'});
  let r=run();assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(path.join(consumer,'.agents/skills/shared/SKILL.md'),'utf8'),'new source\n');
  fs.writeFileSync(path.join(consumer,'.agents/skills/shared/SKILL.md'),'user edit');
  r=run();assert.equal(r.status,1);assert.equal(fs.readFileSync(path.join(consumer,'.agents/skills/shared/SKILL.md'),'utf8'),'user edit');
});
