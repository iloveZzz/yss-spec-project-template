import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseContextSource } from "../scripts/lib/context-contract.mjs";
import { collectMetrics } from "../scripts/lib/harness-metrics.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const GLOSSARY = ".template-spec/process/process-glossary.md";
const BUSINESS_TABLE = "| 术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注 |\n|---|---|---|---|---|\n";

/** NFR-003：AGENTS.md、CONTEXT.md 与生命周期入口技能的常驻读取预算（字节）。 */
const RESIDENT_BUDGET = 25000;

function glossaryRows() {
  const lines = read(GLOSSARY).split("\n");
  const header = lines.findIndex((line) => line.startsWith("| 术语 |"));
  assert.ok(header >= 0, "术语表缺少表头");
  const rows = [];
  for (let index = header + 2; index < lines.length && lines[index].startsWith("|"); index += 1) rows.push(lines[index]);
  return { header: lines[header], separator: lines[header + 1], rows };
}

test("FR-012：根 CONTEXT.md 不含流程术语行，保留合同要求的标题与表头，并指向术语表", () => {
  const context = parseContextSource(read("CONTEXT.md"));
  assert.equal(context.process_terms, 0);
  assert.equal(context.business_terms.length, 0, "模板源不放虚构业务行");
  const text = read("CONTEXT.md");
  assert.match(text, /\[process-glossary\.md\]\(\.template-spec\/process\/process-glossary\.md\)/);
  assert.doesNotMatch(text, /Grok|群聊人数|人数上限/, "运行时平台细节不属于 CONTEXT.md");
});

test("术语表按与原 CONTEXT.md 相同的规则校验：必填列非空、英文标识为 —、术语不重复", () => {
  const { header, separator, rows } = glossaryRows();
  assert.ok(rows.length >= 90, `术语表应承接全部流程术语，实际 ${rows.length} 行`);
  // 借用 CONTEXT 合同解析器，沿用“流程术语英文标识必须为 —”“必填列不得为空”的同一套检查。
  const wrapped = `---\ncontext_schema_version: 1\n---\n## 流程术语\n\n${header}\n${separator}\n${rows.join("\n")}\n\n## 业务术语\n\n${BUSINESS_TABLE}`;
  assert.equal(parseContextSource(wrapped).process_terms, rows.length);
  const terms = rows.map((row) => row.split("|")[1].trim());
  assert.equal(new Set(terms).size, terms.length, "流程术语不得重复");
});

test("运行时平台细节不在术语表里：Grok Bot 与群聊人数只在数字人角色文档的运行时绑定中", () => {
  const glossary = read(GLOSSARY);
  const table = glossary.slice(glossary.indexOf("| 术语 |"));
  assert.doesNotMatch(table, /Grok|群聊人数|人数上限/);
  const roles = read(".template-spec/agents/digital-human-roles.md");
  assert.match(roles, /`runtime\.grok`[^\n]*不是数字人角色、技能或门禁/);
});

test("被迁出的入口都能到达术语表：AGENTS.md 阅读地图、CONTEXT.md、工程概览，且相对链接不断链", () => {
  for (const file of ["AGENTS.md", "CONTEXT.md", ".template-source/process/template-engineering-overview.md"]) {
    assert.match(read(file), /process-glossary\.md/, `${file} 应指向术语表`);
  }
  for (const file of [GLOSSARY, "CONTEXT.md"]) {
    for (const [, target] of read(file).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(ROOT, file)), target)), `${file} 的链接 ${target} 不存在`);
    }
  }
});

test("NFR-003：AGENTS.md、CONTEXT.md 与 yss-product-lifecycle/SKILL.md 合计不超过常驻预算", () => {
  const { total_bytes: total, files } = collectMetrics(ROOT).resident_context;
  assert.ok(total <= RESIDENT_BUDGET, `常驻读取 ${total} B 超过预算 ${RESIDENT_BUDGET} B：${files.map((item) => `${item.path} ${item.bytes}`).join("，")}`);
});

test("NFR-005：.template-spec/process 只净增术语表一个文件", () => {
  const baseline = 94; // 加固开始时的文件数（harness-metrics 基线）
  assert.ok(collectMetrics(ROOT).process_files <= baseline + 1, "流程文档数净增不得超过 1");
});
