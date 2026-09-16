import {mkdtempSync,readFileSync,realpathSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=process.cwd(),scratch=realpathSync(mkdtempSync(path.join(tmpdir(),'yss-platform-distribution-')));
try {
 for(const side of ['backend','frontend','design']) {
  const name=side==='design'?'create-yss-strategic-design':`create-yss-harness-${side}`,cli=path.join(root,'submodules',name),snapshot=JSON.parse(readFileSync(path.join(cli,'template.snapshot.json')));
  assert.equal(snapshot.sourceState,'working-tree');
  for(const ref of ['docs/engineering/backend-platforms.json','scripts/lib/backend-platform.mjs','scripts/lib/backend-platform-provenance.mjs','scripts/lib/backend-platform-verification.mjs','docs/process/schemas/project-scaffold-contract.schema.json'])assert.ok(snapshot.files[ref],`${side} missing ${ref}`);
  for(const ref of ['scripts/lib/backend-platform.mjs','scripts/lib/backend-platform-provenance.mjs','scripts/lib/backend-platform-verification.mjs'])assert.equal(readFileSync(path.join(cli,'template',snapshot.files[ref].blob),'utf8'),readFileSync(path.join(root,ref),'utf8'));
  execFileSync(process.execPath,['scripts/verify-bundle.mjs'],{cwd:cli,stdio:'pipe'});
  console.log(`${side}: WORKTREE snapshot contains shared platform dependencies and bundle integrity passed`);
 }
 const target=path.join(scratch,'backend');
 execFileSync(process.execPath,[path.join(root,'submodules/create-yss-harness-backend/bin/create-yss-harness-backend.js'),'init','--target-dir',target,'--json'],{maxBuffer:16*1024*1024});
 const catalog=JSON.parse(execFileSync(process.execPath,['scripts/backend-platforms'],{cwd:target,encoding:'utf8'}));assert.equal(catalog.profiles.length,5);assert.ok(catalog.profiles.every(p=>p.selectable===false));
 const results=execFileSync(process.execPath,['--test','scripts/fixtures/backend-scaffold/platform-scenarios.test.mjs'],{cwd:target,encoding:'utf8',maxBuffer:16*1024*1024});console.log(results.slice(-750));
 console.log('Fresh backend CLI instance: all 10 candidate renderings, production blocks and evidence checks passed');
 const spec=path.join(root,'submodules/create-yss-spec/template');
 assert.ok(JSON.parse(readFileSync(path.join(root,'submodules/create-yss-spec/template.snapshot.json'))).sourceState==='working-tree');
 const specCatalog=JSON.parse(execFileSync(process.execPath,['scripts/backend-platforms'],{cwd:spec,encoding:'utf8'}));assert.equal(specCatalog.profiles.length,5);console.log('Main template snapshot: platform reader executed successfully');
} finally {rmSync(scratch,{recursive:true,force:true});}
