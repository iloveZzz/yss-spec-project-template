import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositorySkillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.resolve(repositorySkillRoot, "..");
const projectRoot = path.resolve(skillsRoot, "../..");

async function text(target) {
  return readFile(target, "utf8");
}

test("repository router exposes exactly the registered profile entry points", async () => {
  const profilesRoot = path.join(repositorySkillRoot, "references/profiles");
  const profiles = (await readdir(profilesRoot)).filter((name) => name.endsWith(".md")).sort();
  assert.deepEqual(profiles, ["layered-mvc-service.md", "mvc-data-analysis-v1.md", "target-domain-model.md"]);

  const skill = await text(path.join(repositorySkillRoot, "SKILL.md"));
  for (const profile of profiles) assert.match(skill, new RegExp(`references/profiles/${profile.replace(".md", "")}`));
  assert.match(skill, /且只.*加载一个文件/);
  assert.doesNotMatch(skill, /infrastructure-layer-guide/);
});

test("normative persistence skills do not contain business-specific templates or production source mirrors", async () => {
  const normativeFiles = [
    path.join(repositorySkillRoot, "SKILL.md"),
    ...["layered-mvc-service.md", "mvc-data-analysis-v1.md", "target-domain-model.md"]
      .map((name) => path.join(repositorySkillRoot, "references/profiles", name)),
  ];
  for (const target of normativeFiles) {
    const contents = await text(target);
    assert.doesNotMatch(contents, /QualityTemplate|id\.value\(\)|insertOrUpdate\(/);
  }

  const mybatisAssets = path.join(skillsRoot, "yss-mybatis/assets");
  try {
    const javaMirrors = (await readdir(mybatisAssets)).filter((name) => name.endsWith(".java"));
    assert.deepEqual(javaMirrors, []);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
});

test("code review wires Repository and MyBatis with registered backend scope", async () => {
  const standards = await text(path.join(skillsRoot, "code-review/references/yss-review-standards.md"));
  const report = await text(path.join(projectRoot, "docs/templates/review-report-template.md"));
  const lifecycle = await text(path.join(skillsRoot, "yss-product-lifecycle/references/orchestration-contract.yaml"));

  for (const source of [standards, report, lifecycle]) {
    assert.match(source, /yss-repository/);
    assert.match(source, /yss-mybatis/);
  }
  assert.match(standards, /本体项目和已登记后端研发项目/);
  assert.match(report, /<review-root\.\.\.>/);
  assert.match(lifecycle, /registered-backend-development-projects/);
  await access(path.join(skillsRoot, "yss-mybatis/references/source-index.md"));
});
