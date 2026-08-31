import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseDocument, stringify } from "../vendor/yaml.mjs";

const MAGIC = Buffer.from("YSS-WORKTREE-CANDIDATE-V1\0", "ascii");
const MAX_BUFFER = 512 * 1024 * 1024;
const MAINTENANCE_EVIDENCE_ROOT = ".template-source/evidence/maintenance";
const CANDIDATE_FILES = ["candidate-manifest.yaml", "candidate.bin", "tracked.diff"];

function fail(message) { throw new TypeError(message); }
function ensure(condition, message) { if (!condition) fail(message); }
function git(args, root, encoding = "utf8") {
  const result = spawnSync("git", args, { cwd: root, encoding, maxBuffer: MAX_BUFFER });
  if (result.status !== 0) fail((typeof result.stderr === "string" ? result.stderr : result.stderr?.toString()).trim() || `git ${args.join(" ")} 执行失败`);
  return result.stdout;
}
function uint64(value) { const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(value)); return buffer; }
function uint32(value) { const buffer = Buffer.alloc(4); buffer.writeUInt32BE(value >>> 0); return buffer; }
function splitNull(buffer) {
  const result = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) if (buffer[index] === 0) { if (index > start) result.push(buffer.subarray(start, index)); start = index + 1; }
  if (start < buffer.length) result.push(buffer.subarray(start));
  return result;
}
function normalizeRelative(value, label) {
  ensure(typeof value === "string" && value.trim(), `${label} 不能为空`);
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  ensure(normalized && !path.posix.isAbsolute(normalized) && path.posix.normalize(normalized) === normalized && normalized !== ".." && !normalized.startsWith("../"), `${label} 必须是规范的仓库内相对路径`);
  return normalized;
}
function isMaintenanceEvidencePath(value) {
  return value === MAINTENANCE_EVIDENCE_ROOT || value.startsWith(`${MAINTENANCE_EVIDENCE_ROOT}/`);
}
function readLength(buffer, offset, bytes, label) {
  ensure(offset + bytes <= buffer.length, `packed candidate 缺少 ${label}`);
  const value = bytes === 8 ? buffer.readBigUInt64BE(offset) : BigInt(buffer.readUInt32BE(offset));
  ensure(value <= BigInt(Number.MAX_SAFE_INTEGER), `packed candidate ${label} 过大`);
  return { value: Number(value), offset: offset + bytes };
}

export function captureMaintenanceCandidate({ root, outputDir, baseRef = "HEAD", excludePaths = [] }) {
  const repositoryRoot = path.resolve(root);
  const outputPath = path.resolve(repositoryRoot, outputDir);
  const outputRelative = normalizeRelative(path.relative(repositoryRoot, outputPath).replaceAll(path.sep, "/"), "outputDir");
  ensure(isMaintenanceEvidencePath(outputRelative), `outputDir 必须位于 ${MAINTENANCE_EVIDENCE_ROOT}`);
  ensure(!existsSync(outputPath), "outputDir 必须不存在，禁止复用可能含残留文件的候选目录");
  ensure(Array.isArray(excludePaths), "excludePaths 必须是数组");
  const explicitExclusions = excludePaths.map((value) => normalizeRelative(value, "excludePaths"));
  for (const exclusion of explicitExclusions) ensure(isMaintenanceEvidencePath(exclusion), `excludePaths 只允许 ${MAINTENANCE_EVIDENCE_ROOT} 下的维护证据`);
  const exclusions = [...new Set([outputRelative, ...explicitExclusions])];
  const mergeBase = git(["merge-base", baseRef, "HEAD"], repositoryRoot).trim();
  const trackedDiff = git(["diff", "--no-ext-diff", "--binary", "--full-index", mergeBase], repositoryRoot, null);
  const rawPaths = splitNull(git(["ls-files", "-z", "--others", "--exclude-standard"], repositoryRoot, null))
    .filter((rawPath) => {
      const value = rawPath.toString();
      return !exclusions.some((exclusion) => value === exclusion || value.startsWith(`${exclusion}/`));
    })
    .sort(Buffer.compare);
  ensure(trackedDiff.length > 0 || rawPaths.length > 0, "维护候选不能为空");

  const parts = [MAGIC, Buffer.from([0x54]), uint64(trackedDiff.length), trackedDiff];
  const untrackedFiles = [];
  const untrackedPathBytes = [];
  for (const rawPath of rawPaths) {
    ensure(!rawPath.includes(0) && rawPath.length > 0, "untracked path 无效");
    const relative = rawPath.toString();
    const absolute = path.resolve(repositoryRoot, relative);
    ensure(!path.relative(repositoryRoot, absolute).startsWith(".."), `untracked path 越界: ${relative}`);
    const stat = lstatSync(absolute);
    let kind;
    let content;
    if (stat.isFile()) { kind = 0x52; content = readFileSync(absolute); }
    else if (stat.isSymbolicLink()) { kind = 0x4c; content = readlinkSync(absolute, { encoding: "buffer" }); }
    else fail(`候选包含不支持的 untracked 类型: ${relative}`);
    parts.push(Buffer.from([0x55]), uint64(rawPath.length), rawPath, uint32(stat.mode), Buffer.from([kind]), uint64(content.length), content);
    untrackedFiles.push(relative);
    untrackedPathBytes.push(rawPath.toString("base64"));
  }
  const stream = Buffer.concat(parts);
  const digest = createHash("sha256").update(stream).digest("hex");
  const streamRef = `${outputRelative}/candidate.bin`;
  const diffRef = `${outputRelative}/tracked.diff`;
  const manifestRef = `${outputRelative}/candidate-manifest.yaml`;
  const manifest = {
    schema_version: 1,
    candidate_kind: "yss-worktree-candidate-v1",
    storage: "packed-stream",
    review_mode: "worktree",
    review_base_ref: baseRef,
    merge_base: mergeBase,
    implementation_candidate_ref: "working-tree",
    candidate_snapshot_ref: manifestRef,
    candidate_digest: digest,
    tracked_diff_command: `git diff --no-ext-diff --binary --full-index ${mergeBase}`,
    untracked_inventory_command: "git ls-files -z --others --exclude-standard",
    untracked_diff_command: "packed in candidate.bin",
    untracked_files: untrackedFiles,
    untracked_path_bytes: untrackedPathBytes,
    excluded_paths: exclusions,
    snapshot_stream_ref: streamRef,
    tracked_diff_ref: diffRef,
    commit_list_command: `git log ${baseRef}..HEAD --oneline`
  };
  const outputParent = path.dirname(outputPath);
  mkdirSync(outputParent, { recursive: true });
  const stagingPath = mkdtempSync(path.join(outputParent, ".candidate-staging-"));
  try {
    writeFileSync(path.join(stagingPath, "candidate.bin"), stream);
    writeFileSync(path.join(stagingPath, "tracked.diff"), trackedDiff);
    writeFileSync(path.join(stagingPath, "candidate-manifest.yaml"), stringify(manifest, { lineWidth: 0 }));
    renameSync(stagingPath, outputPath);
  } finally {
    if (existsSync(stagingPath)) rmSync(stagingPath, { recursive: true, force: true });
  }
  return { candidate_digest: digest, manifest, manifest_ref: manifestRef, files: [manifestRef, streamRef, diffRef] };
}

