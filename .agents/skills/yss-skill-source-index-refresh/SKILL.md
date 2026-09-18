---
name: yss-skill-source-index-refresh
description: Use when YSS backend component source or frontend UI documentation changes and skill source indexes need refreshing.
---

# YSS Skill Source Index Refresh

Use this maintenance skill to keep YSS skills grounded in current source and documentation.

中文说明：这个技能用于维护 YSS skills 的“源码索引”。后端组件库或前端文档入口变化后，运行脚本刷新引用文件。

## Source Location Policy

- Backend component source is generation-specific. Use `references/source-location.md` before trusting any generated path.
- Set both `YSS_SOURCE_ROOT_BOOT2_JAVA8` and `YSS_SOURCE_ROOT_BOOT3_JAVA17` to clean source trees. Do not point both variables at the same checkout or infer a platform line from a branch name.
- Frontend YSS UI components: `http://192.168.164.27:3200/components`
- Frontend YSS UI hooks: `http://192.168.164.27:3200/hooks`
- Frontend YSS UI skill docs: `http://192.168.164.27:3200/skills`

## Refresh Workflow

Run:

```bash
export YSS_SKILLS_ROOT="/path/to/.agents/skills"
export YSS_SOURCE_ROOT_BOOT2_JAVA8="/path/to/boot2-java8/yss-cloud-microservice"
export YSS_SOURCE_ROOT_BOOT3_JAVA17="/path/to/boot3-java17/yss-cloud-microservice"
node "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs"
```

Backend-only refreshes may set `YSS_REFRESH_FRONTEND=false` to avoid unrelated frontend timestamp churn.
Use `YSS_REFRESH_BACKEND_SKILLS=yss-mybatis` (comma-separated) to refresh only selected backend indexes and avoid unrelated component churn.

The script updates `references/source-index.md` for backend component skills and `references/frontend-docs.md` for frontend YSS UI skills. Read `references/source-map-config.md` for the full skill-to-source mapping.

所有后端组件 Skill 共用 [平台与源码门禁](references/backend-component-platform-compatibility.md)。`references/source-index.md` 是稳定选择页；真实生成索引分别为 `source-index.boot2-java8.md` 与 `source-index.boot3-java17.md`。刷新后使用批准的 `platform_configuration.component_platform_line` 运行 `scripts/check-backend-skill-source-index.mjs --skill <skill-id> --platform-line <line> --source-root <matching-root>`，确认组件 tree、组件子树状态和 v2 平台信号与所选源码行一致。

中文说明：脚本不会复制大段源码；通用组件生成可追踪的入口索引，持久化组件额外生成公开 API、配置开关和能力边界矩阵，方便 Agent 按需读取真实源码。

The refresh command requires both generation-specific roots. A targeted refresh may still use `YSS_REFRESH_BACKEND_SKILLS`, but it updates both platform tracks for every selected Skill.

## Output Contract

Generated source indexes should contain:

- explicit platform line, generated timestamp and trace-only source Git commit
- component-relative tree hashes and component-scoped worktree state
- component directories and documentation files
- Maven modules
- source file hashes and relocatable paths
- for capability-sensitive components, concise public signatures, configuration keys/defaults, conditional activation and capability boundaries extracted from source
- for other components, key Java classes matched by names such as annotations, auto configurations, properties, aspects, interceptors, handlers, repositories, DTOs, and result objects
- local Maven lineage、精确组件 GAV，以及继承的 Java/Spring Boot、`javax`/`jakarta` 和自动配置注册信号；这些是源码观察，不是兼容认证
- recommended next reads for Agent when performing implementation or troubleshooting

Do not paste full component source into `SKILL.md`. Keep `SKILL.md` short and let specialists read generated indexes or targeted assets only when needed.

## Freshness Gate

Before exact class/config/security guidance, choose the index track from the approved platform configuration, compare each indexed `Component tree` with `git -C "$MATCHING_SOURCE_ROOT" rev-parse HEAD:<component-path>` and check `git status --porcelain -- <component-path>`. A missing platform line, wrong-generation root, tree mismatch or component-local dirty state means `stale`: refresh the matching track or return `blocked`; do not fall back to the other generation. A repository commit difference alone is trace metadata and does not make the index stale when the component tree is unchanged. Historical path hints may still be used only to locate current source.

中文说明：`SKILL.md` 保持短小，细节放到 `references/`，这是为了降低每次触发技能时的上下文成本。

## After Refresh

Validate the migrated Node helper with:

```bash
node --test "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.test.mjs"
```

`yss-validation` 只索引当前仓库实际存在的 `yss-component-validation-jsr303`。历史 EL/parser 组件路径不存在时不得生成路径提示或宣称可接入；需要该能力时返回 `blocked` 并重新确认真实组件来源。
