# 战略设计技能集成合同

`iloveZzz/yss-harness-design-agent` 是以下公共技能 ID 的上游业务 profile：

- `prototype-review`
- `yss-prototype-stage`
- `yss-design-system`
- `yss-antd-design`
- `yss-antdv-next-design`
- `yss-stage-decision`

父模板通过 `.agents/skills/.strategic-design-skills-manifest.json` 固定上游 Git revision、路径和 tree hash。公共 ID 不因 profile 改名；共享规则先在战略设计源仓演进，再由父模板同步。

## 父模板薄适配

父模板承载完整产品研发生命周期，只允许在以下位置保留最小语境差异：

| 技能 | 父模板适配 |
|---|---|
| `prototype-review` | 将评审结论回交 `yss-product-lifecycle`，通过后可进入实现合同编译准备 |
| `yss-prototype-stage` | 用户确认后由完整生命周期判断 API 影响和实现准备 |
| `yss-stage-decision` | 门禁状态由 `yss-product-lifecycle` 维护 |

`yss-design-system`、`yss-antd-design` 与 `yss-antdv-next-design` 当前不需要父模板内容适配，必须与锁定的上游 tree hash 一致。任何有效内容差异都必须保留本文件为 `adaptationRef`，不得复制成第二套公共技能身份。

## 更新与验证

1. 先在战略设计源仓形成并推送固定 commit。
2. 更新 manifest 的 `source_revision` 和每项 `upstream_hash`。
3. 同步父模板 canonical 内容，仅重放上表允许的薄适配。
4. 运行 `scripts/update-skill-lock`、`scripts/sync-skills`。
5. 运行：

   ```bash
   scripts/verify-upstream-skill-source \
     --source=iloveZzz/yss-harness-design-agent \
     --source-root=submodules/yss-harness-design-agent
   scripts/verify-skill-governance
   scripts/verify-template-fast
   ```

父模板、战略设计源仓与 CLI 快照必须按源仓 → 父模板 → CLI 顺序固定 revision；旧实例不回填，也不提供迁移检查器。

## 真实用户决定适配

模板生命周期的关键决定统一消费 `docs/agents/digital-human-roles.yaml.user_decision_policy`。本地原型确认与阶段决策批准追加真实回复、当前资产和范围校验；数字人审查保留。记录协议见 [用户决定协议](../../.agents/skills/yss-product-lifecycle/references/user-decisions.md)。此适配只更新 effective hash，不改写已锁定的上游 revision/hash，也不发布外部技能源。
