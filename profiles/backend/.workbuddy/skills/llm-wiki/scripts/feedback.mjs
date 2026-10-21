#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, safePath, sha256, json, fail, args, cliError, assertReadable } from "./core.mjs";
import { createPlan, applyPlan } from "./transaction.mjs";
async function feedbackPlan({ wikiRoot, repoRoot = process.cwd(), request }) {
  await assertReadable(wikiRoot);
  const manifest = await loadManifest(wikiRoot, { repoRoot });
  if (manifest.schemaVersion !== 2) fail("MIGRATION_REQUIRED", "feedback requires v2");
  manifest.feedback ||= [];
  const a = manifest.articles.find((a2) => a2.id === request.articleId);
  if (!a) fail("UNKNOWN_ARTICLE_ID", request.articleId);
  const text = await readFile(await safePath(wikiRoot, a.file), "utf8"), digest = sha256(text), existing = manifest.feedback.find((f) => f.id === request.id);
  if (!request.id || !request.issue || !request.locator?.quote) fail("FEEDBACK_INVALID", "id, issue and quoted locator required");
  if (request.targetDigest !== digest) fail("FEEDBACK_REANCHOR_REQUIRED", "target changed; locate quoted text on current version");
  const index = text.indexOf(request.locator.quote);
  if (index < 0 || text.indexOf(request.locator.quote, index + 1) >= 0) fail("FEEDBACK_REANCHOR_REQUIRED", "quote must match exactly once");
  const state = request.status || "open";
  if (!["open", "accepted", "partial", "rejected", "deferred"].includes(state)) fail("FEEDBACK_INVALID", "status");
  const record = { id: request.id, articleId: a.id, targetDigest: digest, locator: { quote: request.locator.quote, startLine: text.slice(0, index).split("\n").length }, issue: request.issue, status: state, history: existing?.history || [] };
  if (existing && existing.articleId !== a.id) fail("FEEDBACK_ID_CONFLICT", request.id);
  if (["accepted", "partial"].includes(state)) {
    const r = request.resolution;
    if (!existing || !r?.transactionId || r.beforeDigest !== existing.targetDigest || r.afterDigest !== digest || r.beforeDigest === r.afterDigest || !r.note) fail("FEEDBACK_EVIDENCE_REQUIRED", "actual change and verification required");
    const j = JSON.parse(await readFile(await safePath(wikiRoot, `.wiki-staging/${r.transactionId}/completed.json`), "utf8"));
    if (j.phase !== "finalized" || !j.writes?.some((w) => w.path === a.file && w.before === r.beforeDigest && w.after === r.afterDigest) || a.verification?.articleDigest !== digest) fail("FEEDBACK_EVIDENCE_REQUIRED", "completed article modification and verified compilation required");
    record.resolution = r;
  } else if (state !== "open") {
    if (!request.resolution?.note) fail("FEEDBACK_EVIDENCE_REQUIRED", "disposition reason required");
    record.resolution = request.resolution;
  }
  const comparable = (f) => JSON.stringify({ ...f, history: void 0 });
  if (existing && comparable(existing) === comparable(record)) return { duplicate: true, id: record.id };
  if (existing && existing.status === "open" && state === "open" && existing.issue !== record.issue) fail("FEEDBACK_ID_CONFLICT", "existing feedback differs");
  record.history = [...record.history, { at: request.at || (/* @__PURE__ */ new Date()).toISOString(), status: state, targetDigest: digest }];
  if (existing) manifest.feedback[manifest.feedback.indexOf(existing)] = record;
  else manifest.feedback.push(record);
  return createPlan({ wikiRoot, repoRoot, request: { operation: "feedback", manifest, authorization: { confirmed: request.confirmed === true, paths: [".wiki-manifest.json", "wiki/log.md"] } } });
}
async function main() {
  const a = args(process.argv.slice(2));
  if (!a.wiki || !a.request) fail("USAGE", "--wiki --request [--apply]");
  const options = { wikiRoot: path.resolve(a.repo, a.wiki), repoRoot: path.resolve(a.repo) };
  const plan = await feedbackPlan({ ...options, request: JSON.parse(await readFile(a.request, "utf8")) });
  process.stdout.write(json(a.apply && !plan.duplicate ? await applyPlan({ ...options, plan }) : plan));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(cliError);
export {
  feedbackPlan
};
