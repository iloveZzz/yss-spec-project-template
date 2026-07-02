---
pipeline: <feature-id>
stage: engineering-baseline-review
status: draft
owner: ai
---

# <功能名称>工程基线 / YSS DDD Review

> 适用场景：新后端服务、新模块、DDD 分层、Gateway / Repository、统一响应、MapStruct 或工程结构受影响时。
> 本文确认本次变更是否符合 YSS DDD 工程基线，不替代系统概要设计、数据架构或代码审查。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| PRD / 需求冻结 |  |  |  |
| 产品总体设计 / 功能架构 |  |  |  |
| OpenAPI Draft / 无 API 影响记录 |  |  |  |
| 既有工程结构 |  |  |  |
| YSS skill 路由 |  |  |  |

## 2. 工程影响判断

| 检查项 | 结论 | 说明 |
|--------|------|------|
| 是否新建后端服务 | 是 / 否 |  |
| 是否新增后端模块 | 是 / 否 |  |
| 是否影响 Adapter / Application / Domain / Infrastructure 分层 | 是 / 否 |  |
| 是否新增 Gateway / Repository | 是 / 否 |  |
| 是否影响统一响应 / DTO / VO / Query / CMD | 是 / 否 |  |
| 是否触碰安全红线 | 是 / 否 |  |

## 3. YSS DDD 分层检查

| 层级 | 职责 | 本次影响 | 约束 / 结论 |
|------|------|----------|-------------|
| Adapter | 协议适配、校验、响应包装 |  |  |
| Application | 用例编排、事务边界 |  |  |
| Domain | 领域模型、领域服务、Gateway 接口 |  |  |
| Infrastructure | GatewayImpl、Repository、外部系统适配 |  |  |
| Bootstrap | 启动、配置、依赖组装 |  |  |

## 4. 推荐 YSS skills

| 场景 | 推荐 skill | 是否需要 | 备注 |
|------|-------------|----------|------|
| 新服务骨架 | `yss-ddd-scaffold-generator` | 是 / 否 |  |
| 后端基线检查 | `yss-backend-scaffold-parent` | 是 / 否 |  |
| 领域建模 | `yss-domain` / `yss-backend-scaffold-domain` | 是 / 否 |  |
| Repository / MyBatis | `yss-repository` / `yss-mybatis` | 是 / 否 |  |
| Web Controller / DTO | `yss-web-controller` / `yss-dto` | 是 / 否 |  |

## 5. 完成标准

- [ ] 调用方向符合 `Adapter -> Application -> Domain` 和 `Infrastructure -> Domain Gateway`。
- [ ] Domain 不依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO。
- [ ] Controller 不穿透 Repository。
- [ ] 对象转换优先 MapStruct，重复 mapping 有处理策略。
- [ ] 所需 YSS skills 已最小化选择。
- [ ] 安全红线已标记 `TODO-HUMAN-REVIEW`。

## 6. 下一步门禁

- 结论：Approved / Blocked
- 下一步：系统概要设计 / 数据架构 / 回改 OpenAPI Draft
- 阻断项：
