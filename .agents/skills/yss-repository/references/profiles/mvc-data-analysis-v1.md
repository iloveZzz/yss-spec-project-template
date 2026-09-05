# mvc-data-analysis-v1

遵守 `layered-mvc-service.md`，但事务所有者为 `core`。repository 不依赖 core/client/server，不生成 DDD Gateway。数据分析的动态排序、分组、过滤均须白名单及参数绑定；只消费批准的数据和查询合同。
