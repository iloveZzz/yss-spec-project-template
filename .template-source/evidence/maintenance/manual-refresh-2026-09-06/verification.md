# 用户手册更新验收

按提问者 Q1–Q11 全部推荐及“确认 开始实施”授权执行，包含 GitHub 提交推送；npm 发布另行授权。

## 交付内容

主仓改为五家族选型、通用操作、首次使用与升级导航；战略、通用研发、后端、前端各有本地专项指南。统一使用内部设备借用教学故事，覆盖提示词、真实命令语法、输入输出、人工确认、战略/后端交付、前端联合接收、失效恢复和整体业务验收。旧入口保留并转向现行内容，消除继承的全栈职责越界和断链。

三个 CLI 候选为 create-yss-spec 3.1.2、create-yss-harness-design 0.4.2、create-yss-harness-dev 0.4.2。README和综合CLI详细指南区分GitHub与npm渠道，并给出固定SHA候选构建和本地tgz使用步骤。npm观测见 npm-observation.json；未执行 npm publish。

## 本轮实际证据

- 主仓及四模板各执行完整 scripts/verify-template 并通过；战略分发清单修复后再次完整通过。对应 logs/*-full.json 记录命令、时间、耗时和退出码。
- 变更文档链接检查最终64份无缺失；新建的五家族实例逐字节核对44份更新指南及本地引用。三个来自真实tgz，前后端来自已提交且干净的模板，release_snapshot 为 true。见 logs/manual-distribution.json。
- 三CLI当前身份测试77项通过（spec25、design26、dev26），见 logs/*-identity.json/txt。战略最后一次修复仅增加4份指南分发、调整源SHA；最终包已重新验收。
- 实际包 spec3.1.0→3.1.2、dev0.4.0→0.4.2 同家族sync通过，用户README修改及运行时代码保留，见 logs/packed-upgrade.json/txt。
- 实际tgz战略导出、移除源仓后综合/研发验包、研发导入对账及战术/切片消费通过，见 logs/packed-handoff.json/txt。
- 本轮未改变CLI src/bin，实际包源码与固定基线一致。包版本、源完整SHA、默认ref、快照requestedRef/templateCommit和文档一致，包integrity见 logs/*-pack.json。
- 独立源手册和CLI审查分开记录在 reviews/。source-final-2.json、strategic-distribution-fix.json、cli-final-2.json 为最终候选清单；历史捕获仅保留返工证据，不复用为最终结论。普通文档/代码审查不代替生命周期会签或发布批准。

## 返工及可复现边界

战略手册初稿遗漏本仓规定的业务读者和问题引导，研发索引遗漏CLI家族引用，已补回并复验。研发早期捕获发生在测试运行中，混入测试临时JSON；等待测试自行清理后重新捕获，两个Reviewer确认仅删除这三项，实际提交不包含测试目录。

第一次实际包验收发现战略旧分发清单仍排除4份现已改写的专项指南，导致索引断链。已修改权威分发清单及场景测试，完整校验后提交并绑定新SHA重建包；五家族最终验收通过。first/before-distribution 日志是已关闭失败/旧轮证据，不能计作最终成功。

维护者复现时按 workspaces.json 的源提交、包环境及 logs/integration-env.json 重建输入，再执行本目录保存的检查脚本与主仓分发验证器；脚本中的 /tmp/yss-manual-state.json 可由 workspaces.json 恢复并更新本地工作区/解包路径。临时 tgz 在 /tmp/yss-manual-validation/packs，未入Git；未来npm发布应从获批提交重建并重新验证。本轮不声称已完成npm发布，也不把教学案例作为产品测试证据。

## 状态和边界

L3模板分发维护，产品Spec/OpenAPI/运行时代码及业务词汇登记为带原因not-applicable，详见 scope.md。维护checkpoint为implementation-ready，未设置生命周期review-ready/release-ready。原dev checkout的snapshot哈希保持不变，新CLI在既有隔离worktree中交付，因此原子模块本地仍可能显示旧checkout与新gitlink差异。主控按先模板、后CLI、最后父仓引用的顺序交付；具体提交映射见交付记录。

最终复核：源手册 Standards/Spec 与 CLI Standards/Spec 四份报告均无未关闭 finding；CLI提交前逐份重算规范捕获摘要一致。三个CLI已提交并推送main、远端SHA已核对，映射见 github-delivery.json。主仓最终fast检查通过，candidate检查也通过，见同名日志。

原始候选tracked.diff/candidate.bin及测试日志保留原字节，不做尾空格格式化；人工维护文档与代码执行staged whitespace检查，原始证据不参与该格式检查。
