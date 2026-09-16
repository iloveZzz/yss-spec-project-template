import { platformSourceFingerprint, generatedTreeDigest, assertResumableCandidate } from "../../lib/backend-platform-provenance.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadBackendPlatforms, platformBinding, platformRecipeDigest, platformProfile, platformDigest, resolveBackendPlatform, assertJavaPlatform, assertContractPlatform } from "../../lib/backend-platform.mjs";
import { checkPlatformDependencies, checkPlatformTests, checkRuntimeArchive } from "../../lib/backend-platform-verification.mjs";
import { fixtureCatalog } from "./platform-fixture.mjs";
import { attachDesignPrerequisites } from "./design-prerequisites.mjs";
import { ScaffoldGenerator, parseArgs as parseDddArgs } from "../../../.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs";
import { generate as generateMvc, parseArgs as parseMvcArgs } from "../../../.agents/skills/yss-layered-mvc-scaffold-generator/scripts/generate_scaffold.mjs";
import { run as verifyScaffold } from "../../../.agents/skills/yss-ddd-scaffold-generator/scripts/run_scaffold_verification.mjs";

const profiles = loadBackendPlatforms().profiles;
export async function platformFixture(root, family, profile) {
  const output = path.join(root, "output");
  await mkdir(output, { recursive: true });
  const skill = family === "domain-driven" ? "yss-ddd-scaffold-generator" : "yss-layered-mvc-scaffold-generator";
  const modules = family === "domain-driven" ? ["domain", "application", "infrastructure", "adapter", "bootstrap"] : ["server", "service", "repository", "adapter", "client", "feign-client"];
  const capabilities = family === "domain-driven" ? [] : ["external-integration", "feign-client"];
  const architecture = family === "domain-driven" ? "target-domain-model" : "layered-mvc-service";
  const contract = {
    schema_version: 4, kind: "project-scaffold-contract", delivery_role: "backend", scaffold_kind: family === "domain-driven" ? "backend-ddd" : "backend-layered-mvc", repository_scope: "external-repository", init_git: false,
    contract_id: "platform-fixture", contract_version: 1, scaffold_request_id: "platform-fixture-request", status: "approved", compiler_draft_ref: "test-only-compiler", lifecycle_approval_ref: "test-only-approval", persisted_ref: "test-only-contract", current_version: true,
    implementation_repository: "external", backend_repository: "external", scaffold_status: "required", project_name: "platform-service", target_output_dir: output, base_package: "com.yss.platform", architecture_family: family, architecture_profile: architecture, generator_skill: skill,
    decision_ref: "decision.json", decision_id: "decision.platform", decision_digest: `sha256:${"0".repeat(64)}`,
    maven_coordinates: { group_id: "com.yss.test", project_version: "1.0.0-SNAPSHOT", parent: { group_id: "com.yss.cloud", artifact_id: "yss-cloud-microservice", version: "test-only-SNAPSHOT" }, yss_components_version: "test-only-SNAPSHOT" },
    profiles: { architecture: family === "domain-driven" ? "target-domain-model" : "layered-mvc", platform: profile.id, persistence: "mybatis-plus", validation_namespace: profile.validation_namespace, dto_placement: "web", repository: "yss-internal", verification_database: "h2", production_database: "not-bound" },
    module_profile: { requested_capabilities: capabilities, resolved_modules: modules, resolution_version: 1 }, allowed_write_paths: ["."], expected_evidence_files: [".yss/scaffold-generation.json"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "test-only-approval", approver: "fixture", persisted_ref: "test-only-contract", current_version: 1 },
    work_unit: { id: "fixture", behavior: "scaffold", primary_skill: skill, supporting_skills: ["alibaba-java-code-style"], tdd_mode: "controlled-generation", controlled_generation: true, allowed_write_paths: ["."], expected_evidence: ["manifest"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"] },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
  };
  const decision = { decision_id: contract.decision_id, project_id: contract.project_name, parent_project_id: null, recommended_architecture: family, confirmed_architecture: family, status: "lifecycle-approved", platform_profile: profile.id, architecture_profile: architecture, verification_database: "h2", production_database: "not-bound", requested_capabilities: capabilities, resolved_modules: modules, resolution_version: 1, user_confirmation: { confirmed_by: "test-only", channel: "fixture", confirmation_ref: "test-only", confirmed_at: "2026-09-16T00:00:00Z", normalized_text: "测试选择" }, decision_inputs_digest: `sha256:${"1".repeat(64)}` };
  await writeFile(path.join(root, "decision.json"), JSON.stringify({ schema_version: 1, kind: "scaffold-architecture-decisions", template: false, status: "current", decisions: [decision] }));
  attachDesignPrerequisites(root, contract);
  const contractFile = path.join(root, "contract.json");
  const save = () => writeFile(contractFile, JSON.stringify(contract));
  await save();
  const c = contract.maven_coordinates;
  const args = ["--project-name", contract.project_name, "--base-package", contract.base_package, "--output-dir", output, "--contract-file", contractFile, "--contract-id", contract.contract_id, "--contract-version", "1", "--approval-ref", contract.lifecycle_approval_ref, "--compiler-draft-ref", contract.compiler_draft_ref, "--persisted-ref", contract.persisted_ref, "--group-id", c.group_id, "--project-version", c.project_version, "--parent-group-id", c.parent.group_id, "--parent-artifact-id", c.parent.artifact_id, "--parent-version", c.parent.version, "--yss-components-version", c.yss_components_version];
  const catalog = fixtureCatalog(contract);
  const generate = (candidate = true) => family === "domain-driven" ? new ScaffoldGenerator(parseDddArgs(args), candidate ? { catalog, candidate: true } : {}).generate() : generateMvc(parseMvcArgs(args), candidate ? { platformOptions: { catalog, candidate: true } } : {});
  return { contract, contractFile, catalog, output, project: path.join(output, contract.project_name), save, generate };
}

for (const family of ["domain-driven", "layered-mvc"]) for (const profile of profiles) test(`candidate rendering only: ${family} ${profile.id}`, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-matrix-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await platformFixture(root, family, profile);
  await f.generate();
  const pom = await readFile(path.join(f.project, "pom.xml"), "utf8");
  assert.ok(pom.includes(`<version>${profile.spring_boot_version}</version>`));
  assert.ok(pom.includes(`<java.version>${profile.java_version === 8 ? "1.8" : profile.java_version}</java.version>`));
  assert.ok(pom.includes(`<version>${profile.versions.lombok}</version>`) || pom.includes(`<lombok.version>${profile.versions.lombok}</lombok.version>`));
  const webPath = family === "domain-driven" ? "platform-service-adapter/platform-service-web/pom.xml" : "platform-service-server/pom.xml";
  const web = await readFile(path.join(f.project, webPath), "utf8");
  assert.ok(web.includes(profile.web_starter));
  assert.ok(web.includes(profile.web_test_starter));
  if (family === "layered-mvc") assert.ok((await readFile(path.join(f.project, "platform-service-client/pom.xml"), "utf8")).includes(`<groupId>${profile.validation_group}</groupId>`));
  const runtimeModule = family === "domain-driven" ? "bootstrap" : "server";
  const smoke = await readFile(path.join(f.project, `platform-service-${runtimeModule}/src/test/java/com/yss/platform/PlatformIntegrationTest.java`), "utf8");
  assert.ok(smoke.includes(`${profile.validation_namespace}.validation.Validator`));
  assert.ok(smoke.includes('@Select("SELECT 1")'));
  assert.ok(smoke.includes("RANDOM_PORT"));
  assert.ok(smoke.includes("httpJsonRoundTrip"));
  assert.ok(smoke.includes("httpValidationRejectsBlank"));
  assert.ok(smoke.includes('@Value("${local.server.port}")'));
  assert.ok(smoke.includes(profile.jackson_major === 3 ? "tools.jackson.databind.json.JsonMapper" : "com.fasterxml.jackson.databind.ObjectMapper"));
  if (family === "layered-mvc") assert.ok(smoke.includes("feignCanDecodeJson"));
  const manifest = JSON.parse(await readFile(path.join(f.project, ".yss/scaffold-generation.json"), "utf8"));
  assert.deepEqual(manifest.platform_configuration, f.contract.platform_configuration);
  assert.equal(manifest.platform_verification, "candidate");
  assert.equal(manifest.completion_level, "generated");
  assert.deepEqual(manifest.source_fingerprint, platformSourceFingerprint(family));
  assert.equal(manifest.generated_tree_digest, generatedTreeDigest(f.project, manifest));
  assert.doesNotThrow(() => assertResumableCandidate(f.project, f.contract, JSON.stringify(f.contract)));
  await assert.rejects(() => verifyScaffold(f.project, path.join(root, "evidence")), /candidate/);
  await assert.rejects(() => verifyScaffold(f.project, path.join(root, "evidence"), {}, { firstSlice: true, platformOptions: { catalog: f.catalog, candidate: true } }), /first slice requires/);
  await assert.rejects(() => verifyScaffold(f.project, path.join(f.project, "evidence"), {}, { platformOptions: { catalog: f.catalog, candidate: true } }), /outside the generated project/);
  manifest.platform_configuration.java_version = profile.java_version === 8 ? 17 : 8;
  await writeFile(path.join(f.project, ".yss/scaffold-generation.json"), JSON.stringify(manifest));
  await assert.rejects(() => verifyScaffold(f.project, path.join(root, "evidence"), {}, { platformOptions: { catalog: f.catalog, candidate: true } }));
});

for (const family of ["domain-driven", "layered-mvc"]) test(`production fail-closed and zero writes: ${family}`, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-blocked-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await platformFixture(root, family, profiles[1]);
  await assert.rejects(() => f.generate(false), /compatibility entry missing/);
  assert.deepEqual(await readdir(f.output), []);
  delete f.contract.platform_configuration; await f.save();
  await assert.rejects(() => f.generate(false), /platform_configuration/);
  assert.deepEqual(await readdir(f.output), []);
});

