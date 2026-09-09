# 恢复边界验证复盘

本轮 L3 自检发现一项 IMPORTANT 恢复缺口：已有进程终止案例集中在 rename 之后；进程在目标临时文件 fsync 后、rename 前终止时，恢复虽然还原了管理文件和 metadata，却可能留下临时文件与目录并写入 rolled-back。没有观察到真实产品事故，本记录基于本地故障注入。

`persistence-matrix-red.log` 中的 `target-fsync/kill` 反例证明了该问题。修正后，初始 journal 预先记录由事务 ID 和操作索引派生的临时路径，WAL 继续在目标写入前持久化意图。恢复仅清理与预期摘要和权限一致的临时文件；用户修改、路径抢占或不能证明归属时失败并保留恢复清单。活进程 finally 清理核对已创建文件的 inode/device，避免误删被抢占的路径。旧 journal/progress 读取能力保留，不转换未完成旧事务。

事实源已修订为 `.template-source/cli-core/transaction.mjs`，永久回归入口为其 `tests/cli.test.mjs`。矩阵覆盖 backup、WAL write、WAL fsync、target fsync、rename、directory、commit 各自的 throw / SIGKILL，共 14 个子场景；另外覆盖用户修改与独占创建竞争。`persistence-matrix-final.log`、`core-recovery-final.log` 记录修正后的结果，完整 core 测试 40 项通过。测试辅助代码中错误读取 spawn 结果的断言也已修正，保留了中间失败日志。

此前已采集的 init 性能和完整验证结果不再用作最终事务版本的完成证据。最终报告采用 `verified-init-*`、`trace-verified-init-*` 和 `validation-after-recovery`；P05 调度实验的冻结 CLI 基底单独保存在 `distribution-measurement-bindings.json`，用于解释受控实验范围。持久化模型与进程终止均不称为物理断电测试。
