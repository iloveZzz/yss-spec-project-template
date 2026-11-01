# Spec 技能整合审查修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 沿用用户已选择的本会话顺序执行方式。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复注册表残留依赖和 Vue 原型场景入口，纠正原计划的 Bundle 来源路径，并通过新构建与实际安装证明修复进入分发。

**Architecture:** 在现有注册表删除误挂条目；Vue 工作区直接使用运行器已有的场景合同，不增加第二份场景数据或兼容入口。同步设计技能的宿主副本，再从实际模板工作树重建 CLI；所有运行验证材料置于仓外临时目录。

**Tech Stack:** Markdown、YAML、现有 Vue/shadcn-vue 资产、Go Bundle 生成器。沿用 Go `1.27.1`、Node `^20.19.0 || >=22.12.0`、pnpm `10.32.1` 和现有 package/lock，不升级依赖。

**Spec:** [已批准的整合设计](2026-11-01-spec-skills-integration-design.md)，重点为 §6.1、§6.4、§8.2–8.3 及 AC-01/04/07/13/14；补修 [原实施计划](2026-11-01-spec-skills-integration-plan.md) 审查中的三项发现：构建路径指向主工作树、Vue 默认路径未实际验证、`code-review` 残留依赖。

## Global Constraints

- Spec 完整产品交付包含完整规格、原型设计、原型及交互说明；研发阶段承担技术设计和实现。
- 两种 Spec 安装保持同一组 16 个默认技能；Backend 默认仍为 `setup-yss-harness`、`implement`、`code-review`、`handoff`。
- 不考虑旧版兼容和迁移，不恢复 `competitive-intelligence` 或 `yss-prototype-stage`，不添加别名、wrapper 或旧项目转换。
- 不新增持久脚本、测试套件、审批包或统一门禁。下文临时断言仅服务本次修复，不能成为分发资产。
- 组件固定提交仍为 `67c9a3926dc0a854507b325c6337ff2210d16379`；不修改 vendor、锁文件、许可证、来源清单或虚构上游版本。根锁不新增 `effectiveHash`。
- 保留场景运行器现有初始化、错误、重置和未知 hash 拒绝行为；保留 CLI 文件保护、所有权及事务行为。
- 不覆盖既有未提交工作，不改 Backend 专有覆盖源，不创建提交、推送、发行，不替换系统 CLI 或同步用户真实项目。
- 计划沿用模板仓 `.template-source/design`；CLI 的 `docs/superpowers` 仅作历史资料，不作为新计划位置。

## Review Focus

| 输入或失效条件 | 预期与所属验证 |
|---|---|
| YAML 删除父键后列表误归相邻技能 | 任务 1：解析后 `code-review` 精确保留原三项依赖，其他键和值与修复前一致 |
| Vue 只加载说明要求的 `prototypeScenarioContract` | 任务 2：没有 `prototypeScenarios` 全局时，选择器仍有四个正确选项 |
| 操作后切换/重置场景 | 任务 2：已处理条目、选择和失败尝试状态重新初始化，失败场景可重试 |
| 未知 hash 或缺少合同 | 任务 2：显示明确入口错误，不能默认为正常场景或停在空白页面 |
| 生成器误读旧模板或漏同步副本 | 任务 3：使用明确工作树路径，安装后的修复文件匹配源，两个 Spec 集合恰为 16，Backend 保持 4 |

---

## 工作目录、文件与任务接口

`TPL` = `/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template`；`CLI` = `/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli`。禁止将它们替换为 `/Users/zhudaoming/Projects/` 下尚未包含本次实现的主工作树。

执行时用 `mktemp -d /private/tmp/yss-spec-review-fixes.XXXXXX` 创建 `FIX_TMP`。临时脚本、浏览器样本、开发二进制和安装目录均归该目录；不复用旧结果冒充新验证。

