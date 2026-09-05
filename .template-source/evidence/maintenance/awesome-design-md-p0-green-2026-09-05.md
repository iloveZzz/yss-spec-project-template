# `awesome-design-md` P0 GREEN 与自检证据

定向验证：

```text
node --test .template-source/tooling/node/test/design-md.test.mjs
node .agents/skills/yss-prototype-stage/tests/run-scenarios.mjs
node .agents/skills/yss-antdv-next-design/tests/run-scenarios.mjs
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-evidence docs/design/templates/prototype-evidence-template.yaml --allow-template
node .agents/skills/yss-antdv-next-design/scripts/validate-fact-pack.mjs docs/design/facts/antdv-next/1.5.2/manifest.json
node .agents/skills/yss-antdv-next-design/scripts/validate-fact-pack.mjs .template-source/evidence/maintenance/antdv-next-p0-facts/1.5.2/manifest.json
node .template-source/tooling/node/scripts/design-md.mjs lint DESIGN.md
node .template-source/tooling/node/scripts/design-md.mjs drift
scripts/sync-skills --check
scripts/update-skill-lock --check
```

结果：全部通过。`DESIGN.md` lint 为 `0 errors / 0 warnings`，投影无漂移；两个 AntDV Next 事实包均通过根 `DESIGN.md` 摘要校验。

维护者自检结论：

- 只落实推荐 A 的 P0 内部合同修复，没有新增 P1 章节；
- 根 `DESIGN.md` 是视觉 token 与组件变体唯一事实来源，治理文档只解释流程，`docs/design/tokens/*` 只承载派生投影；
- H1 适配器消费当前 token，拒绝旧 alias 和已识别的硬编码基线；
- H2 provider facts 同时绑定根 `DESIGN.md` 与项目治理 / token 摘要；
- canonical skill 已同步到各 Agent 投影，`skills-lock.json` 已更新。

完整门禁：

```text
scripts/verify-template-fast
```

该命令因 `.template-source/tooling/node/scripts/design-md.mjs` 属于核心核验资产而自动升级到 `release` profile，最终通过全部模板核验。
