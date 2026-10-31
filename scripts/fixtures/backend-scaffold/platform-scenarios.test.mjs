import { platformSourceFingerprint, generatedTreeDigest, assertResumableCandidate } from "../../lib/backend-platform-provenance.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadBackendPlatforms, platformBinding, platformRecipeDigest, platformProfile, platformDigest, resolveBackendPlatform, resolveComponentCapabilities, componentCapabilityDigest, assertJavaPlatform, assertContractPlatform } from "../../lib/backend-platform.mjs";
import { architectureDigest } from "../../lib/backend-architecture.mjs";
import { checkPlatformDependencies, checkPlatformTests, checkRuntimeArchive, platformCommand } from "../../lib/backend-platform-verification.mjs";
import { fixtureCatalog } from "./platform-fixture.mjs";
import { ScaffoldGenerator, parseArgs as parseDddArgs } from "../../../.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs";
import { generate as generateMvc, parseArgs as parseMvcArgs } from "../../../.agents/skills/yss-layered-mvc-scaffold-generator/scripts/generate_scaffold.mjs";
import { run as verifyScaffold } from "../../../.agents/skills/yss-ddd-scaffold-generator/scripts/run_scaffold_verification.mjs";

const profiles = loadBackendPlatforms().profiles;
test("平台依赖与启动打包入口沿用所选 settings 并脱敏", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const settings = path.join(root, "user settings.xml");
  await writeFile(path.join(root, "mvnw"), "#!/bin/sh\nprintf '%s\\n' \"$@\"\nprintf 'private-password\\n'\n");
  await chmod(path.join(root, "mvnw"), 0o755);
  const result = await platformCommand(root, root, "settings-check", ["dependency:tree"], process.env, { mavenArgs: ["--settings", settings], secrets: ["private-password"] });
  assert.equal(result.exit_code, 0);
  assert.ok(result.stdout.includes(`dependency:tree\n--settings\n${settings}\n`));
  assert.doesNotMatch(result.stdout, /private-password/);
  assert.doesNotMatch(await readFile(result.stdout_ref, "utf8"), /private-password/);
});

test("version, digest, namespace, YSS coordinates and decision mismatches are rejected", () => {
  const contract = { profiles: { platform: profiles[1].id, validation_namespace: "jakarta" }, maven_coordinates: { parent: { group_id: "com.yss.cloud", artifact_id: "parent", version: "3.0" }, yss_components_version: "3.0" }, architecture_family: "layered-mvc" };
  const catalog = fixtureCatalog(contract);
  const binding = platformBinding(profiles[1], catalog.compatibility[0]);
  assert.equal(binding.component_platform_line, "boot3-java17");
  const identity = { architecture_family: "layered-mvc", platform_configuration: binding };
  assert.notEqual(architectureDigest(identity), architectureDigest({ ...identity, platform_configuration: { ...binding, component_platform_line: "boot2-java8" } }));
  const options = { catalog, requireVerified: false };
  for (const change of [{ schema_version: 1 }, { java_version: 8 }, { java_version: 11 }, { spring_boot_version: "3.5.x" }, { spring_boot_version: "3.5.999" }, { component_platform_line: "boot2-java8" }, { compatibility_digest: `sha256:${"0".repeat(64)}` }]) assert.throws(() => resolveBackendPlatform({ ...binding, ...change }, options));
  const missingComponentLine = { ...binding };
  delete missingComponentLine.component_platform_line;
  assert.throws(() => resolveBackendPlatform(missingComponentLine, options), /component_platform_line/);
  contract.platform_configuration = binding;
  assert.throws(() => assertContractPlatform({ ...contract, profiles: { ...contract.profiles, validation_namespace: "javax" } }, null, options), /namespace/);
  assert.throws(() => assertContractPlatform(contract, { platform_configuration: { ...binding, java_version: 21 } }, options), /decision\/contract/);
  assert.throws(() => resolveBackendPlatform(binding, { catalog }), /not verified/);
  for (const java of [8, 11, 21]) assert.throws(() => assertJavaPlatform(`Java version: ${java}.0.1`, binding), /JDK mismatch/);
  assert.doesNotThrow(() => assertJavaPlatform('openjdk version "17.0.16"', binding));
  assert.ok(loadBackendPlatforms().compatibility.filter(item => item.bom.version !== "3.2.0-SNAPSHOT").every(item => item.status !== "verified"), "historical unqualified combinations remain closed");
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
  // Maven can render a globally compile-scoped dependency below its first test-scoped path.
  assert.equal(verify([{...f.tree, children: [{groupId:"test", artifactId:"test-path", scope:"test", children:f.tree.children}]}]).status, "passed");
  for (const scope of ["test", "provided"]) assert.throws(() => verify([{...f.tree, children: f.tree.children.map(n => ({...n, scope}))}]), /absent/);
  assert.throws(() => verify([{...f.tree, artifactId: "other-module"}]), /startup-module/);
  const changed = structuredClone(f.tree); changed.children.find(n => n.artifactId === "spring-webmvc").version = "7.0.0";
  assert.throws(() => verify([changed]), /BOM/);
  assert.throws(() => checkPlatformDependencies(f.profile, f.pom, [f.tree]), /startup-module/);
  assert.throws(() => verify([{...f.tree, children: [...f.tree.children, {groupId:"javax.servlet",artifactId:"javax.servlet-api",version:"4.0.1"}]}]));
  assert.equal(verify([{...f.tree, children: [...f.tree.children, {groupId:"javax.sql",artifactId:"test-java-se-marker",version:"1.0"}]}]).status,"passed");
});

