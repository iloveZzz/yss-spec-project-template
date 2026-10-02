#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const ROOT = process.cwd();
const ROUND = ".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement";
const ARCH = "/Users/zhudaoming/Documents/yss-template-evidence-archive";
const BATCHES = [
  { id: "2026-10-02-b1-profile-verification", plan: "P2 pilot", units: [".template-source/evidence/maintenance/2026-09-12-existing-project-delivery/preflight"], reason: "已被后续轮次取代的只读预检与分发回归运行材料；sync09 聚合原件按 P2 试点整体归档，sync10 历史重放脚本随原相对目录保留可恢复性。" },
  { id: "2026-10-02-b2-lifecycle-core-optimization", plan: "P3a", units: [".template-source/evidence/maintenance/2026-09-28-lifecycle-core-optimization"], reason: "已闭环但带验证阻断的交付轮次；大型来源包、成员清单、失败与完整 Agent 轨迹整体归档，未完成边界不当作已解决。" },
  { id: "2026-10-02-b3-plan-spec-inputs", plan: "P3b", units: [".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/continuation-live-attempt", ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/continuation-snapshot-preparation", ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/task-verification"], reason: "被后续 continuation-verification 取代的旧输入快照与运行报告；保留 continuation-verification 作为当前 checkpoint 绑定的验证闭包，以及 human-evaluation.md 表示的人工反馈未完成状态。" },
];
const batches = BATCHES.map((b) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ARCH, b.id + ".manifest.json"), "utf8"));
  const verify = JSON.parse(fs.readFileSync(path.join(ROUND, "p1", b.id + ".verify.json"), "utf8"));
  const disposition = JSON.parse(fs.readFileSync(path.join(ROUND, "p1", b.id + ".disposition.json"), "utf8"));
  const present = manifest.members.filter((m) => fs.existsSync(path.join(ROOT, m.path))).length;
  return {
    batch: b.id, phase: b.plan, units: b.units, dispositionReason: b.reason,
    memberCount: manifest.memberCount, memberBytes: manifest.memberBytes,
    archive: path.join(ARCH, manifest.archive), archiveSha256: manifest.archive_sha256, archiveBytes: manifest.archive_bytes,
    verify: { result: verify.result, checked: verify.checked, problems: verify.problems.length, report: verify.report },
    hardReferencesAtPlan: disposition.blockers.hardReferences.length,
    softReferencesAtPlan: disposition.softReferences.length,
    stillPresentAfterRemoval: present,
    restore: "tar -xzf " + manifest.archive + " -C <repo root>",
    memberDispositions: manifest.members.map((m) => ({ path: m.path, bytes: m.bytes, sha256: m.sha256, mode: m.mode, disposition: "full-archive" })),
  };
});
const after = JSON.parse(fs.readFileSync(path.join(ROUND, "p1", "inventory-after.json"), "utf8"));
const record = {
  schema: "yss.machine-evidence-retirement-record/v1",
  executed_at_utc: new Date().toISOString(),
  repository_mode: "template-source",
  head: after.head,
  intensity: "L2（新增非核心校验工具、模板源本地规则与历史材料归档；未改变生成语义、分发内容或批准语义）",
  archiveLocation: ARCH,
  archiveIndex: ".template-source/evidence/archive-index.json",
  tool: ".template-source/scripts/evidence-archive",
  toolTests: { command: "node --test .template-source/scripts/tests/evidence-archive.test.mjs", tests: 14, result: "pass" },
  baseline: { machineFiles: 2396, machineBytes: 98318361, evidenceFilesIndexed: 14864, evidenceBytes: 588855054 },
  after: { machineFiles: after.totals.machineFiles, machineBytes: after.totals.machineBytes, evidencePresent: after.totals.present, evidencePendingDeletion: after.totals.pendingDeletion, evidenceBytes: after.totals.trackedBytes },
  delta: {
    machineFiles: after.totals.machineFiles - 2396,
    machineBytes: after.totals.machineBytes - 98318361,
    machinePercent: Number((((after.totals.machineBytes - 98318361) / 98318361) * 100).toFixed(2)),
    evidenceFiles: after.totals.present - 14864,
    evidenceBytes: after.totals.trackedBytes - 588855054,
    duplicateGroups: { before: 78, after: after.duplicateSummary.groups },
    duplicateExtraCopies: { before: 306, after: after.duplicateSummary.extraCopies },
  },
  batches,
  retained: [
    ".template-source/evidence/maintenance/2026-09-12-existing-project-delivery/maven-adapters-04.json（模板分发字面引用，保留可读）",
    ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/continuation-verification/（当前 checkpoint 绑定的验证闭包）",
    ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/maintenance-checkpoint.yaml、human-evaluation.md（当前状态与人工反馈未完成）",
    "所有归档成员的原字节；归档不销毁、不改写历史结论",
  ],
  openItems: [
    "P4：新生成规则需在至少一个后续真实维护任务中观察，登记新机器文件数量、体积与人工维护步骤。",
    "P1：归档位置为维护者本机路径；共享获取方式与访问责任尚未登记，其他机器不可直接访问。",
    "C4：306 个字节重复副本未在归档存储中做跨包去重，重复清点仍在。",
    "Git 提交、推送与发布尚未执行，工作树中的删除未暂存。",
  ],
};
fs.writeFileSync(path.join(ROOT, ROUND, "p1", "batch-record.json"), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ batches: batches.map((b) => ({ batch: b.batch, members: b.memberCount, bytes: b.memberBytes, archiveBytes: b.archiveBytes, verify: b.verify.result, stillPresent: b.stillPresentAfterRemoval })), delta: record.delta }, null, 2));