test("version, digest, namespace, YSS coordinates and decision mismatches are rejected", () => {
  const contract = { profiles: { platform: profiles[1].id, validation_namespace: "jakarta" }, maven_coordinates: { parent: { group_id: "com.yss.cloud", artifact_id: "parent", version: "3.0" }, yss_components_version: "3.0" }, architecture_family: "layered-mvc" };
  const catalog = fixtureCatalog(contract);
  const binding = platformBinding(profiles[1], catalog.compatibility[0]);
  const options = { catalog, requireVerified: false };
  for (const change of [{ schema_version: 1 }, { java_version: 8 }, { java_version: 11 }, { spring_boot_version: "3.5.x" }, { spring_boot_version: "3.5.999" }, { compatibility_digest: `sha256:${"0".repeat(64)}` }]) assert.throws(() => resolveBackendPlatform({ ...binding, ...change }, options));
  contract.platform_configuration = binding;
  assert.throws(() => assertContractPlatform({ ...contract, profiles: { ...contract.profiles, validation_namespace: "javax" } }, null, options), /namespace/);
  assert.throws(() => assertContractPlatform(contract, { platform_configuration: { ...binding, java_version: 21 } }, options), /decision\/contract/);
  assert.throws(() => resolveBackendPlatform(binding, { catalog }), /not verified/);
  for (const java of [8, 11, 21]) assert.throws(() => assertJavaPlatform(`Java version: ${java}.0.1`, binding), /JDK mismatch/);
  assert.doesNotThrow(() => assertJavaPlatform('openjdk version "17.0.16"', binding));
  assert.equal(loadBackendPlatforms().compatibility.length, 0, "real combinations are not open without real evidence");
});

