# Frontend 技能覆盖层

Frontend 承接 Spec 的业务规格、高保真原型与交互说明，完成 Vue 应用工程、设计还原、接口接入和验证。Spec 继续负责产品设计，Backend 继续负责服务端实现；不恢复独立 Design Profile，也不新增阶段审批。

`project` 与 `skills` 两种安装默认提供 12 项技能，可用库共 16 项。主入口是 `yss-frontend-application`，Vue 与 composable 方法按逻辑职责选择；设计、原型复核、逻辑原型和业务词汇维护四项按需补装。安装不会生成业务页面或自动加载全部技能。

技能共享源统一位于根 `.agents/skills`，本覆盖层按白名单选择并分发；`.workbuddy/skills` 是对应的普通文件副本。安装后的具体集合以所用 CLI 内嵌 Bundle 为准。

使用方法见 `.template-spec/user-guide/cli/tutorial-frontend.md`，来源与取舍见 `.template-spec/agents/frontend-skills-adaptation.md`。本轮不分发原工程脚手架的脚本和测试套件；新应用由 Agent 按应用工程技能与实际依赖建立最小工程，已有项目沿用原工具。

frontend 从 CLI 3.2.0 开始支持，需要对应的三 Profile Bundle；3.1.4 及以前不具备该能力。实际安装版本与来源以 `yss version` 为准；技能安装不代表业务页面已通过浏览器还原验证。
