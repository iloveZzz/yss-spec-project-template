import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { execFileSync as nativeExec, spawnSync as nativeSpawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
const trace=process.env.PILOT_TRACE;
function execFileSync(file,args,options){const start=performance.now();try{return nativeExec(file,args,options)}finally{appendFileSync(trace,JSON.stringify({kind:'exec',file,args,cwd:options?.cwd,ms:performance.now()-start})+'\n')}}
function spawnSync(file,args,options){writeFileSync(process.env.PILOT_PREP_ENV,JSON.stringify(Object.fromEntries(Object.entries(options.env).filter(([key]) => /^YSS_(BACKEND|DESIGN)_PLUGIN_CLI_ROOT$/.test(key)))));appendFileSync(trace,JSON.stringify({kind:'test-dispatch',file,args})+'\n');return {status:0};}
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Plugin CLI pins are immutable dependencies. Prepare exact commits and ignored snapshots
// outside the working tree; the backend builder reconstructs its historical migration CLI.
const root = "/tmp/yss-execution-pilot-20261001/source";
const temporary = realpathSync(mkdtempSync(path.join("/tmp/yss-execution-pilot-20261001", 'prepared-clis-')));
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
        env: { ...env, YSS_SPEC_TEMPLATE_REPO: pathToFileURL(root).href, YSS_SPEC_TEMPLATE_REF: pin.template_commit },
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
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...tests], { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (!process.env.PILOT_KEEP_PREP) rmSync(temporary, { recursive: true, force: true });
}