function dependencyFixture(profile = profiles[3]) {
  const artifacts = [["org.springframework.boot", profile.web_starter, profile.spring_boot_version], ["org.springframework", "spring-webmvc", "7.0.9"], ["org.apache.tomcat.embed", "tomcat-embed-core", "11.0.1"], ["com.baomidou", profile.mybatis_plus_starter, "3.5.17"], ["tools.jackson.core", "jackson-databind", "3.0.0"]].map(([groupId, artifactId, version]) => ({groupId, artifactId, version, scope: "compile", type: "jar"}));
  const tree = { groupId: "com.yss.test", artifactId: "probe-server", children: artifacts };
  const pom = `<project><properties><java.version>17</java.version></properties><build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId><version>${profile.spring_boot_version}</version></plugin></plugins></build></project>`;
  const bootBom = `<project><groupId>org.springframework.boot</groupId><artifactId>spring-boot-dependencies</artifactId><version>${profile.spring_boot_version}</version><dependencyManagement><dependencies>${artifacts.filter(a => a.groupId !== "com.baomidou").map(a => `<dependency><groupId>${a.groupId}</groupId><artifactId>${a.artifactId}</artifactId><version>${a.version}</version></dependency>`).join("")}</dependencies></dependencyManagement></project>`;
  return {profile, tree, pom, options: {bootBom, components: {"com.baomidou:mybatis-plus-spring-boot4-starter": "3.5.17"}, mainArtifact: "com.yss.test:probe-server"}};
}

