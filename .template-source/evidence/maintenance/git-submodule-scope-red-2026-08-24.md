# git-submodule repository_scope RED 基线

日期：2026-08-24

命令：`node scripts/verify-repository-scope-scenarios`

退出码：1

在权威资产尚未写入 `git-submodule` 标记时，场景校验按预期失败。政策用例本身已通过；失败项全部是缺失标记：

```
场景资产缺少标记 repository_scope: git-submodule: docs/process/implementation-repo-integration.md
场景资产缺少标记 git-submodule: docs/templates/implementation-repo-registry-template.md
场景资产缺少标记 git-submodule-harness-apps: docs/templates/implementation-repo-registry-template.md
场景资产缺少标记 superproject-gitlink-update: docs/templates/cross-repo-slice-template.md
场景资产缺少标记 git-submodule-harness-apps: docs/templates/implementation-routing-template.md
场景资产缺少标记 git-submodule: .agents/skills/implementation-repo-onboarding/SKILL.md
场景资产缺少标记 git-submodule-harness-apps: .agents/skills/yss-router/references/slice-implementation-contract.md
场景资产缺少标记 git-submodule-harness-apps: .agents/skills/yss-router/references/router-contract.yaml
场景资产缺少标记 repository_scope=git-submodule: .agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml
场景资产缺少标记 gitSubmoduleScaffoldViolation: .agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs
EXIT:1
```
