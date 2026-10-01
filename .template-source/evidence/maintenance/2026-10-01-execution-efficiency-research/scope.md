# Node/Python 执行效率研究范围

本轮按用户明确调用的 yss-research 做 technical-evidence / evidence-audited 深度研究，服务 SDD 模板维护者。开场已声明先核验本仓、再查 Google/GitHub/官方资料，并区分本地实测、外部基准及估算。

根 yss-project.yaml 当前为 template-source；用户描述的目标是构建 project-instance 的 SDD 模板流程。本研究不修改身份。CONTEXT.md 已读取；不新增业务术语，context_reconciliation 为 not-applicable，原因是仅研究模板执行机制。

研究问题：慢在启动、解析、验证、依赖安装、任务调度还是 Agent/人工等待？哪些优化已有？Ajv/Bun/Node compile cache/uv/Nx/moon 等工具各解决什么？哪些收益可测，哪些只能估算？如何保证失效、拒绝、漂移和 Fresh Verification 语义？

纳入当前源码、当前只读/隔离微基准、明确标注的历史报告、官方文档与 GitHub 第一方源码。Google 和 GitHub 搜索用于发现来源。排除未经核验的搜索摘要、第三方宣传、HTTP 吞吐外推、stars 排名外推及不相关产品实现。

影响面仅本目录的研究简报、台账、基准证据和闭包记录；L1 textual-only。基准脚本只是归档的研究复现附件，不加入产品运行/验证路由。Owner 为 root-research-owner，允许写路径仅本目录；临时实验和依赖位于 /tmp/yss-execution-research-20261001。无生产依赖变更、无 Skill/投影/锁/快照修改、无 Git 提交推送发布。框架采纳、持久缓存和验证器替换由后续有授权的模板维护工作单元决定。

本轮按技能要求派发一个 Explorer，只读查询框架官方资料，任务包和 intake 观测位于仓库外，verification_status=not-executed；其浏览资料结论由主控复核主要来源。本轮未将该观测声称为包围全部浏览行为的执行审计或性能测量。

访问限制：单台 macOS ARM；未跑完整发布基准/多机 CI/真实 Agent 对照，未采集人类等待或 token。Google 实际页面查询可用；部分官方 URL 经 web 工具打开失败，另按搜索正文/相关官方页面核验并在台账记缺口。
