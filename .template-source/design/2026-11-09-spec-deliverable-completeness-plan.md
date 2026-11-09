# Spec 交付完整性增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有三类 Spec 交付内落实业务信息、权限、完整流程、可复现验收、版本说明，并交付同一功能的贯通教学示例。

**Architecture:** 增强现有模板及其技能指导，业务规则保留单一权威位置。示例源保存在设计技能中，复用既有 Vue 页面壳、固定组件、主题和场景运行器，在新目录组装为可操作原型。最后同步实际副本及显式分发资源，不改变 Profile 默认集合。

**Tech Stack:** Markdown、JSON、Vue 3、TypeScript、固定 shadcn-vue 快照、现有 pnpm/Vite 和 Node 断言。实际依赖以 `assets/prototype/package.json` 和锁文件为准，不升级。

**Spec:** [已批准设计](2026-11-08-spec-deliverable-completeness-design.md)。用户于 2026-11-09 批准，执行者须先读设计全文。

日期：2026-11-09。状态：用户于 2026-11-09 批准执行；三项任务已完成，独立整体复核未发现需要修正的问题。本仓忽略 `docs/superpowers/`，沿用 `.template-source/design/` 保存，不改忽略规则。

## Global Constraints

- 限定本仓模板、共享技能方法、教学作者资源和受影响分发引用；不修改 SCRM、CLI 源码或用户消费项目。
- 继续只交付业务规格、高保真交互原型、交互说明三类内容，可共用文件；完整有 UI 交付的高保真要求保持。
- 简单关系可用短段落，复杂条件再使用表格；普通查询不建完整规格，局部改稿只更新受影响内容；未知不能写成不适用。
- 业务含义、字段、唯一性、权限和状态归 Spec；页面复现方法归交互说明；实际检查与预期分开，沿用已有 FR/AC 或具体章节。
- 不新增 Profile、技能入口、路由库、生产 Store、生产 API、数据库设计、维护脚本、测试套件或统一审批/测试报告。
- 新示例教学规则自足，旧 `ordinary-source.md` 和旧 Q-001 不改变。新设定不得冒充真实业务确认。
- 复用固定组件 revision `67c9a3926dc0a854507b325c6337ff2210d16379`、原型 pnpm `10.32.1`、既有 package/锁和 Token；不改 vendor、全局主题或全局工具配置。
- 示例只使用内存和模拟附件齐备状态；失败保留输入、取消不写回正式值，刷新和重置回到场景起点。
- Spec 16、Backend 41、Frontend 13 项默认集合保持；Frontend 设计能力继续按需安装；Backend 专有同名技能不被覆盖。
- 不把真实业务文件或 `node_modules` 写入技能目录；检查用新临时目录和临时断言。提交、推送、公开同步、Bundle 构建及发行均未获本次授权。
- 开始执行时核对工作区和受影响源；不覆写并行修改，不重建或迁移现有用户原型。

## Review Focus

1. 简单/局部/无 UI 需求：模板不强迫空表、全量补建或虚构页面；任务 1 以三个阅读案例核对。
2. 范围外记录和观察者：不可显示越权详情或执行写动作，已提交也不能再写；任务 2 的纯函数断言和浏览器场景核对。
3. 校验拒绝后再模拟失败：无效提交不消耗首次失败次数；失败和清单读取失败保留输入，重试重新校验；任务 2 连续操作核对。
4. 草稿退出和场景重置：留在当前页保留输入，放弃不写回，保存更新基线，重置清除错误与模拟次数；任务 2 核对正式值和编辑值。
5. 分发边界：Spec 两种安装都取得模板，Frontend 补装设计后取得新增资源，叶子复核方法仍可独立使用；任务 3 计算选择闭包并比较副本。

---

## 文件结构与依赖

以下路径相对仓库根。`D` 仅为 `.agents/skills/yss-design-system` 的书写简写。

