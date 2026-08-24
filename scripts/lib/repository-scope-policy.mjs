import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validImplementationPath, violation as pathViolation } from "./implementation-path-policy.mjs";

export const REPOSITORY_SCOPES = Object.freeze([
  "external-repository",
  "harness-apps",
  "git-submodule"
]);

export const LAYOUT_POLICIES = Object.freeze({
  "external-repository": "external-repository-native",
  "harness-apps": "harness-apps-multi-project",
  "git-submodule": "git-submodule-harness-apps"
});

export const GITLINK_MODE = "160000";
export const CHECKOUT_STATES = Object.freeze([
  "attached-branch",
  "detached-head",
  "uninitialized",
  "empty-gitlink"
]);

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlash(value) {
  const text = asString(value);
  if (!text) return "";
  return text.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function expectedLayoutPolicy(scope) {
  return LAYOUT_POLICIES[scope] ?? null;
}

export function violationRepositoryScope(record = {}) {
  const scope = asString(record.repository_scope);
  if (!REPOSITORY_SCOPES.includes(scope)) {
    return `repository_scope must be one of ${REPOSITORY_SCOPES.join(" / ")}`;
  }
  const layout = asString(record.layout_policy);
  const expected = expectedLayoutPolicy(scope);
  if (layout && layout !== expected) {
    return `layout_policy for ${scope} must be ${expected}`;
  }
  if (scope === "git-submodule") return gitSubmoduleRecordViolation(record);
  if (scope === "harness-apps") return harnessAppsRecordViolation(record);
  return externalRepositoryRecordViolation(record);
}

function gitSubmoduleRecordViolation(record) {
  const projectRoot = normalizeSlash(record.project_root);
  if (!projectRoot || !validImplementationPath(`${projectRoot}/`)) {
    return `git-submodule project_root must be a concrete apps/backend/<project>/ or apps/frontend/<project>/ path: ${pathViolation(record.project_root || "") ?? "missing"}`;
  }
  const gitlinkPath = normalizeSlash(record.gitlink_path || record.project_root);
  if (gitlinkPath !== projectRoot) {
    return "git-submodule gitlink_path must equal project_root";
  }
  const mode = String(record.git_entry_mode ?? "").trim();
  if (mode && mode !== GITLINK_MODE) {
    return `git-submodule git_entry_mode must be ${GITLINK_MODE}`;
  }
  if (!asString(record.git_url)) return "git-submodule git_url is required";
  if (!asString(record.gitmodules_name)) return "git-submodule gitmodules_name is required";
  const superUrl = asString(record.superproject_git_url);
  if (superUrl && superUrl === asString(record.git_url)) {
    return "git-submodule git_url must differ from superproject_git_url";
  }
  if (asString(record.layout_policy) && asString(record.layout_policy) !== LAYOUT_POLICIES["git-submodule"]) {
    return `git-submodule layout_policy must be ${LAYOUT_POLICIES["git-submodule"]}`;
  }
  const checkout = asString(record.checkout_state);
  if (checkout && !CHECKOUT_STATES.includes(checkout)) {
    return `git-submodule checkout_state must be one of ${CHECKOUT_STATES.join(" / ")}`;
  }
  if (checkout === "detached-head" && record.commit_allowed === true) {
    return "git-submodule must not commit on detached HEAD";
  }
  if ((checkout === "uninitialized" || checkout === "empty-gitlink") && record.scaffold_status === "required") {
    return "empty or uninitialized gitlink must not run scaffold_status=required";
  }
  if (record.copy_source_into_harness === true) {
    return "git-submodule must use gitlink mount, not copy implementation sources into the superproject";
  }
  return null;
}

function harnessAppsRecordViolation(record) {
  const mode = String(record.git_entry_mode ?? "").trim();
  if (mode === GITLINK_MODE) {
    return "harness-apps cannot record a gitlink; use repository_scope: git-submodule";
  }
  const projectRoot = normalizeSlash(record.project_root);
  if (projectRoot && !validImplementationPath(`${projectRoot}/`)) {
    return `harness-apps project_root must be a concrete apps/<kind>/<project>/ path: ${pathViolation(record.project_root)}`;
  }
  return null;
}

function externalRepositoryRecordViolation(record) {
  const gitlinkPath = normalizeSlash(record.gitlink_path);
  if (gitlinkPath && gitlinkPath.startsWith("apps/") && String(record.git_entry_mode) === GITLINK_MODE) {
    return "external-repository cannot mount a gitlink under apps/; use repository_scope: git-submodule";
  }
  return null;
}

export function validRepositoryScope(record) {
  return violationRepositoryScope(record) === null;
}

export function parseGitmodules(content) {
  const modules = [];
  if (typeof content !== "string" || content.length === 0) return modules;
  let current = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const name = line.match(/^\[submodule "(.+)"\]$/);
    if (name) {
      current = { name: name[1], path: "", url: "" };
      modules.push(current);
      continue;
    }
    if (!current) continue;
    const pathMatch = line.match(/^path\s*=\s*(.+)$/);
    if (pathMatch) current.path = normalizeSlash(pathMatch[1]);
    const urlMatch = line.match(/^url\s*=\s*(.+)$/);
    if (urlMatch) current.url = urlMatch[1].trim();
  }
  return modules;
}

