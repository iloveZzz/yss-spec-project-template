# 三分拓扑运行时入口 L2 聚焦审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析。

## 范围

模板源 `local-rule`：让 Agent 按 ADR-0008 / 接入文档 §1.0 的三分拓扑写路径。不改脚手架生成器、不放松 `apps/` 生成红线、不改 `create-yss-spec` 源码。

## 请审查

1. `AGENTS.md` §9 三分支是否足够短且指向事实源，有没有把「同仓」重新写成必须 `apps/`。
2. `implementation-repo-onboarding` 是否仍会 clone 进已有一体仓，或把迁到 `apps/` 当 onboarding。
3. `yss-router` 硬规则与 `router-contract.yaml` 的 `applies_to` 是否仍只约束新建/脚手架的 `harness-resident-runtime-code`，native（含 attach 同仓）是否禁止改写成 `apps/` 占位。
4. 脚手架 skill 对 `scaffold_status=existing` 的负向边界是否会被「Harness 内输出必须 apps/」覆盖掉。
5. 登记/切片模板的 `topology` 是否允许一体仓同一 `git_url`；建筑检查清单是否还会把 native 根判失败。
6. 是否误改 `generate_scaffold.mjs` 或 CLI 跨仓契约。

## 关键路径

- `AGENTS.md` §7 / §9
- `.agents/skills/implementation-repo-onboarding/SKILL.md`
- `.agents/skills/cross-repo-implementation-routing/SKILL.md`
- `.agents/skills/yss-router/SKILL.md`
- `.agents/skills/yss-router/references/router-contract.yaml`
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`
- `docs/templates/implementation-repo-registry-template.md`
- `docs/process/implementation-repo-integration.md` §1.0