| 任务 | 修改/新增内容及责任 |
|---|---|
| 1 | `.template-spec/templates/spec-template.md`；`.template-spec/design/templates/{interaction-spec-template,state-matrix-template,prototype-review-checklist}.md`；四项共享技能参考及设计 README |
| 2 | 新增 `D/assets/spec-delivery-example/{README.md,spec.md,interaction.md,model.ts,AttachmentSubmission.vue,entry.ts,scenarios.json}` |
| 3 | 根及 Frontend `bundle-profile.json`；受影响 WorkBuddy 副本；Backend 已有三个模板副本；核对 Claude 链接及保护边界 |

依赖顺序为任务 1 → 任务 2 → 任务 3。每项都交付可单独核对的结果，示例安装与运行准备并入任务 2。

## Task 1: 增强现有规格、交互模板及共享指导

**Files:**

- Modify: `.template-spec/templates/spec-template.md`。
- Modify: `.template-spec/design/templates/interaction-spec-template.md`。
- Modify: `.template-spec/design/templates/state-matrix-template.md`。
- Modify: `.template-spec/design/templates/prototype-review-checklist.md`。
- Modify: `.agents/skills/yss-stage-decision/references/business-analysis.md`。
- Modify: `.agents/skills/yss-product-lifecycle/references/spec-workflow.md`。
- Modify: `D/references/product-prototype.md`。
- Modify: `.agents/skills/prototype-review/references/review-method.md`。
- Modify: `.template-spec/design/README.md`。

**Interfaces:**

- Consumes: 设计第 4–6 节的权威位置、适用条件及填写结构。
- Produces: Spec 内的采用版本、业务信息、权限、任务流及 AC 定位；交互说明内的页面覆盖和可复现场景；任务 2 按相同字段填写完整示例。
- 业务信息表使用设计第 5.2 节的两张表；权限表使用第 5.3 节。页面制作状态使用“可操作、静态展示、仅说明、未覆盖”，验证状态单独使用“实际验证、未验证或失败”。

- [x] **Step 1：核对受影响段落和既有委托。** 保留三类内容、局部任务、纯展示、无 UI、未知及授权边界；确认 `to-spec` 仍通过共享方法工作，不另写模板。
- [x] **Step 2：修改 Spec 模板。** 按设计第 5 节增加轻量版本/来源、业务对象及字段、条件式权限、角色任务流和可复现 AC；唯一性范围、默认含义和保存后可改条件必须可表达，不补造生产长度或技术模型。
- [x] **Step 3：修改三个设计模板。** 交互说明补全范围地图和初始输入/入口/步骤/结果/重置/实际检查；状态矩阵只补场景定位；复核模板补版本、代表数据与覆盖差异，不新增必需文件。
- [x] **Step 4：更新四项技能参考及设计 README。** 方法引用模板而不复制整篇；设计技能链接任务 2 的示例目录，lifecycle 从共享方法指向示例；复核叶子参考只增加通用检查，不反向依赖完整设计技能或示例。新示例路径在任务 2 完成前注明待补，不宣称产物已存在。
- [x] **Step 5：核对三个阅读案例。** 简单单页需求可用短段落；修改既有字段只需更新受影响规则/AC/页面；无 UI 需求表达输入/动作/状态且保留逻辑原型。检查未知责任人、无版本链接及非关键未覆盖项仍能如实表达。案例只用于临时核对，不保存新的报告或产品成果。
- [x] **Step 6：检查格式与规则来源。** 执行 `git diff --check`，预期退出 0；检查新增来源定位是否具体、预期和实际是否分开。此时仅模板文字完成，不写示例已运行或安装已通过。

## Task 2: 完成附件提交教学例并验证可复现性

**Files:**

