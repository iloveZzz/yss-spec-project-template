import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const base='/tmp/yss-lifecycle-followup-profile-audit',root=path.join(base,'fixtures/frontend'),ref='.template-spec/process/harness-profile.yaml',file=path.join(root,ref),saved=fs.readFileSync(file);
try{
 fs.writeFileSync(file,'schema_version: 2\nprofile_id: harness.unrecognized\n');
 const cmd=[path.join(base,'frontend/scripts/lifecycle-status'),'--root',root,'--checkpoint','docs/.scratch/case/checkpoint.json','--format','text'];
 const r=spawnSync(process.execPath,cmd,{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(base,'frontend-profile-error.stdout.txt'),r.stdout);
 fs.writeFileSync(path.join(base,'frontend-profile-error-result.json'),JSON.stringify({argv:cmd,exit_code:r.status,stdout:r.stdout,stderr:r.stderr},null,2));
 console.log('exit_code',r.status);console.log(r.stdout);
}finally{fs.writeFileSync(file,saved);}
