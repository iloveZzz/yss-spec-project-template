import assert from "node:assert/strict";
import test from "node:test";

import { loadSkillRegistry, validateSkillRegistry } from "../../../../scripts/lib/skill-registry.mjs";

function registry(overrides = {}) {
  const base = loadSkillRegistry();
  return { ...base, ...overrides, runtime_policy: { ...base.runtime_policy, ...overrides.runtime_policy } };
}

test("unknown layer is rejected", () => {
  const data = registry();
  data.skills = data.skills.map((skill) => skill.id === "tdd" ? { ...skill, layer: "misc" } : skill);
  assert.throws(() => validateSkillRegistry(data), /未知 layer/);
});

test("shadow registry cannot be marked as runtime consumed", () => {
  const data = registry({ status: "shadow", runtime_policy: { consumed_by_router: true, consumed_by_lifecycle: false, discovery_enforced: false } });
  assert.throws(() => validateSkillRegistry(data), /shadow 注册表不得被 Router/);
});

test("alias that collides with another id is rejected", () => {
  const data = registry();
  data.skills = data.skills.map((skill) => skill.id === "yss-api-integration" ? { ...skill, aliases: ["tdd"] } : skill);
  assert.throws(() => validateSkillRegistry(data), /alias 冲突/);
});

test("missing Cursor runtime root is rejected", () => {
  const data = registry();
  const { cursor, ...rest } = data.agent_runtime_roots;
  data.agent_runtime_roots = rest;
  assert.throws(() => validateSkillRegistry(data), /agent_runtime_roots.cursor/);
});

test("skill invocation contract is required and derives impact triggers", () => {
  const missing = registry();
  delete missing.invocation_contract;
  assert.throws(() => validateSkillRegistry(missing), /invocation_contract/);

  const invalid = registry();
  invalid.invocation_contract = {
    ...invalid.invocation_contract,
    default: { ...invalid.invocation_contract.default, trigger_conditions: ["registered-skill-request"] },
    layer_defaults: Object.fromEntries(Object.entries(invalid.invocation_contract.layer_defaults).map(([layer, value]) => [layer, { ...value }]))
  };
  invalid.invocation_contract.layer_defaults.core = { ...invalid.invocation_contract.layer_defaults.core, primary_output: "" };
  assert.throws(() => validateSkillRegistry(invalid), /primary_output/);
});

test("platform aliases resolve lifecycle external runtime entries", () => {
  const data = registry();
  const route = {
    primary_skill: "product-design:index",
    supporting_skills: [],
    skills: ["product-design:index"],
    applies_when: "product_design_impact",
    not_applicable_reason: "no_ui_or_product_design_impact"
  };
  assert.doesNotThrow(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.external-design": route } }
  }));
});

test("deprecated research alias resolves to yss-research in lifecycle routes", () => {
  const data = registry();
  const research = data.skills.find((skill) => skill.id === "yss-research");
  assert.ok(research?.aliases?.includes("research"));
  assert.doesNotThrow(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.alias-research": {
      primary_skill: "research",
      supporting_skills: [],
      skills: ["research"],
      applies_when: "external_fact_requires_validation",
      not_applicable_reason: "no_external_fact"
    } } }
  }));
});

test("lifecycle route with an unregistered skill is rejected", () => {
  const data = registry();
  const route = {
    primary_skill: "missing-skill",
    supporting_skills: [],
    skills: ["missing-skill"],
    applies_when: "always",
    not_applicable_reason: "never"
  };
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.invalid": route } }
  }), /生命周期路由引用了未登记技能/);
});

test("prototype design route requires independent prototype-review", () => {
  const data = registry();
  const route = {
    primary_skill: "yss-prototype-stage",
    supporting_skills: ["yss-design-system"],
    skills: ["yss-design-system", "yss-prototype-stage"],
    applies_when: "product_design_impact",
    not_applicable_reason: "no_ui_or_product_design_impact"
  };
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.prototype-design": route } }
  }), /prototype-review/);
});

test("deprecated skills require migration and cleanup metadata", () => {
  const data = registry();
  data.skills = data.skills.map((skill) => skill.id === "yss-api-integration"
    ? { ...skill, maturity: "deprecated", replaced_by: "yss-page-module-development" }
    : skill);
  assert.throws(() => validateSkillRegistry(data), /migration_deadline/);
});

