/** MVC 与 DDD 共用的生成入口选择；显式合同参数不得回退为独立生成。 */
const CONTRACT_OPTIONS = ["contractFile", "contractId", "contractVersion", "approvalRef", "compilerDraftRef", "persistedRef"];

export function isStandaloneGeneration(options) {
  const hasContract = CONTRACT_OPTIONS.some(key => options[key] !== undefined);
  if (options.standalone && hasContract) throw new Error("--standalone 不得携带合同或批准参数；已有合同须走正式治理路径");
  return !hasContract;
}