| 文件 | 责任 |
|---|---|
| `TPL/.template-spec/agents/yss-skill-registry.yaml` | 仅修复 `skill_dependencies.code-review` 的三项残留 |
| `TPL/.agents/skills/yss-design-system/assets/vue-business-patterns/Workspace.vue` | 场景选择器读取现有合同 |
| 同技能 `references/product-prototype.md`、`references/shadcn-vue-prototype.md` | 明确 Vue 数据来源、脚本加载顺序和实际操作检查 |
| `TPL/.workbuddy/skills/yss-design-system/` 下上述三个同名文件 | 与内容源逐字节同步；Claude 链接只核对 |
| `TPL/.template-source/design/2026-11-01-spec-skills-integration-plan.md` | 更正工作目录、可复制构建命令及 Vue 验收；按实际修复更新完成说明 |
| `CLI/internal/bundle/assets/bundles.json.gz` | 重新生成的忽略资产，不提交；Go 源码无需修改 |
| `FIX_TMP/` | 临时断言、Vue 样本、开发构建及全新安装验证；公开导出需重建时也只在此暂存 |

任务顺序：1 → 2 → 3。注册表修复与 Vue 修复可各自验收，最终由任务 3 验证真实分发。Backend 注册表已核对没有这三项残留，只作保护对照，不复制根注册表覆盖它。

## Task 1：删除误挂在 code-review 下的依赖

**Files:** 修改根注册表约 817–837 行；临时验证 `FIX_TMP/registry-check.py`。只读 Backend 注册表与两个分发默认数组。

**Interfaces:** 消费当前 YAML；产出精确的 `skill_dependencies.code-review` 列表供任务 3 核对 Bundle。列表只含：

```python
expected = [
    {'skill': 'i-have-adhd', 'type': 'context-conditional', 'when': 'lifecycle-document-output'},
    {'skill': 'yss-repository', 'type': 'context-conditional', 'when': 'backend-persistence-impact', 'stacks': ['java']},
    {'skill': 'yss-mybatis', 'type': 'context-conditional', 'when': 'backend-persistence-impact', 'stacks': ['java']},
]
```

- [x] **1. 建立临时解析断言。** 保存修复前解析结果与 Backend 字节摘要；使用已有 YAML 解析器读取注册表，断言 `document['skill_dependencies']['code-review'] == expected`。另断言除该列表外的文档对象与快照相等、Backend 字节未变。
- [x] **2. 运行失败检查。** `python3 "$FIX_TMP/registry-check.py"`：预期仅精确列表断言失败，实际为六项，不能用 YAML 可解析或旧名称检索代替该检查。
- [x] **3. 局部删除三项残留。** 删除列表末尾重复的 `i-have-adhd`、`prototype-review: review-only`、`yss-design-system: coordination-only`；保留开头三项及相邻技能，不全量重新格式化 YAML。
- [x] **4. 重跑同一检查。** 预期全部断言通过，包括相邻映射和 Backend 保护；记录实际退出码。

## Task 2：使 Vue 原型按当前说明即可选择场景

**Files:** 修改 `Workspace.vue`、两份参考及三个 WorkBuddy 副本；临时样本 `FIX_TMP/vue-approval/`。不修改 `Approval.vue`、`scenario-runtime.js` 或离线 HTML 资产。

**Interfaces:** `window.prototypeScenarioContract` 的结构仍为 `{scenarios, data_digests}`；每个场景包含 `id/label/state_ref/initial_data`，`data_digests[id]` 为初始数据规范化 JSON 的 SHA-256。Vue `scenes` 使用 `prototypeScenarioContract?.scenarios ?? []`；缺少合同时仍由 `reset()` 中的运行器初始化报告错误。不增加 `window.prototypeScenarios`、新导出或兼容 fallback。

