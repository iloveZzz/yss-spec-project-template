/** 首切片验证的 MVC 适配器；命令执行与报告由统一验证核心持有。 */
export function mvcFirstSliceProfile(identity) {
  const application = identity.architecture_profile === "mvc-data-analysis-v1" ? "core" : "service";
  const dto = identity.architecture_profile === "mvc-data-analysis-v1" ? "client" : "(?:server|client)";
  return {
    skills: ["yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"],
    layers: [application, "repository", "server"],
    artifacts: [
      ["application-input", new RegExp(`-${application}/src/main/java/.+/(?:command|query)/.+\\.java$`)],
      ["application-result", new RegExp(`-${application}/src/main/java/.+/result/.+\\.java$`)],
      ["application-service", new RegExp(`-${application}/src/main/java/.+/service/.+Service(?:Impl)?\\.java$`)],
      ["application-test", new RegExp(`-${application}/src/test/java/.+Tests?\\.java$`)],
      ["repository-po", /-repository\/src\/main\/java\/.+\/po\/.+PO\.java$/],
      ["repository", /-repository\/src\/main\/java\/.+Repository\.java$/],
      ["repository-test", /-repository\/src\/test\/java\/.+Tests?\.java$/],
      ["controller", /-server\/src\/main\/java\/.+Controller\.java$/],
      ["web-convertor", /-server\/src\/main\/java\/.+WebConvertor\.java$/],
      ["request", new RegExp(`-${dto}/src/main/java/.+/dto/request/.+Request\\.java$`)],
      ["response", new RegExp(`-${dto}/src/main/java/.+/dto/response/.+Response\\.java$`)],
      ["api-test", /-server\/src\/test\/java\/.+Tests?\.java$/]
    ]
  };
}
