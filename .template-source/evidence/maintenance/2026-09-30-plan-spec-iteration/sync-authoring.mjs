// Task-scoped, idempotent source synchronization. Does not publish or commit.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { treeHash } from '../../../../scripts/lib/skill-supply-chain.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
const upstream = path.join(root, 'submodules/yss-harness-design-agent/.agents/skills/yss-stage-decision');
const source = readFileSync(path.join(upstream, 'SKILL.md'), 'utf8');
const paragraph = source.match(/^Plan 成功标准在既有[\s\S]*?(?=\n\n## 控制面引用)/m)?.[0];
if (!paragraph) throw new Error('战略源仓缺少目标表达约定');
const target = path.join(root, '.agents/skills/yss-stage-decision/SKILL.md');
let current = readFileSync(target, 'utf8');
if (!current.includes(paragraph)) {
  if (current.includes('Plan 成功标准在既有') || current.split('## 控制面引用').length !== 2) throw new Error('父模板适配基线冲突');
  writeFileSync(target, current.replace('## 控制面引用', `${paragraph}\n\n## 控制面引用`));
}
const manifestFile = path.join(root, '.agents/skills/.strategic-design-skills-manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile));
manifest.skills.find(item => item.canonical === 'yss-stage-decision').upstream_hash = treeHash(upstream);
manifest.source_state = 'working-tree';
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
const note = readFileSync(path.join(root, '.agents/skills/yss-product-lifecycle/references/plan-requirements.md'), 'utf8').match(/^起草 Plan 使用.*$/m)?.[0];
if (!note) throw new Error('缺少起草入口引用');
for (const [profile, skill] of [['design','yss-strategic-design'],['backend','harness-orchestrator'],['frontend','harness-orchestrator']]) {
  const file = path.join(root, `submodules/yss-harness-${profile}-agent/.agents/skills/${skill}/references/plan-requirements.md`);
  current = readFileSync(file, 'utf8');
  if (!current.includes(note)) {
    if (current.includes('起草 Plan 使用')) throw new Error(`profile 起草引用冲突：${profile}`);
    writeFileSync(file, `${current.trimEnd()}\n\n${note}\n`);
  }
}
console.log('战略源段落、父模板薄适配、来源摘要和 profile 起草引用已同步');