- [x] **1. 按现行参考组装一个临时 Vue 审批样本。** 复制 `assets/prototype/` 的 package、lock、Vite 配置和许可；入口使用 `approval-standard.ts`，复制其实际导入闭包（包含 Workspace、模型、工作区与业务样式、Approval、Notice）。按固定清单复制所需组件及其依赖，核对摘要；创建现有方法要求的 `src/lib/utils.ts`、CSS 和 `#app`。不修改依赖版本或 vendor 来绕过构建失败。
- [x] **2. 准备唯一场景来源。** 从 `approval.scenarios.json` 生成临时 `public/scenarios.js`，只赋值 `window.prototypeScenarioContract`；使用递归排序对象键、保持数组顺序、紧凑 JSON 的规范化方法计算初始数据 SHA-256。先加载该普通脚本，再加载 `scenario-runtime.js`，最后加载 Vue 模块入口；不生成第二个选项全局。
- [x] **3. 复现选择器缺陷。** 在样本目录用 pnpm `10.32.1` 执行 `pnpm install --frozen-lockfile`、`pnpm exec vite build`、`pnpm exec vite --host 127.0.0.1`。浏览器打开页面并展开评审工具，比较 `#scenario` 的选项与以下期望；修复前预期缺少选项，即使构建和主页面渲染成功也不算通过。

```text
[(primary, 正常), (empty, 空数据), (failure, 保存失败), (no-permission, 无编辑权限)]
```

- [x] **4. 修改唯一消费者。** 将 `Workspace.vue` 的 `scenes` 初始化改为从 `prototypeScenarioContract?.scenarios ?? []` 取值，保持选择器、hash、reset/ready/fail 调用与错误显示机制原样。
- [x] **5. 补齐两份使用说明。** 明确 Vue 选项与运行器共用一个合同、按上述顺序加载脚本；说明选择所用入口的场景 JSON。补上实际切换、动作、重试、重置及未知 hash 检查。`offline-html/app.js` 确有独立选项消费者，保留其现有说明与数据，不将它泛化为 Vue 的额外要求。
- [x] **6. 同步三个 WorkBuddy 文件并核对 Claude 链接。** 三个副本与源字节相等；`.claude/skills/yss-design-system` 仍解析到对应内容源。保护 Backend 和根来源锁，不为本次作者资产修复改写上游摘要。
- [x] **7. 将修复后的 Workspace 复制到同一样本并重建。** 重跑 `pnpm exec vite build`，预期退出 0；浏览器重新打开页面后执行下列实际操作，保存简短观察及必要截图，不能用原生 HTML 样本替代。

| 操作 | 必须观察到的结果 |
|---|---|
| 展开评审工具 | 四个选项 ID/标签与上表一致，正常场景显示三项；M-002 因资料未齐不可处理 |
| 正常场景通过 M-001，再重置 | 通过后剩两项；重置恢复三项、选中数 0、旧提示消失 |
| 切换 `failure`，选择 M-001 与 M-003，批量通过，再重试 | 首次 M-001 成功移除、M-003 失败保留且仍选中；重试后 M-003 移除，M-002 仍不可处理 |
| 重置 `failure` 并重复首次批量操作 | 初始三项恢复，第一次处理再次产生失败，证明尝试状态被清除 |
| 切换 `no-permission`，再切回 `primary` | 无权限提示且所有审批操作禁用；切回恢复三项正常数据、无上个场景的选择或失败提示 |
| 访问 `#scenario=does-not-exist` | 显示“未知或缺失的场景，请检查评审链接。”，不显示可操作的正常审批页；选择正常场景后可恢复 |
| 在单独样本页省略合同脚本 | 显示同类入口错误，不出现未捕获的组件初始化崩溃；不据此新增备用数据 |

**完成边界：** 证明这个真实 Vue 入口可用及共享场景消费者被修复；不据此宣称全部业务示例、组件或浏览器通过。环境或依赖不可用时保留失败现场，报告缺口，不勾选实际运行项。

## Task 3：修正可复现命令并验证修复进入 CLI 安装

**Files:** 修改原实施计划的目录定义、任务 4/7/8 和结尾完成说明；生成 CLI Bundle；创建 `FIX_TMP/new-yss`、`FIX_TMP/installation-check.py` 及全新临时安装。

