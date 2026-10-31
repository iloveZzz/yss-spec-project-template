---
name: yss-domain
description: 在已确认的 DDD 边界内实现或重构领域行为、不变量、状态机与 Gateway；不起草领域设计。
---

# YSS 领域实现

在当前 DDD 业务边界内实现领域行为、不变量、状态机与 Gateway。先阅读现有领域代码和规则；需要重新设计聚合边界时使用 yss-technical-design 或 yss-tactical-design。MVC 工程不套用本技能。

- 领域模型与数据库 PO、HTTP DTO 分离，不从表结构直接推导聚合。
- Domain 不依赖 Repository、Mapper 或 Controller；Gateway 只暴露领域能力。
- 行为通过有业务含义的方法表达，不变量在改变状态时维护；明确实体身份、值对象与一致性边界。
- Domain 拥有 Gateway 接口，Infrastructure 实现它；相关签名变化应同步真实调用方。
- 领域错误使用稳定标识与参数，由 Web 翻译为公开消息和 HTTP 状态。
- 没有业务行为时不伪造富模型；规则未知时调查或询问，不把猜测实现成事实。

详细结构参考 [领域分层](references/domain-layer-guide.md)，既有工程参考 [增量维护](references/existing-project.md)。不要求合同编译、阶段批准或强制测试流程。
