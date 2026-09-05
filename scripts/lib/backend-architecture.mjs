import { createHash } from "node:crypto";
import { loadSkillRegistry } from "./skill-registry.mjs";

export function architectureDigest(value) {
  const stable = (item) => Array.isArray(item) ? item.map(stable) : item && typeof item === "object"
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, stable(item[key])])) : item;
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export function validateArchitectureIdentity(identity, registry = loadSkillRegistry()) {
  if (!identity || typeof identity !== "object") throw new TypeError("缺少 architecture_identity；请从工程基线重新编译");
  const profile = registry.architecture_profiles?.[identity.architecture_profile];
  if (!profile || identity.architecture_family !== profile.architecture_family || identity.generator_skill !== profile.generator_skill) {
    throw new TypeError("architecture_identity 的架构族、Profile 或生成器不匹配");
  }
  if (identity.verification_database !== "h2" || identity.production_database !== "not-bound") throw new TypeError("脚手架身份必须绑定 H2 验证和 production_database=not-bound");
  if (!Array.isArray(identity.requested_capabilities) || !Array.isArray(identity.resolved_modules)) throw new TypeError("architecture_identity 缺少模块闭包");
  if (new Set(identity.requested_capabilities).size !== identity.requested_capabilities.length) throw new TypeError("requested_capabilities 不允许重复");
  const modules = [...profile.core_modules];
  for (const capability of identity.requested_capabilities) {
    const additions = profile.capability_modules[capability];
    if (!additions) throw new TypeError(`Profile 不支持 capability: ${capability}`);
    for (const module of additions) if (!modules.includes(module)) modules.push(module);
  }
  if (new Set(identity.resolved_modules).size !== identity.resolved_modules.length ||
      modules.length !== identity.resolved_modules.length || modules.some((module) => !identity.resolved_modules.includes(module))) throw new TypeError("architecture_identity 模块闭包不匹配");
  if (typeof identity.contract_digest !== "string" || !/^(sha256:)?[a-f0-9]{64}$/.test(identity.contract_digest)) throw new TypeError("architecture_identity 缺少有效 contract_digest");
  return profile;
}

export function assertArchitectureAgreement(identity, evidence, registry) {
  validateArchitectureIdentity(identity, registry);
  for (const [name, source] of Object.entries(evidence ?? {})) {
    const actual = source?.architecture_identity ?? source;
    validateArchitectureIdentity(actual, registry);
    if (architectureDigest(identity) !== architectureDigest(actual)) throw new TypeError(`stale: ${name} architecture_identity 与合同不一致`);
  }
}

export function architectureReady(identity, registry = loadSkillRegistry()) {
  const profile = validateArchitectureIdentity(identity, registry);
  return profile.maturity === "supported";
}