export function readGitmodules(repoRoot) {
  const file = path.join(repoRoot, ".gitmodules");
  if (!existsSync(file)) return [];
  return parseGitmodules(readFileSync(file, "utf8"));
}

export function gitLsFilesStage(repoRoot, relativePath) {
  const result = spawnSync("git", ["-C", repoRoot, "ls-files", "--stage", "--", relativePath], {
    encoding: "utf8"
  });
  if (result.status !== 0) return null;
  const line = (result.stdout || "").trim().split(/\r?\n/).filter(Boolean)[0];
  if (!line) return null;
  const match = line.match(/^(\d+)\s+([0-9a-f]+)\s+(\d+)\s+(.+)$/i);
  if (!match) return null;
  return { mode: match[1], sha: match[2], stage: match[3], path: match[4] };
}

export function findGitRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git")) || existsSync(path.join(current, ".gitmodules"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function isGitSubmoduleMount(repoRoot, targetPath) {
  const relative = normalizeSlash(path.relative(repoRoot, path.resolve(targetPath)));
  if (!relative || relative.startsWith("..")) return false;
  const listed = readGitmodules(repoRoot).some((item) => item.path === relative);
  if (listed) return true;
  const staged = gitLsFilesStage(repoRoot, relative);
  return staged?.mode === GITLINK_MODE;
}

export function gitSubmoduleScaffoldViolation(repoRoot, outputDir, projectName) {
  const projectRoot = path.resolve(outputDir, projectName);
  const roots = [repoRoot, findGitRoot(outputDir), findGitRoot(projectRoot)].filter(Boolean);
  const seen = new Set();
  for (const root of roots) {
    const resolved = path.resolve(root);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (isGitSubmoduleMount(resolved, projectRoot)) {
      return "git-submodule gitlink 不得由脚手架覆盖；先 git submodule update --init，在子仓附加分支的工作树内生成，或改用 external-repository / harness-apps";
    }
  }
  return null;
}

export function gitSubmoduleCommitViolation({ checkout_state, commit_authorized } = {}) {
  if (checkout_state === "detached-head") {
    return "git-submodule must checkout an attached branch before commit";
  }
  if (commit_authorized !== true) return "commit_authorized must be true";
  return null;
}

export function gitSubmodulePushOrderViolation(order) {
  const expected = ["submodule-repositories", "superproject-gitlink"];
  if (!Array.isArray(order) || order.length !== expected.length || expected.some((item, index) => order[index] !== item)) {
    return "git-submodule push/commit order must be submodule-repositories then superproject-gitlink";
  }
  return null;
}
