import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditLegacyBackendScaffold } from "./legacy-backend-scaffold-audit.mjs";

const rawDigest = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "legacy-scaffold-audit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const generated = "package com.yss.demo;\n";
  const source = "demo-service-server/src/main/java/com/yss/demo/package-info.java";
  await mkdir(path.join(root, path.dirname(source)), { recursive: true });
  await writeFile(path.join(root, source), generated);
  const manifest = {
    schema_version: 3,
    kind: "backend-scaffold",
    completion_level: "empty-scaffold-verified",
    ownership: { generated_files: [{ path: source, owner: "generator", sha256: rawDigest(generated) }] },
  };
  await mkdir(path.join(root, ".yss"));
  await writeFile(path.join(root, ".yss/scaffold-generation.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { root, source };
}

test("未修改的历史 v3 机械骨架可进入恢复对账但不会自动批准", async (t) => {
  const data = await fixture(t);
  const result = await auditLegacyBackendScaffold(data.root);
  assert.equal(result.status, "reconcilable");
  assert.equal(result.ownership_state, "unchanged-mechanical-scaffold");
  assert.equal(result.premature_implementation, false);
  assert.deepEqual(result.generated_file_drift, []);
});

test("额外业务代码保留并标记 premature-implementation-detected", async (t) => {
  const data = await fixture(t);
  const controller = "demo-service-server/src/main/java/com/yss/demo/controller/DemoController.java";
  await mkdir(path.join(data.root, path.dirname(controller)), { recursive: true });
  await writeFile(path.join(data.root, controller), "class DemoController {}\n");
  const result = await auditLegacyBackendScaffold(data.root);
  assert.equal(result.status, "blocked");
  assert.equal(result.ownership_state, "premature-implementation-detected");
  assert.equal(result.premature_implementation, true);
  assert.deepEqual(result.business_files, [controller]);
});

test("历史生成文件摘要漂移时保持 blocked", async (t) => {
  const data = await fixture(t);
  await writeFile(path.join(data.root, data.source), "changed\n");
  const result = await auditLegacyBackendScaffold(data.root);
  assert.equal(result.status, "blocked");
  assert.equal(result.ownership_state, "generated-file-drift");
  assert.equal(result.generated_file_drift[0].path, data.source);
});

test("审计器拒绝将 v4 当作历史恢复输入", async (t) => {
  const data = await fixture(t);
  const manifestFile = path.join(data.root, ".yss/scaffold-generation.json");
  await writeFile(manifestFile, JSON.stringify({ schema_version: 4, ownership: { generated_files: [] } }));
  await assert.rejects(() => auditLegacyBackendScaffold(data.root), /历史 v3/);
});
