import * as fs from "node:fs";
import { parseDocument } from "./vendor/yaml.mjs";
import { ensure, hash, readJson, safe, governance } from "./io.mjs";
import { familyFor, CHECKS } from './family.mjs';
export const PROFILE = "docs/process/harness-profile.yaml";
export function yaml(bytes) {
  const doc = parseDocument(String(bytes), { uniqueKeys: true });
  ensure(!doc.errors.length, "YAML 不合法");
  const data = doc.toJS({ maxAliasCount: 0 });
  ensure(
    data && typeof data === "object" && !Array.isArray(data),
    "YAML 必须是对象",
  );
  return data;
}
export function loadBundle(root) {
  const pkg = readJson(root, "package.json"),
    family = readJson(root, "config/family.json"),
    snapshot = readJson(root, "template.snapshot.json"),
    core = readJson(root, "cli-core.lock.json");
  const expected = familyFor(family.side);
  for (const [key, value] of Object.entries(expected))
    ensure(
      family[key] === value && snapshot[key] === value,
      `包内身份不一致: ${key}`,
      "IDENTITY",
    );
  ensure(
    pkg.name === family.packageName && snapshot.schemaVersion === 1,
    "包身份或快照 schema 不支持",
    "IDENTITY",
  );
  ensure(
    /^[0-9a-f]{40}$/.test(snapshot.templateCommit) &&
      ["committed", "working-tree"].includes(snapshot.sourceState || "committed") &&
      hash(JSON.stringify(snapshot.files)) === snapshot.snapshotHash,
    "快照摘要或 revision 不一致",
    "BUNDLE",
  );
  ensure(
    hash(fs.readFileSync(safe(root, "template.manifest.json"))) ===
      snapshot.manifestHash,
    "分发清单摘要不一致",
    "BUNDLE",
  );
  const retiredFiles = snapshot.retiredFiles || {};
  ensure(
    (!snapshot.retiredFilesHash && !Object.keys(retiredFiles).length) ||
      hash(JSON.stringify(retiredFiles)) === snapshot.retiredFilesHash,
    "退出分发基线摘要不一致",
    "BUNDLE",
  );
  for (const [ref, item] of Object.entries(retiredFiles)) {
    governance(ref);
    ensure(
      item.type === "file" &&
        [0o644, 0o755].includes(item.mode) &&
        /^[0-9a-f]{64}$/.test(item.digest),
      `退出分发基线不合法: ${ref}`,
      "BUNDLE",
    );
  }
  const transitionBaselines = snapshot.transitionBaselines || {};
  ensure(
    (!snapshot.transitionBaselinesHash && !Object.keys(transitionBaselines).length) ||
      hash(JSON.stringify(transitionBaselines)) === snapshot.transitionBaselinesHash,
    "受管范围迁移基线摘要不一致",
    "BUNDLE",
  );
  for (const [ref, item] of Object.entries(transitionBaselines)) {
    governance(ref);
    ensure(
      snapshot.files[ref] && item.type === "file" &&
        [0o644, 0o755].includes(item.mode) &&
        /^[0-9a-f]{64}$/.test(item.digest),
      `受管范围迁移基线不合法: ${ref}`,
      "BUNDLE",
    );
  }
  ensure(
    core.schemaVersion === 1 &&
      core.protocolVersion === 1 &&
      ["committed", "working-tree"].includes(core.sourceState || "committed") &&
      /^[0-9a-f]{40}$/.test(core.sourceRevision) &&
      /^[0-9a-f]{64}$/.test(core.digest),
    "核心锁不合法",
    "BUNDLE",
  );
  if (core.coreVersion === '0.2.0') ensure(core.files && Object.keys(core.files).length > 0, '核心文件清单缺失', 'BUNDLE');
  for (const [ref, item] of Object.entries(core.files || {})) {
    const file=safe(root, `vendor/cli-core/${ref}`);
    ensure(hash(fs.readFileSync(file))===item.digest && (fs.statSync(file).mode & 0o111 ? 0o755 : 0o644)===item.mode, `核心文件漂移: ${ref}`, 'BUNDLE');
  }
  if (Object.keys(core.files || {}).length) ensure(hash(JSON.stringify(core.files))===core.digest, '核心清单摘要不一致', 'BUNDLE');
  const manifest = readJson(root, "template.manifest.json");
  const files = new Map();
  const blobs = new Map();
  for (const [ref, item] of Object.entries(snapshot.files)) {
    governance(ref);
    ensure(!(manifest.instanceForbiddenPaths || []).some(p=>ref===p || ref.startsWith(p+"/")), `快照含家族禁止分发路径: ${ref}`, "BUNDLE");
    ensure(
      item.type === "file" &&
        [0o644, 0o755].includes(item.mode) &&
        item.blob === `blobs/${item.digest}` &&
        /^[0-9a-f]{64}$/.test(item.digest),
      `快照类型/编码非法: ${ref}`,
      "BUNDLE",
    );
    let bytes = blobs.get(item.digest);
    if (!bytes) {
      bytes = fs.readFileSync(safe(root, `template/${item.blob}`));
      ensure(hash(bytes) === item.digest, `快照内容摘要不一致: ${ref}`, "BUNDLE");
      blobs.set(item.digest, bytes);
    }
    files.set(ref, {
      bytes: Buffer.from(bytes),
      baseline: { type: "file", digest: item.digest, mode: item.mode },
    });
  }
  for (const ref of [
    "README.md",
    "AGENTS.md",
    "CONTEXT.md",
    "yss-project.yaml",
    PROFILE,
  ])
    ensure(files.has(ref), `缺少必需合同: ${ref}`, "BUNDLE");
  const profile = yaml(files.get(PROFILE).bytes),
    identity = yaml(files.get("yss-project.yaml").bytes);
  ensure(
    identity.schema_version === 1 &&
      identity.repository_mode === "template-source",
    "包内不是模板源",
    "IDENTITY",
  );
  ensure(
    [1, 2].includes(profile.schema_version) &&
      profile.profile_id === family.profileId &&
      (family.side === "design" || (profile.instantiation?.cli_package === family.packageName &&
      profile.instantiation?.metadata_file === family.metadataFile &&
      profile.instantiation?.template_source === family.templateSource)),
    "模板 profile 与包身份矛盾",
    "IDENTITY",
  );
  if (files.has("skills-lock.json")) for (const [, ref] of CHECKS) ensure(files.has(ref), `缺少实例校验器: ${ref}`, "BUNDLE");
  return {
    root,
    pkg,
    family,
    snapshot,
    core,
    manifest,
    retiredFiles,
    transitionBaselines,
    files,
  };
}
export function render(bundle, variables) {
  const result = new Map();
  for (const [ref, item] of bundle.files) {
    if (
      !variables.includeExampleDocs &&
      bundle.manifest.exampleDocPaths?.some(
        (x) => ref === x || ref.startsWith(x + "/"),
      )
    )
      continue;
    let bytes = item.bytes;
    if (ref === "yss-project.yaml")
      bytes = Buffer.from(
        "schema_version: 1\nrepository_mode: project-instance\n",
      );
    else if (ref === "README.md")
      bytes = Buffer.from(
        `# ${variables.projectName}\n\n本仓是 \`${bundle.family.profileId}\` 的 \`project-instance\`。\n\n先读 [AGENTS.md](AGENTS.md)、[CONTEXT.md](CONTEXT.md) 与 [profile](docs/process/harness-profile.yaml)。\n\n业务领域：${variables.businessDomain}\n团队规模：${variables.teamSize}\n`,
      );
    if (bundle.family.side === "design" && ref === "AGENTS.md")
      bytes = Buffer.from(bytes.toString().replace("**项目名称：** [填写]", () => `**项目名称：** ${variables.projectName}`).replace("**业务领域：** [填写]", () => `**业务领域：** ${variables.businessDomain}`).replace("**团队规模：** [填写]", () => `**团队规模：** ${variables.teamSize}`));
    if (ref === "docs/agents/issue-tracker.md")
      bytes = Buffer.from(
        bytes
          .toString()
          .replace(
            "platform: local-markdown",
            `platform: ${variables.issueTracker}`,
          )
          .replace(
            "| `platform` | `local-markdown` |",
            `| \`platform\` | \`${variables.issueTracker}\` |`,
          ),
      );
    result.set(ref, {
      bytes,
      baseline: { ...item.baseline, digest: hash(bytes) },
    });
  }
  return result;
}
