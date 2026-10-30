import {contextExecution, decodeContext} from '../../scripts/lib/native-context.mjs';
import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "yss-context-reconciliation-")));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));
const native = contextExecution(repoRoot);
const initialized = spawnSync(native.file, ["init", "--profile", "backend", "--root", root, "--json"], { cwd: repoRoot, encoding: "utf8" });
if (initialized.status !== 0) throw new Error(initialized.stderr || initialized.stdout);
mkdirSync(path.join(root, "docs", "evidence"), { recursive: true });
writeFileSync(path.join(root, "CONTEXT.md"), `---
context_schema_version: 1
---

# CONTEXT

## 流程术语

| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
| 阶段 | 生命周期阶段 | — | |

## 业务术语

| 术语 | 含义 | 英文标识 | 适用限界上下文 | 避免 / 备注 |
|---|---|---|---|---|
| 供应商 | 提供产品或服务的主体 | Supplier | Global | |
| 准入结论 | 合规审查的准入结果 | AdmissionDecision | ComplianceReview | |
`);

function run(command, args) {

  return spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
}

const snapshotResult = nativeContext(["--root", root, "--allowed-context", "ComplianceReview", "--term-ref", "Global/Supplier", "--term-ref", "ComplianceReview/AdmissionDecision", "--json"]);
if (snapshotResult.status !== 0) throw new Error(snapshotResult.stderr || snapshotResult.stdout);
const snapshot = JSON.parse(snapshotResult.stdout).context_snapshot;

function record(overrides = {}) {
  return {
    schema_version: 1,
    repository_mode: "project-instance",
    stage: "stage.plan",
    work_unit: "work-unit.domain-strategy-design",
    status: "reconciled",
    context_snapshot: snapshot,
    changes: { added: ["Global/Supplier", "ComplianceReview/AdmissionDecision"], updated: [], deprecated: [] },
    unresolved_terms: [],
    evidence_refs: ["CONTEXT.md"],
    ...overrides,
  };
}

function verify(name, value, expectedStatus, targetRoot = root, expectedCode = "") {
  const file = path.join(targetRoot, "docs", "evidence", `${name}.json`);
  writeFileSync(file, JSON.stringify(value, null, 2));
  const protectedRefs = ["yss-project.yaml", "CONTEXT.md", ...(existsSync(path.join(targetRoot, ".yss.json")) ? [".yss.json"] : [])];
  const before = new Map(protectedRefs.map(ref => [ref, readFileSync(path.join(targetRoot, ref))]));
  const result = run("scripts/verify-context-reconciliation", ["--root", targetRoot, file]);
  if (result.status !== expectedStatus || (expectedCode && !`${result.stdout}${result.stderr}`.includes(`${expectedCode}:`))) {
    throw new Error(`${name}: expected ${expectedStatus} ${expectedCode}, got ${result.status}\n${result.stdout}${result.stderr}`);
  }
  for (const ref of protectedRefs) {
    if (!readFileSync(path.join(targetRoot, ref)).equals(before.get(ref))) throw new Error(`${name}: 验证修改了 ${ref}`);
  }
}

verify("valid", record(), 0);
verify("stale", record({ context_snapshot: { ...snapshot, document_digest: `sha256:${"0".repeat(64)}` } }), 1, root, "CONTEXT_DRIFT");
verify("blocked", record({ status: "blocked", unresolved_terms: [{ term: "准入状态", reason: "英文标识未确认", owner: "product-owner", next_action: "确认命名" }] }), 1, root, "CONTEXT");
verify("missing-term", record({ changes: { added: ["ComplianceReview/Unknown"], updated: [], deprecated: [] } }), 1, root, "CONTEXT_REFERENCE");
verify("not-applicable-project", record({ status: "not-applicable", reason: "无术语变化" }), 1, root, "CONTEXT");

const specRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "yss-context-spec-")));
process.on("exit", () => rmSync(specRoot, { recursive: true, force: true }));
const specInit = spawnSync(native.file, ["init", "--profile", "spec", "--root", specRoot, "--json"], { cwd: repoRoot, encoding: "utf8" });
if (specInit.status !== 0) throw new Error(specInit.stderr || specInit.stdout);
mkdirSync(path.join(specRoot, "docs", "evidence"), { recursive: true });
writeFileSync(path.join(specRoot, "CONTEXT.md"), readFileSync(path.join(root, "CONTEXT.md")));
verify("spec-legacy-command-not-applicable", record(), 1, specRoot, "SPEC_COMMAND_NOT_APPLICABLE");

const sourceRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "yss-context-source-")));
process.on("exit", () => rmSync(sourceRoot, { recursive: true, force: true }));
mkdirSync(path.join(sourceRoot, "docs", "evidence"), { recursive: true });
cpSync(path.join(repoRoot, ".template-spec"), path.join(sourceRoot, ".template-spec"), { recursive: true });
writeFileSync(path.join(sourceRoot, "yss-project.yaml"), readFileSync(path.join(repoRoot, "yss-project.yaml")));
writeFileSync(path.join(sourceRoot, "CONTEXT.md"), readFileSync(path.join(repoRoot, "CONTEXT.md")));
const sourceSnapshotResult = nativeContext(["--root", sourceRoot, "--json"], "");
if (sourceSnapshotResult.status !== 0) throw new Error(sourceSnapshotResult.stderr || sourceSnapshotResult.stdout);
const sourceSnapshot = JSON.parse(sourceSnapshotResult.stdout).context_snapshot;
verify("template-source", record({ repository_mode: "template-source", status: "not-applicable", reason: "模板源仅校验 CONTEXT.md 结构", context_snapshot: sourceSnapshot, changes: { added: [], updated: [], deprecated: [] } }), 0, sourceRoot);

process.stdout.write("Context reconciliation scenarios passed\n");

function nativeContext(args, profile = "backend") {
 const ex=contextExecution(repoRoot,[...args,...(profile ? ["--profile", profile] : [])]);
 const res=spawnSync(ex.file,ex.args,{cwd:ex.cwd,encoding:'utf8'});
 if(res.status===0)res.stdout=JSON.stringify(decodeContext(res));
 return res;
}