export function inspectMaintenanceCandidate({ manifestPath }) {
  const absoluteManifest = path.resolve(manifestPath);
  const document = parseDocument(readFileSync(absoluteManifest, "utf8"), { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "candidate manifest 无法解析");
  const manifest = document.toJS({ maxAliasCount: 0 });
  ensure(manifest.storage === "packed-stream", "只支持 packed-stream candidate");
  const candidateDir = path.dirname(absoluteManifest);
  ensure(JSON.stringify(readdirSync(candidateDir).sort()) === JSON.stringify([...CANDIDATE_FILES].sort()), `packed candidate 目录必须恰好包含 ${CANDIDATE_FILES.join("、")}`);
  const root = path.resolve(path.dirname(absoluteManifest), ...Array(manifest.candidate_snapshot_ref.split("/").length - 1).fill(".."));
  ensure(path.resolve(root, manifest.candidate_snapshot_ref) === absoluteManifest, "candidate_snapshot_ref 未绑定当前 manifest");
  const streamPath = path.resolve(root, manifest.snapshot_stream_ref);
  const diffPath = path.resolve(root, manifest.tracked_diff_ref);
  ensure(streamPath === path.join(candidateDir, "candidate.bin") && diffPath === path.join(candidateDir, "tracked.diff"), "packed candidate 引用必须绑定同目录规范文件");
  const stream = readFileSync(streamPath);
  ensure(createHash("sha256").update(stream).digest("hex") === manifest.candidate_digest.replace(/^sha256:/, ""), "candidate_digest 与 packed stream 不一致");
  ensure(stream.subarray(0, MAGIC.length).equals(MAGIC), "packed stream magic 无效");
  let offset = MAGIC.length;
  ensure(stream[offset] === 0x54, "packed stream 缺少 tracked record");
  offset += 1;
  let length = readLength(stream, offset, 8, "tracked length");
  offset = length.offset;
  const trackedDiff = stream.subarray(offset, offset + length.value);
  offset += length.value;
  ensure(readFileSync(diffPath).equals(trackedDiff), "tracked.diff 与 packed stream 不一致");
  const entries = [];
  while (offset < stream.length) {
    ensure(stream[offset] === 0x55, "packed stream record kind 无效");
    offset += 1;
    length = readLength(stream, offset, 8, "path length"); offset = length.offset;
    const rawPath = stream.subarray(offset, offset + length.value); offset += length.value;
    length = readLength(stream, offset, 4, "mode"); offset = length.offset;
    const mode = length.value;
    const kind = stream[offset]; offset += 1;
    length = readLength(stream, offset, 8, "content length"); offset = length.offset;
    const content = stream.subarray(offset, offset + length.value); offset += length.value;
    entries.push({ path: rawPath.toString(), path_bytes: rawPath.toString("base64"), mode, kind: kind === 0x52 ? "regular" : "symlink", content });
  }
  ensure(JSON.stringify(entries.map((entry) => entry.path_bytes)) === JSON.stringify(manifest.untracked_path_bytes), "manifest inventory 与 packed stream 不一致");
  return { manifest, trackedDiff, entries };
}