test("explicit platform recipe overrides Boot defaults but still rejects version drift", () => {
  const f = dependencyFixture();
  f.options.bootBom = f.options.bootBom.replace("</dependencies>", "<dependency><groupId>org.yaml</groupId><artifactId>snakeyaml</artifactId><version>2.4</version></dependency></dependencies>");
  const yaml = { groupId: "org.yaml", artifactId: "snakeyaml", version: "2.5", scope: "compile" };
  f.tree.children.push(yaml);
  const verify = () => checkPlatformDependencies(f.profile, f.pom, [f.tree], f.options);
  assert.throws(verify, /BOM\/recipe/);
  f.options.components["org.yaml:snakeyaml"] = "2.5";
  assert.equal(verify().status, "passed");
  yaml.version = "2.6";
  assert.throws(verify, /BOM\/recipe/);
});

test("packaged runtime jar must contain every runtime artifact", () => {
  const f=dependencyFixture();
  const entries=f.tree.children.map(n=>`BOOT-INF/lib/${n.artifactId}-${n.version}.jar`).join("\n");
  assert.equal(checkRuntimeArchive(entries,f.tree.children).status,"passed");
  const first = `BOOT-INF/lib/${f.tree.children[0].artifactId}-${f.tree.children[0].version}.jar`;
  assert.equal(checkRuntimeArchive(entries.split("\n").slice(1).join("\n"), f.tree.children, {dependencyOnlyArtifacts:[first]}).status, "passed");
  assert.throws(()=>checkRuntimeArchive(entries+"\nBOOT-INF/lib/javax.servlet-api-4.0.1.jar",f.tree.children),/unexpected packaged/);
  assert.equal(checkRuntimeArchive(entries+`\nBOOT-INF/lib/spring-boot-jarmode-tools-${f.profile.spring_boot_version}.jar`,f.tree.children).status,"passed");
  assert.equal(checkRuntimeArchive(entries+"\nBOOT-INF/lib/lombok-1.18.42.jar",f.tree.children,{providedLombokVersion:"1.18.42"}).status,"passed");
  assert.throws(()=>checkRuntimeArchive(entries+"\nBOOT-INF/lib/lombok-1.18.30.jar",f.tree.children,{providedLombokVersion:"1.18.42"}),/unexpected packaged/);
  assert.throws(()=>checkRuntimeArchive(entries.split("\n").slice(1).join("\n"),f.tree.children),/runtime jar missing/);
});


