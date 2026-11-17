---
tracker:
  platform: github
  repository: ""
  root: .work
---

# Ticket tracker 配置

上方 frontmatter 是本工程的持久配置。GitHub 与空 repository 是尚未配置目标的模板占位，不覆盖真实工程选择。完整新工程无已确认 tracker 且已核实唯一 GitHub/GitLab 代码项目时，初始化流程默认使用该项目的 Issues 并报告；其他情况沿明确选择或澄清必要目标，不能使用模板仓或登录默认仓。已有项目沿用确认的平台、实例、仓库与 root；升级保留历史字段和用户内容。

- GitHub 使用 `repository: owner/repo`，企业实例另含明确 host；GitLab 使用明确 HTTPS host 和完整 project。
- Local Markdown 使用 `platform: local-markdown` 与 root；`.work` 只是新项目示例，不是远程失败时的自动回退。
- 本次明确的 URL 或项目用于本次动作，与配置不同只说明差异，不自动改配置。跨仓工作分别读取目标工程配置；没有配置但 URL 足够明确仍可读取。

接票、拆票、执行与续办按需读取 [共享 Issue 操作方法](issue-tracker-operations.md)。普通无票任务不要求先 setup。配置、安装或阅读资料均不扩大动作授权。
