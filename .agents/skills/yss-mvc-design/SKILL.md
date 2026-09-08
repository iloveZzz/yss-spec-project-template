---
name: yss-mvc-design
description: 为已确认 layered-mvc 的 YSS 项目设计分层职责、用例、业务规则、事务和持久化映射，不生成代码。
---

# YSS MVC 技术设计

由 `yss-technical-design` 在 `layered-mvc` 分支调用，输入和批准边界由通用技术设计合同持有。既有工程按已登记 Profile 设计，不重选架构。

必须说明模块职责与依赖方向、用例流程、业务规则、状态转换、事务边界、失败回滚、幂等与并发、持久化映射、外部集成与公开测试 seam。无状态流转或外部集成时记录有原因的不适用，不硬造对象。

分层边界消费 `docs/agents/backend-architecture-profiles.md`：Controller 处理 HTTP 边界；service/core 承载用例、规则与事务；Repository 负责持久化；适用时 Adapter 承接外部集成。不得为 MVC 加载 `yss-domain` 或生成 DDD Gateway。

输出 Technical Design Contract 的 `design` 分支，结构见 `references/mvc-design.schema.json`。业务规则和关键场景必须关联具体用例与测试 seam；关键场景覆盖成功和失败。与 DDD 使用同一承接和审查要求，不能因采用 MVC 省略规则、一致性或测试设计。

由通用入口校验整个合同并回交生命周期独立审查。本技能不自行批准、不创建 Ticket、不设置 `ready-for-agent`，不生成 Java、SQL 或生产 API。实现由编译器按批准的架构 Profile 和最小技能闭包路由。
