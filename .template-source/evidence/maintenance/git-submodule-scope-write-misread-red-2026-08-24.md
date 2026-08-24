# git-submodule 空 gitlink / detached HEAD 仍当普通目录 RED

日期：2026-08-24

修订前对当时生成器探测：

```text
inspectWorkingTree git-submodule+empty: null
empty no force / empty --force / detached overlay --force: 挂载点覆盖已被拒绝
write INSIDE detached: 0  （在 detached HEAD 子仓内生成 nested-service 成功）
inspectWorkingTree git-submodule+detached: null
```

失败语义：覆盖挂载点已阻断，但 Agent 工作树检查把空 gitlink / detached HEAD 视为可写；脚手架把 detached HEAD 子仓当成普通输出目录。
