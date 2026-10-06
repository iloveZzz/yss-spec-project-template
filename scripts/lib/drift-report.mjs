import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { SHA256, createIdentityProvider, identityEquals, parseIdentity, sha256Identity } from "./content-identity.mjs";
import { nativeInstalledSkillRefs } from "./instance-metadata.mjs";

// Records written by create-yss-spec historically store a bare sha256 hex in
// contentHash. Normalize bare digests to their algorithm-tagged identity so the
// comparison is by algorithm and value, never by string shape alone.
export function normalizeRecordedIdentity(value) {
  if (typeof value !== "string") return null;
  if (parseIdentity(value)) return value;
  if (/^[0-9a-f]{64}$/.test(value)) return "sha256:" + value;
  if (/^[0-9a-f]{40}$/.test(value)) return "git-sha1:" + value;
  return value;
}

export const DRIFT_EXIT = { clean: 0, drift: 1, usage: 2, environment: 3 };

// Classify every recorded managed asset. "not-installed" means nothing was ever
// recorded for an expected asset, "missing" means it was recorded and is now
// gone, "drifted" means it was recorded and its content changed.
export function classifyManagedFiles({ root, managedFiles = {}, expected = [], provider = null, allowCustomizations = false, contentValidatedRefs = [] } = {}) {
  const identity = provider || createIdentityProvider(root);
  const entries = [];
  const recorded = new Set(Object.keys(managedFiles));
  for (const [ref, record] of Object.entries(managedFiles).sort(([left], [right]) => (left < right ? -1 : 1))) {
    const customizable = allowCustomizations && record.ownership === "managed-customizable";
    // A consumer may have a separate semantic content validator. This waives
    // only raw digest equality; physical type, readability and mode still apply.
    const contentValidated = contentValidatedRefs.includes(ref);
    const expectedIdentity = customizable || contentValidated ? null : normalizeRecordedIdentity(record.lastApplied?.digest ?? record.identity ?? record.contentHash ?? null);
    const { info, error: pathError } = inspectManagedPath(root, ref);
    if (pathError) {
      entries.push({ ref, kind: "drifted", expected: expectedIdentity, actual: null, error: pathError });
      continue;
    }
    if (!info) { entries.push({ ref, kind: "missing", expected: expectedIdentity, actual: null }); continue; }
    if (!info.isFile()) {
      entries.push({ ref, kind: "drifted", expected: expectedIdentity, actual: null,
        error: customizable ? "customizable-asset-must-be-file" : "managed-asset-must-be-file" });
      continue;
    }
    if (record.lastApplied && canonicalManagedMode(info.mode) !== canonicalManagedMode(record.lastApplied.mode)) {
      entries.push({ ref, kind: "drifted", expected: expectedIdentity, actual: null,
        expected_mode: canonicalManagedMode(record.lastApplied.mode), actual_mode: canonicalManagedMode(info.mode), error: "managed-asset-mode-changed" });
      continue;
    }
    // Customization permits different file content, not missing, unreadable or
    // replaced paths. Generated assets continue to require their recorded hash.
    // Compare like with like: a recorded sha256 digest must be matched against a
    // freshly computed sha256, never against a differently-versioned Git identity.
    const parsed = parseIdentity(expectedIdentity);
    // A directory, a broken symlink or an unreadable path must surface as drift,
    // never as an uncaught exception.
    let actual = null;
    let error = null;
    try {
      // A cached Git identity cannot prove that a permitted custom file is
      // currently readable. Read its actual bytes before accepting it.
      actual = customizable || contentValidated || (parsed && parsed.algo === SHA256) ? sha256Identity(readFileSync(path.join(root, ref))) : identity.identityFor(ref).identity;
    } catch (cause) { actual = null; error = cause.message; }
    if (!expectedIdentity) { entries.push({ ref, kind: error || ((customizable || contentValidated) && actual === null) ? "drifted" : "ok", expected: null, actual, ...(contentValidated ? { content_validation: "external" } : {}), ...(error ? { error } : {}) }); continue; }
    const kind = identityEquals(expectedIdentity, actual) ? "ok" : "drifted";
    const diagnosis = error ?? (actual === null ? "unreadable-or-unresolved" : null);
    entries.push({ ref, kind, expected: expectedIdentity, actual, ...(diagnosis ? { error: diagnosis } : {}) });
  }
  for (const ref of [...expected].sort()) {
    if (recorded.has(ref) || existsSync(path.join(root, ref))) continue;
    entries.push({ ref, kind: "not-installed", expected: null, actual: null });
  }
  const summary = { ok: 0, not_installed: 0, missing: 0, drifted: 0, obsolete: 0 };
  for (const entry of entries) {
    const key = entry.kind === "not-installed" ? "not_installed" : entry.kind;
    summary[key] += 1;
  }
  return { entries, summary };
}

