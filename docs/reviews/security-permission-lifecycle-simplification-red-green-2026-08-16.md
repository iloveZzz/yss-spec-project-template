---
type: template-skill-validation
status: complete
date: 2026-08-16
scope: yss-product-lifecycle / yss-router / OpenAPI lifecycle simplification
---

# 安全 / 权限生命周期简化 RED / GREEN / REFACTOR 记录

## RED：旧规则的过度治理证据

修改前的只读压力检查表明，机器契约会让普通 CRUD/API 填写结构化安全 / 权限资料、过时的继承资料、触发命中和派生影响旗标；缺少或过期的资料会阻断推进。

SQL / DDL / 迁移和普通下载接口也会仅因技术载体自动升级到专属流程。明确改变认证、授权或租户隔离的需求，除了实际的 Spec、API、数据和架构影响外，还会引入专属传播和回退目的地。

基线脚本 `scripts/verify-lifecycle-scenarios` 与 `scripts/verify-yss-router-scenarios` 在旧契约下通过，证明这些行为不仅存在于文档，也被自动验证锁定。

## GREEN：简化后的压力场景

- 普通 CRUD/API 可在不提供任何额外安全 / 权限输入、平台资料或不适用记录的情况下，通过 Router 的普通 UI/API/Backend/Data 影响分诊。
- SQL / DDL / 迁移仅走既有数据模型和迁移规则；上传下载仅按真实 API、UI 或数据影响处理，不因关键词自动升级。
- 显式改变认证、授权、租户隔离、敏感数据或合规行为时，按实际 UI、API、Backend、Data 和 high-risk 影响进入普通 Spec、架构、错误语义、验收标准和测试 seam。
- 实际调用当前用户、审计或加密组件时，Router 仍选择对应 YSS skill；权限业务行为仍使用 `behavior-tdd`，受控生成仍禁止机械生成此类业务逻辑。

本轮 fresh verification 结果：

```text
scripts/sync-skills --check       -> skill projections are synchronized
scripts/update-skill-lock --check -> skills-lock.json matches distributed skills
scripts/verify-lifecycle-scenarios -> 六类生命周期压力场景验证通过；生命周期编排器压力场景验证通过
scripts/verify-yss-router-scenarios -> YSS Router stage 7 scenarios passed
scripts/verify-template           -> 模板发布校验通过
git diff --check                  -> passed
```

独立只读审查先识别出用户指南、切片 Ticket、审查报告、生命周期说明、技术设计与 OpenAPI Freeze 中的旧专项语句；修订后 Standards 与 Spec 两个审查轴均复核通过，无剩余 P0/P1/P2 finding。

## REFACTOR：收敛后的长期规则

- 不再主动推导或登记安全 / 权限专项影响；没有独立的姿态、平台资料、触发矩阵、派生旗标、专属传播或回退目的地。
- 实现中发现未冻结的新事实时，统一用既有 `new_impacts` 重新分诊。
- 保留通用 `seam-deferred` 的风险、责任人、后续 Ticket、验证计划和目标版本 / 发布日期要求；不再存在专项不可延期清单。
- 保留真实组件选择、普通架构审查、路径边界、证据和验证要求，但不新增与本次简化无关的流程条件。
