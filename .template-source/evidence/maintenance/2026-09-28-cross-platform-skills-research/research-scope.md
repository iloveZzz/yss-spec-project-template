# 跨平台 Skills 规范研究范围

本轮采用 yss-research 的 technical-evidence / evidence-audited。读者为研发规格模板维护者；问题是当前 Skill 是否需要调整，哪些调整由格式、运行时或行为证据支持。时间截点为 2026-09-28。

纳入 Agent Skills 开放格式、OpenAI Codex 与相关 API 边界、Anthropic Claude Code 与 API 边界、Google Gemini CLI / Antigravity 的官方文档与一手源码。先核验本仓和已登记历史研究，再检索外部来源。聚合网页、社区经验、AI 摘要仅用作线索；不以搜索摘要独立支撑结论。

本仓身份 template-source，基线 e1503a536b92b3e0a74182632f0690cc5601de62，开始时 git status --short 为空。覆盖主仓 77 个 canonical Skill 的静态普查、三个 Agent 子仓的入口普查、投影/锁/注册表/同步及现有评测证据。四个 CLI 仅核查声明与登记范围，本轮不重新打包认证。

只允许写本目录内研究简报、证据台账、清点脚本/输出、当前校验与研究收尾记录。不修改 Skill、注册表、锁、投影、CONTEXT、审批、Ticket 或 Git；不运行模型行为基准，不宣布跨平台运行验证或发布就绪。

模板维护研究采用 work-unit.maintenance-research，L1 textual-only，仅新增研究资产，无 Agent 行为变更。业务 Context 对账 not-applicable：已消费根 CONTEXT.md，不引入业务术语或产品流转。

子 Agent 仅担任 Explorer：Claude 和 Google 官方来源采集，空写集；任务包由 prepare-read-only-intake 生成并在仓库外通过 run-read-only-intake 记录。此派发器未包裹浏览全过程，不能据开始观测声称完整执行隔离；主控复核重要来源并独自写正式资产。

访问限制：在线文档可更新；未安装或运行 Claude / Google 客户端、未调用上传 API；公开源码正式版本与 main 必须区分。子 Agent 汇报属于定位线索，主控重开重要来源。