test("integration evidence rejects skipped tests and missing optional Feign coverage", () => {
  const cases = '<testcase name="httpJsonRoundTrip"/><testcase name="httpValidationRejectsBlank"/><testcase name="validationAndJsonAutoConfiguration"/><testcase name="mybatisCanMapVerificationQuery"/><testcase name="mappingPersistenceAndPaginationRoundTrip"/><testcase name="transactionRollsBackOnUseCaseFailure"/>';
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

test("component capabilities are nested by registry capability id and uncertified profiles stay closed", () => {
  const catalog = loadBackendPlatforms();
  const expected = [
    "contract.dto-wire", "contract.request-validation", "contract.error-mapping", "framework.mybatis",
    "component.cache", "component.current-user-context", "component.audit-log", "component.excel-import-export",
    "component.distributed-id", "component.security-algorithm", "component.gateway-resilience"
  ];
  assert.equal(catalog.schema_version, 2);
  assert.equal(Object.hasOwn(catalog, "component_capabilities"), false);
  assert.equal(Object.hasOwn(catalog, "component_capability_ids"), false);
  assert.equal(catalog.compatibility.length, 3);
  const entry = catalog.compatibility[0];
  assert.equal(entry.profile_id, "spring-boot-2.7-jdk8");
  assert.equal(catalog.profiles.find(item => item.id === entry.profile_id).component_platform_line, "boot2-java8");
  assert.equal(platformBinding(catalog.profiles.find(item => item.id === entry.profile_id), entry).component_platform_line, "boot2-java8");
  assert.equal(entry.status, "blocked");
  assert.equal(entry.artifact_resolution_evidence.report_id, "aliyun-maven-artifact-resolution-2026-09-18");
  assert.match(entry.artifact_resolution_evidence.digest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(entry.component_capabilities), expected);
  for (const item of Object.values(entry.component_capabilities)) {
    assert.equal(item.status, "blocked");
    assert.deepEqual(item.verified_architectures, []);
    assert.deepEqual(item.evidence, []);
    for (const artifact of item.artifacts) assert.deepEqual(Object.keys(artifact), ["group_id", "artifact_id", "declared_version", "resolved_version", "pom_sha256", "jar_sha256", "source_tree"]);
  }
  assert.equal(entry.component_capabilities["component.cache"].artifacts[0].declared_version, "3.0.0-SNAPSHOT");
  assert.match(entry.component_capabilities["contract.dto-wire"].artifacts[0].resolved_version, /^2\.0\.0-\d{8}\.\d{6}-\d+$/);
  assert.match(entry.component_capabilities["contract.dto-wire"].artifacts[0].source_tree, /^[a-f0-9]{40}$/);
  assert.equal(entry.component_capabilities["component.cache"].artifacts[0].source_tree, null);
  assert.match(entry.component_capabilities["component.cache"].blockers.join("\n"), /component-artifact-coordinate-conflict/);
  assert.match(entry.component_capabilities["component.current-user-context"].blockers.join("\n"), /component-artifact-coordinate-conflict/);
  const binding = platformBinding(catalog.profiles[0], entry);
  assert.throws(() => resolveComponentCapabilities(binding, ["contract.dto-wire"], "domain-driven", { catalog }), error => error.code === "component-evidence-missing" && /^component-capability: component-evidence-missing:/.test(error.message));
  assert.throws(() => resolveComponentCapabilities(binding, ["component.cache"], "domain-driven", { catalog }), error => error.code === "component-platform-generation-mismatch" && /^component-capability: component-platform-generation-mismatch:/.test(error.message));
  assert.throws(() => resolveComponentCapabilities(binding, ["component.current-user-context"], "layered-mvc", { catalog }), error => error.code === "component-artifact-coordinate-conflict" && /^component-capability: component-artifact-coordinate-conflict:/.test(error.message));
  assert.throws(() => resolveComponentCapabilities(binding, ["contract.request-validation"], "domain-driven", { catalog }), error => error.code === "component-new-adoption-forbidden");
  const boot3 = catalog.compatibility.find(item => item.profile_id === "spring-boot-3.5-jdk17");
  const boot3Profile = catalog.profiles.find(item => item.id === boot3.profile_id);
  assert.equal(boot3.status, "blocked");
  assert.equal(boot3Profile.component_platform_line, "boot3-java17");
  assert.equal(boot3Profile.spring_cloud_version, "2025.0.3");
  assert.equal(boot3Profile.spring_cloud_alibaba_version, "2025.0.0.0");
  assert.equal(boot3Profile.validation_namespace, "jakarta");
  assert.equal(boot3Profile.jackson_major, 2);
  assert.equal(boot3Profile.auto_configuration_imports_path, "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports");
  assert.ok(Object.values(boot3.component_capabilities).every(item => item.artifacts.every(artifact => artifact.declared_version.startsWith("3."))));
  assert.equal(boot3.component_capabilities["component.cache"].artifacts[0].declared_version, "3.1.0-SNAPSHOT");
  assert.equal(boot3.component_capabilities["component.distributed-id"].artifacts[0].declared_version, "3.1.0-SNAPSHOT");
  assert.deepEqual(boot3.component_capabilities["component.excel-import-export"].artifacts.map(item => item.artifact_id), ["yss-component-excel-mvc"]);
  const validation = boot3.component_capabilities["contract.request-validation"];
  assert.equal(validation.provider_kind, "platform-managed");
  assert.deepEqual(validation.artifacts.map(item => `${item.group_id}:${item.artifact_id}:${item.declared_version}`), ["org.springframework.boot:spring-boot-starter-validation:3.5.16"]);
  assert.ok(validation.artifacts.every(item => item.resolved_version === null && item.pom_sha256 === null && item.jar_sha256 === null && item.source_tree === null));
  assert.deepEqual(validation.evidence, []);
  assert.deepEqual(Object.keys(boot3.platform_artifact_bindings).sort(), ["bom", "parent"]);
  for (const [role, item] of Object.entries(boot3.platform_artifact_bindings)) {
    assert.equal(item.role, role);
    assert.equal(item.status, "candidate");
    assert.ok(item.declared_version.endsWith("-SNAPSHOT"));
    for (const field of ["resolved_version", "published_at", "pom_sha256", "jar_sha256", "sources_jar_sha256", "source_tree"]) assert.equal(item[field], null);
    assert.deepEqual(item.evidence, []);
    assert.ok(item.blockers.length);
  }
  assert.deepEqual(boot3.external_snapshot_bindings, []);
  assert.equal(boot3.external_artifact_bindings.length, 1);
  assert.deepEqual(
    boot3.external_artifact_bindings.map(item => `${item.group_id}:${item.artifact_id}:${item.declared_version}`),
    ["org.apache.fesod:fesod-sheet:2.0.2-incubating"]
  );
  const fesod = boot3.external_artifact_bindings[0];
  assert.equal(fesod.status, "resolved");
  assert.equal(fesod.resolved_version, fesod.declared_version);
  assert.equal(fesod.published_at, null);
  assert.equal(fesod.pom_sha256, "sha256:9c1f7a78ad39264c4d2a2689251562192a6074a79291adfe6b1806f199ee8df1");
  assert.equal(fesod.jar_sha256, "sha256:39d43ea6e6fcb26b712181869859c035d1cb0742a842e2758c8c58e79c112b4e");
  assert.equal(fesod.sources_jar_sha256, "sha256:fb34dffa2a8844ea1033fc3896f497a55684842e98af428a9b7c5e29047a8b38");
  assert.equal(fesod.source_tree, null);
  assert.deepEqual(fesod.evidence, []);
  assert.deepEqual(fesod.blockers, []);
  for (const profile of catalog.profiles.filter(item => !["spring-boot-2.7-jdk8", "spring-boot-3.5-jdk17"].includes(item.id))) {
    assert.equal(catalog.compatibility.some(item => item.profile_id === profile.id), false);
    assert.match(profile.candidate_blockers.join("\n"), /component-unavailable-for-platform/);
    if (profile.spring_boot_version.startsWith("3.")) assert.equal(profile.component_platform_line, "boot3-java17");
    else assert.equal(profile.component_platform_line, undefined);
  }
});

test("Boot 3 catalog parser rejects drift in candidate and platform-managed bindings", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-boot3-catalog-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".template-spec/engineering"), { recursive: true });
  const original = loadBackendPlatforms();
  const boot3Entry = original.compatibility.find(item => item.profile_id === "spring-boot-3.5-jdk17");
  const boot3 = { ...structuredClone(original), compatibility: [structuredClone(boot3Entry)] };
  const save = async value => writeFile(path.join(root, ".template-spec/engineering/backend-platforms.json"), JSON.stringify(value));
  await save(boot3);
  assert.doesNotThrow(() => loadBackendPlatforms(root));

  boot3.compatibility[0].platform_artifact_bindings.parent.artifact_id = "wrong-parent";
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-binding-drift");
  boot3.compatibility[0].platform_artifact_bindings.parent.artifact_id = boot3.compatibility[0].parent.artifact_id;

  boot3.compatibility[0].external_artifact_bindings[0].declared_version = "2.1.0-SNAPSHOT";
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-artifact-coordinate-conflict");
  boot3.compatibility[0].external_artifact_bindings[0].declared_version = "2.0.2-incubating";

  boot3.compatibility[0].component_capabilities["contract.request-validation"].artifacts[0].artifact_id = "legacy-validation";
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-binding-drift");
  boot3.compatibility[0].component_capabilities["contract.request-validation"].artifacts[0].artifact_id = "spring-boot-starter-validation";

  const cache = boot3.compatibility[0].component_capabilities["component.cache"];
  cache.artifacts[0].declared_version = "3.0.0-SNAPSHOT";
  cache.component_digest = componentCapabilityDigest(cache, "component.cache");
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-binding-drift");
  cache.artifacts[0].declared_version = "3.1.0-SNAPSHOT";
  cache.component_digest = componentCapabilityDigest(cache, "component.cache");

  const excel = boot3.compatibility[0].component_capabilities["component.excel-import-export"];
  excel.artifacts.push({ group_id: "com.yss.cloud", artifact_id: "yss-component-excel-starter", declared_version: "3.0.0-SNAPSHOT", resolved_version: null, pom_sha256: null, jar_sha256: null, source_tree: null });
  excel.component_digest = componentCapabilityDigest(excel, "component.excel-import-export");
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-new-adoption-forbidden");
  excel.artifacts.pop();
  excel.component_digest = componentCapabilityDigest(excel, "component.excel-import-export");

  boot3.profiles.find(item => item.id === "spring-boot-3.5-jdk17").component_platform_line = "boot3-java17-mainline";
  await save(boot3);
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-platform-generation-mismatch");
});

