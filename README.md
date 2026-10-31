# YSS Skills 与项目模板

面向中文研发团队的业务分析、规格、产品设计和 Java 后端技能集合。按当前任务选择必要技能与技术参考，由 Agent 直接完成实现和资料整理。

## 使用

先读 [AGENTS.md](AGENTS.md)。共享技能位于 [.agents/skills](.agents/skills)，Backend 专有内容位于 [profiles/backend](profiles/backend)。需求、设计和技术资料按需读取，不要求生命周期路由、阶段批准、检查计划或测试报告。

本仓已移除全部脚本目录、测试套件、CI 工作流和自动钩子。生成工程、同步技能、整理导出和准备发布由 Agent 直接操作保留的资产；安装或发布也可使用现有 CLI 的实际能力。后端工程命令优先 ./mvnw，前端优先 pnpm；是否运行构建、测试或审查由当前任务决定。

## 内容与维护

- `.agents/skills/`：共享技能内容源、参考资料和模板资产。
- `.claude/skills/`：共享技能链接；`.workbuddy/skills/`：普通文件副本。
- `profiles/backend/`：Backend 技能与资料覆盖层。
- `.template-spec/`：业务、设计和工程参考。
- `.template-source/distribution/`：分发清单与客户端入口。
- `skills-lock.json`：技能来源和安装目录信息；`yss-public-skills.json`：公开技能清单。

修改内容源后同步受影响副本和清单，具体操作见 [Skills 维护](.template-source/agents/skills-maintenance.md)。公开技能仓为 [yss-spec-dev-skills](https://github.com/iloveZzz/yss-spec-dev-skills)，仅在用户要求发布时更新。

业务权限、输入校验、错误处理和用户文件保护仍属于实现职责。提交、推送、部署、发行使用对应授权，实际结果如实报告。

既有 yss CLI 的安装包和内置行为独立于本仓，本次目录变化不会改写已安装的二进制。新模板与具体 CLI 版本的安装、同步兼容性须以实际使用结果为准。
