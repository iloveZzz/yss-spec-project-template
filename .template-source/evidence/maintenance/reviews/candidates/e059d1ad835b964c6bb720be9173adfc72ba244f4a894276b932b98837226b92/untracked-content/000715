import { readFileSync } from "node:fs";
import path from "node:path";
import { loadHarnessProfile } from "./harness-profile.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const ENTRY_RULES = path.join(ROOT, "AGENTS.md");
export const REPO_INTRO = path.join(ROOT, "README.md");
export const GLOSSARY = path.join(ROOT, "CONTEXT.md");
export const HARNESS_PROFILE_PATH = "docs/process/harness-profile.yaml";

const LOCAL_GATE_TERMS = ["yss-router", "yss-ui", "./mvnw", "`pnpm`", "OpenAPI Freeze"];
const GATE_QUALIFIER = /下游|不得|禁止|不在本|不属于本|不作为本|转交|不生成|不得生成|不得调用|不得使用|不得设置|不得进入|本地不|不是本地|不设|不批准/;
const LOCAL_INSTRUCTION_PHRASES = [
  "再使用 `yss-router`",
  "使用 `yss-router`",
  "进入实现时先读",
  "才能使用 `ready-for-agent`",
  "每个功能先建立功能父 Ticket",
  "拆成可独立验证的窄垂直切片",
  "OpenAPI Freeze 或无 API 影响记录完成后",
  "优先使用 `pnpm`",
  "优先使用项目根 `./mvnw`",
  "Domain / Application `>= 90%`"
];
const WINDOW = 160;

function fail(message) {
  throw new TypeError(message);
}

function readUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

function skillRegistryLine(text) {
  return text.split(/\r?\n/).find((line) => line.includes("yss-skill-registry.yaml")) ?? "";
}

function windowsFor(text, term) {
  const hits = [];
  let from = 0;
  while (from < text.length) {
    const index = text.indexOf(term, from);
    if (index < 0) break;
    hits.push(text.slice(Math.max(0, index - WINDOW), index + term.length + WINDOW));
    from = index + term.length;
  }
  return hits;
}

function readmeIntro(text) {
  const cut = text.search(/^## 模板初始化/m);
  return cut === -1 ? text : text.slice(0, cut);
}

export function loadEntryAlignmentSources({
  profile = loadHarnessProfile(),
  skills = loadSkillRegistry(),
  agentsText = readUtf8(ENTRY_RULES),
  readmeText = readUtf8(REPO_INTRO),
  glossaryText = readUtf8(GLOSSARY)
} = {}) {
  return { profile, skills, agentsText, readmeText, glossaryText };
}

export function checkEntryAlignment(sources = {}) {
  const { profile, skills, agentsText, readmeText, glossaryText } = loadEntryAlignmentSources(sources);
  const errors = [];
  const note = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const profileId = profile?.profile_id;
  const terminal = profile?.lifecycle?.terminal_work_unit;
  note(typeof profileId === "string" && profileId.length > 0, "Harness profile 缺少 profile_id");
  note(typeof terminal === "string" && terminal.length > 0, "Harness profile 缺少 lifecycle.terminal_work_unit");
  note(Boolean(profileId) && agentsText.includes(profileId), `AGENTS.md 必须声明本仓 profile: ${profileId}`);
  note(Boolean(terminal) && agentsText.includes(terminal), `AGENTS.md 必须声明本地终点工作单元: ${terminal}`);
  note(agentsText.includes(HARNESS_PROFILE_PATH), `AGENTS.md 单一事实来源必须列入 ${HARNESS_PROFILE_PATH}`);

  const registryStatus = skills?.status;
  const agentsRegistryLine = skillRegistryLine(agentsText);
  const glossaryRegistryLine = skillRegistryLine(glossaryText);
  if (registryStatus === "active" || registryStatus === "shadow") {
    const opposite = registryStatus === "active" ? "shadow" : "active";
    note(!new RegExp(`yss-skill-registry\\.yaml[^\\n]*${opposite}`).test(agentsText), `AGENTS.md 不得在技能注册表为 ${registryStatus} 时声称其为 ${opposite}`);
    note(!new RegExp(`yss-skill-registry\\.yaml[^\\n]*${opposite}`).test(glossaryText), `CONTEXT.md 不得在技能注册表为 ${registryStatus} 时声称其为 ${opposite}`);
    note(new RegExp(`yss-skill-registry\\.yaml[^\\n]*${registryStatus}`).test(agentsText), `AGENTS.md 技能注册表描述必须匹配 live YAML 的 status: ${registryStatus}`);
    note(new RegExp(`yss-skill-registry\\.yaml[^\\n]*${registryStatus}`).test(glossaryText), `CONTEXT.md 技能注册表描述必须匹配 live YAML 的 status: ${registryStatus}`);
  }
  if (skills?.runtime_policy?.consumed_by_lifecycle === true) {
    note(/生命周期消费|consumed_by_lifecycle:\s*true/.test(agentsRegistryLine), "AGENTS.md 必须写明技能注册表由生命周期消费");
    note(/生命周期消费|consumed_by_lifecycle:\s*true/.test(glossaryRegistryLine), "CONTEXT.md 必须写明技能注册表由生命周期消费");
  }
  if (skills?.runtime_policy?.consumed_by_router === false) {
    note(/Router 不消费|不作为 Router|consumed_by_router:\s*false/.test(agentsRegistryLine), "AGENTS.md 必须写明技能注册表不被 Router 消费");
    note(/Router 不消费|不作为 Router|consumed_by_router:\s*false/.test(glossaryRegistryLine), "CONTEXT.md 必须写明技能注册表不被 Router 消费");
  }

  note(/业务级 Ticket/.test(agentsText) || agentsText.includes("artifact.business-ticket-set"), "AGENTS.md 必须把本地 Ticket 写成业务级 Ticket");
  note(/ready-for-human/.test(agentsText), "AGENTS.md 必须声明本地 Ticket 保持 ready-for-human");
  for (const window of windowsFor(agentsText, "ready-for-agent")) {
    note(GATE_QUALIFIER.test(window), "AGENTS.md 不得把 ready-for-agent 写成本地可设置状态");
  }
  for (const phrase of LOCAL_INSTRUCTION_PHRASES) {
    note(!agentsText.includes(phrase), `AGENTS.md 不得把「${phrase}」写成本地硬门禁`);
  }
  for (const term of LOCAL_GATE_TERMS) {
    for (const window of windowsFor(agentsText, term)) {
      note(GATE_QUALIFIER.test(window), `AGENTS.md 不得把 ${term} 写成本地硬门禁`);
    }
  }

  const intro = readmeIntro(readmeText);
  note(Boolean(profileId) && intro.includes(profileId), `README 定位/Quickstart 必须声明本仓 profile: ${profileId}`);
  note(!/OpenAPI 驱动/.test(intro), "README 不得把本仓定位为 OpenAPI 驱动的完整研发生命周期模板");
  note(!/拆分垂直切片/.test(intro), "README Quickstart 不得把本地 Ticket 写成垂直切片拆分");
  note(!/契约冻结后再用/.test(intro), "README Quickstart 不得把 OpenAPI/契约冻结当作本地 Ticket 前置");

  if (errors.length > 0) fail(errors.join("\n"));
  return {
    profile_id: profileId,
    terminal_work_unit: terminal,
    skill_registry_status: registryStatus,
    harness_profile_path: HARNESS_PROFILE_PATH
  };
}