test("artifact resolution evidence binds catalog coordinates and bytes", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-artifact-resolution-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = loadBackendPlatforms();
  const binding = catalog.compatibility[0].artifact_resolution_evidence;
  await mkdir(path.join(root, ".template-spec/engineering"), { recursive: true });
  await mkdir(path.dirname(path.join(root, binding.ref)), { recursive: true });
  await writeFile(path.join(root, ".template-spec/engineering/backend-platforms.json"), JSON.stringify(catalog, null, 2));
  const evidence = await readFile(path.resolve(binding.ref));
  await writeFile(path.join(root, binding.ref), evidence);
  for (const entry of catalog.compatibility.slice(1)) if (entry.artifact_resolution_evidence) {
    const ref = entry.artifact_resolution_evidence.ref;
    await mkdir(path.dirname(path.join(root, ref)), { recursive: true });
    await writeFile(path.join(root, ref), await readFile(path.resolve(ref)));
  }
  assert.doesNotThrow(() => loadBackendPlatforms(root));
  await writeFile(path.join(root, binding.ref), Buffer.concat([evidence, Buffer.from("\n")]));
  assert.throws(() => loadBackendPlatforms(root), error => error.code === "component-binding-drift");
});

test("component adoption, platform generation and retirement evidence expose stable failure codes", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-component-policy-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await verifiedComponentFixture(root);
  const options = { catalog: f.catalog, root, requirePlatformVerified: false };
  const item = f.entry.component_capabilities[f.capabilityId];
  item.lifecycle = "deprecated";
  item.adoption_policy = "forbidden";
  item.replacement_gav = "org.springframework.boot:spring-boot-starter-validation";
  item.component_digest = componentCapabilityDigest(item, f.capabilityId);
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-new-adoption-forbidden");

  item.lifecycle = "active";
  item.adoption_policy = "allowed";
  item.artifacts[0].declared_version = "3.0.0-SNAPSHOT";
  item.component_digest = componentCapabilityDigest(item, f.capabilityId);
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-platform-generation-mismatch");

  item.artifacts[0].declared_version = "2.0.0-SNAPSHOT";
  item.lifecycle = "retired";
  item.retirement_evidence = [];
  item.component_digest = componentCapabilityDigest(item, f.capabilityId);
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-retirement-evidence-missing");
});

