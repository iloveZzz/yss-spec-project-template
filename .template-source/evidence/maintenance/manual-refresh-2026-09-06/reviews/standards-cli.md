# CLI 分发阶段 Standards 独立审查

结论：最终三个 CLI 候选未发现未关闭的 Standards finding。战略源分发缺口已通过捕获增量与最终实际包复核关闭。本报告为普通独立审查，不是生命周期会签或 npm 发布授权。

## 固定候选

读取 cli-final-2.json 指向的规范 candidate.bin、tracked.diff 与清单，复算 SHA-256，并核验 tracked 记录与外部 diff 相同；包含研发 CLI 的全部 untracked 新手册，不以 live 工作树替代候选。

| CLI | 固定基线 | 最终候选摘要 | 版本 | 模板提交 |
|---|---|---|---|---|
| 综合 | ced179948be66fad349e2b206adf45e1ed3a3987 | 14d61bccf903a348aab45e06f7f144172e41290bd156e94edc2c02a1a5dec437 | 3.1.2 | 017925706a981aec9eadefd470232bb531acd4d6 |
| 战略 | f6e29b0efa341afb9a7ab51d85bff62f009c43b3 | a63c635501f670e5be97f822766a5d8aa14fa983994b40b1657c038a64f57461 | 0.4.2 | 5baa45c8a8929843664ab14dcd150b4c2a12fa05 |
| 研发 | fa207e4b657a37058774ecea41bd22c01cf525d1 | a82e8b736d613c2ee6d2a7227da64328e5cd048659f0d6c56fe63ece3f73fec1 | 0.4.2 | baae3f6e2f474b30cf8c97292be4580bafae1f37 |

固定点/merge-base、捕获命令和原始清单以对应 candidate-manifest.yaml 为准。未审阅未来提交或后续字节变化。

## Standards 核对

依据 AGENTS.md 的分发闭环、家族身份、单一事实来源、批准与 Fresh Verification 规则及本轮 scope.md：

- README/综合详细手册明确区分 GitHub 候选与 npm latest，没有将 3.1.2/0.4.2 写成已发布 npm。候选使用明确家族远程地址与完整 SHA 先生成快照，再 npm pack --ignore-scripts；本地 tgz 示例与实际包名一致。
- 三仓版本、README 中固定源、DEFAULT_TEMPLATE_REF 和实际包 snapshot.requestedRef/templateCommit 均一致。metadata/force/dry-run 家族边界与现有行为一致；战略明确无 attach/sync，不将 init --force 当迁移；update/upgrade 与实例同步区分明确。
- 实际三个解包 src 全部文件逐字节与各 CLI 固定基线的 git show 内容一致，无额外运行时代码变更。全部分发 docs/user-guide/*.md 逐字节与上述固定模板提交一致。研发 tracked 模板快照变更及新手册属于已批准确定性分发范围。
- 独立复算最终 tgz SHA-1/SHA-512，与 *-pack.json 相同；逐份比较解包 regular file 与 tgz 字节：综合 6223、战略 1069、研发 6167 个文件全部一致。

实际包 SHA-1：综合 825a0517c1e404c9dcc1c9450043102cc243832c；战略 e4f259b6285d8a4dbe8850cd234db78024394601；研发 e08f9f753d3959a31abc24d2eca0d503259f9561。完整 integrity 与环境证据位于 /tmp/yss-manual-validation/*-pack.json。

## 战略源分发修复

增量基线 f50b57a2cdb0d3be9a286fe4e8205f51b45f4b09，规范候选摘要 b8c25ad60cd1568a51a35422b873f235be369086f4272667dc9853dd2cb5f9f8。读取并复算 strategic-distribution-fix.json 的 captured stream，无 untracked。

该增量只从 instance-distribution-manifest.yaml 移除四份已改写战略专项指南的排除项，并在 verify-instance-distribution-scenarios 中断言这四份及贯穿案例必须分发。没有放行其他工程资产或改变 profile/批准政策。最终战略 tgz 确认四份文件存在且字节匹配源提交，原实例断链缺口已关闭。

读取 /tmp/yss-manual-validation/manual-distribution.json：最终五家族实例文档验收 exit_code 0，战略使用修复后的 5baa45c8 完整提交；三个 *-identity.json 均 exit_code 0。首次失败属于旧包，不能用旧捕获或旧包替代上述最终证据。

## Fowler 与专项适用性

无需阻断的 Fowler smell。文档重复用于独立分发与详细入口；小型分发测试断言未引入新抽象。Java、生产 YSS 实现与 UI fidelity 均 not-applicable，因本轮无此类实现。源文档轴的原报告继续有效；本报告补充 CLI 与战略分发修复的覆盖。

未关闭 findings：0。结论不替代主控对最终提交、远端 SHA、父仓 gitlink 和原 dev 工作区保留情况的核验。
