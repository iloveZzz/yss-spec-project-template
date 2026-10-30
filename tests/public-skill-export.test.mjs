import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { exportSkills } from "../scripts/lib/export-skills.mjs";
import { composeProfileTree } from "../scripts/lib/profile-tree.mjs";

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

test("Backend 组合导出的共享维护技能与独立包一致", (t) => {
  const canonical = output(t, "yss-export-canonical-");
  const backend = output(t, "yss-export-backend-");
  exportSkills(["--skill", "setup-yss-harness", "--output", canonical]);
  exportSkills(["--skill", "setup-yss-harness", "--output", backend], {
    sourceRoot: path.join(composeProfileTree("backend"), ".agents/skills"),
  });
  for (const ref of ["SKILL.md", "references/operation-contract.md", "references/project-operations.md", "references/program-installation.md", "references/cli-families.md", "scripts/bootstrap.py"]) {
    assert.deepEqual(
      fs.readFileSync(path.join(backend, "skills/setup-yss-harness", ref)),
      fs.readFileSync(path.join(canonical, "skills/setup-yss-harness", ref)),
      ref,
    );
    assert.equal(
      fs.statSync(path.join(canonical, "skills/setup-yss-harness", ref)).mode & 0o777,
      fs.statSync(path.join(ROOT, ".agents/skills/setup-yss-harness", ref)).mode & 0o777,
      `${ref} permissions`,
    );
  }
  assert.deepEqual(
    fs.readFileSync(path.join(canonical, "skills/setup-yss-harness/scripts/bootstrap.py")),
    fs.readFileSync(path.join(ROOT, ".agents/skills/setup-yss-harness/scripts/bootstrap.py")),
    "bootstrap script must retain its original bytes",
  );
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

test(".workbuddy 技能引用公开导出时转换为可移植路径", (t) => {
    const runtimeRoot = ".workbuddy";
    const root = fixtureRoot(t, { body: frontmatter("Fixture Skill") + `\nSource: ${runtimeRoot}/skills\n[Skill](${runtimeRoot}/skills/yss-fixture-skill/SKILL.md)\n` });
    const out = output(t, "yss-export-runtime-root-");
    exportSkills(["--output", out], { root });
    const text = fs.readFileSync(path.join(out, "skills/yss-fixture-skill/SKILL.md"), "utf8");
    assert.ok(!text.includes(runtimeRoot), text);
    assert.match(text, /Source: the canonical public skill source/);
    assert.match(text, /\[Skill\]\(\.\.\/yss-fixture-skill\/SKILL\.md\)/);
    assert.match(exportSkills(["--output", out, "--check"], { root }), /up to date/);
});

test("旧 .codebuddy 技能引用不能作为受支持路径导出", (t) => {
  const root = fixtureRoot(t, { body: frontmatter("Fixture Skill") + "\n.codebuddy/skills/yss-fixture-skill\n" });
  assert.throws(() => exportSkills(["--output", output(t, "yss-export-retired-root-")], { root }), /Agent root path in public export/);
});

for (const runtimeRoot of [".workbuddy", ".codebuddy"]) {
  test(`${runtimeRoot} 私有目录阻断公开导出且保留用户文件`, (t) => {
    const root = fixtureRoot(t), out = output(t, "yss-export-runtime-private-");
    const privateFile = path.join(out, runtimeRoot, "settings.json");
    write(privateFile, "private user settings\n");
    for (const flags of [[], ["--check"]]) {
      assert.throws(() => exportSkills(["--output", out, ...flags], { root }), /forbidden project file in public export/);
      assert.equal(fs.readFileSync(privateFile, "utf8"), "private user settings\n");
      assert.equal(fs.existsSync(path.join(out, "skills")), false);
    }
  });

  test(`${runtimeRoot} 运行时路径残留由公开导出检查明确拒绝`, (t) => {
    const root = fixtureRoot(t), out = output(t, "yss-export-runtime-leak-");
    exportSkills(["--output", out], { root });
    fs.appendFileSync(path.join(out, "skills/yss-fixture-skill/SKILL.md"), `\n${runtimeRoot}/skills/yss-fixture-skill\n`);
    assert.throws(() => exportSkills(["--output", out, "--check"], { root }), /Agent root path in public export/);
  });
}

test("单个普通技能可独立导出且只携带所需资源", (t) => {
  const root = fixtureRoot(t);
  write(path.join(root, ".agents/skills/implement/SKILL.md"), frontmatter("implement") + "\n[guide](references/guide.md)\n");
  write(path.join(root, ".agents/skills/implement/references/guide.md"), "# Implementation guide\n");
  write(path.join(root, ".agents/skills/unrelated/SKILL.md"), "broken frontmatter\n");
  const out = output(t, "yss-export-independent-");
  exportSkills(["--skill", "implement", "--output", out], { root });
  assert.equal(fs.existsSync(path.join(out, "skills/implement/references/guide.md")), true);
  assert.deepEqual(fs.readdirSync(path.join(out, "skills")), ["implement"]);
  assert.equal(fs.existsSync(path.join(out, ".template-spec")), false);
  assert.match(exportSkills(["--skill", "implement", "--output", out, "--check"], { root }), /up to date/);
});

test("独立导出仍拒绝非法技能路径", (t) => {
  const root = fixtureRoot(t);
  assert.throws(() => exportSkills(["--skill", "../escape", "--output", output(t, "yss-export-selection-")], { root }), /skill/);
});

test("中文写作技能导出包含可读取的共用规范", (t) => {
  const out = output(t, "yss-export-writing-");
  exportSkills(["--skill", "i-have-adhd", "--output", out]);
  const ref = "skills/i-have-adhd/references/document-writing.md";
  assert.ok(fs.statSync(path.join(out, ref)).isFile());
  assert.equal(fs.existsSync(path.join(out, ".template-spec")), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, ".yss-export-manifest.json"), "utf8"));
  assert.equal(manifest.generated_files_sha256[ref.slice("skills/".length)], createHash("sha256").update(fs.readFileSync(path.join(out, ref))).digest("hex"));
  assert.match(exportSkills(["--skill", "i-have-adhd", "--output", out, "--check"]), /up to date/);
});

test("Backend 显式规格入口的技能内引用闭包可读取", () => {
  const tree=composeProfileTree("backend");
  const entry=path.join(tree,".agents/skills/to-spec/SKILL.md");
  const text=fs.readFileSync(entry,"utf8");
  const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(match=>match[1].split("#")[0]).filter(link=>link&&!link.includes("://"));
  assert.ok(links.length>0,"entry has readable skill references");
  for(const link of links) {
    const target=path.resolve(path.dirname(entry),link);
    assert.ok(target.startsWith(path.join(tree,".agents/skills")+path.sep));
    assert.ok(fs.statSync(target).isFile(),link);
  }
});
