/** 新后端骨架仅提供显式本地验证配置；不绑定生产数据库。 */
export const VERIFICATION_DATABASE = "h2";
export const PRODUCTION_DATABASE = "not-bound";

export function assertLocalDatabaseProfile(profiles) {
  if (profiles?.verification_database !== VERIFICATION_DATABASE || profiles?.production_database !== PRODUCTION_DATABASE || Object.hasOwn(profiles ?? {}, "database")) {
    throw new Error("新脚手架必须声明 verification_database=h2、production_database=not-bound；旧 database Profile 必须重新批准，不作静默迁移");
  }
}

export function localDatabaseConfiguration(name) {
  return `# 仅通过 scaffold-local 显式启用；不用于生产。\nspring:\n  datasource:\n    url: jdbc:h2:mem:${name.replaceAll("-", "_")};DB_CLOSE_DELAY=-1\n    username: sa\n    password: \"\"\n    driver-class-name: org.h2.Driver\n  sql:\n    init:\n      mode: never\n  cloud:\n    discovery:\n      enabled: false\n    service-registry:\n      auto-registration:\n        enabled: false\n    nacos:\n      discovery:\n        enabled: false\n      config:\n        enabled: false\n  cache:\n    type: none\n`;
}

export function scaffoldArchitectureIdentity(contract, contractDigest) {
  return {
    architecture_family: contract.architecture_family,
    architecture_profile: contract.architecture_profile,
    generator_skill: contract.generator_skill,
    requested_capabilities: contract.module_profile.requested_capabilities,
    resolved_modules: contract.module_profile.resolved_modules,
    contract_digest: contractDigest,
    verification_database: VERIFICATION_DATABASE,
    production_database: PRODUCTION_DATABASE
  };
}
