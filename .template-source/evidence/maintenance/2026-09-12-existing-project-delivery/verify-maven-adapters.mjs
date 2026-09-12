import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture,sha} from '../../../../scripts/fixtures/existing-backend/fixture.mjs';
const out=path.dirname(new URL(import.meta.url).pathname);
const wrapper='/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/backend/mvnw';
const results=[];const attempt=process.argv[2]||'02';
for(const family of ['domain-driven','layered-mvc']){
 const f=fixture(family);
 try{
  const command=[wrapper,'-B','-o','-f',path.join(f.project,'pom.xml'),'test','package'];
  const started=new Date().toISOString();const run=spawnSync(command[0],command.slice(1),{cwd:path.dirname(wrapper),encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
  const log=`maven-${family}-${attempt}.log`;fs.writeFileSync(path.join(out,log),(run.stdout||'')+(run.stderr||''));
  results.push({family,command:command.join(' '),executed_at:started,exit_code:run.status,error:run.error?.message,evidence_ref:log,evidence_digest:sha(fs.readFileSync(path.join(out,log))),scope:'synthetic existing-project adapter compile/package; not pilot S0 and no real product approval'});
 } finally {f.cleanup();}
}
fs.writeFileSync(path.join(out,`maven-adapters-${attempt}.json`),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));process.exitCode=results.every(r=>r.exit_code===0)?0:1;
