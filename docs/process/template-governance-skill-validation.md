# 模板治理规则压力验证

> 日期：2026-07-20
> 方法：`writing-skills` RED / GREEN / REFACTOR
> 目标：验证仓库身份、状态路由、UI 条件门禁、技能投影和旧入口清理

## RED：修订前基线失败

| 压力场景 | 压力组合 | 修订前行为 | 失败证据 |
|---|---|---|---|
| Spec 初稿刚写完，开发窗口只剩一天，实现者要求立即开工 | 时间 + 权威 + 交付压力 | `to-spec` 直接将 Spec 标记 `ready-for-agent` | `.agents/skills/to-spec/SKILL.md` 明确要求“Apply the ready-for-agent triage label” |
| 垂直切片 B 被 A 阻塞，但团队希望并行开工 | 进度 + 并行 + 沉没成本 | `to-tickets` 默认给所有 Ticket 标记 `ready-for-agent` | 技能没有将“阻塞边未清除”作为标签前置条件 |
| 只在 Codex 根目录紧急修改一个共享 skill | 时间 + 局部便利 + 多端成本 | 不同 Agent root 的同名 skill 内容哈希不一致 | 修订前 `to-tickets` 和 `to-issues` 已出现多个哈希 |
| 纯后端 API 功能被要求尽快进入契约设计 | 时间 + 流程合规 + 无 UI 事实 | 入口规则仍要求所有 Spec 产出低保真页面草图 | 修订前 `AGENTS.md` 未将功能架构与 UI 原型门禁分开 |
| 维护模板规则时，Agent 按完整产品生命周期补 Spec 和 OpenAPI | 合规 + 上下文 + 产物压力 | 仓库没有机器可读身份，只能猜测 | 修订前缺少 `yss-project.yaml` 和模板维护路由 |

其他基线失败：

- `scripts/verify-template` 首次执行失败：`missing Matt skill: .agents/skills/to-prd/SKILL.md`。
- README 仍将 PRD 和 `to-issues` 作为 Quickstart 入口，与 `AGENTS.md` 的 Spec / `to-tickets` 主链冲突。

## GREEN：目标行为

| 场景 | 必须得到的结果 |
|---|---|
| Spec 初稿 | 功能父 Ticket 使用 `ready-for-human`，不得立即进入实现 |
| 被阻塞的子 Ticket | 保留阻塞关系，不得标记 `ready-for-agent` |
| 共享 skill 修改 | 只修改 `.agents/skills`，然后生成投影并刷新锁文件 |
| 纯后端功能 | 产出功能架构，UI 相关产物标记 `not-applicable` |
| 模板源维护 | 进入模板维护流程，不生成产品 Spec / OpenAPI |

## REFACTOR：验证证据

- [x] `to-spec` 状态语义校验：Spec 初稿创建功能父 Ticket 并使用 `ready-for-human`，状态红线明确禁止 `ready-for-agent`。
- [x] `to-tickets` frontier 标签校验：被阻塞 Ticket 不得使用 `ready-for-agent`，只有阻塞边清除的 frontier Ticket 可进入实现。
- [x] 共享技能目录哈希校验：`scripts/sync-skills --check` 输出 `skill projections are synchronized`。
- [x] 锁文件校验：`scripts/update-skill-lock --check` 输出 `skills-lock.json matches distributed skills`；当时锁文件记录 35 个共享 skills 与 62 个平台 skills。
- [x] 五类路由压力场景校验：`scripts/verify-lifecycle-scenarios` 输出 `五类生命周期压力场景验证通过`。
- [x] `scripts/verify-template` fresh verification：输出 `模板发布校验通过`。

## 尚未解除的发布门禁

- 当前实现者的差异自检不构成独立审查；模板仍需其他 Agent 或人工 Reviewer 审查。
- 外部 `create-yss-spec` 尚未完成 `project-instance` 转换和共同集成验证，因此整体 major 版本仍不可发布。

## 2026-08-06：Matt skills 生命周期适配验证

本轮 RED 已确认生命周期 skill 缺少阶段边界、`to-questionnaire`、`wait-what`、`wizard` 语义及对应机器契约；旧 Matt 条目仍存在于权威目录、投影和锁文件。GREEN 修订加入 `phase_boundary`、`external-input-required`、双轨 Prototype、行为不变量和旧名称压力断言；REFACTOR 迁移锁文件为规范 v3 并修复旧顶层 Matt metadata 的来源 / 路径 / 上游哈希保留逻辑。

| 压力场景 | RED 失败行为 / rationalization | GREEN / REFACTOR 反制 |
|---|---|---|
| 阶段切换时上下文过长 | 可能把 `/compact` 当作默认动作，或把上下文动作误判为新阶段 | 契约固定五个边界选择，并要求条件化 `phase_boundary` 证据 |
| 关键信息在产品负责人手中 | 继续猜测并推进下游 Spec 或 Ticket | `to-questionnaire` 进入 `external-input-required`，答案回流后重新分类影响面 |
| Matt runnable 原型与 YSS 高保真原型混用 | 把 throwaway HTML 当生产交付，或跳过用户确认 | `prototype_mode` 双轨契约分别要求分支回流和 Review/AntD CLI/确认 |
| 人工审批或凭据步骤 | 让 Agent 伪造点击结果，或把秘密写进日志 | `wizard` 限定人工步骤，诊断与持久化证据强制脱敏 |
| 旧 Matt 条目仍被发现 | 以兼容别名保留退休入口，造成路由歧义 | 从权威目录、五个投影和 v3 锁文件删除，并由验证脚本阻断 |

