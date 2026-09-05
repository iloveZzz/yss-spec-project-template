# mvc-data-analysis-v1

先读仓库 `docs/agents/backend-architecture-profiles.md` 的 MVC 约定。写入 `core` 的 command/query/result/service 包；core 是薄应用层，拥有事务与内部模型，不依赖 client/server。读取/计算/导出编排不能自动扩大 SQL 或 API 合同；数据行为采用 behavior-tdd。不要套用 DDD application-layer-guide。
