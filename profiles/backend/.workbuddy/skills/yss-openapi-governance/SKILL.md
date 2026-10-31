---
name: yss-openapi-governance
description: "审查或维护 YSS OpenAPI 3.1 YAML、接口兼容性，并按需导出 JSON。"
---

# OpenAPI 审查与维护

按用户当前请求选择只读审查、编辑 YAML 或导出 JSON。仅请求审查时，不修改 API 文件、不自动转换或发布；按 [接口语义与导出方法](references/governance-workflow.md) 对照需求、实际调用方和实现定位问题。

创建或修改时保持路径、参数、请求体、响应、错误码和实际实现一致。OpenAPI 3.1 YAML 是可编辑来源；需要 JSON 时由现有工具转换，不独立维护两份合同。

复用项目命名、认证与 DTO 约定，YSS wrapper 和分页参考 yss-dto 的 wire 说明。识别破坏性变化及受影响调用方，保留真实输入校验、权限、并发和幂等语义。

lint、解析与契约测试按任务需要选择，不要求锁定工具链、验证记录、Freeze、批准包或阶段资格。交付本次实际文件或有依据的审查问题；未执行的检查不声明通过，缺资料时说明无法判断的部分。
