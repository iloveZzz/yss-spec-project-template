import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function renderDataAnalysisAgents(source) {
  const start = "<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->", end = "<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->";
  const a = source.indexOf(start), z = source.indexOf(end);
  if (a >= 0 || z >= 0) {
    if (source.split(start).length !== 2 || source.split(end).length !== 2 || z < a) throw new Error("AGENTS_SOURCE_ONLY_MARKERS: 缺失、重复或顺序错误");
    source = source.slice(0, a) + source.slice(z + end.length);
  } else {
    source = source.replace(/## 4\. `template-source` 模板维护路由[\s\S]*?(?=## 5\.)/, "## 4. 模板维护\n\n本仓为 project-instance；模板维护回上游执行。\n\n");
  }
  // Already distributed sibling paths must remain idempotent.
  return source.replace(/(?<!\.\.\/skillUtils\/)\.agents\/skills/g, "../skillUtils/.agents/skills");
}

export async function readDataAnalysisAgents() {
  return renderDataAnalysisAgents(await readFile(path.join(REPOSITORY_ROOT, "AGENTS.md"), "utf8"));
}

async function present(target) {
  try { await lstat(target); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function put(target, text) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${text.trimEnd()}\n`);
}

function within(parent, target) {
  const relative = path.relative(parent, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function sharedTools(outputDir, contract) {
  const destination = path.join(outputDir, "skillUtils");
  if (!contract.allowed_write_paths.some((item) => within(path.resolve(outputDir, item), destination))) throw new Error("skillUtils 不在批准写范围内");
  const lock = await readFile(path.join(REPOSITORY_ROOT, "skills-lock.json"));
  if (await present(destination)) {
    if (!await present(path.join(destination, "skill-utils.yaml")) || !lock.equals(await readFile(path.join(destination, "skills-lock.json")))) throw new Error("已有 skillUtils 不匹配；须独立批准刷新，初始化不会覆盖");
    return digest(lock);
  }
  const staging = await mkdtemp(path.join(outputDir, ".skillUtils.staging-"));
  try {
    for (const relative of [".agents/skills", ".codex/skills", ".cursor/skills", ".pi/skills", "scripts", ".template-spec/agents", ".template-spec/process", "skills-lock.json"]) {
      await mkdir(path.dirname(path.join(staging, relative)), { recursive: true });
      await cp(path.join(REPOSITORY_ROOT, relative), path.join(staging, relative), { recursive: true });
    }
    await put(path.join(staging, "skill-utils.yaml"), "schema_version: 1\nkind: yss-skill-utils\ncompatibility: skill-utils-v1\ncanonical_root: .agents/skills");
    await put(path.join(staging, "AGENTS.md"), "# skillUtils 工具包入口\n\n本目录由 skill-utils.yaml 标识为 yss-skill-utils / skill-utils-v1，canonical 技能位于 .agents/skills。它提供相邻工程的技能与校验工具，不是产品治理仓；不要求本目录具有 yss-project.yaml、CONTEXT.md、Ticket、checkpoint 或 Slice。\n\n执行产品任务时读取目标工程自己的 AGENTS.md、身份、Context 与允许写范围，工具包不授予产品实施或批准权限。已有工具包不匹配时停止初始化，不覆盖用户内容；刷新须独立授权。提交、推送、发布按当前会话有效授权执行。\n");
    await rename(staging, destination);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return digest(lock);
}

export async function finalizeDataAnalysisProfile({ projectRoot, contract, architectureIdentity, options, agents }) {
  agents ??= await readDataAnalysisAgents();
  if (!contract.context_handoff_ref || !contract.context_handoff_digest) throw new Error("缺少批准的 context_handoff_ref/context_handoff_digest");
  const contractFile = path.resolve(options.contractFile);
  const contractRoot = path.dirname(contractFile);
  const handoffPath = path.resolve(contractRoot, contract.context_handoff_ref);
  if (!within(contractRoot, handoffPath)) throw new Error("CONTEXT handoff 不得越过脚手架合同目录");
  const context = await readFile(handoffPath);
  if (digest(context) !== contract.context_handoff_digest || !/^---\r?\ncontext_schema_version: 1\r?\n---/m.test(context.toString())) throw new Error("CONTEXT handoff schema/digest 不匹配");
  if (spawnSync("git", ["--version"]).status !== 0) throw new Error("Git 不可用");

  for (const relative of [".template-spec/agents", ".template-spec/process", ".template-spec/templates", ".template-spec/architecture/templates"]) {
    await mkdir(path.dirname(path.join(projectRoot, relative)), { recursive: true });
    await cp(path.join(REPOSITORY_ROOT, relative), path.join(projectRoot, relative), { recursive: true });
  }
  await put(path.join(projectRoot, "CONTEXT.md"), context.toString());
  await put(path.join(projectRoot, "AGENTS.md"), agents);
  await put(path.join(projectRoot, "yss-project.yaml"), "schema_version: 1\nrepository_mode: project-instance");
  await put(path.join(projectRoot, ".artifact-workspace.yaml"), `schema_version: 1\nkind: service\nservice_id: ${options.projectName}`);
  await cp(path.join(REPOSITORY_ROOT, "scripts/lib"), path.join(projectRoot, "scripts/lib"), { recursive: true });
  await cp(path.join(REPOSITORY_ROOT, "scripts/vendor"), path.join(projectRoot, "scripts/vendor"), { recursive: true });
  for (const name of ["repository-mode", "generate-lifecycle-artifacts", "verify-lifecycle-registry", "verify-lifecycle-checkpoint", "verify-context-reconciliation", "verify-approval-record", "verify-user-decision", "verify-digital-human-task-package", "verify-yss-dto-openapi-profile", "verify-frontend-implementation-evidence"]) {
    await cp(path.join(REPOSITORY_ROOT, "scripts", name), path.join(projectRoot, "scripts", name));
  }
  const lockDigest = await sharedTools(path.resolve(options.outputDir), contract);
  await put(path.join(projectRoot, "skills-lock.json"), JSON.stringify({ version: 1, distribution: { mode: "sibling-directory", skillUtilsDir: "../skillUtils", required: true, compatibility: "skill-utils-v1", lock_digest: lockDigest } }, null, 2));
  await put(path.join(projectRoot, ".template-spec/process/engineering-baseline.json"), JSON.stringify({ schema_version: 1, architecture_identity: architectureIdentity, platform_profile: contract.profiles.platform, scaffold_completion: "generated" }, null, 2));
  await put(path.join(projectRoot, ".template-spec/process/implementation-repo-registry.yaml"), JSON.stringify({ schema_version: 1, projects: [{ project_type: "backend", project_name: options.projectName, project_root: ".", git_root: ".", repository_scope: "external-repository", scaffold_status: "initialized", default_branch: "main", architecture_identity: architectureIdentity, allowed_write_paths: ["."], verification_commands: contract.verification_commands, expected_evidence_files: contract.expected_evidence_files, ci: "not-configured", rollback_point: "initial-empty-repository" }] }, null, 2));
  await put(path.join(projectRoot, ".template-spec/process/service-initialization.json"), JSON.stringify({ work_unit: "work-unit.service-project-initialization", context_handoff_ref: contract.context_handoff_ref, context_handoff_digest: contract.context_handoff_digest, contract_id: contract.contract_id, architecture_identity: architectureIdentity, status: "generated" }, null, 2));
  await put(path.join(projectRoot, ".gitignore"), "target/\n**/target/\n.idea/\n*.iml\n.env\n.env.*\n.local/");
  const git = spawnSync("git", ["init", "--initial-branch=main"], { cwd: projectRoot, encoding: "utf8" });
  if (git.status !== 0) throw new Error(`Git 初始化失败: ${git.stderr}`);
}