export function buildDriftReport({ scope, root, provider = null, managedFiles = {}, expected = [], asOf = new Date().toISOString(), allowCustomizations = false, contentValidatedRefs = [] } = {}) {
  if (!["template-source", "project-instance"].includes(scope)) throw new TypeError("未知 drift-report scope: " + scope);
  const identity = provider || createIdentityProvider(root);
  const { entries, summary } = classifyManagedFiles({ root, managedFiles, expected, provider: identity, allowCustomizations: scope === "project-instance" && allowCustomizations, contentValidatedRefs });
  return {
    schema_version: 1,
    kind: "drift-report",
    as_of: asOf,
    scope,
    identity: { algo: identity.algo, source: identity.available ? "index" : "sha256-fallback" },
    entries,
    summary,
  };
}

export function driftReportExit(report) {
  return report.summary.missing || report.summary.drifted || report.summary.obsolete || report.summary.not_installed
    ? DRIFT_EXIT.drift
    : DRIFT_EXIT.clean;
}

function short(value) {
  return typeof value === "string" ? value.slice(0, 18) : String(value);
}

export function formatDriftReport(report) {
  const lines = ["drift-report [" + report.scope + "] identity=" + report.identity.algo + "/" + report.identity.source];
  for (const entry of report.entries) {
    if (entry.kind === "ok") continue;
    const detail = entry.expected ? " (expected " + short(entry.expected) + ", actual " + short(entry.actual) + ")" : "";
    lines.push("  " + entry.kind + ": " + entry.ref + detail);
  }
  lines.push("  summary: ok=" + report.summary.ok + " not-installed=" + report.summary.not_installed + " missing=" + report.summary.missing + " drifted=" + report.summary.drifted + " obsolete=" + report.summary.obsolete);
  return lines.join("\n");
}

// Expected assets the distribution says should exist but that were never recorded.
export function expectedFromDistribution(metadata = {}, { native = false, skillLock = null, platformSkills = [], platformManifests = {} } = {}) {
  if (native) return nativeInstalledSkillRefs(metadata, skillLock, { platformSkills, platformManifests });
  const expected = [];
  for (const skill of metadata.distribution?.installedSkills ?? []) expected.push(".agents/skills/" + skill);
  return expected;
}

function lstatSafe(target) {
  try { return lstatSync(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function inspectManagedPath(root, ref) {
  const parts = typeof ref === "string" ? ref.split("/") : [];
  if (!parts.length || path.isAbsolute(ref) || ref.includes("\\") || parts.some(part => !part || part === "." || part === ".." || part.toLowerCase() === ".git")) {
    return { info: null, error: "managed-asset-path-outside-root" };
  }
  let cursor = root;
  try {
    for (let index = 0; index < parts.length; index++) {
      cursor = path.join(cursor, parts[index]);
      const info = lstatSafe(cursor);
      if (!info) return { info: null, error: null };
      if (index === parts.length - 1) return { info, error: null };
      if (!info.isDirectory() || info.isSymbolicLink()) {
        return { info: null, error: "managed-asset-parent-must-be-directory" };
      }
    }
  } catch (cause) { return { info: null, error: cause.message }; }
}

// Match native Descriptor permissions: Windows exposes only the owner write
// bit (read-only attribute); Unix retains the recorded permission bits.
export function canonicalManagedMode(mode, platform = process.platform) {
  return platform === "win32" ? (mode & 0o200 ? 0o644 : 0o444) : mode & 0o777;
}
