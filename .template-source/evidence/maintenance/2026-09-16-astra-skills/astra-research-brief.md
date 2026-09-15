# GPT-6 Astra Skill 优化研究与设计

## Research Scope

2026-09-16，`technical-evidence` / `evidence-audited`。对象是本体与七个 submodule 的 Skill 入口、发现描述、适配和 CLI 分发。纳入官方指南、当前源码与治理合同；排除转载作为结论依据，不改模型配置、用户级 Skills、依赖版本或发布状态。

## Executive Read

采用窄触发描述、短入口与按需参考，保留 YSS 业务门禁。授权内的维护应完成同步与验证。这个调整针对提示结构与本仓可复现的冲突，不声称已经证明 Astra 的任务成功率或延迟改善。

## Findings

- `claim-001`：官方建议精简 Skill 描述、按需读取参考，并复核旧提示是否过度限制新模型；同时提醒共享 Skill 还会被其他模型消费。[Astra Skills 指南](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)。本仓选择保留模型无关的业务约束，不强制模型名、推理档位或固定执行步数。
- `claim-002`：Codex 支持渐进加载和 `agents/openai.yaml` 中的显式调用策略。[Skills 文档](https://developers.openai.com/codex/skills)。本轮扫描的 57 个显式入口均已有该策略，保持原样；canonical、生成投影、兼容入口继续按本仓登记管理。
- `claim-003`：本地基线含 266 个入口（本体 90、后端 75、战略 24、前端 77；包含已登记嵌套入口）。MapStruct 的 YSS 合同禁止全局忽略遗漏字段，但示例和 Best Practices 推荐 `ReportingPolicy.IGNORE`；Lombok/MapStruct 入口要求一个未声明可用的固定 MCP，并占 352/335 行。证据见 `before.json` 与 Git 基线对应文件。此次移出条件示例，并保留合同约束在入口。
- `claim-004`：MapStruct 可使用 `ReportingPolicy.ERROR` 暴露目标字段遗漏；Lombok 支持控制 toString 字段。[MapStruct](https://mapstruct.org/documentation/stable/reference/html/#configuration-options)、[Lombok](https://projectlombok.org/features/ToString)。使用 ERROR、按合同逐字段忽略以及排除敏感数据是本仓的应用选择，并非 Astra 专有规范。

## Counter-Signals

官方文章没有要求删除所有固定流程或审批。共享 Skill 还要支持其他模型；正确性约束、确定性脚本及既有验证仍有用途。`AGENTS.md` 和维护强度策略是本仓约束，不可因精简而撤销。字数缩短只说明载入内容变化，不证明 Agent 决策更好。

## Source Map

搜索先检查本仓维护规则与 OpenAI Docs 指南，再搜索并打开上述官方页面。Markdown 页面经 web 工具读取遇到 Content-Type 限制，使用 curl 读取官方原 URL 恢复；未使用转载内容作为证据。当前工作区身份与 Git 状态均已实查。检索与证据条目见相邻 `astra-evidence.yaml`。

## Decision Handoff

下游所有者为 `maintaining-skills`。用户本轮已要求优化本体和所有 submodule；本轮按 L3 `aggregate-behavior-change` / `cross-repo-contract` 完成维护者自检和 fresh verification，目标是 `implementation-ready`。

实施范围：

1. 另检查 69 个平台专属入口，并精简其中 55 个描述，保留平台工作流正文，见 `platform-audit.json`。
2. 精简 38 个本体描述，并同步共享 Profile；Profile 声明 excluded 的现存同名技能仅在所属仓调整发现描述，保留其正文差异。
3. Lombok、MapStruct 使用短入口加条件示例；修正与字段完整性、敏感信息约束冲突的示例。
4. `maintaining-skills` 增补条件作者指引；四个 Harness 的 `AGENTS.md` 明确授权内应持续完成维护；修正本体维护说明中 L2 自动独立审查的过时说法。
5. 使用受管同步生成运行时投影和锁，重放 Profile 补丁；四个 CLI 从本地工作树重建快照，并执行测试。快照明确为 `working-tree`，固定提交重建属于后续 Git 交付。

人工审阅的触发场景（不是模型自动评测）：

| 请求 | 预期选择与边界 |
|---|---|
| 修复 YTable 分页后页码错误 | ytable-usage；需要列表闭环时才补 page-list-module |
| 下载 CSV 时返回 JSON 错误 | file-export-download；不因 CSV 字样调用后端 Excel 技能 |
| 解释 CSV 的分隔符 | 不触发 YSS 文件下载实现 |
| 新建数据库查询 | 不因数据库关键词调用 MapStruct 或 worktree |
| DTO 新字段没有进入响应 | mapstruct 与当前合同；不全局 IGNORE |
| 修复 Lombok 生成日志泄露密码 | lombok，检查 toString；不升级依赖 |
| 生成前端提交信息 | frontend-commit，只输出候选，不执行提交 |
| 为新功能创建隔离 checkout | using-git-worktrees；普通文字修订不自动创建 |
| 显式 grill-me | 保留兼容入口，读取 grilling |
| 调整产品原型颜色 | yss-prototype-stage / 设计系统，不调用生产 yss-ui |

## Evidence Limitations

未进行独立模型 A/B 运行或性能测量，不能给出 token、耗时、正确率收益。没有修改用户级运行时配置，也未删除兼容投影或强制安装插件。新能力、API 端点、计费和模型路由不属于本轮优化。研究提供依据，不代替生命周期批准；未授权提交、推送或发布。
