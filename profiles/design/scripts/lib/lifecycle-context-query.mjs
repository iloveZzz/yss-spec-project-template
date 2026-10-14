import { createLifecycleContextQuery } from "./lifecycle-context-query-core.mjs";

export const { queryLifecycleContext, inspectWorkUnitSkills } = createLifecycleContextQuery({
  queryProfile: "specialist",
  orchestrationContractRef: ".template-spec/process/orchestration-contract.yaml",
});
