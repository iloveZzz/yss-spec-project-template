---
name: yss-implementation-contract-compiler
description: "编译或重验 YSS Slice Implementation Contract、最小 Skill 集与证据计划；判定偏离及重新路由。"
disable-model-invocation: true
---

# 实施任务整理

将用户需求、现有规格和设计整理成可执行的实现任务。每项写明目标行为、受影响仓库与路径、接口依赖及适用技能；直接复用现有 Ticket 或文档。

按实际架构选择 yss-application、yss-domain、yss-repository、yss-web-controller，以及对象转换、异常、校验等相关技能。DDD 与 MVC 不混用职责，业务/API/数据变化保持对应关系。

输出供 Agent 直接执行的任务说明。范围内的本地实现沿用用户授权，提交和发布等外部动作仍使用对应授权。
