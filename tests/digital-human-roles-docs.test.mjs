// 数字人角色说明（.md）与注册表（.yaml）的一致性：防止文档继续描述已退役角色或与 gate_policy 不符的会签。
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from '../scripts/vendor/yaml.mjs';
import {PROFILE_NAMES} from '../scripts/lib/profile-tree.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (ref) => readFileSync(path.join(root, ref), 'utf8');
const BASES = ['', ...PROFILE_NAMES.map((name) => `profiles/${name}/`)].filter((base) => existsSync(path.join(root, base, '.template-spec/agents/digital-human-roles.md')));
const ids = (text, prefix) => [...text.matchAll(new RegExp(`\`(${prefix}\\.[a-z0-9-]+)\``, 'g'))].map((match) => match[1]);

function load(base) {
  const doc = parse(read(`${base}.template-spec/agents/digital-human-roles.yaml`));
  const policy = doc.gate_policy ?? {};
  const rules = new Map();
  for (const key of ['digital_human_review', 'dual_digital_human', 'check_reviews']) {
    for (const row of policy[key] ?? []) rules.set(row.gate, {kind: 'review', drafter: row.drafter ?? null, countersigners: row.countersigners ?? []});
  }
  for (const gate of policy.orchestrator ?? []) rules.set(gate, {kind: 'orchestrator'});
  for (const key of ['biological_human', 'evidence_only', 'automatic_checks']) for (const gate of policy[key] ?? []) rules.set(gate, {kind: key});
  return {doc, rules, roles: new Set([doc.orchestrator?.id, ...(doc.roles ?? []).map((role) => role.id)])};
}

function countersignRows(text) {
  const lines = text.split('\n');
  const header = lines.findIndex((line) => /^\| 门禁 \/ (检查|工作单元) \| 起草 \| 会签 \|/.test(line));
  if (header < 0) return [];
  const rows = [];
  for (let index = header + 2; index < lines.length && lines[index].startsWith('|'); index += 1) {
    const [, gates, drafter, signers] = lines[index].split('|').map((cell) => cell.trim());
    rows.push({line: lines[index], gates: ids(gates, '(?:gate|check)'), drafter: ids(drafter, 'role'), signers: ids(signers, 'role')});
  }
  return rows;
}

for (const base of BASES) {
  const label = base || '根 profile';
  const md = `${base}.template-spec/agents/digital-human-roles.md`;

  test(`${label}：角色说明只引用注册表中存在的角色`, () => {
    const {roles} = load(base);
    for (const id of new Set(ids(read(md), 'role'))) assert.ok(roles.has(id), `${md} 引用了注册表中不存在的 ${id}`);
  });

  test(`${label}：会签表与 gate_policy 一致`, () => {
    const {rules} = load(base);
    for (const row of countersignRows(read(md))) {
      for (const gate of row.gates) {
        const rule = rules.get(gate);
        assert.ok(rule, `${md} 的会签表列出未分类的 ${gate}`);
        if (rule.kind === 'review') {
          if (rule.drafter) assert.deepEqual(row.drafter, [rule.drafter], `${gate} 起草者与注册表不一致：${row.line}`);
          assert.deepEqual([...row.signers].sort(), [...rule.countersigners].sort(), `${gate} 会签人与注册表不一致：${row.line}`);
        } else if (rule.kind === 'orchestrator') {
          assert.deepEqual(row.signers, [], `${gate} 由主控放行，不应列会签角色：${row.line}`);
        } else {
          assert.deepEqual(row.signers, [], `${gate} 属于 ${rule.kind}，不应列数字人会签：${row.line}`);
        }
      }
    }
  });

  const glossary = `${base}.template-spec/process/process-glossary.md`;
  if (existsSync(path.join(root, glossary))) {
    test(`${label}：术语表不把在册角色标为已退役`, () => {
      const {doc} = load(base);
      const text = read(glossary);
      for (const role of doc.roles ?? []) assert.doesNotMatch(text, new RegExp(`\\| ${role.name}（已退役）`), `${glossary} 把在册角色 ${role.id} 标为已退役`);
    });
  }
}
