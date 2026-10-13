import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { resolveMaintenanceOutput } from "../../scripts/lib/maintenance-storage.mjs";
import { createHash } from "node:crypto";
import { stringify } from "../../scripts/vendor/yaml.mjs";
import { evaluateMaintenanceReviewRound, generateReviewerTaskPackages } from "../../scripts/lib/maintenance-review-workflow.mjs";
import { captureMaintenanceCandidate, inspectMaintenanceCandidate } from "../../scripts/lib/maintenance-candidate.mjs";
import { validateTaskPackage } from "../../scripts/lib/task-package.mjs";
import { validateMaintenanceCheckpoint } from "../../scripts/lib/maintenance-intensity.mjs";
import { ROOT } from "../../scripts/lib/template-verification.mjs";

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reviewFixture=process.argv.includes('--review-fixture');
if(!reviewFixture){
  // Keep the state/package fixture separate from the real repository's complete
  // release policy. Its observed verifier and independent policy are real.
  const base=fs.realpathSync(mkdtempSync(path.join(os.tmpdir(),'review-workflow-source-'))),source=path.join(base,'source');
  try{
    mkdirSync(source);
    fs.cpSync(path.join(ROOT,'scripts'),path.join(source,'scripts'),{recursive:true,filter:file=>{const ref=path.relative(path.join(ROOT,'scripts'),file);return ref!=='fixtures'&&!ref.startsWith(`fixtures${path.sep}`);}});
    mkdirSync(path.join(source,'tests/scenarios'),{recursive:true});
    fs.copyFileSync(import.meta.filename,path.join(source,'tests/scenarios/verify-maintenance-review-workflow-scenarios.mjs'));
    for(const ref of ['.template-spec','.template-source/scripts/lib','.template-source/process','.template-source/cli-core'])fs.cpSync(path.join(ROOT,ref),path.join(source,ref),{recursive:true});
    for(const ref of ['AGENTS.md','CONTEXT.md','skills-lock.json'])fs.copyFileSync(path.join(ROOT,ref),path.join(source,ref));
    mkdirSync(path.join(source,'.agents/skills/maintaining-skills'),{recursive:true});fs.copyFileSync(path.join(ROOT,'.agents/skills/maintaining-skills/SKILL.md'),path.join(source,'.agents/skills/maintaining-skills/SKILL.md'));
    writeFileSync(path.join(source,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
    const check={id:'check.review-fixture',run:'node -e "require(\'node:assert/strict\').equal(2+2,4)"',group:'fixture',inputs_complete:true,input_patterns:['**'],depends_on:[],failure_mode:'review fixture execution failure'};
    writeFileSync(path.join(source,'.template-source/process/template-verification-profiles.yaml'),JSON.stringify({schema_version:1,profiles:{fast:{checks:[check]},release:{selection:'impact'}},groups:{fixture:{commands:[check]}},required_files:[],syntax_files:[],routing:[{patterns:['**'],groups:['fixture']}]}));
    const gitAt=(cwd,...args)=>{const result=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stderr);},git=(...args)=>gitAt(source,...args);git('init','-q');
    git('-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','prior release fixture');
    git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','isolated review fixture');
    // A real compiled Go fixture exercises observed report/source protocols.
    // It supplies no historical recovery evidence and never qualifies release.
    const cli=path.join(base,'synthetic-native-source'),binary=path.join(base,'synthetic-yss');mkdirSync(cli);writeFileSync(path.join(cli,'go.mod'),'module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');fs.copyFileSync(path.join(ROOT,'.template-source/scripts/tests/fixtures/native-release.go'),path.join(cli,'main.go'));
    gitAt(cli,'init','-q');gitAt(cli,'add','.');gitAt(cli,'-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','synthetic Go source');
    const cliCommit=spawnSync('git',['rev-parse','HEAD'],{cwd:cli,encoding:'utf8'}).stdout.trim(),templateCommit=spawnSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).stdout.trim();
    const flags=`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateCommit} -X main.designCommit=${templateCommit} -X main.backendCommit=${templateCommit}`;
    const built=spawnSync('go',['build','-trimpath','-ldflags',flags,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);
    const environment={...process.env,YSS_RUNTIME_HOME:path.join(base,'runtime'),YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:hash(fs.readFileSync(binary)),YSS_NATIVE_SOURCE_ROOT:fs.realpathSync(cli)};
    for(const key of ['YSS_RELEASE_NATIVE_INPUT','YSS_RELEASE_NATIVE_INPUT_SHA256','YSS_RELEASE_REQUIRED_PLATFORMS','YSS_RELEASE_SOURCE_EVIDENCE_DIR'])delete environment[key];
    const result=spawnSync(process.execPath,[path.join(source,'tests/scenarios/verify-maintenance-review-workflow-scenarios.mjs'),'--review-fixture'],{cwd:source,env:environment,encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr||result.stdout);
    process.stdout.write('合成 Go fixture 仅覆盖 Reviewer observed-report 合同，不构成实际四类发行或旧执行器恢复证据\n');
  }finally{rmSync(base,{recursive:true,force:true});}
}else{
const fixtureRef='maintenance:research/review-workflow-fixture',fixtureRoot=resolveMaintenanceOutput(fixtureRef,{root:ROOT});mkdirSync(fixtureRoot,{recursive:true});
try {
  const relativeRoot = fixtureRef;
  const digest = "a".repeat(64);
  const checkpointRef = `${relativeRoot}/checkpoint.yaml`;
  const candidateRef = `${relativeRoot}/candidate-manifest.yaml`;
  const outputDir = `${relativeRoot}/reviews`;
  const verificationRef = `${relativeRoot}/verification/report.json`,reportDirectory=path.join(fixtureRoot,'verification');
  const baseline=spawnSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'});assert.equal(baseline.status,0,baseline.stderr);
  const args=['--base',baseline.stdout.trim(),'--concurrency','1','--runtime-store','off','--report-dir',reportDirectory],verified=spawnSync(path.join(ROOT,'scripts/verify-template'),args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(verified.status,0,verified.stderr||verified.stdout);
  const reportFile=path.join(reportDirectory,'report.json'),report=JSON.parse(fs.readFileSync(reportFile));assert.equal(report.final_exit.observed,true);assert.equal(report.final_exit.code,0);
  assert.equal(report.scope.base,baseline.stdout.trim());assert.ok(report.results.some(row=>row.id==='check.review-fixture'&&row.actual_exit_code_observed&&row.actual_exit_code===0));
  mkdirSync(path.join(fixtureRoot,'reviews'));
  const checkpoint={
    schema_version: 2,
    intensity: "L2",
    classification_reason: "验证审查任务包生成",
    triggers: ["core-validator"],
    changed_assets: ["scripts/lib/template-verification.mjs"],
    verification_evidence: ["red", "green", "refactor", "pressure-scenario", "fresh-verification", "candidate-verification", "initial-release-verification", "review-task-packages"].map((kind) => kind === "initial-release-verification" ? { kind, command: "scripts/verify-template", args,exit_code:verified.status,result: "pass", executed_at:report.finished_at,duration_ms:report.metrics.wall_ms,evidence_ref:verificationRef,evidence_digest:hash(fs.readFileSync(reportFile)) } : { kind, command: `verify ${kind}`, result: "pass" }),
    review_mode: "formal-independent",
    escalation: "none",
    target_state: "review-ready",
    current_state: "review-ready",
    verification_profile: "release",
    review_round: 1,
    candidate_digest: digest
  };const checkpointFile=path.join(fixtureRoot,'checkpoint.yaml');writeFileSync(checkpointFile,stringify(checkpoint));
  assert.equal(validateMaintenanceCheckpoint(checkpoint).current_state, "review-ready");
  const needsHuman = { ...checkpoint, target_state: "release-ready", current_state: "needs-human", review_round: 2 };
  assert.equal(validateMaintenanceCheckpoint(needsHuman).current_state, "needs-human");
  for (const current of [checkpoint, needsHuman]) {
    assert.throws(() => validateMaintenanceCheckpoint({ ...current, verification_profile: "candidate" }), /verification_profile 无效/);
    const historical = { ...current, intensity: "L3", verification_profile: "candidate" };
    assert.equal(validateMaintenanceCheckpoint(historical, { history: true }).historical_only, true);
    assert.throws(() => validateMaintenanceCheckpoint({ ...current, verification_evidence: current.verification_evidence.filter(row => row.kind !== "initial-release-verification") }), /缺少 initial-release-verification/);
  }
  assert.throws(() => validateMaintenanceCheckpoint({ ...needsHuman, review_round: 1 }), /第二轮/);
  const streamRef = `${relativeRoot}/candidate.bin`;
  const diffRef = `${relativeRoot}/tracked.diff`;
  writeFileSync(path.join(fixtureRoot,'candidate.bin'), "stream");
  writeFileSync(path.join(fixtureRoot,'tracked.diff'), "diff");
  writeFileSync(path.join(fixtureRoot,'candidate-manifest.yaml'), stringify({ candidate_kind: "yss-worktree-candidate-v1", candidate_digest: digest, snapshot_stream_ref: streamRef, tracked_diff_ref: diffRef }));

  const packages = generateReviewerTaskPackages({
    checkpointRef,
    candidateRef,
    outputDir,
    candidateRequirement: "审查同一冻结候选字节",
    implementationActorId: "worker.verification-efficiency",
    round: 1
  });
  assert.deepEqual(packages.map((item) => item.axis), ["standards", "spec", "lead"]);
  for (const { package: taskPackage } of packages) {
    assert.equal(taskPackage.contract.candidate_digest, digest);
    assert.equal(taskPackage.contract.candidate_kind, "yss-worktree-candidate-v1");
    assert.equal(taskPackage.contract.candidate_requirement, "审查同一冻结候选字节");
    assert.ok(taskPackage.allowed_read_paths.includes(candidateRef));
    assert.ok(taskPackage.allowed_read_paths.includes(streamRef));
    assert.ok(taskPackage.allowed_read_paths.includes(diffRef));
    assert.equal(taskPackage.verification_results.length, 1);
    assert.equal(taskPackage.verification_results[0].evidence_ref, verificationRef);
    assert.equal(taskPackage.verification_results[0].evidence_digest,`sha256:${hash(fs.readFileSync(reportFile))}`);
    assert.ok(!stringify(taskPackage, { lineWidth: 0 }).includes("*a1"), "Reviewer 任务包不得依赖 YAML alias");
    validateTaskPackage(taskPackage);
  }
  assert.throws(() => generateReviewerTaskPackages({
    checkpointRef,
    candidateRef,
    outputDir,
    candidateKind: "worktree-packed",
    candidateRequirement: "审查同一冻结候选字节",
    implementationActorId: "worker.verification-efficiency",
    round: 1
  }), /candidateKind.*manifest/);
  const initial=checkpoint.verification_evidence.find(row=>row.kind==='initial-release-verification'),savedArgs=initial.args;delete initial.args;writeFileSync(checkpointFile,stringify(checkpoint));assert.throws(()=>generateReviewerTaskPackages({checkpointRef,candidateRef,outputDir,candidateRequirement:'同一候选',implementationActorId:'worker.fixture',round:1}),/实际 args/);initial.args=savedArgs;
  const savedDigest=initial.evidence_digest;initial.evidence_digest='0'.repeat(64);writeFileSync(checkpointFile,stringify(checkpoint));assert.throws(()=>generateReviewerTaskPackages({checkpointRef,candidateRef,outputDir,candidateRequirement:'同一候选',implementationActorId:'worker.fixture',round:1}),/摘要/);initial.evidence_digest=savedDigest;writeFileSync(checkpointFile,stringify(checkpoint));
  const savedReport=fs.readFileSync(reportFile);for(const mutate of [value=>value.final_exit.observed=false,value=>value.results=[]]){const changed=structuredClone(report);mutate(changed);writeFileSync(reportFile,JSON.stringify(changed));initial.evidence_digest=hash(fs.readFileSync(reportFile));writeFileSync(checkpointFile,stringify(checkpoint));assert.throws(()=>generateReviewerTaskPackages({checkpointRef,candidateRef,outputDir,candidateRequirement:'同一候选',implementationActorId:'worker.fixture',round:1}),/实际|退出|结果|任务/);}writeFileSync(reportFile,savedReport);initial.evidence_digest=savedDigest;writeFileSync(checkpointFile,stringify(checkpoint));

  assert.equal(evaluateMaintenanceReviewRound({ review_round: 1, candidate_digest: digest, findings: [{ disposition: "violation", status: "open" }] }).current_state, "review-ready");
  const second = evaluateMaintenanceReviewRound({ review_round: 2, candidate_digest: digest, findings: [{ disposition: "violation", status: "open" }, { disposition: "judgement-call", status: "open" }] });
  assert.equal(second.current_state, "needs-human");
  assert.equal(second.blocking_findings.length, 1);
  assert.equal(second.backlog_findings.length, 1);
  assert.throws(() => evaluateMaintenanceReviewRound({ review_round: 3, candidate_digest: digest, findings: [] }), /最多允许两轮/);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
process.stdout.write('当前 Reviewer 包消费真实 observed v2 证据验证通过\n');
process.exit(0);
}

const runtimeHome = fs.realpathSync(mkdtempSync(path.join(os.tmpdir(), "candidate-runtime-")));
const previousHome = process.env.YSS_RUNTIME_HOME;
process.env.YSS_RUNTIME_HOME = runtimeHome;
const candidateRepo = mkdtempSync(path.join(runtimeHome, "packed-candidate-"));
try {
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: candidateRepo, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
  };
  git("init", "-q");
  git("config", "user.email", "fixture@example.com");
  git("config", "user.name", "Fixture");
  writeFileSync(path.join(candidateRepo, "yss-project.yaml"), "schema_version: 1\nrepository_mode: template-source\n");
  writeFileSync(path.join(candidateRepo, "tracked.txt"), "before\n");
  git("add", "tracked.txt", "yss-project.yaml");
  git("commit", "-qm", "base");
  writeFileSync(path.join(candidateRepo, "tracked.txt"), "after\n");
  writeFileSync(path.join(candidateRepo, "untracked.txt"), "packed\n");
  mkdirSync(path.join(candidateRepo, ".template-source/evidence/maintenance/reviews/review-evidence"), { recursive: true });
  writeFileSync(path.join(candidateRepo, ".template-source/evidence/maintenance/reviews/review-evidence/report.md"), "not implementation\n");
  mkdirSync(path.join(candidateRepo, "scripts"));
  writeFileSync(path.join(candidateRepo, "scripts/new-validator.mjs"), "export default true;\n");
  assert.throws(() => captureMaintenanceCandidate({
    root: candidateRepo,
    outputDir: "maintenance:candidates/rejected-candidate",
    baseRef: "HEAD",
    excludePaths: ["scripts/new-validator.mjs"]
  }), /excludePaths.*退役/);
  assert.throws(() => captureMaintenanceCandidate({ root: candidateRepo, outputDir: 'maintenance:candidates/rejected-legacy', excludePaths: ['.template-source/evidence/maintenance/reviews/review-evidence'] }), /excludePaths.*退役/);
  const outputDir = "maintenance:candidates/candidate";
  const outputPath = resolveMaintenanceOutput(outputDir, { root: candidateRepo });
  const captured = captureMaintenanceCandidate({ root: candidateRepo, outputDir, baseRef: "HEAD" });
  assert.equal(captured.manifest.storage, "packed-stream");
  assert.deepEqual(captured.manifest.untracked_files, [".template-source/evidence/maintenance/reviews/review-evidence/report.md", "scripts/new-validator.mjs", "untracked.txt"]);
  assert.deepEqual(captured.manifest.excluded_paths, []);
  assert.equal(captured.files.length, 3, "packed candidate 只保存 manifest、stream 和 tracked diff");
  assert.deepEqual(readdirSync(path.join(outputPath)).sort(), ["candidate-manifest.yaml", "candidate.bin", "tracked.diff"]);
  const manifestPath = path.join(outputPath, "candidate-manifest.yaml");
  const inspected = inspectMaintenanceCandidate({ manifestPath, root: candidateRepo });
  assert.equal(inspected.entries.find((entry) => entry.path === "untracked.txt").content.toString(), "packed\n");
  assert.throws(() => captureMaintenanceCandidate({ root: candidateRepo, outputDir, baseRef: "HEAD" }), /outputDir.*不存在/);
  writeFileSync(path.join(outputPath, "stale.txt"), "stale\n");
  assert.throws(() => inspectMaintenanceCandidate({ manifestPath, root: candidateRepo }), /恰好包含/);
} finally {
  rmSync(candidateRepo, { recursive: true, force: true });
  rmSync(runtimeHome, { recursive: true, force: true });
  if (previousHome === undefined) delete process.env.YSS_RUNTIME_HOME; else process.env.YSS_RUNTIME_HOME = previousHome;
}

process.stdout.write("模板维护审查两轮收敛场景验证通过\n");
