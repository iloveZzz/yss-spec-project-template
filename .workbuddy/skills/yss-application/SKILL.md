---
name: yss-application
description: 实现或排查 YSS 用例编排、事务边界、跨聚合协作、幂等和用例层模型转换。
---

# YSS 用例实现

依据当前需求、实际工程结构与接口实现用例编排。沿用工程的 DDD 或 MVC 架构；不要求架构登记、批准合同、测试 seam 或生成 Manifest。

DDD 的 Application 协调 Domain 与 Gateway，管理事务和跨聚合协作，领域规则留在 Domain。MVC 的 Service 承担用例规则与事务，不另造 DDD 层。按架构需要读取 references/profiles 中的对应资料；DDD 细节见 [分层说明](references/application-layer-guide.md)。

- 明确用例输入、输出、失败处理、事务范围和幂等行为。
- Web DTO 与内部 Command/Result 的转换归 Web，持久化转换归 Repository/Infrastructure；确有独立用例模型转换时使用 mapstruct。
- 事务提交后的消息、缓存和审计副作用按实际一致性要求安排；不为未发生的需求创建空端口、空事务或补偿框架。
- 内部模型不复用 HTTP DTO 或持久化 PO；Spring Bean 优先构造器注入。

按需要配合 yss-domain、yss-repository、yss-web-controller 和 yss-dto。完成用户要求的行为与调用方改动，说明实际结果；测试与构建按任务需要选择。
