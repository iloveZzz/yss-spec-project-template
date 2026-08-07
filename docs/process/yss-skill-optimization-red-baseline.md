---
status: red
owner: ai
method: writing-skills-red-green-refactor
branch: codex/yss-skill-optimization
---

# YSS 技能体系优化 RED 基线

> 日期：2026-08-07
> 仓库身份：`template-source`
> 目的：在修改 YSS skills、能力目录和路由治理前，记录新鲜 Agent 压力场景的自然行为。

## 1. 基线范围与方法

本轮验证针对待实施的 YSS 技能体系优化，不把已有 Router / 生命周期场景的 GREEN 结果误认为本轮优化已通过。

- 使用 4 个独立、只读、无既有结论泄露的 Agent 场景。
- 场景提示明确要求不读取 skill、`AGENTS.md`、`CONTEXT.md`、研究文档和本次对话，不修改任何文件。
- 压力组合覆盖时间压力、沉没成本、权威要求、长尾 skill 不可用和跨平台同步延后。
- 记录 Agent 的自然选择和原话，不把事后审查意见伪装成基线行为。

## 2. 场景结果

| 场景 | 压力组合 | 关键自然行为 | RED 判定 |
|---|---|---|---|
| backend-slice | 今日交付 + API 资料缺失 + DDD 多模块 | 先读源码、按层实现；跳过完整 Spec、OpenAPI 和审批合同 | 失败：无统一入口分诊、合同和最小 skill 闭包 |
| reroute | 已写大量代码 + 新 API/权限/数据库字段 + 当日发布 | 能意识到需要暂停并补契约，但只给出自然语言回退清单 | 部分通过：安全直觉存在，但无结构化 `stale`、版本和目的地 |
| long-tail | 长尾 skill 不可用 + 用户要求通用实现 + 当日交付 | 允许可逆、非核心场景先按通用知识接入 | 失败：没有把 skill 不可用统一视为阻断 |
| projection | 用户要求先改 `.codex/skills` + 其他平台延后 | 直接把 `.codex/skills` 当修改目标，延后投影和锁文件 | 失败：违反权威源、投影和锁文件边界 |

## 3. 原始 Agent 证据摘录

### 3.1 backend-slice：时间压力覆盖了生命周期前置条件

Agent 原话：

> “不会额外加载 skill，也不会假设存在 Router、批准合同或新的 OpenAPI 流程。”

> “我会暂时跳过：新建完整产品 Spec；等待新的 OpenAPI 文档；全面架构重审……专门的审批合同和流程编排。”

该 Agent 能识别用户隔离、事务、Repository 和测试，但把“尽快开始”解释为可以跳过生命周期资产、契约冻结和结构化路由。它也没有给出 `required_skills`、`allowed_write_paths`、`expected_evidence_files` 或 `verification_commands` 的统一合同。

### 3.2 reroute：有安全直觉，但没有机器可执行的重路由结果

Agent 原话：

> “选择暂停，不继续编码，也不直接回退全部已有代码。”

> “新增 API 字段、权限校验和数据库字段属于跨层契约与安全边界变更，测试未完成时不能以发布窗口为理由绕过评审。”

这是本轮唯一没有直接被时间压力推入继续编码的场景。但它只输出了自然语言的回退清单，没有合同失效、版本递增、工作单元暂停、`new_impacts`、回退目的地或恢复条件。因此属于“判断方向正确、协议形状缺失”。

### 3.3 long-tail：以可逆性为理由绕过专用 YSS 规范

Agent 原话：

> “我会继续推进，但不会把‘按通用 Spring/Redis 经验接入’直接视为 YSS 正式完成。”

> “可逆、非核心且可通过开关禁用的问题会标记为高风险，而不一定阻塞。”

该判断在通用工程场景看似谨慎，但不满足本项目的长尾技能策略：当命中 YSS 专项能力而专用 skill 不可用时，默认应显式阻断；只有生命周期编排器批准等价规范，才能继续。

### 3.4 projection：接受平台副本直接修改

