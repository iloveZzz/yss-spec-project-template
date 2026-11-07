# Spec 设计能力升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的 SCRM 通用设计经验落实到现有 Spec 的设计技能、可消费主题和原型模式。

**Architecture:** 维护根 DESIGN 与共享 `.agents/skills/yss-design-system`，按实际消费关系同步 tokens、宿主副本与安装引用。复用原型作者资源和场景运行器，不增加独立 Design Profile。此计划可独立完成；[Frontend 计划](2026-11-07-frontend-scaffold-implementation-plan.md)消费 A1 的共享主题。

**Tech Stack:** Vue 3、固定 shadcn-vue 快照、CSS tokens、pnpm/Vite；现有 YSS Bundle 与 Profile 分发。

**Spec:** [已确认设计](2026-11-07-frontend-scaffold-integration-design.md)，重点第 9 节、第 10 节与第 11 节。

## Global Constraints

- 用户于 2026-11-07 确认整版设计并要求编制计划；本计划已按下方执行记录实施，验收结论只限实际执行范围。
- 工作仓为 `yss-spec-project-template`；SCRM 只读来源固定到 `a5a331548bf7d2d4c46153506c4b823b4bcd14eb`，不拉入或覆盖其未提交工作。
- 只增强现有 Spec；不新增 `design` Profile、身份、迁移或兼容路径。Spec 默认 16、Backend 默认 41 不变；Frontend 数量变化由配套计划负责。
- 新标准列表 48px、表格正文 14/22；主色 `#0d6be9`、正文 14/20、控件 32px、表头 48px、圆角 4px；必要边界 `#7d8aa0`、辅助文字 `#62728c`。
- 筛选工具区最小 46px，宽屏筛选列参考最小 360px、标签参考最小 70px；窄屏重排，不引发整页横滚。
- 项目已有 DESIGN 与选定原型优先；不批量迁移旧项目 36px 行高，不将业务外壳、医疗文案或 Care 局部 6px/24px 变体设为通用默认。
- 保留现有字体栈、强制颜色/减少动态效果适配与键盘焦点。固定 vendor 组件不改；头像来源未核实，不导入新增 webp。
- Spec 作者资源继续采用自己的 `assets/prototype/package.json` 与锁（当前 pnpm 10.32.1）；不因应用 starter 的 Node/pnpm/VueUse 基线而升级它。
- 不新增持久脚本、测试套件或统一门禁。验证使用直接命令、临时断言及临时原型；本文列出的命令均为后续实施命令。
- 开工时核对 HEAD/index/status；需要隔离时用 `codex/` 工作分支或 worktree，保护其他工作。提交只纳入当前任务文件，不自动推送、合并或发行。

## Review Focus

1. **已有项目采用 36px 与定制色：** 新默认不回写现有项目设计；A3 比较接入前后业务文件摘要。
2. **窄屏、矮窗口与长选项：** 筛选重排、弹层首尾选项及底部操作均可达；A2 实际操作验证。
3. **Teleport 与状态组合：** 必要边界、占位、半选、禁用、错误和 focus 不丢失主题；A1/A2 核对计算样式及键盘行为。
4. **未知场景和旧异步回调：** 错误不能回退正常数据，reset 后旧 ready 不能覆盖新场景；A2 使用既有运行器合同验证。
5. **按需安装缺少引用：** Spec project/skills、Frontend 可选设计技能均可独立使用；A3 检查安装结果及引用可达性。

## 文件与依赖

下文路径均相对模板仓；`D` 表示 `.agents/skills/yss-design-system`，是书写简化，不是新目录。

| 任务 | 文件与职责 |
| --- | --- |
| A1 | `DESIGN.md`、`D/assets/DESIGN.md`；`.template-spec/design/tokens/variables.css`；`D/assets/prototype-theme.css`、`D/assets/shadcn-vue-authoring/theme.css`；`D/assets/vue-business-patterns/patterns.css`、`business-controls.css`；`high-fidelity-default-theme.md`、`prototype-default-theme.md` 与 `standard-theme-patterns.md` |
| A2 | `D/SKILL.md`（仅必要入口调整）；`D/references/spec-design.md`、`product-prototype.md`、`shadcn-vue-prototype.md`、`standard-theme-patterns.md`、`business-patterns.md`、`component-recipes.md`；实际不符合新规则的自有 Vue 示例，优先 `ListDetail.vue`、`TeamPicker.vue`、`DateRange.vue`、`ComponentStates.vue` |
| A3 | 新增 `D/references/integration-source.md`；根与 Frontend 的 WorkBuddy 副本、既有 Claude 链接；`profiles/frontend/DESIGN.md`、Frontend/Backend 的 `.template-spec/design/tokens/variables.css` 副本；`.template-spec/design/README.md`；核对根/Frontend `bundle-profile.json` 的既有引用 |

