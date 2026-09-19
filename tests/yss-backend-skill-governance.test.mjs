import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditBackendSkills } from "../scripts/audit-yss-backend-skills";
import {
  loadSkillRegistry,
  resolveSkillForNewUse,
  SKILL_LIFECYCLE_FAILURE_CODES,
  validateSkillRegistry
} from "../scripts/lib/skill-registry.mjs";
import { parseDocument } from "../scripts/vendor/yaml.mjs";

const registry = loadSkillRegistry();
const backendPlatforms = JSON.parse(readFileSync("docs/engineering/backend-platforms.json", "utf8"));

function skillBody(name) {
  return readFileSync(`.agents/skills/${name}/SKILL.md`, "utf8");
}

function yaml(path) {
  const document = parseDocument(readFileSync(path, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  assert.equal(document.errors.length, 0);
  return document.toJS({ maxAliasCount: 0 });
}

const lifecycleContract = yaml(".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml");

function registryWithDeprecatedSkill(cleanupStatus = "migration-only") {
  const data = structuredClone(registry);
  data.skills.push({
    id: "legacy-backend-skill",
    layer: "specialist",
    maturity: "deprecated",
    replacement_skill: "yss-technical-design",
    deprecation: {
      new_use: "forbidden",
      cleanup_status: cleanupStatus,
      remove_after: "2026-12-17"
    },
    instance_default_discoverable: false,
    aliases: [],
    impacts: ["backend"]
  });
  data.backend_skill_domains.deprecated_skills = ["legacy-backend-skill"];
  return data;
}

function validate(document) {
  return validateSkillRegistry(document, { lifecycleContract, backendPlatforms });
}

test("schema v3 assigns exactly one provider and one primary owner to every capability", () => {
  assert.doesNotThrow(() => validate(registry));
  assert.equal(registry.schema_version, 3);
  assert.equal(registry.capability_contract.schema_version, 3);
  assert.deepEqual(new Set(registry.capability_contract.provider_kinds), new Set(["yss-component", "platform-managed", "none"]));
  const ids = registry.capabilities.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const capability of registry.capabilities) {
    assert.ok(capability.primary_skill);
    assert.ok(["yss-component", "platform-managed", "none"].includes(capability.provider.kind));
    if (capability.provider.kind === "none") assert.equal(capability.provider.binding_id, undefined);
    else assert.ok(capability.provider.binding_id);
  }
  assert.equal(registry.capabilities.find((item) => item.id === "contract.request-validation").provider.binding_id, "spring-validation");
  assert.equal(registry.capabilities.find((item) => item.id === "component.security-algorithm").provider.failure_code, "component-new-adoption-forbidden");
});

test("active YSS backend skill owners are assigned to exactly one of six domains", () => {
  const taxonomy = registry.backend_skill_domains;
  assert.equal(taxonomy.schema_version, 1);
  assert.deepEqual(new Set(taxonomy.domain_ids), new Set([
    "technical-design",
    "layered-implementation",
    "wire-framework-contract",
    "component-capability",
    "engineering-initialization",
    "platform-governance-migration"
  ]));
  const activeOwners = [...new Set(registry.capabilities
    .filter((capability) => capability.id !== "scaffold.frontend-vue3" && capability.primary_skill.startsWith("yss-"))
    .map((capability) => capability.primary_skill))].sort();
  assert.deepEqual(Object.keys(taxonomy.assignments).sort(), activeOwners);
  assert.equal(new Set(Object.keys(taxonomy.assignments)).size, activeOwners.length);
  assert.deepEqual(taxonomy.deprecated_skills, []);

  const missing = structuredClone(registry);
  delete missing.backend_skill_domains.assignments["yss-cache"];
  assert.throws(() => validate(missing), /backend_skill_domains\.assignments/);
});

test("production registry has no deprecated backend skills and replacements own the live routes", () => {
  const deprecated = new Set([
    ...registry.skills.filter((item) => item.maturity === "deprecated").map((item) => item.id),
    ...registry.external_skills.filter((item) => item.maturity === "deprecated").map((item) => item.id)
  ]);
  assert.deepEqual(deprecated, new Set());
  for (const capability of registry.capabilities) assert.equal(deprecated.has(capability.primary_skill), false);
  for (const [owner, dependencies] of Object.entries(registry.skill_dependencies)) {
    assert.equal(deprecated.has(owner), false);
    for (const dependency of dependencies) assert.equal(deprecated.has(dependency.skill), false);
  }
  for (const profile of Object.values(registry.architecture_profiles)) assert.equal(deprecated.has(profile.generator_skill), false);
  assert.equal(registry.architecture_profiles["mvc-data-analysis-v1"].generator_skill, "yss-layered-mvc-scaffold-generator");
  assert.equal(registry.capabilities.find((item) => item.id === "architecture.mvc-design").primary_skill, "yss-technical-design");
  assert.equal(registry.capabilities.find((item) => item.id === "project-init.mvc-data-analysis").primary_skill, "yss-layered-mvc-scaffold-generator");
});

test("new use of deprecated fixtures and retired production IDs returns stable codes", () => {
  for (const id of [
    ["yss", "mvc", "design"].join("-"),
    ["yss", "mvc", "data", "analysis", "project", "initializer"].join("-"),
    ["yss", "backend", "scaffold", "parent"].join("-"),
    ["yss", "router"].join("-")
  ]) {
    assert.throws(
      () => resolveSkillForNewUse(registry, id),
      (error) => error.code === SKILL_LIFECYCLE_FAILURE_CODES.retired
        && error.details.migration_ref === "docs/agents/skill-migrations.md"
    );
  }
  const deprecated = registryWithDeprecatedSkill();
  assert.throws(
    () => resolveSkillForNewUse(deprecated, "legacy-backend-skill"),
    (error) => error.code === SKILL_LIFECYCLE_FAILURE_CODES.deprecated
      && error.details.replacement_skill === "yss-technical-design"
  );
});

test("registry rejects invalid provider and deprecated ownership", () => {
  const invalidProvider = structuredClone(registry);
  invalidProvider.capabilities.find((item) => item.id === "component.cache").provider.kind = "unmanaged";
  assert.throws(() => validate(invalidProvider), /provider\.kind 无效/);

  const invalidOwner = registryWithDeprecatedSkill();
  invalidOwner.capabilities.find((item) => item.id === "architecture.mvc-design").primary_skill = "legacy-backend-skill";
  assert.throws(() => validate(invalidOwner), /不得由 deprecated skill 持有/);

  const missingBinding = structuredClone(registry);
  missingBinding.capabilities.find((item) => item.id === "component.cache").provider.binding_id = "component.not-in-platform-catalog";
  assert.throws(() => validate(missingBinding), /YSS component binding 未登记到后端平台目录/);

  const invalidDependency = registryWithDeprecatedSkill();
  invalidDependency.skill_dependencies["yss-technical-design"].push({ skill: "legacy-backend-skill", type: "coordination-only" });
  assert.throws(() => validate(invalidDependency), /不得依赖 deprecated skill/);
});

test("registry rejects incomplete or invalid two-stage retirement metadata", () => {
  const legacy = structuredClone(registry);
  legacy.schema_version = 2;
  assert.throws(() => validate(legacy), /schema_version 必须为 3/);

  const badDate = registryWithDeprecatedSkill();
  badDate.skills.find((item) => item.id === "legacy-backend-skill").deprecation.remove_after = "17-12-2026";
  assert.throws(() => validate(badDate), /有效 ISO 日期/);

  const alias = registryWithDeprecatedSkill();
  alias.skills.find((item) => item.id === "legacy-backend-skill").aliases = ["mvc-design"];
  assert.throws(() => validate(alias), /deprecated 后不得保留 alias/);

  const missingReplacement = registryWithDeprecatedSkill();
  missingReplacement.skills.find((item) => item.id === "legacy-backend-skill").replacement_skill = "missing-skill";
  assert.throws(() => validate(missingReplacement), /replacement_skill 引用了未登记技能/);
});

test("backend audit emits all five governance states and gates remove-ready on zero references", () => {
  const candidates = auditBackendSkills(registry);
  assert.deepEqual(candidates.filter((item) => item.classification === "deprecated"), []);
  assert.deepEqual(
    candidates.filter((item) => item.classification === "enhance").map((item) => item.skill),
    ["yss-security-algorithm", "yss-up-springboot3", "yss-validation"]
  );
  const removeReady = registryWithDeprecatedSkill("remove-ready");
  assert.equal(auditBackendSkills(removeReady).find((item) => item.skill === "legacy-backend-skill").classification, "remove-ready");

  const mergeReady = structuredClone(registry);
  mergeReady.skills.push({ id: "merge-candidate", layer: "specialist", maturity: "draft", instance_default_discoverable: false, aliases: [], impacts: ["backend"] });
  assert.equal(auditBackendSkills(mergeReady).find((item) => item.skill === "merge-candidate").classification, "merge-ready");
});

test("Boot 3 component Skill semantics match the source-backed security and failure contracts", () => {
  const auditLog = skillBody("yss-audit-log");
  assert.match(auditLog, /`boot3-java17`[^\n]*`args`[^\n]*`result`/);
  assert.match(auditLog, /#\{args\[0\]\}/);
  assert.match(auditLog, /#\{result\[name\]\}/);
  assert.match(auditLog, /CurrentUserProvider/);
  assert.doesNotMatch(auditLog, /参数审计|结果审计/);

  const userInfo = skillBody("yss-userinfo");
  assert.match(userInfo, /SecurityContextCurrentUserProvider/);
  assert.match(userInfo, /TrustedGatewayHeaderCurrentUserProvider/);
  assert.match(userInfo, /`yss\.userinfo\.trusted-gateway\.enabled`/);
  assert.match(userInfo, /`trusted-proxies`/);
  assert.match(userInfo, /SecurityContext[^\n]*优先/);
  assert.match(userInfo, /does not parse an unverified Bearer payload/);
  assert.doesNotMatch(userInfo, /lookup order[^\n]*Bearer JWT payload/);
  assert.doesNotMatch(userInfo, /JWT user-info cache key path/);

  const exception = skillBody("yss-exception");
  assert.match(exception, /Unknown `Exception`, `RuntimeException`[^\n]*HTTP 500/);
  assert.match(exception, /HTTP 413 \(`PAYLOAD_TOO_LARGE`\)/);
  assert.match(exception, /`ResultErrorCode\.INTERNAL_ERROR`/);
  assert.match(exception, /SLF4J logger/);
  assert.match(exception, /`X-Trace-Id`/);
  assert.match(exception, /does not contain the raw localized exception or stack trace/);
  assert.doesNotMatch(exception, /maps BizException, unknown Exception, and RuntimeException to HTTP 400/);
  assert.doesNotMatch(exception, /direct `printStackTrace\(\)` branch/);

  const security = skillBody("yss-security-algorithm");
  assert.match(security, /`new_adoption: forbidden`[^\n]*new-adoption-forbidden/);
  assert.match(security, /`component-new-adoption-forbidden`/);
  assert.match(security, /`Jwks\.generateRsa\(\)`[^\n]*deprecated fail-closed/);
  assert.match(security, /managed `JWKSource`/);
  assert.match(security, /`SecurityCryptoProvider`[^\n]*fail closed/);
  assert.match(security, /public constructor[^\n]*`TextEncryptor`[^\n]*实例 `encrypt` \/ `decrypt`/);
  assert.match(security, /`PasswordEncoderFactories\.createDelegatingPasswordEncoder\(\)`/);
  assert.match(security, /不得把 delegating encoder 的默认 id 改回 `noop`/);
  assert.doesNotMatch(security, /`Jwks\.generateRsa\(\)` 解码硬编码/);
});
