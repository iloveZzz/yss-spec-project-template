import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatedTreeDigest } from '../../../../scripts/lib/backend-platform-provenance.mjs';
import { assertStandaloneManifest } from '../../../../scripts/lib/standalone-backend-scaffold.mjs';
import { platformDigest } from '../../../../scripts/lib/backend-platform.mjs';
import { parse } from '../../../../scripts/vendor/yaml.mjs';

const scripts = path.dirname(fileURLToPath(import.meta.url));
function args(output) {
  return ["--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output,
    "--platform-profile", "spring-boot-3.5-jdk21", "--spring-boot-version", "3.5.16", "--java-version", "21",
    "--group-id", "com.yss.demo", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.cloud",
    "--parent-artifact-id", "yss-cloud-microservice", "--parent-version", "3.0.0-SNAPSHOT", "--yss-components-version", "3.0.0-SNAPSHOT"];
}

test("DDD 默认直接生成纯骨架，无需合同或 --standalone，不创建批准或业务资格", async t => {
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

test("MVC 默认直接生成三模块，无需合同或 --standalone，不初始化治理实例", async t => {
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
  const root=await mkdtemp(path.join(os.tmpdir(),"yss-scaffold-layout-"));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const initialized=spawnSync('git',['init','-q',root],{encoding:'utf8'});
  assert.equal(initialized.status,0,initialized.stderr);
  await writeFile(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');
  for(const skill of ["yss-ddd-scaffold-generator","yss-layered-mvc-scaffold-generator"]) {
    const entry=path.resolve(scripts,"../../",skill,"scripts/generate_scaffold.mjs");
    const output=path.join(root,skill,"app/backend");
    const generated=spawnSync(process.execPath,[entry,...args(output)],{cwd:root,encoding:"utf8"});
    assert.equal(generated.status,0,generated.stderr);
    const pom=path.join(output,"demo-service/pom.xml"),before=await readFile(pom);
    assert.notEqual(spawnSync(process.execPath,[entry,...args(output)],{cwd:root,encoding:"utf8"}).status,0);
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
    if (skill === "yss-ddd-scaffold-generator") {
      const workflow = JSON.parse(await readFile(path.join(evidence, "scaffold-workflow.json"), "utf8"));
      assert.equal(workflow.workflow_mode, "standalone-generation");
    }
  }
});

test("DDD 与 MVC 收到任意正式合同参数时不回退成直接生成", async t => {
  for (const skill of ["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "yss-contract-mode-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const entry = path.resolve(scripts, "../../", skill, "scripts/generate_scaffold.mjs");
    const input = args(path.join(root, "output"));
    const projectArgs = input.filter((value, index) => !["--platform-profile", "--spring-boot-version", "--java-version"].includes(value) && !["--platform-profile", "--spring-boot-version", "--java-version"].includes(input[index - 1]));
    for (const flag of ["--contract-file", "--contract-id", "--contract-version", "--approval-ref", "--compiler-draft-ref", "--persisted-ref"]) {
      const result = spawnSync(process.execPath, [entry, ...projectArgs, `${flag}=1`], { encoding: "utf8" });
      assert.equal(result.status, 1, `${skill} ${flag}: ${result.stderr}`);
      assert.match(result.stderr, /合同|contract/);
      await assert.rejects(stat(path.join(root, "output")), { code: "ENOENT" });
    }
  }
});

 test("独立模式拒绝混用合同、模糊平台和覆盖现有工程", async t => {
 for(const skill of ["yss-ddd-scaffold-generator","yss-layered-mvc-scaffold-generator"]){
  const root=await mkdtemp(path.join(os.tmpdir(),"yss-standalone-boundary-"));t.after(()=>rm(root,{recursive:true,force:true}));
  const entry=path.resolve(scripts,"../../",skill,"scripts/generate_scaffold.mjs");
  for(const extra of [["--contract-id","approved.fake"],["--spring-boot-version","3.5.x"],["--java-version","17"]]){
   const result=spawnSync(process.execPath,[entry,"--standalone",...args(root),...extra],{encoding:"utf8"});assert.notEqual(result.status,0);await assert.rejects(stat(path.join(root,"demo-service")),{code:"ENOENT"});
  }
  assert.equal(spawnSync(process.execPath,[entry,"--standalone",...args(root)]).status,0);
  const before=await readFile(path.join(root,"demo-service/pom.xml"));assert.notEqual(spawnSync(process.execPath,[entry,...args(root)]).status,0);assert.deepEqual(await readFile(path.join(root,"demo-service/pom.xml")),before);
 }
 });

for (const skill of ["yss-ddd-scaffold-generator", "yss-layered-mvc-scaffold-generator"]) {
  test(`${skill} 默认参考工程独立构建、绑定清单且可显式禁用`, async t => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yss-reference-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const entry = path.resolve(scripts, "../../", skill, "scripts/generate_scaffold.mjs");
    for (const enabled of [true, false]) {
      const output = path.join(root, String(enabled));
      const result = spawnSync(process.execPath, [entry, ...args(output), ...(enabled ? [] : ["--without-example"])], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      const project = path.join(output, "demo-service");
      const manifest = JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8"));
      assert.equal(manifest.schema_version, 2);
      assert.equal(manifest.reference_example.enabled, enabled);
      assert.doesNotMatch(await readFile(path.join(project, "pom.xml"), "utf8"), /<module>examples/);
      const reference = path.join(project, "examples/reference");
      if (enabled) {
        const oas = parse(await readFile(path.join(reference, 'openapi.yaml'), 'utf8'));
        const wire = parse(await readFile(path.resolve(scripts, '../../yss-dto/references/openapi-wire-profile.yaml'), 'utf8'));
        assert.deepEqual(oas.components.schemas.YssResultMeta.properties, Object.fromEntries(Object.entries(wire.common_response.fields).map(([key, field]) => [key, { type: field.wire_types }])));
        assert.equal(oas.components.responses.Entry.content['application/json'].schema.allOf[0].$ref, '#/components/schemas/YssResultMeta');
        assert.equal(oas['x-yss-wire-profile'].schema_version, wire.schema_version);
        assert.match(await readFile(path.join(reference, "pom.xml"), "utf8"), /demo-service-reference/);
        assert.ok((await stat(path.join(reference, "mvnw"))).mode & 0o111);
        assert.ok(manifest.ownership.generated_files.some(f => f.path.startsWith("examples/reference/") && f.path.endsWith("ReferenceEntryController.java")));
        assert.equal(manifest.reference_example.id, "reference-entry");
        assert.match(manifest.reference_example.template_digest, /^sha256:[a-f0-9]{64}$/);
        assert.equal(manifest.reference_verification.status, "not-executed");
        assert.equal(generatedTreeDigest(project, manifest), manifest.generated_tree_digest);
        const readme = path.join(reference, 'README.md'), bytes = await readFile(readme);
        await writeFile(readme, 'changed reference');
        assert.throws(() => generatedTreeDigest(project, manifest), /generated file drift/);
        await writeFile(readme, bytes);
        await rm(reference, { recursive: true });
        const stripped = { ...manifest, ownership: { generated_files: manifest.ownership.generated_files.filter(f => !f.path.startsWith('examples/')) } };
        assert.throws(() => generatedTreeDigest(project, stripped), /文件所有权缺失/);
      } else {
        await assert.rejects(stat(reference), { code: "ENOENT" });
        const legacy = structuredClone(manifest); legacy.schema_version = 1;
        delete legacy.reference_example; delete legacy.generation_input.reference_example;
        delete legacy.reference_verification; legacy.input_digest = platformDigest(legacy.generation_input);
        assert.doesNotThrow(() => assertStandaloneManifest(legacy));
        legacy.reference_example = manifest.reference_example;
        assert.throws(() => assertStandaloneManifest(legacy), /历史 v1/);
      }
    }
    const output = path.join(root, "conflicting");
    const conflict = spawnSync(process.execPath, [entry, ...args(output), "--with-example", "--without-example"], { encoding: "utf8" });
    assert.equal(conflict.status, 1);
    assert.match(conflict.stderr, /不能同时|不得同时/);
    await assert.rejects(stat(output), { code: "ENOENT" });
  });
}