**Interfaces:** 消费任务 1 的注册表和任务 2 的三个修复文件；产出由当前工作树构建的二进制及安装结果。Spec 默认集合固定为 `setup-yss-harness, yss-product-lifecycle, yss-research, yss-stage-decision, grilling, domain-modeling, wayfinder, to-spec, yss-design-system, prototype, prototype-review, to-tickets, triage, llm-wiki, i-have-adhd, handoff`。

- [x] **1. 更正原计划的路径与验收描述。** `TPL/CLI` 固定为本计划工作树；可复制命令改为下列实际路径与引用变量，不保留主工作树构建命令。任务 4/8 明确补做的是一个真实 Vue 审批样本；结尾引用本修复计划，按实际结果区分已通过、未验证和未发行，不提前填写通过。
- [x] **2. 确认源后生成并构建。** 分别记录两个工作树当前 HEAD/状态，先断言两份 Spec 默认数组等于本任务固定集合且无重复。然后执行：

```sh
TPL=/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template
CLI=/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli
cd "$CLI"
go run -tags yss_nobundle ./tools/bundle --source-root "$TPL" --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o "$FIX_TMP/new-yss" ./cmd/yss
"$FIX_TMP/new-yss" version
"$FIX_TMP/new-yss" help
```

预期生成和构建均退出 0；`FIX_TMP` 必须使用前面创建的真实目录。来源使用本次实际 HEAD、`working-tree` 状态与新摘要，不复写正式发行记录。

- [x] **3. 检查 Bundle 内容而非仅看 HEAD。** 解压生成的 `bundles.json.gz`，按现有对象映射读取 Spec 注册表和三个修复文件；断言内容等于当前模板工作树，依赖列表符合任务 1。核对 sourceSnapshotHash/bundleHash 为本次生成值；不能只用相同 Git HEAD 判断工作树内容。Backend 不含 UI 资产，其专有覆盖及默认四项与修复前相同。
- [x] **4. 从新二进制执行临时安装验证。** 新建一次性 `installation-check.py`（可复用前次临时验证逻辑但改为本次路径和上述固定集合），执行 `python3 "$FIX_TMP/installation-check.py"`。两种安装分别运行 `init --profile spec --installation project|skills --root <不存在的新目标> --dry-run --json` 和实际 init；断言 dry-run 无写入，`skills list --root <实际目标> --json` 的 `result.installed` 真值集合恰为 16，且两种安装中的三个修复文件及其宿主副本匹配源。Backend 新建 skills 安装仍精确为四项；两个旧入口不在可用名单中。
- [x] **5. 核对当前公开导出与最终差异。** 公开清单未变化；若沿用上一轮公开暂存包作为交付，按既有导出规则在新临时目录重新生成，核对修复文件及包内引用，不能交付过期暂存副本。不重跑与本次未变代码无关的全部安装冲突矩阵；旧结果只能标注为前次已验证。
- [x] **6. 交付实际修复与证据。** 记录三项发现分别如何关闭、新二进制位置、实际安装和 Vue 操作结果；完成后更新本计划勾选与原计划说明。停止本次临时服务，清理仅属于本次且不需保留的材料。宿主重载/隐式调用、全 Vue/浏览器矩阵与正式发行仍单独列为未验证或未执行。

## 计划自检与执行衔接

三项审查发现分别由任务 1、2、3 负责；原设计中与此次修复有关的安装闭包、组件来源、实际交互、Backend 隔离和真实来源要求均有对应检查。五项 Review Focus 已映射到具体断言或浏览器操作。场景合同名称、临时目录和工作树路径在任务间一致；无新增持久验证框架、兼容方案或超出三项发现的重构。

用户已批准本修复计划，按 `executing-plans` 在原隔离工作树顺序执行。注册表、Vue 场景入口与说明已修复，Bundle 及新 CLI 安装验证已完成；独立只读审查未发现 Critical/Important/Minor 问题，临时浏览器与服务已关闭。验证与开发程序保留在 `/private/tmp/yss-spec-review-fixes.k3cnmddj/`；这些结果不是正式发行，未修改系统 CLI 或真实用户项目。