async function verifiedComponentFixture(root) {
  const catalog = loadBackendPlatforms();
  const profile = catalog.profiles[0];
  const contract = { profiles: { platform: profile.id }, maven_coordinates: { parent: { group_id: "test", artifact_id: "parent", version: "test-only" }, yss_components_version: "test-only" } };
  const platformCatalog = fixtureCatalog(contract);
  const entry = platformCatalog.compatibility[0];
  const binding = platformBinding(profile, entry);
  const artifact = {
    group_id: "com.yss.cloud", artifact_id: "yss-component-dto",
    declared_version: "2.0.0-SNAPSHOT", resolved_version: "2.0.0-20260918.123456-1",
    pom_sha256: platformDigest("synthetic component pom"), jar_sha256: platformDigest("synthetic component jar"),
    source_tree: "1".repeat(40)
  };
  const capabilityId = "contract.dto-wire";
  const capability = { status: "verified", verified_architectures: ["domain-driven"], artifacts: [artifact], evidence: [], blockers: [] };
  capability.component_digest = componentCapabilityDigest(capability, capabilityId);
  const report = { schema_version: 1, kind: "backend-component-capability-evidence", status: "passed", capability_id: capabilityId, compatibility_id: entry.id, profile_id: profile.id, spring_boot_version: profile.spring_boot_version, architecture_family: "domain-driven", component_digest: capability.component_digest, artifacts: capability.artifacts };
  const bytes = JSON.stringify(report);
  await writeFile(path.join(root, "component-report.json"), bytes);
  capability.evidence = [{ architecture_family: "domain-driven", ref: "component-report.json", digest: platformDigest(bytes) }];
  entry.component_capabilities = { [capabilityId]: capability };
  return { catalog: platformCatalog, binding, capability, capabilityId, entry };
}

