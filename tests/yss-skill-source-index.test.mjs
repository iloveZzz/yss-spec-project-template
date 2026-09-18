// Stable validation entry point for deterministic backend component source indexes.
import '../.agents/skills/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.test.mjs';
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkBackendSkillSourceIndex } from "../.agents/skills/yss-skill-source-index-refresh/scripts/check-backend-skill-source-index.mjs";
import { refresh } from "../.agents/skills/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs";
import { loadBackendPlatforms, platformBinding } from "../scripts/lib/backend-platform.mjs";

test("approved Boot 2 platform binding selects a checker-compatible source index", async () => {
  const catalog = loadBackendPlatforms();
  const profile = catalog.profiles.find(item => item.id === "spring-boot-2.7-jdk8");
  const entry = catalog.compatibility.find(item => item.profile_id === profile.id);
  const binding = platformBinding(profile, entry);
  assert.equal(binding.component_platform_line, "boot2-java8");

  const root = await mkdtemp(path.join(tmpdir(), "yss-binding-source-index-"));
  const source = path.join(root, "source");
  const skills = path.join(root, "skills");
  const component = "yss-microservice-components/yss-component-validation-jsr303";
  const javaFile = path.join(source, component, "src/main/java/demo/ValidationConfiguration.java");
  await mkdir(path.dirname(javaFile), { recursive: true });
  await mkdir(path.join(skills, "yss-validation"), { recursive: true });
  await writeFile(path.join(source, "pom.xml"), `<project>
    <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.7.18</version><relativePath/></parent>
    <groupId>com.yss.cloud</groupId><artifactId>yss-cloud-microservice</artifactId><version>2.0.0-SNAPSHOT</version>
    <properties><java.version>1.8</java.version><spring-boot.version>\${project.parent.version}</spring-boot.version></properties>
  </project>`);
  await writeFile(path.join(source, component, "pom.xml"), `<project><parent>
    <groupId>com.yss.cloud</groupId><artifactId>yss-cloud-microservice</artifactId><version>2.0.0-SNAPSHOT</version><relativePath>../../pom.xml</relativePath>
  </parent><artifactId>yss-component-validation-jsr303</artifactId></project>`);
  await writeFile(javaFile, "package demo; import javax.validation.Valid; class ValidationConfiguration {}\n");
  execFileSync("git", ["init", "-q"], { cwd: source });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: source });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: source });
  execFileSync("git", ["add", "."], { cwd: source });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: source });

  await refresh({
    skillsRoot: skills,
    sources: { [binding.component_platform_line]: source },
    frontend: false,
    backendSkills: ["yss-validation"],
    now: "2026-01-01T00:00:00Z",
  });
  const result = await checkBackendSkillSourceIndex({
    skill: "yss-validation",
    platformLine: binding.component_platform_line,
    skillsRoot: skills,
    sourceRoot: source,
  });
  assert.equal(result.skill, "yss-validation");
  assert.deepEqual(result.componentPaths, [component]);
});