- Create: `D/assets/spec-delivery-example/README.md`：准确组装清单、来源许可、启动与场景入口。
- Create: `D/assets/spec-delivery-example/spec.md`：自足教学输入、对象/字段/权限、规则、AC、范围与版本。
- Create: `D/assets/spec-delivery-example/interaction.md`：两种业务视图、七场景、操作与重置、实际观察及未覆盖项。
- Create: `D/assets/spec-delivery-example/model.ts`：本例的类型及共用纯校验，不创建生产领域层。
- Create: `D/assets/spec-delivery-example/AttachmentSubmission.vue`：一个业务入口协调列表、详情、编辑副本、离开确认与失败反馈。
- Create: `D/assets/spec-delivery-example/entry.ts`：沿现有 `mount(page, title, appearance, id)` 挂载，appearance 为 `standard`，id 为 `main`。
- Create: `D/assets/spec-delivery-example/scenarios.json`：沿现有 schema 1 保存教学初始数据。

**Interfaces:**

- Consumes: 任务 1 的文档结构；`D/assets/vue-business-patterns/mount.ts`、`workspace.ts`、`Workspace.vue`、`workspace-model.js`、`workspace-page.ts` 及实际导入依赖；`D/assets/scenario-runtime.js`。
- Produces: 一个可按 README 在空目录组装的原型；`#scenario=<id>` 对应七个真实场景；同一规则的文档、数据与操作结果一致。
- `Actor = { userId: string; teamId: string; role: 'editor' | 'observer' }`。
- `RequestRecord = { id: string; teamId: string; ownerId: string; title: string; note: string; status: 'draft' | 'submitted'; requiredAttachments: string[]; attachments: string[] }`。
- `Draft = Pick<RequestRecord, 'title' | 'note' | 'attachments'>`。
- `ExampleData = { actor: Actor; requests: RequestRecord[]; openRequestId: string | null; failFirstSubmit: boolean; failFirstRequirementsRead: boolean }`。
- `model.ts` 导出以上类型，以及 `canView(record: RequestRecord, actor: Actor): boolean`、`canEdit(record: RequestRecord, actor: Actor): boolean`、`validateTitle(value: string): string | null`、`missingAttachments(required: string[], present: string[]): string[]`。
- `AttachmentSubmission.vue` 接收 `scene: { id: string; label: string; stateRef: string; data: ExampleData; ticket: number }`；使用既有 `useWorkspacePage().trackDirty()` 和 `onLeave()`，不另写重置框架。`entry.ts` 从 `../vue-business-patterns/mount` 导入现有挂载方法。
- 场景合同保持 `{ scenarios, data_digests }`，每项含 `id/label/state_ref/initial_data`；摘要按现有原型装配约定生成，初始化、ready(ticket) 和未知 hash 错误均复用运行器。

- [x] **Step 1：填写自足教学 Spec。** 采用设计第 7.2 节的业务语义，为本例独立登记教学规则及 AC；旧附件清单读取失败仍为旧样例未决，明确新例的处理是教学设定，不修改或引用旧 Q-001 为已解决。说明编号唯一只读、标题 trim 后必填、备注默认空、归属不可改及数据范围。
- [x] **Step 2：建立七个确定性初始场景。** 基础数据包含 `REQ-001/T-001/U-001` 的经办人草稿，`REQ-002/T-001/U-002` 的同团队他人申请，以及 `REQ-003/T-002/U-003` 的范围外申请；各场景内编号唯一。附件要求按顺序为“报价单、采购说明”，备注包含可核对的原始文本。

| 场景 id | 数据差异及入口 |
|---|---|
| primary | 经办人 U-001/T-001，列表起点；REQ-001 缺两项附件，模拟失败关闭 |
| missing-attachments | 同经办人，详情起点 REQ-001，已填标题/备注、缺两项附件 |
| readonly | 观察者 U-004/T-001，详情起点 REQ-001，无写权限 |
| out-of-scope | 经办人 U-001/T-001，尝试打开 REQ-003，必须拒绝且不呈现详情 |
| submit-failure | REQ-001 附件齐全，首次有效提交失败标志开启 |
| requirements-failure | REQ-001 清单首次读取失败标志开启，附件仍缺失 |
| dirty-leave | REQ-001 详情起点，初始正式值已知、无失败标志 |

