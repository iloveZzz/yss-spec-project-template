# `awesome-design-md` P0 RED 证据

本轮先围绕已确认的三个公开 seam 补充最小失败断言，再修改生产合同：

```text
node --test .template-source/tooling/node/test/design-md.test.mjs
node .agents/skills/yss-prototype-stage/tests/run-scenarios.mjs
node .agents/skills/yss-antdv-next-design/tests/run-scenarios.mjs
```

修改前结果分别为失败，退出码为 `1 / 1 / 1`：

- `design-md` 未要求 Google `DESIGN.md` canonical sections 使用精确 H2 标题；
- H1 静态原型仍接受过期 CSS alias，且没有阻断硬编码设计基线；
- AntDV Next fact pack 缺少根 `DESIGN.md` 的引用与摘要时仍可通过。

这些失败分别证明标题合同、原型 token 消费合同和 provider fact freshness 尚未覆盖 P0 目标。
