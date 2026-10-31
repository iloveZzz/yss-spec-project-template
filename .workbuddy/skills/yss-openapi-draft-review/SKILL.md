---
name: yss-openapi-draft-review
description: "审查 YSS OpenAPI Draft 的需求覆盖、页面动作、响应、错误与测试 seam；不执行 Freeze。"
disable-model-invocation: true
---

# OpenAPI 审查

阅读当前 OpenAPI 文档、用户需求和相关实现。重点查看路径与方法、参数来源、必填/null、分页、状态码、错误结构、认证与权限，以及变更对已有调用方的影响。

使用 yss-dto 中适用的 wire 规则；以实际实现和序列化行为为准。引用具体 operation 或 schema 报告有证据的问题，缺资料时明确无法判断的部分。

不要求预先运行 lint、生成验证记录、冻结合同或取得审查资格。用户需要时可用已有工具辅助检查，结果只描述实际观察。
