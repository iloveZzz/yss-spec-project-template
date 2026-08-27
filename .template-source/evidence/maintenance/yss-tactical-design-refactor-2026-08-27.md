# `yss-tactical-design` L3 REFACTOR 证据

在补齐结构化合同、Router 路由、生命周期注册表、Slice Contract 引用和平台投影后执行：

```text
node --check .agents/skills/yss-tactical-design/scripts/validate-tactical-design.mjs
node --check .agents/skills/yss-tactical-design/tests/run-scenarios.mjs
scripts/verify-skill-registry
scripts/verify-skill-governance
scripts/verify-lifecycle-registry
scripts/sync-skills --check
scripts/update-skill-lock --check
```

以上命令均通过；未改变既有生命周期主阶段和门禁语义。
