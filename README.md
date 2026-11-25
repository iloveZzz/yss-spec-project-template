# YSS Skills 与项目模板

面向中文研发团队的业务分析、规格、产品设计、Java 后端和 Vue 前端技能集合。按当前任务选择必要技能与技术参考，由 Agent 直接完成实现和资料整理。

源码、Issue 和 PR 默认在 [GitHub](https://github.com/iloveZzz/yss-spec-project-template) 管理；`origin` 为主远端，GitLab 保留为显式选择的次级协作入口。不自动双向同步或双发。完整新工程没有已确认 tracker 且已核实唯一 GitHub/GitLab 代码项目时，默认关联该项目的 Issues 并报告；已有项目沿用已确认配置。不能把模板源码仓当成业务项目仓。

## 使用

先读 [AGENTS.md](AGENTS.md)。共享技能位于 [.agents/skills](.agents/skills)，[Backend](profiles/backend) 保存后端专有内容，[Frontend](profiles/frontend) 按白名单分发共享技能。Spec 保存业务规格与产品设计，并作为产品 Home 的默认工程会话入口；Frontend 承接设计还原与应用工程，Backend 承接服务端研发。资料按需读取，不要求生命周期路由、阶段批准、检查计划或测试报告。

全团队使用路径见[用户手册](.template-spec/user-guide/用户手册.md)，讲义、演示步骤和实操练习见[培训材料](.template-spec/user-guide/培训材料.md)，专题入口见[手册索引](.template-spec/user-guide/用户手册索引.md)。文档命令基线为 CLI 3.8.0 与内置 Template 5.8.0，当前 main 的来源核验、运行接续和 PR/MR 跟进增量在相关章节注明。

从一个项目理解完整研发过程，阅读[客户跟进项目 Demo](.template-spec/user-guide/客户跟进项目全生命周期Demo.md)，包含三仓 DDD 主线、MVC 对照、技能选择与问题处理，以及测试环境发布和业务验收。

技能目录可携带直接支撑生成或转换的确定性工具；本仓不新增安装包装脚本、通用测试套件和自动钩子。GitLab CI 在 Linux 上构建当前模板对应的 Rust CLI，并验证项目安装、同步和脚手架生成，不生成或发布 Linux 发行包；使用 `yss-linux` 标签的 Runner 需要采用相同架构，以便复用构建产物。生成工程、同步技能、整理导出和准备发布由 Agent 直接操作保留的资产；安装或发布也可使用现有 CLI 的实际能力。后端工程命令优先 ./mvnw，前端优先 pnpm；是否运行构建、测试或审查由当前任务决定。

## 内容与维护

- `.agents/skills/`：共享技能内容源、参考资料和模板资产。
- `.claude/skills/`：共享技能链接；`.workbuddy/skills/`：普通文件副本。
- `profiles/backend/`：Backend 技能与资料覆盖层。
- `profiles/frontend/`：Frontend 技能与资料覆盖层。默认 20 项，可用 24 项，按任务加载。
- `.template-spec/`：业务、设计和工程参考。
- `.template-source/distribution/`：分发清单与客户端入口。
- `skills-lock.json`：技能来源和安装目录信息；`yss-public-skills.json`：公开技能清单。

修改内容源后同步受影响副本和清单，具体操作见 [Skills 维护](.template-source/agents/skills-maintenance.md)。公开技能仓为 [yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，仅在用户要求发布时更新。

业务权限、输入校验、错误处理和用户文件保护仍属于实现职责。提交、推送、部署、发行使用对应授权，实际结果如实报告。

既有 yss CLI 的安装包和内置行为独立于本仓，本次目录变化不会改写已安装的二进制。新模板与具体 CLI 版本的安装、同步兼容性须以实际使用结果为准。

Template 5.17.1 配套 CLI 3.17.1。本版更新内嵌模板的配套版本说明。Pi 模型搜索与本次运行选择由 CLI 工作台提供。

Template 5.17.0 配套 CLI 3.17.0。完整 Spec 在提交确认或交接前审查正文和验收，核对已采用的业务依据、规则组合及可观察结果。Frontend 两种安装模式默认加入 FormKit 技能，提供 Schema 指南和独立 JSON 示例，并补齐 VueUse 离线函数参考。Spec 可按需安装 FormKit 技能。

Template 5.16.1 配套 CLI 3.16.1。高保真原型和设计预览统一文本输入与下拉聚焦的单边框，保留错误及高对比提示。「查询与详情」新增长列表与编辑场景，用于复核短窗口滚动、同筛选刷新、草稿保护和焦点归还。

Template 5.16.0 配套 CLI 3.16.0。Frontend 默认加入前端加载与过渡技能，附带固定版本的 shadcn-vue 官方参考。应用工程可接续高保真原型复核，保留已确认的体验，并按目标工程组件、主题与请求状态实现。工作台指引补充关联材料、局部凭证和已交付目标的续办方法。

Template 5.15.0 配套 CLI 3.15.0。Frontend 默认加入 `shadcn-vue` 和 `vueuse-functions`，并对齐 Vue 脚手架的组件主题。技能描述使用清晰的触发场景与结果，原生英文技能保留英文主描述。`yss-help` 按目标工程和宿主推荐可用技能。规格交接记录分批范围、受影响的既有决定和实现计划，便于研发接续。

Template 5.14.0 配套 CLI 3.14.0。Spec 分别记录「业务规格与验收」和「原型与交互说明」的确认范围、采用版本和用户答复。依赖 Spec 的研发写入核对这两项确认及范围内的未决问题，首次写入和委派写入均核对目标 Git 仓库、分支与相关改动。Frontend 的两个安装范围均提供共享的仓库核对指南。

Template 5.13.0 加入 `yss-help` 中文技能导航，统一业务分析、产品规格、界面设计、逻辑试验、文档、决策建图与 PR/MR 交付入口。七个技能的新旧名称和升级写法见[技能地图](.template-spec/agents/profile-skills.md#技能改名)。编制或修改规格、交互说明和原型前先说明 Spec 归属。仅委托修订指定原型时，写入范围限于该原型。后端 `yss-repository` 新增标准库 Python PO/Mapper 生成工具，复用已审阅模型和显式工程配置，保护已有不同内容的文件。

当前模板源码中，Spec 默认 18 项、可用 65 项，Backend 默认 43 项、可用 55 项，Frontend 默认 20 项、可用 24 项。Frontend 两种安装模式默认提供加载与过渡、官方 shadcn-vue 技能资料、VueUse 函数参考及官方 FormKit 技能。Spec 可按需补装 `formkit`。安装内嵌新版模板的 CLI 后，按项目实际范围同步。[技能地图](.template-spec/agents/profile-skills.md)

`scaffold frontend` 从 CLI 3.3.0 起支持。Frontend Profile 从 CLI 3.2.0 开始支持，3.1.4 及以前不支持。参见 [Frontend 接入](.template-spec/user-guide/cli/tutorial-frontend.md)。GitLab CI 固定 CLI 配套构建源码 `f2e0a952123fbd9f12d3703b8df2b03d02b670cb`，版本为 3.7.0。该提交用于构建工具，正式 CLI 的最终源码与模板来源以 Release 产物记录为准。实际远程执行结果以对应流水线为准。

新建 Vue 工程使用 CLI 3.3.0 起支持的 `yss scaffold frontend --project-name my-frontend --output-dir .`，父目录须存在且目标须不存在，先查看实际帮助。若用户同时要求生成工程和安装技能，Agent 使用已核实的 CLI 连续执行生成与 `attach --installation skills`；应用源码与技能资源分别维护。

Home 的分发、真实多仓 Demo、复审修复和验证范围见[验证报告](.template-source/design/2026-11-15-spec-home-repo-validation.md)。使用包含新版模板的 CLI Bundle 才会取得这些方法；模板发行不会自动更新已安装的 CLI 或项目。
