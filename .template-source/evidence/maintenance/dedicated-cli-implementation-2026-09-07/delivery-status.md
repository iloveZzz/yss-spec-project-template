# 专职 CLI 交付状态

已实施已确认设计，两个新包分别为 create-yss-harness-backend@0.1.0、create-yss-harness-frontend@0.1.0，均登记为独立 GitHub 仓库和真实 submodule。公共核心按来源完整提交与摘要同步，模板分别锁定专职模板完整提交。

init 只创建不存在或空目录；attach / sync 默认预览，写入要求 --apply；治理冲突整体暂停，可显式备份覆盖；旧实例不兼容；失败自动恢复，成功保留备份和恢复清单，无独立 rollback 命令。完整功能与边界见已批准设计。

真实 tgz 安装及双端完整创建、sync 预览、实例接力、108 次五家族拒绝无写入检查通过。核心在 Node 22/24/26 各17项通过；现有三个 CLI 为172/82/33项通过。四个专职源模板及根仓完整 verify-template 通过，两个新 GitHub Actions 的三版本矩阵通过。详细命令与来源见 verification-ledger.json、packaged-smoke.json。

现有 CLI 随本轮更新为 create-yss-spec@3.1.3、create-yss-harness-dev@0.4.3、create-yss-harness-design@0.4.3，分别同步固定模板；未把共享核心迁移到旧 CLI。保留并验证了并行任务已经提交的 create-yss-spec 模块化升级。

npm registry 未发布任何本轮版本；身份检查返回 E401。本地可在新 CLI 仓库运行 npm pack 并用生成的 tgz 安装；文档中的 @latest 示例须等待公开 npm 发布。旧 scripts/instantiate-harness 按既定发布条件暂未退役。首次完整创建在本机需数分钟，详见复盘。

这份记录确认实现和 GitHub 交付，不声明 npm 已发布，也不代替产品部署或生命周期批准。
