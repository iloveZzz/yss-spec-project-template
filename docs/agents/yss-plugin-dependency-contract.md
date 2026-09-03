# YSS 插件依赖契约

## 目的

YSS Codex 插件可以随插件包提供角色 Harness skill，但不拥有目标项目的共享 skill。共享 skill 的权威内容仍是目标项目的 `.agents/skills`，投影、来源和 hash 由目标项目的 `skills-lock.json` 与 `docs/agents/yss-skill-registry.yaml` 管理。

插件依赖文件位于插件根目录 `.yss-plugin/dependencies.yaml`，用于声明插件需要的角色契约，而不是复制 `core_skills` 清单。

```yaml
schema_version: 1
plugin: yss-backend-harness
requires:
  - role_id: role.backend-engineer
    registry: docs/agents/digital-human-roles.yaml
    minimum_contract_version: 1
```

## 校验规则

1. 插件导入时只校验 `dependencies.yaml` 的结构、插件名和 `schema_version`。
2. 插件调用前必须校验目标项目 `yss-project.yaml`，且 `repository_mode` 合法。
3. 目标项目必须存在依赖声明中的角色，且 `contract_version` 不低于 `minimum_contract_version`。
4. 角色的 `core_skills` 由目标项目的 `digital-human-roles.yaml` 动态解析；插件不得维护第二份清单。
5. 共享 skill 必须通过 `yss-skill-registry.yaml`、`skills-lock.json` 和目标 Agent projection 校验。
6. 缺少角色、版本不兼容、skill 缺失、来源或 hash 漂移、投影不完整时，插件必须返回 `blocked`，不得降级执行。
7. 插件不得自动写入 `.agents/skills`、`skills-lock.json` 或任何 Agent projection；修复应回路由到目标项目维护流程。

## 运行时结果

依赖不满足时至少返回：

```yaml
status: blocked
blocking_signals: [missing-role]
diagnostics:
  plugin: yss-backend-harness
  required_role: role.backend-engineer
  next_route: install-or-sync-target-project-skills
```

`blocking_signals` 可使用 `repository-identity-invalid`、`missing-role`、`incompatible-contract-version`、`missing-skill`、`skill-source-drift`、`skill-hash-drift` 和 `skill-projection-incomplete`。

## 版本策略

依赖文件 schema 只保证同一主版本向后兼容。插件的 `minimum_contract_version` 是硬门槛；`tested_with` 等兼容性信息只能作为提示，不能替代目标项目的契约版本校验。
