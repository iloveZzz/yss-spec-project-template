# 脚本性能余留问题优化报告

本轮在提交 `882cd46` 已完成 P01–P12 优化的基础上复核余留问题。当前根 `scripts` 有 157 个文件，包括 50 个 `.mjs` 和 79 个无扩展 Node 入口；范围不是只匹配 `*.js`。项目实例脚本仍以现有分发 manifest 为边界，模板维护 runner 不进入实例。

## 结果

| 问题 | 结论 | 处置 |
|---|---|---|
| `frontend-delivery` 组内长尾 | 两条场景默认使用独立临时根和动态端口；同机干净对照从串行中位 159.223 秒降至 126.662 秒，下降 20.45% | 为两条命令声明独立 lane；设置任一实例根覆盖环境变量时整组回退串行 |
| release profile 重复命令 | `scripts/verify-frontend-scaffold-generator-scenarios` 注册两次，单次中位 0.8085 秒 | 一次运行按 condition、cwd 和命令去重；完整输出在两个组中复用，stderr 标明复用 |
| runner 输出驻留 | 原实现持有全部并发子进程 stdout/stderr；4 条各 32 MiB 的合成负载峰值 RSS 中位约 219.7 MiB | 输出写入私有临时目录，结束后按原分组顺序流式回放；峰值 RSS 中位约 104.0 MiB，下降 52.68% |
| 项目实例误分发 | 新 runner 位于 `scripts/lib`，若不登记会进入 create-yss-spec 快照 | manifest 和同步边界断言均排除 `scripts/lib/template-verification-runner.mjs` |

两条并行场景内部仍保持原顺序。`scripts/verify-frontend-delivery-scenarios` 的子测试共享并修改同一 fixture；分发场景也必须等待前后端初始化完成后再联合验收，因此没有继续拆分。并行时源场景自身变慢，但被较长的分发场景覆盖，总等待时间仍达到验收门槛。RSS 在真实双场景中只下降 1.30%，按波动处理，不宣称收益。

## 兼容与失败语义

- 未配置 lane 的组继续组内串行，组间并发上限仍为 1–4。
- 一个 lane 失败后，同组不再启动新命令；其他独立组继续；已经启动的命令完成清理。
- stdout 的分组、命令头和完整命令输出保持原顺序。开始、完成、失败和复用信息写入 stderr。
- 相同命令引用合并所有声明的互斥资源；资源名按有序集合获取，避免交叉等待。
- 外部实例根覆盖可能使两条场景共享可变路径，因此 `YSS_DEDICATED_INSTANCE_ROOT`、`YSS_DELIVERY_TEST_BACKEND_ROOT` 或 `YSS_DELIVERY_TEST_FRONTEND_ROOT` 存在时保守回退串行。

## 保留项

此前 P01–P12 已处理 schema 合批、技能投影 Git/读取合并、固定 commit 子树归档、CLI WAL 和文件读取复用等问题。项目实例共享执行器的 `stdoutFile` 当前没有生产调用者；为它增加新的 capture 开关没有可量化收益，本轮不改 canonical CLI core 或受控副本。安全路径的逐层 symlink 检查、输入输出边界重验、事务 fsync、固定 Maven/pnpm 验证和真实服务 revision 检查继续保留，不以性能理由裁剪。

## 验证

- `scripts/verify-template-fast`：因核心验证器及当前工作区核心资产变化自动升级 release，最终退出 0；完整计划 76 条命令，重复脚手架场景只执行一次。
- `node scripts/verify-template-verification-scenarios`：退出 0；覆盖 lane、环境回退、资源互斥、失败传播、命令去重、日志文件和实例分发排除。
- `node scripts/verify-script-performance-scenarios`：退出 0；项目实例共享 schema/命令执行器回归通过。
- `git diff --check` 与 create-yss-spec 子仓 `git diff --check`：退出 0。
- create-yss-spec 的 `tests/sync-template.test.js` 相关快照构建场景通过。合并运行的 5 个实例初始化测试因该子仓既有 `template.manifest.json` 与正式快照未同步而失败；本轮约定不更新正式快照/锁，因此不把该漂移伪装成已关闭。根模板完整 release 验证已通过当前源代码及分发边界检查。

测量原始值见 [measurements.json](measurements.json)。大输出测试刻意以磁盘 I/O 换取有界主进程内存，因此不把其耗时作为常见小日志链路的回归；64 KiB × 4 的 7 次对照未观察到延迟退化。最初三次并行长场景与其他测试负载重叠，已排除，不进入收益计算。

## 边界

本变更属于 Harness-only 与 release-only。Backend、Frontend、OpenAPI、产品 Spec、Ticket 和 Slice Contract 均不适用。当前工作区已有其他未提交修改；本轮目标文件在开始时无未提交差异，所有修改均为增量。未提交、未推送、未发布，也未更新 create-yss-spec 正式模板快照或远端 commit。