不改 `prototype-review`、`prototype` 的相同内容，不导入 `implement`/`to-spec`/`to-tickets`。`theme.json`/`tokens.default.json` 只在已映射角色发生变化时同步；暗色、历史 compact 快照不参与本次亮色一致性声明。

## Task A1: 更新标准亮色主题及页面样式

**Files:** 修改上表 A1 文件；核对 `D/references/high-fidelity-default-theme.md`、`prototype-default-theme.md`、`standard-theme-patterns.md`。本任务不修改 vendor 快照、原型 package/lock 或运行器。

**Interfaces:**

- Consumes: 设计 §9.2 的值与语义角色；SCRM 9 个变化文件作为参考，不整体覆盖。
- Produces: 根 DESIGN 与 `assets/DESIGN.md` 同字节；现有 `--yss-components-table-row-height` 为 `48px`；新增 `typography.table-body` 角色及 `--yss-typography-table-body-font-size:14px`、`--yss-typography-table-body-line-height:1.5714285714285714` 表达 14/22；`--brand-*` 继续作现有桥接。Frontend B1 从这些文件取得主题，不另立值表。

- [x] **Step 1：记录受影响角色的现值。** 读取 DESIGN front matter 和实际 CSS，列出表格正文/行高、筛选区、占位、Checkbox、按钮边界和 hover 的映射；当前 row-height 为 36px，明确本次应变为 48px，其余已符合值保持。不要把 JSON 历史预设色板当成主题主源。
- [x] **Step 2：修改根规范与 token 投影。** 写入已确认的样式决定，补齐必要的新语义角色后同步 `variables.css`；表格行使用可自然增高的 height/minimum 语义，不能裁掉长内容。普通正文仍 14/20。将根 DESIGN 复制为技能内同内容副本。
- [x] **Step 3：更新实际布局与组件映射。** 在上述 4 个自有 CSS 文件落实筛选末列操作、窄屏收缩、平面列表 hover 和 Checkbox 强边界。沿用必要控件边界与占位色；不要把 SCRM 的浅色替换进默认值。可选导航/头像/顶栏只提供组合规则，不自动包围所有页面。
- [x] **Step 4：同步主题说明并做针对性静态断言。** `cmp DESIGN.md .agents/skills/yss-design-system/assets/DESIGN.md` 应无输出；临时解析/断言验证 row-height=48、table text=14/22、border-control=#7d8aa0、辅助色=#62728c，检查受改 CSS 使用的 `--yss-*`/`--brand-*` 变量均有定义。`git diff --check` 应退出 0。不恢复旧 token 生成器。
- [x] **Step 5：提交本任务受影响源文件。** 建议提交 `feat: align Spec standard theme and list patterns`；完整浏览器验证与副本同步在 A2/A3，提交说明不提前写验收通过。

## Task A2: 落实原型交互规范并验证代表页面

**Files:** 上表 A2 的参考与实际受影响示例；继续复用 `D/assets/scenario-runtime.js`、`vue-business-patterns/workspace.ts`、`workspace-model.js`、`workspace-page.ts`、`workspace-standard.config.json` 及其场景文件，不能为本次新建运行器。

**Interfaces:**

- Consumes: A1 主题；现有 Vue props/emits/slots；`window.prototypeScenarioContract` 和 `window.prototypeRuntime.{initialize,ready,fail,showError}`。
- Produces: 完整 UI Spec 的高保真原型/说明规则与可操作示例；维持 `initialize()` 返回的 `id,label,stateRef,data,ticket` 及 `ready(ticket)` 的过期回调保护，不变更合同结构。