test("component capability resolver returns exact serializable bindings and fails closed", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-component-capability-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await verifiedComponentFixture(root);
  const options = { catalog: f.catalog, root, requirePlatformVerified: false };
  const resolved = resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options);
  assert.deepEqual(resolved, [{ capability_id: f.capabilityId, status: "verified", verified_architectures: ["domain-driven"], artifacts: f.capability.artifacts, evidence: f.capability.evidence, component_digest: f.capability.component_digest }]);
  assert.doesNotThrow(() => JSON.stringify(resolved));
  assert.throws(() => resolveComponentCapabilities(f.binding, ["component.cache"], "domain-driven", options), error => error.code === "component-unavailable-for-platform" && /^component-capability: component-unavailable-for-platform:/.test(error.message));
  f.entry.component_capabilities[f.capabilityId].status = "blocked";
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), /component-unavailable-for-platform/);
  f.entry.component_capabilities[f.capabilityId].status = "verified";
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "layered-mvc", options), /component-unavailable-for-platform/);
  delete f.entry.component_capabilities[f.capabilityId].artifacts[0].jar_sha256;
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), /component-evidence-missing/);
});

test("component capability resolver rejects coordinate conflicts and evidence drift", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-component-conflict-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await verifiedComponentFixture(root);
  const secondId = "contract.error-mapping";
  const second = structuredClone(f.capability);
  second.artifacts[0].resolved_version = "2.0.0-20260918.123456-2";
  second.component_digest = componentCapabilityDigest(second, secondId);
  f.entry.component_capabilities[secondId] = second;
  const options = { catalog: f.catalog, root, requirePlatformVerified: false };
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId, secondId], "domain-driven", options), error => error.code === "component-artifact-coordinate-conflict");
  delete f.entry.component_capabilities[secondId];
  f.entry.component_capabilities[f.capabilityId].component_digest = platformDigest("stale component");
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-binding-drift");
  f.entry.component_capabilities[f.capabilityId].component_digest = f.capability.component_digest;
  await writeFile(path.join(root, "component-report.json"), "changed");
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-binding-drift" && /^component-capability: component-binding-drift:/.test(error.message));
});

