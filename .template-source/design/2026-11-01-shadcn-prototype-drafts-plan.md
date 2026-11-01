# Shadcn 组件统一与低保真草稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 沿用用户已选择的本会话顺序执行方式。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将产品 UI 原型、低保真草稿及其评审工具统一到 Vue + shadcn-vue，移除独立原生 HTML 路线，并实际检查点击/展开后的表单黑边。

**Architecture:** 沿用现有工作区、场景运行器、固定组件和 Vite 工具链；作者层以 shadcn 控件替换原生控件，主题问题在实际根因所在的共享适配层处理。低保真使用一个 Vue 教学组件及三种组织方式入口，比较工具改为 Vue 并保留消息校验与恢复行为；最后同步副本并重建 CLI。

**Tech Stack:** Vue `3.5.40`、reka-ui `2.10.1`、现有 Tailwind/Vite package 与 lock；Node `^20.19.0 || >=22.12.0`、pnpm `10.32.1`；CLI Go `1.27.1`。

**Spec:** [已批准设计](2026-11-01-shadcn-prototype-drafts-design.md)，用户选择 A 并确认黑边在“点击或展开后”出现；已于 2026-11-01 批准设计。

## Global Constraints

- 低保真草稿和完善后的产品 UI 共用 Vue + shadcn-vue；移除独立原生 HTML 制作路线，不提供旧路径兼容、迁移或 fallback。
- 有对应组件的作者侧可见控件使用真实 shadcn；结构标签、Vite HTML 挂载页、组件内部 DOM 与隐藏输入允许存在。
- 组件固定提交 `67c9a3926dc0a854507b325c6337ff2210d16379`；不升级依赖，不修改已有 vendor 字节，不新增表单库、构建器或路由器。
- Spec 完整交付仍包含规格、原型及说明；低保真不取消核心操作、状态、失败与恢复。独立 `prototype` 的无 UI 逻辑试验不改载体。
- 两种 Spec 默认精确保持 16 项：`setup-yss-harness`、`yss-product-lifecycle`、`yss-research`、`yss-stage-decision`、`grilling`、`domain-modeling`、`wayfinder`、`to-spec`、`yss-design-system`、`prototype`、`prototype-review`、`to-tickets`、`triage`、`llm-wiki`、`i-have-adhd`、`handoff`。
- Backend 默认保持 `setup-yss-harness`、`implement`、`code-review`、`handoff`；专有覆盖和 UI 排除规则不变。
- 不创建永久脚本、测试套件或审批资产；验证材料放在仓外临时目录。保留校验、错误处理、权限、焦点、文件保护及既有安装事务能力。
- 不覆盖当前未提交工作，不修改用户已有原型，不自动提交、推送、发布、替换系统 CLI 或同步真实用户项目。源锁保留真实上游信息，根锁不新增 `effectiveHash`。

## Review Focus

| 失效条件 | 预期及负责检查 |
|---|---|
| 点击/展开后 Token 丢失，或错误字段获得焦点 | 任务 1：记录实际 border/outline/shadow；Portal 中主题有效，错误边框保留且焦点清晰 |
| 原生事件改为组件 model-value，浮层打开时重置或退出 | 任务 2：场景 ID/布尔值正确，弹层关闭、旧状态清除、焦点回到存在的控件 |
| 草稿误复用现有审批权限规则 | 任务 3：教学三条资料均能处理，首次失败全部保留，不引入 M-002 禁用或部分成功 |
| 切换 iframe 后收到旧消息、错误摘要或超时消息 | 任务 4：仅当前 frame/requestId 的匹配 ready 有效，失败可恢复，迟到消息不覆盖结果 |
| 源删旧资源但安装仍残留，或组件快照未进入副本 | 任务 5：安装/公开暂存包包含新闭包、不含旧路线，16/16/4 名单和 Backend 保护成立 |

---

## 工作目录与文件责任

`TPL` = `/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template`；`CLI` = `/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli`。下文 `DS` = `TPL/.agents/skills/yss-design-system`，`VP` = `DS/assets/vue-business-patterns`。

