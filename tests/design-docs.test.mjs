import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../scripts/vendor/yaml.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS = path.join(ROOT, ".template-source/contracts");
const REQUIRED = ["design_id", "version", "status", "repository_mode", "intensity", "owner", "updated_at", "spec", "work_package"];

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, "缺少前置元数据");
  return parseDocument(match[1], { uniqueKeys: true, maxAliasCount: 0 }).toJS({ maxAliasCount: 0 });
}

/** 加固轮次的设计文档：前置元数据带 work_package 的合同文档。旧的设计文档不在此列。 */
function designDocs() {
  return fs.readdirSync(CONTRACTS)
    .filter((name) => name.endsWith("-design.md"))
    .map((name) => ({ name, text: fs.readFileSync(path.join(CONTRACTS, name), "utf8") }))
    .filter(({ text }) => /^---\n[\s\S]*?\nwork_package:/.test(text));
}

test("加固轮次的设计文档至少包括 WP-10 的 Spec Delta 合并设计", () => {
  assert.ok(designDocs().some(({ name }) => name === "spec-delta-rebaseline-design.md"));
});

test("设计文档的前置元数据完整，design_id 与文件名一致，状态是 proposed 或 accepted", () => {
  for (const { name, text } of designDocs()) {
    const meta = frontmatter(text);
    for (const key of REQUIRED) assert.ok(meta[key] !== undefined && meta[key] !== "", `${name} 缺少 ${key}`);
    assert.equal(meta.design_id, name.replace(/\.md$/, ""), `${name} 的 design_id 应与文件名一致`);
    assert.ok(["proposed", "accepted"].includes(meta.status), `${name} 的 status 无效`);
    assert.equal(meta.repository_mode, "template-source");
    assert.ok(fs.existsSync(path.join(CONTRACTS, meta.spec)), `${name} 引用的规格 ${meta.spec} 不存在`);
  }
});

test("设计文档的相对链接都能解析到仓内文件", () => {
  for (const { name, text } of designDocs()) {
    for (const [, target] of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(CONTRACTS, target)), `${name} 的链接 ${target} 不存在`);
    }
  }
});

test("设计文档带决策记录表；status 为 proposed 时决定与签署列必须为空，不得冒充已签署", () => {
  for (const { name, text } of designDocs()) {
    const meta = frontmatter(text);
    const start = text.search(/^## .*决策记录/m);
    assert.ok(start >= 0, `${name} 缺少决策记录章节`);
    const lines = text.slice(start).split("\n");
    const header = lines.findIndex((line) => line.startsWith("| ") && line.includes("决定") && line.includes("签署人"));
    assert.ok(header >= 0, `${name} 的决策记录缺少含“决定”“签署人”的表头`);
    const columns = lines[header].split("|").slice(1, -1).map((cell) => cell.trim());
    const decided = columns.indexOf("决定");
    const signer = columns.indexOf("签署人");
    const rows = [];
    for (let index = header + 2; index < lines.length && lines[index].startsWith("|"); index += 1) rows.push(lines[index].split("|").slice(1, -1).map((cell) => cell.trim()));
    assert.ok(rows.length > 0, `${name} 的决策记录没有条目`);
    if (meta.status === "proposed") {
      for (const row of rows) assert.ok(!row[decided] && !row[signer], `${name} 状态为 proposed，却已填写决定或签署：${row[0]}`);
    }
  }
});
