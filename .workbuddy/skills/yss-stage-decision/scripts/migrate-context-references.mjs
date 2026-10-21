#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { parseContextContract, resolveContextTermRefs } from "../../../../scripts/lib/context-contract.mjs";

function migrationRequired(message) {
  const error = new TypeError(`migration-required: ${message}`);
  error.code = "migration-required";
  throw error;
}

function migrateReference(reference, context) {
  if (typeof reference !== "string") migrationRequired(`术语引用必须是字符串: ${String(reference)}`);
  const scoped = reference.match(/^contexts\/([A-Z][A-Za-z0-9]+)\/CONTEXT\.md#([A-Z][A-Za-z0-9]+)$/);
  if (scoped) {
    const termRef = `${scoped[1]}/${scoped[2]}`;
    if (!context.terms_by_ref.has(termRef)) migrationRequired(`旧引用无法唯一定位根 CONTEXT.md 术语: ${reference}`);
    return termRef;
  }
  const root = reference.match(/^CONTEXT\.md#([A-Z][A-Za-z0-9]+)$/);
  if (root) {
    const matches = context.business_terms.filter((term) => term.english_identifier === root[1]);
    if (matches.length !== 1) migrationRequired(`旧引用无法唯一定位根 CONTEXT.md 术语: ${reference}`);
    return matches[0].term_ref;
  }
  migrationRequired(`旧引用无法唯一定位根 CONTEXT.md 术语: ${reference}`);
}

try {
  const { values, positionals } = parseArgs({ options: { root: { type: "string", default: process.cwd() } }, allowPositionals: true, strict: true });
  const file = positionals[0];
  if (!file) migrationRequired("用法: migrate-context-references.mjs <contract.yaml> [--root <project-root>]");
  const source = await readFile(file, "utf8");
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) migrationRequired(`YAML 非法: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) migrationRequired("合同必须是对象");
  if (value.schema_version !== 1) migrationRequired("只迁移 schema_version: 1 合同");
  if (!Array.isArray(value.terminology_refs)) migrationRequired("v1 合同缺少 terminology_refs");

  const context = parseContextContract({ root: values.root });
  const termRefs = [...new Set(value.terminology_refs.map((reference) => migrateReference(reference, context)))].sort();
  const resolved = resolveContextTermRefs(context, termRefs);
  const migrated = {
    ...value,
    schema_version: 2,
    context_snapshot: {
      context_ref: "CONTEXT.md",
      context_schema_version: 1,
      document_digest: context.document_digest,
      referenced_terms_digest: resolved.referenced_terms_digest,
      term_refs: termRefs,
    },
  };
  delete migrated.terminology_refs;
  process.stdout.write(`${JSON.stringify(migrated, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ result: "blocked", reason_code: error.code || "migration-required", errors: [error.message] }, null, 2)}\n`);
  process.exitCode = 1;
}