test("resolved SNAPSHOT, POM/JAR digests and source tree are mandatory for verified components", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-component-artifact-")); t.after(() => rm(root, { recursive: true, force: true }));
  const f = await verifiedComponentFixture(root);
  const options = { catalog: f.catalog, root, requirePlatformVerified: false };
  for (const field of ["resolved_version", "pom_sha256", "jar_sha256", "source_tree"]) {
    const artifact = f.entry.component_capabilities[f.capabilityId].artifacts[0];
    const original = artifact[field];
    artifact[field] = null;
    assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), /component-evidence-missing/);
    artifact[field] = original;
  }
  const artifact = f.entry.component_capabilities[f.capabilityId].artifacts[0];
  artifact.resolved_version = artifact.declared_version;
  assert.throws(() => resolveComponentCapabilities(f.binding, [f.capabilityId], "domain-driven", options), error => error.code === "component-artifact-coordinate-conflict");
});

test("resolveBackendPlatform loads the catalog beneath an explicit root", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-platform-root-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".template-spec/engineering"), { recursive: true });
  const catalog = loadBackendPlatforms();
  catalog.compatibility = [{ id: "root-local", profile_id: catalog.profiles[0].id, spring_boot_version: catalog.profiles[0].spring_boot_version, parent: { group_id: "root", artifact_id: "parent", version: "local" }, bom: { group_id: "com.yss.cloud", artifact_id: "yss-components-bom", version: "local" }, status: "candidate", capabilities: [], evidence: [] }];
  await writeFile(path.join(root, ".template-spec/engineering/backend-platforms.json"), JSON.stringify(catalog));
  const binding = platformBinding(catalog.profiles[0], catalog.compatibility[0]);
  assert.equal(resolveBackendPlatform(binding, { root, requireVerified: false }).entry.id, "root-local");
});

test("backend-platforms require-profile exposes nested component blockers and exits non-zero", () => {
  const result = spawnSync(path.resolve("scripts/backend-platforms"), ["--require-profile", "spring-boot-2.7-jdk8"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schema_version, 2);
  assert.equal(output.requested_profile, "spring-boot-2.7-jdk8");
  assert.equal(output.required_profile.selectable, false);
  assert.equal(output.required_profile.component_platform_line, "boot2-java8");
  assert.equal(Object.keys(output.required_profile.combinations[0].component_capabilities).length, 11);
  assert.equal(output.required_profile.combinations[0].component_status.blocked, 11);
  assert.match(output.required_profile.combinations[0].component_capabilities["contract.dto-wire"].blockers.join("\n"), /component-evidence-missing/);
  assert.match(output.required_profile.blockers.join("\n"), /YSS combination .* is not verified/);

  const boot3Result = spawnSync(path.resolve("scripts/backend-platforms"), ["--require-profile", "spring-boot-3.5-jdk17"], { encoding: "utf8" });
  assert.equal(boot3Result.status, 0);
  const boot3Output = JSON.parse(boot3Result.stdout).required_profile;
  assert.equal(boot3Output.component_platform_line, "boot3-java17");
  const boot3 = boot3Output.combinations[0];
  assert.equal(boot3.component_capabilities["contract.request-validation"].provider_kind, "platform-managed");
  assert.deepEqual(boot3.external_snapshot_bindings, []);
  assert.equal(boot3.external_artifact_bindings[0].declared_version, "2.0.2-incubating");
  assert.equal(boot3.platform_artifact_bindings.parent.declared_version, "3.0.0-SNAPSHOT");
});

test('3.2.0 精确记录仅认证有当前运行证据的两个架构及四个能力', () => {
  const catalog = loadBackendPlatforms();
  const entry = catalog.compatibility.find(e => e.bom.version === '3.2.0-SNAPSHOT');
  const profile = catalog.profiles.find(p => p.id === entry.profile_id);
  const binding = platformBinding(profile, entry);
  assert.equal(entry.status, 'verified');
  assert.equal(entry.components['org.yaml:snakeyaml'], '2.5');
  assert.equal(resolveBackendPlatform(binding, {catalog}).evidenceReports.length, 2);
  for (const family of ['domain-driven', 'layered-mvc']) assert.equal(resolveComponentCapabilities(binding, ['contract.dto-wire','contract.request-validation','contract.error-mapping','framework.mybatis'], family, {catalog}).length, 4);
  assert.throws(() => resolveComponentCapabilities(binding, ['component.cache'], 'domain-driven', {catalog}), /component/);
});
