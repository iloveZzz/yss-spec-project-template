# Harness 执行蓝图

Harness 以仓库身份、影响面、条件门禁和可读证据串联研发流程。执行编排器只推进第一个未阻塞工作单元，并在人工暂停、handoff、实现、合并和发布边界集中回写 checkpoint。

## 核心不变量

- `template-source` 只维护流程模板，不生成具体产品资产。
- `project-instance` 必须从最近可信阶段进入，不以目录猜测门禁状态。
- 命中条件的门禁未通过时，状态保持 blocked 或 needs-human。
- 没有 fresh verification 和可解析 evidence refs 时，不宣布完成。
