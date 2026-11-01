# 配置写入

只在当前授权范围内写入。已有目标与偏好足够时直接完成，无需重复草案批准。

1. 读取目标文件的当前内容，更新已有 `Agent skills` 或对应受管区块；不存在且配置请求需要时创建最小文件。保留其他正文、标签、账号与实例，不追加同名重复区块。
2. 将明确平台及所需字段写入 `.template-spec/agents/issue-tracker.md` frontmatter：local 使用 root；GitHub 使用 repository；GitLab 使用 host/project。表格或正文若重复这些值，同步保持一致，不保存凭据。
3. 平台方法种子：[GitHub](../issue-tracker-github.md)、[GitLab](../issue-tracker-gitlab.md)、[Local Markdown](../issue-tracker-local.md)。种子是内容参考，已有配置只改必要段落。
4. triage 需要且没有映射时使用 [标签表](../triage-labels.md)；否则保留已确认表。业务导航只引用现有根 CONTEXT 和 ADR，不为凑齐布局建空业务文档。
5. 写入前再次核对目标内容；若有人并发修改，先读取并整合再写。完成后回读实际结果并说明变更。

AGENTS 中可保留简短导航：tracker → `.template-spec/agents/issue-tracker.md`；标签 → `.template-spec/agents/triage-labels.md`；业务词汇 → 根 `CONTEXT.md`。不复制整套操作方法，不以配置完成推断远程写入已授权。
