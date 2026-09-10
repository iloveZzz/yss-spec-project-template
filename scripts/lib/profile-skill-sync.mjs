import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

function fail(message) {
  throw new TypeError(message);
}

function safe(root, relative, label = "path") {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative)) fail(`${label} 必须是仓库相对路径`);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) fail(`${label} 越界: ${relative}`);
  return resolved;
}

function files(directory, prefix = "") {
  if (!existsSync(directory)) return new Map();
  const info = lstatSync(directory);
  if (!info.isDirectory()) fail(`技能源必须是目录: ${directory}`);
  const result = new Map();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) fail(`跨仓同步不接受符号链接: ${path.join(directory, entry.name)}`);
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const item of files(absolute, relative)) result.set(...item);
    } else if (entry.isFile()) result.set(relative, readFileSync(absolute));
  }
  return result;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameTree(left, right) {
  if (left.size !== right.size) return false;
  for (const [name, content] of left) if (!right.get(name)?.equals(content)) return false;
  return true;
}

function treeDigest(tree) {
  const hash = createHash("sha256");
  for (const [name, content] of [...tree.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    hash.update(name);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function patchedSource(root, profile, item) {
  const source = safe(root, item.source ?? `.agents/skills/${item.id}`, "source");
  const patchFile = safe(root, item.patch, "patch");
  const sourceFiles = files(source);
  const actualBaseline = treeDigest(sourceFiles);
  if (actualBaseline !== item.source_tree_sha256) {
    fail(`${profile}/${item.id} 适配基线冲突: 上游树预期 ${item.source_tree_sha256}，实际 ${actualBaseline}`);
  }
  const temporary = mkdtempSync(path.join(tmpdir(), "profile-skill-patch-"));
  try {
    for (const [name, content] of sourceFiles) {
      const target = safe(temporary, name, "patch source file");
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    const applied = spawnSync("git", ["apply", "--binary", "--whitespace=nowarn", patchFile], {
      cwd: temporary,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (applied.status !== 0) fail(`${profile}/${item.id} 补丁无法重放: ${applied.stderr.trim()}`);
    return files(temporary);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function gitDirty(profileRoot, relativePaths) {
  if (!relativePaths.length) return new Set();
  const result = spawnSync("git", ["-C", profileRoot, "status", "--porcelain=v1", "--untracked-files=all", "--", ...relativePaths], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) fail(`无法读取目标工作树状态: ${result.stderr.trim()}`);
  return new Set(result.stdout.split("\n").filter(Boolean).map((line) => line.slice(3).replace(/^"|"$/g, "")));
}

function dirtyMatch(dirty, relative) {
  return [...dirty].some((entry) => entry === relative || entry.startsWith(`${relative}/`) || relative.startsWith(`${entry}/`));
}

function transformedSource(root, profile, item) {
  const source = safe(root, item.source ?? `.agents/skills/${item.id}`, "source");
  const sourceFiles = files(source);
  const desired = item.files?.length
    ? new Map(item.files.map((name) => {
      if (!sourceFiles.has(name)) fail(`${profile}/${item.id} 适配源文件不存在: ${name}`);
      return [name, sourceFiles.get(name)];
    }))
    : sourceFiles;
  for (const replacement of item.replacements ?? []) {
    const current = desired.get(replacement.file);
    if (!current) fail(`${profile}/${item.id} 适配文件不存在: ${replacement.file}`);
    const before = current.toString("utf8");
    const count = before.split(replacement.from).length - 1;
    const expected = replacement.count ?? 1;
    if (count !== expected) fail(`${profile}/${item.id} 适配基线冲突: ${replacement.file} 中预期 ${expected} 处片段，实际 ${count} 处`);
    desired.set(replacement.file, Buffer.from(before.split(replacement.from).join(replacement.to)));
  }
  return desired;
}

function compareTree(profile, id, targetRelative, current, desired, classification, changes) {
  const names = new Set([...current.keys(), ...desired.keys()]);
  for (const name of [...names].sort()) {
    const before = current.get(name);
    const after = desired.get(name);
    if (before && after && before.equals(after)) continue;
    changes.push({
      profile,
      skill: id,
      classification,
      status: before ? (after ? "updated" : "retired") : "added",
      path: `${targetRelative}/${name}`,
      before_sha256: before ? digest(before) : null,
      after_sha256: after ? digest(after) : null,
      content: after ?? null,
    });
  }
}

export function loadProfileSyncConfig(root, configPath = ".template-source/profile-skill-sync.json") {
  const absolute = safe(root, configPath, "config");
  const config = JSON.parse(readFileSync(absolute, "utf8"));
  if (config.schema_version !== 1 || !config.profiles || typeof config.profiles !== "object") fail("profile skill sync 配置必须是 schema v1");
  return config;
}

export function planProfileSkillSync({ root, config, selectedProfiles, dirtyProvider = gitDirty }) {
  const names = selectedProfiles?.length ? selectedProfiles : Object.keys(config.profiles);
  const canonicalRoot = safe(root, config.canonical_root ?? ".agents/skills", "canonical_root");
  const changes = [];
  const classifications = [];
  const issues = [];
  for (const profile of names) {
    const definition = config.profiles[profile];
    if (!definition) fail(`未知 profile: ${profile}`);
    const profileRoot = safe(root, definition.target, `${profile}.target`);
    if (!existsSync(path.join(profileRoot, "yss-project.yaml"))) issues.push({ profile, status: "missing_dependency", path: `${definition.target}/yss-project.yaml` });
    const classified = new Map();
    for (const [classification, items] of [
      ["exact", (definition.exact ?? []).map(({ id }) => id)],
      ["adapted", (definition.adapted ?? []).map(({ id }) => id)],
      ["retired", definition.retired ?? []],
      ["local-only", definition.local_only ?? []],
      ["excluded", definition.excluded ?? []],
      ["upstream", definition.upstream ?? []],
    ]) {
      for (const id of items) {
        if (classified.has(id)) fail(`${profile}/${id} 同时声明为 ${classified.get(id)} 和 ${classification}，违反单向来源规则`);
        classified.set(id, classification);
      }
    }
    if (definition.upstream_manifest) {
      const manifestPath = safe(root, definition.upstream_manifest, "upstream manifest");
      if (!existsSync(manifestPath)) issues.push({ profile, status: "missing_dependency", path: definition.upstream_manifest });
      else {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        const declared = [...(definition.upstream ?? [])].sort();
        const manifestIds = (manifest.skills ?? []).map(({ canonical }) => canonical).sort();
        if (JSON.stringify(declared) !== JSON.stringify(manifestIds) || manifest.source_root !== ".agents/skills") {
          issues.push({ profile, status: "adaptation_conflict", path: definition.upstream_manifest, message: "上游清单与 profile 单向来源声明不一致" });
        }
      }
    }

    for (const item of definition.exact ?? []) {
      const sourceRelative = item.source ?? `.agents/skills/${item.id}`;
      const targetRelative = item.target ?? `.agents/skills/${item.id}`;
      const source = safe(root, sourceRelative, "source");
      if (!existsSync(source)) {
        issues.push({ profile, skill: item.id, status: "missing_dependency", path: sourceRelative });
        continue;
      }
      compareTree(profile, item.id, targetRelative, files(safe(profileRoot, targetRelative, "target")), files(source), "exact", changes);
      classifications.push({ profile, skill: item.id, classification: "exact" });
    }

    for (const item of definition.adapted ?? []) {
      classifications.push({ profile, skill: item.id, classification: "adapted" });
      if (item.strategy === "profile-owned") {
        const targetRelative = item.target ?? `.agents/skills/${item.id}`;
        const skillFile = safe(profileRoot, `${targetRelative}/SKILL.md`, "adapted target");
        if (!existsSync(skillFile)) issues.push({ profile, skill: item.id, status: "missing_dependency", path: `${definition.target}/${targetRelative}/SKILL.md` });
        else {
          const content = readFileSync(skillFile, "utf8");
          for (const marker of item.required_markers ?? []) if (!content.includes(marker)) issues.push({ profile, skill: item.id, status: "adaptation_conflict", path: `${definition.target}/${targetRelative}/SKILL.md`, marker });
        }
        continue;
      }
      const targetRelative = item.target ?? `.agents/skills/${item.id}`;
      let desired;
      try {
        const sourceRelative = item.source ?? `.agents/skills/${item.id}`;
        if (!existsSync(safe(root, sourceRelative, "source"))) {
          issues.push({ profile, skill: item.id, status: "missing_dependency", path: sourceRelative });
          continue;
        }
        if (item.strategy === "replace") desired = transformedSource(root, profile, item);
        else if (item.strategy === "patch") {
          if (!item.patch || !existsSync(safe(root, item.patch, "patch"))) {
            issues.push({ profile, skill: item.id, status: "missing_dependency", path: item.patch ?? "patch" });
            continue;
          }
          desired = patchedSource(root, profile, item);
        } else fail(`${profile}/${item.id} 未知适配策略`);
      } catch (error) {
        issues.push({ profile, skill: item.id, status: "adaptation_conflict", message: error.message });
        continue;
      }
      const targetFiles = files(safe(profileRoot, targetRelative, "target"));
      const current = item.files?.length ? new Map(item.files.filter((name) => targetFiles.has(name)).map((name) => [name, targetFiles.get(name)])) : targetFiles;
      compareTree(profile, item.id, targetRelative, current, desired, "adapted", changes);
    }

    for (const item of definition.assets ?? []) {
      const source = safe(root, item.source, "asset source");
      const target = safe(profileRoot, item.target ?? item.source, "asset target");
      if (!existsSync(source)) {
        issues.push({ profile, status: "missing_dependency", path: item.source });
        continue;
      }
      const before = existsSync(target) ? readFileSync(target) : null;
      const after = readFileSync(source);
      if (!before?.equals(after)) changes.push({ profile, classification: "exact", status: before ? "updated" : "added", path: item.target ?? item.source, before_sha256: before ? digest(before) : null, after_sha256: digest(after), content: after });
    }

    for (const id of definition.retired ?? []) {
      classifications.push({ profile, skill: id, classification: "retired" });
      const targetRelative = `.agents/skills/${id}`;
      const current = files(safe(profileRoot, targetRelative, "retired target"));
      for (const [name, content] of current) changes.push({ profile, skill: id, classification: "retired", status: "retired", path: `${targetRelative}/${name}`, before_sha256: digest(content), after_sha256: null, content: null });
    }
    for (const id of definition.local_only ?? []) classifications.push({ profile, skill: id, classification: "local-only" });
    for (const id of definition.excluded ?? []) classifications.push({ profile, skill: id, classification: "excluded" });
    for (const id of definition.upstream ?? []) classifications.push({ profile, skill: id, classification: "upstream" });

    const targetSkillRoot = safe(profileRoot, ".agents/skills", "profile skill root");
    if (existsSync(targetSkillRoot)) {
      for (const entry of readdirSync(targetSkillRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || classified.has(entry.name)) continue;
        const sourceSkill = path.join(canonicalRoot, entry.name);
        if (!existsSync(sourceSkill) || !lstatSync(sourceSkill).isDirectory()) continue;
        if (!sameTree(files(sourceSkill), files(path.join(targetSkillRoot, entry.name)))) {
          issues.push({
            profile,
            skill: entry.name,
            status: "unregistered_difference",
            path: `${definition.target}/.agents/skills/${entry.name}`,
            message: "同名 Skill 内容不同但未登记同步分类",
          });
        }
      }
    }

    const changedPaths = [...new Set(changes.filter((item) => item.profile === profile).map((item) => item.path))];
    const dirty = dirtyProvider(profileRoot, changedPaths);
    for (const change of changes.filter((item) => item.profile === profile && dirtyMatch(dirty, item.path))) {
      issues.push({ profile, skill: change.skill, status: "adaptation_conflict", path: `${definition.target}/${change.path}`, message: "目标含未提交改动" });
    }
  }
  return { schema_version: 1, profiles: names, changes, classifications, issues };
}

export function applyProfileSkillSync({ root, config, plan, write = writeFileSync, remove = rmSync }) {
  if (plan.issues.length) fail(`同步预检失败，共 ${plan.issues.length} 项问题`);
  const snapshots = new Map();
  const touched = [];
  try {
    for (const change of plan.changes) {
      const profileRoot = safe(root, config.profiles[change.profile].target, "profile target");
      const target = safe(profileRoot, change.path, "change target");
      const current = existsSync(target) ? readFileSync(target) : null;
      const currentHash = current ? digest(current) : null;
      if (currentHash !== change.before_sha256) fail(`目标在预览后发生变化: ${change.profile}/${change.path}`);
      snapshots.set(target, current);
      touched.push(target);
      if (change.content === null) remove(target, { force: true });
      else {
        mkdirSync(path.dirname(target), { recursive: true });
        write(target, change.content);
      }
    }
    for (const profile of plan.profiles) {
      const profileRoot = safe(root, config.profiles[profile].target, "profile target");
      for (const id of config.profiles[profile].retired ?? []) {
        const retiredRoot = safe(profileRoot, `.agents/skills/${id}`, "retired skill");
        if (!existsSync(retiredRoot)) continue;
        if (!lstatSync(retiredRoot).isDirectory()) fail(`退役 Skill 目标不是目录: ${retiredRoot}`);
        if (files(retiredRoot).size) fail(`退役 Skill 在预览后出现未纳管文件: ${retiredRoot}`);
        remove(retiredRoot, { recursive: true, force: true });
      }
    }
  } catch (error) {
    for (const target of touched.reverse()) {
      const before = snapshots.get(target);
      if (before === null) remove(target, { force: true });
      else {
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, before);
      }
    }
    throw error;
  }
  return { ...plan, applied: plan.changes.length };
}

export function reportProfileSkillSync(plan) {
  const counts = {};
  for (const item of [...plan.changes, ...plan.issues]) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return { ...plan, changes: plan.changes.map(({ content, ...item }) => item), counts };
}
