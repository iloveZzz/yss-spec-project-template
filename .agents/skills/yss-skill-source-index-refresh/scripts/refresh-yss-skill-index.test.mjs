import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { refresh, sourceState } from "./refresh-yss-skill-index.mjs";

test("writes Node-labelled generated indexes", async () => {
  const root=await mkdtemp(path.join(tmpdir(),"yss-index-")); const source=path.join(root,"source"); const skills=path.join(root,"skills");
  await mkdir(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo"),{recursive:true}); await writeFile(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo/CacheConfiguration.java"),"class CacheConfiguration {}");
  for(const name of ["yss-cache","yss-ui"])await mkdir(path.join(skills,name),{recursive:true});
  await refresh({skillsRoot:skills,source,now:"2026-01-01T00:00:00Z"});
  assert.match(await readFile(path.join(skills,"yss-cache/references/source-index.md"),"utf8"),/refresh-yss-skill-index\.mjs/);
  assert.match(await readFile(path.join(skills,"yss-ui/references/frontend-docs.md"),"utf8"),/components/);
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
    source,
    now: "2026-01-01T00:00:00Z",
    frontend: false,
    backendSkills: ["yss-mybatis"],
    stateResolver: () => ({
      commit: "a".repeat(40),
      componentWorktree: "clean",
      componentTrees: [{ path: component, tree: "b".repeat(40) }],
    }),
  });

  const index = await readFile(path.join(skills, "yss-mybatis/references/source-index.md"), "utf8");
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