执行开始时以 `mktemp -d /private/tmp/yss-shadcn-drafts.XXXXXX` 创建 `SHADCN_TMP`，记录两仓当前 HEAD/状态及非忽略文件摘要；另保存 Backend Bundle、专有源、已有 vendor 和 package/lock 的字节基线。既有 Spec 修复不重做、不回退。临时记录随工作推进更新，不把未执行项勾选为完成。

| 任务 | 文件责任 |
|---|---|
| 1 | `DS/assets/shadcn-vue-authoring/theme.css`、`DS/assets/prototype-theme.css`、`VP/refinement.css` 中有复现依据的最小主题修复；`DS/references/shadcn-vue-prototype.md`、`product-prototype.md` 的 Token 准备说明 |
| 2 | `VP/Workspace.vue`、`workspace.css`、`ComponentStates.vue`；四个 Collapsible 快照文件、随包 manifest；component-recipes/shadcn-vue-prototype 的组件数量和选择规则 |
| 3 | 新建 `VP/ApprovalDraft.vue`、`approval-draft.scenarios.json`、`draft.css`、三个草稿入口及配置；扩展 `mount.ts`/`workspace.ts` 的既有 appearance；删除三个旧 HTML 目录；更新低保真相关参考 |
| 4 | 新建 `DS/assets/comparison/Comparison.vue`、`main.ts`；调整现有 `index.html`/`comparison.css`，移除旧 `comparison.js`、`review-ready.js`；更新 comparison-tool/concept-comparison |
| 5 | 设计技能入口、关联 prototype-review 方法、实际受影响副本/清单；CLI 忽略 Bundle、仓外开发程序及全新安装验证 |

顺序为 1 → 2 → 3 → 4 → 5。每项同步自己改变的 WorkBuddy 文件；最后核对完整闭包，避免任务间把旧副本当成源。任务 3/4 复用任务 1 的主题规则、任务 2 的共同控件，不新建第二套状态运行器。

## Task 1：复现点击/展开黑边，收敛主题状态

**Files:** 上表任务 1 的文件；只读 `Input.vue`、`Textarea.vue`、`InputGroup.vue`、`SelectTrigger.vue`、`SelectContent.vue` 及实际页面消费者。临时样本与观察置于 `SHADCN_TMP/samples/`，不改 vendor。

**Interfaces:** 保留 `--brand-*`、`--yss-*` 与 `@theme inline` 当前角色接口；后续控件统一消费这套映射。若没有复现，产出明确未复现记录及验证过的状态，不制造一个 CSS 修补。

- [x] **1. 组装原样样本。** 按现行方法使用 ComponentStates、MultiStep、ListDetail 的实际入口和导入闭包；复制固定 package/lock、Vite 配置及已核验组件。正确加载当前模板 `.template-spec/design/tokens/variables.css` 或实际项目 Token，再加载语义映射、布局与页面样式；不要再次把 `prototype-theme.css` 当成变量定义。临时补充独立 Input、错误 Select、只读与禁用控件用于实际状态观察，均使用真实组件。
- [x] **2. 执行基线复现。** 在样本目录以 pnpm `10.32.1` 执行 `pnpm install --frozen-lockfile`、`pnpm exec vite build`，再 `pnpm exec vite --host 127.0.0.1`。浏览器实际操作鼠标点击、Tab、展开/选择/Escape，记录出问题的具体元素、截图、border/outline/box-shadow、focus-visible、open 状态及匹配 CSS 来源。预期获得可重复失败，或明确当前浏览器/样本未复现；构建成功不是黑边验证结果。
- [x] **3. 为实际状态建立临时断言。** `form-focus` 等动画结束后读取实际计算样式，逐侧核对 border 的颜色、宽度与样式，并检查可见 outline 的颜色/宽度/偏移及 box-shadow，不能只匹配 outline 中是否出现纯黑；控件只保留一个外部焦点提示，弹层允许符合样本角色的投影；`group-focus` 检查外层边框/焦点、内层无第二描边；`select-open-close` 检查 Portal 主题、选项高亮和关闭焦点；`invalid-focus` 检查错误仍可见；`disabled-readonly` 检查禁用不可操作、只读内容保留。若实际复现，记录修复前失败；未复现则记录这些检查的真实结果。另在临时浏览器分别注入黑色边框、焦点线、阴影及 InputGroup 内层描边，确认断言会失败，再确认未注入的正常样本通过；这些验证反例不得当成用户原问题已复现。当前模板样本的普通边框为 `#d9d9d9`、主操作角色 `#245bdb`、错误边框角色 `#f5222d`，这些是样本期望，不是对其他项目的硬编码要求。
- [x] **4. 在实际根因位置做最小修复。** Token 缺失则修正实际装配和参考；CSS 状态冲突则在已有主题适配层修正对应状态并移除被取代的重复覆盖。优先让单个控件或 InputGroup 外层拥有一个清晰焦点提示；错误优先于普通 hover/focus 边框。不全局关 outline、不全局去 border、不修改 vendor。未复现则跳过推测性 CSS 修改，保留诊断结果。
- [x] **5. 补齐准备说明。** 在两份参考中明确 Token 定义、shadcn 映射、布局样式各自职责以及 Portal 所需的全局变量范围；缺变量要报告/补齐，不能把零错误构建当成样式正确。
- [x] **6. 重跑受影响状态。** 同一基线、依赖、内容和视口比较前后，以上断言通过，错误文字/关联、Tab 和焦点返回仍可用。保存实际结果与未复现范围，同步本项改动的 WorkBuddy 文件。

