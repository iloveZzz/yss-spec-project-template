// Mechanism fixtures only. Never register synthetic evidence as supported compatibility.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../../vendor/yaml.mjs";
import { loadBackendPlatforms, platformBinding, platformDigest, platformProfile } from "../../lib/backend-platform.mjs";
import { attachScaffoldDecisionFixture } from "../user-decision/build-fixture.mjs";

export function fixtureCatalog(contract) {
  const catalog = loadBackendPlatforms();
  catalog.compatibility = [{ id: "test-only-combination", profile_id: contract.profiles.platform, spring_boot_version: platformProfile(contract.profiles.platform, catalog, contract.platform_configuration?.spring_boot_version).spring_boot_version, parent: contract.maven_coordinates.parent, bom: { group_id: "com.yss.cloud", artifact_id: "yss-components-bom", version: contract.maven_coordinates.yss_components_version }, status: "candidate", capabilities: ["external-integration", "published-client", "feign-client"], evidence: [] }];
  return catalog;
}
export function attachPlatformFixture(root, contract) {
  if (!["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"].includes(contract.generator_skill) || contract.schema_version !== 4) return;
  const catalog = fixtureCatalog(contract);
  const profile = platformProfile(contract.profiles.platform, catalog);
  contract.platform_configuration ??= platformBinding(profile, catalog.compatibility[0]);
  const file = path.resolve(root, contract.decision_ref);
  const decisions = parseDocument(readFileSync(file, "utf8")).toJS();
  const decision = decisions.decisions.find(item => item.decision_id === contract.decision_id);
  if (decision) {
    decision.platform_configuration = contract.platform_configuration;
    // Fixture user sees this exact platform. Real decisions must never be synthesized.
    decision.decision_inputs_digest = platformDigest({ ...decision, user_confirmation: null });
    Object.assign(decision, attachScaffoldDecisionFixture(path.join(root, "platform-user-fixture"), decision));
  }
  writeFileSync(file, `${JSON.stringify(decisions, null, 2)}\n`);
  contract.decision_digest = platformDigest(readFileSync(file));
}
