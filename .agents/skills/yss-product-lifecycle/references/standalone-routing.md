# 普通任务路由

## 分支判定

先读当前工程 `AGENTS.md`，检查 `yss-project.yaml` 与 `.yss.json` 是否存在。未启用治理且没有身份文件的普通工程可以直接工作；合法 metadata5 明确 `distribution.installation=skills` 时也走本页下方的普通路由表。普通分支只读本页及本次需要的技能/材料。

存在 `yss-project.yaml` 时严格解析：当前只支持 schema_version:1，repository_mode 仅 `project-instance` 或 `template-source`。非法、不可读、不支持版本或相互冲突的身份停止受影响写入，不能因缺治理目录改走普通分支。metadata 非法/旧身份、出现治理资产但身份不明，也先报告缺口，不猜安装方式。

`project-instance`、`installation=governed`、已有正式任务或用户明确要求正式工作/批准时，执行 [life 治理分支](../SKILL.md#治理分支)；缺正式输入须受阻，不能降级生成替代草稿。`template-source` 仅做模板维护。检查多个工程时逐工程判定，不能套用当前目录的普通资格。


适用于未启用治理的工程、合法 `installation=skills` 项目以及普通讨论。先复用当前请求、已确认规则、可读材料和真实授权；只读请求不保存文件。普通任务不需要生命周期 CLI、注册表、Tracker、checkpoint 或阶段状态。

| 当前需要 | 动作 |
|---|---|
| 业务决定未定 | 用 `grilling` 澄清影响范围和验收的必要决定；事实先调查，不把建议当确认 |
| 决定已有，整理需求或验收 | 直接读取 [普通规格起草](standalone-spec.md) 并起草；不要读取或调用 `to-spec`、`implement` |
| 技术、市场或第三方事实不明 | 使用 `yss-research`，保留来源、时效和限制；缺专项技能时报告缺项 |
| 词义、边界或规则责任不清 | 使用 `domain-modeling`；候选词留在当前讨论或草稿 |
| 需要中文文档或报告 | 使用 `i-have-adhd` 的技能内共用规范 |
| 需要代码审查 | 使用 `code-review`，按实际范围和适用项目要求验证 |
| 用户明确调用兼容入口 | 仅在明确指定时读取对应 `to-spec` 或 `implement`，按该入口自身约束执行 |

先完成可独立推进的已授权工作。只问真实缺失的决定，不重问已确认内容。无文件路径时可以直接答复；用户要求保存时使用其路径，未给路径而需要持久化时再确定位置。不要为普通稿创建 Spec 版本、正式 Ticket、批准或生命周期状态。

缺专业资源先报告；项目已有 CLI 时可只读 `skills resolve`，按 `result.status` 处理。`missing` 集合经授权后显式 `skills ensure` 保存/应用计划，再重新查询；`blocked` 不自动同步、迁移、覆盖或补目录。查询退出0本身不代表 ready，也不授予技能调用、批准或实现权限。

转入正式治理是独立的显式接入动作。用户要求正式资产、正式批准、已有正式任务或工程已启用治理时，返回 life 的治理分支，核验当前合同和授权；不能用普通草稿替代缺失的正式输入。
