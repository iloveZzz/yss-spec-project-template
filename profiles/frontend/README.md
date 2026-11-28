# Frontend 技能覆盖层

全团队工作方式见[通用用户手册](../../.template-spec/user-guide/用户手册.md)，团队讲义与练习见[培训材料](../../.template-spec/user-guide/培训材料.md)，工程接入见[Frontend 教程](.template-spec/user-guide/cli/tutorial-frontend.md)。

Frontend 承接 Spec 的业务规格、高保真原型与交互说明，完成 Vue 应用工程、设计还原、接口接入和验证。Spec 继续负责产品设计，Backend 继续负责服务端实现；不恢复独立 Design Profile，也不新增阶段审批。

已有 `prototype-review` 结论可随选定设计直接接续。应用技能沿用确认过的流程、交互和关键视觉，使用目标工程的组件、主题、路由和服务实现。`yss-frontend-loading` 按真实请求与回执补齐等待、失败和恢复。

`project` 与 `skills` 两种安装默认提供 21 项技能，可用库共 27 项。`implement` 负责明确研发的协调，`to-tickets` 负责显式拆票，`yss-frontend-application` 负责前端专业实现与审查。局部修改可直接进入应用技能。加载与异步反馈使用 `yss-frontend-loading`，组件工程使用随包附官方资料的 `shadcn-vue`。`vueuse-functions` 默认携带官方函数索引及离线参考，按项目版本和需求查用。设计、A2UI 动态原型、原型复核、逻辑原型和业务词汇维护按需补装。安装不会生成业务页面或自动加载全部技能。

起草或修订 PR/MR 正文用默认技能 `pr`，通过 PR/MR 交付选定材料用 `yss-deliver-pr-mr`。用户明确要求复盘 Agent 会话时可补装 `retro`。

Vue 或 Nuxt 工程使用 FormKit 实现表单、验证、Schema 或自定义输入时，按目标项目版本查阅 `formkit`。组件与样式沿用工程已有的 shadcn-vue 和主题，FormKit npm 依赖按任务采用。

技能共享源统一位于根 `.agents/skills`，本覆盖层按白名单选择并分发；`.workbuddy/skills` 是对应的普通文件副本。安装后的具体集合以所用 CLI 内嵌 Bundle 为准。

使用方法见 `.template-spec/user-guide/cli/tutorial-frontend.md`，来源与取舍见 `.template-spec/agents/frontend-skills-adaptation.md`。本轮不分发原工程脚手架的脚本和测试套件；新应用使用 `yss-frontend-scaffold-generator` 调用原生 CLI 生成最小工程，再交由应用技能实现，已有项目沿用原工具。

frontend 从 CLI 3.2.0 开始支持，需要对应的三 Profile Bundle；3.1.4 及以前不具备该能力。实际安装版本与来源以 `yss version` 为准；技能安装不代表业务页面已通过浏览器还原验证。

新建 Vue 工程使用 CLI 3.3.0 起支持的 `yss scaffold frontend --project-name my-frontend --output-dir .`，父目录须存在且目标须不存在，先查看实际帮助。需要技能再单独 attach skills，应用源码与技能资源分开维护。
