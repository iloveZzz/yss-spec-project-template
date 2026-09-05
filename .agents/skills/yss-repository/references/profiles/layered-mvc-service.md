# layered-mvc-service

先读仓库 `docs/agents/backend-architecture-profiles.md`。依据批准的数据合同写入 repository 的 po/repository/convertor 及 Mapper XML；无需领域模型或 Gateway。使用 `yss-mybatis` 的 MyBatis-Plus 体系；保留 cause，避免向上暴露原始 SQL/凭据。事务由 service 用例拥有。测试覆盖查询、分页、回滚与字段转换；H2 不证明生产方言。生产驱动/数据源接入须另有批准的存储工作单元。
