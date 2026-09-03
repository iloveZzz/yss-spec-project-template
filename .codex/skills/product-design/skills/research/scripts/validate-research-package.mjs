#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const SOURCE_LEVELS = ["primary", "direct-experience", "near-primary", "secondary", "lead-only"];

function fail(message) {
  throw new TypeError(message);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`);
}

function requireArray(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) fail(`${label} must be ${nonEmpty ? "a non-empty" : "an"} array`);
}

function uniqueIds(items, label) {
  const ids = new Set();
  items.forEach((item, index) => {
    requireString(item?.id, `${label}[${index}].id`);
    if (ids.has(item.id)) fail(`${label} contains duplicate id: ${item.id}`);
    ids.add(item.id);
  });
  return ids;
}

function requireChoice(value, choices, label) {
  if (!choices.includes(value)) fail(`${label} must be one of: ${choices.join(", ")}`);
}

function parseEvidence(file) {
  let value;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.basename(file)} must use JSON-compatible YAML 1.2 syntax: ${error.message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("evidence root must be an object");
  return value;
}

function validate(briefFile, evidenceFile) {
  if (!briefFile || !evidenceFile) fail("usage: validate-research-package.mjs <brief.md> <evidence.yaml>");
  const briefPath = path.resolve(briefFile);
  const evidencePath = path.resolve(evidenceFile);
  if (path.dirname(briefPath) !== path.dirname(evidencePath)) fail("brief and evidence files must be adjacent");
  if (!briefPath.endsWith("-research-brief.md") || !evidencePath.endsWith("-evidence.yaml")) fail("expected <slug>-research-brief.md and <slug>-evidence.yaml");
  const briefSlug = path.basename(briefPath, "-research-brief.md");
  const evidenceSlug = path.basename(evidencePath, "-evidence.yaml");
  if (!briefSlug || briefSlug !== evidenceSlug) fail("brief and evidence files must use the same non-empty slug");

  const brief = readFileSync(briefPath, "utf8");
  const headings = ["Research Scope", "Executive Read", "Ranked UX Problems", "Source Map", "Opportunity Map", "Evidence Limitations"];
  headings.forEach((heading) => {
    if (!brief.includes(`## ${heading}`)) fail(`brief is missing heading: ## ${heading}`);
  });

  const evidence = parseEvidence(evidencePath);
  if (evidence.schema_version !== 1) fail("schema_version must be 1");
  if (evidence.mode !== "evidence-audited") fail("mode must be evidence-audited");
  ["product", "audience", "time_horizon"].forEach((field) => requireString(evidence.scope?.[field], `scope.${field}`));
  ["research_questions", "inclusion_criteria", "exclusion_criteria"].forEach((field) => requireArray(evidence.scope?.[field], `scope.${field}`, { nonEmpty: true }));

  requireArray(evidence.search_log, "search_log", { nonEmpty: true });
  const searchIds = uniqueIds(evidence.search_log, "search_log");
  const searchesById = new Map(evidence.search_log.map((entry) => [entry.id, entry]));
  evidence.search_log.forEach((entry, index) => {
    ["channel", "query_or_corpus", "searched_at"].forEach((field) => requireString(entry[field], `search_log[${index}].${field}`));
    requireChoice(entry.result, ["results-found", "none-found", "access-failed", "excluded"], `search_log[${index}].result`);
  });

  requireArray(evidence.evidence_items, "evidence_items", { nonEmpty: true });
  const evidenceIds = uniqueIds(evidence.evidence_items, "evidence_items");
  const evidenceById = new Map(evidence.evidence_items.map((item) => [item.id, item]));
  evidence.evidence_items.forEach((item, index) => {
    requireChoice(item.source_level, SOURCE_LEVELS, `evidence_items[${index}].source_level`);
    requireChoice(item.visibility, ["public", "internal"], `evidence_items[${index}].visibility`);
    requireChoice(item.stance, ["support", "counter"], `evidence_items[${index}].stance`);
    ["source_class", "source_ref", "locator", "observed_at", "observation", "freshness"].forEach((field) => requireString(item[field], `evidence_items[${index}].${field}`));
    requireArray(item.limitations, `evidence_items[${index}].limitations`);
  });

  requireArray(evidence.claims, "claims", { nonEmpty: true });
  const claimIds = uniqueIds(evidence.claims, "claims");
  const highKinds = new Map();
  const lowerSeverityPrimary = new Map();
  evidence.claims.forEach((claim, index) => {
    ["problem_id", "statement"].forEach((field) => requireString(claim[field], `claims[${index}].${field}`));
    requireChoice(claim.claim_kind, ["problem-exists", "impact", "frequency", "recommended-move"], `claims[${index}].claim_kind`);
    requireChoice(claim.severity, ["low", "medium", "high", "critical"], `claims[${index}].severity`);
    requireChoice(claim.frequency_signal, ["measured", "repeated-independent", "anecdotal", "unknown"], `claims[${index}].frequency_signal`);
    requireChoice(claim.confidence, ["low", "medium", "high"], `claims[${index}].confidence`);
    requireChoice(claim.audit_status, ["supported", "partially-supported", "unsupported", "not-audited"], `claims[${index}].audit_status`);
    requireChoice(claim.disposition, ["publish", "qualify", "needs-deeper-research"], `claims[${index}].disposition`);
    requireArray(claim.evidence_refs, `claims[${index}].evidence_refs`, { nonEmpty: true });
    requireArray(claim.counter_signal_refs, `claims[${index}].counter_signal_refs`, { nonEmpty: true });
    const supporting = claim.evidence_refs.map((ref) => {
      if (!evidenceIds.has(ref)) fail(`${claim.id} has unresolved evidence ref: ${ref}`);
      const item = evidenceById.get(ref);
      if (item.stance !== "support") fail(`${claim.id} support ref is not marked support: ${ref}`);
      if (item.source_level === "lead-only") fail(`${claim.id} uses lead-only evidence as support: ${ref}`);
      return item;
    });
    claim.counter_signal_refs.forEach((ref) => {
      if (!evidenceIds.has(ref) && !searchIds.has(ref)) fail(`${claim.id} has unresolved counter-signal ref: ${ref}`);
      if (evidenceIds.has(ref) && evidenceById.get(ref).stance !== "counter") fail(`${claim.id} counter-signal evidence is not marked counter: ${ref}`);
      if (searchIds.has(ref) && searchesById.get(ref).result !== "none-found") fail(`${claim.id} counter-signal search must have result none-found: ${ref}`);
    });
    if (claim.audit_status === "unsupported" && claim.disposition !== "needs-deeper-research") fail(`${claim.id} is unsupported and must use needs-deeper-research`);
    if (claim.audit_status === "partially-supported" && claim.disposition !== "qualify") fail(`${claim.id} is partially supported and must use qualify`);
    if (["high", "critical"].includes(claim.severity)) {
      const kinds = highKinds.get(claim.problem_id) ?? new Set();
      kinds.add(claim.claim_kind);
      highKinds.set(claim.problem_id, kinds);
    } else {
      lowerSeverityPrimary.set(claim.problem_id, (lowerSeverityPrimary.get(claim.problem_id) ?? false) || supporting.some((item) => item.source_level === "primary"));
    }
    if (!brief.includes(claim.id)) fail(`brief does not reference key claim: ${claim.id}`);
  });

  const requiredHighKinds = ["problem-exists", "impact", "frequency", "recommended-move"];
  highKinds.forEach((kinds, problemId) => {
    const missing = requiredHighKinds.filter((kind) => !kinds.has(kind));
    if (missing.length) fail(`${problemId} is high severity but is missing audited claim kinds: ${missing.join(", ")}`);
  });
  lowerSeverityPrimary.forEach((hasPrimary, problemId) => {
    if (!hasPrimary) fail(`${problemId} is lower severity but has no primary supporting evidence`);
  });

  requireArray(evidence.source_gaps, "source_gaps");
  if (evidence.audit_summary?.status !== "complete") fail("audit_summary.status must be complete");
  requireArray(evidence.audit_summary.audited_claim_ids, "audit_summary.audited_claim_ids", { nonEmpty: true });
  const audited = new Set(evidence.audit_summary.audited_claim_ids);
  audited.forEach((id) => { if (!claimIds.has(id)) fail(`audit_summary has unknown claim: ${id}`); });
  claimIds.forEach((id) => { if (!audited.has(id)) fail(`audit_summary is missing claim: ${id}`); });
  evidence.claims.forEach((claim) => { if (claim.audit_status === "not-audited") fail(`${claim.id} remains not-audited`); });
  requireArray(evidence.audit_summary.notes, "audit_summary.notes");
  return { claims: claimIds.size, evidence_items: evidenceIds.size, searches: searchIds.size };
}

try {
  const result = validate(process.argv[2], process.argv[3]);
  process.stdout.write(`research package valid (${result.claims} claims, ${result.evidence_items} evidence items, ${result.searches} searches)\n`);
} catch (error) {
  process.stderr.write(`research package invalid: ${error.message}\n`);
  process.exitCode = 1;
}
