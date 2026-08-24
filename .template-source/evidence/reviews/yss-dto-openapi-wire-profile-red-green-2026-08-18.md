# YSS DTO OpenAPI wire profile RED / GREEN / REFACTOR 证据

- 日期：2026-08-18
- 范围：`.agents/skills/yss-dto`、`.agents/skills/yss-openapi-governance`、`.agents/skills/yss-openapi-draft-review`、OpenAPI Draft checklist 与模板校验器
- 仓库身份：`template-source`
- 变更边界：未修改外部 `yss-cloud-microservice`；未清理或覆盖既有 dirty worktree

## RED 基线

在修改技能前，使用三个只读压力场景模拟执行者，并要求识别错误路径、遗漏和合理化话术。

### 场景 1：赶进度

预期失败路径是把 `com.yss.cloud.dto.response` 误判为 HTTP canonical，把 `SingleResult<T>` / `PageResult<T>` 直接当成 OAS schema，按 getter 暴露 `offset` / `needTotalCount` / `tempTotalCount`，只改 `.agents/skills` 而不做 profile、投影和 lock 闭环。

### 场景 2：沉没成本

预期失败路径是从旧 JSON 或旧 Java 字段表最小修补，继续保留文字泛型、无证据固化 `totalPages` / `offset`、编辑 JSON 反向覆盖 YAML，并以“只是小修补，ADR 和机械同步下次再做”为理由跳过源侧决策和部署。

### 场景 3：只要验证通过

预期失败路径是只运行 `git diff --check` 或单个 marker，跳过 RED/GREEN/REFACTOR、fresh verification、独立语义审查、profile 校验、`scripts/sync-skills --check` 和 `scripts/update-skill-lock --check`，把 dirty worktree 当成可忽略噪声。

这些场景形成的反制验收点是：canonical 包、具体 endpoint schema、Java generic 禁止落盘、分页负向字段、mapper evidence、YAML-first、profile verifier、projection / lock、dirty worktree 归属和独立审查阻断必须在技能与校验器中可见。

## GREEN

按单技能部署边界先后更新 `yss-dto`、OpenAPI Governance、Draft Review；每次更新后都同步投影和 lock。最终 fresh 命令：

```text
scripts/sync-skills
scripts/update-skill-lock
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-yss-dto-openapi-profile
scripts/verify-yss-dto-openapi-scenarios
git diff --check
```

结果：全部通过。场景脚本覆盖 profile、三份技能和 Draft checklist 的关键 marker；profile verifier 校验 schema version、canonical / compatibility 包、`YssResultMeta` + `allOf`、wrapper、公共 wire 类型、分页 enum、负向字段和 computed-field evidence policy。

## REFACTOR 检查

- 将 `SingleResult<T>` 等 Java 泛型保留为语义说明，不再允许其作为 OpenAPI schema 文字落盘。
- 将 `code` 从 Java 内部 `Object` 与公开 wire 类型分离，公开 profile 固定为 `string | integer | null`。
- 将 `totalPages`、`offset`、getter / Lombok / `@JsonIgnore` 的推导降级为 evidence-gated，避免把 default mapper probe 当成统一 HTTP 事实。
- 将 `com.yss.cloud.dto.result` canonical、`dto.response` compatibility-only、YAML-first 和 JSON 派生边界同时写入技能、模板清单和源侧 ADR。
- 保留现有用户 dirty changes；本轮未执行 commit、merge、push、外部源码写入或发布动作。

## 独立审查

第一轮独立审查发现 validator 对 `nullable`、wrapper data shape、PageQuery allowlist / forbidden fields覆盖不足，结论为 Blocked。修订后补齐了字段类型、方向、nullability、required、数组 items / empty value、PageQuery 五字段、默认值、enum、endpoint whitelist policy 及三个 forbidden fields 的 fail-closed 校验；第二轮独立复审结论为 `Pass`，P0/P1/P2 均为 none。

独立审查仍明确：上述模板门禁不等于真实 HTTP mapper、序列化 fixture、Controller / Feign contract-test 或 OpenAPI Freeze 证据。

## 未覆盖范围

本证据只证明模板治理资产和 machine-checkable profile seam；不证明任意项目的实际 HTTP mapper、真实 Controller 序列化、OpenAPI Freeze、生成客户端、前后端集成或生产发布。上述事项仍需在具体 project-instance 的目标边界补充真实 wire evidence。
