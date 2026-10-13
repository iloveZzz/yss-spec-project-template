import { createLifecycleContextQuery } from "./lifecycle-context-query-core.mjs";

export const { queryLifecycleContext, inspectWorkUnitSkills } = createLifecycleContextQuery({
  queryProfile: "lifecycle",
  orchestrationContractRef: ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml",
});
