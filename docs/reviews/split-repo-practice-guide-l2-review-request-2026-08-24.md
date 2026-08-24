# 分仓接入实践指南 L2 聚焦审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析。

## 范围

将 grilling 共识写入权威文件并新增用户指南：分层接入 = 分仓接入；不设 superproject；不用 git submodule / subtree 嵌实现仓。

## 请审查

1. CONTEXT / ADR-0008 是否把 Git 机制事实写成了新拓扑，而不是「分仓不用 submodule」。
2. 实践指南是否重复定义登记字段（应指向接入文档），或漏了 Cursor 多仓 / 禁止 attach 单端仓。
3. 口语「研发仓 / 分层接入」是否可能被当成新术语，而不是对照已有词。
4. 研究笔记是否被误当成架构批准。
5. 是否误改 skill、生成器或 CLI。

## 关键路径

- `CONTEXT.md`
- `docs/adr/0008-split-repo-and-monorepo-harness-topology.md`
- `docs/user-guide/分仓接入实践指南.md`
- `docs/reviews/research-git-submodules-layered-access-2026-08-24.md`
- `docs/process/implementation-repo-integration.md` §1.0
