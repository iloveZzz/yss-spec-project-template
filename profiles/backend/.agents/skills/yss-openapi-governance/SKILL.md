---
name: yss-openapi-governance
description: "维护 YSS OpenAPI 3.1 YAML、接口兼容性与对应 JSON 导出。"
---

# OpenAPI 维护

按用户需求创建或修改 OpenAPI 3.1 YAML，保持路径、参数、请求体、响应、错误码和实际实现一致。YAML 是可编辑来源；需要 JSON 时由 Agent 或现有工具转换，不维护两份独立合同。

复用项目既有命名、认证方式和 DTO 约定；YSS wrapper 参考 yss-dto 的 wire 说明。识别破坏性变化并说明受影响调用方，保留真实输入校验和权限语义。

用户要求审查时对照需求、实际调用方和实现检查接口行为与兼容性。lint、解析、契约测试按具体需要选择，不要求锁定工具链、验证记录、Freeze、批准包或阶段资格。

交付 API 文件、实现关联及已知兼容性问题；未执行的工具检查不声明通过。
