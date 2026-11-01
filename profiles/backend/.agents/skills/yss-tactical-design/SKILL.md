---
name: yss-tactical-design
description: 在实际 DDD 工程需要设计聚合、实体、行为、不变量、事件或 Gateway 时使用；MVC 任务不适用。
---

# DDD 战术设计

根据当前业务规则和已选 DDD 架构设计聚合、实体、值对象、领域行为、不变量、状态转换、领域事件和 Gateway。MVC 工程使用 yss-technical-design 的分层方法。

聚合边界依据一致性和事务需要；跨聚合协作明确调用方、失败处理、幂等和补偿。区分领域模型、持久化对象与 API 模型，保留已有工程命名和依赖方向。

用适合当前项目的文档表达设计及取舍；任务同时授权实现时才改代码。系统边界和整体技术方案归 yss-technical-design，不重复另建一套方案。交接给 yss-domain、yss-repository 和 yss-application 时说明关键行为和接口，不要求合同编译、校验器、阶段批准或测试证据。
