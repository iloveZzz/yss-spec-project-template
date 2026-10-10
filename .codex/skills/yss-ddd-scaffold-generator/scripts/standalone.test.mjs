import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.dirname(fileURLToPath(import.meta.url));
function args(output) {
  return ["--standalone", "--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output,
    "--platform-profile", "spring-boot-3.5-jdk21", "--spring-boot-version", "3.5.16", "--java-version", "21",
    "--group-id", "com.yss.demo", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.cloud",
    "--parent-artifact-id", "yss-cloud-microservice", "--parent-version", "3.0.0-SNAPSHOT", "--yss-components-version", "3.0.0-SNAPSHOT"];
}

test("独立 DDD 输入可生成纯骨架，不创建批准合同或业务资格", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-standalone-ddd-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(scripts, "generate_scaffold.mjs"), ...args(root)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const project = path.join(root, "demo-service");
  const manifest = JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.kind, "standalone-backend-scaffold");
  assert.equal(manifest.generation_mode, "standalone-generation");
  assert.equal(manifest.platform_verification, "unverified");
  assert.equal(manifest.readiness.ready_for_agent, false);
  assert.equal(manifest.readiness.lifecycle_approved, false);
  assert.equal(manifest.contract_id, undefined);
  assert.equal(manifest.approval_ref, undefined);
  assert.equal(manifest.verification.status, "not-executed");
  assert.deepEqual(manifest.module_profile.resolved_modules, ["domain", "application", "infrastructure", "adapter", "bootstrap"]);
  assert.ok((await stat(path.join(project, "mvnw"))).mode & 0o111);
  assert.match(await readFile(path.join(project, "pom.xml"), "utf8"), /3\.0\.0-SNAPSHOT/);
});

test("独立 MVC 使用相同输入规则生成三模块，不初始化治理实例", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-standalone-mvc-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const generator = path.resolve(scripts, "../../yss-layered-mvc-scaffold-generator/scripts/generate_scaffold.mjs");
  const result = spawnSync(process.execPath, [generator, ...args(root)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const project = path.join(root, "demo-service");
  const manifest = JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.kind, "standalone-backend-scaffold");
  assert.equal(manifest.readiness.ready_for_agent, false);
  assert.equal(manifest.readiness.lifecycle_approved, false);
  assert.equal(manifest.contract_id, undefined);
  assert.equal(manifest.platform_verification, "unverified");
  assert.deepEqual(manifest.module_profile.resolved_modules, ["server", "service", "repository"]);
  await assert.rejects(stat(path.join(project, "yss-project.yaml")), { code: "ENOENT" });
  await assert.rejects(stat(path.join(project, ".git")), { code: "ENOENT" });
});

test("DDD 与 MVC 可在明确选择的 Harness 自定义布局生成，仍拒绝覆盖", async t => {
  const repositoryRoot=path.resolve(scripts,"../../../..");
  const root=await mkdtemp(path.join(repositoryRoot,".scaffold-layout-"));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const skill of ["yss-ddd-scaffold-generator","yss-layered-mvc-scaffold-generator"]) {
    const entry=path.resolve(scripts,"../../",skill,"scripts/generate_scaffold.mjs");
    const output=path.join(root,skill,"app/backend");
    const generated=spawnSync(process.execPath,[entry,...args(output)],{encoding:"utf8"});
    assert.equal(generated.status,0,generated.stderr);
    const pom=path.join(output,"demo-service/pom.xml"),before=await readFile(pom);
    assert.notEqual(spawnSync(process.execPath,[entry,...args(output)],{encoding:"utf8"}).status,0);
    assert.deepEqual(await readFile(pom),before);
  }
});

test("独立一键入口保留骨架并记录缺少 Maven settings 的真实待验证状态", async t => {
  for (const skill of ["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "yss-standalone-verify-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const environment = { ...process.env, HOME: root };
    for (const key of ["YSS_MAVEN_SETTINGS", "MAVEN_ARGS", "YSS_MAVEN_REPOSITORY_URL", "MAVEN_REPO_USERNAME", "MAVEN_REPO_PASSWORD"]) delete environment[key];
    const entry = path.resolve(scripts, "../../", skill, "scripts/generate_and_verify_scaffold.mjs");
    const evidence = path.join(root, "evidence");
    const result = spawnSync(process.execPath, [entry, ...args(root), "--evidence-dir", evidence], { encoding: "utf8", env: environment });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(await readFile(path.join(evidence, "scaffold-verification.json"), "utf8"));
    assert.equal(report.verification_mode, "standalone-generation");
    assert.equal(report.failure_category, "verification-preflight");
    assert.equal(report.preflight.settings_source, "missing");
    assert.deepEqual(report.commands, []);
    const manifest = JSON.parse(await readFile(path.join(root, "demo-service/.yss/scaffold-generation.json"), "utf8"));
    assert.equal(manifest.completion_level, "generated");
    assert.equal(manifest.verification.status, "failed");
    assert.equal(manifest.readiness.ready_for_agent, false);
  }
});

 test("独立模式拒绝混用合同、模糊平台和覆盖现有工程", async t => {
 for(const skill of ["yss-ddd-scaffold-generator","yss-layered-mvc-scaffold-generator"]){
  const root=await mkdtemp(path.join(os.tmpdir(),"yss-standalone-boundary-"));t.after(()=>rm(root,{recursive:true,force:true}));
  const entry=path.resolve(scripts,"../../",skill,"scripts/generate_scaffold.mjs");
  for(const extra of [["--contract-id","approved.fake"],["--spring-boot-version","3.5.x"],["--java-version","17"]]){
   const result=spawnSync(process.execPath,[entry,...args(root),...extra],{encoding:"utf8"});assert.notEqual(result.status,0);await assert.rejects(stat(path.join(root,"demo-service")),{code:"ENOENT"});
  }
  assert.equal(spawnSync(process.execPath,[entry,...args(root)]).status,0);
  const before=await readFile(path.join(root,"demo-service/pom.xml"));assert.notEqual(spawnSync(process.execPath,[entry,...args(root)]).status,0);assert.deepEqual(await readFile(path.join(root,"demo-service/pom.xml")),before);
 }
 });
