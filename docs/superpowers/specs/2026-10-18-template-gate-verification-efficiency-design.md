---
doc_type: maintenance-design
status: draft
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-18
---

# template-gate 与日常验证精简设计

版本：v0.1.0。状态：待书面审阅；范围决策已澄清，尚未实施。

## 1. 目标与已确认决定

缩短模板维护者日常与 PR / MR 验证的反馈时间，保留现有放行标准和完整发布回归。以减少实际执行与环境准备成本验收，不以删除文件数量验收。

用户在本次对话中对 Q1–Q4 回复“按推荐继续”，确认：

1. 可以合并或删除测试，但必须先证明相同缺陷仍有测试覆盖；保留独立的批准、摘要、用户文件保护、回滚及退役边界。
2. 现有 PR 常驻守卫继续每轮适用，同一输入只执行一次；行为回归继续按影响选择。
3. 纳入当前 README 文档事实与上下文预算失败的最小修复；不放宽阈值，不改成非阻断。执行基线复核（2026-10-19）：README 文档事实与上下文预算检查已通过；fast 当前 135 项，其中 16 项为 slow。
4. 用文档、技能、核心验证器三类改动对比耗时及执行次数；本轮不增加固定秒数门禁。

上述回复是范围与取舍的确认，不是对尚未形成的书面设计、实施计划、提交、推送或发布的批准。本设计审阅通过后再编写实施计划。

## 2. 当前事实与问题

调查基线：模板 HEAD `6f8f19d5a4ee7e62cbb73c9cc9ed0142ff4730c0`。执行者应在实施前重新核对 HEAD、index 和未跟踪文件。

