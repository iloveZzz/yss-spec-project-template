# 用户手册更新合同

提问者经 grilling 澄清 Q1–Q11 全部采用推荐，并回复“确认 开始实施”。范围包括主仓、战略/研发/后端/前端四模板及三个 CLI；允许重组、删除重复过时说明并保留常用兼容入口。优先首次使用与升级用户，维护者单列。以 GitHub 当前实现为准，区分 npm 发布状态；增加内部设备借用教学案例和提示词、输入输出、人工确认、验收及异常恢复。更新三个 CLI 快照并验证分发。完成审查和验证后已获授权提交推送 GitHub，npm 发布不在范围。

模板身份为 template-source。L3：cross-repo-contract、generation-semantics、release-semantics（跨仓文档分发快照与版本变化）。未修改业务行为、Skill 或生命周期权威规则；产品 Spec/OpenAPI/运行时代码/业务词汇登记 not-applicable，因为业务内容只是独立教学说明。文档不生成假批准、产品实例或 Ticket。文档与确定性快照不采用业务 TDD，以路径/命令/分发验证、自检和独立文档审查覆盖。主控负责 Git、集成和最终结论。

模板先完成检查与提交推送，再绑定真实可获取 SHA 更新 CLI；最后更新主仓 gitlink 和证据。原 dev checkout 的用户 snapshot 修改保持原字节，CLI 工作沿用已登记独立 worktree。工作区与回滚基线见 workspaces.json；回滚使用对应提交的 revert，不 reset 用户工作区。
