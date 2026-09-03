#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const PROFILE_VALUES = ["technical-evidence", "strategy-evidence"];
const SOURCE_LEVELS = ["primary", "direct-experience", "near-primary", "secondary", "lead-only"];
const CLAIM_KINDS = ["technical-fact", "user-problem", "business-constraint", "domain-boundary", "business-rule", "mvp", "non-goal", "success-criterion", "stage-decision-basis", "background"];
const STRATEGY_DECISION_KINDS = new Set(["user-problem", "business-constraint", "domain-boundary", "business-rule", "mvp", "non-goal", "success-criterion", "stage-decision-basis"]);

function fail(message) { throw new TypeError(message); }
function requireString(value, label) { if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`); }
function requireArray(value, label, nonEmpty = false) { if (!Array.isArray(value) || (nonEmpty && value.length === 0)) fail(`${label} must be ${nonEmpty ? "a non-empty" : "an"} array`); }
function requireChoice(value, choices, label) { if (!choices.includes(value)) fail(`${label} must be one of: ${choices.join(", ")}`); }

function indexed(items, label) {
  const result = new Map();
  items.forEach((item, index) => {
    requireString(item?.id, `${label}[${index}].id`);
    if (result.has(item.id)) fail(`${label} contains duplicate id: ${item.id}`);
    result.set(item.id, item);
  });
  return result;
}

function readEvidence(file) {
  try {
    const value = JSON.parse(readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("evidence root must be an object");
    return value;
  } catch (error) {
    if (error instanceof TypeError && error.message === "evidence root must be an object") throw error;
    fail(`${path.basename(file)} must use JSON-compatible YAML 1.2 syntax: ${error.message}`);
  }
}

function validate(briefFile, evidenceFile) {
  if (!briefFile || !evidenceFile) fail("usage: validate-research-package.mjs <brief.md> <evidence.yaml>");
  const briefPath = path.resolve(briefFile);
  const evidencePath = path.resolve(evidenceFile);
  if (path.dirname(briefPath) !== path.dirname(evidencePath)) fail("brief and evidence files must be adjacent");
  if (!briefPath.endsWith("-research-brief.md") || !evidencePath.endsWith("-evidence.yaml")) fail("expected <slug>-research-brief.md and <slug>-evidence.yaml");
  const briefSlug = path.basename(briefPath, "-research-brief.md");
  if (!briefSlug || briefSlug !== path.basename(evidencePath, "-evidence.yaml")) fail("brief and evidence files must use the same non-empty slug");

  const brief = readFileSync(briefPath, "utf8");
  ["Research Scope", "Executive Read", "Findings", "Counter-Signals", "Source Map", "Decision Handoff", "Evidence Limitations"].forEach((heading) => {
    if (!brief.includes(`## ${heading}`)) fail(`brief is missing heading: ## ${heading}`);
  });

  const data = readEvidence(evidencePath);
  if (data.schema_version !== 1) fail("schema_version must be 1");
  requireChoice(data.profile, PROFILE_VALUES, "profile");
  if (data.mode !== "evidence-audited") fail("mode must be evidence-audited");
  ["topic", "audience", "time_horizon"].forEach((field) => requireString(data.scope?.[field], `scope.${field}`));
  ["research_questions", "inclusion_criteria", "exclusion_criteria"].forEach((field) => requireArray(data.scope?.[field], `scope.${field}`, true));
  if (data.ownership?.research_owner !== "yss-research") fail("ownership.research_owner must be yss-research");
  requireString(data.ownership?.downstream_owner, "ownership.downstream_owner");
  if (data.ownership.decision_ref !== null && (typeof data.ownership.decision_ref !== "string" || !data.ownership.decision_ref.trim())) fail("ownership.decision_ref must be null or a non-empty string");

  requireArray(data.search_log, "search_log", true);
  const searches = indexed(data.search_log, "search_log");
  data.search_log.forEach((entry, index) => {
    ["channel", "query_or_corpus", "searched_at"].forEach((field) => requireString(entry[field], `search_log[${index}].${field}`));
    requireChoice(entry.result, ["results-found", "none-found", "access-failed", "excluded"], `search_log[${index}].result`);
  });

  requireArray(data.evidence_items, "evidence_items", true);
  const evidence = indexed(data.evidence_items, "evidence_items");
  data.evidence_items.forEach((item, index) => {
    requireChoice(item.source_level, SOURCE_LEVELS, `evidence_items[${index}].source_level`);
    requireChoice(item.visibility, ["public", "internal"], `evidence_items[${index}].visibility`);
    requireChoice(item.stance, ["support", "counter"], `evidence_items[${index}].stance`);
    ["source_class", "source_ref", "locator", "observed_at", "observation"].forEach((field) => requireString(item[field], `evidence_items[${index}].${field}`));
    requireArray(item.limitations, `evidence_items[${index}].limitations`);
  });

  requireArray(data.claims, "claims", true);
  const claims = indexed(data.claims, "claims");
  data.claims.forEach((claim, index) => {
    requireChoice(claim.claim_kind, CLAIM_KINDS, `claims[${index}].claim_kind`);
    requireString(claim.statement, `claims[${index}].statement`);
    if (typeof claim.decision_bearing !== "boolean") fail(`claims[${index}].decision_bearing must be boolean`);
    requireArray(claim.evidence_refs, `claims[${index}].evidence_refs`, true);
    requireArray(claim.counter_signal_refs, `claims[${index}].counter_signal_refs`, true);
    requireChoice(claim.audit_status, ["supported", "partially-supported", "unsupported", "not-audited"], `claims[${index}].audit_status`);
    requireChoice(claim.confidence, ["low", "medium", "high"], `claims[${index}].confidence`);
    requireChoice(claim.disposition, ["publish", "qualify", "needs-deeper-research"], `claims[${index}].disposition`);

    const supporting = claim.evidence_refs.map((ref) => {
      if (!evidence.has(ref)) fail(`${claim.id} has unresolved evidence ref: ${ref}`);
      const item = evidence.get(ref);
      if (item.stance !== "support") fail(`${claim.id} support ref is not marked support: ${ref}`);
      if (item.source_level === "lead-only") fail(`${claim.id} uses lead-only evidence as support: ${ref}`);
      return item;
    });
    claim.counter_signal_refs.forEach((ref) => {
      if (!evidence.has(ref) && !searches.has(ref)) fail(`${claim.id} has unresolved counter-signal ref: ${ref}`);
      if (evidence.has(ref) && evidence.get(ref).stance !== "counter") fail(`${claim.id} counter-signal evidence is not marked counter: ${ref}`);
      if (searches.has(ref) && searches.get(ref).result !== "none-found") fail(`${claim.id} counter-signal search must have result none-found: ${ref}`);
    });
    if (data.profile === "technical-evidence" && claim.decision_bearing && !supporting.some((item) => item.source_level === "primary")) fail(`${claim.id} is a decision-bearing technical claim without primary evidence`);
    if (data.profile === "strategy-evidence" && STRATEGY_DECISION_KINDS.has(claim.claim_kind) && claim.decision_bearing !== true) fail(`${claim.id} strategy claim kind must be decision-bearing: ${claim.claim_kind}`);
    if (claim.audit_status === "partially-supported" && claim.disposition !== "qualify") fail(`${claim.id} is partially supported and must use qualify`);
    if (claim.audit_status === "unsupported" && claim.disposition !== "needs-deeper-research") fail(`${claim.id} is unsupported and must use needs-deeper-research`);
    if (claim.decision_bearing && claim.audit_status === "unsupported") fail(`${claim.id} is decision-bearing and cannot remain unsupported`);
    if (!brief.includes(claim.id)) fail(`brief does not reference claim: ${claim.id}`);
  });

  requireArray(data.source_gaps, "source_gaps");
  if (data.audit_summary?.status !== "complete") fail("audit_summary.status must be complete");
  requireArray(data.audit_summary.audited_claim_ids, "audit_summary.audited_claim_ids", true);
  requireArray(data.audit_summary.notes, "audit_summary.notes");
  const audited = new Set(data.audit_summary.audited_claim_ids);
  audited.forEach((id) => { if (!claims.has(id)) fail(`audit_summary has unknown claim: ${id}`); });
  claims.forEach((claim, id) => {
    if (claim.decision_bearing && !audited.has(id)) fail(`audit_summary is missing decision-bearing claim: ${id}`);
    if (claim.decision_bearing && claim.audit_status === "not-audited") fail(`${id} remains not-audited`);
  });
  return { claims: claims.size, evidence: evidence.size, searches: searches.size, profile: data.profile };
}

try {
  const result = validate(process.argv[2], process.argv[3]);
  process.stdout.write(`YSS research package valid (${result.profile}, ${result.claims} claims, ${result.evidence} evidence items, ${result.searches} searches)\n`);
} catch (error) {
  process.stderr.write(`YSS research package invalid: ${error.message}\n`);
  process.exitCode = 1;
}