## Task 2：工作区评审工具全部使用 shadcn 控件

**Files:** `VP/Workspace.vue`、`workspace.css`、`ComponentStates.vue`；新建 `DS/assets/shadcn-vue-authoring/ui/collapsible/{Collapsible.vue,CollapsibleContent.vue,CollapsibleTrigger.vue,index.ts}`；修改其 `registry-manifest.json` 及 `references/component-recipes.md`、`shadcn-vue-prototype.md`。扩展 manifest `assets/prototype/registry-manifest.json` 已有记录，不重写其来源。

**Interfaces:** `changeScenario(id: string): void` 接收所选 ID；`transparency(checked: boolean): void` 继续写 `data-transparency`。组件事件在模板按固定 reka-ui 实际值类型缩窄到 string/boolean，不能把 DOM Event 当作值。场景来源仍为 `prototypeScenarioContract.scenarios`，`reset()` 和 runtime initialize/ready/fail 的合同不变。

- [x] **1. 建立实际组件与行为基线。** 临时检查记录评审区当前原生 select/button/checkbox/details，并在审批样本保存四场景切换、失败重试、重置、未知 hash 与缺合同结果。这里既检查作者源的真实 import/使用，也操作页面；不能仅按 DOM 中存在 button/input 判失败。
- [x] **2. 补齐 Collapsible 快照。** 从扩展 manifest 的固定 source_url 获取四个已登记文件至临时目录，逐项比对现有 SHA-256，再放入随包快照，保留许可。预期随包组件为 **28 组 / 184 文件**，原 180 个文件摘要不变，package/lock 不变；若实际导入显示额外依赖，先记录来源并核对，不猜测下载。
- [x] **3. 替换评审区控件。** 使用 Collapsible/Trigger/Content、Button、Select/Trigger/Value/Content/Item、Checkbox、Label。保留 `scenario`、`reset`、`solid-surfaces` 的可定位 ID/标签与原文；非提交 Button 明确 `type="button"`。按上述值接口改事件，管理 Select/Collapsible 的真实打开状态；重置或组件卸载关闭遗留浮层，合理恢复到仍存在的触发器。
- [x] **4. 调整本地布局与说明。** `workspace.css` 将依赖原生 summary/select 的布局迁到组件及 data-slot，不重复定义任务 1 已统一的焦点规则；说明中删除“独立评审工具可用原生 select”的豁免。相关 27 组文案改为 28 组，组件状态页无需为此新增整套演示。
- [x] **5. 验证值、键盘与生命周期。** 通过真实 Select 选择 primary/failure/no-permission，观察 URL 与数据对应；Checkbox 开关改变透明效果且不重置业务数据。测试键盘打开/选择/关闭、焦点返回、选择后重置、未知 hash 后恢复；更换场景不遗留 Portal。临时 vendor 摘要断言通过，原生作者控件检查变绿；同步副本。

