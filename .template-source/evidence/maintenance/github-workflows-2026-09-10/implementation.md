# GitHub workflow 重设计维护记录

## 范围与用户决定

当前仓库身份为 `template-source`。提问者于本轮讨论逐项确认：模板源与实例边界一起定义、先实施模板源；CI 与规则一致优先；日常维护自检、分级决定验证强度；PR 影响面、main 全量、发布前全量与集成；保留现有兼容范围；发布只验证、不产生发布副作用。最终回复为“OK 达成共同理解，开始实施”。

实例 CI 本轮仅定义合同，不安装；允许草案，流转时才检查实际门禁；保留 `.github` 分发排除和同步保护。无提交、推送、远程设置修改或远程 Actions 触发。

分级 L3：release-semantics、core-validator、aggregate-behavior-change。产品 Spec、原型、OpenAPI、Slice 合同及 context_reconciliation 为 not-applicable，原因是模板维护，不改变产品业务行为。测试策略采用维护场景与隔离集成，不使用产品切片 behavior-tdd。独立审查为按需，本轮使用维护者自检。

## 改动与自检

- 工作流拆分为 Template CI、Template compatibility、Template release verification；用 Template checks 汇总 PR 所需结果。
- 影响分析继续消费唯一 profile，核心与未知路径升级；主 Node 24 全量与其他平台兼容检查分工；工具测试和 vendor 检查不再在同一主验证路径重复执行。
- 固定检出模板与 gitlink 子模块；真实生成器在隔离副本中重建包、安装和初始化，验证用户 `.github` 同步保护；失败也保留命令退出码和日志。
- L2 支持自检，L1/L2/L3 自检可进入发布验证路径；缺少自检或完整发布证据仍拒绝。历史独立审查记录继续兼容，产品切片审查规则保留。
- 同步 canonical Skill、投影和锁；`docs/process/github-workflows.md` 记录 CI 与实例检查合同、官方平台依据。
- 初始已有的两个子模块修改均未由本轮写入。收尾发现其他工作已提交 create-yss-spec 3.3.2，父仓 HEAD 为 `1e49baf`，只更新该 gitlink；本轮未操作该提交。

## 已执行验证

- Node 23.9.0：`scripts/verify-template-fast` 自动升级 release，退出 0；完整检查通过。
- `scripts/verify-maintenance-intensity-scenarios`、`node scripts/verify-template-verification-scenarios`：退出 0。
- `node --test .template-source/scripts/tests/template-ci.test.mjs`：4 个测试通过，退出 0；覆盖真实本地 tarball 安装、版本与脏树拒绝、失败证据、工作流职责。
- actionlint 1.7.7：三个 workflow 校验退出 0（未启用 shellcheck / pyflakes）。
- 真实生成器 smoke：先使用旧 gitlink `8e71bc2819b5d0319358bc1dbd83df70d106b756`，收尾又使用当前 gitlink `797476749b3c19099a614520d06428824e257cc7`（3.3.2）的隔离副本消费当前未提交工作区，快照、打包安装、初始化、Skill 投影/锁、dry-run / sync 用户 `.github` 保留全部通过。该试验不是固定模板 commit 的发布证据。
- Node 24.21.0 最终全量验证：独立 Node bin 加入 PATH 后运行 `scripts/verify-template-fast`，自动升级 release，退出 0；完整日志见 `node24-verification.txt`。真实生成器试验摘要见 `generator-smoke.txt`。

## 验证复盘

第一次 Node 24 全量运行通过 npm exec 包装，内部 npx 继承包参数，使设计规范 lint 调用了错误命令，退出 1。直接使用同一 Node 24 二进制后，该 lint 退出 0；最终全量改为独立 PATH 环境。该问题属于本地启动环境，CI 使用 setup-node 不采用此包装；已将复验方式写入 CI 合同。没有为此放宽检查或修改第三方工具。

## 风险与下一步

本地验证不证明远程 Actions 已运行。发布前需将变更形成确定提交，再使用新入口验证该提交及固定生成器组合。远程分支保护如绑定旧 job 名，应由维护者迁移到 Template checks；本轮不操作远程设置。生成项目 CI 自动安装保留为后续工作。

当前生成器补验退出 0 后，重新运行模板验证路由场景（含当前生成器分发清单检查），退出 0。发布验证将始终读取实际待发布提交的 gitlink，不固定上述试验版本。
