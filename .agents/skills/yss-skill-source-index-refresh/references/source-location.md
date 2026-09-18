# YSS Source Location Policy

YSS skill references may mention paths such as `yss-microservice-components/yss-component-dto`. Treat these as source path hints, not guaranteed filesystem locations.

## Lookup Order

1. Check the current workspace first. If `.codegraph/` exists, use `codegraph explore "<class, module, or path hint>"` before text search.
2. Resolve the approved `platform_configuration.component_platform_line`, then use `YSS_SOURCE_ROOT_BOOT2_JAVA8` or `YSS_SOURCE_ROOT_BOOT3_JAVA17`. Each variable points to a different generation-specific repository root containing `yss-microservice-components`.
   Compare every indexed `Component tree` in the selected platform file with `git -C "$MATCHING_SOURCE_ROOT" rev-parse HEAD:<component-path>` and check `git status --porcelain -- <component-path>`. A line/root mismatch, tree mismatch or component-local dirty state is `stale` and blocks exact implementation guidance until refresh. `Source commit` is trace metadata only; unrelated monorepo changes do not stale an unchanged component tree.
3. If the required generation-specific variable is absent, locate a clean checkout using CodeGraph, Git worktree inventory, Maven coordinates or repository search, then set the explicit variable. Do not use an arbitrary checkout discovered first.
4. If the source still cannot be found, use the generated `references/source-index.md` as a stale-but-useful map of module names, package names, class names, and Maven artifacts. Do not assume listed files exist locally.

## For Skill Authors

- Say "source path hints" instead of "source root" unless you have verified the directory in the current environment.
- Keep generated indexes useful for search, but do not require agents to open those exact paths.
- Prefer symbols, package names, Maven artifact names, and annotations in instructions; they survive repository relocation better than absolute paths.
- Keep full production source out of skill `assets/`; generate concise signatures, activation conditions and file hashes instead.
- When refreshing indexes, export both generation-specific variables; targeted skill refresh still regenerates both tracks for the selected Skill.
