# YSS Source Location Policy

YSS skill references may mention paths such as `yss-microservice-components/yss-component-dto`. Treat these as source path hints, not guaranteed filesystem locations.

## Lookup Order

1. Check the current workspace first. If `.codegraph/` exists, use `codegraph explore "<class, module, or path hint>"` before text search.
2. If the component source is outside the workspace, use `YSS_SOURCE_ROOT` when it is set. It should point to the repository root that contains `yss-microservice-components`.
3. If `YSS_SOURCE_ROOT` is not set, search common local roots such as the current repository parents, `~/Projects`, `~/Documents`, and `~/Documents/yss-project`.
4. If the source still cannot be found, use the generated `references/source-index.md` as a stale-but-useful map of module names, package names, class names, and Maven artifacts. Do not assume listed files exist locally.

## For Skill Authors

- Say "source path hints" instead of "source root" unless you have verified the directory in the current environment.
- Keep generated indexes useful for search, but do not require agents to open those exact paths.
- Prefer symbols, package names, Maven artifact names, and annotations in instructions; they survive repository relocation better than absolute paths.
- When refreshing indexes, set `YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice` if auto-detection cannot find the component repository.
