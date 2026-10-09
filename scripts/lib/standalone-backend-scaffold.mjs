/** 独立工程输入和清单；不创建生命周期合同或批准。 */
import { loadBackendPlatforms, platformProfile, platformDigest } from "./backend-platform.mjs";

export const STANDALONE_MODE = "standalone-generation";
const COMMANDS = ["./mvnw validate", "./mvnw test", "./mvnw package"];
const CONTRACT_OPTIONS = ["contractFile", "contractId", "contractVersion", "approvalRef", "compilerDraftRef", "persistedRef"];
const MODULES = { "domain-driven": ["domain", "application", "infrastructure", "adapter", "bootstrap"], "layered-mvc": ["server", "service", "repository"] };

export function standaloneConfiguration(options, architectureFamily) {
  if (!/^[a-z][a-z0-9-]*$/.test(options.projectName ?? "") || !/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/.test(options.basePackage ?? "")) throw new Error("独立生成必须提供合法项目名和 Java 包名");
  if (CONTRACT_OPTIONS.some(key => options[key] !== undefined)) throw new Error("--standalone 不得携带合同或批准参数；已有合同须走正式治理路径");
  const required = ["platformProfile", "springBootVersion", "javaVersion", "groupId", "projectVersion", "parentGroupId", "parentArtifactId", "parentVersion", "yssComponentsVersion"];
  const missing = required.filter(key => !options[key]);
  if (missing.length) throw new Error(`独立生成缺少明确输入: ${missing.join(", ")}`);
  const profile = platformProfile(options.platformProfile, loadBackendPlatforms(), options.springBootVersion);
  if (!/^\d+$/.test(String(options.javaVersion)) || Number(options.javaVersion) !== profile.java_version) throw new Error("独立生成要求精确且匹配模板配方的 Spring Boot / Java 平台");
  const coordinates = { group_id: options.groupId, project_version: options.projectVersion, parent: { group_id: options.parentGroupId, artifact_id: options.parentArtifactId, version: options.parentVersion }, yss_components_version: options.yssComponentsVersion };
  if ([coordinates.group_id, coordinates.project_version, ...Object.values(coordinates.parent), coordinates.yss_components_version].some(value => !/^[A-Za-z0-9_.-]+$/.test(value))) throw new Error("Maven 坐标只能包含字母、数字、点、下划线和连字符");
  if ([coordinates.project_version, coordinates.parent.version, coordinates.yss_components_version].some(value => !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9][A-Za-z0-9.-]*)?$/.test(value))) throw new Error("独立生成必须提供精确 Maven 版本，不能使用 x、latest 或版本范围");
  if (!MODULES[architectureFamily]) throw new Error("不支持的独立骨架架构");
  const configuration = {
    project_name: options.projectName, base_package: options.basePackage,
    architecture_family: architectureFamily, architecture_profile: architectureFamily === "domain-driven" ? "target-domain-model" : "layered-mvc-service",
    generator_skill: architectureFamily === "domain-driven" ? "yss-ddd-scaffold-generator" : "yss-layered-mvc-scaffold-generator",
    maven_coordinates: coordinates,
    profiles: { architecture: architectureFamily === "domain-driven" ? "target-domain-model" : "layered-mvc", persistence: "mybatis-plus", verification_database: "h2", production_database: "not-bound", repository: "yss-internal", ...(architectureFamily === "domain-driven" ? { dto_placement: "web" } : {}), platform: profile.id, validation_namespace: profile.validation_namespace },
    module_profile: { resolution_version: 1, requested_capabilities: [], resolved_modules: MODULES[architectureFamily] },
    platform_configuration: { schema_version: 1, kind: "standalone-platform-configuration", profile_id: profile.id, spring_boot_version: profile.spring_boot_version, java_version: profile.java_version, parent: coordinates.parent, bom: { group_id: "com.yss.cloud", artifact_id: "yss-components-bom", version: coordinates.yss_components_version }, recipe_digest: platformDigest({ profile, coordinates }) },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
  };
  return { configuration, platform: profile };
}

export function standaloneManifest(configuration, generated) {
  return {
    ...configuration, ...generated, schema_version: 1, kind: "standalone-backend-scaffold",
    generation_mode: STANDALONE_MODE, completion_level: "generated", platform_verification: "unverified",
    maven_coordinates_source: "user-supplied", generation_input: configuration, input_digest: platformDigest(configuration),
    verification_commands: COMMANDS, verification: { status: "not-executed", commands: [] },
    readiness: { lifecycle_approved: false, ready_for_agent: false }, generated_at: new Date().toISOString()
  };
}

export function assertStandaloneManifest(manifest) {
  if (manifest.schema_version !== 1 || manifest.kind !== "standalone-backend-scaffold" || manifest.generation_mode !== STANDALONE_MODE) throw new Error("独立骨架清单类型或模式无效");
  const forbidden = ["contract_id", "contract_version", "approval_ref", "approver", "lifecycle_approval_ref", "compiler_draft_ref", "persisted_ref", "contract_file_ref", "current_version", "design_prerequisites"];
  if (forbidden.some(key => Object.hasOwn(manifest, key)) || manifest.readiness?.lifecycle_approved !== false || manifest.readiness?.ready_for_agent !== false || manifest.platform_verification !== "unverified") throw new Error("独立骨架不得声明合同批准、已验证兼容平台或业务实现资格");
  const input = manifest.generation_input;
  if (!input || platformDigest(input) !== manifest.input_digest || Object.keys(input).some(key => platformDigest(manifest[key]) !== platformDigest(input[key]))) throw new Error("独立骨架输入摘要或清单字段漂移");
  const c = input.maven_coordinates, p = input.platform_configuration;
  if (!c || !p) throw new Error("独立骨架缺少平台或 Maven 输入");
  const { configuration, platform } = standaloneConfiguration({ projectName: input.project_name, basePackage: input.base_package, platformProfile: p.profile_id, springBootVersion: p.spring_boot_version, javaVersion: String(p.java_version), groupId: c.group_id, projectVersion: c.project_version, parentGroupId: c.parent?.group_id, parentArtifactId: c.parent?.artifact_id, parentVersion: c.parent?.version, yssComponentsVersion: c.yss_components_version }, input.architecture_family);
  if (platformDigest(configuration) !== platformDigest(input) || !["generated", "standalone-scaffold-verified"].includes(manifest.completion_level) || JSON.stringify(manifest.verification_commands) !== JSON.stringify(COMMANDS) || !Array.isArray(manifest.ownership?.generated_files)) throw new Error("独立骨架平台配方、模块、完成等级或所有权清单无效");
  return platform;
}