- [x] **Step 1：补齐已有方法的具体规则。** 将设计 §9.3 的 8 条规则写入最相关的现有参考；入口只保留路由摘要，不复制整篇。明确完整交付与局部改稿、真实输入与模拟数据、共享 CSS 与局部变体；SCRM AGENTS 相对链接改为包内有效说明。
- [x] **Step 2：核对并局部调整现有示例。** `ListDetail.vue` 已有固定工具栏及“跨页保留、重置场景清除”，保留该选择语义，不为展示全选扩建业务表格。需要全选/半选的示例按其可选集合排除禁用项。确认式日期/团队选择器保留草稿和应用值、取消/Escape 与外部焦点；弹层用自有容器提供可收缩主体，保留标题/底部操作。不修改已经符合的逻辑。
- [x] **Step 3：在仓外临时目录组装一次代表原型。** 按 `shadcn-vue-prototype.md` 复制锁、`vite.config.ts`、所选 Vue 入口及依赖闭包和固定组件，核验组件清单 SHA-256、保留许可。优先复用 `workspace-standard.config.json` 组合列表；补入已有 `ComponentStates.vue`、`TeamPicker.vue`、`DateRange.vue` 所需演练即可。场景 JSON 包装为 `window.prototypeScenarioContract`，普通脚本先于 Vue 入口，tokens 在文档根装配。
- [x] **Step 4：运行实际工程检查。** 在临时原型目录使用其锁指定的 pnpm：`pnpm install --frozen-lockfile`、`pnpm exec vite build`、`pnpm exec vite --host 127.0.0.1`。预期安装与构建退出 0，页面可打开且无本次引入的控制台错误；命令失败则修复受影响源或明确条件缺口，不写“已运行”。
- [x] **Step 5：复用同一原型完成最小浏览器断言。** 桌面 1440×900、窄屏 390×844，加 500px 高窗口；检查下表并保存实际条件和发现。可用当前浏览器能力或临时 Playwright，不把工具和用例放进技能。

| 代表条件 | 必须得到的结果 |
| --- | --- |
| 短/长列表行与筛选操作 | 默认行计算高度至少 48px、正文 14/22，长内容增高；操作末列/窄屏换行；页面 `scrollWidth <= clientWidth`（必要二维内容仅在局部横滚） |
| 选中、翻页、重置 | 选择前后表格顶部坐标不变；跨页保留按原约定，重置场景清空；禁用项不能进入批量动作 |
| 确认式选择器 | 修改草稿后取消/Escape 保留原值，确认才应用；适用关闭回焦，点击/Tab 外部不抢焦；长选项首尾可达 |
| 小视口弹层与 Teleport | 标题和操作区在可用视口内，主体独立滚动，浮层计算色/字体正确，必要边界、错误、半选和焦点可辨认 |
| 场景与加载 | 未知 hash 显示错误，reset 后旧 ticket 不覆盖新状态；失败恢复不伪装空态；刷新直达与页间切换的共享样式一致 |

- [x] **Step 6：提交方法和必要示例修正。** 建议提交 `feat: strengthen Spec prototype interaction guidance`；附实际运行范围，来源已有测试不能算本次结果。A1 样式无新变化时不重复安装或构建。

## Task A3: 同步分发并证明安装后可用

**Files:** 上表 A3 文件；安装引用和共享资源路径按当前 Profile 政策读取，不创建新 Profile。副本以共享源为准，不能反向覆盖源。

**Interfaces:**

- Consumes: A1/A2 的最终共享内容，以及现有 project/skills 两种安装集合。
- Produces: Spec 默认安装可用、Frontend 可选安装同内容的 design-system；供 B1 使用的最终主题；来源说明留在技能包内并由正文相对链接可达。

- [x] **Step 1：记录来源与适配。** 新建 `D/references/integration-source.md`：固定 SCRM 比较提交、9 项变化/1 个排除头像、采用与舍弃值、作者资源与 vendor 的边界、实际验证及限制；保留原上游记录，不把本地摘要写作上游版本。更新 `.template-spec/design/README.md` 的默认规范说明。
- [x] **Step 2：同步实际消费副本。** 根 `.workbuddy/skills/yss-design-system/` 和 `profiles/frontend/.workbuddy/skills/yss-design-system/` 与主源同字节；核对根 `.claude/skills/yss-design-system` 既有链接。同步上表列明的 DESIGN/tokens；Backend 不新增 DESIGN 文件或设计技能。根与 Frontend 锁当前均无 `effectiveHash`，不补字段；Backend 技能树未改，不动其哈希。
- [x] **Step 3：打包候选并演练安装。** PATH 上 CLI 实测为 3.1.4，不能用于本次验证。在隔离 CLI checkout 执行下列已有命令，使用输出的绝对二进制路径演练 Spec project/skills 和 Frontend 两种范围，再对 Frontend 执行 `skills ensure yss-design-system`。此处不依赖尚未实现的 `scaffold frontend`，不替换全局安装。

