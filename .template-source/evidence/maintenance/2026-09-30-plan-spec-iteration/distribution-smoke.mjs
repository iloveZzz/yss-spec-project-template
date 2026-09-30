import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../../..');
const output = process.argv[2];
if (!output || path.resolve(output).startsWith(root + path.sep)) throw new Error('请指定仓库外报告路径');
const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'plan-spec-distribution-')));
const report = { kind: 'plan-spec-working-tree-distribution', source_state: 'working-tree', status: 'running', fixed_commit_delivery: false, publication: 'not-performed', scratch, results: [] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const run = (command, args, cwd, expected = 0) => {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== expected) throw new Error(`${command} ${args.join(' ')} exit=${r.status} ${r.error?.message ?? ''}\n${(r.stderr || r.stdout).slice(-4000)}`);
  return r.stdout;
};
try {
  for (const directory of ['create-yss-spec', 'create-yss-strategic-design', 'create-yss-harness-backend', 'create-yss-harness-frontend']) {
    const cli = path.join(root, 'submodules', directory), pkg = JSON.parse(fs.readFileSync(path.join(cli, 'package.json')));
    const snapshot = JSON.parse(fs.readFileSync(path.join(cli, 'template.snapshot.json')));
    assert.equal(snapshot.sourceState, 'working-tree');
    // Current development snapshot is already built and checked. Skip release-only prepack.
    const packOutput = run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], cli);
    const packed = JSON.parse(packOutput);
    const pack = Array.isArray(packed) ? packed[0] : packed.filename ? packed : packed[pkg.name];
    if (!pack?.filename) throw new Error(`npm pack returned unexpected metadata: ${packOutput.slice(0, 500)}`);
    const install = path.join(scratch, `${directory}-install`);
    run('npm', ['install', '--prefix', install, '--ignore-scripts', '--offline', '--no-audit', '--no-fund', path.join(scratch, pack.filename)], scratch);
    const entry = path.join(install, 'node_modules', pkg.name, pkg.bin[pkg.name]), project = path.join(scratch, `${directory}-instance`);
    if (directory === 'create-yss-spec') run(process.execPath, [entry, '--agent-runtime', 'codex', '--project-name', 'Plan Spec smoke', '--business-domain', 'Synthetic fixture', '--team-size', '1', '--issue-tracker', 'github', '--no-example-docs', '--target-dir', project], scratch);
    else run(process.execPath, [entry, 'init', '--target-dir', project, '--project-name', 'Plan Spec smoke', '--business-domain', 'Synthetic fixture', '--no-example-docs', '--json'], scratch);
    if (directory === 'create-yss-spec') {
      assert.ok(fs.existsSync(path.join(project, 'scripts/inspect-plan-spec')), 'Plan 默认阶段带诊断工具');
      run(process.execPath, [entry, 'assets', 'ensure', 'stage.spec-architecture', '--target-dir', project, '--apply'], scratch);
      run(process.execPath, [entry, 'skills', 'ensure', 'to-spec', '--target-dir', project, '--apply'], scratch);
    }
    const paths = ['scripts/inspect-plan-spec', 'scripts/lib/plan-spec-quality.mjs', 'scripts/lib/plan-spec-markdown.mjs', 'scripts/vendor/markdown.mjs', '.template-spec/templates/spec-template.md', '.template-spec/plan/templates/plan-template.md'];
    for (const ref of paths) assert.equal(sha(fs.readFileSync(path.join(project, ref))), sha(fs.readFileSync(path.join(root, ref))), `分发字节一致 ${pkg.name}: ${ref}`);
    assert.ok(fs.readFileSync(path.join(project, '.agents/skills/to-spec/SKILL.md'), 'utf8').includes('.template-spec/templates/spec-template.md'));
    // Synthetic input is explicitly copied, separate from no-example-docs policy.
    const fixture = '.template-spec/templates/examples/plan-spec';
    fs.cpSync(path.join(root, fixture), path.join(project, fixture), { recursive: true });
    const spec = `${fixture}/ordinary-valid.md`, source = `${fixture}/ordinary-source.md`;
    const original = [spec, source].map(ref => sha(fs.readFileSync(path.join(project, ref))));
    const args = [path.join(project, 'scripts/inspect-plan-spec'), 'check', '--root', project, '--spec', spec, '--json'];
    const first = run(process.execPath, args, project), second = run(process.execPath, args, project);
    assert.equal(first, second); assert.equal(JSON.parse(first).findings.length, 0);
    assert.deepEqual([spec, source].map(ref => sha(fs.readFileSync(path.join(project, ref)))), original);
    fs.writeFileSync(path.join(project, 'legacy-spec.md'), '# 旧格式\n\n## 功能需求\n\n| ID | 需求 |\n|---|---|\n| FR-001 | 未结构化行为 |\n');
    const legacy = JSON.parse(run(process.execPath, [args[0], 'check', '--root', project, '--spec', 'legacy-spec.md', '--json'], project));
    assert.ok(legacy.unevaluated.some(x => x.code === 'LEGACY_OR_UNKNOWN_PROFILE'));
    const diff = JSON.parse(run(process.execPath, [args[0], 'diff', '--root', project, '--before', `${fixture}/high-risk-before.md`, '--after', `${fixture}/high-risk-valid.md`, '--json'], project));
    assert.ok(diff.diff.entries.some(x => x.id === 'FR-002' && x.change === 'added'));
    const missing = JSON.parse(run(process.execPath, [args[0], 'diff', '--root', project, '--before', 'missing.md', '--after', spec, '--json'], project, 2));
    assert.equal(missing.diff.status, '无法比较旧内容');
    fs.writeFileSync(path.join(project, 'partial-spec.md'), fs.readFileSync(path.join(project, spec), 'utf8').replace('| ID | 需求 | 优先级 |', '| 编号 | 需求 | 优先级 |'));
    const partial = JSON.parse(run(process.execPath, [args[0], 'diff', '--root', project, '--before', spec, '--after', 'partial-spec.md', '--json'], project));
    assert.equal(partial.diff.status, 'partially-compared');
    assert.ok(!partial.diff.entries.some(item => item.change === 'removed'));
    fs.writeFileSync(path.join(project, 'malformed-slice.yaml'), 'schema_version: 3\nacceptance: [\n');
    const malformed = JSON.parse(run(process.execPath, [...args, '--slice', 'malformed-slice.yaml'], project, 2));
    assert.ok(malformed.findings.some(item => item.code === 'PARSE_ERROR'));
    assert.equal(fs.existsSync(path.join(project, 'node_modules')), false);
    run(process.execPath, [entry, 'sync', '--target-dir', project, ...(directory === 'create-yss-spec' ? ['--dry-run'] : ['--json'])], scratch);
    report.results.push({ package: pkg.name, version: pkg.version, snapshot: snapshot.snapshotHash ?? snapshot.templateHash ?? null, package_sha256: sha(fs.readFileSync(path.join(scratch, pack.filename))), install: 'offline', init: 'passed', byte_identity: 'passed', check_diff: 'passed', partial_diff: 'unassessed-as-designed', malformed_slice: 'exit-2-as-designed', legacy: 'unevaluated-as-designed', repeat_readonly: 'passed', sync_preview: 'passed' });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${pkg.name}: pack/install/init/byte-identity/check/diff/legacy/repeat/sync passed`);
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; process.exitCode = 1; console.error(error.message); }
finally { fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