function findingDisposition(overrides = {}) {
  return {
    same_loop_for: ["product-slice", "template-maintenance"],
    intensity: {
      "product-slice": "slice-contract",
      "template-maintenance": "L1-L2-L3"
    },
    reviewer_write_implementation: "forbidden",
    repair_then_full_rereview: {
      kinds: ["violation", "machine_check_failure", "blank_applicable_row", "missing_evidence"],
      actor: "implementer",
      on_original_contract: true,
      then: "recapture_candidate_and_rerun_all_axes"
    },
    stale_and_reroute: {
      kinds: ["drift", "new_impacts", "required_skills_mismatch"],
      mark_contract: "stale",
      continue_coding_on_old_contract: "forbidden",
      next: "router-or-earlier-lifecycle"
    },
    exemption_policy: {
      not_applicable: "impact_not_triggered_only",
      mandatory_waiver: "forbidden",
      allowed_exits: ["repair", "seam-deferred-complete"],
      new_human_waiver_gate: "forbidden",
      existing_human_gates_unchanged: true
    },
    ...overrides
  };
}

function codeReviewRoute(overrides = {}) {
  return {
    primary_skill: "code-review",
    supporting_skills: ["alibaba-java-code-style", "yss-ui", "yss-design-system", "yss-page-module-development", "yss-domain", "yss-application", "yss-repository", "yss-web-controller", "yss-dto", "mapstruct", "lombok"],
    skills: ["code-review", "alibaba-java-code-style", "yss-ui", "yss-design-system", "yss-page-module-development", "yss-domain", "yss-application", "yss-repository", "yss-web-controller", "yss-dto", "mapstruct", "lombok"],
    applies_when: "implementation_candidate_exists",
    not_applicable_reason: "no_implementation_candidate",
    review_standards_route: {
      unique_default_skill: "code-review",
      second_generic_review_skill: "forbidden",
      report_template: "docs/templates/review-report-template.md",
      contract_required_skills: "required",
      write_implementation: "forbidden",
      machine_checks: {
        run_if_present: true,
        missing_tooling: "not-applicable-with-reason",
        checkable_rule_without_machine: "not-a-pass"
      },
      conditional_skills: {
        backend_impact: ["alibaba-java-code-style", "yss-domain", "yss-application", "yss-repository", "yss-web-controller", "yss-dto", "mapstruct", "lombok"],
        ui_impact: ["yss-ui", "yss-design-system", "yss-page-module-development"]
      },
      not_applicable_reasons: {
        backend_impact: "no_backend_impact",
        ui_impact: "no_ui_impact"
      },
      finding_disposition: findingDisposition()
    },
    ...overrides
  };
}

test("code-review route without specialist supporting skills is rejected", () => {
  const data = registry();
  const route = codeReviewRoute({ supporting_skills: [], skills: ["code-review"] });
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /专项检查输入/);
});

test("code-review route without review_standards_route is rejected", () => {
  const data = registry();
  const route = codeReviewRoute();
  delete route.review_standards_route;
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /缺少 review_standards_route/);
});

test("code-review route cannot replace the unique default review skill", () => {
  const data = registry();
  const route = codeReviewRoute({ primary_skill: "yss-ui" });
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /唯一默认审查技能/);
});

test("code-review route accepts specialist check inputs on the unique skill", () => {
  const data = registry();
  assert.doesNotThrow(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": codeReviewRoute() } }
  }));
});

test("code-review route without finding_disposition is rejected", () => {
  const data = registry();
  const route = codeReviewRoute();
  delete route.review_standards_route.finding_disposition;
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /finding_disposition/);
});

test("code-review route cannot let the reviewer write implementation", () => {
  const data = registry();
  const route = codeReviewRoute();
  route.review_standards_route.finding_disposition = findingDisposition({
    reviewer_write_implementation: "allowed"
  });
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /审查者不得写实现/);
});

test("code-review route forbids mandatory waiver of triggered gates", () => {
  const data = registry();
  const route = codeReviewRoute();
  route.review_standards_route.finding_disposition = findingDisposition({
    exemption_policy: {
      not_applicable: "impact_not_triggered_only",
      mandatory_waiver: "allowed",
      allowed_exits: ["repair", "seam-deferred-complete"],
      new_human_waiver_gate: "forbidden",
      existing_human_gates_unchanged: true
    }
  });
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.code-review": route } }
  }), /mandatory 门禁不得豁免/);
});

test("review_input without finding disposition completion flags is rejected", () => {
  const data = registry();
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: {
      work_unit_routes: { "work-unit.code-review": codeReviewRoute() },
      review_input: { unique_default_skill: "code-review" }
    }
  }), /finding_disposition_required/);
});

test("frontend conditional routes require registered skills", () => {
  const data = registry();
  const route = {
    primary_skill: "yss-ui",
    supporting_skills: [],
    skills: ["yss-ui"],
    applies_when: "ready_for_agent",
    not_applicable_reason: "not_ready",
    frontend_route: {
      primary_skill: "yss-ui",
      page_generation_skill: "yss-ui-business-page-generation",
      page_orchestration_skill: "yss-page-module-development",
      conditional_skills: { api_impact: ["missing-api-skill"] },
      not_applicable_reasons: { api_impact: "no_api_impact" }
    }
  };
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.slice-implementation": route } }
  }), /前端条件路由引用了未登记技能/);
});
