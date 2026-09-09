import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildPlanFixture} from './scripts/fixtures/user-decision/plan-fixture.mjs';
import {assertPlanSpecEntry} from './scripts/lib/plan-spec-entry.mjs';
const temp=mkdtempSync(path.join(tmpdir(),'perf-plan-fixture-'));
try {const f=buildPlanFixture(temp);const times=[];for(let i=0;i<5;i++){const t=performance.now();const r=assertPlanSpecEntry(f.state,{root:f.root});if(r.result!=='allowed')throw Error('unexpected');times.push(performance.now()-t);}console.log(JSON.stringify({kind:'synthetic-valid-plan-entry',times_ms:times}));}finally{rmSync(temp,{recursive:true,force:true});}
