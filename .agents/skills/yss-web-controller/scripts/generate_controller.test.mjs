import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generate, parseArgs } from "./generate_controller.mjs";

test("generates application-service controller with requested validation profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-controller-"));
  const metadata = path.join(root, "metadata.json");
  const contract = path.join(root, "web-contract.json");
  await writeFile(metadata, JSON.stringify({ tables: [{ table_name: "quality_rule", table_comment: "质量规则", columns: [{ name: "id", sql_type: "bigint", primary: true, nullable: false }, { name: "rule_name", sql_type: "varchar(64)", nullable: false }] }] }));
  await writeFile(contract, JSON.stringify({ schema_version: 1, status: "approved", base_package: "com.yss.demo", module_name: "demo", domain_segment: "quality", architecture_profile: "target-domain-model", platform_profile: "spring-boot-3-jdk17", validation_namespace: "jakarta", dto_placement: "web", openapi_freeze_ref: "openapi://quality-rule@1", fields: { quality_rule: { create: ["rule_name"], update: ["id", "rule_name"], query: ["rule_name"], response: ["id", "rule_name"] } } }));
  await generate(parseArgs(["--metadata-file", metadata, "--contract-file", contract, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--output-dir", path.join(root, "out"), "--application-service-package", "com.yss.demo.application.service", "--validation-namespace", "jakarta"]), { log() {}, warn() {} });
  const controller = await readFile(path.join(root, "out", "com", "yss", "demo", "rest", "QualityRuleController.java"), "utf8");
  const convertor = await readFile(path.join(root, "out", "com", "yss", "demo", "rest", "convertor", "QualityRuleWebConvertor.java"), "utf8");
  const createRequest = await readFile(path.join(root, "out", "com", "yss", "demo", "rest", "dto", "request", "QualityRuleCreateRequest.java"), "utf8");
  assert.match(controller, /import com\.yss\.demo\.application\.service\.QualityRuleService;/);
  assert.match(controller, /import jakarta\.validation\.Valid;/);
  assert.match(controller, /webConvertor\.toCreateCommand\(request\)/);
  assert.match(convertor, /@Mapper\(componentModel = "spring"\)/);
  assert.match(convertor, /application\.command\.QualityRuleCreateCommand/);
  assert.match(convertor, /application\.result\.QualityRuleResult/);
  assert.doesNotMatch(`${controller}\n${convertor}`, /Gateway|\.domain\.|Mappers\.getMapper|INSTANCE/);
  assert.match(createRequest, /private String ruleName;/);
  assert.doesNotMatch(createRequest, /private Long id;|@Data/);
});

test("rejects missing required CLI arguments", () => assert.throws(() => parseArgs(["--module-name", "demo"]), /required/));

test("requires an approved target-profile field contract and refuses force overwrite", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-controller-contract-"));
  const metadata = path.join(root, "metadata.json");
  const contract = path.join(root, "web-contract.json");
  await writeFile(metadata, JSON.stringify({ tables: [{ table_name: "quality_rule", columns: [{ name: "id", sql_type: "bigint", primary: true, nullable: false }] }] }));
  await writeFile(contract, JSON.stringify({ schema_version: 1, status: "draft", base_package: "com.yss.demo", module_name: "demo", domain_segment: "quality", architecture_profile: "target-domain-model", platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", openapi_freeze_ref: "openapi://quality-rule@1", fields: { quality_rule: { create: [], update: ["id"], query: [], response: ["id"] } } }));
  const base = ["--metadata-file", metadata, "--contract-file", contract, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--output-dir", path.join(root, "out")];
  await assert.rejects(() => generate(parseArgs(base), { log() {}, warn() {} }), /approved/);
  await writeFile(contract, JSON.stringify({ schema_version: 1, status: "approved", base_package: "com.yss.demo", module_name: "demo", domain_segment: "quality", architecture_profile: "target-domain-model", platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", openapi_freeze_ref: "openapi://quality-rule@1", fields: { quality_rule: { create: [], update: ["id"], query: [], response: ["id"] } } }));
  await writeFile(contract, JSON.stringify({ schema_version: 1, status: "approved", base_package: "com.yss.demo", module_name: "demo", domain_segment: "quality", architecture_profile: "target-domain-model", platform_profile: "spring-boot-3-jdk17", validation_namespace: "javax", dto_placement: "web", openapi_freeze_ref: "openapi://quality-rule@1", fields: { quality_rule: { create: [], update: ["id"], query: [], response: ["id"] } } }));
  await assert.rejects(() => generate(parseArgs(base), { log() {}, warn() {} }), /platform_profile and validation_namespace/);
  assert.throws(() => parseArgs([...base, "--force"]), /initialize-only/);
});

test("binds generation identity to the approved contract and fails before writing when any target exists", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-controller-initialize-only-"));
  const metadata = path.join(root, "metadata.json");
  const contract = path.join(root, "web-contract.json");
  const output = path.join(root, "out");
  await writeFile(metadata, JSON.stringify({ tables: [{ table_name: "quality_rule", columns: [{ name: "id", sql_type: "bigint", nullable: false }] }] }));
  await writeFile(contract, JSON.stringify({ schema_version: 1, status: "approved", base_package: "com.yss.demo", module_name: "demo", domain_segment: "quality", architecture_profile: "target-domain-model", platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", openapi_freeze_ref: "openapi://quality-rule@1", fields: { quality_rule: { create: [], update: ["id"], query: [], response: ["id"] } } }));
  const args = ["--metadata-file", metadata, "--contract-file", contract, "--base-package", "com.yss.demo", "--module-name", "demo", "--domain-segment", "quality", "--output-dir", output];
  await assert.rejects(() => generate(parseArgs(args.map((value) => value === "demo" ? "other" : value)), { log() {}, warn() {} }), /approved web generation contract/);
  const existing = path.join(output, "com/yss/demo/rest/QualityRuleController.java");
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, "user-owned\n");
  await assert.rejects(() => generate(parseArgs(args), { log() {}, warn() {} }), /initialize-only/);
  assert.equal(await readFile(existing, "utf8"), "user-owned\n");
  await assert.rejects(() => readFile(path.join(output, "com/yss/demo/rest/convertor/QualityRuleWebConvertor.java"), "utf8"), /ENOENT/);
});
