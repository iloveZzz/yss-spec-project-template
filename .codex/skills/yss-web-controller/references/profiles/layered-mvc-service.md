# layered-mvc-service

先读仓库 `docs/agents/backend-architecture-profiles.md`。server 的 Controller 只调用 service；私有 DTO 在 server，已批准 published-client 的公开 DTO 在 client。server 持有 MapStruct WebConvertor、HTTP 校验与错误脱敏。不得从表结构反推 OpenAPI，不得直连 Repository。执行脚本前确认其接受当前 Profile；不接受时返回 blocked，禁止伪造 DDD Manifest 绕过。
