import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verificationInputDigest } from '../../../../scripts/lib/verification-report.mjs';
import { publishTestFixture, runtimeIdentity } from './tooling-fixture.mjs';
import { runToolingProcess } from './tooling-process.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const mode = process.env.YSS_TOOLING_MODE || 'legacy';
const budget = Number(process.env.YSS_TOOLING_CONCURRENCY || 2);
const timeoutMs = Number(process.env.YSS_TOOLING_TIMEOUT_MS || 600000);
if (!['legacy', 'optimized'].includes(mode) || !Number.isInteger(budget) || budget < 1 || budget > 4
    || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 600000) throw new Error('invalid-tooling-options');
const parallelFiles = new Set(['plugin-design-consumption.test.mjs', 'plugin-entry-migration.test.mjs', 'plugin-project.test.mjs', 'product-design-plugin.test.mjs']);
const reuseFiles = new Set(['plugin-design-consumption.test.mjs', 'plugin-entry-migration.test.mjs', 'plugin-project.test.mjs']);
const testRef = file => path.relative(path.join(root, '.template-source/tooling/node/test'), file);
const externalReport = process.env.YSS_TOOLING_REPORT_DIR;
if (externalReport) {
  const destination = path.resolve(externalReport), parent = fs.realpathSync(path.dirname(destination));
  if (fs.existsSync(destination) || parent === root || parent.startsWith(root + path.sep)) throw new Error('tooling-report-requires-new-external-directory');
}
const started = performance.now(), temporary = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'yss-plugin-test-clis-')));
const reportRoot = externalReport ? path.resolve(externalReport) : path.join(temporary, 'report');
fs.mkdirSync(reportRoot, { recursive: true });
const metrics = { schema_version: 1, kind: 'tooling-execution', mode, concurrency: mode === 'legacy' ? 1 : Math.min(2, budget),
  started_at: new Date().toISOString(), status: 'running', runtime: null, preparations: [], executions: [], tests: [], copies: [], builds: [], cleanup: null };
