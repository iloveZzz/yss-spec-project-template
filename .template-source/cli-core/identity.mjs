import * as fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ensure,
  safe,
  stat,
  readJson,
  governance,
  hash,
  relative,
  descriptor,
  same,
} from "./io.mjs";
import { yaml, PROFILE } from "./bundle.mjs";
export const METADATA = [
  ".yss-template.json",
  ".yss-harness-design.json",
  ".yss-harness-dev.json",
  ".yss-harness-backend.json",
  ".yss-harness-frontend.json",
];
function validDescriptor(d, nullable = false) {
  return (
    (nullable && d === null) ||
    Boolean(
      d &&
        d.type === "file" &&
        /^[a-f0-9]{64}$/.test(d.digest) &&
        Number.isInteger(d.mode) &&
        d.mode >= 0 &&
        d.mode <= 0o777,
    )
  );
}
export function identity(target, bundle, command) {
  const f = bundle.family,
    present = METADATA.filter((ref) => stat(safe(target, ref)));
  ensure(present.length <= 1, "检测到多个家族 metadata，拒绝混用", "IDENTITY");
  ensure(
    !present.length || present[0] === f.metadataFile,
    "不同 Harness 家族不可接管或转换",
    "IDENTITY",
  );
  let meta = null;
  if (present.length) {
    meta = readJson(target, f.metadataFile);
    yaml(fs.readFileSync(safe(target, f.metadataFile)));
    ensure(
      meta && typeof meta === "object" && !Array.isArray(meta),
      "metadata 必须是对象",
      "IDENTITY",
    );
    ensure(
      !("schema_version" in meta) &&
        !("profile_id" in meta) &&
        !("managed_files" in meta) &&
        !("template_source" in meta),
      "不支持旧实例；请在全新目录使用新 CLI init",
      "LEGACY",
    );
    ensure(
      meta.metadataSchemaVersion === 2,
      "不支持或损坏的 metadata schema",
      "IDENTITY",
    );
    for (const key of ["profileId", "templateName", "templateSource"])
      ensure(meta[key] === f[key], `metadata 身份矛盾: ${key}`, "IDENTITY");
    ensure(
      /^[a-f0-9]{40}$/.test(meta.templateCommit) &&
        ["committed", "working-tree"].includes(meta.templateSourceState || "committed") &&
        ["committed", "working-tree"].includes(meta.coreSourceState || "committed") &&
        ["snapshotHash", "coreDigest", "manifestHash", "baselineDigest"].every(
          (k) => /^[a-f0-9]{64}$/.test(meta[k]),
        ),
      "metadata 来源或摘要缺失",
      "BASELINE",
    );
    ensure(
      meta.managedFiles &&
        typeof meta.managedFiles === "object" &&
        !Array.isArray(meta.managedFiles) &&
        hash(JSON.stringify(meta.managedFiles)) === meta.baselineDigest,
      "基线缺失或摘要损坏；请使用保留的恢复清单",
      "BASELINE",
    );
    for (const [ref, item] of Object.entries(meta.managedFiles)) {
      governance(ref);
      ensure(
        validDescriptor(item.baseline) &&
          validDescriptor(item.lastApplied, true),
        `未知基线或文件类型: ${ref}`,
        "BASELINE",
      );
    }
    for (const ref of ["yss-project.yaml", PROFILE, "AGENTS.md", "CONTEXT.md"])
      ensure(meta.managedFiles[ref], `基线缺少必需合同: ${ref}`, "BASELINE");
    ensure(
      meta.variables &&
        typeof meta.variables.projectName === "string" &&
        typeof meta.variables.includeExampleDocs === "boolean",
      "项目变量缺失",
      "BASELINE",
    );
  }
  const profilePath = safe(target, PROFILE);
  let profile = null;
  if (stat(profilePath)) {
    profile = yaml(fs.readFileSync(profilePath));
    ensure(
      profile.instantiation?.cli_package !== "repository-local",
      "不支持 repository-local 旧实例；仅允许全新目录 init",
      "LEGACY",
    );
    ensure(
      [1, 2].includes(profile.schema_version) &&
        profile.profile_id === f.profileId,
      "目标 profile 未知或属于不同家族",
      "IDENTITY",
    );
    ensure(
      profile.instantiation?.cli_package === f.packageName &&
        profile.instantiation?.metadata_file === f.metadataFile &&
        profile.instantiation?.template_source === f.templateSource,
      "目标 profile 字段矛盾",
      "IDENTITY",
    );
    ensure(
      meta,
      "profile 存在但新版 metadata 缺失，无法建立所有权",
      "BASELINE",
    );
  }
  const projectPath = safe(target, "yss-project.yaml");
  let project = null;
  if (stat(projectPath)) {
    project = yaml(fs.readFileSync(projectPath));
    ensure(
      project.schema_version === 1 &&
        project.repository_mode === "project-instance",
      "仓库 schema 不支持或不是 project-instance",
      "IDENTITY",
    );
    ensure(meta, "已有 Harness 身份但缺少新版 metadata", "BASELINE");
  }
  if (meta)
    ensure(profile && project, "metadata 存在但身份合同缺失", "IDENTITY");
  if (command === "sync")
    ensure(meta, "sync 仅支持新 CLI 创建或 attach 的实例", "BASELINE");
  else ensure(!meta, "已接入该家族，请使用 sync", "IDENTITY");
  return meta;
}
export function guardNestedRepository(target, ref) {
  let current = path.dirname(ref);
  while (current !== ".") {
    ensure(
      !stat(safe(target, `${current}/.git`)),
      `受保护嵌套仓库或 gitlink: ${current}`,
      "PROTECTED",
    );
    current = path.dirname(current);
  }
}
export function gitlinks(target) {
  const paths = [];
  const config = safe(target, ".gitmodules");
  if (stat(config)) {
    const r = spawnSync(
      "git",
      [
        "config",
        "--no-includes",
        "--file",
        config,
        "--get-regexp",
        "^submodule\\..*\\.path$",
      ],
      { encoding: "utf8" },
    );
    ensure(
      [0, 1].includes(r.status),
      `无法解析 .gitmodules: ${r.stderr}`,
      "PROTECTED",
    );
    for (const line of r.stdout.trim().split("\n").filter(Boolean)) {
      const value = line.replace(/^\S+\s+/, "");
      relative(value);
      paths.push(value);
    }
  }
  if (stat(path.join(target, ".git"))) {
    const r = spawnSync(
      "git",
      [
        "--no-optional-locks",
        "-c",
        "core.fsmonitor=false",
        "-C",
        target,
        "ls-files",
        "--stage",
        "-z",
      ],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    ensure(r.status === 0, `无法核验 Git index: ${r.stderr}`, "PROTECTED");
    for (const record of r.stdout.split("\0"))
      if (record.startsWith("160000 ")) {
        const ref = record.slice(record.indexOf("\t") + 1);
        relative(ref);
        paths.push(ref);
      }
  }
  return [...new Set(paths)].sort();
}
// A partially applied init/attach may not have metadata yet. Every identity byte
// that does exist must still belong to this family and to the recorded transaction.
export function recoveryIdentity(target, bundle, state) {
  const f = bundle.family;
  for (const ref of METADATA)
    if (ref !== f.metadataFile)
      ensure(
        !stat(safe(target, ref)),
        "异族 metadata 禁止事务恢复",
        "IDENTITY",
      );
  if (stat(safe(target, f.metadataFile))) identity(target, bundle, "sync");
  else {
    if (stat(safe(target, PROFILE))) {
      const p = yaml(fs.readFileSync(safe(target, PROFILE)));
      ensure(
        p.instantiation?.cli_package !== "repository-local",
        "旧实例不支持恢复或接管",
        "LEGACY",
      );
      ensure(
        p.schema_version === 1 &&
          p.profile_id === f.profileId &&
          p.instantiation?.cli_package === f.packageName &&
          p.instantiation?.metadata_file === f.metadataFile &&
          p.instantiation?.template_source === f.templateSource,
        "恢复 profile 身份矛盾",
        "IDENTITY",
      );
    }
    if (stat(safe(target, "yss-project.yaml"))) {
      const p = yaml(fs.readFileSync(safe(target, "yss-project.yaml")));
      ensure(
        p.schema_version === 1 && p.repository_mode === "project-instance",
        "恢复仓库身份非法",
        "IDENTITY",
      );
    }
  }
  for (const ref of [f.metadataFile, PROFILE, "yss-project.yaml"]) {
    const current = descriptor(target, ref),
      ops = state.pending
        .flatMap((x) => x.journal.operations)
        .filter((x) => x.path === ref);
    if (ops.length)
      ensure(
        ops.some((op) => same(current, op.before) || same(current, op.after)),
        `恢复身份已发生后续修改: ${ref}`,
        "IDENTITY",
      );
  }
}
