import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { withBrowserSession } from '../.agents/skills/yss-prototype-stage/scripts/browser-session.mjs';

test('owned browser session exits and removes only its temporary profile on success and failure',async t=>{
  const evidence=fs.mkdtempSync(path.join(os.tmpdir(),'browser-evidence-test-'));
  t.after(()=>fs.rmSync(evidence,{recursive:true,force:true}));
  for(const shouldFail of [false,true]) {
    let profile,pid;
    const run=withBrowserSession(async session=>{
      profile=session.profileDir;
      const browser=session.spawn(process.execPath,['-e','setInterval(()=>{},1000)']);pid=browser.pid;
      fs.writeFileSync(path.join(evidence,'result.json'),'real evidence');
      assert.ok(fs.existsSync(profile));
      if(shouldFail)throw Error('browser-test-failure');return 'passed';
    });
    if(shouldFail)await assert.rejects(run,/browser-test-failure/);else assert.equal(await run,'passed');
    assert.equal(fs.existsSync(profile),false);assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
    assert.equal(fs.readFileSync(path.join(evidence,'result.json'),'utf8'),'real evidence');
  }
});

test('catchable signals clean owned browser and preserve evidence and unrelated processes',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'browser-signal-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const unrelated=spawn(process.execPath,['-e','setInterval(()=>{},1000)']);t.after(()=>unrelated.kill());
  const helper=new URL('../.agents/skills/yss-prototype-stage/scripts/browser-session.mjs',import.meta.url).href;
  for(const signal of ['SIGINT','SIGTERM','SIGHUP']) {
    const script=path.join(dir,'run.mjs'),info=path.join(dir,'info.json');
    fs.writeFileSync(script,`import fs from 'node:fs';import {withBrowserSession} from ${JSON.stringify(helper)};await withBrowserSession(async s=>{const c=s.spawn(process.execPath,['-e','setInterval(()=>{},1000)']);fs.writeFileSync(${JSON.stringify(info)},JSON.stringify({profile:s.profileDir,pid:c.pid}));console.log('ready');await new Promise(()=>{});});`);
    const command=spawn(process.execPath,[script],{stdio:['ignore','pipe','pipe']});t.after(()=>command.kill());let errors='';command.stderr.on('data',b=>errors+=b);await once(command.stdout,'data');
    const data=JSON.parse(fs.readFileSync(info));command.kill(signal);const [code]=await once(command,'exit');
    assert.equal(code,{SIGINT:130,SIGTERM:143,SIGHUP:129}[signal],errors);assert.equal(fs.existsSync(data.profile),false);assert.ok(fs.existsSync(info));
    assert.throws(()=>process.kill(data.pid,0),{code:'ESRCH'});assert.doesNotThrow(()=>process.kill(unrelated.pid,0));
  }
});
