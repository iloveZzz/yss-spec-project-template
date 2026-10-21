import { attachScaffoldDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
import { referenceExample } from "../../../../scripts/lib/scaffold-reference-example.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { attachDesignPrerequisites } from "../../../../scripts/fixtures/backend-scaffold/design-prerequisites.mjs";
import { validateNextRoute } from "../../../../scripts/lib/lifecycle-transition.mjs";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "generate_scaffold.mjs");
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const capabilityModules = {
  basic: { capabilities: [], modules: ["server", "service", "repository"] },
  adapter: { capabilities: ["external-integration"], modules: ["server", "service", "repository", "adapter"] },
  client: { capabilities: ["published-client"], modules: ["server", "service", "repository", "client"] },
  feign: { capabilities: ["feign-client"], modules: ["server", "service", "repository", "client", "feign-client"] },
  combined: { capabilities: ["external-integration", "feign-client"], modules: ["server", "service", "repository", "adapter", "client", "feign-client"] }
};

async function fixture(t, { profile = capabilityModules.basic, architectureProfile = "layered-mvc-service", skillId = "yss-layered-mvc-scaffold-generator", schemaVersion = 4, dataImpact = "not-applicable", apiImpact = "not-applicable" } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "yss-layered-mvc-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, "backend");
  await mkdir(output);
  let decisionText = `${JSON.stringify({ schema_version: 1, kind: "scaffold-architecture-decisions", template: false, status: "current", decisions: [{ decision_id: "scaffold-decision.demo-service", project_id: "demo-service", parent_project_id: null, status: "lifecycle-approved", recommended_architecture: "layered-mvc", recommendation_reasons: ["薄 CRUD 服务"], confirmed_architecture: "layered-mvc", override_reason: null, inheritance_mode: "root-default", inherited_from: null, platform_profile: "spring-boot-2.7-jdk8", architecture_profile: architectureProfile, verification_database: "h2", production_database: "not-bound", requested_capabilities: profile.capabilities, resolved_modules: profile.modules, resolution_version: 1, user_confirmation: { confirmed_by: "tester", channel: "test", confirmation_ref: "test://confirmation", confirmed_at: "2026-09-05T00:00:00Z", normalized_text: "确认使用 MVC" }, decision_inputs_digest: `sha256:${"1".repeat(64)}` }] }, null, 2)}\n`;
  const decisionSet = JSON.parse(decisionText);
  decisionSet.decisions = decisionSet.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(root, "user-decision"), decision));
  decisionText = JSON.stringify(decisionSet, null, 2) + "\n";
  const decisionFile = path.join(root, "scaffold-architecture-decisions.yaml");
  await writeFile(decisionFile, decisionText);
  const contract = {
    schema_version: schemaVersion,
    ...(schemaVersion >= 5 ? { reference_example: referenceExample() } : {}),
    kind: "project-scaffold-contract",
    delivery_role: "backend",
    scaffold_kind: architectureProfile === "mvc-data-analysis-v1" ? "backend-mvc-data-analysis" : "backend-layered-mvc",
    repository_scope: "external-repository",
    init_git: architectureProfile === "mvc-data-analysis-v1",
    contract_id: "scaffold.demo-service.v1",
    contract_version: 1,
    scaffold_request_id: "request.demo-service",
    status: "approved",
    compiler_draft_ref: "compiler://demo/1",
    lifecycle_approval_ref: "approval://demo/1",
    persisted_ref: "contract://demo/1",
    current_version: schemaVersion >= 4 ? true : 1,
    implementation_repository: "external",
    backend_repository: "external",
    scaffold_status: "required",
    project_name: "demo-service",
    target_output_dir: output,
    base_package: "com.yss.demo",
    architecture_family: "layered-mvc", architecture_profile: architectureProfile,
    generator_skill: skillId,
    decision_ref: decisionFile,
    decision_id: "scaffold-decision.demo-service",
    decision_digest: digest(decisionText),
    maven_coordinates: { group_id: "com.yss.demo", project_version: "1.0.0-SNAPSHOT", parent: { group_id: "com.yss.cloud", artifact_id: "yss-cloud-microservice", version: "2.0.0-SNAPSHOT" }, yss_components_version: "2.0.0-SNAPSHOT" },
    profiles: { architecture: "layered-mvc", persistence: "mybatis-plus", verification_database: "h2", production_database: "not-bound", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", repository: "yss-internal" },
    module_profile: { requested_capabilities: profile.capabilities, resolved_modules: profile.modules, resolution_version: 1 },
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "approval://demo/1", approver: "lifecycle", persisted_ref: "contract://demo/1", current_version: 1 },
    work_unit: { id: "scaffold.demo", behavior: "project-scaffold", primary_skill: skillId, supporting_skills: ["yss-implementation-contract-compiler"], tdd_mode: "controlled-generation", allowed_write_paths: ["."], expected_evidence: [".yss/scaffold-generation.json"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"], controlled_generation: true },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
  };
  const design = attachDesignPrerequisites(root, contract, { dataImpact, apiImpact });
  const contractFile = path.join(root, "contract.json");
  await writeFile(contractFile, `${JSON.stringify(contract, null, 2)}\n`);
  const args = ["--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output, "--contract-file", contractFile, "--contract-id", contract.contract_id, "--contract-version", "1", "--approval-ref", contract.lifecycle_approval_ref, "--compiler-draft-ref", contract.compiler_draft_ref, "--persisted-ref", contract.persisted_ref, "--group-id", "com.yss.demo", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.cloud", "--parent-artifact-id", "yss-cloud-microservice", "--parent-version", "2.0.0-SNAPSHOT", "--yss-components-version", "2.0.0-SNAPSHOT"];
  return { root, output, decisionFile, contractFile, contract, design, args, project: path.join(output, "demo-service") };
}

test("退役数据分析入口在目录、Git 和 skillUtils 写入前拒绝", async t => {
  const data = await fixture(t, { architectureProfile: "mvc-data-analysis-v1", profile: { capabilities: [], modules: ["server", "core", "client", "repository", "adapter", "feign-client"] } });
  const result = spawnSync(process.execPath, [script, ...data.args], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /retired.*setup-yss-harness/);
  assert.deepEqual(await readdir(data.output), []);
  for (const [from, to] of [["work-unit.implementation-repository-preparation", "work-unit.service-project-initialization"], ["work-unit.service-project-initialization", "work-unit.implementation-repository-preparation"]]) {
    assert.equal(validateNextRoute(from, to, {}, { root: data.root }).result, "blocked");
  }
});

test("旧数据库和 Mock 参数在写入前被拒绝", async (t) => {
  const data = await fixture(t);
  for (const args of [["--database", "mysql"], ["--with-mock"]]) {
    const result = spawnSync(process.execPath, [script, ...data.args, ...args], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    await assert.rejects(stat(data.project), { code: "ENOENT" });
  }
});

test("统一 Project Scaffold Contract v4 可生成 Layered MVC 后端并保留设计门禁", async (t) => {
  const data = await fixture(t);
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.schema_version, 4);
  assert.equal(manifest.design_prerequisites.data_architecture_decision.impact, "not-applicable");
});

test("数据影响为 required 时绑定数据架构后可生成 Layered MVC 后端", async (t) => {
  const data = await fixture(t, { dataImpact: "required" });
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.design_prerequisites.data_architecture_decision.impact, "required");
});

