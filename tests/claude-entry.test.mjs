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

test("FR-006：.claude/skills 保留原投影行为，与 canonical 一一对应且全部为指向 .agents/skills 的符号链接", () => {
  // Claude Code 只从 .claude/skills 发现项目技能，不读 .agents/skills，所以必须保留这一投影。
  assert.deepEqual(PROJECTION_ROOTS, [".claude/skills", ".codebuddy/skills"]);
  for (const old of [".codex/skills", ".cursor/skills", ".pi/skills"]) assert.equal(fs.existsSync(path.join(ROOT, old)), false, `${old} 不应存在`);
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
  assert.ok(!read("scripts/fixtures/contract-efficiency/distribution-smoke.mjs").includes(".codex/skills"));
});

test("注册表与锁在 claude 上一致：运行时、投影根、agent_runtime_roots、lock 的 projectionRoots 与每个技能的 targets", () => {
  assert.deepEqual(registry.instance_distribution.runtimes, ["claude", "workbuddy"]);
  assert.deepEqual(registry.instance_distribution.projection_roots, { claude: ".claude/skills", workbuddy: ".codebuddy/skills" });
  assert.deepEqual(registry.agent_runtime_roots, { claude: ".claude/skills", workbuddy: ".codebuddy/skills" });
  const lock = json("skills-lock.json");
  assert.deepEqual(lock.projectionRoots, PROJECTION_ROOTS);
  assert.deepEqual(lock.skills.platform, {});
  for (const [name, item] of Object.entries(lock.skills.shared)) assert.deepEqual(item.targets, [".agents/skills", ".claude/skills", ".codebuddy/skills"], `${name} 的 targets 应为 canonical 与 .claude/skills`);
});

test("实例分发：包含 CLAUDE.md 与 .claude 投影，不包含 Stop hook 设置", () => {
  const { manifest } = json(".template-source/distribution/bundle-profile.json");
  assert.ok(manifest.allowRootEntries.includes(".claude"));
  assert.ok(manifest.allowRootFiles.includes("CLAUDE.md"));
  assert.ok(manifest.excludePaths.includes(".claude/settings.json"), "hook 设置只在模板源启用");
  assert.ok(!manifest.excludePaths.includes(".claude/skills"), ".claude/skills 必须随实例分发");
  for (const file of ["SKILL.md", "references/data-quality-theme.md"]) {
    assert.ok(manifest.renderPaths.includes(`.claude/skills/yss-design-system/${file}`), `renderPaths 应与 canonical 一样登记 ${file}`);
  }
});
