import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../scripts/vendor/yaml.mjs";
import { PROJECTION_ROOTS } from "../scripts/lib/skill-supply-chain.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));
const registry = parseDocument(read(".template-spec/agents/yss-skill-registry.yaml"), { uniqueKeys: true, maxAliasCount: 0 }).toJS({ maxAliasCount: 0 });

test("FR-006：根目录 CLAUDE.md 只导入 AGENTS.md 并带一行说明，不复制流程", () => {
  const lines = read("CLAUDE.md").split("\n").filter((line) => line.trim());
  assert.equal(lines[0], "@AGENTS.md");
  assert.equal(lines.length, 2, "只允许导入行与一行说明");
  assert.ok(lines.every((line) => line === "@AGENTS.md" || !line.includes("@")), "不得再导入其它文件");
});

test("FR-006/AC-006：没有任何投影根，.agents/skills 是唯一技能目录，旧投影目录不存在", () => {
  assert.deepEqual(PROJECTION_ROOTS, []);
  for (const old of [".claude/skills", ".codex/skills", ".cursor/skills", ".pi/skills"]) assert.equal(fs.existsSync(path.join(ROOT, old)), false, `${old} 不应存在`);
  assert.deepEqual(registry.instance_distribution.runtimes, []);
  assert.deepEqual(registry.instance_distribution.projection_roots, {});
  assert.deepEqual(registry.agent_runtime_roots, {});
  const lock = json("skills-lock.json");
  assert.deepEqual(lock.projectionRoots, []);
  assert.deepEqual(lock.skills.platform, {});
  for (const [name, item] of Object.entries(lock.skills.shared)) assert.deepEqual(item.targets, [".agents/skills"], `${name} 的 targets 只能是 .agents/skills`);
  assert.ok(!read("scripts/fixtures/contract-efficiency/distribution-smoke.mjs").includes(".codex/skills"));
});

test("实例分发：包含 CLAUDE.md，不包含 Stop hook 设置，也不再登记任何投影路径", () => {
  const { manifest } = json(".template-source/distribution/bundle-profile.json");
  assert.ok(manifest.allowRootEntries.includes(".claude"));
  assert.ok(manifest.allowRootFiles.includes("CLAUDE.md"));
  assert.ok(manifest.excludePaths.includes(".claude/settings.json"), "hook 设置只在模板源启用");
  assert.deepEqual([...manifest.renderPaths, ...manifest.excludePaths].filter((ref) => /^\.(claude|codex|cursor|pi)\/skills\//.test(ref)), []);
});
