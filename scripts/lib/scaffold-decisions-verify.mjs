// 脚手架架构选择记录的进程内校验（AR-12 起校验语义归 yss：contract verify --kind scaffold-decisions）。
// 保留为回放对照实现，与 AR-09～AR-12 其他对照实现一起随 AR-12b 删除。
import { platformProfile } from "./backend-platform.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateJsonSchema } from "./json-schema.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { assertScaffoldUserDecision } from "./user-decision.mjs";
import { validateArchitectureIdentity } from "./backend-architecture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaPath = path.join(repoRoot, ".template-spec/process/schemas/scaffold-architecture-decisions.schema.json");
const MVC_ORDER = ["server", "service", "repository", "adapter", "client", "feign-client"];
const DDD_MODULES = ["domain", "application", "infrastructure", "adapter", "bootstrap"];
const CAPABILITIES = { "external-integration": ["adapter"], "published-client": ["client"], "feign-client": ["client", "feign-client"] };

function mvcModules(capabilities) {
  const result = new Set(["server", "service", "repository"]);
  for (const capability of capabilities) for (const module of CAPABILITIES[capability] ?? []) result.add(module);
  return MVC_ORDER.filter((module) => result.has(module));
}

export function verifyScaffoldArchitectureDecisions(file, { allowTemplate = false } = {}) {
  const document = parseDocument(readFileSync(path.resolve(file), "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  const value = document.toJS({ maxAliasCount: 0 });
  validateJsonSchema(value, schemaPath, { cwd: repoRoot, label: "scaffold architecture decision schema" });
  if (!allowTemplate && value.template !== false) throw new TypeError("正式决策记录必须设置 template: false");
  const ids = new Set();
  const projects = new Map();
  for (const decision of value.decisions) {
    if (ids.has(decision.decision_id) || projects.has(decision.project_id)) throw new TypeError("decision_id 与 project_id 必须唯一");
    ids.add(decision.decision_id);
    projects.set(decision.project_id, decision);
    if (decision.platform_configuration) {
      const profile = platformProfile(decision.platform_profile, undefined, decision.platform_configuration.spring_boot_version);
      if (decision.platform_configuration.profile_id !== profile.id || decision.platform_configuration.spring_boot_version !== profile.spring_boot_version || decision.platform_configuration.java_version !== profile.java_version) throw new TypeError("platform_configuration 与平台选择不一致");
    } else if (decision.platform_profile !== "spring-boot-2.7-jdk8") throw new TypeError("新平台缺少 platform_configuration");
    const confirmed = ["user-confirmed", "lifecycle-approved", "consumed"].includes(decision.status);
    const confirmation = decision.user_confirmation;
    if (confirmed && (!decision.confirmed_architecture || Object.values(confirmation).some((item) => item === null || item === ""))) throw new TypeError(`${decision.project_id} 已确认状态必须提供完整用户确认引用`);
    if (!confirmed && decision.status !== "stale" && decision.confirmed_architecture !== null) throw new TypeError(`${decision.project_id} 未确认状态不得预填 confirmed_architecture`);
    if (decision.confirmed_architecture && decision.confirmed_architecture !== decision.recommended_architecture && !decision.override_reason) throw new TypeError(`${decision.project_id} 覆盖 Agent 推荐时必须说明 override_reason`);
    if (decision.inheritance_mode === "root-default" && (decision.parent_project_id !== null || decision.inherited_from !== null)) throw new TypeError(`${decision.project_id} 根默认不得声明父项目`);
    if (["inherit", "override"].includes(decision.inheritance_mode) && (!decision.parent_project_id || decision.inherited_from !== decision.parent_project_id)) throw new TypeError(`${decision.project_id} 子项目继承引用不完整`);
    if (confirmed && value.template === false) {
      assertScaffoldUserDecision(decision);
    }
    const registry = loadSkillRegistry();
    validateArchitectureIdentity({ ...decision, architecture_family: decision.confirmed_architecture ?? decision.recommended_architecture, generator_skill: registry.architecture_profiles?.[decision.architecture_profile]?.generator_skill, contract_digest: decision.decision_inputs_digest }, registry);
  }
  for (const decision of value.decisions) {
    if (!decision.parent_project_id) continue;
    const parent = projects.get(decision.parent_project_id);
    if (!parent) throw new TypeError(`${decision.project_id} 引用了不存在的父项目`);
    if (decision.inheritance_mode === "inherit" && decision.confirmed_architecture && parent.confirmed_architecture && decision.confirmed_architecture !== parent.confirmed_architecture) throw new TypeError(`${decision.project_id} 继承值与父项目不一致；需要改为 override`);
  }
}
