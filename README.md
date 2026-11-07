# YSS Skills 与项目模板

面向中文研发团队的业务分析、规格、产品设计、Java 后端和 Vue 前端技能集合。按当前任务选择必要技能与技术参考，由 Agent 直接完成实现和资料整理。

源码、Issue 和 PR 默认在 [GitHub](https://github.com/iloveZzz/yss-spec-project-template) 管理；`origin` 为主远端，GitLab 保留为显式选择的次级协作入口。不自动双向同步或双发。新项目优先 GitHub tracker，远程目标需要单独明确，不能把模板源码仓当成业务项目仓；已有项目沿用其已确认配置。

## 使用

先读 [AGENTS.md](AGENTS.md)。共享技能位于 [.agents/skills](.agents/skills)，[Backend](profiles/backend) 保存后端专有内容，[Frontend](profiles/frontend) 按白名单分发共享技能。Spec 负责业务规格与产品设计，Frontend 承接设计还原与应用工程，Backend 承接服务端研发。资料按需读取，不要求生命周期路由、阶段批准、检查计划或测试报告。

本仓不维护脚本目录、测试套件和自动钩子。GitLab CI 在 Linux 上构建当前模板对应的 Rust CLI，并验证项目安装、同步和脚手架生成，不生成或发布 Linux 发行包；使用 `yss-linux` 标签的 Runner 需要采用相同架构，以便复用构建产物。生成工程、同步技能、整理导出和准备发布由 Agent 直接操作保留的资产；安装或发布也可使用现有 CLI 的实际能力。后端工程命令优先 ./mvnw，前端优先 pnpm；是否运行构建、测试或审查由当前任务决定。

## 内容与维护

- `.agents/skills/`：共享技能内容源、参考资料和模板资产。
- `.claude/skills/`：共享技能链接；`.workbuddy/skills/`：普通文件副本。
- `profiles/backend/`：Backend 技能与资料覆盖层。
- `profiles/frontend/`：Frontend 技能与资料覆盖层；默认 13 项，可用 17 项，按需加载。
- `.template-spec/`：业务、设计和工程参考。
- `.template-source/distribution/`：分发清单与客户端入口。
- `skills-lock.json`：技能来源和安装目录信息；`yss-public-skills.json`：公开技能清单。

修改内容源后同步受影响副本和清单，具体操作见 [Skills 维护](.template-source/agents/skills-maintenance.md)。公开技能仓为 [yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，仅在用户要求发布时更新。

业务权限、输入校验、错误处理和用户文件保护仍属于实现职责。提交、推送、部署、发行使用对应授权，实际结果如实报告。

既有 yss CLI 的安装包和内置行为独立于本仓，本次目录变化不会改写已安装的二进制。新模板与具体 CLI 版本的安装、同步兼容性须以实际使用结果为准。

Template 5.3.2 修复 CLI 安装、发行与公开技能分发说明，明确 Profile 安装与源码生成的版本边界，并保留 41 项公开白名单；供 CLI 3.3.1 打包使用。最小 Vue 工程资源与 Spec 原型规范沿用 5.3.1，`scaffold frontend` 从 CLI 3.3.0 起支持。Frontend Profile 从 CLI 3.2.0 开始支持，3.1.4 及以前不支持。参见 [Frontend 接入](.template-spec/user-guide/cli/tutorial-frontend.md)。GitLab CI 使用支持三 Profile 的固定 CLI 源码提交，覆盖 Spec/Backend/Frontend；具体远程执行结果以该次流水线为准。

新建 Vue 工程使用 CLI 3.3.0 起支持的 `yss scaffold frontend --project-name my-frontend --output-dir .`，父目录须存在且目标须不存在，先查看实际帮助。需要技能再单独 attach skills，应用源码与技能资源分开维护。
