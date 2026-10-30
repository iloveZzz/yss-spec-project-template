import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = ".template-source/process/lib-coverage-allowlist.json";
const CATEGORIES = new Set(["legacy", "compatibility", "fixture-only", "to-backfill"]);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.name.endsWith(".mjs")) files.push(absolute);
  }
  return files;
}

function coverageSource(file, text) {
  if (file !== path.join(ROOT, "tests/verification-selection.test.mjs")) return text;
  // 选择器用路径作为测试输入；只计入自身实际导入。
  return [...text.matchAll(/(?:\bfrom\s+|\bimport\s*\()\s*['"]([^'"]+)['"]/g)].map((match) => match[1]).join("\n");
}

function scan() {
  const libs = fs.readdirSync(path.join(ROOT, "scripts/lib"))
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => "scripts/lib/" + name)
    .sort();
  const referenced = new Set();
  for (const file of walk(path.join(ROOT, "tests"))) {
    const text = coverageSource(file, fs.readFileSync(file, "utf8"));
    for (const lib of libs) {
      const base = path.posix.basename(lib, ".mjs");
      if (text.includes("lib/" + base) || text.includes(base + ".mjs")) referenced.add(lib);
    }
  }
  return { libs, referenced };
}

test("选择器输入路径不作为覆盖，直接导入仍计入", () => {
  const source = "const changed='scripts/lib/example-test-probe.mjs'; import { x } from '../scripts/lib/real-test-probe.mjs';";
  const actual = coverageSource(path.join(ROOT, "tests/verification-selection.test.mjs"), source);
  assert.doesNotMatch(actual, /example-test-probe/);
  assert.match(actual, /real-test-probe/);
  assert.equal(coverageSource(path.join(ROOT, "tests/other.test.mjs"), source), source);
});

test("scripts/lib 未覆盖台账与当前测试引用一致", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG), "utf8"));
  assert.equal(config.schema_version, 1);
  assert.ok(Array.isArray(config.entries), "entries 必须是数组");
  const declared = new Map();
  for (const entry of config.entries) {
    assert.equal(typeof entry.path, "string", "条目必须写 path");
    assert.ok(entry.path.startsWith("scripts/lib/") && entry.path.endsWith(".mjs"), "只登记 scripts/lib/*.mjs: " + entry.path);
    assert.ok(CATEGORIES.has(entry.category), "未知分类: " + entry.path);
    assert.equal(typeof entry.reason, "string");
    assert.ok(entry.reason.trim(), "条目必须写 reason: " + entry.path);
    assert.ok(!declared.has(entry.path), "重复登记: " + entry.path);
    const absolute = path.join(ROOT, entry.path);
    assert.ok(fs.existsSync(absolute), "登记项不存在: " + entry.path);
    declared.set(entry.path, entry);
  }
  const { libs, referenced } = scan();
  const uncovered = libs.filter((lib) => !referenced.has(lib));
  const missing = uncovered.filter((lib) => !declared.has(lib));
  const stale = [...declared.keys()].filter((lib) => !uncovered.includes(lib));
  assert.deepEqual(missing, [], "新增未覆盖模块必须登记: " + missing.join(", "));
  assert.deepEqual(stale, [], "已覆盖或已移除的登记必须清理: " + stale.join(", "));
  assert.equal(new Set(libs).size, libs.length, "scripts/lib 路径不得重复");
});
