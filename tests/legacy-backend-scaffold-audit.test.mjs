import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditLegacyBackendScaffold } from "../scripts/lib/legacy-backend-scaffold-audit.mjs";

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

test("退役数据分析 v4 只读审计不授予恢复或流转", async t => {
 const data = await fixture(t);
 const file = path.join(data.root, ".yss/scaffold-generation.json");
 const manifest = JSON.parse(await readFile(file, "utf8"));
 Object.assign(manifest, { schema_version: 4, architecture_profile: "mvc-data-analysis-v1", kind: "service-project-initialization" });
 await writeFile(file, JSON.stringify(manifest));
 const before = await readFile(file);
 const result = await auditLegacyBackendScaffold(data.root);
 assert.equal(result.status, "retired-read-only");
 assert.equal(result.lifecycle_transition_allowed, false);
 assert.deepEqual(await readFile(file), before);
});

for (const family of ['domain-driven', 'layered-mvc']) for (const version of [1, 4]) test(`历史 ${family} v${version} 保留所有权验证且不授予新资格`, async t => {
  const data = await fixture(t), file = path.join(data.root, '.yss/scaffold-generation.json');
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  Object.assign(manifest, { schema_version: version, kind: version === 1 ? 'standalone-backend-scaffold' : 'backend-scaffold', generation_mode: version === 1 ? 'standalone-generation' : 'controlled-generation', architecture_family: family, architecture_profile: family === 'domain-driven' ? 'target-domain-model' : 'layered-mvc-service', source_fingerprint: { generator_digest: 'sha256:' + '1'.repeat(64), verifier_digest: 'sha256:' + '2'.repeat(64) } });
  await writeFile(file, JSON.stringify(manifest));
  const before = await readFile(file), result = await auditLegacyBackendScaffold(data.root);
  assert.equal(result.status, 'read-only-audited');
  assert.equal(result.execution_allowed, false); assert.equal(result.lifecycle_transition_allowed, false); assert.equal(result.platform_requalification, false);
  assert.deepEqual(await readFile(file), before);
  await writeFile(path.join(data.root, data.source), 'tampered');
  assert.equal((await auditLegacyBackendScaffold(data.root)).generated_file_drift[0].reason, 'digest-drift');
  await rm(path.join(data.root, data.source));
  assert.equal((await auditLegacyBackendScaffold(data.root)).generated_file_drift[0].reason, 'missing');
  manifest.reference_example = { enabled: true };
  await writeFile(file, JSON.stringify(manifest));
  await assert.rejects(() => auditLegacyBackendScaffold(data.root), /不得夹带/);
});
