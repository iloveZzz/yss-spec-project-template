import { assertSourceFingerprint } from "./backend-platform-provenance.mjs";
/** Shared, exact backend platform selection. Catalog entries are maintenance-owned. */
import { createHash } from "node:crypto";
import { readFileSync } from './validation-phase.mjs';
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLATFORM_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PLATFORM_CATALOG_REF = "docs/engineering/backend-platforms.json";
export const PLATFORM_SKILLS = ["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"];
const fail = (message) => { throw new TypeError(`backend-platform: ${message}`); };
const componentFail = (code, message) => {
  const error = new TypeError(`component-capability: ${code}: ${message}`);
  error.code = code;
  throw error;
};
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const platformDigest = value => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value ?? null))).digest("hex")}`;
const exactVersion = value => typeof value === "string" && value.length > 0 && !/[\[\](),*+]|\bx\b|latest/i.test(value);
const portableEvidence = item => item && typeof item.ref === "string" && item.ref.length > 0 && !path.isAbsolute(item.ref) && !item.ref.split(/[\\/]/).includes("..") && /^sha256:[a-f0-9]{64}$/.test(item.digest ?? "");
const sha256 = value => /^sha256:[a-f0-9]{64}$/.test(value ?? "");
const gitTree = value => /^[a-f0-9]{40}$/.test(value ?? "");
const major = value => Number.parseInt(String(value ?? "").match(/^(\d+)/)?.[1] ?? "", 10);
const platformGeneration = profile => major(profile?.spring_boot_version) === 2 ? { line: "boot2-java8", componentMajor: 2 } : major(profile?.spring_boot_version) === 3 ? { line: "boot3-java17", componentMajor: 3 } : { line: "boot4", componentMajor: null };
const COMPONENT_PLATFORM_LINES = new Set(["boot2-java8", "boot3-java17"]);
const normalizedComponentPlatformLine = profile => COMPONENT_PLATFORM_LINES.has(profile?.component_platform_line) ? profile.component_platform_line : undefined;
const retirementEvidenceComplete = value => {
  const required = new Set(["organization-code-search", "maven-download-metrics", "runtime-bean-and-configuration-scan", "30-90-day-zero-usage-window"]);
  if (!Array.isArray(value) || !value.every(item => item?.status === "zero" && typeof item.ref === "string" && item.ref.length > 0)) return false;
  for (const item of value) required.delete(item.kind);
  return required.size === 0;
};
const candidateArtifactFieldsEmpty = binding =>
  ["resolved_version", "published_at", "pom_sha256", "jar_sha256", "sources_jar_sha256", "source_tree"].every(field => binding[field] === null) &&
  Array.isArray(binding.evidence) && binding.evidence.length === 0 &&
  Array.isArray(binding.blockers) && binding.blockers.length > 0;
function validateArtifactBinding(binding, label, { role, expected, snapshot, allowedStatuses = ["candidate"] }) {
  if (!binding || typeof binding !== "object" || typeof role !== "string" || !role.length || binding.role !== role || !allowedStatuses.includes(binding.status)) componentFail("component-binding-drift", `invalid artifact binding: ${label}`);
  if (!binding.group_id || !binding.artifact_id || !exactVersion(binding.declared_version)) componentFail("component-artifact-coordinate-conflict", `invalid candidate artifact coordinate: ${label}`);
  if (expected && (binding.group_id !== expected.group_id || binding.artifact_id !== expected.artifact_id || binding.declared_version !== expected.version)) componentFail("component-binding-drift", `candidate artifact differs from compatibility coordinates: ${label}`);
  if (snapshot !== binding.declared_version.endsWith("-SNAPSHOT")) componentFail("component-artifact-coordinate-conflict", `candidate artifact release kind mismatch: ${label}`);
  if (binding.status === "candidate" && !candidateArtifactFieldsEmpty(binding)) componentFail("component-evidence-missing", `candidate artifact must remain unresolved until evidence is published: ${label}`);
  if (binding.status === "resolved") {
    if (snapshot || binding.resolved_version !== binding.declared_version || !sha256(binding.pom_sha256) || !sha256(binding.jar_sha256) || !sha256(binding.sources_jar_sha256)) componentFail("component-evidence-missing", `resolved external release lacks immutable version or POM/JAR/sources digest: ${label}`);
    if (binding.published_at !== null && (typeof binding.published_at !== "string" || !binding.published_at.length)) componentFail("component-binding-drift", `invalid external release timestamp: ${label}`);
    if (binding.source_tree !== null && !gitTree(binding.source_tree)) componentFail("component-binding-drift", `invalid external release source tree: ${label}`);
    if (!Array.isArray(binding.evidence) || !Array.isArray(binding.blockers)) componentFail("component-evidence-missing", `resolved external release evidence fields are invalid: ${label}`);
  }
}
export function componentCapabilityDigest(value, capabilityId = value?.capability_id) {
  const { capability_id, component_digest, status, evidence, blockers, ...recipe } = value ?? {};
  return platformDigest({ capability_id: capabilityId, ...recipe });
}
function validateBoot3Java17Policy(entry, profile) {
  if (profile.component_platform_line !== "boot3-java17") return;
  if (profile.spring_cloud_version !== "2025.0.3" || profile.spring_cloud_alibaba_version !== "2025.0.0.0" || profile.validation_namespace !== "jakarta" || profile.jackson_major !== 2 || profile.auto_configuration_imports_path !== "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports") componentFail("component-binding-drift", `Boot 3.5/JDK17 platform constraints changed: ${profile.id}`);
  if (!entry.platform_artifact_bindings || !Array.isArray(entry.external_snapshot_bindings) || !Array.isArray(entry.external_artifact_bindings)) componentFail("component-binding-drift", `Boot 3.5/JDK17 artifact binding structures are missing: ${entry.id}`);
  if (entry.external_snapshot_bindings.length) componentFail("component-artifact-coordinate-conflict", `Boot 3.5/JDK17 does not allow unresolved external SNAPSHOT bindings: ${entry.id}`);
  const components = entry.component_capabilities ?? {};
  const exactComponent = (capabilityId, expected) => {
    const artifacts = components[capabilityId]?.artifacts;
    if (!Array.isArray(artifacts) || artifacts.length !== expected.length || artifacts.some((artifact, index) => `${artifact.group_id}:${artifact.artifact_id}:${artifact.declared_version}` !== expected[index])) componentFail("component-binding-drift", `Boot 3.5/JDK17 component coordinates changed: ${entry.id}:${capabilityId}`);
  };
  exactComponent("contract.request-validation", [`org.springframework.boot:spring-boot-starter-validation:${profile.spring_boot_version}`]);
  exactComponent("component.cache", ["com.yss.cloud:yss-component-cache-starter:3.1.0-SNAPSHOT"]);
  exactComponent("component.distributed-id", ["com.yss.cloud:yss-component-distributed-id:3.1.0-SNAPSHOT"]);
  if (Object.values(components).some(item => item.artifacts?.some(artifact => artifact.artifact_id === "yss-component-excel-starter"))) componentFail("component-new-adoption-forbidden", `removed yss-component-excel-starter is present: ${entry.id}`);
  exactComponent("component.excel-import-export", ["com.yss.cloud:yss-component-excel-mvc:3.0.0-SNAPSHOT"]);
  for (const [capabilityId, item] of Object.entries(components)) {
    if (item.status !== "blocked" || item.verified_architectures.length || item.evidence.length || item.artifacts.some(artifact => ["resolved_version", "pom_sha256", "jar_sha256", "source_tree"].some(field => artifact[field] !== null))) componentFail("component-evidence-missing", `Boot 3.5/JDK17 unpublished component must remain blocked and unresolved: ${entry.id}:${capabilityId}`);
  }
  const external = entry.external_artifact_bindings;
  if (external.length !== 1 || `${external[0].group_id}:${external[0].artifact_id}:${external[0].declared_version}` !== "org.apache.fesod:fesod-sheet:2.0.2-incubating" || external[0].status !== "resolved") componentFail("component-binding-drift", `Boot 3.5/JDK17 Fesod release binding changed: ${entry.id}`);
}
function validateComponentCatalog(value, root = PLATFORM_ROOT) {
  if (Object.hasOwn(value, "component_capabilities") || Object.hasOwn(value, "component_capability_ids")) componentFail("component-binding-drift", "component capabilities must be nested in their compatibility entry");
  for (const entry of value.compatibility) {
    const profile = value.profiles.find(item => item.id === entry.profile_id && item.spring_boot_version === entry.spring_boot_version);
    if (!profile) componentFail("component-unavailable-for-platform", `compatibility profile is missing: ${entry.id}`);
    const generation = platformGeneration(profile);
    if (!COMPONENT_PLATFORM_LINES.has(generation.line) || profile.component_platform_line !== generation.line) componentFail("component-platform-generation-mismatch", `profile component line does not match ${generation.line}: ${profile.id}`);
    if (entry.platform_artifact_bindings !== undefined) {
      if (!entry.platform_artifact_bindings || Array.isArray(entry.platform_artifact_bindings) || Object.keys(entry.platform_artifact_bindings).sort().join(",") !== "bom,parent") componentFail("component-binding-drift", `platform artifact bindings must contain parent and bom: ${entry.id}`);
      validateArtifactBinding(entry.platform_artifact_bindings.parent, `${entry.id}:parent`, { role: "parent", expected: entry.parent, snapshot: true });
      validateArtifactBinding(entry.platform_artifact_bindings.bom, `${entry.id}:bom`, { role: "bom", expected: entry.bom, snapshot: true });
    }
    for (const [field, snapshot] of [["external_snapshot_bindings", true], ["external_artifact_bindings", false]]) {
      const bindings = entry[field];
      if (bindings === undefined) continue;
      if (!Array.isArray(bindings)) componentFail("component-binding-drift", `${field} must be an array: ${entry.id}`);
      const coordinates = new Set();
      for (const binding of bindings) {
        validateArtifactBinding(binding, `${entry.id}:${field}:${binding?.group_id ?? "?"}:${binding?.artifact_id ?? "?"}`, { role: binding?.role, snapshot, allowedStatuses: field === "external_artifact_bindings" ? ["candidate", "resolved"] : ["candidate"] });
        const coordinate = `${binding.group_id}:${binding.artifact_id}`;
        if (coordinates.has(coordinate)) componentFail("component-artifact-coordinate-conflict", `duplicate ${field} coordinate: ${entry.id}:${coordinate}`);
        coordinates.add(coordinate);
      }
    }
    let artifactResolution = null;
    if (entry.artifact_resolution_evidence !== undefined) {
      const binding = entry.artifact_resolution_evidence;
      if (!portableEvidence(binding) || typeof binding.report_id !== "string" || typeof binding.repository_id !== "string") componentFail("component-evidence-missing", `invalid artifact resolution evidence: ${entry.id}`);
      let bytes;
      try { bytes = readFileSync(path.join(root, binding.ref)); }
      catch { componentFail("component-evidence-missing", `artifact resolution evidence is unreadable: ${entry.id}`); }
      if (platformDigest(bytes) !== binding.digest) componentFail("component-binding-drift", `artifact resolution evidence drift: ${entry.id}`);
      try { artifactResolution = JSON.parse(bytes); }
      catch { componentFail("component-binding-drift", `artifact resolution evidence is not valid JSON: ${entry.id}`); }
      if (artifactResolution.schema_version !== 1 || artifactResolution.kind !== "backend-component-artifact-resolution" || artifactResolution.report_id !== binding.report_id || artifactResolution.repository?.id !== binding.repository_id || !Array.isArray(artifactResolution.artifacts)) componentFail("component-binding-drift", `artifact resolution evidence identity mismatch: ${entry.id}`);
      artifactResolution = new Map(artifactResolution.artifacts.map(item => [`${item.group_id}:${item.artifact_id}:${item.declared_version}`, item]));
    }
    if (entry.component_capabilities === undefined) continue;
    if (!entry.component_capabilities || Array.isArray(entry.component_capabilities) || typeof entry.component_capabilities !== "object") componentFail("component-evidence-missing", `component capability map is invalid: ${entry.id}`);
    for (const [capabilityId, item] of Object.entries(entry.component_capabilities)) {
      const key = `${entry.id}:${capabilityId}`;
      if (!capabilityId.includes(".") || !item || typeof item !== "object") componentFail("component-binding-drift", `invalid component capability binding: ${key}`);
      if (!["candidate", "verified", "blocked"].includes(item.status) || !Array.isArray(item.verified_architectures) || !Array.isArray(item.artifacts) || !Array.isArray(item.evidence) || !Array.isArray(item.blockers)) componentFail("component-evidence-missing", `incomplete capability entry: ${key}`);
      if (item.provider_kind !== undefined && !["yss-component", "platform-managed"].includes(item.provider_kind)) componentFail("component-binding-drift", `invalid component provider kind: ${key}`);
      if (item.provider_kind === "platform-managed") {
        if (capabilityId !== "contract.request-validation" || item.artifacts.length !== 1) componentFail("component-binding-drift", `unsupported platform-managed capability: ${key}`);
        const artifact = item.artifacts[0];
        if (artifact.group_id !== "org.springframework.boot" || artifact.artifact_id !== "spring-boot-starter-validation" || artifact.declared_version !== profile.spring_boot_version) componentFail("component-binding-drift", `platform-managed validation must match Spring Boot ${profile.spring_boot_version}: ${key}`);
      }
      if (!["active", "maintenance", "deprecated", "retired"].includes(item.lifecycle ?? "active") || !["allowed", "forbidden"].includes(item.adoption_policy ?? "allowed")) componentFail("component-binding-drift", `invalid component lifecycle/adoption policy: ${key}`);
      if (item.lifecycle === "retired" && !retirementEvidenceComplete(item.retirement_evidence)) componentFail("component-retirement-evidence-missing", `organizational zero-consumption evidence is incomplete: ${key}`);
      if (new Set(item.verified_architectures).size !== item.verified_architectures.length || item.verified_architectures.some(family => !["domain-driven", "layered-mvc"].includes(family))) componentFail("component-binding-drift", `invalid verified architectures: ${key}`);
      const coordinates = new Set();
      for (const artifact of item.artifacts) {
        const coordinate = `${artifact.group_id}:${artifact.artifact_id}`;
        if (!artifact.group_id || !artifact.artifact_id || !exactVersion(artifact.declared_version) || coordinates.has(coordinate)) componentFail("component-artifact-coordinate-conflict", `invalid or duplicate artifact coordinate in ${key}: ${coordinate}`);
        if (artifact.resolved_version !== null && artifact.resolved_version !== undefined && !exactVersion(artifact.resolved_version)) componentFail("component-artifact-coordinate-conflict", `invalid resolved version in ${key}: ${coordinate}`);
        if (artifact.declared_version.endsWith("-SNAPSHOT") && artifact.resolved_version && (artifact.resolved_version === artifact.declared_version || artifact.resolved_version.endsWith("-SNAPSHOT"))) componentFail("component-artifact-coordinate-conflict", `SNAPSHOT is not uniquely resolved in ${key}: ${coordinate}`);
        if (artifactResolution) {
          const resolved = artifactResolution.get(`${coordinate}:${artifact.declared_version}`);
          if (!resolved) componentFail("component-evidence-missing", `artifact is absent from resolution evidence: ${key}:${coordinate}`);
          const expectedPom = resolved.pom_sha256 ? `sha256:${resolved.pom_sha256}` : null;
          const expectedJar = resolved.jar_sha256 ? `sha256:${resolved.jar_sha256}` : null;
          const expectedTree = resolved.sources_match_source_tree === true && resolved.pom_matches_source_tree === true ? resolved.source_tree : null;
          if (artifact.resolved_version !== resolved.resolved_version || artifact.pom_sha256 !== expectedPom || artifact.jar_sha256 !== expectedJar || artifact.source_tree !== expectedTree) componentFail("component-binding-drift", `artifact binding differs from resolution evidence: ${key}:${coordinate}`);
        }
        coordinates.add(coordinate);
      }
      if (!sha256(item.component_digest) || item.component_digest !== componentCapabilityDigest(item, capabilityId)) componentFail("component-binding-drift", `component digest mismatch: ${key}`);
      if (item.status === "verified") {
        if (!item.verified_architectures.length || !item.artifacts.length || !item.evidence.length || item.blockers.length) componentFail("component-evidence-missing", `verified capability is incomplete: ${key}`);
        if (entry.status !== "verified") componentFail("component-unavailable-for-platform", `verified capability belongs to an unverified compatibility entry: ${key}`);
        if (item.artifacts.some(artifact => !exactVersion(artifact.resolved_version) || !sha256(artifact.pom_sha256) || !sha256(artifact.jar_sha256) || !gitTree(artifact.source_tree))) componentFail("component-evidence-missing", `verified artifact evidence is missing: ${key}`);
        const generation = platformGeneration(value.profiles.find(profile => profile.id === entry.profile_id));
        if (generation.componentMajor !== null && item.artifacts.some(artifact => major(artifact.declared_version) !== generation.componentMajor)) componentFail("component-platform-generation-mismatch", `${key} does not match ${generation.line}`);
        if (item.evidence.some(evidence => !portableEvidence(evidence) || !item.verified_architectures.includes(evidence.architecture_family))) componentFail("component-evidence-missing", `verified capability evidence is invalid: ${key}`);
      } else if (!item.blockers.length) componentFail("component-evidence-missing", `unverified capability lacks blockers: ${key}`);
    }
    validateBoot3Java17Policy(entry, profile);
  }
}
export function loadBackendPlatforms(root = PLATFORM_ROOT) {
  const value = JSON.parse(readFileSync(path.join(root, PLATFORM_CATALOG_REF), "utf8"));
  if (value.schema_version !== 2 || value.kind !== "backend-platform-catalog" || !Array.isArray(value.profiles) || !Array.isArray(value.compatibility)) fail("invalid catalog");
  if (new Set(value.profiles.map(item => `${item.id}:${item.spring_boot_version}:${item.java_version}`)).size !== value.profiles.length || new Set(value.compatibility.map(item => item.id)).size !== value.compatibility.length) fail("duplicate catalog release/id");
  for (const profile of value.profiles) {
    if (!/^\d+\.\d+\.\d+$/.test(profile.spring_boot_version)) fail("catalog requires exact patch versions");
    const generation = platformGeneration(profile);
    if (COMPONENT_PLATFORM_LINES.has(generation.line) && profile.component_platform_line !== generation.line) componentFail("component-platform-generation-mismatch", `profile component line does not match ${generation.line}: ${profile.id}`);
    if (!COMPONENT_PLATFORM_LINES.has(generation.line) && profile.component_platform_line !== undefined) componentFail("component-platform-generation-mismatch", `unsupported component platform line for ${profile.id}: ${profile.component_platform_line}`);
  }
  validateComponentCatalog(value, root);
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
  return platformDigest({ profile: recipe, entry: { id: entry.id, profile_id: entry.profile_id, spring_boot_version: entry.spring_boot_version, parent: entry.parent, bom: entry.bom, components: entry.components ?? {}, platform_artifact_bindings: entry.platform_artifact_bindings ?? {}, external_snapshot_bindings: entry.external_snapshot_bindings ?? [], external_artifact_bindings: entry.external_artifact_bindings ?? [] } });
}
export function platformBinding(profile, entry) {
  const componentPlatformLine = normalizedComponentPlatformLine(profile);
  return { schema_version: 2, profile_id: profile.id, spring_boot_version: profile.spring_boot_version, java_version: profile.java_version, ...(componentPlatformLine ? { component_platform_line: componentPlatformLine } : {}), parent: entry.parent, bom: entry.bom, compatibility_id: entry.id, compatibility_digest: platformRecipeDigest(profile, entry) };
}
export function resolveBackendPlatform(binding, options = {}) {
  const root = options.root ?? PLATFORM_ROOT;
  const catalog = options.catalog ?? loadBackendPlatforms(root);
  const requireVerified = options.requireVerified ?? true;
  if (!binding || binding.schema_version !== 2) fail("missing platform_configuration v2 (v1 is historical read-only); 生命周期须展示 Boot/Java/YSS 组合并取得用户确认");
  const profile = platformProfile(binding.profile_id, catalog, binding.spring_boot_version);
  if (binding.spring_boot_version !== profile.spring_boot_version || binding.java_version !== profile.java_version) fail("unsupported exact Boot/Java combination (x/latest and Java 8/11 for Boot 3.5/4.1 are rejected)");
  if (binding.component_platform_line !== normalizedComponentPlatformLine(profile)) fail("component_platform_line does not match the selected platform profile");
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
export function resolveComponentCapabilities(binding, capabilityIds, architectureFamily, options = {}) {
  const root = options.root ?? PLATFORM_ROOT;
  const catalog = options.catalog ?? loadBackendPlatforms(root);
  let resolvedPlatform;
  try { resolvedPlatform = resolveBackendPlatform(binding, { catalog, root, requireVerified: false }); }
  catch (error) {
    const code = /drift|stale/i.test(error.message ?? "") ? "component-binding-drift" : "component-unavailable-for-platform";
    componentFail(code, error.message);
  }
  if (!Array.isArray(capabilityIds) || !capabilityIds.length || capabilityIds.some(id => typeof id !== "string" || !id.length) || new Set(capabilityIds).size !== capabilityIds.length) componentFail("component-unavailable-for-platform", "capability ids must be a non-empty unique list");
  if (!["domain-driven", "layered-mvc"].includes(architectureFamily)) componentFail("component-unavailable-for-platform", `unsupported architecture family: ${architectureFamily}`);
  const records = capabilityIds.map(capabilityId => {
    const item = resolvedPlatform.entry.component_capabilities?.[capabilityId];
    if (!item) componentFail("component-unavailable-for-platform", `${capabilityId} is not declared for ${resolvedPlatform.entry.id}`);
    if (item.lifecycle === "retired" && !retirementEvidenceComplete(item.retirement_evidence)) componentFail("component-retirement-evidence-missing", `${capabilityId} lacks organizational zero-consumption evidence`);
    if ((item.adoption_policy ?? "allowed") === "forbidden" && !(options.allowForbiddenExisting ?? false)) componentFail("component-new-adoption-forbidden", `${capabilityId} is ${item.lifecycle ?? "deprecated"}; use ${item.replacement_binding_id ?? item.replacement_gav ?? "the approved migration route"}`);
    const generation = platformGeneration(resolvedPlatform.profile);
    if (generation.componentMajor !== null && item.artifacts.some(artifact => major(artifact.declared_version) !== generation.componentMajor)) componentFail("component-platform-generation-mismatch", `${capabilityId} requires component ${generation.componentMajor}.x for ${generation.line}`);
    if (item.status !== "verified") {
      const blockers = (item.blockers ?? []).join("; ");
      const code = item.blockers?.some(blocker => blocker.startsWith("component-platform-generation-mismatch:"))
        ? "component-platform-generation-mismatch"
        : item.blockers?.some(blocker => blocker.startsWith("component-new-adoption-forbidden:"))
          ? "component-new-adoption-forbidden"
          : item.blockers?.some(blocker => blocker.startsWith("component-retirement-evidence-missing:"))
            ? "component-retirement-evidence-missing"
            : item.blockers?.some(blocker => blocker.startsWith("component-artifact-coordinate-conflict:"))
              ? "component-artifact-coordinate-conflict"
              : item.blockers?.some(blocker => blocker.startsWith("component-binding-drift:"))
                ? "component-binding-drift"
                : item.blockers?.some(blocker => blocker.startsWith("component-evidence-missing:"))
                  ? "component-evidence-missing"
                  : "component-unavailable-for-platform";
      componentFail(code, `${capabilityId} is ${item.status}; ${blockers}`);
    }
    if (!item.verified_architectures.includes(architectureFamily)) componentFail("component-unavailable-for-platform", `${capabilityId} is not verified for ${architectureFamily}`);
    if (!item.artifacts.length || item.artifacts.some(artifact => !artifact.group_id || !artifact.artifact_id || !exactVersion(artifact.declared_version) || !exactVersion(artifact.resolved_version) || !sha256(artifact.pom_sha256) || !sha256(artifact.jar_sha256) || !gitTree(artifact.source_tree))) componentFail("component-evidence-missing", `${capabilityId} lacks exact artifact evidence`);
    const artifactCoordinates = item.artifacts.map(artifact => `${artifact.group_id}:${artifact.artifact_id}`);
    if (new Set(artifactCoordinates).size !== artifactCoordinates.length || item.artifacts.some(artifact => artifact.declared_version.endsWith("-SNAPSHOT") && (artifact.resolved_version === artifact.declared_version || artifact.resolved_version.endsWith("-SNAPSHOT")))) componentFail("component-artifact-coordinate-conflict", `${capabilityId} has duplicate coordinates or an unresolved SNAPSHOT`);
    if (item.component_digest !== componentCapabilityDigest(item, capabilityId)) componentFail("component-binding-drift", `${capabilityId} component digest changed`);
    return { capabilityId, item };
  });
  if (options.requirePlatformVerified ?? true) {
    try { resolveBackendPlatform(binding, { catalog, root, requireVerified: true }); }
    catch (error) {
      const code = /drift|stale/i.test(error.message ?? "") ? "component-binding-drift" : "component-unavailable-for-platform";
      componentFail(code, error.message);
    }
  }
  const coordinates = new Map();
  for (const { capabilityId, item } of records) for (const artifact of item.artifacts) {
    const coordinate = `${artifact.group_id}:${artifact.artifact_id}`;
    const previous = coordinates.get(coordinate);
    const version = `${artifact.declared_version}->${artifact.resolved_version}`;
    if (previous && previous.version !== version) componentFail("component-artifact-coordinate-conflict", `${coordinate} resolves to both ${previous.version} (${previous.capabilityId}) and ${version} (${capabilityId})`);
    coordinates.set(coordinate, { version, capabilityId });
  }
  return records.map(({ capabilityId, item }) => {
    const evidence = item.evidence.filter(record => record.architecture_family === architectureFamily);
    if (!evidence.length) componentFail("component-evidence-missing", `${capabilityId} lacks ${architectureFamily} evidence`);
    for (const record of evidence) {
      if (!portableEvidence(record)) componentFail("component-evidence-missing", `${capabilityId} has invalid portable evidence`);
      let bytes;
      try { bytes = readFileSync(path.join(root, record.ref)); }
      catch { componentFail("component-evidence-missing", `${capabilityId} evidence is unreadable: ${record.ref}`); }
      if (platformDigest(bytes) !== record.digest) componentFail("component-binding-drift", `${capabilityId} evidence bytes changed`);
      let report;
      try { report = JSON.parse(bytes); }
      catch { componentFail("component-binding-drift", `${capabilityId} evidence is not valid JSON`); }
      if (report.schema_version !== 1 || report.kind !== "backend-component-capability-evidence" || report.status !== "passed" || report.capability_id !== capabilityId || report.compatibility_id !== resolvedPlatform.entry.id || report.profile_id !== resolvedPlatform.profile.id || report.spring_boot_version !== resolvedPlatform.profile.spring_boot_version || report.architecture_family !== architectureFamily || report.component_digest !== item.component_digest || platformDigest(report.artifacts) !== platformDigest(item.artifacts)) componentFail("component-binding-drift", `${capabilityId} evidence identity mismatch`);
    }
    return { capability_id: capabilityId, status: item.status, verified_architectures: [...item.verified_architectures], artifacts: item.artifacts.map(artifact => ({ ...artifact })), evidence: evidence.map(record => ({ ...record })), component_digest: item.component_digest };
  });
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
            if (expectedStatus == 400) {
                try (java.io.InputStream stream = connection.getErrorStream()) {
                    assertNotNull(stream);
                    java.util.Map<?, ?> error = mapper.readValue(stream, java.util.Map.class);
                    assertFalse(error.isEmpty()); // Exact YSS error envelope requires the component capability contract.
                }
            }
            if (expectedStatus == 200) {
                assertTrue(connection.getContentType().startsWith("application/json"));
                try (java.io.InputStream stream = connection.getInputStream()) { assertEquals(value, mapper.readValue(stream, ProbePayload.class).getValue()); }
            }
        } finally { connection.disconnect(); }
    }
    @Autowired ${mapper.split(".").at(-1)} mapper;
    @Autowired SqlSessionFactory sqlSessionFactory;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired org.mybatis.spring.SqlSessionTemplate sessions;
    @Autowired PlatformProbeMapping probeMapping;

    @lombok.Getter
    @lombok.Setter
    public static class ProbeRow {
        private Long id;
        private String value;
    }
    interface RoundTripMapper {
        @org.apache.ibatis.annotations.Insert("INSERT INTO scaffold_roundtrip(id, probe_value) VALUES(#{id}, #{value})")
        int insert(ProbeRow row);
        @org.apache.ibatis.annotations.Results(@org.apache.ibatis.annotations.Result(column = "probe_value", property = "value"))
        @Select("SELECT id, probe_value FROM scaffold_roundtrip ORDER BY id")
        java.util.List<ProbeRow> page(org.apache.ibatis.session.RowBounds bounds);
        @Select("SELECT COUNT(*) FROM scaffold_roundtrip") int count();
    }
    private RoundTripMapper roundTripMapper() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS scaffold_roundtrip(id BIGINT PRIMARY KEY, probe_value VARCHAR(100) NOT NULL)");
        jdbc.update("DELETE FROM scaffold_roundtrip");
        if (!sqlSessionFactory.getConfiguration().hasMapper(RoundTripMapper.class)) sqlSessionFactory.getConfiguration().addMapper(RoundTripMapper.class);
        return sessions.getMapper(RoundTripMapper.class);
    }
    @Test void mappingPersistenceAndPaginationRoundTrip() {
        RoundTripMapper persistence = roundTripMapper();
        for (long id = 1; id <= 3; id++) {
            ProbeRow original = new ProbeRow(); original.setId(id); original.setValue("probe-" + id);
            ProbeRow copy = probeMapping.copy(original);
            assertNotSame(original, copy); assertEquals(original.getId(), copy.getId());
            persistence.insert(copy);
        }
        assertEquals(3, persistence.count());
        java.util.List<ProbeRow> page = persistence.page(new org.apache.ibatis.session.RowBounds(1, 1));
        assertEquals(1, page.size()); assertEquals(Long.valueOf(2), page.get(0).getId());
        assertEquals("probe-2", page.get(0).getValue());
        assertNull(probeMapping.copy(null));
    }
    @Test void transactionRollsBackOnUseCaseFailure() {
        final RoundTripMapper persistence = roundTripMapper();
        org.springframework.transaction.support.TransactionTemplate transaction = new org.springframework.transaction.support.TransactionTemplate(transactions);
        assertThrows(IllegalStateException.class, () -> transaction.execute(status -> {
            ProbeRow row = new ProbeRow(); row.setId(9L); row.setValue("must-rollback"); persistence.insert(row);
            throw new IllegalStateException("synthetic use-case failure");
        }));
        assertEquals(0, persistence.count());
    }
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

@org.mapstruct.Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.ERROR)
interface PlatformProbeMapping {
    @org.mapstruct.Mapping(target = "id", source = "id")
    @org.mapstruct.Mapping(target = "value", source = "value")
    PlatformIntegrationTest.ProbeRow copy(PlatformIntegrationTest.ProbeRow row);
}
`;
}
