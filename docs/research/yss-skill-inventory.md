# YSS 技能权威源、投影与锁文件盘点

- 关联 Ticket：[盘点 YSS 技能权威源、投影与锁文件事实](https://github.com/iloveZzz/yss-spec-project-template/issues/34)
- 盘点日期：2026-08-07
- 盘点范围：`.agents/skills`、`.claude/skills`、`.codex/skills`、`.hermes/skills`、`.pi/skills`、`.trae/skills`、`skills-lock.json`、`scripts/sync-skills`、`scripts/update-skill-lock`、`scripts/verify-template`

## 结论

当前不是“锁文件未登记导致的投影漂移”，而是两类技能共存造成的认知复杂度：

1. 17 个共享 YSS skills 以 `.agents/skills` 为权威源，并投影到五个 Agent roots。
2. 32 个 YSS skills 是 `.codex/skills` 的平台专属 skills，登记在 `skills-lock.json.skills.platform[".codex/skills"]`，不会投影到其他 Agent roots。
3. 因此 Codex 可见 49 个 `yss-*`，其他 Agent roots 各可见 17 个；这符合当前锁文件模型，不能直接判定为同步故障。
4. 真实问题转为：YSS 命名空间把共享后端骨架、Codex-only 后端组件、前端能力、生命周期和治理能力混在同一平面；当前没有面向使用者的能力目录和清晰的跨 Agent 可用性说明。

## 目录事实

| Root | `yss-*` 数量 | 角色 | 证据 |
|---|---:|---|---|
| `.agents/skills` | 17 | 共享技能权威源 | `skills-lock.json.canonicalRoot`；`scripts/sync-skills` 的 `SOURCE_ROOT` |
| `.claude/skills` | 17 | 共享技能投影 | `scripts/sync-skills` 的 `PROJECTION_ROOTS` |
| `.codex/skills` | 49 | 17 个共享投影 + 32 个 Codex-only 平台技能 | `skills-lock.json.skills.platform[".codex/skills"]` |
| `.hermes/skills` | 17 | 共享技能投影 | `scripts/sync-skills` 的 `PROJECTION_ROOTS` |
| `.pi/skills` | 17 | 共享技能投影 | `scripts/sync-skills` 的 `PROJECTION_ROOTS` |
| `.trae/skills` | 17 | 共享技能投影 | `scripts/sync-skills` 的 `PROJECTION_ROOTS` |

共享目录是：

```text
yss-api-integration
yss-backend-scaffold-adapter
yss-backend-scaffold-application
yss-backend-scaffold-domain
yss-backend-scaffold-infrastructure
yss-backend-scaffold-parent
yss-backend-scaffold-web
yss-cache
yss-ddd-scaffold-generator
yss-domain
yss-dto
yss-mybatis
yss-page-module-development
yss-product-lifecycle
yss-repository
yss-router
yss-web-controller
```

Codex-only 目录是：

```text
yss-audit-log, yss-components, yss-db2mybatis, yss-design-system,
yss-dictionary, yss-distributed-id, yss-duckdb, yss-excel-mvc,
yss-exception, yss-formily,
yss-formily-schema-generator, yss-frontend-scaffold-generator, yss-hook,
yss-jdbc, yss-log, yss-microapp-commit,
yss-openapi, yss-openapi-draft-review, yss-openapi-governance,
yss-resilience4j, yss-security-algorithm, yss-source-index, yss-sql-condition,
yss-sql-tpl, yss-taskflow, yss-ui, yss-up-springboot3,
yss-use-table-height, yss-use-tree-height, yss-userinfo, yss-validation,
yss-valuation
```

## 锁文件与验证事实

- `skills-lock.json` 为 version 3，`canonicalRoot` 为 `.agents/skills`，同时声明 shared 与 platform 两组。
- `scripts/update-skill-lock --check` 通过，说明当前已跟踪技能目录与锁文件内容一致；平台专属目录也在检查范围内。
- `scripts/sync-skills --check` 通过，说明 17 个 shared skills 的五个投影没有哈希/链接漂移。该脚本只同步 shared skills，不会把 Codex-only skills 投影到其他 roots。
- `scripts/verify-template` 通过全部模板、生命周期和 YSS Router 场景，当前没有发布门禁失败。
- `.codex/skills` 中共享目录部分使用符号链接或同步副本；平台专属目录独立存在，不是 `.agents/skills` 的缺失投影。

## Source index 事实

`yss-source-index` 当前位于 `.codex/skills/yss-source-index`，并在 `skills-lock.json` 的 `.codex/skills` platform 组中登记。其 `SKILL.md` 要求使用 `YSS_SOURCE_ROOT` 指向外部 `yss-cloud-microservice`，并生成各组件 `references/source-index.md` 或 frontend 文档入口。

因此“`.agents/skills/yss-source-index` 缺失”不是锁文件错误，而是维护能力被限制在 Codex 平台。是否应提升为共享维护能力，或拆成共享规范 + Codex 执行器，是后续分类/粒度决策，不在本盘点中直接决定。

## 待决策问题

1. 是否继续允许 Codex-only YSS skills 使用 `yss-*` 命名空间，还是按 backend/frontend/governance 等能力族提供可发现的分组入口。
2. 哪些 Codex-only backend component skills 需要跨 Agent 可用，哪些确实依赖 Codex 的本地源码索引和执行器。
3. 是否将“能力清单/索引”作为独立共享入口，避免使用者把 17 个 shared skills 与 32 个 platform skills 当成同一层级的 49 个入口。
4. `sync-skills`、`update-skill-lock` 和 `verify-template` 是否需要输出按能力域聚合的诊断，而不只报告目录/哈希一致性。
