---
name: yss-backend-scaffold-adapter
description: Use when the YSS DDD scaffold workflow reaches Web, scheduler, or external-adapter implementation and needs the shared target-profile skills.
---

# Adapter Layer Reference

本文件只负责从脚手架路由到共享权威技能，不维护第二套 Adapter 规范。

## Web Adapter

**REQUIRED SUB-SKILL:** 使用 `yss-web-controller` 作为 Web Adapter 的唯一实现指南，并同时消费 `yss-dto`、`yss-exception`：

- HTTP Request / Response DTO 默认位于 Web module。
- Controller 只调用 Application Service，不直连 Domain Gateway 或 Infrastructure。
- 映射链固定为 Web DTO → Spring MapStruct WebConvertor → Application Command / Query / Result → Domain。
- HTTP/YSS wrapper/异常脱敏在 Web 边界完成；Domain 只表达领域错误语义。

## Scheduler / External Adapter

- Adapter 只做协议、调度器或外部系统适配，不承载领域规则。
- 输入先转换为 Application Command / Query，再调用 Application Service。
- 若实现 Application 或 Domain 声明的端口，端口签名不得泄漏 HTTP DTO、PO、Mapper、第三方 SDK 类型。
- 具体持久化端口实现继续使用 `yss-repository`；不得把 Repository 规则复制到本文件。

## 禁止事项

- 禁止 Web Controller 直接注入 Domain Gateway。
- 禁止 `client.dto`、VO、`PageQuery` 进入 Domain。
- 禁止静态 `Mappers.getMapper(...)` / `INSTANCE`；MapStruct 必须 `componentModel = "spring"` 并构造器注入。
- 禁止把旧式 Controller 示例当成 `target-domain-model` 的方案。旧架构对新脚手架一律 `unsupported`；旧项目继续在原工程维护，现代化改造必须单独立项。
