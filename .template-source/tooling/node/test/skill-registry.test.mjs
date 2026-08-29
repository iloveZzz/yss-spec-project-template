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
      }
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
      page_orchestration_skill: "yss-page-module-development",
      conditional_skills: { api_impact: ["missing-api-skill"] },
      not_applicable_reasons: { api_impact: "no_api_impact" }
    }
  };
  assert.throws(() => validateSkillRegistry(data, {
    lifecycleContract: { work_unit_routes: { "work-unit.slice-implementation": route } }
  }), /前端条件路由引用了未登记技能/);
});
