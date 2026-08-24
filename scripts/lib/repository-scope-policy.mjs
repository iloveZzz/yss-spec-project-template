import { existsSync, readdirSync, readFileSync } from "node:fs";
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

export const NAMED_STRESS_SCENARIOS = Object.freeze([
  "unknown_scope",
  "layout_mismatch",
  "same_origin_url",
  "copy_source_into_harness",
  "missing_git_entry_mode",
  "declared_harness_apps_actual_gitlink",
  "empty_gitlink_as_regular_dir",
  "detached_head_as_regular_dir",
  "force_overlay_mount"
]);

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlash(value) {
  const text = asString(value);
  if (!text) return "";
  return text.replace(/\\/g, "/").replace(/\/+$/, "");
}

function isDeclared(value) {
  const text = asString(value);
  return text !== "" && text !== "不适用";
}

function uniqueResolved(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    const resolved = path.resolve(item);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
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
  if (!isDeclared(record.gitlink_path)) {
    return "git-submodule gitlink_path is required";
  }
  const gitlinkPath = normalizeSlash(record.gitlink_path);
  if (gitlinkPath !== projectRoot) {
    return "git-submodule gitlink_path must equal project_root";
  }
  if (asString(record.git_entry_mode) !== GITLINK_MODE) {
    return `git-submodule git_entry_mode must be ${GITLINK_MODE}`;
  }
  if (!asString(record.git_url)) return "git-submodule git_url is required";
  if (!asString(record.gitmodules_name)) return "git-submodule gitmodules_name is required";
  if (!asString(record.superproject_git_url)) {
    return "git-submodule superproject_git_url is required";
  }
  if (asString(record.superproject_git_url) === asString(record.git_url)) {
    return "git-submodule git_url must differ from superproject_git_url";
  }
  if (asString(record.layout_policy) && asString(record.layout_policy) !== LAYOUT_POLICIES["git-submodule"]) {
    return `git-submodule layout_policy must be ${LAYOUT_POLICIES["git-submodule"]}`;
  }
  const checkout = asString(record.checkout_state);
  if (!checkout) return "git-submodule checkout_state is required";
  if (!CHECKOUT_STATES.includes(checkout)) {
    return `git-submodule checkout_state must be one of ${CHECKOUT_STATES.join(" / ")}`;
  }
  if (checkout === "detached-head" && record.commit_allowed === true) {
    return "git-submodule must not commit on detached HEAD";
  }
  if (checkout === "detached-head" && record.scaffold_status === "required") {
    return "detached HEAD must not be treated as a regular directory";
  }
  if ((checkout === "uninitialized" || checkout === "empty-gitlink") && record.scaffold_status === "required") {
    return "empty or uninitialized gitlink must not run scaffold_status=required";
  }
  if (record.force === true) {
    return "--force must not overlay a git-submodule mount as a regular directory";
  }
  if (record.copy_source_into_harness === true) {
    return "git-submodule must use gitlink mount, not copy implementation sources into the superproject";
  }
  return null;
}

function foreignGitlinkIdentityViolation(record, scope) {
  if (asString(record.git_entry_mode) === GITLINK_MODE) {
    return `${scope} cannot record a gitlink; use repository_scope: git-submodule`;
  }
  if (isDeclared(record.gitlink_path) || isDeclared(record.gitmodules_name) || isDeclared(record.superproject_git_url)) {
    return `${scope} must not record git-submodule identity fields; use repository_scope: git-submodule`;
  }
  const checkout = asString(record.checkout_state);
  if (isDeclared(checkout) && CHECKOUT_STATES.includes(checkout)) {
    return `${scope} must not record git-submodule checkout_state; use repository_scope: git-submodule`;
  }
  return null;
}

function harnessAppsRecordViolation(record) {
  const foreign = foreignGitlinkIdentityViolation(record, "harness-apps");
  if (foreign) return foreign;
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
  const foreign = foreignGitlinkIdentityViolation(record, "external-repository");
  if (foreign) return foreign;
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
  const roots = collectGitRoots(start);
  return roots[0] ?? null;
}

export function collectGitRoots(start) {
  const roots = [];
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git")) || existsSync(path.join(current, ".gitmodules"))) {
      roots.push(current);
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return roots;
}

function gitAbbrevRef(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return (result.stdout || "").trim();
}

