import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("退役入口拒绝旧数据库和 Mock，不作静默别名", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./generate_project.mjs", import.meta.url)), "--database", "oracle", "--with-mock"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /deprecated.*yss-mvc-data-analysis-project-initializer/);
});
