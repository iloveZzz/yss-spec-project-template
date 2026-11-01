# Backend 项目与脚手架

命令支持以所装版本帮助为准。先运行 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；模板更新不改变旧二进制能力，也不代表当前程序是最新发行。

项目入口使用 `init` 或 `attach --profile backend`，技能补装使用 `skills list`、`skills ensure`。先查看所用命令的实际帮助。

新骨架先读 `scaffold catalog`，再使用 `scaffold ddd` 或 `scaffold mvc`。明确项目名、Java 包名、输出父目录、平台、精确 Spring Boot/Java 版本和 Maven 工程、Parent、YSS BOM 坐标；不猜版本。`--dry-run` 只在内存预览，不创建目标、控制目录或计划。目标必须不存在，输出路径不能经过符号链接，已有工程不能用脚手架覆盖。

生成不需要合同、批准或平台资格证据，不生成测试与门禁，也不自动执行 Maven。后续业务实现复用适用 YSS 技能，工程命令优先根 `./mvnw`；按任务实际需要验证并报告结果。

## 完整研发技能

包含本轮模板的 CLI 在 Backend `project` / `skills` 两种安装下均默认安装 41 项，库中另有 12 项可按需补装，共 53 项。以 `skills list` 的实际结果为准；模板改动不会更新已经安装的二进制。

`implement` 承接 Spec/明确需求，按需使用 `to-tickets` 拆分、`yss-technical-design` 完成架构/方案/详细设计、对应脚手架与分层技能实现，再用 `yss-backend-testing` 选择并解释实际验证。DDD 建模才使用 `yss-tactical-design`；MVC 沿用 Service，普通测试不强制 TDD。一次安装具备完整能力，不等于每个任务执行全部技能。

完整交付维护有源码依据的构建部署手册，优先更新已有 README/运维说明，结构参考 `.template-spec/templates/build-deploy-guide-template.md`。部署当前仅交付说明；未知平台、健康入口和回滚限制如实注明，不执行部署、建设 CI/CD 或云资源。构建、测试、启动和部署的实际结果分别说明。

12 项按需技能为 `to-spec`、`yss-stage-decision`、`triage`、`wayfinder`、`llm-wiki`、`yss-backend-spec-review`、`yss-up-springboot3`、`yss-security-algorithm`、`setup-matt-pocock-skills`、`maintaining-skills`、`writing-for-agents`、`publish-skills-sh`。历史安全算法组件仍禁止新生产接入；提交、交接和来源索引维护保持显式调用及原授权边界。