function gitShowSuperproject(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--show-superproject-working-tree"], { encoding: "utf8" });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function isEmptyDir(dir) {
  if (!existsSync(dir)) return true;
  try {
    return readdirSync(dir).filter((name) => name !== "." && name !== "..").length === 0;
  } catch {
    return false;
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

export function isGitSubmoduleMountAnywhere(startOrRoot, targetPath) {
  const roots = uniqueResolved([startOrRoot, ...collectGitRoots(targetPath), ...collectGitRoots(startOrRoot)]);
  return roots.some((root) => isGitSubmoduleMount(root, targetPath));
}

export function inspectCheckoutState(repoRoot, targetPath) {
  const resolved = path.resolve(targetPath);
  const relative = repoRoot ? normalizeSlash(path.relative(path.resolve(repoRoot), resolved)) : "";
  const inRepo = Boolean(relative) && !relative.startsWith("..");
  const staged = inRepo ? gitLsFilesStage(repoRoot, relative) : null;
  const listed = inRepo ? readGitmodules(repoRoot).some((item) => item.path === relative) : false;
  const superproject = existsSync(path.join(resolved, ".git")) ? gitShowSuperproject(resolved) : "";
  const isMount = staged?.mode === GITLINK_MODE || listed || Boolean(superproject);
  const hasGit = existsSync(path.join(resolved, ".git"));
  if (isMount && !hasGit) {
    return isEmptyDir(resolved) ? "empty-gitlink" : "uninitialized";
  }
  if (isMount && hasGit) {
    const ref = gitAbbrevRef(resolved);
    if (ref === "HEAD") return "detached-head";
    return "attached-branch";
  }
  return null;
}

export function actualWorkingTreeScope(repoRoot, targetPath) {
  if (isGitSubmoduleMountAnywhere(repoRoot, targetPath) || gitShowSuperproject(targetPath)) {
    return "git-submodule";
  }
  return "regular";
}

export function regularDirectoryMisreadViolation(record = {}, options = {}) {
  const force = options.force === true;
  const checkout = asString(record.checkout_state);
  if (checkout === "empty-gitlink" || checkout === "uninitialized") {
    return "empty gitlink must not be treated as a regular directory";
  }
  if (checkout === "detached-head") {
    return "detached HEAD must not be treated as a regular directory";
  }
  if (options.repoRoot && options.targetPath) {
    const inspected = inspectCheckoutState(options.repoRoot, options.targetPath);
    if (inspected === "empty-gitlink" || inspected === "uninitialized") {
      return "empty gitlink must not be treated as a regular directory";
    }
    if (inspected === "detached-head") {
      return "detached HEAD must not be treated as a regular directory";
    }
    if (isGitSubmoduleMountAnywhere(options.repoRoot, options.targetPath) && force) {
      return "--force must not overlay a git-submodule mount as a regular directory";
    }
  }
  if (force && asString(record.repository_scope) === "git-submodule") {
    return "--force must not overlay a git-submodule mount as a regular directory";
  }
  return null;
}

export function inspectWorkingTreeScope(repoRoot, record = {}) {
  const projectRoot = normalizeSlash(record.project_root);
  if (!repoRoot || !projectRoot) return "working-tree inspection requires repoRoot and project_root";
  const target = path.resolve(repoRoot, projectRoot);
  const declared = asString(record.repository_scope);
  const actual = actualWorkingTreeScope(repoRoot, target);
  if (declared === "harness-apps" && actual === "git-submodule") {
    return "工作树存在 gitlink / .gitmodules，不得登记为 harness-apps";
  }
  if (declared === "external-repository" && actual === "git-submodule" && projectRoot.startsWith("apps/")) {
    return "工作树存在 apps/ gitlink，不得登记为 external-repository";
  }
  if (declared === "git-submodule" && actual !== "git-submodule") {
    return "工作树不是 gitlink，不得登记为 git-submodule";
  }
  return null;
}

export function gitSubmoduleScaffoldViolation(repoRoot, outputDir, projectName, { force = false } = {}) {
  const projectRoot = path.resolve(outputDir, projectName);
  const roots = uniqueResolved([repoRoot, ...collectGitRoots(outputDir), ...collectGitRoots(projectRoot)]);
  for (const root of roots) {
    if (isGitSubmoduleMount(root, projectRoot)) {
      return force
        ? "--force 不得把 git-submodule 挂载点当成普通目录覆盖；gitlink 不得由脚手架覆盖"
        : "git-submodule gitlink 不得由脚手架覆盖；先 git submodule update --init，在子仓附加分支的工作树内生成，或改用 external-repository / harness-apps";
    }
  }
  for (const root of roots) {
    const checkout = inspectCheckoutState(root, projectRoot);
    if (checkout === "empty-gitlink" || checkout === "uninitialized") {
      return "空 gitlink 不得当成普通目录覆盖；gitlink 不得由脚手架覆盖";
    }
    if (checkout === "detached-head") {
      return "detached HEAD 不得当成普通目录覆盖；gitlink 不得由脚手架覆盖";
    }
  }
  const misread = regularDirectoryMisreadViolation({}, { force, repoRoot, targetPath: projectRoot });
  if (misread) {
    return `${misread}；gitlink 不得由脚手架覆盖`;
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
