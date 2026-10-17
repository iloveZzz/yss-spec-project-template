import { makeRoot } from '../helpers/yss-instance.mjs';
import { validateDefaultDigitalHumanRoles, validateDigitalHumanRoles, loadDigitalHumanRoles, skillIdsFromRegistry } from "../../scripts/lib/digital-human-roles.mjs";
import { loadRegistry } from "../../scripts/lib/lifecycle-registry.mjs";
import { loadSkillRegistry } from "../../scripts/lib/skill-registry.mjs";
import { validateApprovalRecord, validateApprovalRecordFile } from "../../scripts/lib/native-approval.mjs";

function clone() {
  return structuredClone(loadDigitalHumanRoles());
}

function deps() {
  const lifecycle = loadRegistry();
  const skills = loadSkillRegistry();
  const ids = (records) => new Set(records.map((record) => record.id));
  return {
    skillIds: skillIdsFromRegistry(skills),
    stageIds: ids(lifecycle.stages),
    gateIds: ids(lifecycle.gates),
    artifactIds: ids(lifecycle.artifacts),
    evidenceIds: ids(lifecycle.evidence),
    workUnitIds: ids(lifecycle.work_units),
    skillRegistry: skills
  };
}

function mustFail(doc, pattern, label) {
  let failed = false;
  let message = "";
  try {
    validateDigitalHumanRoles(doc, deps());
  } catch (error) {
    failed = true;
    message = error.message;
  }
  if (!failed) throw new TypeError(`错误配置未被拒绝: ${label}`);
  if (!pattern.test(message)) throw new TypeError(`${label} 失败原因不符合预期: ${message}`);
}

validateDefaultDigitalHumanRoles();

const tester = loadDigitalHumanRoles().roles.find((role) => role.id === "role.test-engineer");
for (const skill of ["code-review", "alibaba-java-code-style", "yss-ui", "yss-ui-business-page-generation", "yss-domain", "yss-application", "yss-web-controller", "yss-dto", "mapstruct", "lombok"]) {
  if (!tester.core_skills.includes(skill)) throw new TypeError(`role.test-engineer 缺少只读专项检查 skill: ${skill}`);
}
if (tester.forbidden_skills.includes("yss-ui") || tester.forbidden_skills.includes("alibaba-java-code-style")) {
  throw new TypeError("测试工程师不得禁止审查所需的 YSS / Alibaba skill");
}
const backend = loadDigitalHumanRoles().roles.find((role) => role.id === "role.backend-engineer");
if (!backend.core_skills.includes("alibaba-java-code-style") || !backend.core_skills.includes("mapstruct") || !backend.core_skills.includes("lombok")) {
  throw new TypeError("role.backend-engineer 缺少 Alibaba / MapStruct / Lombok");
}

const seven = [
  "role.lifecycle-orchestrator",
  "role.requirements-manager",
  "role.product-manager",
  "role.project-manager",
  "role.frontend-engineer",
  "role.backend-engineer",
  "role.test-engineer"
];

const legacyGroups = clone();
legacyGroups.stage_groups = [{ id: "group.plan", members: seven }];
validateDigitalHumanRoles(legacyGroups, deps());

const coupled = clone();
coupled.roles[0].grok_title = "legacy";
mustFail(coupled, /平台耦合字段/, "角色上残留 grok_title");

const unknownSkill = clone();
unknownSkill.roles[0].core_skills = ["not-a-registered-skill"];
mustFail(unknownSkill, /未登记技能/, "未知技能");

const overlap = clone();
overlap.roles.find((role) => role.id === "role.frontend-engineer").forbidden_skills.push("yss-ui");
mustFail(overlap, /重叠/, "启用且禁止同一技能");

const selfSign = clone();
selfSign.gate_policy.dual_digital_human[0].countersigners = ["role.requirements-manager"];
mustFail(selfSign, /起草者不得会签自己/, "起草者自签");

const releaseByBot = clone();
releaseByBot.gate_policy.runtime_side_effect_approval = "digital-human";
mustFail(releaseByBot, /runtime_side_effect_approval/, "验收不能替代生物人发布授权");

const missingSigners = clone();
missingSigners.gate_policy.digital_human_review[0].countersigners = [];
mustFail(missingSigners, /countersigners/, "单审门禁缺 countersigners");

const stringReview = clone();
stringReview.gate_policy.digital_human_review = ["check.prototype-reviewed"];
mustFail(stringReview, /必须是含 gate/, "单审门禁仍用字符串名单");

const missingGeneric = clone();
missingGeneric.runtimes = missingGeneric.runtimes.filter((runtime) => runtime.id !== "runtime.generic");
mustFail(missingGeneric, /缺少运行时绑定: runtime.generic/, "缺少通用运行时");

const root = makeRoot("yss-digital-human-roles-");
validateApprovalRecordFile(".template-spec/templates/approval-record-template.yaml", {root, history:true});

const rolesDoc = loadDigitalHumanRoles();
try {
  validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.spec-baseline-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.requirements-manager",
    runtime_id: "runtime.generic",
    principal_ref: "instance:wrong"
  }, { root, rolesDoc });
  throw new TypeError("错误配置未被拒绝: 错误角色会签");
} catch (error) {
  if (!/APPROVAL_CURRENT_INVALID: 会签角色未获当前门禁政策授权/.test(error.message)) throw new TypeError(`错误角色会签 失败原因不符合预期: ${error.message}`);
}

try {
  validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.spec-baseline-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.requirements-manager",
    runtime_id: "runtime.generic",
    principal_ref: "instance:req",
    drafter_role_id: "role.requirements-manager"
  }, { root, rolesDoc });
  throw new TypeError("错误配置未被拒绝: 起草者自签会签记录");
} catch (error) {
  if (!/APPROVAL_CURRENT_INVALID: 会签角色未获当前门禁政策授权/.test(error.message)) {
    throw new TypeError(`起草者自签会签记录 失败原因不符合预期: ${error.message}`);
  }
}

try {
  validateApprovalRecord({
    schema_version: 1,
    gate_id: "gate.delivery-accepted",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: "role.product-manager",
    runtime_id: "runtime.generic",
    principal_ref: "instance:pm"
  }, { root, rolesDoc });
  throw new TypeError("错误配置未被拒绝: 非测试角色关闭交付验收");
} catch (error) {
  if (!/APPROVAL_CURRENT_INVALID: 会签角色未获当前门禁政策授权/.test(error.message)) throw new TypeError(`非测试角色关闭交付验收 失败原因不符合预期: ${error.message}`);
}

process.stdout.write("数字人角色压力场景验证通过\n");