## Task 3：用共享 Vue 草稿替换三套 HTML 作者资源

**Files:** 新建 `VP/ApprovalDraft.vue`、`approval-draft.scenarios.json`、`draft.css`；新建 `approval-draft-single.ts`、`approval-draft-batch.ts`、`approval-draft-queue.ts` 和三个同名 `.config.json`。修改 `VP/mount.ts`、`workspace.ts`；修改 `DS/references/low-fidelity-exercise.md`、`product-prototype.md`、`business-patterns.md`、`prototype-default-theme.md`。删除 `DS/assets/{offline-html,native-workbench,low-fidelity-exercise}/` 及对应根 WorkBuddy 目录。

**Interfaces:** `ApprovalDraft` props 为 `{scene, mode: 'single' | 'batch' | 'queue'}`；scene 沿用运行器返回的 `{id,label,stateRef,data,ticket}`，data.rows 为 `{id,name,owner,status}[]`。三个入口用小型 Vue 页面包装传入固定 mode，调用现有 mount；不为 mode 扩充工作区业务配置。既有 `appearance` 联合增加 `'draft'`，通过原有 `data-appearance` 表达，三个入口使用 draft，标准/glass 消费者不变。配置沿用 `{schema_version:1,title,entry,scenarios}`。

- [x] **1. 固定教学输入和断言。** `approval-draft.scenarios.json` 沿用 `{schema_version:1,scenarios:[...]}`：primary（正常）与 failure（处理失败）的 `initial_data.rows` 均取现有 `approval.scenarios.json` primary 的三条资料，仅复制 id/name/owner/status 四个字段；不复制权限规则、version、server_rows 或其他业务状态。`state_ref` 均为 `.agents/skills/yss-design-system/references/low-fidelity-exercise.md`。因此资料为 M-001/季度经营分析资料/张明/已更新、M-002/跨部门业务协作与异常处理说明（长名称示例）/李华/待核对、M-003/归档清单/王宁/已更新。保存临时行为期望：三条均可处理；首次 failure 动作一项也不删除、选择保留；重试删除恰当集合；重置恢复三项、空选择、首次失败状态。新入口缺失时检查应失败。
- [x] **2. 实现一个草稿组件。** `act(ids: string[]): void` 只处理显式选择；首次 failure 保留全部状态，下次成功移除所选。single 在全列表逐条操作，batch 支持选择全部/通过所选，queue 按当前编号顺序仅展示待处理首项。使用真实 Button/Checkbox/Label/适用反馈组件，不复用 Approval.vue 的“李华资料不齐”和部分成功规则。
- [x] **3. 接入入口与草稿外观。** 三个配置均指向同一场景 JSON、相应入口和同一组件；沿用工作区重置卸载机制，不另加运行器、router 或状态全局。`draft.css` 仅在 draft 外观下简化装饰/层次，保留语义颜色、边界、焦点和错误；作者可在同一页面改为 standard 后继续完善，不新增用户可见的保真度开关。
- [x] **4. 切换当前文档并删除旧实现。** 低保真演练改为三份 Vue 配置的组装说明；product-prototype 删除 HTML fallback、旧选项全局和三目录复制指引；主题/模式参考说明共用组件与场景。删除旧三个目录及副本，不删除 scenario-runtime.js、prototype-theme.css 或独立 prototype 技能；历史事实文档不批量改写。
- [x] **5. 实际运行三个模式。** 在同一组 primary/failure 输入下逐个执行处理、失败、重试、重置，并检查 M-002 确实可处理。桌面 1440×900 与窄屏 390×844 完成代表操作；临时切换同一草稿页面为 standard，确认数据/场景/动作相同，随后恢复样本设置。预期三模式行为全部符合第 1 步，源码和副本不再有三个旧资源目录。

