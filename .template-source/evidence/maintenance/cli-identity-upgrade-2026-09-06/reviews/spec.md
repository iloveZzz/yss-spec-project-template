# Spec 独立审查

角色：role.requirements-manager；runtime_id：runtime.skill-projection；actor_id：codex.cli-identity-spec。仅为 CLI 代码审查，不是生命周期会签或发布裁决。

## 固定候选

review_mode：worktree。四份 manifest 均经 inspectMaintenanceCandidate 验证；读取 tracked.diff 及 candidate.bin 新文件字节，在临时目录从固定基线重建 CLI。

| 候选 | 固定基线 | candidate_digest |
|---|---|---|
| create-yss-spec | f044e7b80b80eb3c3f40ed228fc21bb14f1f7a88 | 6de294ffe579a53d98f6fb3438d23d8c37672358fc5d657941c706a449e9ada5 |
| create-yss-strategic-design | 0787e8a90fb835d7645a9d31482c92b915693867 | 6c68845bf4ed5db9a81393c668dfe39cdedf08cb8dda916ceab9862e6d8efdfc |
| create-yss-harness-dev | c955c215248e2f8577fb84f7b86dc2a17898ccff | 55bedafa2f43dc0678b98c21524aa789b716d182871b15b340bbb0099068fa24 |
| template-source | ccc53f577babbeff5d8a9e674ef883c69bfac47d | 0707192351bd8919ab6f67290663f5264cb55490bae7e1d7733c450a25caed9b |

Spec 来源：固定 root candidate 内 `.template-source/contracts/cli-family-identity-contract.md`，以及提问者确认的 CLI 调整升级方案。

## Findings

未发现可复现的 violation、drift 或 new_impacts；无阻断 finding。五家族互斥、同族声明一致性、历史 schema 路径、force 不绕过、profile 单独存在、快照与写入后身份核验均有实现；未新增跨 profile 迁移或战略 sync。版本与固定源引用符合合同。

## 实际验证

- 三个实际 tgz 的 SHA-512 integrity 与 pack.json 一致；包内 src/cli.js、src/family-identity.js、package.json 与固定候选逐字节一致。
- 在 `/tmp/cli-spec-review-W7oYeS` 对应系统临时目录重建候选，执行 `pnpm exec node --test tests/family-identity.test.js`：spec 25/25、design 26/26、dev 26/26，最终三条命令退出码均为 0。覆盖适用操作、五家族、实际拒绝写入、force/dry-run、非法身份与 YAML、符号链接、帮助版本、无管理身份及匹配 profile。
- 四份候选在报告写入前再次 inspect，摘要未变。

补充分发输入（固定包目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-cli-upgrade-20260906-d9zud90d/packs/`）：

- create-yss-spec-3.1.1.tgz：sha512-zhWNEbzUBZbMNMp5eqZVJqcCu6ItGY8tOu0inYQ2FANo+zid+DEbKs+HE+0SLwzUWyUpr9dxWrMRauDKO+Hc7g==；源 SHA ccc53f577babbeff5d8a9e674ef883c69bfac47d。
- create-yss-harness-design-0.4.1.tgz：sha512-wHpQkLw7Dz1a4pQ862fLIzu3QYNBTsBZ6VPwBNiPPeCxxe3vHZmgQ1zuiLZy3bj703V8TxftIGlUl5figxsFnQ==；源 SHA f41c4a4af3afe6c26d299d6f4f16b6c6d4dc2e5e。
- create-yss-harness-dev-0.4.1.tgz：sha512-JPllJaiqlnwjn9YIoL2tQpTqif0JZ3knMDu4obnwdOlewt9D+S18LKkIEoP9AWfdiYpfeyrhXsimLoCpg9IjnQ==；源 SHA 07a126d76ad33c1e4162d2379ffb68007e01dad3。

## 限制

spec/design 的生成快照属于 gitignored，候选流不包含这些字节；本次使用主控提供且已核验 integrity 的固定 tgz 补充。design 首次重建缺少生成 manifest 导致测试失败，补入同一固定包 manifest 后全通过，该失败为审查环境装配问题。没有重跑全部 CLI 回归、历史版本升级、事务故障注入或发布门禁；这些仍依赖主控本轮验证证据。共享交接资产按分发与通用 profile 兼容范围审阅，未独立重新认证所有上游领域行为。不修改实现、不批准合同、不改变 checkpoint，不宣布整体可发布。

## 最终主仓候选复核

最终 manifest：`review-candidates/template-source-final/candidate-manifest.yaml`；固定 merge_base 仍为 `ccc53f577babbeff5d8a9e674ef883c69bfac47d`。已再次消费新流：tracked.diff 与原流完全相同，身份合同字节完全相同，唯一内容差异为 verify-cli-upgrade.mjs 中移除不适用于 spec 的 verify-entry-alignment，dev/design 增加 verify-harness-profile；通用 Skill 检查、metadata/仓库身份及升级断言保留。此调整符合三家族不同分发面的验收要求，未削弱身份互斥或同身份升级合同；新增 finding 为 0。

已读取主控本轮固定包 `packed-upgrade.txt` 与 `packed-handoff.txt`：日志覆盖三个离线初始化、spec 3.1.0→3.1.1 和 dev 0.4.0→0.4.1 同身份同步及用户文件保留，以及设计导出、移除源仓后的综合/研发验包、导入、对账、战术校验和切片消费。该日志为主控执行证据，本审查不冒称自行重跑。三个 CLI 候选与包未变化，77 项独立身份测试结果继续绑定原 CLI 摘要。最终 root 已由本节重新核对，报告表格已替换其摘要，不把旧 root 结论直接复用为最终结论。
