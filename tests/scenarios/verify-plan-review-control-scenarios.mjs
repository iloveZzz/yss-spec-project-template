import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from '../../scripts/lib/lifecycle-registry.mjs';

// All scenario project assets, approvals and replies are synthetic temporary fixtures.
// stdout/stderr are suitable for the caller's repository-external Fresh Verification log.
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', path.join(ROOT, '.template-source/tooling/node/test/plan-review-control.test.mjs')], { cwd: ROOT, stdio: 'inherit', timeout: 120000 });
if (result.error) process.stderr.write(`Plan 审查收敛场景执行失败: ${result.error.message}\n`);
process.exitCode = result.status ?? 1;
