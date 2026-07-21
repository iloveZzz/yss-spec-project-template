---
name: yss-router
description: Use when a YSS vertical slice is entering implementation, spans multiple frontend/backend/API areas, needs implementation readiness checked, or requires a minimal YSS skill set, Slice Implementation Contract, TDD mode, evidence plan, or reroute decision.
---

# YSS Router

阶段 7 的实现合同编译器。它把已批准的生命周期资产和垂直切片编译为 `Slice Implementation Contract` 草案；不批准合同、不写业务代码、不设置 `ready-for-agent`。

## 输入

先读取 Spec、切片 Ticket、需求冻结、适用的原型确认、OpenAPI Freeze/no-impact、系统/数据架构、Design Review、Build Architecture Checklist、实现仓库和验证命令。输入缺失、未批准或 `stale` 时输出 `blocked`，交回 `yss-product-lifecycle`。

## 编译循环

1. 判断 frontend/backend/API/data/cross-repo 影响。
2. 检查工程存在性和核心/长尾 skill 可用性。
3. 选择主 skill，并按 [router-contract.yaml](references/router-contract.yaml) 计算强制依赖闭包。
4. 为切片生成基线合同；为当前行为生成工作单元增量路由。
5. 选择 `behavior-tdd` 或 `controlled-generation`。
6. 输出 `draft`、`blocked` 或 `ready-for-lifecycle-review`，交生命周期编排器核验和持久化。

合同结构见 [slice-implementation-contract.md](references/slice-implementation-contract.md)，专项返回协议见 [yss-skill-execution-result.md](references/yss-skill-execution-result.md)。

## 硬规则

- Router 不得输出 `approved`、`ready-for-agent` 或 `completed`。
- UI 影响缺少正式原型确认时，不得路由页面实现。
- Repository/数据模型影响缺少数据架构时，不得路由持久化实现。
- API 变化必须回到生命周期 Draft/Review/Freeze；半成品 backend 不得冒充稳定 source of truth。
- 后端端到端切片必须包含 Application；对象/POJO 影响按契约自动补 `mapstruct`、`lombok`、`alibaba-java-code-style`。
- 业务行为使用 `behavior-tdd`；只有机械脚手架/生成物可用 `controlled-generation`，并记录例外和验证。
- 专项结果中的越界路径、缺失证据、`drift`、`violation` 或 `new_impacts` 必须阻断或重路由。
- 长尾 skill 不可用时显式 `blocked`，不得用通用知识假装已应用 YSS 规范。

## 三级路由

- 切片基线路由：生成完整合同和技能闭包。
- 工作单元增量路由：绑定一个行为、主/辅 skills、TDD 模式、路径和证据。
- 完整重路由：API/schema、权限、状态机、数据模型、仓库、写路径、skill、测试 seam 或架构约束发生实质变化时触发。

## 输出

输出合同草案、技能依赖闭包、不适用理由、阻塞项、TDD 模式、工作单元、预期证据、验证命令、人工审查点和完整重路由触发器。自然语言说明不能替代结构化合同字段。
