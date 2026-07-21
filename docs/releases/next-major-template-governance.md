# 下一主版本：模板治理与 Spec / Ticket 规范化

> 状态：草案，尚不可发布。

## 破坏性变更

- 新流程只使用 Spec、Ticket、`to-spec`、`to-tickets`。
- 根目录新增 `yss-project.yaml`，Agent 必须按 `repository_mode` 路由。
- `.agents/skills` 成为共享技能权威内容，其他 Agent root 使用生成投影。
- Spec 初稿使用 `ready-for-human`；`ready-for-agent` 只用于已解除阻塞、可直接实现的垂直切片 Ticket。
- Spec Delta 只用于修改既有冻结基线的中高风险行为，不用于全新产品或全新模块。
- 所有面向人的落地文档正文以简体中文为标准语言。

旧版项目必须按 `docs/user-guide/规格与任务迁移指南.md` 一次性迁移，不提供旧 skill 别名。

## 模板仓库验证

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
```

当前模板侧 fresh verification 已通过，包括五类生命周期压力场景、完整目录树哈希、旧入口扫描、Markdown 链接、YAML 解析和 Git 空白检查。

## 发布阻塞项

- 需要其他 Agent 或人工 Reviewer 完成独立审查。
- 外部 `create-yss-spec` 需要按 `docs/implementation/create-yss-spec-repository-mode-contract.md` 实现 `project-instance` 转换、旧版升级和冲突 fail closed。
- 模板与 CLI 需要共同执行初始化 / 升级集成验证，并绑定确定的 commit / tag。

上述阻塞全部解除前，本草案不能改为已发布状态。