所有场景显式提供两个失败标志和 openRequestId；`state_ref` 指向本例 Spec 的具体规则。初始数据只读使用，不能将编辑内容写回 fixture。

- [x] **Step 3：实现本例共用校验。** `canView` 要求同团队，editor 还要求本人发起，observer 允许团队内查看；`canEdit` 进一步要求 editor 且 draft。空白标题返回“请输入申请标题”，有效标题返回 null；缺附件按要求清单顺序返回全部缺项。无新增唯一性查询或通用策略框架。
- [x] **Step 4：实现列表、详情与正式值/编辑值分离。** 列表过滤可见记录；详情先判断范围再渲染字段。打开复制 title/note/attachments；保存和提交入口均执行权限、草稿状态及标题校验；保存不要求附件齐全。使用设计第 7.2 节的保存/提交/取消规则，保存或成功提交后更新正式值与 dirty 基线。
- [x] **Step 5：实现两个失败与离开确认。** 提交先确认清单已读并检查全部缺项，再消耗首次有效提交失败次数；失败不得改变正式值和草稿状态。清单首次失败保留输入，重试只恢复清单读取后重新校验。离开确认的留在当前页、Escape 均保留输入；放弃回列表不写回。场景切换/重置由已有壳卸载旧组件，清除本例计数及临时浮层，不引入额外异步模拟。
- [x] **Step 6：完成高保真组件和可访问反馈。** 复用已有主题与 Button、Input、Textarea、Checkbox、Field、Table、AlertDialog 等实际需要的固定组件；只读编号/归属不提供可编辑入口。标注附件、角色、保存均为本地模拟；错误关联输入、首错可定位、取消回焦合理；长文本和窄屏操作可达。不得用原生表单控件加相似 CSS 替代已存在的对应组件。
- [x] **Step 7：写具体组装说明并按说明组装一次。** README 给出源文件→目标文件对应表及实际 import 闭包，包括共享壳及样式、必要固定组件、工具函数、许可、全局 Token、语义映射、index.html、src/main.ts、场景合同与运行器。复制现有 package/锁/Vite 配置到新空目录，在 `src/spec-delivery-example/` 保留本例文件、在 `src/vue-business-patterns/` 保留相对导入所需共享文件。HTML 按场景数据→运行器→Vue 入口顺序加载；运行时不得引用源仓绝对路径或上级技能目录。只能照文档装配，不靠未记录的手工修复。

在该临时原型目录依次运行：

```sh
pnpm install --frozen-lockfile
pnpm exec vite build
pnpm exec vite --host 127.0.0.1
```

预期安装和构建退出 0，浏览器实际可打开页面。原型缺少类型检查入口时可使用实际匹配配置的工具检查，不将 Vite 构建称为类型检查。

- [x] **Step 8：执行小型纯函数自检。** 在临时原型目录用现有 esbuild 将 `src/spec-delivery-example/model.ts` 输出为临时 ESM，然后用 Node assert 验证：经办人只能看自己的团队内申请；观察者可看但不能改；跨团队不能看；submitted 不能改；空白标题拒绝；两项缺失、补一项、补齐分别返回两项、一项、空数组。记录断言结果，不把检查文件或构建输出写回源仓。
- [x] **Step 9：实际执行七场景及反例。** 按设计第 7.3 节连续完成保存/提交回列表、多缺项逐项补齐、观察者只读、范围外拒绝、有效提交失败后重试、读取失败重试、离开保留与放弃。另在 submit-failure 先清空标题提交，再修复标题：首次有效提交仍应失败，下一次成功；每个失败场景重置后应重新出现首次失败。已提交再进入应只读，正式数据不能被拒绝或取消改动。
- [x] **Step 10：检查入口、重置和显示条件并写回交互说明。** 七个真实 hash 均可直接访问；未知及重复 scenario 参数显示错误。按 1440×900、390×844 操作主路径和离开确认，检查长文本、错误提示、Tab/Enter/Space/Escape、主要操作可见性。重置后核对输入、正式数据、选择、错误及失败次数均恢复。写入实际版本/读取时点、实际动作和观察；未执行项保持未验证，停止本次持有的临时服务，保留必要可复核结果。

