# CLI 同步升级与 GitHub 提交证据

用户本轮明确要求“项目cli同步完成升级后提交github”，授权三个 CLI 的同步升级、Git 提交与推送，以及父仓 gitlink 更新。与“提交整体项目到 GitHub”任务划分范围：该任务负责源仓及父模板固定，本任务负责 CLI 和最后的引用汇合；无并行写入同一资产。

## 范围与分级

L3，触发 cross-repo-contract、generation-semantics、release-semantics。变更为固定模板 revision、生成快照、CLI 版本及对应 README。canonical Skill 演进沿用已验证源仓；遵循 maintaining-skills，同步投影不手改。context_reconciliation 为 not-applicable，原因是模板源分发维护，不创建产品工作单元。behavior-tdd 为 not-applicable，原因是版本配置和确定性快照更新；用已有 120 项 CLI 回归和跨仓实例验证覆盖行为。

本轮版本：create-yss-spec 3.1.0、create-yss-harness-design 0.4.0、create-yss-harness-dev 0.4.0。源提交、CLI 提交、快照摘要及实际 npm 包完整性详见 versions.json。综合和设计 CLI 的 template 目录按各自 .gitignore 由固定源提交生成；研发 CLI 保留已跟踪快照。

## Fresh Verification

- 三个 CLI 分别使用 GitHub URL 和完整模板 SHA 执行 `pnpm run sync-template`，均 exit 0。
- 三个 CLI 分别执行 `pnpm exec node --test tests/*.test.js`：综合 57/57、设计 7/7、研发 56/56，均 exit 0；原始输出为同目录 *-tests.txt。
- `node .template-source/scripts/verify-strategic-handoff-distribution.mjs` exit 0：设计导出、移除源仓、综合/研发验包、研发导入、正式对账、战术 validator、切片消费；见 distribution-final.txt。
- 三个 CLI 分别执行 `npm pack --ignore-scripts --json --pack-destination /tmp/yss-cli-sync-20260905` exit 0。npm 仅用于验证 npm 实际分发格式；同步和测试优先 pnpm。打包前快照已固定，禁用 prepack 避免改写待验输入。
- `node /tmp/yss-cli-sync-20260905/verify-packed.cjs` exit 0：解压三个实际 tgz，验证 package 版本、CLI --version、模板提交、快照树摘要、关键交接文件，执行初始化并校验 project-instance 身份。原始结果为 packed-smoke.txt；tgz 为临时构建物，不进入 Git。
- 主模板与两个子模板分别执行 `scripts/verify-template`，均 exit 0；见 root-final-verify.txt、design-verify-stable.txt、dev-verify-stable.txt。
- `scripts/verify-maintenance-checkpoint .template-source/evidence/maintenance/cli-sync-upgrade-2026-09-05/checkpoint.yaml` exit 0；证据落盘后 `scripts/verify-template-fast` exit 0，见 root-checkpoint-fast.txt。
- 各仓 `git diff --check` exit 0。维护者自检确认版本、README、默认模板 revision 与快照元数据一致。

## 验证并发复盘

初轮模板校验与另一已授权任务的 Git 提交同时运行，触发工作区只读保护。完成写范围协调后，在稳定工作区重跑完整门禁通过。

CLI 既有 init 反例会临时写入 template/yss-project.yaml 和 snapshot，并在 finally 恢复。最初跨仓冒烟与这些反例并发，碰到非法身份而正常拒绝。最终采用“CLI 回归完成 → 跨仓链路与重新打包 → 解包初始化验证”，结果全部通过。临时解包检查最初误把 --version 预期写成裸版本，已按 CLI 实际的“包名 版本”格式修正并重跑。均未修改产品代码或放宽校验。

## 状态和边界

本记录为 implementation-ready 的维护者自检及 Fresh Verification，不创建冻结候选、不冒充独立审查，也不宣布产品可发布。此次只提交推送 GitHub；未执行 npm publish、GitHub Release 或版本标签推送。