test("API 影响为 required 时绑定同字节 Draft、Validation、Review 和 Freeze 后可生成 Layered MVC 后端", async (t) => {
  const data = await fixture(t, { apiImpact: "required" });
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.design_prerequisites.api_contract_decision.impact, "required");
});

test("缺少设计门禁时在写文件前拒绝 Layered MVC 新生成", async (t) => {
  const data = await fixture(t);
  delete data.contract.design_prerequisites;
  await writeFile(data.contractFile, JSON.stringify(data.contract));
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /design_prerequisites|Technical Design/);
  await assert.rejects(stat(data.project), { code: "ENOENT" });
});

test("技术和数据设计齐全但缺少 API Decision 时在写文件前拒绝 Layered MVC 新生成", async (t) => {
  const data = await fixture(t);
  delete data.contract.design_prerequisites.api_contract_decision;
  await writeFile(data.contractFile, JSON.stringify(data.contract));
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /API Contract Decision|api_contract_decision/);
  await assert.rejects(stat(data.project), { code: "ENOENT" });
});

test("API Draft、Validation、Review 或工程批准异常时均在零写入状态阻断 Layered MVC", async (t) => {
  const mutations = [
    async (data) => writeFile(data.design.openapi.file, "\n# drift\n", { flag: "a" }),
    async (data) => {
      const decision = JSON.parse(await readFile(data.design.api.file, "utf8"));
      const file = path.join(data.root, decision.validation_record.ref);
      const record = JSON.parse(await readFile(file, "utf8"));
      record.status = "blocked";
      record.toolchain.exit_code = 1;
      record.checks.lint = "blocked";
      await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);
      decision.validation_record.digest = digest(await readFile(file));
      await writeFile(data.design.api.file, `${JSON.stringify(decision, null, 2)}\n`);
      data.contract.design_prerequisites.api_contract_decision.digest = digest(await readFile(data.design.api.file));
      await writeFile(data.contractFile, `${JSON.stringify(data.contract, null, 2)}\n`);
    },
    async (data) => {
      const decision = JSON.parse(await readFile(data.design.api.file, "utf8"));
      const file = path.join(data.root, decision.draft_review.ref);
      const review = JSON.parse(await readFile(file, "utf8"));
      review.result = "blocked";
      review.blocking_findings = ["breaking response"];
      await writeFile(file, `${JSON.stringify(review, null, 2)}\n`);
      decision.draft_review.digest = digest(await readFile(file));
      await writeFile(data.design.api.file, `${JSON.stringify(decision, null, 2)}\n`);
      data.contract.design_prerequisites.api_contract_decision.digest = digest(await readFile(data.design.api.file));
      await writeFile(data.contractFile, `${JSON.stringify(data.contract, null, 2)}\n`);
    },
    async (data) => {
      const approval = JSON.parse(await readFile(data.design.approval.file, "utf8"));
      approval.subject_ref = "approval://self-asserted";
      await writeFile(data.design.approval.file, `${JSON.stringify(approval, null, 2)}\n`);
    },
  ];
  for (const mutate of mutations) {
    const data = await fixture(t, { apiImpact: "required" });
    await mutate(data);
    const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
    assert.notEqual(result.status, 0, result.stderr);
    await assert.rejects(stat(data.project), { code: "ENOENT" });
  }
});

