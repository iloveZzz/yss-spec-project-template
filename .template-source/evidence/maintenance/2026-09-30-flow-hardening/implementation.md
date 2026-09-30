# 规格研发流程修复实施记录

范围由本会话用户“PLEASE IMPLEMENT THIS PLAN”及其五阶段计划明确授权；仓库身份为 template-source，整体 L3，目标 implementation-ready。未创建产品 Spec、业务 Ticket、Git 提交或发布。

当前结论：实施代码已落地，整体集成验收未闭合，尚不声明达到 implementation-ready。执行期间另有业务 Ticket 改动进入工作区，引发注册表、投影、锁和分发依赖不一致；本轮保留这些改动。冻结隔离副本的完整串行报告 input_drift=false，但仍有失败；仓库外 DELIVERY.md 汇总逐项命令、退出码、补跑结果和恢复顺序。固定提交门禁与原有文档行尾空格问题也未绕过。

已实现：

- 验证选路补齐 Plan/Spec 内容与模板一致性、编排合同、checkpoint 及 CI 定向检查，保持 shadow；未知与核心变化升级全量。
- checkpoint v1 校验 decision/reason、handoff/subagent/compact 条件证据和阶段因果。消费端沿用各专职模板的原有边界，历史检查明确只读。
- 验证计划 stdout 自然排空；大输出、管道、文件及写出失败有回归。
- project-ci plan/apply/check：输入与输出摘要、同名/人工修改冲突、幂等事务及恢复；平台无关治理核心和 GitHub 可选工作流。当前批准和流转调用既有校验器，缺能力显式失败；PR 基线检查 checkpoint、批准记录及传递引用删除和范围缩小。
- 三类高风险 trigger 的 counterexample 绑定实际拒绝执行、日志和输入摘要；历史维护记录不回写。
- 反例进一步绑定预期拒绝原因：生物人否决、交接缺证据、发布缺最终验证；其他执行错误不能冒充目标反例通过。该修正有修改前失败、修改后通过的回归和三类实际运行记录。
- lifecycle-status --preflight 只复验和提供恢复动作；普通查询保持不触发预检。相关入口补充 help 与退出码语义。
- 人工试点见 human-pilot.md 和材料摘要清单；暂无真实参与者或测量，仍为 pending-human-feedback，阅读策略 manual。

自检：追踪了身份/词汇、checkpoint、当前批准、流转、task package 消费入口；检查不执行记录中的业务命令。未识别且声称批准/完成的结构化资产不得因有引用关系而被当成已验证，缺少适配时报告能力缺失。普通草案不要求未来资产。批准、执行与发布权仍由既有生命周期管理。

验证过程与完整 stdout/stderr 在仓库外 `/Users/zhudaoming/.codex/tmp/flow-hardening-20260930/`。routing-red.log、checkpoint-red.log 保留修改前拒绝失败；阶段回归和集成命令有独立日志。前期被中断或输入变化的 fast 轮次仅用于诊断，不作完成依据。打包 smoke 在隔离副本对已生成快照执行 npm pack --ignore-scripts，保留 working-tree 来源；它不是固定提交发布验证。

现有工作保留基线位于上述目录的 baseline/：根仓与七个子仓的 HEAD、原未提交内容副本、binary diff 和摘要均已记录。maintaining-skills 的三个专职模板目标已有未提交内容，经逐字节确认与本轮修改前 canonical 相同后，通过既有同步 API 仅追加本轮说明，保留原内容；详见 reconcile-profile.mjs。其余投影、锁及分发快照均通过仓库同步脚本生成。

已知边界：当前 GitHub 工作流未在远端运行，未配置 required checks；未提交、推送或 npm 发布。人工效果必须获得实际反馈后另行验收。后续完整验证以最终仓库外报告的 exit code、输入摘要与 input_drift 为准，不以本记录的实施自述替代。
