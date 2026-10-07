# 保留的通用运行工具

此目录只保留当前模板工具所需的运行存储、命令执行器、原生 Context 传输与工作路径解析。`vendor/yaml.mjs` 是工作路径解析的依赖；`package.json` 声明这些 Node 工具的兼容范围。

旧 npm CLI 的入口、薄包生成、快照构建、身份、同步、迁移、事务和 npm 升级实现已退役。当前项目操作由固定来源的 `yss` 二进制执行，使用说明见 [统一 CLI 操作说明](../../.template-spec/user-guide/unified-cli.md)。旧实例的未完成事务仍由仓外固定恢复包处理，不能从本目录重建旧生成器。

共享模块的副本继续由 `scripts/sync-strategic-handoff-tools` 生成并绑定来源锁。当前测试位于根 `tests/`：运行存储测试覆盖保留工具，`cli-core-retirement.test.mjs` 消费原生公开接口核验固定来源、输入漂移及用户文件保护。历史检查 ID 保留，实际执行映射到当前测试，不改写冻结的历史清单。