RED 的可复现失败断言包括：`yss-product-lifecycle 缺少编排语义: 阶段边界`、缺少 `to-questionnaire` / `wait-what` / `wizard` 语义，以及契约缺少阶段边界、外部输入和双轨 Prototype 行为不变量；旧名称扫描同时命中七个 Matt 条目。GREEN 首次重跑已将这些断言全部转绿；REFACTOR 复核又补上了 `transition: pause`、结构化 `reason`、两种 `prototype_mode` 的逐字段正反变异和 checkpoint `phase_boundary` 字段。这样可以区分“命令通过”与“规则确实能阻断错误输入”。

修订后锁文件包含 67 个共享 skills 和 47 个平台 skills；旧 Matt 条目已从 `.agents/skills`、`.claude/skills`、`.codex/skills`、`.hermes/skills`、`.pi/skills`、`.trae/skills` 及 `skills-lock.json` 清除，`.qoder` 保持排除。最终 fresh verification 证据由以下命令产生：

```text
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-lifecycle-scenarios
scripts/verify-yss-router-scenarios
scripts/verify-template
ruby -c scripts/sync-skills
ruby -c scripts/update-skill-lock
git diff --check
```

- [x] 新晋升的 45 个技能 description 检查通过：`45/45` 以 `Use when...` 开头。
- [x] 共享锁条目路径检查通过：`0` 个 `skillPath` 指向 Agent 投影根。
- [x] 三个目标投影根均为 `112` 个目录，缺失技能和退休入口均为 `0`。
- [x] 独立 Standards / Spec 审查发现的锁路径和 description 问题已修正并重新通过全部门禁。

阶段边界、问卷暂停 / 回流、Matt/YSS 双轨原型、wizard 人工步骤、诊断脱敏、旧技能名称清理和五个投影根均纳入验证；独立审查仍需在 Git checkpoint 前完成。

## 2026-08-06：Matt skills 快照升级验证

### RED：安装后基线

| 压力场景 | 基线失败 |
|---|---|
| 上游新增 `wait-what`、`writing-for-agents`，且 `ask-matt` 增加关联支持文件 | 五个 Agent root 未全部生成共享投影，`scripts/sync-skills --check` 报告 missing projection |
| 安装器更新顶层 Matt 条目，但旧锁文件仍有 `shared/platform` 分组 | `scripts/update-skill-lock --check` 报告未登记 skill，且 `skills-lock.json` 缺少规范 v3 `canonicalRoot` |
| 上游移动 `to-questionnaire`、`wizard` 的 skill 路径 | 锁文件同时保留旧路径和新路径，无法作为唯一来源 |

### GREEN / REFACTOR：修订后门禁

- [x] `scripts/sync-skills --check` 通过，五个共享投影根与 `.agents/skills` 一致。
- [x] `scripts/update-skill-lock --check` 通过，锁文件只保留规范 v3 的 `shared/platform` 分组，并保留 Matt `source`、`skillPath`、`upstreamHash` 和 `effectiveHash`。
- [x] `scripts/verify-lifecycle-scenarios`、`scripts/verify-yss-router-scenarios` 和 `scripts/verify-template` fresh verification 通过。
- [x] 独立审查确认 `.qoder` 及其他无关脏文件未进入本次 Git checkpoint。

## 2026-08-08：Codex 可加载技能扩展到 Qoder、Pi 和 Trae

### RED：扩展前基线

Codex 的平台清单中有 45 个可直接加载的技能（39 个 YSS 技能和 6 个工程流程技能），但 Qoder、Pi、Trae 各自缺少这 45 个技能；Qoder 另外保留了已退休的 `to-prd`、`to-issues`。原有模板门禁因未纳入 Qoder，仍可通过，说明投影根范围本身是缺口。

同一基线还发现 39 个待提升技能的 description 不符合 `writing-skills` 的 `Use when...` 发现约定，且锁文件会沿用旧的 `.codex/skills` 路径，无法表达新的共享权威源。

独立审查还复现了三个可移植性缺口：Router 场景只覆盖五个投影根；`yss-design-system`、`yss-db2mybatis`、`yss-source-index` 残留 Codex-only 路径；部分 description 混入流程和产出说明。

### GREEN / REFACTOR：目标行为与范围

- 45 个可直接加载技能提升到 `.agents/skills`，共享权威技能由 67 个扩展为 112 个。
- 45 个待提升技能的 frontmatter description 已统一以 `Use when...` 开头；共享锁条目不再沿用任何 Agent 投影根路径。
- 共享技能中的执行路径已改为 `.agents/skills` 或环境变量 / 相对路径，不再依赖 Codex 专属路径；description 只保留触发条件。
- `.qoder/skills` 纳入同步脚本、锁文件和模板发布校验；Qoder、Pi、Trae 均生成 112 个共享技能。
- Codex 专属的 `data-analytics`、`product-design` 插件包继续保留在 `.codex/skills`，不复制到不具备相同插件运行时的 Agent root。
- Qoder 的退休入口由同步脚本删除，所有共享投影继续只能从 `.agents/skills` 生成。

### Fresh Verification

```text
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
scripts/verify-yss-router-scenarios
ruby -c scripts/sync-skills
ruby -c scripts/update-skill-lock
git diff --check
```

- [x] 新晋升的 45 个技能 description 检查通过：`45/45` 以 `Use when...` 开头。
- [x] 共享锁条目路径检查通过：`0` 个 `skillPath` 指向 Agent 投影根。
- [x] 三个目标投影根均为 `112` 个目录，缺失技能和退休入口均为 `0`。
- [x] Router 核心 scaffold 投影覆盖六个 Agent root；Codex-only 插件包仍只存在于 Codex。
- [x] 独立 Standards / Spec 审查发现的锁路径、description 和可移植性问题已修正并重新通过全部门禁。
