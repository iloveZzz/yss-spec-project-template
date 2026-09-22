import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Plugin migration baselines are immutable dependencies, independent of CLI upgrades.
// Prepare their exact commits outside the working tree, including ignored snapshots.
const root = path.resolve(import.meta.dirname, '../../../..');
const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-plugin-test-clis-')));
const env = { ...process.env };
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
try {
  for (const [plugin, repository, variable] of [
    ['yss-backend-delivery', 'create-yss-spec', 'YSS_BACKEND_PLUGIN_CLI_ROOT'],
    ['yss-product-design', 'create-yss-strategic-design', 'YSS_DESIGN_PLUGIN_CLI_ROOT'],
  ]) {
    const pin = JSON.parse(readFileSync(path.join(root, '.template-source/plugins', plugin, 'cli-pin.json')));
    const source = path.join(root, 'submodules', repository), cli = path.join(temporary, repository);
    git(root, ['clone', '--quiet', '--shared', '--no-checkout', source, cli]);
    try { git(cli, ['cat-file', '-e', `${pin.cli_commit}^{commit}`]); }
    catch { git(cli, ['fetch', '--depth=1', git(source, ['remote', 'get-url', 'origin']), pin.cli_commit]); }
    git(cli, ['checkout', '--quiet', '--detach', pin.cli_commit]);
    if (repository === 'create-yss-spec') {
      execFileSync(process.execPath, ['scripts/sync-template.js', '--require-committed'], {
        cwd: cli, stdio: 'pipe',
        // This historical snapshot used Chinese filename collation in its Skill lock.
        env: { ...env, LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8',
          YSS_SPEC_TEMPLATE_REPO: pathToFileURL(root).href, YSS_SPEC_TEMPLATE_REF: pin.template_commit },
      });
    }
    const snapshot = JSON.parse(readFileSync(path.join(cli, 'template.snapshot.json')));
    if (snapshot.sourceState !== 'committed' || snapshot.templateCommit !== pin.template_commit
        || snapshot.snapshotHash !== pin.snapshot_hash || snapshot.manifestHash !== pin.manifest_hash) {
      throw new Error(`plugin-test-snapshot-mismatch: ${pin.name}`);
    }
    if (git(cli, ['status', '--porcelain', '--untracked-files=all'])) throw new Error('plugin-test-cli-not-clean');
    env[variable] = cli;
    console.log(`Plugin test dependency: ${pin.name}@${pin.version} (${pin.cli_commit})`);
  }
  const tests = process.argv.slice(2);
  if (!tests.length) throw new Error('test-files-required');
  const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
