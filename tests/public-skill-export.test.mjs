import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exportSkills } from "../scripts/lib/export-skills.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function temp(t, prefix) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function frontmatter(name) {
  return "---\nname: " + name + "\ndescription: Fixture skill for public export tests\n---\n\n# " + name + "\n";
}

function fixtureRoot(t, { body = frontmatter("Fixture Skill"), name = "yss-fixture-skill" } = {}) {
  const root = temp(t, "yss-export-fixture-");
  write(path.join(root, "yss-public-skills.json"), JSON.stringify({
    repository: "https://example.invalid/fixture",
    canonical_root: ".agents/skills",
    skills: [name],
    groupings: [{ title: "Fixture", description: "Fixture grouping", skills: [name] }],
  }, null, 2) + "\n");
  write(path.join(root, ".agents/skills", name, "SKILL.md"), body);
  return root;
}

function output(t, prefix) {
  return path.join(temp(t, prefix), "public");
}

test("真实 canonical 技能可构建完整公开导出并通过 --check", (t) => {
  const out = output(t, "yss-export-output-");
  const built = exportSkills(["--output", out]);
  assert.match(built, /Exported 27 YSS skills/);
  assert.ok(fs.existsSync(path.join(out, "skills.sh.json")));
  assert.ok(fs.existsSync(path.join(out, ".yss-export-manifest.json")));
  assert.equal(fs.readdirSync(path.join(out, "skills")).length, 27);
  assert.match(exportSkills(["--output", out, "--check"]), /up to date/);
});

test("越界链接阻断公开导出", (t) => {
  const root = fixtureRoot(t, { body: frontmatter("Fixture Skill") + "\n[escape](../../outside.md)\n" });
  assert.throws(() => exportSkills(["--output", output(t, "yss-export-escape-")], { root }), /link escapes public export/);
});

test("失效内部链接阻断公开导出", (t) => {
  const root = fixtureRoot(t, { body: frontmatter("Fixture Skill") + "\n[broken](missing.md)\n" });
  assert.throws(() => exportSkills(["--output", output(t, "yss-export-broken-")], { root }), /broken internal link/);
});

test("符号链接阻断公开导出", (t) => {
  const root = fixtureRoot(t);
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "outside");
  fs.symlinkSync(outside, path.join(root, ".agents/skills/yss-fixture-skill/link.txt"));
  assert.throws(() => exportSkills(["--output", output(t, "yss-export-symlink-")], { root }), /symbolic links are not allowed/);
});

test("疑似凭据阻断公开导出", (t) => {
  const root = fixtureRoot(t, { body: frontmatter("Fixture Skill") + "\nToken: ghp_abcdefghijklmnopqrstuvwxyz012345\n" });
  assert.throws(() => exportSkills(["--output", output(t, "yss-export-secret-")], { root }), /suspicious credential-like content/);
});

test("输出目录中的禁止项目文件阻断导出", (t) => {
  const root = fixtureRoot(t);
  const out = output(t, "yss-export-forbidden-");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "AGENTS.md"), "forbidden");
  assert.throws(() => exportSkills(["--output", out], { root }), /forbidden project file in public export/);
});
