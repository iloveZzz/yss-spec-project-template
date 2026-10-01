# YSS 模板实例升级协议

本协议定义 `yss-harness-upgrade` 与四类 YSS CLI 的同家族实例升级。技能负责判断、冲突方案和授权范围；CLI 负责计划校验、候选验证、持久归档、事务和恢复。历史批准及 Ticket 状态仍由各自权威协议管理。

## 输入与接口

固定精确 CLI 版本、包内容及模板快照，确认真实项目根、metadata/schema、profile、受管基线和 Git 状态。旧版本缺少受支持的基线/schema 时停止，不重新初始化。目标模板使用所执行 CLI 的内置快照；不在 apply 阶段查询 latest 或运行外部计划提供的脚本。

- `migrate plan --target-dir <绝对目录> --output <项目外全新文件> [--archive-dir <项目外全新目录>] [--migrate-layout] [--prune] [--resolutions <文件>]`：项目只读，在项目外生成固定计划；冲突返回机器可读诊断。
- `migrate apply --plan <文件> [--target-dir <同一目录>]`：显式执行。
- `migrate status --target-dir <目录>`：只读状态。
- `migrate recover|rollback --target-dir <目录> [--apply]`：默认只读预览，显式写入。

所有命令接受 `--json`，输出 schemaVersion 1 JSON。失败非零退出；区分 `CONFLICT`、`STALE_PLAN`、`EXECUTOR`、`PLAN`、`ARCHIVE`、`INTERRUPTED`、`CONCURRENT`、`RECOVERY_FAILED` 等。原 CLI 命令及错误协议保持兼容。

## 计划与冲突

计划绑定 schemaVersion、事务 ID、时间、项目根、家族、执行器摘要、目标模板、归档位置、迁移选项、输入清单、Git HEAD/index/gitlink、规则 ID、操作前后内容/权限摘要和候选内容。整体 planDigest 检测意外修改；执行器还重新生成候选操作，不信任手改计划或重新计算摘要。摘要不等于授权。

版本化规则 `managed-sync.v1`、`layout-migration.v1`、`retirement.v1` 复用各 CLI 原有身份/schema 范围和可信文件基线判定；后两者分别要求显式布局迁移与 prune。不凭名称或目录推断旧资产属于模板，不提供未知旧版本的猜测迁移。

`resolutions` 为路径到决议的 JSON 映射。每项包含 `action: preserve|merge`、`beforeDigest`、`templateDigest`；merge 另含候选字节的 `contentBase64`。只接受确实存在、有可信基线且可合并的受管冲突；未知路径、受保护资产、过期摘要或未消费决议拒绝。技能在项目外起草合并差异，新增语义决定取得用户回复后重新生成计划。CLI 不把决议文件当成人工批准。

未修改受管文件自动更新。修改过的退出分发文件保留；`--prune` 只删除仍匹配旧基线的文件。项目拥有的 tracker、业务文档和已批准资产按现有保护规则保留；历史冻结和批准不会因路径移动获得新的有效性。

## 归档、执行与恢复

默认归档位置为 `~/.yss-harness/archives/<项目路径与家族摘要>/<事务ID>/`，可显式改为项目外全新目录。保存 plan.json、before/ 原字节与权限、receipt.json；首版不自动清理归档。布局迁移额外保存 project-copy/ 项目内容副本；不跟随符号链接，排除 Git 内部数据、依赖、索引缓存及事务状态，这些排除项不是迁移写入范围。Git 工作区和索引不重建、不 reset、不 stash。

候选操作先在隔离副本中完成生成锁文件与实例校验。真实执行前重新核验输入，先归档并校验，再在互斥锁下写入。内部事务日志预写并持久化，文件、生成锁及 metadata 属于同一事务。既有业务文件和无关未提交/未跟踪工作保持；输入漂移要求新计划。

内部 `.yss-harness-state/upgrade.json` 索引关联外部回执与事务。失败自动恢复本次写入；进程中断后 recover 校验事务和备份再恢复。成功提交但回执尚未完成的情况依据持久日志收敛状态。保留损坏、冲突及未恢复路径，不把恢复失败写成成功。

rollback 只针对索引中最近一次成功迁移，完整预检全部原件和升级后状态后才开始。任何后续修改、丢失或损坏备份都会阻断；不提供忽略冲突的 force。回退使用新的可恢复事务，不更改 CLI 安装版本。重复 apply 只有在同一计划已成功且结果仍匹配时才返回原回执；恢复或回退后的旧计划不复用。

## 验证与结论

校验身份、布局、Context、Skill 锁和投影等各家族现有实例合同；有失败不跳过。对未迁移资产与 Git index/HEAD/gitlink 做并发检查。迁移完成再规划，证明不会重复执行；计划保留项不是自动消失的冲突。

回执说明实际版本、范围、归档、事务状态和验证结果。原有失败与新增失败分别说明；升级成功不表示产品阶段批准或发布就绪。提交、推送、发布及真实项目迁移均按会话授权，不由技能或计划摘要授予。
