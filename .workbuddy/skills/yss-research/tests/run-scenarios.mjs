#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts/validate-research-package.mjs");
const template = JSON.parse(readFileSync(path.join(root, "assets/evidence-template.yaml"), "utf8"));
const directory = mkdtempSync(path.join(tmpdir(), "yss-research-"));
const brief = path.join(directory, "sample-research-brief.md");
const evidence = path.join(directory, "sample-evidence.yaml");
const headings = ["Research Scope", "Executive Read", "Findings", "Counter-Signals", "Source Map", "Decision Handoff", "Evidence Limitations"];

function run(payload, status, expected) {
  writeFileSync(brief, `${headings.map((heading) => `## ${heading}`).join("\n\n")}\n\n${payload.claims.map((claim) => claim.id).join(" ")}\n`);
  writeFileSync(evidence, `${JSON.stringify(payload, null, 2)}\n`);
  const result = spawnSync(process.execPath, [validator, brief, evidence], { encoding: "utf8" });
  if (result.status !== status || !`${result.stdout}${result.stderr}`.includes(expected)) throw new Error(`expected ${status}/${expected}, got ${result.status}: ${result.stdout}${result.stderr}`);
}

try {
  template.scope.topic = "Example strategy question";
  template.scope.audience = "Product team";
  template.scope.time_horizon = "Last 12 months";
  template.scope.research_questions = ["Which problem should the domain address?"];
  template.scope.inclusion_criteria = ["Direct experience in scope"];
  template.scope.exclusion_criteria = ["Untraceable reposts"];
  template.ownership.downstream_owner = "yss-stage-decision";
  template.search_log[0].channel = "Support records";
  template.search_log[0].query_or_corpus = "failed approval workflow";
  template.search_log[0].searched_at = "2026-09-03";
  template.search_log[1].channel = "Support records";
  template.search_log[1].query_or_corpus = "successful approval workflow";
  template.search_log[1].searched_at = "2026-09-03";
  template.evidence_items[0].source_class = "support";
  template.evidence_items[0].source_ref = "support-case-001";
  template.evidence_items[0].locator = "event-3";
  template.evidence_items[0].observed_at = "2026-09-03";
  template.evidence_items[0].evidence_date = "2026-08-30";
  template.evidence_items[0].observation = "The approval stopped when the owner was missing.";
  template.evidence_items[0].limitations = ["Single support case"];
  template.claims[0].statement = "A missing owner can block the approval workflow.";
  run(template, 0, "YSS research package valid");

  const falseStrategyBackground = structuredClone(template);
  falseStrategyBackground.claims[0].decision_bearing = false;
  run(falseStrategyBackground, 1, "strategy claim kind must be decision-bearing");

  const unsupported = structuredClone(template);
  unsupported.claims[0].audit_status = "unsupported";
  unsupported.claims[0].disposition = "publish";
  run(unsupported, 1, "must use needs-deeper-research");

  const unsupportedDecision = structuredClone(template);
  unsupportedDecision.claims[0].audit_status = "unsupported";
  unsupportedDecision.claims[0].disposition = "needs-deeper-research";
  run(unsupportedDecision, 1, "decision-bearing and cannot remain unsupported");

  const falseCounter = structuredClone(template);
  falseCounter.claims[0].counter_signal_refs = ["search-001"];
  run(falseCounter, 1, "counter-signal search must have result none-found");

  const technicalWithoutPrimary = structuredClone(template);
  technicalWithoutPrimary.profile = "technical-evidence";
  technicalWithoutPrimary.claims[0].claim_kind = "technical-fact";
  run(technicalWithoutPrimary, 1, "technical claim without primary evidence");

  const leadOnly = structuredClone(template);
  leadOnly.evidence_items[0].source_level = "lead-only";
  run(leadOnly, 1, "uses lead-only evidence as support");

  const unaudited = structuredClone(template);
  unaudited.audit_summary.audited_claim_ids = [];
  run(unaudited, 1, "must be a non-empty array");

  process.stdout.write("YSS research scenarios passed (8)\n");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