test("runtime dependencies require startup module, proper scope and exact independent Boot BOM", () => {
  const f = dependencyFixture();
  const verify = trees => checkPlatformDependencies(f.profile, f.pom, trees, f.options);
  assert.equal(verify([f.tree]).status, "passed");
  for (const scope of ["test", "provided"]) assert.throws(() => verify([{...f.tree, children: f.tree.children.map(n => ({...n, scope}))}]), /absent/);
  assert.throws(() => verify([{...f.tree, artifactId: "other-module"}]), /startup-module/);
  const changed = structuredClone(f.tree); changed.children.find(n => n.artifactId === "spring-webmvc").version = "7.0.0";
  assert.throws(() => verify([changed]), /BOM/);
  assert.throws(() => checkPlatformDependencies(f.profile, f.pom, [f.tree]), /startup-module/);
  assert.throws(() => verify([{...f.tree, children: [...f.tree.children, {groupId:"javax.servlet",artifactId:"javax.servlet-api",version:"4.0.1"}]}]));
  assert.equal(verify([{...f.tree, children: [...f.tree.children, {groupId:"javax.sql",artifactId:"test-java-se-marker",version:"1.0"}]}]).status,"passed");
});

test("packaged runtime jar must contain every runtime artifact", () => {
  const f=dependencyFixture();
  const entries=f.tree.children.map(n=>`BOOT-INF/lib/${n.artifactId}-${n.version}.jar`).join("\n");
  assert.equal(checkRuntimeArchive(entries,f.tree.children).status,"passed");
  assert.throws(()=>checkRuntimeArchive(entries+"\nBOOT-INF/lib/javax.servlet-api-4.0.1.jar",f.tree.children),/unexpected packaged/);
  assert.equal(checkRuntimeArchive(entries+`\nBOOT-INF/lib/spring-boot-jarmode-tools-${f.profile.spring_boot_version}.jar`,f.tree.children).status,"passed");
  assert.equal(checkRuntimeArchive(entries+"\nBOOT-INF/lib/lombok-1.18.42.jar",f.tree.children,{providedLombokVersion:"1.18.42"}).status,"passed");
  assert.throws(()=>checkRuntimeArchive(entries+"\nBOOT-INF/lib/lombok-1.18.30.jar",f.tree.children,{providedLombokVersion:"1.18.42"}),/unexpected packaged/);
  assert.throws(()=>checkRuntimeArchive(entries.split("\n").slice(1).join("\n"),f.tree.children),/runtime jar missing/);
});


test("integration evidence rejects skipped tests and missing optional Feign coverage", () => {
  const cases = '<testcase name="httpJsonRoundTrip"/><testcase name="httpValidationRejectsBlank"/><testcase name="validationAndJsonAutoConfiguration"/><testcase name="mybatisCanMapVerificationQuery"/>';
  assert.equal(checkPlatformTests(`<testsuite>${cases}</testsuite>`).status, "passed");
  assert.throws(() => checkPlatformTests(`<testsuite>${cases}</testsuite>`, ["feign-client"]), /missing/);
  assert.throws(() => checkPlatformTests(`<testsuite>${cases.replace('<testcase name="mybatisCanMapVerificationQuery"/>', '<testcase name="mybatisCanMapVerificationQuery"><skipped/></testcase>')}</testsuite>`), /skipped/);
});

