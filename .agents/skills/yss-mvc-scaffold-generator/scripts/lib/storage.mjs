import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  HARNESS_ROOT,
  SKILL_ROOT,
  SKILL_UTILS_DIRECTORIES,
  SKILL_UTILS_NAME,
  fail,
  exists
} from "./runtime.mjs";

export async function assertEmpty(target) {
  if (!await exists(target)) return;
  if ((await readdir(target)).length) fail(`目标目录非空，拒绝生成: ${target}`);
}

export async function put(root, relative, content, author) {
  const target = path.join(root, relative);
  const rendered = author ? content.replaceAll("@author system", `@author ${author}`) : content;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${rendered.trim()}\n`, "utf8");
}

export async function renderAsset(name, replacements) {
  let content = await readFile(path.join(SKILL_ROOT, "assets", name), "utf8");
  for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(`{{${token}}}`, value);
  return content;
}

async function populateSkillUtils(destination) {
  await mkdir(destination, { recursive: true });
  for (const relative of SKILL_UTILS_DIRECTORIES) {
    const source = path.join(HARNESS_ROOT, relative);
    if (!await exists(source)) fail(`技能工具包源目录不存在: ${source}`);
    await cp(source, path.join(destination, relative), { recursive: true });
  }
  for (const relative of ["skills-lock.json", "yss-public-skills.json"]) {
    const source = path.join(HARNESS_ROOT, relative);
    if (!await exists(source)) fail(`技能工具包源文件不存在: ${source}`);
    await cp(source, path.join(destination, relative));
  }
  await writeFile(path.join(destination, "skill-utils.yaml"), `schema_version: 1\nkind: yss-skill-utils\ntool_version: 1.0.0\ncompatibility: skill-utils-v1\nsource: ${path.basename(HARNESS_ROOT)}\ncanonical_root: .agents/skills\nprojection_roots:\n  - .codex/skills\n  - .claude/skills\n  - .cursor/skills\n`, "utf8");
}

export async function ensureSkillUtils(targetDir, { apply = true } = {}) {
  const parent = path.dirname(targetDir);
  const skillUtils = path.join(parent, SKILL_UTILS_NAME);
  const marker = path.join(skillUtils, "skill-utils.yaml");
  const sourceLock = path.join(HARNESS_ROOT, "skills-lock.json");
  if (!await exists(sourceLock)) fail(`技能工具包源锁文件不存在: ${sourceLock}`);
  if (await exists(skillUtils)) {
    if (!await exists(marker)) fail(`技能工具包目录已存在但不是受支持的 skillUtils: ${skillUtils}`);
    const installedLock = path.join(skillUtils, "skills-lock.json");
    const current = await exists(installedLock) ? await readFile(installedLock, "utf8") : "";
    const expected = await readFile(sourceLock, "utf8");
    if (current === expected) return { path: skillUtils, created: false, refreshed: false, backup: null };
    if (!apply) return { path: skillUtils, created: false, refreshed: true, backup: null };
    const staging = await mkdtemp(path.join(parent, ".skillUtils.refresh-"));
    const backup = path.join(parent, `.skillUtils.backup-${Date.now()}`);
    try {
      await populateSkillUtils(staging);
      await rename(skillUtils, backup);
      try { await rename(staging, skillUtils); }
      catch (error) { await rename(backup, skillUtils); throw error; }
    } catch (error) {
      if (await exists(staging)) await rm(staging, { recursive: true, force: true });
      throw error;
    }
    return { path: skillUtils, created: false, refreshed: true, backup };
  }
  if (!apply) return { path: skillUtils, created: true, refreshed: false, backup: null };
  await populateSkillUtils(skillUtils);
  return { path: skillUtils, created: true, refreshed: false, backup: null };
}
