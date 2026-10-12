import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { FRONTEND, refresh } from './refresh-yss-skill-index.mjs';

test('updates exactly installed frontend skills without needing or creating backend sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'frontend-index-'));
  try {
    for (const skill of Object.keys(FRONTEND)) await mkdir(path.join(root, skill));
    const result = await refresh({skillsRoot:root, now:'2026-09-08T00:00:00Z'});
    assert.equal(result.frontend, Object.keys(FRONTEND).length);
    assert.deepEqual((await readdir(root)).sort(), Object.keys(FRONTEND).sort());
    for (const file of result.files) assert.match(await readFile(path.join(root,file),'utf8'), /does not fetch or verify/);
    execFileSync(process.execPath, [fileURLToPath(new URL('./refresh-yss-skill-index.mjs',import.meta.url))], {
      env:{...process.env,YSS_SKILLS_ROOT:root,YSS_SOURCE_ROOT:'/nonexistent/backend-source'}
    });
    assert.deepEqual((await readdir(root)).sort(), Object.keys(FRONTEND).sort());
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('skips missing skills and rejects symlinked output without writing elsewhere', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'frontend-index-'));
  try {
    assert.equal((await refresh({skillsRoot:root})).frontend, 0);
    await mkdir(path.join(root,'other'));
    await symlink(path.join(root,'other'),path.join(root,'yss-ui'));
    await assert.rejects(refresh({skillsRoot:root}), /canonical/);
    assert.deepEqual(await readdir(path.join(root,'other')),[]);
  } finally { await rm(root,{recursive:true,force:true}); }
});
