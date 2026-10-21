import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {verifyPrototypeDesign} from '../scripts/verify-prototype-design.mjs';
test('selected checks fail closed for missing tools, mismatched lock/version and browser',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'yss-verification-negative-'));
 const missing=await verifyPrototypeDesign({scope:'all',toolchain:path.join(temp,'absent'),browserTools:path.join(temp,'missing-browser')});
 assert.equal(missing.status,'failed');assert(missing.counts['not-executed']>0);assert(missing.checks.some(c=>c.id==='browser-preflight'&&c.status==='failed'));
 const fake=path.join(temp,'fake');await mkdir(fake);await writeFile(path.join(fake,'pnpm-lock.yaml'),'wrong');
 const lock=await verifyPrototypeDesign({scope:'contract',toolchain:fake});assert(lock.checks.some(c=>c.reason?.includes('锁文件不符')));
 await cp(new URL('../assets/shadcn-vue-authoring/pnpm-lock.yaml',import.meta.url),path.join(fake,'pnpm-lock.yaml'));await mkdir(path.join(fake,'node_modules/vue'),{recursive:true});await writeFile(path.join(fake,'node_modules/vue/package.json'),'{"version":"0.0.0"}');
 const version=await verifyPrototypeDesign({scope:'contract',toolchain:fake});assert(version.checks.some(c=>c.reason?.includes('版本不符')));assert.equal(version.counts.passed,1,'only input-drift can pass when tools are invalid');
 await assert.rejects(verifyPrototypeDesign({scope:'unknown'}),/scope/);
 const report=JSON.parse(await readFile(path.join(version.output,'report.json')));assert.equal(report.status,'failed');assert.equal(report.counts['not-applicable'],0);
});
