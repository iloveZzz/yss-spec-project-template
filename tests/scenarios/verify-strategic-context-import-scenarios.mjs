// 退役说明场景（AR-11）：scripts/verify-strategic-context-import 已退役，只剩指向替代入口的说明且必须失败退出，
// 不能被误当成「校验通过」。冻结的旧覆盖清单仍按旧名引用本场景，所以保留文件。
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const run = spawnSync(process.execPath, [path.join(repoRoot, "scripts/verify-strategic-context-import"), "--root", repoRoot, "--reconciliation", "x.json", "handoff.yaml"], { encoding: "utf8" });
assert.equal(run.status, 1, "已退役的入口必须失败退出");
assert.equal(run.stdout, "", "不得输出任何通过信息");
for (const replacement of ["scripts/verify-strategic-handoff-consumption", "scripts/verify-context-reconciliation", "scripts/strategic-handoff verify --bundle"]) {
  assert.match(run.stderr, new RegExp(replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `退役说明必须指向 ${replacement}`);
}
process.stdout.write("strategic context import 已退役：入口失败退出并指向替代入口\n");
