# CLI 分发阶段 Spec 独立审查

结论：最终候选 0 个未关闭 finding；满足 scope.md / Q10 的手册进入 CLI 分发要求。普通独立审查，不代表生命周期会签或 npm 发布批准。

## 固定候选

消费 `cli-final-2.json` 的规范 candidate.bin、manifest 和 tracked.diff；验证流 SHA-256 及 tracked 记录一致。spec/dev 沿用已审相同摘要，战略重新消费最终捕获。

| CLI | 固定点 | 候选摘要 |
|---|---|---|
| create-yss-spec | `ced179948be66fad349e2b206adf45e1ed3a3987` | `14d61bccf903a348aab45e06f7f144172e41290bd156e94edc2c02a1a5dec437` |
| create-yss-strategic-design | `f6e29b0efa341afb9a7ab51d85bff62f009c43b3` | `a63c635501f670e5be97f822766a5d8aa14fa983994b40b1657c038a64f57461` |
| create-yss-harness-dev | `fa207e4b657a37058774ecea41bd22c01cf525d1` | `a82e8b736d613c2ee6d2a7227da64328e5cd048659f0d6c56fe63ece3f73fec1` |

## Spec 覆盖

- 版本为综合 3.1.2、战略/研发 0.4.2；README 与详细指南区分源码候选、npm latest、包内固定快照，说明本地 tgz 使用步骤。没有把候选版本当作已发布 npm 版本。
- 同族 attach/sync、用户冲突保护、回滚及 update/upgrade 区别保持清楚；战略无 attach/sync，不用 force 冒充升级。
- 三包 src/*.js 与各自固定点逐字节相同；变更限文档、版本、固定 SHA 和生成快照，无新增运行时业务行为。已对包内存在的 tracked 候选文件核对 Git blob hash。
- 实际 tgz SHA-1 与 pack JSON 一致；各包索引、专项手册和教学案例与固定源提交字节一致。模板源分别为 `017925706a981aec9eadefd470232bb531acd4d6`、`5baa45c8a8929843664ab14dcd150b4c2a12fa05`、`baae3f6e2f474b30cf8c97292be4580bafae1f37`。

## 分发缺口及闭合

首次包验收发现战略清单仍排除4份已重写专项指南。已独立复核 `strategic-distribution-fix.json` 的捕获 `b8c25ad60cd1568a51a35422b873f235be369086f4272667dc9853dd2cb5f9f8`：仅移除4项排除并更新分发断言，没有扩大其他工程资产范围。最终战略包6份关键手册均与修复后固定源字节一致，该缺口关闭。

`/tmp/yss-manual-validation/manual-distribution.json` 的实际执行 exit_code=0，五家族分别验收 4/10/10/10/10 份手册通过；本审查读取该执行证据，没有声称自行重跑。包摘要记录见同目录三份 `*-pack.json`。

补充读取 `packed-upgrade.json`、`packed-handoff.json`，实际命令均 exit_code=0；综合 3.1.0→3.1.2、研发 0.4.0→0.4.2 升级及实际包跨仓交接通过。

Spec：0 个未关闭 finding；无新增范围扩张。最终 Git 状态与总交付结论由主控核对。
