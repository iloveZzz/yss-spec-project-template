# Comet — OpenSpec × Superpowers 状态机桥接层

> **Comet 不是新框架，而是一层状态机。** 通过 `.comet.yaml` 和 `comet-guard.sh` 管理五阶段流水线。

---

## 五阶段流水线

```
Open → Design → Build → Verify → Archive
  │       │        │        │         │
Spec    Plan     TDD     Review    Deploy+Retro
      comet-guard.sh 门禁检查每个阶段转换
```

| 阶段 | 触发 | OpenSpec | Superpowers | 门禁 |
|------|------|----------|-------------|------|
| Open | 新需求 | 创建 Spec | spike 验证 | Spec 通过 lint |
| Design | Spec 就绪 | Spec Review | plan 生成计划 | Plan 确认 |
| Build | Plan 确认 | 生成 types | tdd 并行编码 | 测试全过 |
| Verify | Build 完成 | 契约测试 | review+simplify | Review通过+覆盖率 |
| Archive | Verify 通过 | Spec 归档 | retro+知识沉淀 | Deploy+AGENTS.md |

---

## 配置 .comet.yaml

```yaml
pipelines:
  my-feature:
    spec: docs/api/specs/my-feature.yaml
    current_stage: open
    sprint: "Sprint 1"
    stages:
      open:    { status: pending }
      design:  { status: pending }
      build:   { status: pending }
      verify:  { status: pending }
      archive: { status: pending }
```

---

## 门禁脚本

```bash
# 阶段转换时运行
bash scripts/comet-guard.sh my-feature open design
bash scripts/comet-guard.sh my-feature design build
bash scripts/comet-guard.sh my-feature build verify
bash scripts/comet-guard.sh my-feature verify archive
```

每个转换自动检查：Spec存在 → Plan存在 → 测试全过 → Review报告 → AGENTS.md更新
