# 企业工作区 Tag 导航优化

已实现页面 Tag、收起导航及页内视图样式修改；本轮范围内工程快验通过，浏览器实测与整体交付条件未闭合，不声明 implementation-ready 或视觉批准。

当前未批准的 [工作区预览](../2026-09-30-enterprise-workspace/review/workspace/index.html) 已更新，可刷新原页面查看。原 review/patterns 完整归档至 evidence/preview-before.tar.gz；历史密封 comparison 保持不变，其表现不代表本轮版本。历史报告仍绑定此前源码，本轮证据以本目录为准。

- 页面导航由 Tabs 改为 Badge 容器与独立 Button 组成的可关闭 Tag，使用 nav / aria-current。当前页浅主色底与描边；草稿、默认固定页、关闭确认和缓存延续。
- 左右键、Home/End 移动焦点，Enter/空格激活；Delete 请求关闭。Tag 超宽时只滚动自身容器。
- 收起图标居中、当前页标记、提示受控清理；Tooltip 恢复反相表面并移除箭头额外方块变换。
- 概览/明细保留页内 Tabs 语义，改为无填充分段底的主色文字和指示线。
- 根 DESIGN、三个 Skill 的按需参考、两个 profile、锁文件与三份 CLI 快照同步。上游 24 组件及依赖版本不变。

工作区模型及锁定构建检查 7/7 通过，包含新增的键盘焦点测试。10 个重建包与当前作者源、Token、主题摘要核对通过。本轮显式范围的 `verify-template-fast` 最终 40/40 检查通过（其中工具链 184/184、原型合同附属 7/7），实际退出码 0；前后输入摘要相同、`input_drift=false`。范围包括本轮 Skill、规范、profile、CLI 和预览变更，不代表整个并行工作树的 release 验证。

[人工复验表](manual-qa.md) T01–T07 未执行；浏览器工具限制与真实视觉、键盘焦点、缩放、离线检查均如实保留。此前 committed 来源锁属于尚未闭合的整体交付条件，本轮不会提交或伪造来源状态。

维护者自检：切换不销毁缓存、按钮不嵌套、取消关闭不修改草稿、深链接与场景约定未放宽；实测浏览器效果待验证。产品 Spec/Ticket/OpenAPI 和 context_reconciliation 为 not-applicable：本轮为 template-source 视觉及生成示例维护。

## 验证记录与剩余项

|项目|结果|证据|
|---|---|---|
|工作区模型、键盘目标与实际锁定构建|通过 7/7|evidence/regression.log；不代替浏览器行为断言|
|10 个包的作者源、Token 和主题摘要|通过|evidence/delivery-audit.json|
|3 份 CLI 的 36 项来源文件核对|通过|evidence/delivery-audit.json|
|主仓投影、profile 与锁文件、规范漂移、兼容入口|通过|最终 fast 的对应命令；两个 profile CLI 的 WORKTREE --check 退出 0|
|最终本轮范围 fast|通过 40/40|evidence/verification-final.tar.gz、verification-final-summary.json；scope=limited|
|首轮 fast|输入漂移导致失败|40 个命令结果通过；保留 verification-first.tar.gz，不改写为成功|
|本轮范围 diff --check|通过|evidence/scoped-diff-check.log|
|既有 committed 来源锁|失败，仍为 working-tree|evidence/existing-lock.log；本轮不擅自提交或改写来源|
|浏览器视觉/键盘/焦点/离线|未执行|manual-qa.md T01–T07，不能以构建和模型单测代替|
|用户视觉收益确认|待确认|修改前截图已保存，修改后同条件截图待补|

首轮验证期间，范围外 `2026-09-29-document-readability-design/plan.md` 的修改时间发生变化；定位依据和限制见 input-drift-investigation.json。该文件未被本轮回滚或编辑。重新生成计划后取得稳定输入的通过结果。

两次运行均保留实际进程终态。最后复核交付源码与快验前摘要一致；验证后仅补充本轮报告、归档和 checkpoint。这些记录不替代此前企业工作区任务尚未完成的浏览器与整体交付验收。

L3 checkpoint 保持待闭合，见 `checkpoint-pending.yaml`。实际校验未通过：`needs-human 必须保留 release-ready 目标`。当前用户授权目标是 implementation-ready，且浏览器复验尚缺，因此没有为了通过格式检查而扩大目标或标记就绪。校验器退出码 1 和原始输出保存在 evidence/checkpoint-validation.log；工程 fast 通过与 checkpoint 未通过分别记录。
