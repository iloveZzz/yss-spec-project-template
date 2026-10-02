# 主控阶段、阻塞与恢复提示完善

用户要求主控说明当前阶段、下一阶段、当前问题、阻塞和处理方法。仓库身份为 `template-source`，本轮为模板维护，未生成产品 Spec、原型、OpenAPI、Ticket 或真实实例状态。

## 范围与结果

- canonical `yss-product-lifecycle` 的 `user_progress_report` 统一定义每轮返回、状态请求、恢复、流转、阻塞、暂停和交接的可读输出与发送前自检。普通进度只报告有意义的变化。
- 输出包含当前阶段与依据、本轮结果、下一阶段或工作单元及进入条件、实质阻塞及处理与复验、实际登记责任方、Agent 后续动作及必要的用户决定。下一阶段只是目标，缺路由或归属时明确待核验；下一单元可能仍在当前阶段。
- `lifecycle-status --format text` 增加下一阶段、逐项来源与责任方、恢复动作、待核验范围及继续条件；查询失败也有中文处理提示。合法模板身份回到维护路由；身份异常进入迁移检查。
- 门禁待处理、失败、待会签和未评估信息可见；适用性缺失时不推断门禁已通过。原 `blocked` / `stale` 即使同时标记不适用也继续阻断，冲突交正式预检。
- 只读查询不写入状态，不授予批准或执行资格；未登记责任方如实说明。默认 JSON 失败格式和原退出码保持兼容；preflight 继续提供结构化 JSON。
- 更新共享写作规范、专职主控生成提示和同步器；同步 root/三 Agent 投影与锁文件、四类 CLI 的 WORKTREE 分发快照。专职 Profile 的 owner/reference 保持原范围。

## 分级与边界

L3：`aggregate-behavior-change`、`generation-semantics`、`cross-repo-contract`。改变状态呈现和分发行为，未修改生命周期批准、权限、Ticket 五态或发布规则。产品阶段、业务资产、运行时代码为 `not-applicable`，原因是模板源维护。采用维护者自检，目标 `implementation-ready`，不宣称 `release-ready`。

使用 subagent 的任务包分别为 backend Worker（限定 status/presenter/CLI/test 的写范围）和 project-manager Explorer（只读调用、同步与保留咨询）。咨询不作为独立 code-review；主控持有身份、维护状态和完成结论。

## 验证与反例

本轮新增 9 个实际 CLI/fixture 场景，覆盖当前与下一阶段、缺失/冲突/同阶段/未知或取消的关联、逐项阻塞、门禁待处理与冲突、暂停恢复、身份/输入失败及 JSON 兼容。修改前反例失败，修复后 9/9 通过。fixture 和真实输入字节保持只读。

八项最终定向检查均 exit 0，实际命令、时长和日志见 `focused-verification.json`。四类 CLI 最终字节及原 dirty 保留咨询另有结果。完整快速校验须以最终单次 report 的状态与 input_drift 为准，不能拼接此前中断或失败报告形成通过结论。

首轮快速校验主动中断以补齐查询失败提示；第二轮在原型检查发现缺少 `YSS_VUE_TOOLCHAIN`。复用仓库外已有作者工具并核验当前锁文件后，原型契约 7/7、Vue 工作区 15/15 通过，再按冻结的最终输入完整重跑。作者工具、历史中断和环境失败报告保留在仓库外。

## 保留与回退

开始前 root dirty 文件、Git diff、七个子模块 dirty 字节和四个 CLI 原快照已保存在 `/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-feedback-before-e6jwyibl`。本轮未 reset、clean、stash、提交或推送；旧修改按原字节或前缀保持。回退只比较该基线移除本轮新增差异；生成资产从其对应 canonical 重建，不能整仓 reset 或覆盖其他 dirty。

自动检查验证模板规则、只读行为与分发一致性，真实 Agent 在项目恢复和阶段交接中的提示效果需在实际使用时观察；不能据自动测试宣称完成用户研究或视觉批准。

## 最终完整校验

最终单次 `scripts/verify-template-fast --concurrency 1 --tooling-mode optimized`（配置锁定的 `YSS_VUE_TOOLCHAIN`）exit 0；报告 `status=passed`、`input_drift=false`，无未执行项，所有实际命令退出 0。完整原始记录见 `fast/report.json`，仅用本轮报告得出完成结论。
