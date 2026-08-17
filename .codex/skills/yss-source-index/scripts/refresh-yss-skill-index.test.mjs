import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { refresh } from "./refresh-yss-skill-index.mjs";

test("writes Node-labelled generated indexes", async () => {
  const root=await mkdtemp(path.join(tmpdir(),"yss-index-")); const source=path.join(root,"source"); const skills=path.join(root,"skills");
  await mkdir(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo"),{recursive:true}); await writeFile(path.join(source,"yss-microservice-components/yss-component-cache-parent/src/main/java/demo/CacheConfiguration.java"),"class CacheConfiguration {}");
  for(const name of ["yss-cache","yss-ui"])await mkdir(path.join(skills,name),{recursive:true});
  await refresh({skillsRoot:skills,source,now:"2026-01-01T00:00:00Z"});
  assert.match(await readFile(path.join(skills,"yss-cache/references/source-index.md"),"utf8"),/refresh-yss-skill-index\.mjs/);
  assert.match(await readFile(path.join(skills,"yss-ui/references/frontend-docs.md"),"utf8"),/components/);
});
