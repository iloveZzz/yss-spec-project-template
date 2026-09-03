#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validator = path.join(root, "scripts/validate-research-package.mjs");
const template = JSON.parse(readFileSync(path.join(root, "assets/evidence-template.yaml"), "utf8"));
const directory = mkdtempSync(path.join(tmpdir(), "product-design-research-"));
const brief = path.join(directory, "sample-research-brief.md");
const evidence = path.join(directory, "sample-evidence.yaml");
const requiredHeadings = ["Research Scope", "Executive Read", "Ranked UX Problems", "Source Map", "Opportunity Map", "Evidence Limitations"];

function run(payload, expectedStatus, expectedText) {
  writeFileSync(brief, `${requiredHeadings.map((heading) => `## ${heading}`).join("\n\n")}\n\n${payload.claims.map((claim) => claim.id).join(" ")}\n`);
  writeFileSync(evidence, `${JSON.stringify(payload, null, 2)}\n`);
  const result = spawnSync(process.execPath, [validator, brief, evidence], { encoding: "utf8" });
  if (result.status !== expectedStatus || !`${result.stdout}${result.stderr}`.includes(expectedText)) {
    throw new Error(`expected status ${expectedStatus} containing ${expectedText}, got ${result.status}: ${result.stdout}${result.stderr}`);
  }
}

try {
  template.scope.product = "Example";
  template.scope.audience = "Administrators";
  template.scope.time_horizon = "Last 90 days";
  template.scope.research_questions = ["Where does onboarding fail?"];
  template.scope.inclusion_criteria = ["Direct experience in scope"];
  template.scope.exclusion_criteria = ["Unverifiable reposts"];
  template.search_log[0].channel = "GitHub Issues";
  template.search_log[0].query_or_corpus = "onboarding failure";
  template.search_log[0].searched_at = "2026-09-03";
  template.search_log[1].channel = "GitHub Issues";
  template.search_log[1].query_or_corpus = "onboarding completed successfully";
  template.search_log[1].searched_at = "2026-09-03";
  template.evidence_items[0].source_class = "issue";
  template.evidence_items[0].source_ref = "https://example.com/issues/1";
  template.evidence_items[0].locator = "comment-1";
  template.evidence_items[0].observed_at = "2026-09-03";
  template.evidence_items[0].evidence_date = "2026-09-01";
  template.evidence_items[0].observation = "A user reports that setup stopped before completion.";
  template.claims[0].severity = "medium";
  template.claims[0].statement = "At least one user encountered an onboarding blocker.";
  run(template, 0, "research package valid");

  const unsupported = structuredClone(template);
  unsupported.claims[0].audit_status = "unsupported";
  unsupported.claims[0].disposition = "publish";
  run(unsupported, 1, "must use needs-deeper-research");

  const unresolved = structuredClone(template);
  unresolved.claims[0].evidence_refs = ["evidence-missing"];
  run(unresolved, 1, "unresolved evidence ref");

  const falseCounter = structuredClone(template);
  falseCounter.claims[0].counter_signal_refs = ["search-001"];
  run(falseCounter, 1, "counter-signal search must have result none-found");

  const incompleteHighSeverity = structuredClone(template);
  incompleteHighSeverity.claims[0].severity = "high";
  run(incompleteHighSeverity, 1, "high severity but is missing audited claim kinds");

  const lowerSeverityWithoutPrimary = structuredClone(template);
  lowerSeverityWithoutPrimary.evidence_items[0].source_level = "secondary";
  run(lowerSeverityWithoutPrimary, 1, "lower severity but has no primary supporting evidence");

  process.stdout.write("research package scenarios passed (6)\n");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
