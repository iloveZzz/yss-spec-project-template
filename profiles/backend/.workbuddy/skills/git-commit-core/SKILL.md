---
name: git-commit-core
description: Internal shared commit safety and message contract consumed by java-backend-commit.
disable-model-invocation: true
---

# 提交操作

仅在用户要求提交时执行。先读取当前差异与暂存状态，只选择本次授权的路径，保留无关文件和用户暂存内容。

提交消息沿用仓库已有风格，说明具体变化和原因，不编造工单、签署或执行结果。发现凭据等不可提交内容先从候选中排除并说明。

不要求测试、commitlint、验证报告或额外批准。正常调用 Git 或宿主工具；已有外部 hook 或服务端规则若拒绝，报告实际原因，不声称提交成功。

提交后报告真实 commit 与剩余工作。推送、amend、rebase、强推分别遵循对应用户授权，不因生成提交消息而执行它们。
