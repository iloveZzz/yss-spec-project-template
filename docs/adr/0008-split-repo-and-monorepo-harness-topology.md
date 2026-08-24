# ADR-0008: 默认分仓接入，一体仓按新建与接管使用不同布局

前后端分离组织里，产品实例默认与前端、后端实现仓库分仓，靠登记和跨仓库切片绑定；不得把本 `template-source` 改成某个产品的研发本体。组织里同时存在一体仓：同一 `project-instance` Git 历史承载研发管理资产与前后端运行时。已有一体仓用 `create-yss-spec attach` 原地接管，保留原项目根，不搬迁 Git 历史，也不把 `apps/backend/<project>/` 与 `apps/frontend/<project>/` 红线改成“任意目录都算 Harness 内布局”。新建一体仓才必须使用该 `apps/` 布局。分仓产品的实例仓默认放在 GitHub；主 tracker 仍为 `local-markdown`；分仓 Agent 工作区使用 Cursor Cloud 多仓环境（创建环境时勾选多个仓库，并列 clone），一体仓使用单仓环境。禁止把 Harness 资产 attach 进仅含前端或仅含后端的实现仓来冒充一体仓。

分仓接入不使用 git submodule 或 git subtree 把前端、后端实现仓库嵌进研发管理仓库工作树。Git submodule 能组成一次递归检出的组合工作树，但 superproject 钉的是子仓某个 commit，子仓前进后必须再提交 gitlink；这与「三个独立 Git + 登记 + 各自 MR / PR」不是同一套绑定。一次看到三份代码用多仓并列 clone；CI 用多次 checkout 并列检出，而不是把实现仓变成 gitlink。不设第四个 umbrella superproject。口语「分层接入」按分仓接入理解，不是第四种拓扑。机制事实见 `docs/reviews/research-git-submodules-layered-access-2026-08-24.md`；日常操作见 `docs/user-guide/分仓接入实践指南.md`。
