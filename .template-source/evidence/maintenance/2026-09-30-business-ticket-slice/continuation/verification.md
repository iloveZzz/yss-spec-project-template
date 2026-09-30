# Spec 后业务拆分与研发 Slice 衔接：继续推进验证

已关闭上一轮的功能回归与本地分发证据缺口，维护目标停在 **L3 implementation-ready**。Spec 业务草案、Design 校准、业务正式化、研发 Slice 来源和实现门禁的实现范围保持不变。

完整命令仍退出 **1**：唯一失败为 `verify-strategic-handoff-tools-lock --require-committed`，当前来源仍是工作树。没有提交、推送或发布，不能把本报告解释为完整发布验证通过。dataingest 保持只读，诊断见[试点记录](../dataingest-read-only.md)。

## 当前验证结果

| 范围 | 本轮结果 | 证据 |
|---|---|---|
| 串行整体检查 | 请求 fast，因核心核验资产变化自动升级 release；103 条结果中 102 条通过，1 条发布来源拒绝，4 条后续命令未在整轮中执行。 | [原始结果摘要](verification-summary.json)；原始报告及日志保存在 `raw-verification-evidence.tar.gz` 的 `verification-stable/`。 |
| 输入稳定性 | 整轮前后摘要一致，`input_drift=false`；补跑后摘要仍一致。 | [补跑后的输入摘要](supplemental-input-digest.json)。 |
| 被跳过的检查 | verification framework、cache、template CI、verification selection/report 共 4 条命令分别补跑，全部退出 0。 | [补跑记录](supplemental-results.json)、`logs/`。 |
| 语法与格式 | 103 个脚本的语法检查通过；旧 Ruby 入口检索无命中；`git diff --check` 通过。 | [补跑记录](supplemental-results.json)。无命中检索预期退出 1，不是测试失败。 |
| 业务 Ticket 合同 | 33 个测试通过，0 失败、0 跳过。 | [业务测试日志](logs/business-tickets.stdout)。 |
| Tooling 集成 | 184 个测试通过，0 失败、0 跳过；vendor 依赖闭包通过。 | [Tooling 日志](logs/tooling.stdout)；整体报告对应 check:vendor 结果。 |
| Skills 与流程 | 共享投影、锁、注册表、全 profile 同步、生命周期及权限场景全部通过。上一轮 DESIGN 摘要、profile 冲突及 Vue 打包问题不再复现。 | [整体检查明细](verification-summary.json)。 |
| L3 反例 | 人工否决被错误标为批准、阶段交接缺少来源、无最终验证却申请发布均被实际拒绝。 | `counterexamples/*.run.json`，包含输入摘要、日志摘要和预期诊断。 |
| 本地分发 | 四套 CLI 重建、打包、隔离安装；44 个真实入口命令全部达到预期。 | [构建记录](build-results.json)、[集成记录](integration-results.json)、[包与安装内容核对](package-evidence.json)。 |

整轮有 2 条相同命令复用，因此 103 条结果不等于 103 个唯一进程。补跑记录单列，未修改原报告的失败或未执行状态。完整命令的发布拒绝原文见[日志](logs/release-provenance-rejection.stderr)。

## 本地分发和兼容性

| 本地验收包 | 版本 |
|---|---|
| create-yss-spec | 3.5.3 |
| create-yss-harness-design | 0.8.10 |
| create-yss-harness-backend | 0.4.14 |
| create-yss-harness-frontend | 0.3.14 |

实际安装入口验证初始化、同步及重复同步、用户文件保留、旧配置不自动启用、定制模板冲突可见，以及业务票正式化。主 CLI 另验证 Spec、Design、工程阶段资产按需安装和重复执行。安装快照及业务运行模块与当前源字节一致，39 个本次关注输入复查未漂移，见[源码复查](source-recheck.json)。

这些是 `sourceState=working-tree` 的本地验收包。打包使用 `npm pack --ignore-scripts`，没有运行发布 prepack，也没有把本地包称为已发布固定版本。正式发布仍需要授权后的固定提交来源、重新构建的包及完整发布门禁。

## 输入保留和隔离验证

继续推进前再次备份主仓及 7 个子仓的状态、差异和修改文件，共记录 9439 个已有 dirty/untracked 文件。没有 reset、clean、stash 或覆盖已有业务改动。本轮唯一手工格式修正是旧设计报告中 5 行 Markdown hardbreak，改成等义反斜杠形式以消除行尾空白；其余写入为现有同步/构建工具产物和本次验证记录。

当前工作区第一次整轮也是 102/103 通过，但并行任务写入 workspace-tags 证据导致 `input_drift=true`，该报告保存在归档的 `verification/`。随后创建保留各仓 HEAD、分支及未提交内容的独立验证副本，不创建新提交。源文件清单保存在 `verification-source-manifest.json.gz`；Git 忽略的主 CLI 生成物另存 `isolated-generated-inputs.json.gz`。验证后[源码对齐检查](source-alignment.json)确认清单中的实现输入和 HEAD 未变化。

隔离准备发现并修正了四个差异：遗漏 ignored CLI 快照、克隆残留的源中已不存在的空目录、共享 node_modules 链接改变 vendor 路径、Python 导入写入缓存。最终补齐现有生成物，移除副本中的空目录，复制现有依赖实目录并保留 pnpm 内部链接，以 `PYTHONDONTWRITEBYTECODE=1` 执行。没有为获得通过而修改检查规则。准备记录见[差异处置](isolation-preparation-corrections.json)；失败/中断轮次 `verification-isolated/` 和 `verification-isolated-final/` 保留在原始归档中。

稳定副本的验证只证明清单对应的工作树组合，不替代已提交来源或真实 Agent/人工使用效果。本次没有恢复多平台 Agent 评测，也不宣称效率收益。

## 交付状态

维护者[自查](self-check.md)及[checkpoint](maintenance-checkpoint.json)记录实现验证完成，目标和当前状态均为 `implementation-ready`；它不批准产品 Slice，也不宣告整个工作区可合并或可发布。`fresh-verification` 绑定实际通过的业务测试、Tooling 及本地分发记录；失败的整轮命令在 escalation 中明确保留，没有伪记为 pass。

后续提交、推送、发布及存量实例迁移均保持原授权边界。dataingest 的业务拆分缺失、工程前置未闭合、父 Ticket 状态不一致和 checkpoint 失败仍是四项独立诊断，本次没有代为修订。

原始日志、验收包和安装实例位于 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-business-continuation-yja_ylhz`。仓内归档保留原始报告、日志和运行脚本，包摘要见 `package-evidence.json`；临时安装目录不作为长期发布存储。
