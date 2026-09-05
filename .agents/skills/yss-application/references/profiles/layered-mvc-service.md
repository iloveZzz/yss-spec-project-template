# layered-mvc-service

先读仓库 `docs/agents/backend-architecture-profiles.md` 的 MVC 约定。写入 `service` 的 command/query/result/service 包；事务与业务行为通过公开用例 seam 做 behavior-tdd。调用 Repository/Adapter；不得生成 Domain Gateway 或引用 client DTO、Spring MVC、生产驱动。需要 HTTP 协议变更时返回 new_impacts，由 Web 工作单元处理。
