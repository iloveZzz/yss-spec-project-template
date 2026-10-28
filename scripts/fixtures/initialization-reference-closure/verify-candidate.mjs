// Opt-in candidate acceptance: no fallback to PATH, fixed releases or mocks.
// Required environment: YSS_NATIVE_BINARY, YSS_NATIVE_BINARY_SHA256,
// YSS_CANDIDATE_TREE, YSS_CANDIDATE_COMMIT, YSS_CANDIDATE_AUDIT_ROOT.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {nativeBinary, runNative} from '../../../.template-source/scripts/lib/native-yss.mjs';
import {buildDecisionFixture} from '../../lib/testing/user-decision-fixture.mjs';

const env = process.env;
const fail = message => { throw new Error(message); };
const binary = env.YSS_NATIVE_BINARY;
const digest = env.YSS_NATIVE_BINARY_SHA256;
const tree = env.YSS_CANDIDATE_TREE;
const commit = env.YSS_CANDIDATE_COMMIT;
const auditRoot = env.YSS_CANDIDATE_AUDIT_ROOT;
for (const [key, value] of [['YSS_NATIVE_BINARY', binary], ['YSS_NATIVE_BINARY_SHA256', digest], ['YSS_CANDIDATE_TREE', tree], ['YSS_CANDIDATE_COMMIT', commit], ['YSS_CANDIDATE_AUDIT_ROOT', auditRoot]]) {
  if (!value) fail(`candidate acceptance requires ${key}; no candidate was validated`);
}
if (!path.isAbsolute(binary) || !path.isAbsolute(auditRoot)) fail('candidate binary and audit root must be absolute');
if (!/^[a-f0-9]{64}$/.test(digest) || !/^[a-f0-9]{40}$/.test(tree) || !/^[a-f0-9]{40}$/.test(commit)) fail('invalid candidate digest, tree or commit');
assert.equal(nativeBinary().digest, digest, 'candidate binary differs from supplied digest');
assert.ok(fs.statSync(auditRoot).isDirectory(), 'audit root must already exist');
const output = fs.mkdtempSync(path.join(auditRoot, 'init-reference-closure-'));
const commands = [];
function cli(args, expectedCode = 'OK') {
  let observed;
  let executedArgs;
  let executedCwd;
  try {
    const result = runNative(args, {expectedCode, run: (executable, argv, cwd, environment) => {
      executedArgs = argv;
      executedCwd = cwd ?? process.cwd();
      observed = spawnSync(executable, argv, {cwd, env: environment, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 600000});
      return observed;
    }});
    commands.push({executable: binary, args: executedArgs, cwd: executedCwd, exitCode: observed.status, code: result.code, status: result.status});
    return result.result;
  } catch (error) {
    commands.push({executable: binary, args: executedArgs ?? args, cwd: executedCwd ?? process.cwd(), exitCode: observed?.status ?? null, status: 'failed', error: error.message});
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n');
  }
}
function file(root, ref) { return path.join(root, ref); }
function present(root, ref) { assert.ok(fs.statSync(file(root, ref)).isFile(), `missing ${ref}`); }
function absent(root, ref) { assert.equal(fs.existsSync(file(root, ref)), false, `unexpected ${ref}`); }
function planAndApply(command, profile, root, selection, name) {
  const plan = path.join(output, `${name}.json`);
  const before = fs.readFileSync(file(root, '.yss.json'));
  cli([command, ...selection, '--profile', profile, '--root', root, '--plan', '--out', plan]);
  assert.deepEqual(fs.readFileSync(file(root, '.yss.json')), before, `${name}: plan changed metadata`);
  cli([command, ...selection, '--profile', profile, '--root', root, '--apply', '--plan-file', plan]);
}
function metadata(root) { return JSON.parse(fs.readFileSync(file(root, '.yss.json'), 'utf8')); }
function initialise(profile, installation, inspection) {
  const root = path.join(output, `${profile}-${installation}`);
  const args = ['init', '--profile', profile, '--root', root, '--project-name', 'Reference closure verification'];
  if (installation === 'governed') args.push('--installation', 'governed');
  const plan = path.join(output, `${profile}-${installation}-init.json`);
  cli([...args, '--plan', '--out', plan]);
  assert.equal(fs.existsSync(root), false, 'init plan must not create instance');
  cli(['init', '--profile', profile, '--root', root, '--apply', '--plan-file', plan]);
  const m = metadata(root);
  assert.equal(m.profile, profile);
  assert.equal(m.distribution.installation, installation);
  assert.equal(m.templateSourceState, 'working-tree');
  assert.equal(m.cliSourceState, 'working-tree');
  assert.equal(m.templateVersion, `worktree:${tree}`);
  assert.equal(m.templateCommit, commit);
  assert.equal(m.bundleHash, inspection.bundleHash);
  assert.equal(m.snapshotHash, inspection.sourceSnapshotHash);
  if (installation === 'skills') {
    for (const ref of ['yss-project.yaml', 'CONTEXT.md']) absent(root, ref);
    present(root, '.agents/skills/code-review/SKILL.md');
    // Reference assets are available without granting project governance.
    for (const ref of [
      '.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md',
      '.template-spec/process/orchestration-contract.yaml',
      '.template-spec/agents/issue-tracker.md',
      '.template-spec/templates/review-report-template.md',
    ]) present(root, ref);
    const contract = fs.readFileSync(file(root, '.template-spec/process/orchestration-contract.yaml'), 'utf8');
    const partRefs = [...contract.matchAll(/^\s+-\s+(orchestration\/[^\s]+\.yaml)\s*$/gm)].map(match => `.template-spec/process/${match[1]}`);
    assert.ok(partRefs.length > 0, `${profile}: orchestration contract must declare parts`);
    for (const ref of partRefs) present(root, ref);
    present(root, '.template-spec/agents/gitlab-workflow-skills.md');
    const matt = '.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md';
    const mattText = fs.readFileSync(file(root, matt), 'utf8');
    for (const [, target] of mattText.matchAll(/\]\((\.\.\/[^)#]+)(?:#[^)]*)?\)/g)) {
      assert.ok(fs.existsSync(path.resolve(path.dirname(file(root, matt)), target)), `${profile}: missing adaptation reference ${target}`);
    }
  } else {
    absent(root, '.template-source');
    present(root, 'yss-project.yaml');
    present(root, '.template-spec/process/agent-entry-policy.md');
  }
  return root;
}
function command(fileName, args, cwd, expectedStatus) {
  const r = spawnSync(process.execPath, [fileName, ...args], {cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024});
  commands.push({executable: process.execPath, args: [fileName, ...args], cwd, exitCode: r.status, expectedExitCode: expectedStatus, signal: r.signal, error: r.error?.message ?? null});
  fs.writeFileSync(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n');
  assert.equal(r.error, undefined, r.error?.message);
  assert.equal(r.status, expectedStatus, `${fileName}: ${r.stdout}\n${r.stderr}`);
  return r;
}
function competitiveInput(root, target) {
  fs.mkdirSync(target, {recursive: true});
  const data = JSON.parse(fs.readFileSync(file(root, '.agents/skills/yss-research/assets/evidence-template.yaml'), 'utf8'));
  data.evidence_items[0].source_level = 'primary';
  data.evidence_items[0].source_class = 'official-documentation';
  data.evidence_items[0].source_ref = 'fixture-public-document.md';
  data.claims[0].claim_kind = 'technical-fact';
  data.claims[0].statement = '固定资料明确支持工作流审批。';
  data.competitive_analysis = {
    schema_version: 1, output_selection: 'both', as_of: '2026-10-02', comparison_scope: '固定资料中的团队版审批能力',
    competitors: [{id: 'product-a', name: '样例 A', type: 'direct', product: '样例产品', version: '1', edition: 'team', region: 'global'}],
    capabilities: [{id: 'approval', module: '流程', name: '审批', definition: '指定审批人确认后继续流程', user_value: '责任可追溯'}],
    assessments: [{competitor_id: 'product-a', capability_id: 'approval', status: 'supported', claim_refs: ['claim-001'], limitations: [], gap: null}],
    artifacts: {matrix: 'demo-competitive-matrix.md', report: 'demo-competitive-analysis.md'},
  };
  const evidence = file(target, 'demo-evidence.yaml');
  const brief = file(target, 'demo-research-brief.md');
  fs.writeFileSync(evidence, JSON.stringify(data, null, 2));
  fs.writeFileSync(brief, fs.readFileSync(file(root, '.agents/skills/yss-research/assets/research-brief-template.md'), 'utf8') + '\nclaim-001\n');
  return {evidence, brief};
}

test('working-tree candidate closes initialization, research and preservation contracts', t => {
  t.diagnostic(`candidate acceptance artifacts: ${output}`);
  fs.writeFileSync(file(output, 'identity.json'), JSON.stringify({binary, digest, tree, commit}, null, 2) + '\n');
  const version = cli(['version']);
  assert.equal(version.sourceState, 'working-tree');
  const roots = {};
  const inspections = {};
  for (const profile of ['spec', 'backend']) {
    const inspection = cli(['bundle', 'inspect', '--profile', profile]);
    assert.equal(inspection.profile, profile);
    assert.equal(inspection.sourceState, 'working-tree');
    assert.equal(inspection.templateVersion, `worktree:${tree}`);
    assert.equal(inspection.templateCommit, commit);
    inspections[profile] = {bundleHash: inspection.bundleHash, snapshotHash: inspection.sourceSnapshotHash};
    for (const installation of ['skills', 'governed']) roots[`${profile}-${installation}`] = initialise(profile, installation, inspection);
  }
  fs.writeFileSync(file(output, 'identity.json'), JSON.stringify({binary, digest, tree, commit, inspections}, null, 2) + '\n');
  const backend = roots['backend-governed'];
  for (const ref of ['.template-spec/process/orchestration/domain/review.yaml', '.template-spec/process/templates/user-decision-template.yaml', '.template-spec/process/plan-migration.md']) present(backend, ref);
  absent(backend, '.template-spec/agents/digital-human-roles.yaml');
  // This fixture contains synthetic test-only message captures, never actual approval.
  const decision = buildDecisionFixture(file(backend, 'synthetic-decision'), {referenceRoot: backend, boundary: 'gate.backend-architecture-platform-approved'});
  const decisionArgs = ['evidence', 'verify', '--kind', 'user-decision', '--root', backend, '--file'];
  const verifiedDecision = cli([...decisionArgs, 'synthetic-decision/decision.json', '--from-record']);
  assert.equal(verifiedDecision.status, 'passed');
  assert.equal(verifiedDecision.approval_created, false);
  const noReply = structuredClone(decision.record);
  noReply.responses = [];
  fs.writeFileSync(file(backend, 'synthetic-decision/no-reply.json'), JSON.stringify(noReply, null, 2));
  cli([...decisionArgs, 'synthetic-decision/no-reply.json', '--from-record'], 'user-decision-response-required');
  const spec = roots['spec-governed'];
  const skillsSpec = roots['spec-skills'];
  const skillModule = file(skillsSpec, '.agents/skills/yss-research/scripts/lib/competitive-analysis.mjs');
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', 'import(process.argv[1])', skillModule], {cwd: skillsSpec, encoding: 'utf8'});
  assert.equal(imported.status, 0, `default research dependency import failed: ${imported.stderr}`);
  const lifecycle = spawnSync(process.execPath, [file(skillsSpec, 'scripts/lifecycle-status'), '--root', skillsSpec, '--checkpoint', '.work/checkpoint.json'], {cwd: skillsSpec, encoding: 'utf8'});
  assert.notEqual(lifecycle.status, 0, 'reference files must not grant governance to a skills installation');
  assert.match(lifecycle.stderr + lifecycle.stdout, /yss-project\.yaml/, 'status command must fail on missing identity rather than missing modules');
  planAndApply('skills', 'spec', skillsSpec, ['ensure', 'yss-prototype-stage'], 'spec-skills-prototype');
  for (const ref of ['.template-spec/design/design.md', '.template-source/design/preview.html', '.template-source/design/preview-dark.html', '.template-source/design/preview.css', '.template-source/design/preview.js', '.template-spec/design/tokens/variables.css', '.template-spec/design/tokens/variables.dark.css']) present(skillsSpec, ref);
  planAndApply('skills', 'spec', skillsSpec, ['ensure', 'yss-design-system'], 'spec-skills-design');
  fs.copyFileSync(file(process.cwd(), 'DESIGN.md'), file(skillsSpec, 'DESIGN.md'));
  fs.appendFileSync(file(skillsSpec, 'DESIGN.md'), '\n<!-- project customization -->\n');
  command(file(skillsSpec, '.agents/skills/yss-design-system/scripts/design-md.mjs'), ['lint', 'DESIGN.md'], skillsSpec, 0);
  present(spec, '.template-spec/agents/gitlab-workflow-skills.md');
  present(spec, 'scripts/gitworks');
  assert.match(fs.readFileSync(file(spec, '.template-spec/agents/issue-tracker.md'), 'utf8'), /gitlab-workflow-skills\.md/);
  planAndApply('assets', 'spec', spec, ['ensure', 'stage.spec-architecture'], 'spec-stage');
  present(spec, '.template-spec/templates/spec-template.md');
  planAndApply('skills', 'spec', spec, ['ensure', 'yss-research'], 'spec-research');
  for (const ref of ['.template-spec/plan/templates/competitive-matrix-template.md', '.template-spec/plan/templates/competitive-analysis-template.md', 'scripts/lib/json-schema.mjs', 'scripts/lib/validation-phase.mjs']) present(spec, ref);
  const renderer = '.agents/skills/yss-research/scripts/render-competitive-outputs.mjs';
  const validator = '.agents/skills/yss-research/scripts/validate-research-package.mjs';
  const good = competitiveInput(spec, file(output, 'competitive-good'));
  command(file(spec, renderer), [good.evidence], spec, 0);
  command(file(spec, validator), [good.brief, good.evidence], spec, 0);
  for (const ref of ['demo-competitive-matrix.md', 'demo-competitive-analysis.md']) present(path.dirname(good.evidence), ref);
  for (const [name, missing] of [['template', '.template-spec/plan/templates/competitive-analysis-template.md'], ['module', 'scripts/lib/json-schema.mjs']]) {
    const copy = file(output, `missing-${name}-instance`);
    fs.cpSync(spec, copy, {recursive: true});
    fs.unlinkSync(file(copy, missing));
    const input = competitiveInput(copy, file(output, `missing-${name}-input`));
    const r = command(file(copy, renderer), [input.evidence], copy, 1);
    assert.match(r.stderr + r.stdout, name === 'template' ? /competitive-analysis-template\.md/ : /json-schema\.mjs/);
    for (const ref of ['demo-competitive-matrix.md', 'demo-competitive-analysis.md']) absent(path.dirname(input.evidence), ref);
  }
  for (const installation of ['skills', 'governed']) {
    const root = roots[`spec-${installation}`];
    fs.writeFileSync(file(root, 'user-owned.txt'), 'user data stays\n');
    const context = file(root, 'CONTEXT.md');
    if (!fs.existsSync(context)) fs.writeFileSync(context, 'user context\n');
    const plan = file(output, `sync-${installation}.json`);
    cli(['sync', '--root', root, '--plan', '--out', plan]);
    cli(['sync', '--root', root, '--apply', '--plan-file', plan]);
    assert.equal(metadata(root).distribution.installation, installation);
    assert.equal(fs.readFileSync(file(root, 'user-owned.txt'), 'utf8'), 'user data stays\n');
    const driftPlan = file(output, `sync-${installation}-drift.json`);
    cli(['sync', '--root', root, '--plan', '--out', driftPlan]);
    fs.appendFileSync(context, '\nuser change after plan\n');
    cli(['sync', '--root', root, '--apply', '--plan-file', driftPlan], 'INPUT_DRIFT');
    assert.match(fs.readFileSync(context, 'utf8'), /user change after plan/);
  }
});
