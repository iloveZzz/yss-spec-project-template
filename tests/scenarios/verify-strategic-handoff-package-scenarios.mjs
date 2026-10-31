import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('历史战略消费绑定不再作为当前验证', async () => {
 const {verifyConsumption}=await import('../../scripts/lib/strategic-handoff-consumption.mjs');
 await assert.rejects(()=>verifyConsumption({strategic_handoff:{}}),/legacy-strategic-handoff-unsupported/);
});
test('旧战略 CLI 明确不支持新的离线导出', () => {
 const cli=path.resolve(import.meta.dirname,'../../scripts/strategic-handoff');
 const result=spawnSync(process.execPath,[cli,'export'],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/legacy-strategic-handoff-unsupported/);
});
