# 原型技能优化实施范围

本轮按用户批准的 Design 原型技能优化计划执行，目标为 implementation-ready，维护强度 L3。单一推进负责人及维护者自检；不启动独立候选冻结、真实用户测试、Agent 对照试点、提交、推送、发布或存量迁移。

仓库身份为 template-source。命中 generation-semantics、core-validator、cross-repo-contract：增强原型作者能力、修正验证入口及同步 Design/Frontend 分发。未改变生命周期状态、批准权限或发布语义。产品 Spec、Ticket、OpenAPI 和 context_reconciliation 为 not-applicable，原因是本轮只维护模板与教学 fixture。行为 TDD 的产品 seam 不适用；使用合同反例、纯日期规则测试和实际浏览器任务验证维护能力。

范围：

- canonical `yss-prototype-stage`、`yss-design-system`、`prototype-review` 的入口与按需材料。
- 固定 shadcn-vue revision 的 Combobox、RangeCalendar、Popover；直接依赖固定 @internationalized/date 3.12.4；保持其余依赖版本。
- 搜索选择、日期范围、两个维护变体、工作区和组件目录；实际浏览器发现的焦点、短视口遮挡与日历布局缺陷。
- 统一验证脚本、兼容入口、注册验证命令、Prototype Evidence 模板注释；Evidence v4、Visual Baseline v1、作者/场景 schema 1、比较 v2 均不变。
- 来源清单、Skill 投影/锁、Design/Frontend profile 及主/Design/Frontend CLI 工作树快照；保留 profile 的编排差异。
- 将既有测试专用用户决定 fixture 抽为便携共享依赖，供精简分发中的合同检查使用；共享交接工具同步器、四仓工具锁及 Backend 接收端的依赖闭包随之更新。Backend 仅同步该依赖及受影响 CLI 快照，不增加原型作者技能或修改路由。

开工基线与原始日志置于仓库外：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/`。`baseline.json` 记录主仓与 7 个子仓、24,626 个文件的摘要和模式；`source-before/` 保存本轮核心来源副本。Design 源仓用三方合并保留薄适配；Frontend 使用仓库同步库，在目标内容与开工基线一致后更新，并由预览时摘要再次防止并发覆盖。不清理无关脏文件。

验证输出目录每轮新建，失败证据保留。Fast 的实际影响计划升级到 release 时执行完整计划，不裁剪已知失败。若 committed 来源锁仍阻断，保留真实未闭合结论，不修改维护 checkpoint 状态机或伪造固定来源。

方法、无障碍观察与真实效果分开报告。首次截图为本轮维护者观察输入，不与自身比较宣称视觉回归通过。用户研究与 Agent 试点仅交付后续三类任务材料。
