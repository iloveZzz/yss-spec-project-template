# git-submodule repository_scope L3 正式独立审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析，不表示审查已通过。

## 范围

把 `repository_scope: git-submodule` 升级为 `project-instance` 的正式第三拓扑：独立实现仓以 gitlink 挂到 `apps/backend/<project>/` 或 `apps/frontend/<project>/`，并补齐登记、Router 路径策略、嵌套 Git 授权和空 gitlink 脚手架阻断。

候选冻结后由非实施者执行 `formal-independent` 审查。本请求不宣布模板可发布。

## 请审查

1. `git-submodule` 是否与 `harness-apps`、`external-repository` 在登记字段、Git 身份和写路径上可区分，有无误路由窗口。
2. 空 gitlink / detached HEAD / `--force` 覆盖挂载点是否仍会被脚手架或 Agent 当成普通目录。
3. 先子后父 commit/push 与 `superproject-gitlink-update` 是否覆盖跨仓切片交付，而不是只写在散文里。
4. CLI 不接管 `.gitmodules` 与 gitlink 是否与 `create-yss-spec` 契约一致。
5. 压力场景是否覆盖未知 scope、layout 错配、同源 url、复制源码进 Harness。

## 关键路径

- `docs/process/implementation-repo-integration.md` §1.3
- `docs/templates/implementation-repo-registry-template.md`
- `scripts/lib/repository-scope-policy.mjs`
- `.agents/skills/implementation-repo-onboarding/SKILL.md`
- `.agents/skills/yss-router/references/router-contract.yaml`
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`
- `.agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs`
