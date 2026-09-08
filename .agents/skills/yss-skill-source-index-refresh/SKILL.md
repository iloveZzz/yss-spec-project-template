---
name: yss-skill-source-index-refresh
description: Use when YSS backend component source or frontend UI documentation changes and skill source indexes need refreshing.
---

# YSS Skill Source Index Refresh

Use this maintenance skill to keep YSS skills grounded in current source and documentation.

中文说明：这个技能用于维护 YSS skills 的“源码索引”。后端组件库或前端文档入口变化后，运行脚本刷新引用文件。

## Source Location Policy

- Backend component source is environment-specific. Use `references/source-location.md` before trusting any generated path.
- Preferred explicit setting: `YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice`.
- Frontend YSS UI components: `http://192.168.164.27:3200/components`
- Frontend YSS UI hooks: `http://192.168.164.27:3200/hooks`
- Frontend YSS UI skill docs: `http://192.168.164.27:3200/skills`

## Refresh Workflow

Run:

```bash
export YSS_SKILLS_ROOT="/path/to/.agents/skills"
export YSS_SOURCE_ROOT="/path/to/yss-cloud-microservice"
node "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs"
```

Backend-only refreshes may set `YSS_REFRESH_FRONTEND=false` to avoid unrelated frontend timestamp churn.
Use `YSS_REFRESH_BACKEND_SKILLS=yss-mybatis` (comma-separated) to refresh only selected backend indexes and avoid unrelated component churn.

The script updates `references/source-index.md` for backend component skills and `references/frontend-docs.md` for frontend YSS UI skills. Read `references/source-map-config.md` for the full skill-to-source mapping.

中文说明：脚本不会复制大段源码；通用组件生成可追踪的入口索引，持久化组件额外生成公开 API、配置开关和能力边界矩阵，方便 Agent 按需读取真实源码。

If `YSS_SOURCE_ROOT` is omitted, the script tries to find a repository containing `yss-microservice-components` from the current workspace and common local project folders. If it cannot find one, set `YSS_SOURCE_ROOT` explicitly.

## Output Contract

Generated source indexes should contain:

- generated timestamp and trace-only source Git commit
- component-relative tree hashes and component-scoped worktree state
- component directories and documentation files
- Maven modules
- source file hashes and relocatable paths
- for capability-sensitive components, concise public signatures, configuration keys/defaults, conditional activation and capability boundaries extracted from source
- for other components, key Java classes matched by names such as annotations, auto configurations, properties, aspects, interceptors, handlers, repositories, DTOs, and result objects
- recommended next reads for Agent when performing implementation or troubleshooting

Do not paste full component source into `SKILL.md`. Keep `SKILL.md` short and let specialists read generated indexes or targeted assets only when needed.

## Freshness Gate

Before exact class/config/security guidance, compare each indexed `Component tree` with `git -C "$YSS_SOURCE_ROOT" rev-parse HEAD:<component-path>` and check `git status --porcelain -- <component-path>`. A tree mismatch or component-local dirty state means `stale`: refresh the index or return `blocked`; do not silently rely on the old snapshot. A repository commit difference alone is trace metadata and does not make the index stale when the component tree is unchanged. Historical path hints may still be used only to locate current source.

中文说明：`SKILL.md` 保持短小，细节放到 `references/`，这是为了降低每次触发技能时的上下文成本。

## After Refresh

Validate the migrated Node helper with:

```bash
node --test "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.test.mjs"
```