## Task 3: 补齐分发资源、同步副本并核对范围

**Files:**

- Modify: `.template-source/distribution/bundle-profile.json`。
- Modify: `profiles/frontend/.template-source/distribution/bundle-profile.json`。
- Sync: `.workbuddy/skills/yss-stage-decision/references/business-analysis.md`。
- Sync: `.workbuddy/skills/yss-product-lifecycle/references/spec-workflow.md`。
- Sync: `.workbuddy/skills/yss-design-system/references/product-prototype.md` 及其新增 `assets/spec-delivery-example/`。
- Sync: `.workbuddy/skills/prototype-review/references/review-method.md`。
- Sync: `profiles/frontend/.workbuddy/skills/yss-design-system/references/product-prototype.md` 及其新增教学目录。
- Sync: `profiles/frontend/.workbuddy/skills/prototype-review/references/review-method.md`。
- Sync: `profiles/backend/.template-spec/design/templates/{interaction-spec-template,state-matrix-template,prototype-review-checklist}.md`。
- Check only: 既有 Claude 链接、Backend 专有技能、依赖锁、Token、vendor、默认技能集合及公开白名单。

**Interfaces:**

- Consumes: 任务 1 的最终四项共享参考和三个设计模板；任务 2 的最终示例文档、代码、数据与实际检查。
- Produces: 根及实际平台副本同内容；Spec 默认安装以及 Frontend 按需设计技能的资源闭包完整；不引入新的默认技能。
- 三个新增显式资源均为完整文件路径：`.template-spec/design/templates/interaction-spec-template.md`、`.template-spec/design/templates/state-matrix-template.md`、`.template-spec/design/templates/prototype-review-checklist.md`。

- [x] **Step 1：声明 Spec 的必要模板。** 在根清单的 project/skills 两种安装的 `skillReferences.yss-design-system` 中追加三个模板，保留已有 tokens 和组件工程叶子资源。Spec 模板仍由 lifecycle 分发，教学目录按技能目录整体分发，不逐文件建新清单。
- [x] **Step 2：声明 Frontend 的可选资源。** 将三个模板加入 Frontend `manifest.allowFiles`，并追加到两种安装的 `skillReferences.yss-design-system`；保留现有设计依赖和叶子复核资源。`skills`、`skillDependencies` 不增加 lifecycle/stage-decision，也不把设计技能改为默认。
- [x] **Step 3：同步实际副本。** 仅将上列发生变化的共享文件和新增目录复制到现有 WorkBuddy 副本，禁止整树覆盖或删除其他修改；三个 Backend 模板副本与根同字节。核对既有 Claude symlink，缺少的平台不主动新建。任何必要 SKILL 导航修订也按实际副本关系同步。
- [x] **Step 4：检查 JSON 及资源选择闭包。** 用临时 Python 解析两份清单，按现有 CLI 规则计算 defaults+依赖、base+skillReferences+选中技能目录。断言 Spec 两种默认选择含增强模板和完整示例；Frontend 两种选择补装设计后含三模板、共享运行资源及示例；Frontend 未补装时不引入设计技能；默认集合仍为 16/41/13。逐条检查本次新增文档引用和源码相对导入能在目标选择中解析，不声称做过真实安装。
- [x] **Step 5：比较副本与保护项。** 逐文件比较源与副本字节，核对原型 package/锁、vendor、Token、Backend 专有同名技能、旧普通样例及公开白名单未被本次改动改变。发现并行变更时报告来源，不用整目录回退消除差异。
- [x] **Step 6：检查最终范围并交付。** 执行 `git diff --check`，并检查新增文件空白、来源许可、JSON 与全部新引用；回看实际 diff，仅包含本计划范围。交付说明源文件、示例运行与操作结果、静态分发检查及未验证项。未执行 Bundle/真实安装/公开同步/发行分别保留为未执行，不创建统一测试报告或自动提交。