test("verified compatibility binds report bytes and every portable evidence artifact", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-evidence-")); t.after(() => rm(root, { recursive: true, force: true }));
  const contract = { profiles: { platform: profiles[0].id }, maven_coordinates: { parent: { group_id: "test", artifact_id: "parent", version: "test-only" }, yss_components_version: "test-only" } };
  const catalog = fixtureCatalog(contract), entry = catalog.compatibility[0];
  const refs = ["effective-pom.xml", "dependency-trees.json", "platform-tests.xml", "boot-bom-effective.xml", "runtime-jar-entries.log", "startup.stdout.log", "startup.stderr.log", ...["validate", "test", "package"].flatMap(phase => [`mvnw-${phase}.stdout.log`, `mvnw-${phase}.stderr.log`])];
  for (const ref of refs) await writeFile(path.join(root, ref), "synthetic mechanism fixture only");
  const report = { verification_scope: "empty-scaffold", recipe_digest: platformRecipeDigest(profiles[0], entry), source_fingerprint: platformSourceFingerprint("domain-driven"), generated_tree_digest: platformDigest("synthetic tree"), status: "passed", spring_boot_version: profiles[0].spring_boot_version, java_version: 8, architecture_family: "domain-driven", parent: entry.parent, bom: entry.bom, commands: ["validate", "test", "package"].map(phase => ({ command: `./mvnw ${phase}`, exit_code: 0, executed_at: "test-only", stdout_ref: `mvnw-${phase}.stdout.log`, stderr_ref: `mvnw-${phase}.stderr.log` })), dependency_check: "passed", startup_check: "passed", integration_tests: { status: "passed" }, evidence_artifacts: refs.map(ref => ({ ref, digest: platformDigest("synthetic mechanism fixture only") })) };
  const bytes = JSON.stringify(report); await writeFile(path.join(root, "report.json"), bytes);
  entry.status = "verified"; entry.evidence = [{ architecture_family: "domain-driven", ref: "report.json", digest: platformDigest(bytes) }];
  const binding = platformBinding(profiles[0], entry);
  assert.doesNotThrow(() => resolveBackendPlatform(binding, { catalog, root }));
  const originalBinding = structuredClone(binding);
  entry.evidence.push({...entry.evidence[0]});
  assert.deepEqual(platformBinding(profiles[0], entry), originalBinding, "new evidence alone must not change user selection");
  entry.evidence.pop();
  catalog.profiles[0] = {...catalog.profiles[0], versions: {...catalog.profiles[0].versions, lombok: "9.99.99"}};
  assert.throws(() => resolveBackendPlatform(platformBinding(catalog.profiles[0], entry), {catalog, root}), /recipe drift/);
  catalog.profiles[0] = profiles[0];
  const sliceReport = {...report, verification_scope: "first-slice"};
  await writeFile(path.join(root, "report.json"), JSON.stringify(sliceReport)); entry.evidence[0].digest = platformDigest(JSON.stringify(sliceReport));
  assert.throws(() => resolveBackendPlatform(binding, {catalog, root}), /empty-scaffold evidence/);
  const changedReport = {...report, source_fingerprint: {...report.source_fingerprint, generator_digest: platformDigest("changed generator")}};
  await writeFile(path.join(root, "report.json"), JSON.stringify(changedReport)); entry.evidence[0].digest = platformDigest(JSON.stringify(changedReport));
  assert.throws(() => resolveBackendPlatform(binding, {catalog, root}), /source drift/);
  await writeFile(path.join(root, "report.json"), bytes); entry.evidence[0].digest = platformDigest(bytes);
  await writeFile(path.join(root, "platform-tests.xml"), "changed");
  assert.throws(() => resolveBackendPlatform(binding, { catalog, root }), /artifact drift/);
  await writeFile(path.join(root, "report.json"), "changed");
  assert.throws(() => resolveBackendPlatform(binding, { catalog, root }), /evidence drift/);
});


test("multiple exact patches coexist without rebinding earlier contracts", () => {
  const catalog = loadBackendPlatforms();
  const old = profiles[1], next = {...old, spring_boot_version: "3.5.17"};
  catalog.profiles.push(next);
  assert.equal(platformProfile(old.id, catalog, old.spring_boot_version).spring_boot_version, "3.5.16");
  assert.equal(platformProfile(old.id, catalog, next.spring_boot_version).spring_boot_version, "3.5.17");
  assert.throws(() => platformProfile(old.id, catalog), /multiple patches/);
  assert.throws(() => platformProfile(old.id, catalog, "3.5.x"), /unsupported/);
});

test("resume never regenerates or accepts changed files, extra source or changed contracts", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-resume-")); t.after(() => rm(root, {recursive:true,force:true}));
  const f = await platformFixture(root,"layered-mvc",profiles[1]); await f.generate();
  const bytes = await readFile(f.contractFile); const resume = () => assertResumableCandidate(f.project,f.contract,bytes);
  assert.doesNotThrow(resume);
  assert.throws(() => assertResumableCandidate(f.project,{...f.contract,contract_version:2},bytes), /identical/);
  const source = path.join(f.project,"README.md"), original = await readFile(source);
  await writeFile(source,"user change"); assert.throws(resume,/file drift/); assert.equal(await readFile(source,"utf8"),"user change");
  await writeFile(source,original); await writeFile(path.join(f.project,"extra-source.java"),"user code");
  assert.throws(resume,/unexpected source/);
});
