import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { BACKEND, backendComponentPaths, refresh, sourceState } from "./refresh-yss-skill-index.mjs";
import { checkBackendSkillSourceIndex } from "./check-backend-skill-source-index.mjs";

const platformPom = (javaVersion, bootVersion) => `<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>${bootVersion}</version><relativePath/></parent><artifactId>fixture</artifactId><version>1.0.0</version><properties><java.version>${javaVersion}</java.version><spring-boot.version>\${project.parent.version}</spring-boot.version></properties></project>`;

test("writes Node-labelled generated indexes", async () => {
  const root=await mkdtemp(path.join(tmpdir(),"yss-index-")); const boot2=path.join(root,"boot2"); const boot3=path.join(root,"boot3"); const skills=path.join(root,"skills");
  for (const [source, javaVersion, bootVersion] of [[boot2,"1.8","2.7.18"],[boot3,"17","3.5.16"]]) {
    await mkdir(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo"),{recursive:true});
    await writeFile(path.join(source,"pom.xml"),platformPom(javaVersion,bootVersion));
    await writeFile(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo/CacheConfiguration.java"),"class CacheConfiguration {}");
  }
  for(const name of ["yss-cache","yss-ui"])await mkdir(path.join(skills,name),{recursive:true});
  await refresh({skillsRoot:skills,sources:{"boot2-java8":boot2,"boot3-java17":boot3},now:"2026-01-01T00:00:00Z"});
  assert.match(await readFile(path.join(skills,"yss-cache/references/source-index.md"),"utf8"),/backend-component-source-index-router-v1/);
  assert.match(await readFile(path.join(skills,"yss-cache/references/source-index.boot2-java8.md"),"utf8"),/Platform line: `boot2-java8`/);
  assert.match(await readFile(path.join(skills,"yss-cache/references/source-index.boot3-java17.md"),"utf8"),/Platform line: `boot3-java17`/);
  assert.match(await readFile(path.join(skills,"yss-ui/references/frontend-docs.md"),"utf8"),/components/);
  await assert.rejects(
    () => refresh({skillsRoot:skills,sources:{"boot3-java17":boot2},frontend:false,backendSkills:["yss-cache"]}),
    /source root does not match boot3-java17/,
  );
});

test("keeps generation-specific component path sets", () => {
  assert.deepEqual(backendComponentPaths("yss-excel-mvc", "boot2-java8"), [
    "yss-microservice-components/yss-component-excel-mvc",
    "yss-microservice-components/yss-component-excel-starter",
  ]);
  assert.deepEqual(backendComponentPaths("yss-excel-mvc", "boot3-java17"), [
    "yss-microservice-components/yss-component-excel-mvc",
  ]);
});

test("writes a source-backed MyBatis capability matrix without absolute paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-mybatis-index-"));
  const source = path.join(root, "source");
  const skills = path.join(root, "skills");
  const component = "yss-microservice-components/yss-component-persistence";
  const plusJava = path.join(source, component, "yss-component-mybatis-plus-starter/src/main/java/com/yss/cloud/mybatis");
  const baseJava = path.join(source, component, "yss-component-mybatis-starter/src/main/java/com/yss/cloud/mybatis");
  const commonJava = path.join(source, component, "yss-component-persistence-common/src/main/java/com/yss/cloud/mybatis");

  await mkdir(path.join(plusJava, "support"), { recursive: true });
  await mkdir(path.join(baseJava, "config"), { recursive: true });
  await mkdir(commonJava, { recursive: true });
  await mkdir(path.join(skills, "yss-mybatis"), { recursive: true });
  await writeFile(path.join(source, "pom.xml"), platformPom("1.8", "2.7.18"));
  await writeFile(path.join(source, component, "pom.xml"), "<project/>");
  await writeFile(path.join(plusJava, "support/BasePlusRepository.java"), [
    "public interface BasePlusRepository<T> extends BaseMapper<T> {",
    "  default Integer insertBatchSomeColumn(List<T> entities) { return 0; }",
    "  Integer insertBatchSomeColumnInternal(List<T> entities);",
    "}",
  ].join("\n"));
  await writeFile(path.join(baseJava, "config/PageQueryEntityConfigration.java"), [
    "public class PageQueryEntityConfigration {",
    "  @ConditionalOnProperty(name = \"yss.mybatis.page-helper.enabled\", havingValue = \"true\", matchIfMissing = true)",
    "}",
  ].join("\n"));
  await writeFile(path.join(commonJava, "MultiDataSourceHolder.java"), [
    "public class MultiDataSourceHolder {",
    "  private Map<String, DataSource> multiDataSource;",
    "}",
  ].join("\n"));

  await refresh({
    skillsRoot: skills,
    sources: { "boot2-java8": source },
    now: "2026-01-01T00:00:00Z",
    frontend: false,
    backendSkills: ["yss-mybatis"],
    stateResolver: () => ({
      commit: "a".repeat(40),
      componentWorktree: "clean",
      componentTrees: [{ path: component, tree: "b".repeat(40) }],
    }),
  });

  const index = await readFile(path.join(skills, "yss-mybatis/references/source-index.boot2-java8.md"), "utf8");
  assert.match(index, /## Capability Matrix/);
  assert.match(index, /BasePlusRepository<T>/);
  assert.match(index, /yss\.mybatis\.page-helper\.enabled/);
  assert.match(index, /Map<String, DataSource>/);
  assert.match(index, /Component worktree: `clean`/);
  assert.match(index, /Component tree.*b{40}/);
  assert.doesNotMatch(index, new RegExp(root.replaceAll("/", "\\/")));
  assert.doesNotMatch(index, /## Key Java Entry Points/);
});

test("source freshness is scoped to the indexed component subtree", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-component-state-"));
  const component = "yss-microservice-components/yss-component-persistence";
  const componentFile = path.join(root, component, "pom.xml");
  const unrelatedFile = path.join(root, "yss-microservice-components/other/README.md");
  await mkdir(path.dirname(componentFile), { recursive: true });
  await mkdir(path.dirname(unrelatedFile), { recursive: true });
  await writeFile(componentFile, "<project/>\n");
  await writeFile(unrelatedFile, "clean\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });

  await writeFile(unrelatedFile, "dirty elsewhere\n");
  assert.equal(sourceState(root, [component]).componentWorktree, "clean");

  await writeFile(componentFile, "<project><dirty/></project>\n");
  assert.equal(sourceState(root, [component]).componentWorktree, "dirty");
});

test("records Maven lineage and platform signals and validates the exact component tree", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yss-platform-index-"));
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
  await writeFile(path.join(source, "yss-microservice-components/pom.xml"), `<project><parent>
    <groupId>com.yss.cloud</groupId><artifactId>yss-cloud-microservice</artifactId><version>2.0.0-SNAPSHOT</version><relativePath>../pom.xml</relativePath>
  </parent><artifactId>yss-microservice-components</artifactId></project>`);
  await writeFile(path.join(source, component, "pom.xml"), `<project><parent>
    <groupId>com.yss.cloud</groupId><artifactId>yss-microservice-components</artifactId><version>2.0.0-SNAPSHOT</version><relativePath>../pom.xml</relativePath>
  </parent><artifactId>yss-component-validation-jsr303</artifactId></project>`);
  await writeFile(javaFile, "package demo; import javax.validation.Valid; class ValidationConfiguration {}\n");
  execFileSync("git", ["init", "-q"], { cwd: source });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: source });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: source });
  execFileSync("git", ["add", "."], { cwd: source });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: source });

  await refresh({ skillsRoot: skills, sources: { "boot2-java8": source }, frontend: false, backendSkills: ["yss-validation"], now: "2026-01-01T00:00:00Z" });
  const index = await readFile(path.join(skills, "yss-validation/references/source-index.boot2-java8.md"), "utf8");
  assert.match(index, /backend-component-source-index-v2/);
  assert.match(index, /GAV `com\.yss\.cloud:yss-component-validation-jsr303:2\.0\.0-SNAPSHOT`/);
  assert.match(index, /Inherited Java signals: `1\.8`/);
  assert.match(index, /Inherited Spring Boot signals: `2\.7\.18`/);
  assert.match(index, /`javax\.\*` in 1 main Java files; `jakarta\.\*` in 0/);
  assert.deepEqual(BACKEND["yss-validation"], [component]);
  await checkBackendSkillSourceIndex({ skill: "yss-validation", platformLine: "boot2-java8", skillsRoot: skills, sourceRoot: source });

  await writeFile(javaFile, "package demo; import jakarta.validation.Valid; class ValidationConfiguration {}\n");
  await assert.rejects(
    () => checkBackendSkillSourceIndex({ skill: "yss-validation", platformLine: "boot2-java8", skillsRoot: skills, sourceRoot: source }),
    /component worktree is dirty/,
  );
});
