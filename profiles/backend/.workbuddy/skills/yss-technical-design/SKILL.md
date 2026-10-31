---
name: yss-technical-design
description: 根据需求与实际工程，按已有 DDD 或 MVC 架构设计后端行为和工程边界。
disable-model-invocation: true
---

# 后端技术设计

读取需求、实际工程结构和相关 YSS 技术资料，沿用工程现有架构与版本。新工程缺少影响实现的架构决定时集中澄清，不能把工具默认值当作业务决定。

DDD 设计聚合、不变量、Gateway、Application 编排与事务；MVC 设计 Controller、Service、Repository、用例规则与事务。说明数据模型、API 行为、错误处理、并发、幂等及外部依赖。

按当前任务需要形成简明设计或直接落实到实现；使用 yss-tactical-design、yss-application、yss-repository、yss-web-controller 等相关技能。不要求固定技术合同、Schema 校验、阶段批准或门禁回执。

平台和组件版本以项目 POM、实际源码和已有资料为依据；未知兼容性如实记录，不把设计完成当作已经运行成功。
