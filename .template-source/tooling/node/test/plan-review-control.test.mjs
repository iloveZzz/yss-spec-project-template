import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from '../../../../scripts/lib/lifecycle-registry.mjs';
import { prepareReviewPackage } from '../../../../scripts/lib/review-package.mjs';
import { installedFixture } from '../../../../scripts/fixtures/role-independent-draft/installed-fixture.mjs';
import { prepareProfessionalPlanFixture } from '../../../../scripts/fixtures/role-independent-draft/professional-plan-fixture.mjs';
import { validateTaskPackage } from '../../../../scripts/lib/task-package.mjs';

// Exercise the current Backend policy with a real native installation.
function currentFixture(t) {
  const installed = installedFixture('backend'); t.after(() => installed.cleanup());
  const prepared = prepareProfessionalPlanFixture(installed, {outputDir: '.work/feature-demo/reviews/initial'});
  const {cpRef: checkpointRef, cp: checkpoint, options} = prepared;
  return {...installed, checkpointRef, checkpoint, options,
    save: () => installed.write(checkpointRef, checkpoint),
    reload: () => Object.assign(checkpoint, JSON.parse(installed.read(checkpointRef)))};
}
function prepareArgs(f, overrides = {}) {
  const options = { ...f.options, ...overrides };
  return [path.join(ROOT, 'scripts/prepare-review-package'), '--root', f.root, '--checkpoint', options.checkpointRef,
    ...options.checkIds.flatMap(id => ['--check', id]),
    ...[['role',options.roleId],['runtime',options.runtimeId],['actor',options.actorId],['reviewer-principal',options.reviewerPrincipalRef],
      ['drafter-principal',options.drafterPrincipalRef],['implementation-actor',options.implementationActorId],['task-id',options.taskId],
      ['review-session',options.reviewSessionId],['work-unit',options.workUnitId],['review-input',options.reviewInputRef],['review-phase',options.reviewPhase]]
      .filter(([,value])=>value!==undefined).flatMap(([key,value])=>['--'+key,value]), '--output-dir', options.outputDir];
}
function run(args, cwd) { return spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 30000 }); }
function runAsync(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk);
    child.on('error', reject); child.on('close', status => resolve({ status, stdout, stderr }));
  });
}

test('prepare CLI dry-run writes no checkpoint, task, directory or transaction receipt', t => {
  const f = currentFixture(t), before = f.read(f.checkpointRef);
  const transactions = path.join(f.root, '.yss/transactions'), beforeTransactions = fs.readdirSync(transactions).sort();
  const dry = run([...prepareArgs(f), '--dry-run'], f.root);
  assert.equal(dry.status, 0, dry.stderr);
  const preview = JSON.parse(dry.stdout);
  assert.deepEqual(f.read(f.checkpointRef), before);
  assert.equal(fs.existsSync(path.join(f.root, f.options.outputDir)), false);
  assert.deepEqual(fs.readdirSync(transactions).sort(), beforeTransactions);
  assert.equal(preview.execution_authorization, 'not-granted');
});

test('failed package preparation reserves no review attempt', t => {
  const f = currentFixture(t), before = f.read(f.checkpointRef);
  assert.throws(() => prepareReviewPackage({ ...f.options, roleId: 'role.frontend-engineer' }), /新审阅包不接受旧岗位/);
  assert.deepEqual(f.read(f.checkpointRef), before);
  assert.equal(f.reload().plan_review_control.attempts.length, 0);
  assert.equal(fs.existsSync(path.join(f.root, f.options.outputDir)), false);
});

test('transactional preparation persists one reservation and task renaming returns the original task', t => {
  const f = currentFixture(t), prepared = prepareReviewPackage(f.options);
  assert.equal(prepared.decision, 'pending');
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  const renamedInput = JSON.parse(f.read(f.options.reviewInputRef));
  renamedInput.task.provenance.task_ref = '.work/feature-demo/reviews/renamed/task.json';
  renamedInput.task.provenance.execution_ref = 'renamed-dispatch.json';
  const renamedDispatch = JSON.parse(f.read('review-execution.json'));
  renamedDispatch.task_ref = renamedInput.task.provenance.task_ref;
  f.write('renamed-dispatch.json', renamedDispatch);
  f.write(f.options.reviewInputRef, renamedInput);
  const renamed = prepareReviewPackage({ ...f.options, taskId: 'synthetic.renamed', outputDir: '.work/feature-demo/reviews/renamed' });
  assert.equal(renamed.task_ref, prepared.task_ref);
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  assert.equal(fs.existsSync(path.join(f.root, '.work/feature-demo/reviews/renamed')), false);
  assert.equal(prepared.transaction.status, 'applied');
  assert.equal(prepared.transaction.kind, 'review-package');
  const status = f.run('review-publication-recovery', ['recover']);
  assert.equal(status.status, 'ok');
  assert.deepEqual([...(status.pending || []), ...(status.preparations || [])], []);
});

test('concurrent prepare CLI processes leave one valid reservation with no partial task publication', async t => {
  const f = currentFixture(t);
  const results = await Promise.all([
    runAsync(prepareArgs(f), f.root),
    runAsync(prepareArgs(f), f.root)
  ]);
  for (const row of results) if (row.status !== 0) assert.match(row.stderr, /lock|锁|EEXIST|DRIFT|并发|PLAN_REVIEW|ASSET_TRANSACTION_PENDING|VALIDATION_INPUT_CHANGED|NATIVE_INPUT_INVALID/);
  // Concurrent native transports may both fail closed; retry only after both exit.
  const recovered = prepareReviewPackage(f.options);
  assert.equal(recovered.decision, 'pending');
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  const tasks = [f.options.outputDir, '.work/feature-demo/reviews/concurrent'].filter(ref => fs.existsSync(path.join(f.root, ref, 'task.json')));
  assert.equal(tasks.length, 1);
  const task = JSON.parse(f.read(path.posix.join(tasks[0], 'task.json')));
  assert.doesNotThrow(() => validateTaskPackage(task, { root: f.root }));
});
