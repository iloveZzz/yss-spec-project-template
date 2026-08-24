# ADR-0008: 默认分仓接入，一体仓按新建与接管使用不同布局

前后端分离组织里，产品实例默认与前端、后端实现仓库分仓，靠登记和跨仓库切片绑定；不得把本 `template-source` 改成某个产品的研发本体。组织里同时存在一体仓：同一 `project-instance` Git 历史承载研发管理资产与前后端运行时。已有一体仓用 `create-yss-spec attach` 原地接管，保留原项目根，不搬迁 Git 历史，也不把 `apps/backend/<project>/` 与 `apps/frontend/<project>/` 红线改成“任意目录都算 Harness 内布局”。新建一体仓才必须使用该 `apps/` 布局。分仓产品的实例仓默认放在 GitHub；主 tracker 仍为 `local-markdown`；分仓 Agent 工作区使用 Cursor Cloud 多仓环境，一体仓使用单仓环境。禁止把 Harness 资产 attach 进仅含前端或仅含后端的实现仓来冒充一体仓。
