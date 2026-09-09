import * as fs from 'node:fs';
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const implementation=process.argv[2],trace=process.argv.includes('--trace');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-projection-matrix-'));
try {
 fs.mkdirSync(path.join(root,'scripts/lib'),{recursive:true});fs.copyFileSync(path.join(implementation,'scripts/lib/skill-supply-chain.mjs'),path.join(root,'scripts/lib/skill-supply-chain.mjs'));
 const source=path.join(root,'.agents/skills/example');fs.mkdirSync(source,{recursive:true});
 for(let n=0;n<100;n++)fs.writeFileSync(path.join(source,n+'.txt'),n===0?Buffer.from([0,255]):'line\r\n'.repeat(50));
 fs.writeFileSync(path.join(source,'SKILL.md'),'sample');
 fs.writeFileSync(path.join(root,'skills-lock.json'),JSON.stringify({version:3,skills:{shared:{example:{}},platform:{}}}));
 const roots=['.claude/skills','.codex/skills','.cursor/skills','.pi/skills','.qoder/skills','.trae/skills'];
 roots.forEach((p,i)=>{const dir=path.join(root,p);fs.mkdirSync(dir,{recursive:true});if(i<3)fs.symlinkSync('../../.agents/skills/example',path.join(dir,'example'));else fs.cpSync(source,path.join(dir,'example'),{recursive:true});for(let n=0;n<20;n++)fs.mkdirSync(path.join(dir,'untracked-'+n));});
 assert.equal(cp.spawnSync('git',['init','-q',root]).status,0);
 const counts={reads:0,scans:0,git_processes:0};const originals={read:fs.default.readFileSync,scan:fs.default.readdirSync,spawn:cp.spawnSync};
 if(trace){fs.default.readFileSync=(...a)=>{counts.reads++;return originals.read(...a)};fs.default.readdirSync=(...a)=>{counts.scans++;return originals.scan(...a)};cp.spawnSync=(...a)=>{if(a[0]==='git')counts.git_processes++;return originals.spawn(...a)};syncBuiltinESMExports();}
 const {syncSkills}=await import(pathToFileURL(path.join(root,'scripts/lib/skill-supply-chain.mjs')));const samples=[];
 for(let sample=0;sample<(trace?1:5);sample++){for(const key of Object.keys(counts))counts[key]=0;const start=performance.now();assert.equal(syncSkills({check:true}),'skill projections are synchronized');samples.push({sample,duration_ms:performance.now()-start,...(trace?counts:{})});}
 // Each call rereads mutable projections; a changed file must never reuse a prior pass.
 fs.writeFileSync(path.join(root,'.pi/skills/example/1.txt'),'tampered');assert.throws(()=>syncSkills({check:true}),/projection drift/);
 console.log(JSON.stringify({implementation,trace,physical_projections:3,symlink_projections:3,untracked_directories:120,canonical_files:101,samples,tamper_rejected:true}));
} finally {fs.rmSync(root,{recursive:true,force:true});}
