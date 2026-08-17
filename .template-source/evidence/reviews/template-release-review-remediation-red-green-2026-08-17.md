# 模板发布审查修复 RED / GREEN 证据

## 范围

- 仓库身份：`template-source`。
- 触发：全部候选变更的独立双轴发布审查。
- 目标：消除已明确安全/权限行为缺少普通架构承载、生命周期场景未校验稳定 ID，以及 ADR 把后续未实施能力表述为已生效能力的问题。

## RED

先新增 `scripts/verify-governance-release`，在不修改权威资产时得到预期失败：

- 两份架构模板均缺少“已明确的认证、授权、租户隔离、敏感数据或合规行为”的条件性承载。
- ADR-0003 / 0006 把索引、依赖图和 fixture 的完整生成写成已交付，ADR-0005 / 0007 把生态发布清单和技能路由注册表写成已生效，但相应资产、schema、消费者和校验器不存在。
- `verify-lifecycle-scenarios` 使用人类可读 route key，却没有核验它们能映射到 `lifecycle-registry.yaml` 的稳定 ID。

## GREEN

- 系统概要设计和技术方案模板恢复条件性架构承载：只有明确改变认证、授权、租户隔离、敏感数据或合规行为时才填写普通架构、契约、验证与回滚约束；未触发时不新增独立门禁或登记。
- ADR-0003 / 0006 明确为 Phase 1 部分实施，ADR-0005 / 0007 明确为 `proposed`；未实现的生态清单、技能注册表、索引、依赖图与 fixture 不再被描述为当前模板已交付能力。
- `verify-lifecycle-scenarios` 读取 `lifecycle-registry.yaml`，并把每个当前 route key 映射、校验到稳定 ID，防止注册表删除或改名时压力场景静默漂移。
- `verify-governance-release` 已加入 `scripts/verify-template`。

## 验证

```text
scripts/verify-governance-release  PASS
scripts/verify-lifecycle-scenarios PASS
scripts/verify-template            PASS（记录于本节最终复审文字写入前的冻结候选）
```

后续完整生态发布清单或技能路由注册表必须从新的 RED 场景开始，且同时交付 source、schema、消费者、`--check` 和跨仓验证；不得仅更新 ADR 状态。

## 独立复审

两位非实现者基于同一 `yss-worktree-candidate-v1` 不可变快照复审：

- Standards：条件性架构承载、稳定 ID 映射和 `candidate-manifest.yaml` 均通过。
- Spec / Requirements：ADR-0003 / 0006 的 Phase 1 边界及 ADR-0005 / 0007 的 `proposed` 状态准确，未实施能力不再被当作本次发布交付。

复审时 `drift`、`violation` 和 `new_impacts` 均为空；本节写入后必须对新的最终候选重新执行 fresh verification 并复核候选摘要，结果由本轮 Git checkpoint 记录，避免把验证结论自指为文档写入后的同一快照。
