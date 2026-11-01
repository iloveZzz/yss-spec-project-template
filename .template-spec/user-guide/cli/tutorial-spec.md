# Spec 项目

本文描述正在整理的新 CLI 接口，尚未作为正式发行发布。先运行已安装程序的 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；旧发行版不因模板更新而获得新接口。

用 `init --profile spec --installation project` 创建项目，用 `attach` 接入已有工程；具体必填参数查看命令帮助。需要预览时加 `--dry-run`。

向 Agent 提供目标、现有需求、业务词汇和允许修改的工程。Agent 先读相关材料，复用有效成果，缺少关键业务决定时询问；无需登记阶段、编制批准包或通过 CLI 资格门禁才开始。

完整产品需求须交付完整规格、原型设计、原型及交互说明。核心操作和状态变化应可操作，纯展示可用静态设计，无 UI 用业务逻辑或状态原型。按风险选择形式与精度，说明查看方法、模拟范围、实际检查与未覆盖项；普通查询和局部修订只处理当前范围。技术架构、API、数据库和实现留给研发。

`project` 和 `skills` 默认都安装 16 个入口：setup-yss-harness、yss-product-lifecycle、yss-research、yss-stage-decision、grilling、domain-modeling、wayfinder、to-spec、yss-design-system、prototype、prototype-review、to-tickets、triage、llm-wiki、i-have-adhd、handoff。研究归 yss-research，产品设计与 UI 原型归 yss-design-system；implement 和 code-review 保留为按需安装能力。

预装不自动执行显式入口或对外写入。没有 tracker 仍可完成授权草稿；只有截图或未运行原型时，如实说明交互尚未验证，不能宣称完整交付已完成。