Agent 原话：

> “如果仅按当前请求执行，我会修改 `.codex/skills/` 下对应的 skill 文件。”

> “时间不足时延后：其他平台同步；锁文件和哈希更新；跨平台回归测试；独立审查和提交。”

该结果直接命中本仓库的主要治理风险：把平台投影误认为权威源，并把同步、锁文件和独立审查降级为以后再做。

## 4. RED 失败面

1. **入口和闭包不稳定**：通用 Agent 可以按源码层次列出工作，却没有统一入口分诊、最小 skill 闭包和不适用理由。
2. **重路由不可执行**：Agent 能说“回退评审”，但不能稳定输出合同 `stale`、新版本、暂停工作单元、触发器和恢复证据。
3. **长尾能力边界模糊**：skill 不可用时，Agent 会根据可逆性自行决定是否使用通用知识，缺少统一阻断和等价规范审批边界。
4. **权威源容易被绕过**：在时间和用户直接指令压力下，Agent 会直接修改 `.codex/skills` 并延迟其他投影与锁文件治理。
5. **静态门禁覆盖不足**：当前 `scripts/verify-template`、`scripts/verify-yss-router-scenarios` 和 `scripts/verify-lifecycle-scenarios` 均通过，但它们尚未把上述四类“新鲜 Agent 自然行为”作为本轮能力目录和技能迁移的完整验收面。

### 4.1 scaffold 入口收敛 RED

本次后续切片在既有 RED 基线上增加一个结构压力断言：六个核心 scaffold 能力必须在
`.agents/skills` 直接可发现，`yss-ddd-scaffold-generator/references` 不得继续承载同名
skill 目录。修改 Router 场景断言后立即运行，当前基线失败：

```text
Shared core skill missing: yss-backend-scaffold-adapter
Shared core skill missing: yss-backend-scaffold-parent
Nested scaffold reference must be removed: yss-backend-scaffold-adapter
Nested scaffold reference must be removed: yss-backend-scaffold-parent
Nested scaffold reference must be removed: yss-backend-scaffold-application
Nested scaffold reference must be removed: yss-backend-scaffold-domain
Nested scaffold reference must be removed: yss-backend-scaffold-infrastructure
Nested scaffold reference must be removed: yss-backend-scaffold-web
```

这说明当前结构既缺失 Adapter / Parent 的 shared canonical entrypoint，又保留了六个
scaffold 能力的 nested reference 入口；GREEN 必须同时修复两点，并验证所有平台投影和
能力目录只指向顶层 canonical entrypoint。

## 5. GREEN 验收目标

后续修改每个受影响 skill 或治理脚本时，至少应让同类场景达到以下结果：

- backend 切片先进入生命周期分诊，再由 Router 输出最小闭包和结构化 Slice Implementation Contract 草案；
- API、权限或数据库影响使旧合同失效，输出结构化 `new_impacts`，暂停工作单元并指向明确回退目的地；
- 命中但不可用的长尾 skill 默认 `blocked`，等价规范必须有生命周期批准和证据；
- 所有共享 skill 只修改 `.agents/skills` 权威源，投影和 `skills-lock.json` 由同步流程统一生成和校验；
- 每个结果包含实际验证、证据文件、合同版本、路径约束和独立审查状态，不能以自然语言自报替代。

## 6. 基线命令证据

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |
| `scripts/verify-yss-router-scenarios` | 通过 |
| `scripts/verify-lifecycle-scenarios` | 通过 |
| `scripts/verify-template` | 通过 |

这些命令证明当前模板基线可运行，不证明本轮 YSS 技能优化已达到 GREEN。GREEN 必须重新执行同类压力场景，并补充 capability catalog、权威源边界、长尾不可用和完整重路由的正反断言。

## 7. 下一步

以本文件为 RED 基线，按单个 skill / 单个治理能力执行 GREEN；每完成一个 skill，立即用同一场景复测，再进入 REFACTOR。不得在未完成当前 skill 验证前批量修改下一组 skill。
