import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, validateSkillGovernance } from '../scripts/lib/skill-governance.mjs';

const read = (ref) => fs.readFileSync(path.join(ROOT, ref), 'utf8');
const exists = (ref) => fs.existsSync(path.join(ROOT, ref));
const workflowRef = '.template-spec/process/spec-workflow.json';
const stageRef = '.agents/skills/yss-prototype-stage/SKILL.md';

test('新 Spec 按需产品设计不要求主技能持有旧原型归档合同', () => {
  assert.doesNotThrow(() => validateSkillGovernance());
});

test('无新工作流声明的旧流程仍校验主技能原型合同', () => {
  const legacy = { exists: (ref) => ref !== workflowRef && exists(ref) };
  assert.throws(() => validateSkillGovernance(legacy), /原型阶段合同缺少 YSS adapter 标记/);
  const legacyStage = 'product-design-adapter.md\nPrototype Evidence schema v4\nVisual Baseline schema v1\nH1\nH2\n原型阶段不得调用生产组件库';
  assert.doesNotThrow(() => validateSkillGovernance({
    ...legacy,
    read: (ref) => ref === stageRef ? legacyStage : read(ref),
  }));
});

test('未知工作流、schema 或其他 Profile 不豁免旧原型合同', () => {
  for (const override of [{ specWorkflow: 'unknown' }, { schemaVersion: 2 }, { profile: 'backend' }]) {
    const workflow = { schemaVersion: 1, profile: 'spec', specWorkflow: 'matt-spec-v1', ...override };
    assert.throws(() => validateSkillGovernance({
      read: (ref) => ref === workflowRef ? JSON.stringify(workflow) : read(ref),
    }), /原型阶段合同缺少 YSS adapter 标记/);
  }
});

test('新 Spec 仍校验保留原型工具的离线边界和证据 schema', () => {
  for (const [target, marker, expected] of [
    ['.agents/skills/yss-prototype-stage/references/product-design-adapter.md', 'offline-html-v1', /adapter 缺少执行约束: offline-html-v1/],
    ['.template-spec/design/templates/prototype-evidence-template.yaml', 'schema_version: 4', /证据模板缺少 schema v4 字段: schema_version: 4/],
  ]) {
    assert.throws(() => validateSkillGovernance({
      read: (ref) => ref === target ? read(ref).replaceAll(marker, '') : read(ref),
    }), expected);
  }
});
