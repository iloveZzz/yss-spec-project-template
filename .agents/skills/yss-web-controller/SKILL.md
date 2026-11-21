---
name: yss-web-controller
description: 按接口需求与用例实现或重构 YSS 控制器、请求 DTO、响应 VO 及其模型转换。
---

# YSS Web 适配

按当前 API 需求、既有接口约定和用例接口，由 Agent 直接实现 Controller、请求 DTO、响应 VO 与 Web Convertor。先读代码并增量修改，不要求生成脚本、metadata、冻结记录或正式合同。

DDD 的 Web 调用 Application，MVC 的 Server 调用 Service；不把业务编排和数据库访问放进 Controller。DDD 细节参考 [Web 分层](references/web-adapter-layer-guide.md)，MVC 按 references/profiles 中的实际结构处理。

- 按项目根 `.template-spec/agents/backend-architecture-profiles.md` 的 HTTP 边界检查嵌套字段、集合和泛型；Request → 用例 Command/Query、用例 Result → Response，不能穿透 Domain Entity 或 PO。字段缺失、null、空值、分页和响应包装参考 yss-dto 及当前接口约定。
- 请求只暴露 API 允许字段，不将内部 PageQuery 协作字段开放为客户端输入。
- 使用项目匹配的 javax/jakarta 校验注解，保留认证、授权、输入校验和错误脱敏。
- 转换使用现有 MapStruct 约定与构造器注入，避免反射式通用复制；Lombok 按对象身份选择范围。
- 认证回调、Cookie、下载和流式响应按协议需求实现，不强制套 CRUD 结构。

需要 CRUD 时参考 [直接实现说明](references/crud-generation.md)。测试与构建按实际任务选择，交付说明接口变化和已知兼容性影响。
