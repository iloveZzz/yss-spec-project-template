# 生命周期诊断与评测器修复

日期：2026-09-27。用户已授权执行上一轮确认的修复。本轮修改模板源工具、测试和使用说明，不修改 auth-backend，不启动真实模型，不提交、推送或发布。

## 修复结果

| 问题 | 当前行为 | 反例与验证 |
|---|---|---|
| checkpoint 阻塞字段错误却显示通过 | 缺字段与非法类型分别产生诊断，检查失败、下一步为 repair；有效空数组仍表示未登记阻塞，执行授权保持 not-evaluated | 缺失、null、字符串、对象、布尔值、数字均被识别；读前后字节相同 |
| 必需来源未复制进入测试目录 | 在源目录、复制后、注入后和每步启动前检查；注入不能代替漏复制的来源，setup 删除必需文件也阻断启动 | 原文件存在但 source_paths 漏选时失败；setup 后缺文件时 Agent 尝试数为 0 |
| JSON 数组导致判分崩溃 | json_equal 检查对象、字段和值类型；错误内容、读取错误和断言超时记为失败，并保留步骤结果及已报告 usage | 数组、null、字符串、数字与布尔类型混淆；二进制内容和 Node 超时反例 |
| 文件写入范围只靠额外人工复核 | 场景或步骤可声明 allowed_writes，按最终文件摘要 / 链接差异判断；旧场景未声明明确记 not-checked | 未允许的修改、删除、新增和目录边界、链接越界反例 |
| 批次有失败仍只返回成功码 | 默认 strict：0 自动通过、1 已完成但有失败、2 未完成；report-only 显式兼容旧调用，但仍保留 failed 状态 | 通过、错误 JSON、额外写入、无 completed turn、fixture 错误均通过本地假运行时验证 |
| 总预算和停止原因依靠外层人工记录 | 增加 max-turns、max-seconds；剩余时间约束当步超时；summary.json 记录未执行场景 / 步骤、停止原因与未知用量 | 多步运行耗尽次数、时间截止、停止后不启动后续场景；中断终止进程组并留存步骤结果 |

使用合同见 [评测器说明](../../../scripts/skills-agent-eval.md)。26 项评测器测试已接入模板 tooling 验证组，避免以后仅手动执行。历史的 48 次主对照和 4 次 UI 补测、来源快照、runner 和评分保持原样，本轮没有用新判定器改写历史成绩。

## 维护者自检与范围

本轮按 L3 的 aggregate-behavior-change / core-validator 记录：修改自动结果消费和停止语义，同时接入既有验证框架。自检由实施者完成，不称独立审查。业务 context reconciliation 为 not-applicable：仓库身份 template-source，本轮不增加业务词汇或产品阶段资产，已读取根 CONTEXT.md。

保留起始脏工作树。[基线清单](baseline.json)与 before/ 保存本轮涉及的 6 个文件实际字节；[增量清单](implementation-delta.json)和[补丁](implementation.patch)仅比较这些起始字节，不把已有变更归入本轮。未编辑 canonical Skill，所以本轮没有新的 Skill 投影或锁重建；适用同步状态由模板完整检查核验。评测器和验证配置属于源仓维护工具；状态脚本的最终固定版本 CLI 分发仍随已授权的发布流程进行，未手改消费者快照。

## 验证

[修改前反例](red-verification.json)中 runner 与状态检查均 exit 1；原始失败日志保留。新增批次测试初次因测试自己的 source_paths 漏选 required.txt 而被新检查阻断，补齐测试输入闭包后通过，没有放宽被测检查。

[定向验证](focused-verification.json)中，评测器 26 项测试、生命周期状态场景、验证 profile 场景均 exit 0。测试中的假运行时只用于证明本地 runner 的停止、留证和退出码，不能证明真实 Agent 行为或真实 API / 浏览器交付。

`scripts/verify-template-fast` 按实际影响面升级完整检查，310.49 秒，实际 exit 1：91 项顶层检查中 90 项通过，唯一失败是 `verify-strategic-handoff-tools-lock --require-committed`；当前仍为 working-tree 来源。见[执行记录](template-verification.json)、[顶层汇总](full-check-summary.json)和[原始日志](verify-template-fast.log)。Skill 投影、锁与 profile 检查均通过；原始日志中的预期负向 fixture 输出不另计顶层失败。本轮修复有新鲜验证支持，但不据此称整体可发布。

最后按本轮增量重新检查源文件摘要、Python 语法、补丁格式和报告引用，见 [完整性检查](integrity-check.json)。核验期间六个源文件未变化；历史评测证据没有被改写。

## 剩余边界

- 写范围检查是最终内容差异检查，不能发现修改后还原等瞬时动作；运行时隔离和轨迹复核仍必要。
- 总时长约束 Agent 执行窗口；fixture 准备、判分、终止清理可能超过窗口。未知 usage 不按零成本处理，金额保持 null；不承诺供应商账单级硬限额。
- 完整 API v2、跨仓修复后接收、真实完成结果恢复、mandatory skipped 与浏览器验证，仍按[原覆盖矩阵](../2026-09-26-lifecycle-improvement-implementation/evaluation-coverage.md)另立场景；本轮本地反例不填补这些真实 Agent 覆盖缺口。
- 读取成本与模板产物长度需要后续小规模对照确定收益。auth-backend 的合同和迁移冲突沿用[现有恢复方案](../2026-09-26-lifecycle-improvement-implementation/auth-backend-pilot-readiness.md)，没有借本次工具修复自动迁移或重建批准。
