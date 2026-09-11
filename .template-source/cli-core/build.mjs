// Build-time only: source revisions are resolved before reading any distribution bytes.
import * as fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import {
  ensure,
  hash,
  json,
  relative,
  governance,
  safe,
  write,
  readJson,
} from "./io.mjs";
import { yaml, PROFILE, loadBundle } from "./bundle.mjs";
const CORE_PATH = ".template-source/cli-core";
function archive(source, ref, consume, paths = []) {
  const revision = execFileSync(
    "git",
    ["-C", source, "rev-parse", `${ref === "WORKTREE" ? "HEAD" : ref}^{commit}`],
    { encoding: "utf8" },
  ).trim();
  ensure(/^[a-f0-9]{40}$/.test(revision), "source revision 必须是完整提交");
  if (ref === "WORKTREE") {
    return consume(fs.realpathSync(source), revision, "working-tree");
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "harness-source-"));
  try {
    const tar = execFileSync("git", ["-C", source, "archive", revision, ...paths], {
      maxBuffer: 256 * 1024 * 1024,
    });
    execFileSync("tar", ["-xf", "-", "-C", scratch], { input: tar });
    return consume(fs.realpathSync(scratch), revision, "committed");
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
function inventory(root) {
  const files = {};
  function walk(dir) {
    for (const entry of fs
      .readdirSync(path.join(root, dir), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const ref = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(ref);
      else {
        ensure(entry.isFile(), `核心不允许链接: ${ref}`);
        files[ref] = {
          digest: hash(fs.readFileSync(path.join(root, ref))),
          mode: fs.statSync(path.join(root, ref)).mode & 0o111 ? 0o755 : 0o644,
        };
      }
    }
  }
  walk("");
  return Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
}
export function verifyCore(packageRoot) {
  const lock = readJson(packageRoot, "cli-core.lock.json");
  ensure(
    lock.schemaVersion === 1 &&
      lock.protocolVersion === 1 &&
      ["committed", "working-tree"].includes(lock.sourceState || "committed") &&
      /^[a-f0-9]{40}$/.test(lock.sourceRevision),
    "核心锁格式错误",
  );
  const files = inventory(path.join(packageRoot, "vendor/cli-core"));
  ensure(
    JSON.stringify(files) === JSON.stringify(lock.files) &&
      hash(JSON.stringify(files)) === lock.digest,
    "vendor/cli-core 漂移",
  );
  ensure(
    readJson(packageRoot, "vendor/cli-core/package.json").version ===
      lock.coreVersion,
    "核心版本漂移",
  );
  return lock;
}
export function syncCore(source, ref, packageRoot, check = false) {
  return archive(source, ref, (root, revision, sourceState) => {
    const sourceRoot = path.join(root, CORE_PATH),
      files = inventory(sourceRoot),
      coreVersion = readJson(sourceRoot, "package.json").version;
    const lock = {
      schemaVersion: 1,
      sourceRepository:
        "https://github.com/iloveZzz/yss-spec-project-template.git",
      sourceRevision: revision,
      sourceState,
      sourcePath: CORE_PATH,
      coreVersion,
      protocolVersion: 1,
      files,
      digest: hash(JSON.stringify(files)),
    };
    if (check) {
      ensure(
        json(readJson(packageRoot, "cli-core.lock.json")) === json(lock),
        "核心来源锁漂移",
      );
      verifyCore(packageRoot);
      return lock;
    }
    fs.rmSync(path.join(packageRoot, "vendor/cli-core"), {
      recursive: true,
      force: true,
    });
    for (const [ref, entry] of Object.entries(files))
      write(
        packageRoot,
        `vendor/cli-core/${ref}`,
        fs.readFileSync(path.join(sourceRoot, ref)),
        entry.mode,
      );
    write(packageRoot, "cli-core.lock.json", json(lock));
    return lock;
  }, [CORE_PATH]);
}
function selected(ref, m) {
  const top = ref.split("/")[0],
    prefix = (p, base) => p === base || p.startsWith(base + "/");
  return (
    ((m.allowRootEntries || []).includes(top) ||
      (m.allowRootFiles || []).includes(ref) ||
      (m.allowFiles || []).includes(ref)) &&
    ![
      ...(m.excludeRootEntries || []),
      ...(m.initExcludeRootEntries || []),
    ].includes(top) &&
    ![
      ...(m.excludeRootFiles || []),
      ...(m.initExcludeRootFiles || []),
    ].includes(ref) &&
    ![...(m.excludePaths || []), ...(m.initExcludePaths || [])].some((x) =>
      prefix(ref, x),
    ) &&
    ref !== "scripts/instantiate-harness"
  );
}
export function syncTemplate(source, ref, packageRoot, check = false) {
  return archive(source, ref, (root, revision, sourceState) => {
    const profile = yaml(fs.readFileSync(path.join(root, PROFILE))),
      identity = yaml(fs.readFileSync(path.join(root, "yss-project.yaml")));
    ensure(
      identity.schema_version === 1 &&
        identity.repository_mode === "template-source",
      "来源不是 template-source",
    );
    const side = profile.profile_id?.match(
      /^harness\.(backend|frontend)-delivery$/,
    )?.[1];
    ensure(side, "来源不是专职模板");
    const family = {
      side,
      packageName: `create-yss-harness-${side}`,
      profileId: profile.profile_id,
      metadataFile: profile.instantiation.metadata_file,
      templateName: `yss-harness-${side}-agent`,
      templateSource: profile.instantiation.template_source,
    };
    ensure(
      readJson(packageRoot, "package.json").name === family.packageName &&
        profile.instantiation.cli_package === family.packageName,
      "来源 profile 与薄包身份不一致",
    );
    const manifestBytes = fs.readFileSync(
        safe(root, profile.instantiation.distribution_manifest),
      ),
      manifest = JSON.parse(manifestBytes),
      entries = {},
      blobs = new Map(),
      canonical = path.join(root, ".agents/skills"),
      captured = new Map();
    function capture(physical, logical, ancestors = []) {
      relative(logical);
      const s = fs.lstatSync(physical);
      if (s.isSymbolicLink()) {
        const link = fs.readlinkSync(physical),
          resolved = fs.realpathSync(physical);
        ensure(
          !path.isAbsolute(link) &&
            resolved.startsWith(canonical + path.sep) &&
            /^\.(agents|claude|codex|cursor|pi|qoder|trae)\/skills\//.test(
              logical,
            ),
          `不允许的投影链接: ${logical}`,
        );
        ensure(!ancestors.includes(resolved), "投影链接循环");
        return capture(resolved, logical, [...ancestors, resolved]);
      }
      if (s.isDirectory()) {
        for (const name of fs.readdirSync(physical).sort()) {
          if (name === ".DS_Store") continue;
          capture(path.join(physical, name), `${logical}/${name}`, ancestors);
        }
        return;
      }
      if (!selected(logical, manifest)) return;
      governance(logical);
      ensure(s.isFile(), `未知分发类型: ${logical}`);
      let content = captured.get(physical);
      if (!content) {
        const bytes = fs.readFileSync(physical);
        content = { bytes, digest: hash(bytes) };
        captured.set(physical, content);
      }
      const { bytes, digest } = content;
      entries[logical] = {
        type: "file",
        digest,
        mode: s.mode & 0o111 ? 0o755 : 0o644,
        blob: `blobs/${digest}`,
      };
      blobs.set(digest, bytes);
    }
    for (const name of fs.readdirSync(root).sort())
      if (selected(name, manifest)) capture(path.join(root, name), name);
    // Explicit allowFiles may lie below an otherwise excluded directory.
    for (const ref of manifest.allowFiles || [])
      if (fs.existsSync(safe(root, ref))) capture(safe(root, ref), ref);
    const files = Object.fromEntries(
      Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    const snapshot = {
      schemaVersion: 1,
      ...family,
      templateCommit: revision,
      sourceState,
      manifestHash: hash(manifestBytes),
      files,
      snapshotHash: hash(JSON.stringify(files)),
      projectionRepresentation: "materialized-files",
      pathEncoding: "sha256-blobs-v1",
    };
    if (check) {
      ensure(
        json(readJson(packageRoot, "template.snapshot.json")) ===
          json(snapshot),
        "模板来源快照漂移",
      );
      loadBundle(packageRoot);
      return snapshot;
    }
    fs.rmSync(path.join(packageRoot, "template"), {
      recursive: true,
      force: true,
    });
    for (const [digest, bytes] of blobs)
      write(packageRoot, `template/blobs/${digest}`, bytes);
    write(packageRoot, "template.manifest.json", manifestBytes);
    write(packageRoot, "template.snapshot.json", json(snapshot));
    write(packageRoot, "config/family.json", json(family));
    return snapshot;
  });
}
