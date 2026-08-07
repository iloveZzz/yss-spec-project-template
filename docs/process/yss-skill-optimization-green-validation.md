---
status: green
owner: ai
method: writing-skills-red-green-refactor
branch: codex/yss-skill-optimization
---

# YSS 技能体系优化 GREEN 验证

> 日期：2026-08-07
> 范围：独立 YSS capability catalog、source-index 路由和 `yss-router` 消费入口

本轮 GREEN 是 catalog 切片，不宣称所有 YSS skill 正文已经完成重构。RED 基线见
[yss-skill-optimization-red-baseline.md](yss-skill-optimization-red-baseline.md)。本轮只把
可机器验证的入口、边界和闭包先固定下来，再由后续切片逐个收敛 skill 正文。

## GREEN 结果

| RED 场景 | 本轮固定的结构化约束 | 验证证据 |
|---|---|---|
| backend-slice | `backend-vertical-slice` profile 先进入 `yss-product-lifecycle` 和 `yss-router`，包含 Application、Domain、Repository、Web、DTO 及 Java 规范闭包；领域建模改由 `domain-modeling` 承担 | catalog validator、YSS Router scenarios |
| reroute | `stale`、`new_impacts`、暂停工作单元和回退目的地成为 catalog 必填治理字段 | catalog validator |
| long-tail | `unavailable_skill_policy.default_action: blocked`，等价规范必须由 `yss-product-lifecycle` 批准 | catalog validator |
| projection | 每个 entrypoint 声明 `shared` 或 `codex-only`；shared 必须从 `.agents/skills` 投影，锁文件和投影检查继续生效 | `sync-skills --check`、`update-skill-lock --check` |
| scaffold-entrypoint | Adapter / Parent 与四个既有层技能统一提升为 `.agents/skills` 顶层 shared entrypoint；generator `references/` 不再承载同名 skill | `verify-yss-router-scenarios`、`sync-skills --check` |

## Fresh verification

```text
YSS capability catalog 校验通过 (49 个 entrypoint)
YSS capability catalog 校验通过 (49 个 entrypoint)  # 设置 YSS_SOURCE_ROOT 后
五类生命周期压力场景验证通过
生命周期编排器压力场景验证通过
YSS Router stage 7 scenarios passed
模板发布校验通过
```

执行命令：

```bash
ruby scripts/verify-yss-capability-catalog
YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice \
  ruby scripts/verify-yss-capability-catalog
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
scripts/verify-yss-router-scenarios
```

## 尚未宣称完成的部分

- 49 个 entrypoint 的分类、触发、owner 和 source-index 已登记；skill 正文没有在本
  切片中批量改写。
- `yss-router` 已要求先读取 catalog，但 Router 合同仍由
  `references/router-contract.yaml` 负责最终字段约束和生命周期审批。
- 六个 scaffold entrypoint（Parent、Adapter、Application、Domain、Infrastructure、Web）现在
  统一由 `.agents/skills` 维护；`yss-ddd-scaffold-generator/references/` 只保留生成器自身的
  架构与用法参考，不再保留重复 skill wrapper 或隐藏入口。
- source-index 的外部路径在 `YSS_SOURCE_ROOT` 已配置时校验存在；没有配置时只校验
  相对路径格式，以保持模板可移植。
- 后续 REFACTOR 应以真实 `project-instance` 垂直切片复测四个 RED 场景，并根据
  复测结果合并、降级或拆分具体 skill；不能用本次静态 catalog 校验替代真实切片。