| 事实 | 依据与边界 |
|---|---|
| 最近一次已调查的成功 PR 中，环境准备 123 秒、gate 约 81 秒 | [CI 运行记录](https://github.com/iloveZzz/yss-spec-project-template/actions/runs/39019116654)；这是该次 Linux runner 的记录，不是当前机器的性能承诺 |
| 当前基线提交先准备环境约 120 秒，随后约 1.1 秒因两项廉价检查失败而跳过 fast | [CI 运行记录](https://github.com/iloveZzz/yss-spec-project-template/actions/runs/39095598114) |
| 本地只读复核得到常驻上下文 14374 字节，阈值 14000 字节 | `AGENTS.md` 3082、`CONTEXT.md` 2510、生命周期 Skill 8782；使用现有 `collectMetrics`、`checkContextBudget`，未修改统计口径 |
| README 第 11 行的“两个 Profile”触发既有文档事实规则 | `scripts/verify-doc-facts` 实际退出 1；未将它解释为功能测试失败 |
| fast 登记 135 项，其中 16 项为 slow；按影响选择已存在 | `.template-source/process/template-verification-profiles.yaml`；登记数不等于每次执行数或测试用例数 |
| 技能改动可使投影、锁、技能注册表在外层 gate 与 fast 各执行一次 | `scripts/lib/ci-gate.mjs` 的 `STEPS` 与 fast 实际计划；生命周期注册表也存在同类重复 |
| 同轮 DAG 已有等价成功执行复用 | `scripts/lib/template-verification-runner.mjs`；不能把重复登记条目直接折算为重复墙钟耗时 |

当前未跟踪的其他设计、计划及 `docs/process` 文档属于已有工作。本设计不修改、清理或吸收这些文件。工作区 fast 完整计划仍可能因其中未登记的合同文档拒绝；不能为本次提速绕过该拒绝。

## 3. 执行链与检查归属

选择在现有入口上调整归属与准备顺序。保留 `ci-gate`、fast、slow、release 的职责，不新增验证框架、缓存服务、跨轮“已检查”凭据或验证档。

PR / push 的顺序：现有基础运行时供给 → 最小入口检查与原始计划选择 → 按需准备重依赖 → fast 执行行为检查和 CI 必跑守卫 → 独立核验报告及输入未漂移。

### 3.1 前移的守卫

配置安全、文档事实、上下文预算和 Node 声明继续由 `ci-gate` 执行，使用最小 Node 环境。任何必需项失败都保留非零退出与日志，停止后续重依赖准备和 fast。彼此独立的廉价检查仍可收集失败，避免每次只暴露一项。

原始计划选择读取现有 base、提交差异、index、工作树和未跟踪路径。PR 使用完整 base SHA，push 沿用 `HEAD^` 与首提交规则；路径读取使用现有 NUL 分隔方式。未知路径、缺输入映射、非法依赖在重依赖准备前拒绝。

### 3.2 移交 fast 的守卫

以下检查保留既有稳定 ID，在 CI fast 调用中显式必跑。选中集合用 ID 合并，不因当前改动无关而省略，不再由外层启动第二份进程。

| 外层既有名称 | fast 的当前 ID | 命令 |
|---|---|---|
| sync-skills | `check.skill-projection-identity` | `scripts/sync-skills --check` |
| skill-lock | `check.skill-lock-current` | `scripts/update-skill-lock --check` |
| lifecycle-registry | `check.9f66238a57e457bf` | `scripts/verify-lifecycle-registry` |
| skill-registry | `check.022dccdddca70b70` | `scripts/verify-skill-registry` |

增加仅用于 fast 的加法式 CI 调用上下文，例如 `--ci-guards`。它只添加上述必跑项，不接受调用方提供“通过”状态，也不接受任意检查排除表。CI 守卫身份从现有 `STEPS` 中的绑定关系派生，不复制另一份可独立漂移的清单。

独立调用 fast 且不带 CI 上下文时维持当前选择。slow 模式保持只执行 slow 集合；release 不消费该上下文，误用时拒绝，不能缩小发布范围。报告的独立期望编译器消费同一调用上下文，重新生成预期任务。

`STEPS` 仍向 Agent hook 提供现有守卫名称、命令和修复建议。hook 的路径选择与退出语义不因归属调整改变。外层报告只记录实际执行及对内部真实结果的引用，不为未在外层启动的命令伪造退出或成功记录。

## 4. 按需准备依赖

从已选检查及明确前置计算工具需求。将 `verification-preflight.mjs` 已有的识别条件抽成共用的纯需求计算，环境准备和最终预检消费同一结果，避免再写一套正则或测试名规则。

本轮按需准备的主要耗时对象是：固定 yss 源码获取与构建、模板 pnpm 工具依赖安装、Vue 原型作者工具链安装。基础 Node / Python / Go 版本仍由现有 CI 运行时供给机制提供，本轮不承诺消除所有基础运行时供给成本。GitLab 的按需供给继续复用 `ci-setup` 当前受限的容器逻辑。

Python schema 依赖由真实检查决定；生命周期注册表既然在 CI 必跑，其 Python / jsonschema 前置不能被文档改动场景省略。缺失的真实资源声明应补到已有检查，不靠关闭最终预检获得提速。

`ci-gate` 使用显式的工具准备选项调用现有 `ci-setup`；CI 适配器负责开启，本地默认不安装或改写工具。现有 `ci-setup` 未带需求输入时保持原有调用兼容性；带需求输入时严格验证结构、已支持字段和选值，非法或缺失数据不得解释为全部不需要。

环境传递沿用 `YSS_CI_ENV_FILE` 的受控导出通道。父进程只读取允许的变量并校验值，不把文件内容当作 shell 程序执行。固定 yss 的提交、Go 版本、构建配方、二进制 SHA-256、pnpm frozen lockfile、Vue lock 与包版本继续核验。

GitHub / GitLab 适配器继续只供给运行时、选择模式、调用公共入口与归档报告。`template-gate` 名称、PR / MR 与 main push 触发、base 取值、并发取消和报告上传边界保持。slow 工作流同样按 slow 计划准备所需依赖，不新增另一套工具路由。

## 5. 报告与失败真实性

移交检查不依赖外部结果复用。fast 在本轮真实执行四项必跑守卫；外层结合实际子进程退出，调用现有 `compileExpectedVerificationPlan` 与 `validateVerificationReport` 核验当前 fast 报告，使用 `requireRelease: false`，不将 limited 变为发布证据。

缺失任务、重复或错误任务、无可观察成功退出、日志缺失或摘要错误、调用上下文不符、输入漂移，均使 gate 失败。仅有 child exit 0 或 `status: passed` 不足以放行。

输入观察覆盖前移守卫开始到本轮完成；复用现有观察器。准备期间输入改变时，停止或使本轮失败，不沿用前移检查结果；保留真实失败、取消、未执行与日志。前后置与清理维持现有语义，不引入跨运行跳过。

## 6. 当前失败的最小修复

README 删除可漂移的数量复述，保留新建 Profile、旧 Design 迁移及既有记录 / 批准保护的原意，并链接当前权威入口。文档事实检查继续阻断。

优先对根 `AGENTS.md` 作等义压缩，使常驻上下文不超过当前 14000 字节。不得删除身份、授权、脏工作保护、正式合同、适用验证和模板源维护边界，不改 `RESIDENT_FILES`，不将常驻内容移出统计来凑指标。不为这项修复改生命周期 Skill，从而避免额外投影与锁维护。其他预算保持 4000 字符、12500 字节，不上调。

精简前后按规则逐项对照，再运行现有文档、治理入口与预算检查；字节减少本身不证明规则等价。

## 7. 测试与登记清理

首批只处理已发现的两组同命令登记：

| 保留的当前登记 | 合并候选 | 必须保留的内容 |
|---|---|---|
| `check.openapi-validation-scenarios` | `check.work-layout-openapi-draft-validation` | 两侧输入路径并集、全部现行 Gate 关联、Draft 记录的通过与拒绝覆盖 |
| `check.structured-assets` | `check.work-layout-assets` | 两侧输入路径并集、全部现行 Gate 关联、结构化资产的有效与非法引用覆盖 |

合并前比较实际执行参数、环境、来源、依赖、资源与断言。若存在不同失败语义，保留区分，不为减少条目强行合并。此项主要降低登记维护成本，不预报等量执行耗时收益。

保留原测试用例；首批不删除 `verification-qualification.test.mjs`、`legacy-verification.test.mjs`、`cli-core-retirement.test.mjs` 或 `ar12b-retirement.test.mjs`。它们仍承担退役入口拒绝、历史证据或用户资产保护。`existing-ui-baseline` 继续保留。

其他整文件删除必须在实施前给出“旧用例 → 保留用例 → 相同缺陷”的可核验对照，没有充分证据就不删。同步维护现行路由、Gate 与直接消费者，删除路径的影响识别保持；历史固定提交、旧记录和批准不重写，不能把旧 ID 的成功换算为当前成功。

## 8. 验收与验证边界

| 场景 | 必须观察的结果 |
|---|---|
| 文档事实或预算失败 | 相应非零退出与日志保留；不启动固定 CLI 构建、模板 pnpm 安装、Vue 安装或 fast |
| 文档改动正常 | 常驻守卫仍完整；四项移交守卫真实执行；不准备未使用的重依赖 |
| 技能改动 | 投影、锁、技能注册表各执行一次；原行为回归与 hook 消费继续覆盖；错误锁仍拒绝 |
| 核心验证器改动 | 原影响检查与依赖闭包保留，并加入 CI 必跑项；未知路径或坏依赖在昂贵准备前拒绝 |
| 输入或需求变化 | 工具准备后的计划 / 输入与前移检查不一致时拒绝；不沿用旧成功 |
| 伪造成功与缺项 | child exit 0 但缺守卫结果、坏日志、错误 invocation 或漂移时，外层拒绝 |
| slow / release / 独立 fast | 保持各自范围和证据性质；CI 选项不能改变 slow 或缩小 release；历史报告继续按绑定提交读取 |
| 重复登记清理 | 选中的独立缺陷与输入路径覆盖保持，Gate 关联完整；不降低任何有效断言 |

优先扩展现有 `ci-gate`、`ci-adapters`、Agent hook、verification-selection、preflight、report-v2、execution 与 retirement 测试。增加的测试只固定本轮新分支或具体缺陷，不另建广泛重复套件。

耗时对比使用上述三类有效改动的固定输入、相同工具版本和同类 runner；分别记录基础运行时、重依赖准备、检查执行和总墙钟时间。现有 CI / verification 报告记录命令、结果与耗时即可，不新增常驻性能采集系统或秒数门禁，不以任务耗时之和冒充墙钟时间。

日常实施只运行受影响检查；完整 release、固定 CLI 集成和平台资格仍按现行合同在实际集成 / 发布边界执行。本设计不把计划模拟、桩测试或本机单环境结果当成那些验证已经通过。

## 9. 影响文件与实施顺序

| 范围 | 责任 |
|---|---|
| `README.md`、`AGENTS.md` | 修复现有文档事实与预算失败，保持原意 |
| `scripts/lib/ci-gate.mjs`、`scripts/ci-gate` | 检查归属、前移、按需准备与真实报告消费；保留 hook 定义 |
| `scripts/lib/template-verification.mjs`、`scripts/lib/verification-selection.mjs`、worker、report-validator | 加法式 CI 必跑上下文与独立期望编译，不改变默认 fast / release |
| `verification-preflight.mjs`、`scripts/ci-setup` | 共用工具需求、严格准备输入与既有版本 / 摘要校验 |
| GitHub workflow / setup action、`.gitlab-ci.yml` | 运行时供给与公共入口参数；保留触发和归档 |
| `template-verification-profiles.yaml`、对应既有测试、`github-workflows.md` | 消除重复登记、保留资源 / 输入 / Gate 覆盖、更新真实行为说明 |

实施按“当前失败修复 → CI 检查归属与报告核验 → 按需准备与适配器 → 登记合并及代表场景对比”依次组织。每项有独立的必要验证；具体接口、测试名称与命令由审阅通过后的实施计划固定。

## 10. 风险与恢复

主要风险是迁移归属时遗漏必跑守卫、工具需求漏判、hook 定义断裂、输入变化后沿用早先结果，以及合并登记丢失输入 / Gate 关联。第 8 节逐项覆盖这些失败方式。

发现风险时恢复相互兼容的入口、选择器、执行器、报告消费者与策略，再对当前输入运行受影响检查。不能只恢复一侧、手改通过报告、放宽阈值或以完整回归尚未执行为由声称发布就绪。

本次仅修改模板仓；不修改 yss-cli、独立前端工程或已有无关文档。实施、Git 提交、推送、发布及外部安装按各自实际授权边界执行。
