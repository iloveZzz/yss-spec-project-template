import { attachScaffoldDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { generate as generateWeb, parseArgs as parseWebArgs } from "../../yss-web-controller/scripts/generate_controller.mjs";
import { runFirstSliceVerification } from "./run_first_slice_verification.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(scripts, "generate_scaffold.mjs");
const dtoWireProfileFile = path.resolve(scripts, "../../yss-dto/references/openapi-wire-profile.yaml");
const execute = (file, args, options = {}) => new Promise((resolve) => execFile(file, args, { encoding: "utf8", ...options }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr })));

function scaffoldContract(output, decisionDigest) {
  return {
    schema_version: 3,
    contract_id: "golden-scaffold-1",
    contract_version: 1,
    scaffold_request_id: "golden-request-1",
    status: "approved",
    compiler_draft_ref: "compiler-golden-1",
    lifecycle_approval_ref: "approval-golden-1",
    persisted_ref: "persisted-golden-1",
    current_version: 1,
    implementation_repository: "external",
    backend_repository: "external",
    scaffold_status: "required",
    project_name: "golden-service",
    target_output_dir: output,
    base_package: "com.yss.golden",
    architecture_family: "domain-driven", architecture_profile: "target-domain-model",
    generator_skill: "yss-ddd-scaffold-generator",
    decision_ref: "scaffold-architecture-decisions.yaml",
    decision_id: "scaffold-decision.golden-service",
    decision_digest: decisionDigest,
    maven_coordinates: { group_id: "com.yss.datamiddle", project_version: "1.0.0-SNAPSHOT", parent: { group_id: "com.yss.datamiddle", artifact_id: "yss-datamiddle-parent", version: "2.0.0-SNAPSHOT" }, yss_components_version: "2.0.0-SNAPSHOT" },
    profiles: { architecture: "target-domain-model", persistence: "mybatis-plus", verification_database: "h2", production_database: "not-bound", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", repository: "yss-internal" },
    module_profile: { resolution_version: 1, requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"] },
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "approval-golden-1", approver: "maintainer", persisted_ref: "persisted-golden-1", current_version: 1 },
    work_unit: { id: "golden-unit-1", behavior: "scaffold", primary_skill: "yss-ddd-scaffold-generator", supporting_skills: ["yss-implementation-contract-compiler"], tdd_mode: "controlled-generation", allowed_write_paths: ["."], expected_evidence: ["manifest"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"], controlled_generation: true },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
  };
}

async function writeJava(project, relative, source) {
  const target = path.join(project, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${source.trim()}\n`, "utf8");
}

async function prepareGoldenProject(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-golden-slice-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, "implementation");
  await mkdir(output);
  const decisionFile = path.join(root, "scaffold-architecture-decisions.yaml");
  let decisionText = `${JSON.stringify({ schema_version: 1, kind: "scaffold-architecture-decisions", template: false, status: "current", decisions: [{ decision_id: "scaffold-decision.golden-service", project_id: "golden-service", parent_project_id: null, status: "lifecycle-approved", recommended_architecture: "domain-driven", recommendation_reasons: ["golden first slice 需要领域边界"], confirmed_architecture: "domain-driven", override_reason: null, inheritance_mode: "root-default", inherited_from: null, platform_profile: "spring-boot-2.7-jdk8", architecture_profile: "target-domain-model", verification_database: "h2", production_database: "not-bound", requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"], resolution_version: 1, user_confirmation: { confirmed_by: "tester", channel: "test", confirmation_ref: "test://golden-confirmation", confirmed_at: "2026-09-05T00:00:00Z", normalized_text: "确认使用 DDD" }, decision_inputs_digest: `sha256:${"1".repeat(64)}` }] }, null, 2)}\n`;
  const decisionSet = JSON.parse(decisionText);
  decisionSet.decisions = decisionSet.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(root, "user-decision"), decision));
  decisionText = JSON.stringify(decisionSet, null, 2) + "\n";
  await writeFile(decisionFile, decisionText);
  const decisionDigest = `sha256:${createHash("sha256").update(decisionText).digest("hex")}`;
  const contractFile = path.join(root, "scaffold-contract.json");
  await writeFile(contractFile, `${JSON.stringify(scaffoldContract(output, decisionDigest), null, 2)}\n`);
  const args = ["--project-name", "golden-service", "--base-package", "com.yss.golden", "--output-dir", output, "--contract-id", "golden-scaffold-1", "--contract-version", "1", "--approval-ref", "approval-golden-1", "--compiler-draft-ref", "compiler-golden-1", "--persisted-ref", "persisted-golden-1", "--contract-file", contractFile, "--group-id", "com.yss.datamiddle", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.datamiddle", "--parent-artifact-id", "yss-datamiddle-parent", "--parent-version", "2.0.0-SNAPSHOT", "--yss-components-version", "2.0.0-SNAPSHOT"];
  const generated = await execute(process.execPath, [generator, ...args]);
  assert.equal(generated.code, 0, generated.stderr);
  const project = path.join(output, "golden-service");
  const manifestPath = path.join(project, ".yss", "scaffold-generation.json");
  const emptyVerificationPath = path.join(root, "empty-scaffold-verification.json");
  await writeFile(emptyVerificationPath, JSON.stringify({ status: "passed", completion_level: "empty-scaffold-verified", commands: ["./mvnw validate", "./mvnw test", "./mvnw package"] }));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.completion_level = "empty-scaffold-verified";
  manifest.empty_scaffold_verification_ref = emptyVerificationPath;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const java = "src/main/java/com/yss/golden";
  const testJava = "src/test/java/com/yss/golden";
  await writeJava(project, `golden-service-domain/${java}/domain/quality/model/QualityRule.java`, `package com.yss.golden.domain.quality.model;
public final class QualityRule { private final Long id; private final String name; public QualityRule(Long id, String name) { if (name == null || name.trim().isEmpty()) throw new IllegalArgumentException("quality-rule-name-required"); this.id=id; this.name=name; } public Long getId(){return id;} public String getName(){return name;} }`);
  await writeJava(project, `golden-service-domain/${java}/domain/quality/gateway/QualityRuleGateway.java`, `package com.yss.golden.domain.quality.gateway;
  import com.yss.golden.domain.quality.model.QualityRule; import java.util.Optional; public interface QualityRuleGateway { Optional<QualityRule> findById(Long id); void save(QualityRule rule); void delete(Long id); }`);
  await writeJava(project, `golden-service-domain/${testJava}/domain/quality/model/QualityRuleTest.java`, `package com.yss.golden.domain.quality.model;
import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.assertThrows; class QualityRuleTest { @Test void rejectsBlankName(){ assertThrows(IllegalArgumentException.class, () -> new QualityRule(1L, " ")); } }`);
  for (const [relative, source] of Object.entries({
    [`golden-service-application/${java}/application/command/QualityRuleCreateCommand.java`]: `package com.yss.golden.application.command; public class QualityRuleCreateCommand { private String ruleName; public String getRuleName(){return ruleName;} public void setRuleName(String value){this.ruleName=value;} }`,
    [`golden-service-application/${java}/application/command/QualityRuleUpdateCommand.java`]: `package com.yss.golden.application.command; public class QualityRuleUpdateCommand { private Long id; private String ruleName; public Long getId(){return id;} public void setId(Long value){this.id=value;} public String getRuleName(){return ruleName;} public void setRuleName(String value){this.ruleName=value;} }`,
    [`golden-service-application/${java}/application/query/QualityRulePageQuery.java`]: `package com.yss.golden.application.query; public class QualityRulePageQuery { private int pageIndex; private int pageSize; private String ruleName; public int getPageIndex(){return pageIndex;} public void setPageIndex(int value){this.pageIndex=value;} public int getPageSize(){return pageSize;} public void setPageSize(int value){this.pageSize=value;} public String getRuleName(){return ruleName;} public void setRuleName(String value){this.ruleName=value;} }`,
    [`golden-service-application/${java}/application/result/QualityRuleResult.java`]: `package com.yss.golden.application.result; import java.io.Serializable; public class QualityRuleResult implements Serializable { private Long id; private String ruleName; public Long getId(){return id;} public void setId(Long value){this.id=value;} public String getRuleName(){return ruleName;} public void setRuleName(String value){this.ruleName=value;} }`,
    [`golden-service-application/${java}/application/port/QualityRuleQueryPort.java`]: `package com.yss.golden.application.port; import com.yss.cloud.dto.result.PageResult; import com.yss.golden.application.query.QualityRulePageQuery; import com.yss.golden.application.result.QualityRuleResult; public interface QualityRuleQueryPort { PageResult<QualityRuleResult> page(QualityRulePageQuery query); }`,
    [`golden-service-application/${java}/application/service/QualityRuleService.java`]: `package com.yss.golden.application.service; import com.yss.cloud.dto.result.PageResult; import com.yss.golden.application.command.*; import com.yss.golden.application.query.QualityRulePageQuery; import com.yss.golden.application.result.QualityRuleResult; public interface QualityRuleService { PageResult<QualityRuleResult> page(QualityRulePageQuery query); QualityRuleResult detail(Long id); Long add(QualityRuleCreateCommand command); Boolean update(QualityRuleUpdateCommand command); Boolean delete(Long id); }`,
    [`golden-service-application/${java}/application/service/impl/QualityRuleServiceImpl.java`]: `package com.yss.golden.application.service.impl;
import com.yss.cloud.dto.result.PageResult; import com.yss.golden.application.command.*; import com.yss.golden.application.port.QualityRuleQueryPort; import com.yss.golden.application.query.QualityRulePageQuery; import com.yss.golden.application.result.QualityRuleResult; import com.yss.golden.application.service.QualityRuleService; import com.yss.golden.domain.quality.gateway.QualityRuleGateway; import com.yss.golden.domain.quality.model.QualityRule; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service public class QualityRuleServiceImpl implements QualityRuleService { private final QualityRuleGateway gateway; private final QualityRuleQueryPort queryPort; public QualityRuleServiceImpl(QualityRuleGateway gateway, QualityRuleQueryPort queryPort){this.gateway=gateway;this.queryPort=queryPort;} public PageResult<QualityRuleResult> page(QualityRulePageQuery query){return queryPort.page(query);} public QualityRuleResult detail(Long id){QualityRule rule=gateway.findById(id).orElseThrow(IllegalArgumentException::new); QualityRuleResult result=new QualityRuleResult(); result.setId(rule.getId()); result.setRuleName(rule.getName()); return result;} @Transactional public Long add(QualityRuleCreateCommand command){QualityRule rule=new QualityRule(null, command.getRuleName()); gateway.save(rule); return rule.getId();} @Transactional public Boolean update(QualityRuleUpdateCommand command){gateway.save(new QualityRule(command.getId(), command.getRuleName())); return true;} @Transactional public Boolean delete(Long id){gateway.delete(id); return true;} }`,
    [`golden-service-application/${java}/application/error/QualityRuleConflictException.java`]: `package com.yss.golden.application.error; public final class QualityRuleConflictException extends RuntimeException { public QualityRuleConflictException(String message) { super(message); } }`,
    [`golden-service-application/${java}/application/error/QualityRuleSystemException.java`]: `package com.yss.golden.application.error; public final class QualityRuleSystemException extends RuntimeException { public QualityRuleSystemException(String message, Throwable cause) { super(message, cause); } }`,
    [`golden-service-infrastructure/${java}/infrastructure/persistence/po/QualityRulePO.java`]: `package com.yss.golden.infrastructure.persistence.po; public class QualityRulePO { private Long id; private String name; public Long getId(){return id;} public void setId(Long value){this.id=value;} public String getName(){return name;} public void setName(String value){this.name=value;} }`,
    [`golden-service-infrastructure/${java}/infrastructure/persistence/convertor/QualityRulePersistenceConvertor.java`]: `package com.yss.golden.infrastructure.persistence.convertor; import com.yss.golden.domain.quality.model.QualityRule; import com.yss.golden.infrastructure.persistence.po.QualityRulePO; import org.mapstruct.Mapper; @Mapper(componentModel="spring") public interface QualityRulePersistenceConvertor { QualityRule toDomain(QualityRulePO source); QualityRulePO toPO(QualityRule source); }`,
    [`golden-service-infrastructure/${java}/infrastructure/persistence/repository/QualityRuleRepository.java`]: `package com.yss.golden.infrastructure.persistence.repository; import com.yss.golden.infrastructure.persistence.po.QualityRulePO; import java.util.List; import org.apache.ibatis.annotations.*; @Mapper public interface QualityRuleRepository { @Select("select id, rule_name as name from quality_rule where id = #{id}") QualityRulePO selectById(Long id); @Select("select id, rule_name as name from quality_rule") List<QualityRulePO> selectAll(); @Insert("insert into quality_rule(rule_name) values(#{name})") int insert(QualityRulePO po); @Delete("delete from quality_rule where id = #{id}") int deleteById(Long id); }`,
    [`golden-service-infrastructure/${java}/infrastructure/persistence/gateway/QualityRuleGatewayImpl.java`]: `package com.yss.golden.infrastructure.persistence.gateway; import com.yss.golden.domain.quality.gateway.QualityRuleGateway; import com.yss.golden.domain.quality.model.QualityRule; import com.yss.golden.infrastructure.persistence.convertor.QualityRulePersistenceConvertor; import com.yss.golden.infrastructure.persistence.repository.QualityRuleRepository; import java.util.Optional; import org.springframework.stereotype.Repository; @Repository public class QualityRuleGatewayImpl implements QualityRuleGateway { private final QualityRuleRepository repository; private final QualityRulePersistenceConvertor convertor; public QualityRuleGatewayImpl(QualityRuleRepository repository, QualityRulePersistenceConvertor convertor){this.repository=repository;this.convertor=convertor;} public Optional<QualityRule> findById(Long id){return Optional.ofNullable(repository.selectById(id)).map(convertor::toDomain);} public void save(QualityRule rule){repository.insert(convertor.toPO(rule));} public void delete(Long id){repository.deleteById(id);} }`,
    [`golden-service-infrastructure/${java}/infrastructure/query/adapter/QualityRuleQueryAdapter.java`]: `package com.yss.golden.infrastructure.query.adapter; import com.yss.cloud.dto.result.PageResult; import com.yss.golden.application.port.QualityRuleQueryPort; import com.yss.golden.application.query.QualityRulePageQuery; import com.yss.golden.application.result.QualityRuleResult; import java.util.Collections; import org.springframework.stereotype.Repository; @Repository public class QualityRuleQueryAdapter implements QualityRuleQueryPort { public PageResult<QualityRuleResult> page(QualityRulePageQuery query){return PageResult.of(Collections.emptyList(), 0L, query.getPageSize(), query.getPageIndex());} }`
  })) await writeJava(project, relative, source);
  await writeJava(project, `golden-service-application/${testJava}/application/service/QualityRuleServiceTest.java`, `package com.yss.golden.application.service; import com.yss.golden.application.command.QualityRuleCreateCommand; import com.yss.golden.application.port.QualityRuleQueryPort; import com.yss.golden.application.service.impl.QualityRuleServiceImpl; import com.yss.golden.domain.quality.gateway.QualityRuleGateway; import org.junit.jupiter.api.Test; import static org.mockito.Mockito.*; class QualityRuleServiceTest { @Test void createPersistsThroughDomainGateway(){QualityRuleGateway gateway=mock(QualityRuleGateway.class); QualityRuleCreateCommand command=new QualityRuleCreateCommand(); command.setRuleName("rule"); new QualityRuleServiceImpl(gateway, mock(QualityRuleQueryPort.class)).add(command); verify(gateway).save(any());} }`);
  await writeJava(project, `golden-service-infrastructure/${testJava}/infrastructure/persistence/QualityRuleGatewayIntegrationTest.java`, `package com.yss.golden.infrastructure.persistence; import com.yss.golden.infrastructure.persistence.convertor.QualityRulePersistenceConvertor; import com.yss.golden.infrastructure.persistence.po.QualityRulePO; import org.junit.jupiter.api.Test; import org.mapstruct.factory.Mappers; import static org.junit.jupiter.api.Assertions.assertEquals; class QualityRuleGatewayIntegrationTest { @Test void persistenceMappingRoundTrips(){QualityRulePO po=new QualityRulePO(); po.setId(1L); po.setName("rule"); assertEquals("rule", Mappers.getMapper(QualityRulePersistenceConvertor.class).toDomain(po).getName());} }`);
  const metadata = path.join(root, "metadata.json");
  const webContract = path.join(root, "web-contract.json");
  const dtoWireProfileDigest = createHash("sha256").update(await readFile(dtoWireProfileFile)).digest("hex");
  await writeFile(metadata, JSON.stringify({ tables: [{ table_name: "quality_rule", table_comment: "质量规则", columns: [{ name: "id", sql_type: "bigint", primary: true, nullable: false }, { name: "rule_name", sql_type: "varchar(64)", nullable: false }] }] }));
  const webProject = path.join(project, "golden-service-adapter", "golden-service-web");
  await writeFile(webContract, JSON.stringify({ architecture_identity: manifest.architecture_identity, schema_version: 2, contract_id: "golden-slice-1", contract_version: 1, current_version: 1, slice_id: "quality-rule-first-slice", status: "approved", integration_mode: "scaffold-v2", implementation_project_root: project, scaffold_manifest_ref: manifestPath, base_package: "com.yss.golden", module_name: "golden", domain_segment: "quality", application_service_package: "com.yss.golden.application.service", architecture_profile: "target-domain-model", platform_profile: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", dto_wire_profile_ref: dtoWireProfileFile, dto_wire_profile_digest: dtoWireProfileDigest, openapi_freeze_ref: "openapi://quality-rule@1", allowed_write_paths: [path.join(webProject, "src/main/java/com/yss/golden/rest")], expected_evidence_files: ["first-slice-verification.json"], verification_commands: ["./mvnw test", "./mvnw package"], fields: { quality_rule: { create: ["rule_name"], update: ["id", "rule_name"], query: ["rule_name"], pagination: ["pageIndex", "pageSize"], response: ["id", "rule_name"] } } }));
  await generateWeb(parseWebArgs(["--metadata-file", metadata, "--contract-file", webContract, "--dto-wire-profile-file", dtoWireProfileFile, "--scaffold-manifest-file", manifestPath, "--base-package", "com.yss.golden", "--module-name", "golden", "--domain-segment", "quality", "--web-project-dir", webProject, "--application-service-package", "com.yss.golden.application.service", "--validation-namespace", "javax"]), { log() {}, warn() {} });
  await writeJava(project, `golden-service-adapter/golden-service-web/${java}/rest/advice/TargetProfileExceptionAdvice.java`, `package com.yss.golden.rest.advice;
import com.yss.golden.application.error.QualityRuleConflictException;
import com.yss.golden.application.error.QualityRuleSystemException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public final class TargetProfileExceptionAdvice {
  @ExceptionHandler(QualityRuleConflictException.class)
  public ResponseEntity<ErrorResponse> handleConflict(QualityRuleConflictException ignored) { return response(HttpStatus.CONFLICT, "QUALITY_RULE_CONFLICT", "质量规则冲突", "请检查质量规则后重试"); }
  @ExceptionHandler(QualityRuleSystemException.class)
  public ResponseEntity<ErrorResponse> handleKnownSystem(QualityRuleSystemException ignored) { return response(HttpStatus.SERVICE_UNAVAILABLE, "QUALITY_RULE_SYSTEM", "服务暂不可用", "请稍后重试"); }
  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<ErrorResponse> handleUnknown(RuntimeException ignored) { return response(HttpStatus.INTERNAL_SERVER_ERROR, "SYS_ERROR", "后台服务异常，请联系技术管理员", "请联系技术管理员"); }
  private ResponseEntity<ErrorResponse> response(HttpStatus status, String errCode, String message, String tips) { return ResponseEntity.status(status).body(new ErrorResponse(errCode, message, tips)); }
  public static final class ErrorResponse {
    private final String errCode;
    private final String message;
    private final String tips;
    ErrorResponse(String errCode, String message, String tips) { this.errCode = errCode; this.message = message; this.tips = tips; }
    public String getErrCode() { return errCode; }
    public String getMessage() { return message; }
    public String getTips() { return tips; }
  }
}`);
  await writeJava(project, `golden-service-adapter/golden-service-web/${testJava}/rest/GoldenExceptionIntegrationTest.java`, `package com.yss.golden.rest;
import com.yss.cloud.exception.advice.GlobalExceptionAdvice;
import com.yss.golden.application.error.QualityRuleConflictException;
import com.yss.golden.application.error.QualityRuleSystemException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import com.yss.golden.rest.advice.TargetProfileExceptionAdvice;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(classes = GoldenExceptionIntegrationTest.TestApplication.class)
@AutoConfigureMockMvc
class GoldenExceptionIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ApplicationContext context;
  @Test void actualStarterAutoConfigurationIsLoaded() { assertThat(context.getBeansOfType(GlobalExceptionAdvice.class)).hasSize(1); }
  @Test void businessErrorUsesStablePublicResponse() throws Exception { mvc.perform(get("/exception-probe/business")).andExpect(status().isConflict()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)).andExpect(jsonPath("$.errCode").value("QUALITY_RULE_CONFLICT")).andExpect(jsonPath("$.message").value("质量规则冲突")); }
  @Test void knownSystemErrorIsSanitized() throws Exception { mvc.perform(get("/exception-probe/system")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.errCode").value("QUALITY_RULE_SYSTEM")).andExpect(jsonPath("$.message").value("服务暂不可用")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("database-password")))); }
  @Test void unknownErrorIsSanitizedAndHandledBeforeComponentFallback() throws Exception { mvc.perform(get("/exception-probe/unknown")).andExpect(status().isInternalServerError()).andExpect(jsonPath("$.errCode").value("SYS_ERROR")).andExpect(jsonPath("$.message").value("后台服务异常，请联系技术管理员")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("runtime-secret")))); }
  @SpringBootConfiguration @EnableAutoConfiguration @Import({ExceptionProbeController.class, TargetProfileExceptionAdvice.class}) static class TestApplication {}
  @RestController static class ExceptionProbeController {
    @GetMapping("/exception-probe/business") void business() { throw new QualityRuleConflictException("internal-business-detail"); }
    @GetMapping("/exception-probe/system") void system() { throw new QualityRuleSystemException("database-password", new IllegalStateException("internal-cause")); }
    @GetMapping("/exception-probe/unknown") void unknown() { throw new RuntimeException("runtime-secret"); }
  }
}`);
  const sliceContract = path.join(root, "slice-contract.json");
  const requiredSkills = ["yss-domain", "yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"];
  await writeFile(sliceContract, JSON.stringify({ architecture_identity: manifest.architecture_identity, schema_version: 2, contract_id: "golden-slice-1", contract_version: 1, slice_id: "quality-rule-first-slice", status: "approved", readiness: { blockers: [], stale_inputs: [] }, common: { required_skills: requiredSkills }, backend: { status: "required", affected_layers: ["domain", "application", "infrastructure", "web"], required_skills: requiredSkills }, work_units: [{ architecture_identity: manifest.architecture_identity, id: "slice-backend", contract_id: "golden-slice-1", contract_version: 1, work_unit: { primary_skill: "yss-domain" } }] }));
  return { root, project, sliceContract };
}

test("golden first slice 组合 Domain/Application/Infrastructure/Web 且不发生 DTO/PO 穿层", async (t) => {
  const { project } = await prepareGoldenProject(t);
  const domainPom = await readFile(path.join(project, "golden-service-domain", "pom.xml"), "utf8");
  const applicationPom = await readFile(path.join(project, "golden-service-application", "pom.xml"), "utf8");
  const webPom = await readFile(path.join(project, "golden-service-adapter", "golden-service-web", "pom.xml"), "utf8");
  const controller = await readFile(path.join(project, "golden-service-adapter", "golden-service-web", "src/main/java/com/yss/golden/rest/QualityRuleController.java"), "utf8");
  const convertor = await readFile(path.join(project, "golden-service-adapter", "golden-service-web", "src/main/java/com/yss/golden/rest/convertor/QualityRuleWebConvertor.java"), "utf8");
  const pageRequest = await readFile(path.join(project, "golden-service-adapter", "golden-service-web", "src/main/java/com/yss/golden/rest/dto/request/QualityRulePageRequest.java"), "utf8");
  const serviceImpl = await readFile(path.join(project, "golden-service-application", "src/main/java/com/yss/golden/application/service/impl/QualityRuleServiceImpl.java"), "utf8");
  const repository = await readFile(path.join(project, "golden-service-infrastructure", "src/main/java/com/yss/golden/infrastructure/persistence/repository/QualityRuleRepository.java"), "utf8");
  const gatewayImpl = await readFile(path.join(project, "golden-service-infrastructure", "src/main/java/com/yss/golden/infrastructure/persistence/gateway/QualityRuleGatewayImpl.java"), "utf8");
  const queryAdapter = await readFile(path.join(project, "golden-service-infrastructure", "src/main/java/com/yss/golden/infrastructure/query/adapter/QualityRuleQueryAdapter.java"), "utf8");
  assert.doesNotMatch(domainPom, /yss-component-dto|yss-component-exception|spring-web|swagger/);
  assert.match(applicationPom, /yss-component-dto/);
  assert.doesNotMatch(webPom, /golden-service-domain|golden-service-infrastructure/);
  assert.doesNotMatch(`${controller}\n${convertor}`, /\.domain\.|\.infrastructure\.|\.repository\.|Mappers\.getMapper|INSTANCE/);
  assert.match(convertor, /@Mapper\(componentModel = "spring"\)/);
  assert.doesNotMatch(pageRequest, /offset|needTotalCount|tempTotalCount|extends PageQuery/);
  assert.match(pageRequest, /pageIndex/);
  assert.match(pageRequest, /pageSize/);
  assert.doesNotMatch(pageRequest, /orderBy|orderDirection|groupBy/);
  assert.match(serviceImpl, /implements QualityRuleService/);
  assert.match(serviceImpl, /@Transactional/);
  assert.match(repository, /@Mapper/);
  assert.match(gatewayImpl, /implements QualityRuleGateway/);
  assert.match(queryAdapter, /implements QualityRuleQueryPort/);
});

test("golden first slice 通过真实 Wrapper 后才写入 first-slice-verified", { timeout: 300_000 }, async (t) => {
  if (!["YSS_MAVEN_REPOSITORY_URL", "MAVEN_REPO_USERNAME", "MAVEN_REPO_PASSWORD"].every((name) => process.env[name])) {
    t.skip("缺少受控 YSS Maven 仓库环境；不得声明 first-slice-verified");
    return;
  }
  const { project, sliceContract, root } = await prepareGoldenProject(t);
  await chmod(path.join(project, "mvnw"), 0o755);
  const result = await runFirstSliceVerification(project, path.join(root, "first-slice-evidence"), sliceContract, process.env);
  assert.equal(result.status, "passed", JSON.stringify(result, null, 2));
  assert.equal(JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8")).completion_level, "first-slice-verified");
});

test("真实 YSS exception starter 的自动配置、优先级、三类映射和序列化均受保护", { timeout: 300_000 }, async (t) => {
  if (!["YSS_MAVEN_REPOSITORY_URL", "MAVEN_REPO_USERNAME", "MAVEN_REPO_PASSWORD"].every((name) => process.env[name])) {
    t.skip("缺少受控 YSS Maven 仓库环境；不得声明 exception starter 真实集成已验证");
    return;
  }
  const { project } = await prepareGoldenProject(t);
  await chmod(path.join(project, "mvnw"), 0o755);
  const result = await execute(path.join(project, "mvnw"), ["-pl", "golden-service-adapter/golden-service-web", "-am", "test"], { cwd: project, timeout: 300_000 });
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
});
