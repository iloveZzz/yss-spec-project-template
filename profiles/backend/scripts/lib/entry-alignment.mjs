import { readFileSync } from "node:fs";
import path from "node:path";
import { loadHarnessProfile, INSTANTIATION } from "./harness-profile.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { isTemplateSource } from "./repository-mode.mjs";

export const ENTRY_RULES = path.join(ROOT, "AGENTS.md");
export const REPO_INTRO = path.join(ROOT, "README.md");
export const GLOSSARY = path.join(ROOT, "CONTEXT.md");
export const HARNESS_PROFILE_PATH = ".template-spec/process/harness-profile.yaml";

const UPSTREAM_WORK_UNITS = [
  "work-unit.discovery-opportunity",
  "work-unit.discovery-requirements",
  "work-unit.domain-strategy-design",
  "work-unit.spec-synthesis",
  "work-unit.prototype-design",
];

function fail(message) {
  throw new TypeError(message);
}

function readUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

function registryLine(text) {
  return text.split(/\r?\n/).find((line) => line.includes("yss-skill-registry.yaml")) ?? "";
}

export function loadEntryAlignmentSources({
  profile = loadHarnessProfile(),
  skills = loadSkillRegistry(),
  agentsText = readUtf8(ENTRY_RULES),
  glossaryText = readUtf8(GLOSSARY),
  readmeText = readUtf8(REPO_INTRO),
} = {}) {
  return { profile, skills, agentsText, glossaryText, readmeText };
}

export function checkEntryAlignment(sources = {}) {
  const { profile, skills, agentsText, glossaryText, readmeText } = loadEntryAlignmentSources(sources);
  const errors = [];
  const note = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const nativeCommand = `${INSTANTIATION.cli_package} init --profile ${INSTANTIATION.native_profile} --root`;
  note(["cli_package", "native_profile", "metadata_file", "template_source"].every(field => profile?.instantiation?.[field] === INSTANTIATION[field]), "Harness profile 原生入口来源字段必须与本家族 native 合同一致");
  note(agentsText.includes(nativeCommand) && agentsText.includes(INSTANTIATION.metadata_file), "AGENTS.md 必须声明本家族原生初始化入口与 native metadata");
  if (isTemplateSource(ROOT)) note(readmeText.includes(nativeCommand), "README.md 必须提供本家族原生初始化入口");
  const profileId = profile?.profile_id;
  const entry = profile?.lifecycle?.entry_work_unit;
  const terminal = profile?.lifecycle?.terminal_work_unit;
  note(Boolean(profileId) && agentsText.includes(profileId), `AGENTS.md 必须声明本仓 profile: ${profileId}`);
  note(agentsText.includes(HARNESS_PROFILE_PATH), `AGENTS.md 必须指向 ${HARNESS_PROFILE_PATH}`);
  note(Boolean(entry) && agentsText.includes(entry), `AGENTS.md 必须声明入口工作单元: ${entry}`);
  note(Boolean(terminal) && agentsText.includes(terminal), `AGENTS.md 必须声明终点工作单元: ${terminal}`);
  for (const workUnit of profile?.lifecycle?.allowed_work_units ?? []) {
    note(agentsText.includes(workUnit), `AGENTS.md 主链缺少允许工作单元: ${workUnit}`);
  }
  for (const workUnit of UPSTREAM_WORK_UNITS) {
    note(!agentsText.includes(workUnit), `AGENTS.md 不得把上游工作单元写入本地主链: ${workUnit}`);
  }

  note(/已批准 Spec 或 Strategic Design Handoff/.test(agentsText), "AGENTS.md 必须声明已批准的上游输入");
  note(/Discovery 不是默认阶段/.test(agentsText), "AGENTS.md 必须声明 Discovery 非默认阶段");
  note(agentsText.includes(profile.instantiation.cli_package), "AGENTS.md 必须声明 专职模板 CLI 初始化入口");
  note(!agentsText.includes("yss-product-lifecycle"), "AGENTS.md 不得恢复退役入口 yss-product-lifecycle");
  note(!agentsText.includes("yss-stage-decision"), "AGENTS.md 不得恢复退役入口 yss-stage-decision");
  note(/合同已批准且当前/.test(agentsText) && agentsText.includes("ready-for-agent"), "ready-for-agent 必须绑定已批准且当前的合同");

  const status = skills?.status;
  const agentsRegistryLine = registryLine(agentsText);
  const glossaryRegistryLine = registryLine(glossaryText);
  if (status === "active" || status === "shadow") {
    const opposite = status === "active" ? "shadow" : "active";
    note(!new RegExp(`yss-skill-registry\\.yaml[^\\n]*${opposite}`).test(agentsText), `AGENTS.md 不得声称技能注册表为 ${opposite}`);
    note(new RegExp(`yss-skill-registry\\.yaml[^\\n]*${status}`).test(agentsText), `AGENTS.md 必须声明技能注册表 status: ${status}`);
    note(new RegExp(`yss-skill-registry\\.yaml[^\\n]*${status}`).test(glossaryText), `CONTEXT.md 必须声明技能注册表 status: ${status}`);
  }
  if (skills?.runtime_policy?.consumed_by_lifecycle === true) {
    note(/编排器消费|生命周期(?:必须)?消费|consumed_by_lifecycle:\s*true/.test(agentsRegistryLine), "AGENTS.md 必须声明技能注册表由编排器消费");
    note(/编排器消费|生命周期(?:必须)?消费|consumed_by_lifecycle:\s*true/.test(glossaryRegistryLine), "CONTEXT.md 必须声明技能注册表由生命周期消费");
  }

  if (errors.length > 0) fail(errors.join("\n"));
  return {
    profile_id: profileId,
    entry_work_unit: entry,
    terminal_work_unit: terminal,
    skill_registry_status: status,
  };
}
