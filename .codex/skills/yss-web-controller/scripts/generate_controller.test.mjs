import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generate, parseArgs } from "./generate_controller.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const dtoWireProfileFile = path.resolve(scripts, "../../yss-dto/references/openapi-wire-profile.yaml");
const dtoWireProfileDigest = createHash("sha256").update(await readFile(dtoWireProfileFile)).digest("hex");

for (const [profile, module, placement, modules, generator] of [
  ["layered-mvc-service", "service", "server", ["server", "service", "repository"], "yss-layered-mvc-scaffold-generator"],
  ["mvc-data-analysis-v1", "core", "client", ["server", "core", "client", "repository", "adapter", "feign-client"], "yss-mvc-data-analysis-project-initializer"]
]) test(`${profile} binds MVC service types, DTO ownership and drift checks`, async (t) => {
  const data = await fixture({ platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax" });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const identity = { architecture_family: "layered-mvc", architecture_profile: profile, generator_skill: generator, requested_capabilities: [], resolved_modules: modules, contract_digest: "a".repeat(64), verification_database: "h2", production_database: "not-bound" };
  const project = path.join(data.root, "demo-service");
  const manifestFile = path.join(project, ".yss/scaffold-generation.json");
  const manifest = { schema_version: 3, project_name: "demo-service", base_package: "com.yss.demo", completion_level: "empty-scaffold-verified", architecture_identity: identity, profiles: { platform: "spring-boot-2.7-jdk8", validation_namespace: "javax" } };
  await mkdir(path.dirname(manifestFile), { recursive: true });
  await writeFile(manifestFile, JSON.stringify(manifest));
  const contract = webContract(project, { architecture_profile: profile, architecture_identity: identity, dto_placement: placement, integration_mode: "scaffold-v2", scaffold_manifest_ref: manifestFile, platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax", application_service_package: `com.yss.demo.${module}.service` });
  await writeFile(data.contract, JSON.stringify(contract));
  const args = parseArgs([...data.args.map((x) => x === "com.yss.demo.application.service" ? `com.yss.demo.${module}.service` : x), "--scaffold-manifest-file", manifestFile, "--web-project-dir", path.join(project, "demo-service-server")]);
  manifest.architecture_identity = { ...identity, contract_digest: "b".repeat(64) };
  await writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(() => generate(args), /stale/);
  manifest.architecture_identity = identity;
  await writeFile(manifestFile, JSON.stringify(manifest));
  const files = await generate(args, { log() {}, warn() {} });
  assert.equal(files.length, 6);
  const convertor = await readFile(path.join(project, "demo-service-server/src/main/java/com/yss/demo/rest/convertor/QualityRuleWebConvertor.java"), "utf8");
  assert.match(convertor, new RegExp(`com\\.yss\\.demo\\.${module}\\.command`));
  assert.doesNotMatch(convertor, /\.application\.|\.domain\.|Gateway/);
  await readFile(path.join(project, `demo-service-${placement}/src/main/java/com/yss/demo/rest/dto/request/QualityRuleCreateRequest.java`));
});

const metadataValue = {
  tables: [{
    table_name: "quality_rule",
    table_comment: "质量规则",
    columns: [
      { name: "id", sql_type: "bigint", primary: true, nullable: false },
      { name: "rule_name", sql_type: "varchar(64)", nullable: false }
    ]
  }]
};

function webContract(root, overrides = {}) {
  return {
    schema_version: 2,
    contract_id: "slice-quality-web-1",
    contract_version: 1,
    current_version: 1,
    slice_id: "quality-rule-create",
    status: "approved",
    integration_mode: "existing-project",
    implementation_project_root: root,
    base_package: "com.yss.demo",
    module_name: "demo",
    domain_segment: "quality",
    application_service_package: "com.yss.demo.application.service",
    architecture_profile: "target-domain-model",
    platform_profile: "spring-boot-3-jdk17",
    validation_namespace: "jakarta",
    dto_placement: "web",
    dto_wire_profile_ref: dtoWireProfileFile,
    dto_wire_profile_digest: dtoWireProfileDigest,
    openapi_freeze_ref: "openapi://quality-rule@1",
    allowed_write_paths: [root],
    expected_evidence_files: ["evidence/web-generation.json"],
    verification_commands: ["./mvnw test", "./mvnw package"],
    fields: {
      quality_rule: {
        create: ["rule_name"],
        update: ["id", "rule_name"],
        query: ["rule_name"],
        pagination: ["pageIndex", "pageSize"],
        response: ["id", "rule_name"]
      }
    },
    ...overrides
  };
}

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "yss-controller-"));
  const metadata = path.join(root, "metadata.json");
  const contract = path.join(root, "web-contract.json");
  const output = path.join(root, "out");
  await writeFile(metadata, JSON.stringify(metadataValue));
  await writeFile(contract, JSON.stringify(webContract(root, overrides)));
  const args = ["--metadata-file", metadata, "--contract-file", contract, "--dto-wire-profile-file", dtoWireProfileFile, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--output-dir", output, "--application-service-package", "com.yss.demo.application.service", "--validation-namespace", overrides.validation_namespace ?? "jakarta"];
  return { root, metadata, contract, output, args };
}

test("generates approved standalone Web code and exposes only approved pagination fields", async () => {
  const data = await fixture();
  await generate(parseArgs(data.args), { log() {}, warn() {} });
  const rest = path.join(data.output, "com", "yss", "demo", "rest");
  const controller = await readFile(path.join(rest, "QualityRuleController.java"), "utf8");
  const convertor = await readFile(path.join(rest, "convertor", "QualityRuleWebConvertor.java"), "utf8");
  const createRequest = await readFile(path.join(rest, "dto", "request", "QualityRuleCreateRequest.java"), "utf8");
  const pageRequest = await readFile(path.join(rest, "dto", "request", "QualityRulePageRequest.java"), "utf8");
  assert.match(controller, /import com\.yss\.demo\.application\.service\.QualityRuleService;/);
  assert.match(controller, /SingleResult\.of\(/);
  assert.match(controller, /import jakarta\.validation\.Valid;/);
  assert.match(convertor, /@Mapper\(componentModel = "spring"\)/);
  assert.match(convertor, /PageResult\.of\(\s*toResponses\(source\.getData\(\)\),\s*source\.getTotalCount\(\),\s*source\.getPageSize\(\),\s*source\.getPageIndex\(\)/s);
  assert.doesNotMatch(`${controller}\n${convertor}`, /Gateway|\.domain\.|Mappers\.getMapper|INSTANCE/);
  assert.match(createRequest, /private String ruleName;/);
  assert.doesNotMatch(createRequest, /private Long id;|@Data/);
  assert.match(pageRequest, /private int pageIndex = 1;/);
  assert.match(pageRequest, /private int pageSize = 10;/);
  assert.doesNotMatch(pageRequest, /orderBy|orderDirection|groupBy|offset|needTotalCount|tempTotalCount|extends PageQuery/);
});

test("rejects a yss-dto wire profile whose digest differs from the approved contract", async () => {
  const data = await fixture({ dto_wire_profile_digest: "0".repeat(64) });
  await assert.rejects(() => generate(parseArgs(data.args), { log() {}, warn() {} }), /yss-dto wire profile digest/);
});

test("rejects missing CLI arguments, schema v1, draft contracts, and inconsistent platform profiles", async () => {
  assert.throws(() => parseArgs(["--module-name", "demo"]), /required/);
  const v1 = await fixture({ schema_version: 1 });
  await assert.rejects(() => generate(parseArgs(v1.args), { log() {}, warn() {} }), /schema_version=1.*unsupported/);
  const draft = await fixture({ status: "draft" });
  await assert.rejects(() => generate(parseArgs(draft.args), { log() {}, warn() {} }), /approved/);
  const mismatch = await fixture({ platform_profile: "spring-boot-3-jdk17", validation_namespace: "javax" });
  await assert.rejects(() => generate(parseArgs(mismatch.args), { log() {}, warn() {} }), /platform_profile and validation_namespace/);
  assert.throws(() => parseArgs([...draft.args, "--force"]), /initialize-only/);
});

test("binds identity and every target to the approved write scope before writing", async () => {
  const data = await fixture();
  await assert.rejects(() => generate(parseArgs(data.args.map((value) => value === "demo" ? "other" : value)), { log() {}, warn() {} }), /approved web generation contract/);
  await writeFile(data.contract, JSON.stringify(webContract(data.root, { allowed_write_paths: [path.join(data.root, "different-root")] })));
  await assert.rejects(() => generate(parseArgs(data.args), { log() {}, warn() {} }), /allowed_write_paths/);
  await writeFile(data.contract, JSON.stringify(webContract(data.root)));
  const existing = path.join(data.output, "com/yss/demo/rest/QualityRuleController.java");
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, "user-owned\n");
  await assert.rejects(() => generate(parseArgs(data.args), { log() {}, warn() {} }), /initialize-only/);
  assert.equal(await readFile(existing, "utf8"), "user-owned\n");
  await assert.rejects(() => readFile(path.join(data.output, "com/yss/demo/rest/convertor/QualityRuleWebConvertor.java"), "utf8"), /ENOENT/);
});

test("scaffold-v2 mode requires an empty-scaffold-verified manifest with matching profile and project layout", async () => {
  const data = await fixture({ platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax" });
  const projectRoot = path.join(data.root, "demo-service");
  const webProject = path.join(projectRoot, "demo-service-adapter", "demo-service-web");
  const manifest = path.join(projectRoot, ".yss", "scaffold-generation.json");
  await mkdir(path.dirname(manifest), { recursive: true });
  await writeFile(manifest, JSON.stringify({ schema_version: 2, project_name: "demo-service", base_package: "com.yss.demo", completion_level: "empty-scaffold-verified", profiles: { architecture: "target-domain-model", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web" } }));
  const contractValue = webContract(projectRoot, {
    integration_mode: "scaffold-v2",
    implementation_project_root: projectRoot,
    scaffold_manifest_ref: manifest,
    platform_profile: "spring-boot-3-jdk17",
    validation_namespace: "jakarta",
    allowed_write_paths: [path.join(webProject, "src/main/java/com/yss/demo/rest")]
  });
  await writeFile(data.contract, JSON.stringify(contractValue));
  const args = ["--metadata-file", data.metadata, "--contract-file", data.contract, "--dto-wire-profile-file", dtoWireProfileFile, "--scaffold-manifest-file", manifest, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--web-project-dir", webProject, "--application-service-package", "com.yss.demo.application.service", "--validation-namespace", "jakarta"];
  await assert.rejects(() => generate(parseArgs(args), { log() {}, warn() {} }), /scaffold manifest.*platform/i);
  contractValue.platform_profile = "spring-boot-2.7-jdk8";
  contractValue.validation_namespace = "javax";
  await writeFile(data.contract, JSON.stringify(contractValue));
  await generate(parseArgs(args.map((value) => value === "jakarta" ? "javax" : value)), { log() {}, warn() {} });
});

test("rolls back files written before a filesystem failure", async () => {
  const data = await fixture();
  const rest = path.join(data.output, "com/yss/demo/rest");
  await mkdir(rest, { recursive: true });
  await writeFile(path.join(rest, "convertor"), "blocking-file\n");
  await assert.rejects(() => generate(parseArgs(data.args), { log() {}, warn() {} }));
  await assert.rejects(() => readFile(path.join(rest, "QualityRuleController.java"), "utf8"), /ENOENT/);
  assert.equal(await readFile(path.join(rest, "convertor"), "utf8"), "blocking-file\n");
});
