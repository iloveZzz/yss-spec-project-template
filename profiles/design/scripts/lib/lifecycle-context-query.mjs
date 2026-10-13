import { createLifecycleContextQuery } from "./lifecycle-context-query-core.mjs";

export const { queryLifecycleContext, inspectWorkUnitSkills } = createLifecycleContextQuery({
  queryProfile: "specialist",
  orchestrationContractRef: ".agents/skills/yss-strategic-design/references/orchestration-contract.yaml",
});