```sh
cargo run --locked --bin yss-bundle -- --source-root /absolute/template-checkout --out assets/bundle.tar.gz
cargo build --locked --release --bin yss --target aarch64-apple-darwin
```

确认报告来源指向本次模板。Spec 两种安装已引用 tokens，Frontend 两种安装已引用 tokens 与 prototype-review 方法；新增来源说明放在技能内，不需要扩大外部引用。

```sh
# 路径替换为上一步隔离 checkout 的实际产物；不使用 PATH 中的 yss。
candidate_yss=/absolute/cli-checkout/target/aarch64-apple-darwin/release/yss
design_check_root="$(mktemp -d "${TMPDIR:-/tmp}/yss-design-check.XXXXXX")"
"$candidate_yss" version --json
for installation in project skills; do
  "$candidate_yss" init --root "$design_check_root/spec-$installation" --profile spec --installation "$installation" --json
  "$candidate_yss" init --root "$design_check_root/frontend-$installation" --profile frontend --installation "$installation" --json
  "$candidate_yss" skills ensure yss-design-system --root "$design_check_root/frontend-$installation" --json
done
```

- [x] **Step 4：核对安装结果。** 校验全部修改文件副本摘要一致、相对链接可达、设计 token 存在、无 SCRM 运行路径或未知 webp；Spec 默认 16、Backend 默认 41 不变。Frontend 在仅完成 A 时仍为 12/16，配套 B 完成后为 13/17。从至少一个实际安装环境复用 A2 原型验证资源闭包；其余模式以相同字节与引用检查复用结果，不机械重复整套浏览器操作。
- [x] **Step 5：验证既有项目保护。** 复制一个包含定制 DESIGN/36px 样式的临时项目，按真实授权接入 skills，比较接入前后业务文件摘要；预期不更改应用样式、业务源码或设计。遇现有受管冲突按原规则拒绝，不为了让安装成功覆盖用户文件。
- [x] **Step 6：提交分发同步。** 建议提交 `feat: distribute upgraded Spec design resources`；记录模板提交与打包时真实来源状态，交接给 B1。候选若按 working-tree 打包就如实记录，不能把随后提交的 HEAD 写成本次已验证的 committed 来源。只清理本任务创建且可确认归属的临时材料。

## 覆盖与交接

| 设计要求 | 任务 |
| --- | --- |
| §9.1 选择性采纳与来源 | A1、A3 |
| §9.2 样式数值、旧项目优先 | A1、A3 |
| §9.3 方法和交互 | A2 |
| §9.4 作者资源、共享源、安装闭包 | A2、A3 |
| §9.5 及 §11 的 Spec 验收 | A2、A3 |
| 与应用 starter 共用主题 | A1 输出、B1 消费，B5 最终核对 |

计划自查：已检查覆盖、步骤可执行性、合同字段与边界一致性；没有把旧来源测试写作执行结果。实施时维护复选框和实际结果即可，不另建统一验收报告系统。人工读屏、其他浏览器、真实触摸和生产 API 未覆盖时明确保留限制。

## 执行记录（2026-11-07）

A1–A3 已实施，功能提交 `16c8bab9`、`0fb39cc3`、`fcfb8301`。共享主题、宿主副本与 Profile token 一致；保留原型依赖锁及固定 vendor 字节。浏览器发现并修复停用员工仍可选的问题。

临时原型完成 pnpm 10.32.1 冻结安装、Vite 构建；Chromium 1440×900、390×844、1440×500 验证 48px/14/22、选择/翻页/重置、确认/取消/Escape、焦点、长选项滚动、Teleport 主题、日期操作、未知场景和过期 ready ticket。实际四种安装的资源一致，从安装后的技能重放原型；36px 定制 DESIGN 与业务 CSS 接入后不变。

首次安装候选 Bundle 摘要 `821fb3d9ac9602881fe0ee110073db41bb02e2e84c821e74a3f4c9e60c1971d6`，打包来源为 `0fb39cc3` 的 working-tree，后续提交不追认该次为 committed。共享技能最终整合与干净候选结果见 Frontend 配套计划。其他浏览器、人工读屏、真实触摸及生产 API 未验证；没有新增 Design Profile，也没有执行推送或发行。