## Task 4：比较工具改为 Vue，保留严格初始化校验

**Files:** 新建 `DS/assets/comparison/Comparison.vue`、`main.ts`；修改 `index.html`、`comparison.css`；删除 `comparison.js`、`review-ready.js`；修改 `DS/references/comparison-tool.md`、`concept-comparison.md`。只复用原消息协议，不改候选侧 `assets/scenario-runtime.js`。

**Interfaces:** 保留 `window.prototypeComparison = {title,variants:[{id,label,entry}],cases:[{id,label,scenario,dataDigest}]}` 作为作者数据；`main.ts` 在数据脚本之后加载，创建 Vue 应用挂到 `#app`。候选 URL 仍为相对 entry 加 `#scenario=...`；外壳 hash 为 `#variant=...&case=...`。消息仍为 `yss-scenario-request` / `yss-scenario-result`，保留 requestId、scenarioId、dataDigest 及 pending/ready/error 状态，超时仍为 **8000 ms**。

- [x] **1. 建立协议基线。** 将任务 3 的三个入口作为比较候选，使用相同场景摘要；临时故障候选分别发错误摘要、error、迟到 ready，或不回复。断言：未知/重复/多余 hash 参数明确失败；当前 frame/requestId/scenarioId/dataDigest 全匹配才显示已初始化；旧 frame 或旧 requestId 无效；8000 ms 无有效结果显示超时。原生工具控件检查在旧实现上失败，协议行为先记录已有结果。
- [x] **2. 实现 Vue 外壳。** Comparison.vue 使用 Select/Label/Button，保留原尺寸链接、当前比较链接、iframe、status/alert。让一次候选加载拥有新 frame 身份、requestId 和计时器；选择和重置重新创建 frame，取消旧计时器；message 仅接纳当前请求，error/timeout 后使该次请求失效，卸载移除监听和计时器。数据缺失、候选/场景空集合或 hash 无效显示可理解错误，不能崩溃或偷换成正常候选。
- [x] **3. 接入现行工具链并移除旧脚本。** index.html 只承担 Vue 挂载及作者数据/模块入口顺序；现有 comparison.css 负责页面布局，组件边框/焦点由任务 1 的映射层提供。删除旧 DOM 操作脚本与无消费者的 load 提示脚本，更新复制/运行指引；不承诺 file:// 离线运行，不保留旧脚本转向。
- [x] **4. 重跑协议与真实交互。** 在实际浏览器依次切换候选/场景、重置、单独打开候选，确认同数据及失败重试；在等待中切换候选，再发旧 ready，当前状态不能改变。错误摘要、重复 hash、超时之后的迟到 ready 都不能显示成功；重新选择有效候选后可恢复。同步完整 comparison 副本，避免只新增 Vue 而仍分发旧 JS。

## Task 5：统一入口与复核说明，验证真实分发

**Files:** 修改 `DS/SKILL.md` 以及前述参考的剩余现役冲突；修改 `TPL/.agents/skills/prototype-review/references/review-method.md`、`component-qa.md`，同步对应 WorkBuddy。按实际资源变化维护 `.template-source/distribution/bundle-profile.json`、注册表/公开清单已有条目，不凭空改默认名单或来源锁。生成 `CLI/internal/bundle/assets/bundles.json.gz`；开发程序和安装验证置于 `SHADCN_TMP`。

**Interfaces:** 消费任务 1–4 的完整技能树与固定名单；输出可安装的 Vue 草稿、工作区/比较工具、28 组快照与准确说明。CLI Go 源码不预设修改。