const controller = new AbortController();
const interrupt = () => controller.abort(); process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
const preparationTemp = path.join(temporary, 'preparation-temp');
fs.mkdirSync(preparationTemp);
const env = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', TMPDIR: preparationTemp, TMP: preparationTemp, TEMP: preparationTemp };
delete env.YSS_TOOLING_PLUGIN_FIXTURE; delete env.YSS_TOOLING_PLUGIN_FIXTURE_SHA256; delete env.YSS_TOOLING_COPY_LOG;
let sequence = 0, digest;
function save() { const file = path.join(reportRoot, 'metrics.json'); fs.writeFileSync(file + '.tmp', JSON.stringify(metrics, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); }
async function run(file, args, cwd, label, extraEnv = {}) {
  const row = await runToolingProcess(file, args, { cwd, env: { ...env, ...extraEnv }, logRoot: reportRoot,
    name: `${sequence++}-${label}`, signal: controller.signal, timeoutMs });
  return row;
}
async function prepare(file, args, cwd, label, extraEnv) {
  const row = await run(file, args, cwd, label, extraEnv); metrics.preparations.push(row); save();
  if (row.code !== 0) throw new Error(`${label}: exit=${row.code}: ${row.error || row.stderrFile || row.reason}`);
  return fs.readFileSync(row.stdoutFile, 'utf8').trim();
}
function collectTests(args) {
  const found = new Set();
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`symbolic-test-path: ${file}`);
      return entry.isDirectory() ? walk(file) : [file];
    });
  }
  for (const arg of args) {
    if (arg.startsWith('-')) throw new Error(`unsupported-test-option: ${arg}`);
    const absolute = path.resolve(arg);
    if (!arg.includes('*')) { if (!fs.statSync(absolute).isFile()) throw new Error(`test-file-required: ${arg}`); found.add(absolute); continue; }
    const base = absolute.slice(0, absolute.indexOf('*')); const directory = base.endsWith(path.sep) ? base.slice(0, -1) : path.dirname(base);
    const pattern = absolute.split(path.sep).join('/').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('**/', '\x00').replaceAll('**', '\x01').replaceAll('*', '[^/]*').replaceAll('\x00', '(?:.*/)?').replaceAll('\x01', '.*');
    const matches = walk(directory).filter(file => new RegExp(`^${pattern}$`).test(file.split(path.sep).join('/')));
    if (!matches.length) throw new Error(`test-pattern-empty: ${arg}`);
    matches.forEach(file => found.add(file));
  }
  if (!found.size) throw new Error('test-files-required');
  return [...found].sort();
}
function testRecords(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}
try {
  metrics.runtime = runtimeIdentity();
  const tests = collectTests(process.argv.slice(2));
  metrics.selected_files = tests.map(file => path.relative(root, file));
  digest = verificationInputDigest(root); metrics.input_sha256 = digest; save();
  const dependencies = [];
  for (const [plugin, repository, variable] of [
    ['yss-backend-delivery', 'create-yss-spec', 'YSS_BACKEND_PLUGIN_CLI_ROOT'],
    ['yss-product-design', 'create-yss-strategic-design', 'YSS_DESIGN_PLUGIN_CLI_ROOT'],
  ]) {
    const pin = JSON.parse(fs.readFileSync(path.join(root, '.template-source/plugins', plugin, 'cli-pin.json')));
    const source = path.join(root, 'submodules', repository), cli = path.join(temporary, repository);
    await prepare('git', ['clone', '--quiet', '--shared', '--no-checkout', source, cli], root, `clone-${repository}`);
    const probe = await run('git', ['cat-file', '-e', `${pin.cli_commit}^{commit}`], cli, `pin-${repository}`);
    metrics.preparations.push(probe);
    if (probe.code !== 0) {
      if (probe.reason || controller.signal.aborted) throw new Error('pin-probe-interrupted');
      const remote = await prepare('git', ['remote', 'get-url', 'origin'], source, `remote-${repository}`);
      await prepare('git', ['fetch', '--depth=1', remote, pin.cli_commit], cli, `fetch-${repository}`);
    }
    await prepare('git', ['checkout', '--quiet', '--detach', pin.cli_commit], cli, `checkout-${repository}`);
    if (repository === 'create-yss-spec') await prepare(process.execPath, ['scripts/sync-template.js', '--require-committed'], cli, 'backend-snapshot',
      { YSS_SPEC_TEMPLATE_REPO: pathToFileURL(root).href, YSS_SPEC_TEMPLATE_REF: pin.template_commit });
    const snapshot = JSON.parse(fs.readFileSync(path.join(cli, 'template.snapshot.json')));
    if (snapshot.sourceState !== 'committed' || snapshot.templateCommit !== pin.template_commit
        || snapshot.snapshotHash !== pin.snapshot_hash || snapshot.manifestHash !== pin.manifest_hash) throw new Error(`plugin-test-snapshot-mismatch: ${pin.name}`);
    if (await prepare('git', ['status', '--porcelain', '--untracked-files=all'], cli, `clean-${repository}`)) throw new Error('plugin-test-cli-not-clean');
    dependencies.push({ pin, snapshot }); env[variable] = cli;
    console.log(`Plugin test dependency: ${pin.name}@${pin.version} (${pin.cli_commit})`);
  }
  let fixtureEnvironment = {};
  if (mode === 'optimized' && tests.some(file => reuseFiles.has(testRef(file)))) {
    const artifact = path.join(temporary, 'fixture/yss-backend-delivery'), manifestFile = path.join(temporary, 'fixture.json');
    JSON.parse(await prepare(process.execPath, [path.join(root, '.template-source/plugins/yss-backend-delivery/build.mjs'), '--output', artifact], root, 'backend-plugin-build'));
    const checksum = publishTestFixture({ sourceRoot: root, artifact, manifestFile, inputDigest: digest, dependencies });
    fixtureEnvironment = { YSS_TOOLING_PLUGIN_FIXTURE: manifestFile, YSS_TOOLING_PLUGIN_FIXTURE_SHA256: checksum };
  }
  async function executeTests(files, label) {
    if (controller.signal.aborted) return;
    const recordsFile = path.join(reportRoot, `${label}.tests.jsonl`), copyLog = path.join(reportRoot, `${label}.copies.jsonl`);
    const testTemp = path.join(temporary, 'test-temp', label);
    fs.mkdirSync(testTemp, { recursive: true });
    const extraEnv = { YSS_TOOLING_COPY_LOG: copyLog, TMPDIR: testTemp, TMP: testTemp, TEMP: testTemp,
      ...(mode === 'optimized' && files.length === 1 && reuseFiles.has(testRef(files[0])) ? fixtureEnvironment : {}) };
    const row = await run(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=spec', '--test-reporter-destination=stdout',
      `--test-reporter=${path.join(import.meta.dirname, 'tooling-reporter.mjs')}`, `--test-reporter-destination=${recordsFile}`, ...files], process.cwd(), label, extraEnv);
    row.test_files = files.map(file => path.relative(root, file)); row.records_file = recordsFile;
    metrics.executions.push(row);
    metrics.tests.push(...testRecords(recordsFile));
    const operations = testRecords(copyLog);
    metrics.copies.push(...operations.filter(item => item.kind === 'plugin-copy'));
    metrics.builds.push(...operations.filter(item => item.kind === 'plugin-build')); save();
    for (const file of [row.stdoutFile, row.stderrFile].filter(Boolean)) {
      for await (const chunk of fs.createReadStream(file)) (file === row.stdoutFile ? process.stdout : process.stderr).write(chunk);
    }
    if (row.code !== 0) process.exitCode = row.code;
  }
  if (mode === 'legacy') await executeTests(tests, 'all-tests');
  else {
    for (const [index, file] of tests.filter(file => !parallelFiles.has(testRef(file))).entries()) await executeTests([file], `serial-${index}`);
    const parallel = tests.filter(file => parallelFiles.has(testRef(file))); let next = 0;
    await Promise.all(Array.from({ length: Math.min(metrics.concurrency, parallel.length) }, async () => {
      while (next < parallel.length && !controller.signal.aborted) { const index = next++; await executeTests([parallel[index]], `parallel-${index}`); }
    }));
  }
  metrics.input_after_sha256 = verificationInputDigest(root); metrics.input_drift = metrics.input_after_sha256 !== digest;
  if (controller.signal.aborted) throw new Error('tooling-interrupted');
  if (metrics.input_drift) throw new Error('tooling-input-drift');
  if (metrics.executions.flatMap(row => row.test_files).length !== tests.length) throw new Error('tooling-tests-not-executed');
  metrics.status = process.exitCode ? 'failed' : 'passed';
} catch (error) {
  metrics.status = 'failed'; metrics.error = error.message; console.error(error.stack); process.exitCode = controller.signal.aborted ? 130 : 1;
} finally {
  const begin = performance.now();
  try { fs.rmSync(temporary, { recursive: true, force: true }); metrics.cleanup = { duration_ms: performance.now() - begin, code: 0 }; }
  catch (error) { metrics.cleanup = { duration_ms: performance.now() - begin, code: 1, error: error.message }; metrics.status = 'failed'; process.exitCode = 1; }
  metrics.wall_ms = performance.now() - started;
  if (controller.signal.aborted) { metrics.status = 'failed'; process.exitCode = 130; }
  if (externalReport) save();
  process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
}