## 自审覆盖与执行交接

| 已批准要求 | 对应任务 |
|---|---|
| 业务对象、关系及字段规则 | 任务 1 Step 2；任务 2 Step 1/3/4 |
| 权限与数据范围 | 任务 1 Step 2；任务 2 Step 2–6/8/9 |
| 完整流程与原型覆盖 | 任务 1 Step 3；任务 2 Step 4–7/9/10 |
| 可复现验收 | 任务 1 Step 2/3；任务 2 Step 2/7–10 |
| 版本与变更说明 | 任务 1 Step 2/4；任务 2 Step 10 |
| 完整教学示例 | 任务 2 全部 |
| 局部任务、无 UI、教学来源和既有职责 | Global Constraints；任务 1 Step 5；任务 2 Step 1 |
| 分发、平台副本、默认集合和叶子资源独立 | 任务 3 全部 |

编制完成时自审设计覆盖、步骤可执行性、类型和属性一致性、五类风险及计划体量。后续实施结果只按实际执行填写，上述未勾选步骤不代表已经完成。

建议在本会话由同一执行者顺序完成三项任务，再做一次整体复核；任务 2 强依赖任务 1 的文档结构，任务 3 消费前两项最终输出，反复切换执行者收益有限。也可由用户选择按任务使用子代理实施和复核。用户已于 2026-11-09 批准本会话顺序执行；完成情况见下文执行记录。


## 执行记录

- 2026-11-09：独立工作区基于 38cfce37，分支 codex/spec-deliverable-completeness；源仓两份未提交设计/计划保留原状。
- 执行调整：按已批准计划使用直接检查、临时断言及浏览器操作，不引入 TDD 测试套件或独立流程台账；本计划记录进度和结果。
- 接口预检：任务 1 的模板供任务 2 填写；任务 3 消费前两项最终文件；无相互冲突。

- 任务 1 完成：模板与四项参考已更新；简单单页、局部字段修订、无 UI 三种阅读案例核对了适用条件与边界；git diff --check 退出 0。示例引用暂标待补。

- 任务 2 完成：新增七份教学源文件；照 README 在新目录组装，pnpm 10.32.1 冻结锁安装与 Vite 8.3.5 构建退出 0，91 个固定组件文件摘要一致；10 条纯校验和七场景编号断言通过。IAB 实操七场景、重复/未知入口、重置、1440×900/390×844 与键盘检查通过；实际范围写入 interaction.md。
- 检查调整：同 hash 导航不会重置内存，复验使用既有重置按钮；弹层断言等待正常退出动画。未知场景实际标题为“工作区入口错误”，说明已对齐，未改共享壳。

- 任务 3 完成：两份清单资源闭包静态检查通过；Spec project/skills 和 Frontend 按需设计技能均可选择三个模板及七份示例；默认 16/41/13 不变。受影响 WorkBuddy 和 Backend 模板副本逐字节一致，Claude 链接正确。原始依赖锁、vendor、Token、Backend 专有技能、旧 fixture 与公开白名单未变。
- 分发限制：未构建 Bundle、未做真实安装演练、未同步公开仓或发行 CLI；静态资源闭包不表示已发行程序已经包含本次增强。
- 复核方式调整：本次未获提交授权，整体复核检查 38cfce37 基线到当前工作树的改动及新增文件，不以空提交范围替代实际变更。

- 最终复核：独立审查 38cfce37 到当前工作树的修改及全部新增文件，未发现 Critical/Important/Minor 问题。复核者独立核对 JSON/路径/链接、副本、保护项和 git diff --check；浏览器结果来自制作方实际操作，没有冒充独立浏览器复验。
- 收尾边界：完整 vue-tsc、真实安装、真机/辅助技术/跨浏览器、生产服务均未验证；不新增流程台账或持久测试套件，沿已批准范围保留未提交分支和工作区，不自动进入合并/推送/发行。
