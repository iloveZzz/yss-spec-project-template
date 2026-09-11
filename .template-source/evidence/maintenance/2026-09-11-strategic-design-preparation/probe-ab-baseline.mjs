// Synthetic, temporary probes only. Never use their records as real approvals.
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const design = path.join(root, 'submodules/yss-harness-design-agent');
const { parseDocument } = await import(pathToFileURL(path.join(design, 'scripts/vendor/yaml.mjs')));
const { buildDecisionFixture } = await import(pathToFileURL(path.join(design, 'scripts/fixtures/user-decision/build-fixture.mjs')));
const { assertUserDecisionRequirement } = await import(pathToFileURL(path.join(design, 'scripts/lib/user-decision.mjs')));
const { validateApprovalRecord } = await import(pathToFileURL(path.join(design, 'scripts/lib/approval-record.mjs')));
const temp = mkdtempSync(path.join(tmpdir(), 'yss-ab-baseline-'));
const rows = [];
const approval = { schema_version: 1, gate_id: 'gate.spec-baseline-approved', decision: 'approved', actor_kind: 'digital-human', role_id: 'role.product-manager', runtime_id: 'runtime.generic', principal_ref: 'synthetic-only:product' };
function command(id, executable, args, target, limit) {
  const r = spawnSync(executable, args, { cwd: design, encoding: 'utf8' });
  rows.push({ id, target, observed: r.status === 0 ? 'accept' : 'reject', actual_exit_code: r.status, stdout: r.stdout?.trim(), stderr: r.stderr?.trim(), spawn_error: r.error?.message, limit });
}
function library(id, fn, target, limit) {
  try { fn(); rows.push({ id, target, observed: 'accept', limit }); }
  catch (e) { rows.push({ id, target, observed: 'reject', error: e.code || e.message, limit }); }
}
try {
  const template = parseDocument(readFileSync(path.join(design, 'docs/process/templates/lifecycle-checkpoint-template.yaml'), 'utf8')).toJS();
  function checkpoint(id, mutate, target) {
    const value = structuredClone(template);
    mutate(value);
    const file = path.join(temp, `${id}.json`);
    writeFileSync(file, JSON.stringify(value));
    command(id, process.execPath, [path.join(design, 'scripts/verify-lifecycle-checkpoint'), file], target, 'Checkpoint CLI at initial routing only; does not prove complete lifecycle acceptance.');
  }
  checkpoint('A-01', v => { v.ticket_sync = { status: 'pending', refs: [] }; }, 'accept');
  checkpoint('A-02', v => { v.next_work_unit = 'work-unit.slice-implementation'; }, 'reject');
  checkpoint('A-03', v => { v.artifacts['artifact.parent-ticket'] = { status: 'draft', ref: 'docs/.scratch/demo/parent-ticket.md', evidence_refs: [] }; }, 'reject');
  const record = path.join(temp, 'approval.json');
  writeFileSync(record, JSON.stringify(approval));
  command('B-01', process.execPath, [path.join(design, 'scripts/verify-approval-record'), record], 'reject', 'Default current approval must not be confused with historical structural reading.');
  command('B-02', process.execPath, [path.join(design, 'scripts/verify-approval-record'), '--require-approved', record], 'reject-user-decision', 'Current rejection due to unsupported option is not the intended semantic rejection.');
  library('B-03', () => validateApprovalRecord(approval, { requireApproved: true }), 'reject', 'Single approval library seam only.');
  function decision(id, mutate, target) {
    const f = buildDecisionFixture(path.join(temp, id));
    mutate(f);
    f.save();
    library(id, () => assertUserDecisionRequirement(f.requirement), target, 'User decision library seam; not checkpoint or offline package verification.');
  }
  decision('B-04', () => {}, 'accept');
  decision('B-05', f => { f.record.responses = []; }, 'reject');
  decision('B-06', f => { f.record.responses = []; f.respond({ actor: 'digital-human' }); }, 'reject');
  decision('B-07', f => { writeFileSync(f.requirement.subject_ref, 'changed'); }, 'reject');
  decision('B-08', f => { f.respond({ decision: 'revoked', text: '撤回同意', time: '2026-09-05T01:04:00Z' }); }, 'reject');
  decision('B-09', f => { f.requirement.scope = ['scope.not-approved']; }, 'reject');
  decision('B-10', f => { f.write('unrelated.md', 'not part of approval basis'); }, 'accept');
} finally { rmSync(temp, { recursive: true, force: true }); }
const revision = cwd => spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).stdout.trim();
const output = { kind: 'synthetic-baseline-observation', executed_at: new Date().toISOString(), root_revision: revision(root), design_revision: revision(design), command: 'node .template-source/evidence/maintenance/2026-09-11-strategic-design-preparation/probe-ab-baseline.mjs', note: 'Exit 0 means observation collection completed, not acceptance tests passed. Targets describe the agreed future behavior.', rows };
writeFileSync(path.join(here, 'ab-baseline-results.json'), `${JSON.stringify(output, null, 2)}\n`);
for (const r of rows) process.stdout.write(`${r.id}: observed=${r.observed}, target=${r.target}${r.actual_exit_code !== undefined ? `, exit=${r.actual_exit_code}` : ''}\n`);
