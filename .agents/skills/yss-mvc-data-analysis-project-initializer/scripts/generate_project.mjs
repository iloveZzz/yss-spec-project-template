#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, parseArgs } from "../../yss-layered-mvc-scaffold-generator/scripts/generate_scaffold.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const skillId = "yss-mvc-data-analysis-project-initializer";
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
async function present(target) { try { await lstat(target); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function put(target, text) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${text.trimEnd()}\n`); }
function within(parent, target) { const relative = path.relative(parent, target); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }

async function sharedTools(outputDir, contract) {
  const destination = path.join(outputDir, "skillUtils");
  if (!contract.allowed_write_paths.some((item) => within(path.resolve(outputDir, item), destination))) throw new Error("skillUtils 不在批准写范围内");
  const lock = await readFile(path.join(root, "skills-lock.json"));
  if (await present(destination)) {
    if (!await present(path.join(destination, "skill-utils.yaml")) || !lock.equals(await readFile(path.join(destination, "skills-lock.json")))) throw new Error("已有 skillUtils 不匹配；须独立批准刷新，初始化不会覆盖");
    return digest(lock);
  }
  const staging = await mkdtemp(path.join(outputDir, ".skillUtils.staging-"));
  try {
    for (const relative of [".agents/skills", ".codex/skills", ".claude/skills", ".cursor/skills", ".pi/skills", ".qoder/skills", ".trae/skills", "scripts", "docs/agents", "docs/process", "AGENTS.md", "skills-lock.json"]) {
      await mkdir(path.dirname(path.join(staging, relative)), { recursive: true });
      await cp(path.join(root, relative), path.join(staging, relative), { recursive: true });
    }
    await put(path.join(staging, "skill-utils.yaml"), "schema_version: 1\nkind: yss-skill-utils\ncompatibility: skill-utils-v1\ncanonical_root: .agents/skills");
    await rename(staging, destination);
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  return digest(lock);
}

export async function initialize(options) {
  // Shared generation validates approval, decision, target and write scope before invoking this callback.
  return generate(options, { skillId, architectureProfile: "mvc-data-analysis-v1", finalize: async ({ projectRoot, contract, architectureIdentity }) => {
    if (!contract.context_handoff_ref || !contract.context_handoff_digest) throw new Error("缺少批准的 context_handoff_ref/context_handoff_digest");
    const handoffPath = path.resolve(path.dirname(path.resolve(options.contractFile)), contract.context_handoff_ref);
    const context = await readFile(handoffPath);
    if (digest(context) !== contract.context_handoff_digest || !/^---\r?\ncontext_schema_version: 1\r?\n---/m.test(context.toString())) throw new Error("CONTEXT handoff schema/digest 不匹配");
    if (spawnSync("git", ["--version"]).status !== 0) throw new Error("Git 不可用");
    for (const relative of ["docs/agents", "docs/process", "docs/templates", "docs/architecture/templates"]) {
      await mkdir(path.dirname(path.join(projectRoot, relative)), { recursive: true });
      await cp(path.join(root, relative), path.join(projectRoot, relative), { recursive: true });
    }
    await put(path.join(projectRoot, "CONTEXT.md"), context.toString());
    const agents = (await readFile(path.join(root, "AGENTS.md"), "utf8"))
      .replace(/## 4\. `template-source` 模板维护路由[\s\S]*?(?=## 5\.)/, "## 4. 模板维护\n\n本仓为 project-instance；模板维护回上游执行。\n\n")
      .replaceAll(".agents/skills", "../skillUtils/.agents/skills");
    await put(path.join(projectRoot, "AGENTS.md"), agents);
    await put(path.join(projectRoot, "yss-project.yaml"), "schema_version: 1\nrepository_mode: project-instance");
    await put(path.join(projectRoot, ".artifact-workspace.yaml"), `schema_version: 1\nkind: service\nservice_id: ${options.projectName}`);
    await cp(path.join(root, "scripts/lib"), path.join(projectRoot, "scripts/lib"), { recursive: true });
    await cp(path.join(root, "scripts/vendor"), path.join(projectRoot, "scripts/vendor"), { recursive: true });
    for (const name of ["repository-mode", "implementation-path-policy", "repository-scope-policy", "generate-lifecycle-artifacts", "node-generate-lifecycle-artifacts.mjs", "verify-lifecycle-registry", "node-verify-lifecycle-registry.mjs", "verify-lifecycle-checkpoint", "verify-context-reconciliation", "verify-approval-record", "verify-digital-human-task-package", "verify-yss-dto-openapi-profile", "verify-frontend-implementation-evidence"]) {
      await cp(path.join(root, "scripts", name), path.join(projectRoot, "scripts", name));
    }
    const lockDigest = await sharedTools(path.resolve(options.outputDir), contract);
    await put(path.join(projectRoot, "skills-lock.json"), JSON.stringify({ version: 1, distribution: { mode: "sibling-directory", skillUtilsDir: "../skillUtils", required: true, compatibility: "skill-utils-v1", lock_digest: lockDigest } }, null, 2));
    await put(path.join(projectRoot, "docs/process/engineering-baseline.json"), JSON.stringify({ schema_version: 1, architecture_identity: architectureIdentity, platform_profile: contract.profiles.platform, scaffold_completion: "generated" }, null, 2));
    await put(path.join(projectRoot, "docs/process/implementation-repo-registry.yaml"), JSON.stringify({ schema_version: 1, projects: [{ project_type: "backend", project_name: options.projectName, project_root: ".", git_root: ".", repository_scope: "external-repository", scaffold_status: "initialized", default_branch: "main", architecture_identity: architectureIdentity, allowed_write_paths: ["."], verification_commands: contract.verification_commands, expected_evidence_files: contract.expected_evidence_files, ci: "not-configured", rollback_point: "initial-empty-repository" }] }, null, 2));
    await put(path.join(projectRoot, "docs/process/service-initialization.json"), JSON.stringify({ work_unit: "work-unit.service-project-initialization", context_handoff_ref: contract.context_handoff_ref, context_handoff_digest: contract.context_handoff_digest, contract_id: contract.contract_id, architecture_identity: architectureIdentity, status: "generated" }, null, 2));
    await put(path.join(projectRoot, ".gitignore"), "target/\n**/target/\n.idea/\n*.iml\n.env\n.env.*\n.local/");
    const git = spawnSync("git", ["init", "--initial-branch=main"], { cwd: projectRoot, encoding: "utf8" });
    if (git.status !== 0) throw new Error(`Git 初始化失败: ${git.stderr}`);
  } });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) process.stdout.write("使用批准的 MVC schema v3 合同与 Maven 坐标参数；输出独立数据分析项目，无数据库/Mock 选项。\n");
    else await initialize(options);
  } catch (error) { process.stderr.write(`数据分析项目初始化失败: ${error.message}\n`); process.exitCode = 1; }
}
