import { createLifecycleContextQuery } from "./lifecycle-context-query-core.mjs";

export const { queryLifecycleContext, inspectWorkUnitSkills } = createLifecycleContextQuery({
  queryProfile: "lifecycle",
  orchestrationContractRef: ".template-spec/process/orchestration-contract.yaml",
});
