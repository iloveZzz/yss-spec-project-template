import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// schema-generations.json 是常驻代际的唯一事实源；本测试让它对 schema 目录与实例分发产生约束。
const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_DIR = ".template-spec/process/schemas";
const generations = JSON.parse(fs.readFileSync(path.join(ROOT, ".template-spec/process/schema-generations.json"), "utf8"));
const bundle = JSON.parse(fs.readFileSync(path.join(ROOT, ".template-source/distribution/bundle-profile.json"), "utf8"));
const excluded = new Set(bundle.manifest.excludePaths);
const families = Object.entries(generations.families);
const schemaPath = (file) => `${SCHEMA_DIR}/${file}`;

test("每个代际族的 schema 文件存在，current 属于 resident", () => {
  for (const [family, entry] of families) {
    for (const [version, file] of Object.entries(entry.schemas)) {
      assert.ok(fs.existsSync(path.join(ROOT, schemaPath(file))), `${family} v${version}: ${file} 不存在`);
    }
    assert.ok(entry.resident.includes(entry.current), `${family}: current ${entry.current} 不在 resident`);
  }
});

test("resident 只保留最新两代，且按版本降序", () => {
  for (const [family, entry] of families) {
    const newest = Object.keys(entry.schemas).map(Number).sort((a, b) => b - a).slice(0, 2);
    assert.deepEqual(entry.resident, newest, family);
    assert.equal(entry.current, newest[0], `${family}: current 必须是最新登记版本`);
  }
});

test("schema 目录里同名多版本的文件都已登记到对应代际族", () => {
  const byBase = new Map();
  for (const file of fs.readdirSync(path.join(ROOT, SCHEMA_DIR))) {
    const match = /^(.+?)(?:-v(\d+))?\.schema\.json$/.exec(file);
    if (!match) continue;
    byBase.set(match[1], [...(byBase.get(match[1]) ?? []), file]);
  }
  for (const [base, files] of byBase) {
    const entry = generations.families[base];
    if (!entry) {
      assert.equal(files.length, 1, `${base} 有多个版本文件（${files.join(", ")}），须登记到 schema-generations.json`);
      continue;
    }
    const registered = new Set([...Object.values(entry.schemas), ...Object.keys(entry.unversioned_aliases ?? {})]);
    for (const file of files) assert.ok(registered.has(file), `${file} 未登记到 ${base} 代际族`);
  }
});

test("无版本别名声明的代际与实际内容一致，status 如实反映是否与该代际同文", () => {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, schemaPath(file)), "utf8"));
  for (const [family, entry] of families) {
    for (const [file, alias] of Object.entries(entry.unversioned_aliases ?? {})) {
      const target = entry.schemas[alias.declares_version];
      assert.ok(target, `${file}: 声明的 v${alias.declares_version} 未登记`);
      assert.ok(entry.resident.includes(alias.declares_version), `${file}: 别名只能指向常驻代际`);
      assert.equal(read(file).properties?.schema_version?.const, alias.declares_version, `${file}: schema_version 与声明不符`);
      assert.ok(["aligned", "diverged"].includes(alias.status), `${family}/${file}: status 只能是 aligned 或 diverged`);
      assert.equal(alias.status === "aligned", JSON.stringify(read(file)) === JSON.stringify(read(target)), `${file}: status=${alias.status} 与实际内容不符`);
      if (alias.status === "diverged") assert.ok(alias.note?.trim(), `${file}: diverged 必须写明差异与处理边界`);
      assert.ok(!excluded.has(schemaPath(file)), `${file}: 别名仍有消费者，不得排除出分发`);
    }
  }
});

test("常规分发只排除非常驻代际，常驻代际不得被排除", () => {
  for (const [family, entry] of families) {
    for (const [version, file] of Object.entries(entry.schemas)) {
      const resident = entry.resident.includes(Number(version));
      assert.equal(excluded.has(schemaPath(file)), !resident, `${family} v${version}: ${resident ? "常驻代际被排除出分发" : "非常驻代际仍随实例分发"}`);
    }
  }
});
