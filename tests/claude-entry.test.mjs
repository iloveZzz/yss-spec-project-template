import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../scripts/vendor/yaml.mjs";
import { PROJECTION_ROOTS } from "../scripts/lib/skill-supply-chain.mjs";
import { collectMetrics } from "../scripts/lib/harness-metrics.mjs";

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

test("FR-006：.claude/skills 是登记的投影根，与 canonical 一一对应且全部为指向 .agents/skills 的符号链接", () => {
  assert.ok(PROJECTION_ROOTS.includes(".claude/skills"));
  const lock = json("skills-lock.json");
  const shared = Object.keys(lock.skills.shared).sort();
  const projected = fs.readdirSync(path.join(ROOT, ".claude/skills")).filter((name) => !name.startsWith(".")).sort();
  assert.deepEqual(projected, shared);
  for (const name of shared) {
    const target = path.join(ROOT, ".claude/skills", name);
    assert.ok(fs.lstatSync(target).isSymbolicLink(), `${name} 应为符号链接`);
    assert.equal(fs.readlinkSync(target), `../../.agents/skills/${name}`);
    assert.equal(fs.realpathSync(target), fs.realpathSync(path.join(ROOT, ".agents/skills", name)));
  }
});

test("注册表与锁在 claude 上一致：运行时、投影根、agent_runtime_roots、lock 的 projectionRoots 与每个技能的 targets", () => {
  assert.ok(registry.instance_distribution.runtimes.includes("claude"));
  assert.equal(registry.instance_distribution.projection_roots.claude, ".claude/skills");
  assert.equal(registry.agent_runtime_roots.claude, ".claude/skills");
  assert.deepEqual(Object.values(registry.instance_distribution.projection_roots).sort(), [...PROJECTION_ROOTS].sort());
  const lock = json("skills-lock.json");
  assert.deepEqual(lock.projectionRoots, PROJECTION_ROOTS);
  for (const [name, item] of Object.entries(lock.skills.shared)) {
    assert.ok(item.targets.includes(".claude/skills"), `${name} 的 targets 缺少 .claude/skills`);
  }
});

test("实例分发：包含 CLAUDE.md 与 .claude 投影，不包含 Stop hook 设置", () => {
  const { manifest } = json(".template-source/distribution/bundle-profile.json");
  assert.ok(manifest.allowRootEntries.includes(".claude"));
  assert.ok(manifest.allowRootFiles.includes("CLAUDE.md"));
  assert.ok(manifest.excludePaths.includes(".claude/settings.json"), "hook 设置只在模板源启用");
  for (const file of ["SKILL.md", "references/data-quality-theme.md"]) {
    assert.ok(manifest.renderPaths.includes(`.claude/skills/yss-design-system/${file}`), `renderPaths 应与其它投影根一样登记 ${file}`);
  }
});

test("harness-metrics 把 .claude/skills 计为投影根：全部符号链接、没有完整副本", () => {
  const claude = collectMetrics(ROOT).projection_roots.find((item) => item.root === ".claude/skills");
  assert.ok(claude, "应统计 .claude/skills");
  assert.equal(claude.full_copies, 0);
  assert.equal(claude.symlinks, Object.keys(json("skills-lock.json").skills.shared).length);
});
