# CLI 身份保护与补丁升级验收

已实施用户确认方案。三个 CLI 在写入前拒绝跨家族、损坏或矛盾身份，force 不绕过，dry-run 执行相同检查；初始化与同步后核对实例身份。帮助和程序更新保持兼容。未增加战略 sync 或跨 profile 迁移。

| 包 | 候选版本 | 固定模板提交 |
|---|---|---|
| create-yss-spec | 3.1.1 | `ccc53f577babbeff5d8a9e674ef883c69bfac47d` |
| create-yss-harness-design | 0.4.1 | `f41c4a4af3afe6c26d299d6f4f16b6c6d4dc2e5e` |
| create-yss-harness-dev | 0.4.1 | `07a126d76ad33c1e4162d2379ffb68007e01dad3` |

## 本轮验证

- 三个 CLI 共 197 项回归用例已获得通过证据：design 全量 33/33；spec/dev 首次全量各 82 项，各有 1 项测试装配失败，修复夹具后重跑完整受影响套件分别 8/8、7/7。其余 182 项在原全量运行通过。这是全量结果加定向重跑，未描述成一次全量全绿。
- Node 22.23.2、24.20.0 各通过 77/77 身份测试，并各通过真实 tgz 初始化、spec 3.1.0 → 3.1.1、dev 0.4.0 → 0.4.1 同族升级，用户 README 修改和运行时代码均保留。
- 实际 tgz 的模板源、完整 SHA、摘要与身份一致；三个离线初始化及 Skill/profile 校验通过。包摘要见 [packages-round1.json](packages-round1.json)。
- 固定包跨仓 Handoff：战略导出后移除源仓，综合/研发验包、研发导入、对账、战术校验和切片消费均通过，见 [日志](logs/packed-handoff.txt)。
- 本轮主模板、战略模板、研发模板分别执行不可裁剪 scripts/verify-template，退出码均为 0；主仓最终 scripts/verify-template-fast 与 scripts/verify-template-candidate 均退出 0，见对应日志。
- Standards 与 Spec 两位独立审查者各复建固定候选、验证 77 项身份测试及包代码一致性，无遗留 finding；修正主仓验收脚本后已增量复核。见 [Standards](reviews/standards.md)、[Spec](reviews/spec.md)。这些是代码审查，不代替生命周期会签或发布批准。

## 证据及适用边界

原始命令、时间、退出码及输出保存在 logs/。first-run 为被中断的探索运行，identity-red/profile-red 为预期红灯，tests 中两次夹具失败由 fixture-retest 闭合；packed-upgrade-first 为已修正的验证脚本错误。不能把历史失败文件当作最终通过，也不能把它们隐去。

本轮为 L3 模板分发维护，cross-repo-contract、generation-semantics、release-semantics 命中。产品 Spec/OpenAPI/Slice/context_reconciliation 为 not-applicable，原因是模板维护而非产品研发。新增命令行为采用公开 CLI seam TDD；确定性快照与维护文档使用分发校验。维护状态为 implementation-ready，普通代码审查作为补充证据，不声明 lifecycle review-ready 或可发布。

## 工作区和交付

工作区、原始 HEAD、源 SHA 与原 dev 快照哈希登记在 [implementation-workspaces.json](implementation-workspaces.json)。spec/design 在原子仓，dev 在独立 codex/cli-identity-upgrade-20260906 工作树；原 dev 工作区的既有 snapshot 修改保持原样。用户随后明确授权提交并推送 GitHub。三个 CLI 已提交并推送 main，远端 SHA 已核对；提交映射见 github-delivery.json。父仓本次提交同步 gitlink。未 npm 发布。原 dev checkout 保留旧 HEAD 与既有修改，因此本地会显示该子模块与新 gitlink 不同；新实现保存在登记的隔离工作树及远端 main。

按授权先交付三个子仓，再更新父仓 gitlink；提交只包含本轮范围。CLI 的构建/CI 固定模板完整 SHA，验证命令使用本轮日志与 scripts/verify-cli-upgrade.mjs、verify-strategic-handoff-distribution.mjs；实际包输入通过 YSS_CLI_*_ROOT 和 YSS_OLD_*_ROOT 指定，示例见 logs/packed-env.json。本地 tgz 位于 `/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-cli-upgrade-20260906-d9zud90d/packs`，属于临时验收产物，后续发布应从获批 Git 提交重建并重新核验。

实例升级前保存 Git 基线，先 sync --dry-run，再正常 sync；事务失败自动回滚，成功后的撤销使用该基线或备份。CLI 改动的回滚基线为工作区登记中的原始 HEAD，不对用户既有工作区执行 reset。npm 发布不在本轮范围。

提交检查：候选 tracked.diff 与原始测试日志保留原字节，其中补丁上下文和 TAP 输出含尾空格；不对固定审查证据做格式化。源代码、合同和人工维护文档的 staged whitespace 检查通过。