- [x] **1. 收敛现役规则。** 入口明确低保真/完善版共同路线、实际 shadcn 控件要求及结构标签边界；复核方法加入点击/展开、错误+聚焦、InputGroup 与 Portal 检查。删除当前方法中的轻量 HTML/评审工具豁免；明确无法复现黑边时的实际范围。已标历史的 design.md、model-publishing-interaction.example.md 保留历史事实，不恢复其旧流程。
- [x] **2. 检查源与副本闭包。** 临时断言检查所有新增 entry/config/import/reference 可达；原 180 vendor 摘要、package/lock、许可证不漂移，新 4 文件等于固定清单；根 WorkBuddy 与源一致，Claude 链接可达。扫描作者源而不是 vendor DOM；三个旧 HTML 目录和旧比较脚本不在当前资产中。确认 prototype/Backend 专有内容、默认名单及来源锁未被误改。
- [x] **3. 完成同工具链构建与组合验证。** 临时 Vite 验证项目以多入口配置覆盖控件状态、审批、三个 draft 与 comparison 页面，不将这份验证配置分发进技能。执行 `pnpm exec vite build`，预期退出 0；实际操作受任务 2–4 共同影响的路径与任务 1 状态，报告黑边已复现修复或未复现，不把协议握手称为业务验证。
- [x] **4. 从实际工作树重建 CLI。** `SHADCN_TMP` 使用执行开始时创建的真实目录，在 CLI 工作树执行：

```sh
TPL=/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template
CLI=/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli
cd "$CLI"
go run -tags yss_nobundle ./tools/bundle --source-root "$TPL" --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o "$SHADCN_TMP/new-yss" ./cmd/yss
"$SHADCN_TMP/new-yss" version
```

预期均退出 0，来源为实际 HEAD/working-tree/内容摘要，不编造发行标签或提交忽略 Bundle。

- [x] **5. 验证两种全新安装和 Backend。** 用新程序分别对不存在目标执行 `init --profile spec --installation project|skills --root <target> --dry-run --json`，断言不创建目标且预览恰为 16 项；再实际 init 并读取 `skills list --json`。断言真实安装恰为 16/16，新增草稿/比较/Collapsible 文件及说明匹配源，旧资源/脚本不存在，宿主副本一致。Backend skills 实装仍为 4 项，其有效 Bundle 和专有内容与本次基线一致、无新增 UI 资产。
- [x] **6. 更新公开暂存与交付记录。** 在新的仓外目录按既有公开清单重建选定 Spec 技能暂存包，转换为包内可达引用并验证新增依赖/删除项；不复用旧暂存包冒充当前结果，不发布。检查最终差异仅限本计划及必要副本；记录具体修复、真实运行、未复现/未验证范围、新程序位置。关闭本次服务/浏览器，保留必要证据和未提交工作树，不删除用户资源。

## 自检与执行衔接

设计 §3 由任务 2/5 落实，§4 由任务 2/3/4 落实，§5 由任务 1 与后续共享状态验证落实，§6–7 由任务 5 收敛并核对分发。五项 Review Focus 均有明确的行为检查；场景合同、appearance、组件事件和消息字段在任务间一致。

自检已区分黑边“复现后修复”与“当前未复现”，没有把推测写成已知原因；保留草稿教学与审批权限两套不同的既有规则；没有增加兼容、生产实现、永久验证框架或无消费者的抽象。

设计和本计划已获用户批准执行。沿用 `executing-plans` 在当前会话顺序实施；五项实施与分发验证已执行；独立审查发现的两项键盘焦点问题已在同一修复批次完成 RED→GREEN 回归验证。黑边在固定样本未复现，未推测修改 CSS；安装核对补齐了默认 Token 文件引用。

执行结果：固定组件 28 组/184 文件摘要一致；三种草稿桌面/窄屏正常与失败恢复通过；比较协议、非法配置和 8 项焦点检查通过。修复后重新构建 Vite/CLI 并全新安装验证 Spec project/skills 各 16 项、Backend 4 项，Backend 内容摘要保持不变。未提交、推送、公开发布或替换系统 CLI。

复核修正（2026-11-01）：Token 路径已改为实际存在的 `.template-spec/design/tokens/variables.css`。主题断言改为等待动画结束后逐侧检查边框，并核对可见 outline 和实际 box-shadow。未注入样本 16 项通过；8 类黑边/阴影反例均被断言拒绝，包含保持原宽度只改黑色边框的情况。此项替代先前不足的 11 项主题检查，不代表用户原始黑边已复现或已修复；本轮未改组件或重建 CLI。
