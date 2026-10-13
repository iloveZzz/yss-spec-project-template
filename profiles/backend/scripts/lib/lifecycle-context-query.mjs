import { createLifecycleContextQuery } from "./lifecycle-context-query-core.mjs";

export const { queryLifecycleContext, inspectWorkUnitSkills } = createLifecycleContextQuery({
  queryProfile: "specialist",
  orchestrationContractRef: ".agents/skills/harness-orchestrator/references/orchestration-contract.yaml",
});