test("schema v3 只读兼容但禁止用于 Layered MVC 新生成", async (t) => {
  const data = await fixture(t, { schemaVersion: 3 });
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Project Scaffold Contract v4|新生成/);
  await assert.rejects(stat(data.project), { code: "ENOENT" });
});

test("可选离线 Maven 可行性检查（不替代受控仓库验收）", { skip: process.env.YSS_BACKEND_OFFLINE_PROBE !== "1" }, async (t) => {
  const data = await fixture(t);
  const generated = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  for (const phase of ["validate", "test", "package"]) {
    const result = spawnSync(path.join(data.project, "mvnw"), ["-o", phase], { cwd: data.project, encoding: "utf8", timeout: 60_000 });
    t.diagnostic(`./mvnw -o ${phase}: exit=${result.status}; ${result.error?.message ?? ""}`);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
});

for (const database of ["h2"]) {
  test(`生成 ${database} 基础 Profile`, async (t) => {
    const data = await fixture(t, { database });
    const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
    assert.equal(manifest.schema_version, 4);
    assert.equal(manifest.architecture_family, "layered-mvc");
    assert.equal(manifest.profiles.verification_database, database);
    assert.equal(manifest.profiles.production_database, "not-bound");
    assert.equal(manifest.architecture_identity.architecture_profile, "layered-mvc-service");
    const config = await readFile(path.join(data.project, "demo-service-server/src/main/resources/application.yml"), "utf8");
    assert.doesNotMatch(config, /datasource|profiles|jdbc:/);
    const local = await readFile(path.join(data.project, "demo-service-server/src/main/resources/application-scaffold-local.yml"), "utf8");
    assert.match(local, /jdbc:h2:mem:/);
    assert.deepEqual(manifest.module_profile.resolved_modules, capabilityModules.basic.modules);
    await stat(path.join(data.project, "demo-service-server/src/main/java/com/yss/demo/DemoServiceApplication.java"));
    await assert.rejects(stat(path.join(data.project, "demo-service-server/src/main/java/com/yss/demo/server/controller")), { code: "ENOENT" });
  });
}

for (const [name, profile] of Object.entries(capabilityModules)) {
  test(`能力闭包 ${name}`, async (t) => {
    const data = await fixture(t, { profile });
    const result = spawnSync(process.execPath, [path.resolve(path.dirname(script), "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), script, ...data.args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const pom = await readFile(path.join(data.project, "pom.xml"), "utf8");
    for (const module of profile.modules) assert.match(pom, new RegExp(`<module>demo-service-${module}</module>`));
    for (const module of ["adapter", "client", "feign-client"].filter((item) => !profile.modules.includes(item))) assert.doesNotMatch(pom, new RegExp(`<module>demo-service-${module}</module>`));
  });
}

test("选择缺失、digest 漂移和非空目标均阻断", async (t) => {
  const missing = await fixture(t);
  missing.contract.decision_id = "decision.missing";
  await writeFile(missing.contractFile, `${JSON.stringify(missing.contract)}\n`);
  assert.notEqual(spawnSync(process.execPath, [script, ...missing.args], { encoding: "utf8" }).status, 0);

  const drift = await fixture(t);
  drift.contract.decision_digest = `sha256:${"0".repeat(64)}`;
  await writeFile(drift.contractFile, `${JSON.stringify(drift.contract)}\n`);
  assert.notEqual(spawnSync(process.execPath, [script, ...drift.args], { encoding: "utf8" }).status, 0);

  const existing = await fixture(t);
  await mkdir(existing.project);
  const blocked = spawnSync(process.execPath, [script, ...existing.args], { encoding: "utf8" });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /目标已存在/);
});

test('v5 MVC 绑定默认示例，v4 不允许参数追加', async t => {
  for (const schemaVersion of [4, 5]) {
    const data = await fixture(t, { schemaVersion });
    const candidate = path.resolve(path.dirname(script), '../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs');
    if (schemaVersion === 4) {
      const rejected = spawnSync(process.execPath, [candidate, script, ...data.args, '--with-example'], { encoding: 'utf8' });
      assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /历史 v4/);
    }
    const result = spawnSync(process.execPath, [candidate, script, ...data.args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(path.join(data.project, '.yss/scaffold-generation.json'), 'utf8'));
    assert.equal(manifest.schema_version, schemaVersion);
    if (schemaVersion === 5) assert.deepEqual(manifest.reference_example, referenceExample());
    else await assert.rejects(stat(path.join(data.project, 'examples')), { code: 'ENOENT' });
  }
});

test('四阶段准备复用一次真实 Plan 授权且不依赖工程子批准或未来准入', async t => {
  const data=await fixture(t);
  const {installedFixture}=await import('../../../../scripts/fixtures/role-independent-draft/installed-fixture.mjs');
  const native=installedFixture('spec');t.after(()=>native.cleanup());const {root}=native;
  const contract=structuredClone(data.contract),contractFile=path.join(root,'contract.json'),decisionFile=path.join(root,'scaffold-architecture-decisions.yaml');
  for(const entry of await readdir(data.root))if(!['.template-spec','.agents','yss-project.yaml','CONTEXT.md'].includes(entry))await cp(path.join(data.root,entry),path.join(root,entry),{recursive:true});
  contract.decision_ref=decisionFile;
  const assetsPlan=path.join(path.dirname(root),'preparation-assets.plan.json');native.run('engineering-assets-plan',['assets','ensure','stage.system-data-engineering','--plan','--out',assetsPlan]);native.run('engineering-assets-apply',['assets','--apply','--plan-file',assetsPlan]);
  const {stageGatesFixture}=await import('../../../../scripts/lib/testing/stage-gates-fixture.mjs');
  const {digest:canonicalDigest}=await import('../../../../scripts/lib/strategic-handoff-io.mjs');
  const source=path.resolve(import.meta.dirname,'../../../..');
  const f=stageGatesFixture({existingRoot:root}),cpRef='.work/demo/checkpoint.json';
  const decisions=JSON.parse(await readFile(decisionFile,'utf8')),choice=decisions.decisions[0];
  const choiceSnapshot=structuredClone(choice);for(const key of ['user_confirmation','status','decision_inputs_digest'])delete choiceSnapshot[key];
  const catalog=JSON.parse(await readFile(path.join(root,'.template-spec/engineering/backend-platforms.json'),'utf8'));
  const profile=catalog.profiles.find(p=>p.id===choice.platform_profile&&(!choice.platform_configuration?.spring_boot_version||p.spring_boot_version===choice.platform_configuration.spring_boot_version));
  choiceSnapshot.platform_selection={profile_id:profile.id,spring_boot_version:profile.spring_boot_version,java_version:profile.java_version};
  f.write('choice-inputs.json',choiceSnapshot);
  const normalizedDecision=structuredClone(decisions);for(const row of normalizedDecision.decisions)delete row.user_confirmation;
  const initialTechnical=JSON.parse(await readFile(path.join(root,'technical-design.json'),'utf8'));
  initialTechnical.inputs=initialTechnical.inputs.map(input=>input.kind==='context'?{...input,digest:digest(f.read('CONTEXT.md'))}:input);f.write('technical-design.json',initialTechnical);
  const normalizedTechnical=structuredClone(initialTechnical);delete normalizedTechnical.digest;normalizedTechnical.architecture.decision_digest=canonicalDigest(normalizedDecision);
  const snapshot=structuredClone(contract);for(const key of ['approval','lifecycle_approval_ref','status'])delete snapshot[key];snapshot.decision_digest=canonicalDigest(normalizedDecision);delete snapshot.design_prerequisites.engineering_contract_approval_ref;snapshot.design_prerequisites.technical_design=normalizedTechnical;
  f.write('generation-inputs.json',snapshot);
  f.write(cpRef,{schema_version:2,repository_mode:'project-instance',feature_id:'feature.demo',mode:'orchestrate',status:'running',stage:'stage.plan',artifacts:{},checks:{},gates:{},context_reconciliation:{status:'pending',ref:null,evidence_refs:[]},next_work_unit:'work-unit.plan-requirements',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]});
  f.record({extraAssets:['choice-inputs.json','generation-inputs.json']});
  const invoke=(...args)=>{const r=spawnSync(process.env.YSS_NATIVE_BINARY,[...args,'--root',root,'--json'],{encoding:'utf8',maxBuffer:64*1024*1024});const d=JSON.parse(r.stdout);assert.equal(r.status,0,JSON.stringify(d).slice(0,4000));return d.result;};
  const plan=path.join(path.dirname(root),path.basename(root)+'.stage-plan.json');t.after(()=>rm(plan,{force:true}));
  invoke('lifecycle','decision','plan','--checkpoint',cpRef,'--input','stage.json','--out',plan);
  invoke('lifecycle','decision','apply','--plan',plan);
  const stage=f.doc(cpRef).gates['gate.plan-approved'].record_ref;
  Object.assign(choice.user_confirmation,{stage_record_ref:stage,checkpoint_ref:cpRef,decision_subject_ref:'choice-inputs.json',generation_inputs_ref:'generation-inputs.json'});
  await writeFile(decisionFile,JSON.stringify(decisions));contract.decision_digest=digest(await readFile(decisionFile));
  const technical=JSON.parse(await readFile(path.join(root,'technical-design.json'),'utf8'));technical.architecture.decision_digest=contract.decision_digest;
  const {technicalDigest}=await import('../../yss-technical-design/scripts/validate-technical-design.mjs');technical.digest=technicalDigest(technical);f.write('technical-design.json',technical);
  contract.design_prerequisites.technical_design.digest=digest(await readFile(path.join(root,'technical-design.json')));
  delete contract.design_prerequisites.engineering_contract_approval_ref;
  contract.lifecycle_approval_ref=stage;contract.approval.approval_ref=stage;await writeFile(contractFile,JSON.stringify(contract));
  await rm(path.join(root,'engineering-contract-approval.json'),{force:true});
  invoke('contract','verify','--kind','scaffold-inputs','--file','contract.json');
  assert.equal(f.doc(cpRef).gates['gate.implementation-admitted'],undefined);
  contract.allowed_write_paths.push('../outside');await writeFile(contractFile,JSON.stringify(contract));
  const rejected=spawnSync(process.env.YSS_NATIVE_BINARY,['contract','verify','--kind','scaffold-inputs','--file','contract.json','--root',root,'--json'],{encoding:'utf8'});assert.notEqual(rejected.status,0);
});
