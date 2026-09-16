import { assertSourceFingerprint } from "./backend-platform-provenance.mjs";
/** Shared, exact backend platform selection. Catalog entries are maintenance-owned. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLATFORM_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PLATFORM_CATALOG_REF = "docs/engineering/backend-platforms.json";
export const PLATFORM_SKILLS = ["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"];
const fail = (message) => { throw new TypeError(`backend-platform: ${message}`); };
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const platformDigest = value => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value ?? null))).digest("hex")}`;
export function loadBackendPlatforms(root = PLATFORM_ROOT) {
  const value = JSON.parse(readFileSync(path.join(root, PLATFORM_CATALOG_REF), "utf8"));
  if (value.schema_version !== 1 || value.kind !== "backend-platform-catalog" || !Array.isArray(value.profiles) || !Array.isArray(value.compatibility)) fail("invalid catalog");
  if (new Set(value.profiles.map(item => `${item.id}:${item.spring_boot_version}:${item.java_version}`)).size !== value.profiles.length || new Set(value.compatibility.map(item => item.id)).size !== value.compatibility.length) fail("duplicate catalog release/id");
  for (const profile of value.profiles) if (!/^\d+\.\d+\.\d+$/.test(profile.spring_boot_version)) fail("catalog requires exact patch versions");
  return value;
}
export function platformProfile(id, catalog = loadBackendPlatforms(), version) {
  const matches = catalog.profiles.filter(item => item.id === id && (!version || item.spring_boot_version === version));
  if (matches.length > 1) fail("multiple patches: select an exact spring_boot_version");
  const result = matches[0];
  if (!result) fail(`unsupported platform_profile: ${id}`);
  return result;
}
export function platformRecipeDigest(profile, entry) {
  const { candidate_blockers, recommended, ...recipe } = profile;
  return platformDigest({ profile: recipe, entry: { id: entry.id, profile_id: entry.profile_id, spring_boot_version: entry.spring_boot_version, parent: entry.parent, bom: entry.bom, components: entry.components ?? {} } });
}
export function platformBinding(profile, entry) {
  return { schema_version: 2, profile_id: profile.id, spring_boot_version: profile.spring_boot_version, java_version: profile.java_version, parent: entry.parent, bom: entry.bom, compatibility_id: entry.id, compatibility_digest: platformRecipeDigest(profile, entry) };
}
export function resolveBackendPlatform(binding, { catalog = loadBackendPlatforms(), requireVerified = true, root = PLATFORM_ROOT } = {}) {
  if (!binding || binding.schema_version !== 2) fail("missing platform_configuration v2 (v1 is historical read-only); 生命周期须展示 Boot/Java/YSS 组合并取得用户确认");
  const profile = platformProfile(binding.profile_id, catalog, binding.spring_boot_version);
  if (binding.spring_boot_version !== profile.spring_boot_version || binding.java_version !== profile.java_version) fail("unsupported exact Boot/Java combination (x/latest and Java 8/11 for Boot 3.5/4.1 are rejected)");
  const entry = catalog.compatibility.find(item => item.id === binding.compatibility_id);
  const evidenceReports = [];
  if (!entry || entry.profile_id !== profile.id || entry.spring_boot_version !== profile.spring_boot_version) fail("YSS compatibility entry missing; parent/BOM/starter verification required");
  if (platformDigest(binding) !== platformDigest(platformBinding(profile, entry))) fail("stale compatibility digest or YSS coordinates");
  if (requireVerified) {
    if (entry.status !== "verified") fail(`YSS combination ${entry.id} is not verified`);
    if (!Array.isArray(entry.evidence) || !entry.evidence.length) fail("verified combination lacks evidence");
    for (const item of entry.evidence) {
      if (!item.ref || !item.digest || path.isAbsolute(item.ref) || item.ref.split(/[\\/]/).includes("..")) fail("invalid portable evidence reference");
      const bytes = readFileSync(path.join(root, item.ref));
      if (platformDigest(bytes) !== item.digest) fail("compatibility evidence drift");
      const report = JSON.parse(bytes);
      if (report.verification_scope !== "empty-scaffold") fail("qualification requires empty-scaffold evidence");
      if (report.recipe_digest !== platformRecipeDigest(profile, entry)) fail("evidence recipe drift");
      assertSourceFingerprint(report.source_fingerprint, report.architecture_family);
      if (!/^sha256:[a-f0-9]{64}$/.test(report.generated_tree_digest ?? "")) fail("missing generated tree digest");
      evidenceReports.push(report);
      if (report.status !== "passed" || report.spring_boot_version !== profile.spring_boot_version || report.java_version !== profile.java_version || report.architecture_family !== item.architecture_family || platformDigest(report.parent) !== platformDigest(entry.parent) || platformDigest(report.bom) !== platformDigest(entry.bom)) fail("compatibility evidence identity mismatch");
      for (const phase of ["validate", "test", "package"]) if (!report.commands?.some(cmd => cmd.command === `./mvnw ${phase}` && cmd.exit_code === 0 && cmd.stdout_ref && cmd.stderr_ref && cmd.executed_at)) fail("missing real Maven evidence");
      if (report.dependency_check !== "passed" || report.startup_check !== "passed" || report.integration_tests?.status !== "passed") fail("missing dependency/startup/integration-test evidence");
      const required = ["effective-pom.xml", "dependency-trees.json", "platform-tests.xml", "boot-bom-effective.xml", "runtime-jar-entries.log", "startup.stdout.log", "startup.stderr.log", ...["validate", "test", "package"].flatMap(phase => [`mvnw-${phase}.stdout.log`, `mvnw-${phase}.stderr.log`])];
      if (!Array.isArray(report.evidence_artifacts) || required.some(ref => !report.evidence_artifacts.some(artifact => artifact.ref === ref))) fail("missing portable evidence artifacts");
      for (const artifact of report.evidence_artifacts) {
        if (!artifact.ref || path.isAbsolute(artifact.ref) || artifact.ref.split(/[\\/]/).includes("..")) fail("invalid evidence artifact path");
        if (platformDigest(readFileSync(path.join(root, path.dirname(item.ref), artifact.ref))) !== artifact.digest) fail("evidence artifact drift");
      }
    }
  }
  return { profile, entry, evidenceReports };
}
export function assertContractPlatform(contract, decision, options = {}) {
  const binding = contract.platform_configuration;
  const resolved = resolveBackendPlatform(binding, options);
  if (contract.profiles?.platform !== resolved.profile.id || contract.profiles?.validation_namespace !== resolved.profile.validation_namespace) fail("platform and validation_namespace are inconsistent");
  if (platformDigest(contract.maven_coordinates?.parent) !== platformDigest(binding.parent) || contract.maven_coordinates?.yss_components_version !== binding.bom.version || binding.bom.group_id !== "com.yss.cloud" || binding.bom.artifact_id !== "yss-components-bom") fail("YSS Maven coordinates mismatch");
  if (decision && platformDigest(decision.platform_configuration) !== platformDigest(binding)) fail("decision/contract platform_configuration mismatch");
  if (options.requireVerified !== false && !resolved.entry.evidence?.some(item => item.architecture_family === contract.architecture_family)) fail("architecture has no compatibility evidence");
  for (const capability of contract.module_profile?.requested_capabilities ?? []) if (!resolved.entry.capabilities?.includes(capability)) fail(`unverified capability: ${capability}`);
  if (options.requireVerified !== false && !resolved.evidenceReports.some(report => report.architecture_family === contract.architecture_family && (contract.module_profile?.requested_capabilities ?? []).every(capability => report.verified_capabilities?.includes(capability)))) fail("architecture/capability combination lacks evidence");
  return resolved;
}
export function assertPlatformAgreement(left, right) {
  if (platformDigest(left) !== platformDigest(right)) fail("platform_configuration drift between contract and Manifest");
}
export function javaMajor(output) {
  const value = output.match(/(?:java|openjdk) version "(?:1\.)?(\d+)|Java version:\s*(?:1\.)?(\d+)/i);
  return value ? Number(value[1] ?? value[2]) : null;
}
export function assertJavaPlatform(output, binding) {
  if (javaMajor(output) !== binding.java_version) fail(`JDK mismatch: expected Java ${binding.java_version}`);
}
export function platformTemplateVars(profile) {
  return { boot_version: profile.spring_boot_version, java_version: profile.java_version === 8 ? "1.8" : String(profile.java_version), java_range: profile.java_version === 8 ? "[1.8,1.9)" : `[${profile.java_version},${profile.java_version + 1})`, web_starter: profile.web_starter, web_test_starter: profile.web_test_starter, aop_starter: profile.aop_starter, swagger_artifact: profile.swagger_artifact, ...Object.fromEntries(Object.entries(profile.versions).map(([key, value]) => [`${key}_version`, value])) };
}

export function platformSmokeTest(basePackage, profile, capabilities = []) {
  const mapper = profile.jackson_major === 3 ? "tools.jackson.databind.json.JsonMapper" : "com.fasterxml.jackson.databind.ObjectMapper";
  return `package ${basePackage};

import ${profile.validation_namespace}.validation.Validator;
import ${profile.validation_namespace}.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import ${profile.validation_namespace}.validation.constraints.NotBlank;
import ${mapper};
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

/** Mechanical integration only: no business endpoint or production storage. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(PlatformIntegrationTest.ProbeController.class)
@ActiveProfiles("scaffold-test")
class PlatformIntegrationTest {
    @Value("\${local.server.port}") int port;
    @Autowired Validator validator;
    public static class ProbePayload {
        @NotBlank private String value;
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }
    @RestController
    public static class ProbeController {
        @PostMapping(value = "/__scaffold_probe", consumes = "application/json", produces = "application/json")
        public ProbePayload echo(@Valid @RequestBody ProbePayload body) { return body; }
    }
    @Test void httpJsonRoundTrip() throws Exception { httpProbe("probe", 200); }
    @Test void httpValidationRejectsBlank() throws Exception { httpProbe("", 400); }
    private void httpProbe(String value, int expectedStatus) throws Exception {
        java.net.HttpURLConnection connection = (java.net.HttpURLConnection) new java.net.URL("http://127.0.0.1:" + port + "/__scaffold_probe").openConnection();
        connection.setConnectTimeout(5000); connection.setReadTimeout(5000);
        connection.setRequestMethod("POST"); connection.setRequestProperty("Content-Type", "application/json"); connection.setDoOutput(true);
        ProbePayload request = new ProbePayload(); request.setValue(value);
        try {
            try (java.io.OutputStream stream = connection.getOutputStream()) { stream.write(mapper.writeValueAsBytes(request)); }
            assertEquals(expectedStatus, connection.getResponseCode());
            if (expectedStatus == 200) {
                assertTrue(connection.getContentType().startsWith("application/json"));
                try (java.io.InputStream stream = connection.getInputStream()) { assertEquals(value, mapper.readValue(stream, ProbePayload.class).getValue()); }
            }
        } finally { connection.disconnect(); }
    }
    @Autowired ${mapper.split(".").at(-1)} mapper;
    @Autowired SqlSessionFactory sqlSessionFactory;
    static final class ValidationProbe { @NotBlank String value = ""; }
    @Test void validationAndJsonAutoConfiguration() throws Exception {
        assertFalse(validator.validate(new ValidationProbe()).isEmpty());
        assertEquals("\\\"probe\\\"", mapper.writeValueAsString("probe"));
    }
    interface ProbeMapper { @Select("SELECT 1") int probe(); }
    @Test void mybatisCanMapVerificationQuery() throws Exception {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            if (!session.getConfiguration().hasMapper(ProbeMapper.class)) session.getConfiguration().addMapper(ProbeMapper.class);
            assertEquals(1, session.getMapper(ProbeMapper.class).probe());
        }
    }
${capabilities.includes("feign-client") ? `    @Autowired org.springframework.cloud.openfeign.${profile.java_version === 8 ? "FeignContext" : "FeignClientFactory"} feignFactory;
    @Test void feignCanDecodeJson() throws Exception {
        feign.codec.Decoder decoder = feignFactory.getInstance("platform-probe", feign.codec.Decoder.class);
        assertNotNull(decoder);
        feign.Request request = feign.Request.create(feign.Request.HttpMethod.GET, "http://localhost/probe", java.util.Collections.emptyMap(), (byte[]) null, java.nio.charset.StandardCharsets.UTF_8, null);
        feign.Response response = feign.Response.builder().request(request).status(200).reason("OK")
            .headers(java.util.Collections.singletonMap("Content-Type", java.util.Collections.singletonList("application/json")))
            .body("{}", java.nio.charset.StandardCharsets.UTF_8).build();
        assertTrue(decoder.decode(response, java.util.Map.class) instanceof java.util.Map);
    }
` : ""}}
`;
}
