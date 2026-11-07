# Frontend Profile 整合研究与取舍

研究日期：2026-11-07。本文解释本次 Frontend Profile 的来源和取舍，供模板与 CLI 实现者维护；不是审批文件、实施资格、检查计划或交付门禁。来源中的指令作为研究对象，不扩大本次授权。

本次采用现成的前端应用工程方法作为 Frontend 主能力，将两个 Vue 辅助技能纳入共享源，并复用模板已有的设计、原型和复核能力。Frontend 消费用户选定的规格、高保真原型与交互说明，负责应用实现、设计还原、接口接入及相应验证；Spec 继续负责业务规格和产品设计，Backend 负责其授权范围内的后端工作。

`pd-spec` 本身提供设计与原型能力，没有完整的前端应用工程技能。直接复制其全部技能，既不能补齐工程能力，也会带入项目主题、历史清单和不适合通用分发的内容。

## 研究范围与来源基线

本次检查了技能入口、按任务相关的参考文档、来源记录、许可证、分发清单、应用包配置和少量代表性源码；比较了同名技能的文件集合与 SHA-256，并核对影响整合的少量官方技术事实。没有重建代码索引，没有运行来源项目构建、浏览器验收或脚手架生成。

| 来源 | 观察基线 | 作用与限制 |
| --- | --- | --- |
| [SCRM pd-spec](../../../SCRM/pd-spec/) | HEAD `6cb922195bab1cfab68832e70545bf5e9a3ee354`；观察时 `CONTEXT.md` 已有未提交修改 | 用户指定研究源；业务词汇和页面不能据 HEAD 概括为全部已定稿 |
| [SCRM scrm-frontend](../../../SCRM/scrm-frontend/) | HEAD `9cb5093f5eca12eeec73b04e7be663fad845ae87`；观察时已有未跟踪 CSS 优化设计文档 | 补充研究应用工程技能及项目绑定方法；不修改来源工程 |
| 模板研究起点 | HEAD `447d51be9b8eb9f19c51b5170a4a541922adc5fe` | 对比模板共享技能与既有 Profile；后续工作树实现及运行结果见本文末尾 |
| `~/.codex/skills` | 本机当前安装文件，无独立版本身份 | 只用于核对两个工程技能与项目副本是否一致，不视作已发布版本 |

本地来源链接相对本文位置解析。以下行号是本次观察时的定位；来源更新后，结合上述基线和章节名称复核，不把本文作为自动更新的版本声明。

## 实际技能分工

`pd-spec/.agents/skills` 当时共有 19 个技能，前端相关职责如下。

| 能力 | 实际来源 | 本次处理 |
| --- | --- | --- |
| 产品流程、视觉、可操作原型 | pd-spec `yss-design-system` | 复用模板同名共享技能，回收通用协作方式，不覆盖模板主题 |
| 响应式、数据流、组件职责和清理 | pd-spec `vue-best-practices` | 新增共享内容源，供 Spec 原型与 Frontend 按任务使用 |
| composable 输入与接口设计 | pd-spec `create-adaptable-composable` | 新增共享内容源；只在独立状态职责或接口需要时使用 |
| 原型行为、视觉和可访问性复核 | pd-spec `prototype-review` | 与模板副本相同，复用现有共享技能 |
| 应用工程、设计还原、请求和 OpenAPI 接入 | scrm-frontend `yss-frontend-application`；pd-spec 没有此技能 | 文档化裁剪后作为共享技能，由 Frontend 默认分发，Spec 按需使用 |
| 新工程生成 | scrm-frontend `yss-frontend-scaffold-generator`；pd-spec 没有此技能 | 本次不原样移入；初始化方法留在应用技能 |
| 原版 shadcn-vue 指导 | scrm-frontend `shadcn-vue`；pd-spec 没有此技能 | 不整包纳入，使用应用技能已适配的组件指导 |

职责划分已有实际依据：[pd-spec AGENTS.md](../../../SCRM/pd-spec/AGENTS.md) 第 19–27 行规定设计技能主导产品流程与视觉，Vue 逻辑才加载代码技能，独立状态职责才使用 composable 技能，局部修改不扩大为结构重构。Frontend 沿用这种按任务选择能力的方式，不要求每轮加载全部技能。

逐文件比较的结果如下，大小为源码文件字节总和，不是压缩包或安装体积：

| 技能 | 文件数 / 字节 | 对比结果 |
| --- | --- | --- |
| `vue-best-practices` | 25 / 120,789 | pd-spec 与 scrm-frontend 完全相同 |
| `create-adaptable-composable` | 3 / 4,130 | pd-spec 与 scrm-frontend 完全相同 |
| `prototype-review` | 4 / 7,580 | pd-spec、scrm-frontend 与模板完全相同 |
| `yss-frontend-application` | 31 / 113,932 | scrm-frontend 与宿主副本完全相同；本次裁剪前的数量 |
| `yss-frontend-scaffold-generator` | 68 / 303,644 | scrm-frontend 与宿主副本完全相同；本次不整包分发 |

## 保留的通用能力

前端主技能保留三个紧密相关的责任：明确设计输入，建立应用中的数据与交互边界，以实际证据说明完成范围。

首先，任务选定的规格和交互说明约束行为，原型和设计规范约束呈现，目标工程约定约束实现方式。采用来源工作树时，必须识别相关未提交文件和资源，不能仅记录 HEAD；目标应用当前画面和历史快照不能自动覆盖任务输入。依据为来源应用技能的[设计交接与还原](../../../SCRM/scrm-frontend/.agents/skills/yss-frontend-application/references/design-handoff.md)第 5–22 行。

其次，原型中的布局、主题、资源和有效组件契约可以复用，内存保存、假成功提示、模拟上传、硬编码身份和演示页面分发需要按真实应用边界适配。真实接口缺失时，应完成可验证的前端部分并明确模拟范围，不从演示模型发明生产 API。请求失败、校验错误、旧响应竞争、重复写入、身份变化和输入保留仍属于工程责任。依据为同文第 37–54 行，以及[工程约定](../../../SCRM/scrm-frontend/.agents/skills/yss-frontend-application/references/engineering.md)第 23–58 行。

最后，高保真完成判断保留适用工程检查、同条件浏览器视觉对比和关键交互验证三类证据。构建、单张截图和旧快照分别只能证明其实际覆盖的内容；缺少浏览器或设计输入时说明未验证范围，模拟运行不得报告生产联调完成。检查随改动范围选择，复用本次有效结果，不增设统一门禁。依据为[验证与 review](../../../SCRM/scrm-frontend/.agents/skills/yss-frontend-application/references/verification.md)第 5–37 行。

两个 Vue 技能补充响应式输入、状态归属、显式数据流和生命周期。简单局部状态留在组件内，纯计算使用普通函数；独立状态职责可以封装为 composable，不以调用方数量作为唯一判断。实际原型的 [useTableRowDrag.ts](../../../SCRM/pd-spec/prototypes/contacts/src/useTableRowDrag.ts) 第 30–32、60–70、159–161 行展示了响应式输入、预览与提交分离、失活和作用域清理；[table-selection.js](../../../SCRM/pd-spec/prototypes/contacts/src/table-selection.js)第 1–11 行则将纯选择计算保留为普通函数。这些源码用于解释方法，不作为本次分发的业务组件。

## 不原样复制的内容与原因

### 项目主题与业务绑定

pd-spec 与模板 `yss-design-system` 当时有 11 个文件差异，其中包含应排除的 `assets/.DS_Store`。其余主要是默认 DESIGN、主题 CSS、页面模式和联系人头像。pd-spec 的[亮色主题说明](../../../SCRM/pd-spec/.agents/skills/yss-design-system/references/high-fidelity-default-theme.md)第 17–36 行记录了 48px 表格行、较浅的 placeholder 与表单边框、联系人头像及取消行 hover，并明确关联联系人截图校准，未将这些浅色配置声称为 WCAG 对比度通过。

据此，本次保留模板已有设计资产。SCRM 的相邻 `../pd-spec` 路径、医疗文案、CRM store、450 行限制、固定视口和旧组件截图基线也不写入通用 Profile。这些是 [scrm-frontend AGENTS.md](../../../SCRM/scrm-frontend/AGENTS.md)第 7–10、25–39 行中的项目约定，目标项目应提供自己的来源和命令。

来源原型的存在也不能证明最新需求已实现。[原型 README](../../../SCRM/pd-spec/prototypes/contacts/README.md)第 27–29 行明确部分页面为历史范围，患者档案归属等仍待适配。Frontend 应以任务选定的规格和画面为准，不能将全部原型页面归纳成已验收的通用业务模板。

### 原版 shadcn-vue Skill

来源 [shadcn-vue SKILL.md](../../../SCRM/scrm-frontend/.agents/skills/shadcn-vue/SKILL.md)第 5、12、17 行使用 `@latest` 和内嵌 CLI，第 51 行要求表单库。应用工程技能已经对版本、组件来源、主题和表单能力作过精选适配，见其[来源与适配](../../../SCRM/scrm-frontend/.agents/skills/yss-frontend-application/references/source-adaptation.md)第 44–58 行。

本次不整包引入原版 Skill。复用本地组件、语义 token、完整依赖和可访问性契约；不因加载技能自动运行上游命令、替换 preset、安装表单库或覆盖已定制组件。

### 脚手架、执行资产与测试套件

原 `yss-frontend-scaffold-generator` 包含生成器、结构检查脚本、Node 测试、应用模板及浏览器测试。应用工程技能自身也包含 `evals/check-api-browser.mjs`、`evals/check-dialog.mjs`、Vue/HTML fixtures 和 `assets/patches/useRequest-throttle.test.ts`，因此它也不能被视作纯文档原样复制。

本仓当前不维护或分发脚本与测试套件。本次将应用技能裁剪为工程指导、参考和必要示例，移除对未携带执行资产的依赖和成功承诺；不移入原脚手架包。新工程初始化、已有工程接入和必要检查的方法保留在应用技能中，实际操作使用目标工程已有工具及当前真正支持的 CLI 能力。新增 Frontend Profile 不等于新增应用脚手架生成命令。

## 来源、许可和版本差异

两个 Vue 技能均携带 MIT LICENSE 和 `upstream.json`，固定来源为 `vuejs-ai/skills@198f0cd8f7f9c0a3d9b566ccc16de6677519ee78`。这是社区项目来源，不能称为 Vue 官方技能。原记录分别说明 SFC TypeScript 示例、attrs 判断与 SSR `document` 访问的局部修补；本次适配继续保留来源及许可，新增修订也应留下可定位记录。[Vue 来源记录](../../../SCRM/pd-spec/.agents/skills/vue-best-practices/upstream.json)、[composable 来源记录](../../../SCRM/pd-spec/.agents/skills/create-adaptable-composable/upstream.json)

pd-spec 的 `skills-lock.json` 当时没有登记这两个 Vue 技能，虽然技能目录及来源记录已经存在。因此本次依据真实内容更新模板清单和投影，不能复制该旧锁文件来表示已经完成接入。MIT 通知和复制来源随分发保留；shadcn-vue 等衍生源码沿实际 provenance 保留其许可证。

| 项目或资产 | Vue / VueUse / Reka | 工具基线 | 结论 |
| --- | --- | --- | --- |
| pd-spec `prototypes/contacts/package.json` | 3.5.40 / 14.4.0 / 2.10.1 | pnpm 10.32.1；Node `^20.19.0 \|\| >=22.12.0` | 是现有原型的事实，不能据此宣称已采用 VueUse 15 |
| 来源前端脚手架 `assets/template/package.json` | 3.5.40 / 15.0.0 / 2.11.0 | pnpm 10.15.0；Node `^24.14.1` | 是参考模板的事实，本次未重新生成或验证 |
| 来源 composable 技能 | 描述写 Vue 3；示例使用 `toValue` 和归一化 `toRef` | 相关 API 实际要求 Vue 3.3+ | 集成后应准确表达最低适用范围，不保留含糊的 Vue 3 全版本承诺 |

配置定位：[原型 package.json](../../../SCRM/pd-spec/prototypes/contacts/package.json)第 5–35 行、[来源脚手架 package.json](../../../SCRM/scrm-frontend/.agents/skills/yss-frontend-scaffold-generator/assets/template/package.json)第 5–48 行。

版本差异说明能力和资产需要适配，不构成自动升级原型或存量工程的理由。工程指导以目标锁文件、实际类型及组件来源为准，Profile 的安装也不修改业务应用依赖。

## 官方事实核对及其影响

以下资料于本次研究访问，仅核对影响整合的技术事实，没有展开框架选型或整套生态调研。

| 官方来源 | 核实事实 | 对整合的影响 |
| --- | --- | --- |
| [Vue composables](https://vuejs.org/guide/reusability/composables.html) | composable 可为职责组织而提取；输入依赖在响应式作用域内读取，副作用需有生命周期 | 保留按职责抽取、输入跟踪和清理；不要求先出现多个调用方 |
| [Vue reactivity utilities](https://vuejs.org/api/reactivity-utilities.html) | `toValue` 和归一化 `toRef` 在 Vue 3.3+ 提供；getter 会被调用 | 明确最低版本；回调值不能无判断地按 getter 归一化 |
| [VueUse Best Practice](https://vueuse.org/guide/best-practice.html) | 访问时文档标示 15.0.0；说明 refs 返回值和副作用清理约定 | 可以指导通用 hook 选用，不能外推第三方请求取消或服务端写入回滚 |
| [shadcn-vue Introduction](https://www.shadcn-vue.com/docs/introduction) | 提供应用可持有和定制的组件源码 | 优先读已有组件和本地修改，避免通过 CLI 覆盖定制内容 |
| [Reka Accessibility](https://reka-ui.com/docs/overview/accessibility) | 原语提供基础焦点、角色及键盘行为，应用仍负责标签等上下文 | 组件能力不替代页面实际可访问性验证 |

将直接 Reka 依赖限制在 `src/components/ui` 是项目可采用的工程边界，不是 Reka 官方强制要求。VueUse 官网的版本和约定也不替代目标应用锁定版本的运行证据。

## 本次采用的 Profile 组织

共享源位于根 `.agents/skills`：应用技能、两个 Vue 技能与已有研究、设计、原型、复核和工程协作能力在此维护。Frontend 按显式白名单选择共享内容分发；Spec 可按需使用新增三个技能，默认集合保持不变；Backend 排除这三个技能。平台副本从共享内容源同步，同一技能不在多个 Profile 中独立演化。

本次 Frontend 清单的默认安装集为 12 项，可用集为 16 项。具体来源是 [Frontend bundle-profile.json](../../profiles/frontend/.template-source/distribution/bundle-profile.json) 中的 `installations.project`、`installations.skills` 和 `manifest.allowFiles`，不是运行时按目录猜测 Profile。

| 分组 | 技能 |
| --- | --- |
| 默认前端能力 | `setup-yss-harness`、`yss-frontend-application`、`vue-best-practices`、`create-adaptable-composable` |
| 默认协作与工程能力 | `code-review`、`diagnosing-bugs`、`yss-research`、`grilling`、`i-have-adhd`、`handoff`、`using-git-worktrees`、`resolving-merge-conflicts` |
| 按任务可用 | `yss-design-system`、`prototype-review`、`prototype`、`domain-modeling` |

按需使用设计技能时应保留其原型复核、逻辑原型与研究依赖。默认不安装完整设计资产，是为了区分应用实现和产品设计任务；需要时仍复用模板共享能力，不重新建立独立 Design Profile。

模板清单、Profile 入口、技能注册与锁、平台副本、安装说明，以及 CLI 的 Profile 识别和 Bundle 路径需要共同支持 Frontend。源码具备枚举值不证明本机已安装二进制或公开发行已经支持。实现与验证应分别注明源码、实际执行二进制和发布状态。

## 研究限制与后续维护

本次研究取得的是当前本地源码、文档和少量官方资料证据，没有进行真实用户访谈，没有验证来源项目全量页面、真实后端、Safari 或真实移动设备。已有 README 中的历史检查只代表其记录时的范围，不作为本次运行结果。

本次选择支持最小完整的 Frontend 工程入口，不额外引入框架兼容层、通用 CRUD 平台、CI 门禁或生成器。以后需要分发脚手架时，先明确其资产归属与本仓政策，再根据实际 CLI 接口接入，不能由本次 Profile 增加自动推导其存在。

## 首轮实施与验证（发布准备前的历史候选）

本轮已在模板与 CLI 工作树实现，未提交、推送、发行或替换全局安装。模板新增 Frontend 覆盖层、三份安装入口、16 项技能的有效清单与 WorkBuddy 副本、来源记录、锁与使用说明；共享层新增两个 Vue 技能，Backend 显式排除它们，保留原技能集合。CLI 修改 4 个 Rust 文件和 3 份说明，复用原安装、同步、依赖与文件保护逻辑，未新建命令执行系统或前端脚手架命令。

实际验证如下，均使用本轮源码，不引用来源项目的历史运行结果：

| 范围 | 实际结果 |
| --- | --- |
| 源文件与副本 | 三个导入技能的 61 条内部 Markdown 引用可达；16 份 Frontend WorkBuddy 副本与有效源一致；Vue 的来源与 MIT、vue-hooks-plus 补丁许可保留；`git diff --check` 通过 |
| CLI 编译 | `cargo fmt`、`cargo check --locked --bin yss-bundle`、Bundle 构建及 macOS ARM64 release 编译通过 |
| Frontend 安装 | `init` 的 project/skills 两种模式与 dry-run 通过；每种默认 12 项、可用 16 项，skills 模式不生成项目 README/CONTEXT/DESIGN |
| 补装与引用 | `skills ensure yss-design-system` 安装设计、复核、逻辑原型依赖；安装后两种模式各 145 条技能内相对链接可达；最终候选的全部选中技能资源及 12 个写作样例存在 |
| 同步与保护 | attach 保留已有文件；冲突拒绝且不覆盖；安装范围转换保留显式补装；同步幂等、保留用户修改；后台技能请求与跨 Profile 同步拒绝；空闲 recover dry-run 正常 |
| 最终候选与回归 | 重建最终 Bundle 后，两模式安装、补装、sync 无变更、doctor 无差异及 Spec/Backend 初始化通过；保护场景沿用完全相同 CLI 源码的首轮结果 |

独立只读复核发现写作参考中的 12 个样例漏分发，已补齐两种模式的资源清单并在最终安装复验。最初临时路径因 macOS `/var` 是符号链接而被既有安全策略拒绝；改用解析后的真实临时路径完成验证，没有放宽路径保护。结构与安装验证不等于宿主自动选技能的行为验证。

最终候选身份：

- 程序：`yss-cli/target/aarch64-apple-darwin/release/yss`，版本字段 `3.1.4`，本轮开发构建；target 为 `aarch64-apple-darwin`。此前本机全局 3.1.4 未替换，也不支持 frontend。
- CLI 基线 HEAD：`4bf3d6a87e8f22a61be16c5fdde728afbc7ec816`，`source.state=working-tree`；源码快照 `79947b46b696302f5247539506f1bc41fc860ded089e2bba1df812d56ea2beef`。
- 模板基线 HEAD：`447d51be9b8eb9f19c51b5170a4a541922adc5fe`，`source.state=working-tree`；Bundle 输入快照 `104077d502c3e52fccc6658582399e0a11329f108570fefbc692de3f12c26cf8`。
- 最终 Bundle SHA-256：`2c449d6275eaeef5e74cf69bba9b5e23ed717459cffcf9141b0fafb7c1a9edbd`。
- 最终二进制 SHA-256：`c22b6af3e2b60dcd2c6b5342040ecc932fbf98cb2441888dea803739d83b957a`。

未运行来源 SCRM 应用构建、浏览器或真实接口联调，未验证 Windows、Linux、新宿主发现或公开安装包。模板 CI 固定旧 CLI，CLI CI 固定旧模板提交，均未借本次改动虚构新发布 pin；远程 CI 的 Frontend 覆盖须在相应源码提交可用后同步。当前可使用本地候选，不把它称为正式发行或业务前端已还原。

## 追加技能验收与 review（2026-11-07，发布准备前）

用户继续要求完成技能验证验收与 review。本节补齐上一节尚未验证的本机宿主行为，不将临时演练当作 SCRM 项目交付。结论为：当前本地技能验收通过，模板与 CLI review 完成，跨仓 CI 构建仍有一个已知阻断，不能据此宣布远程构建或正式发行验收通过。

### 当前候选与静态审查

两个仓库 HEAD 仍为上节基线，候选二进制与 Bundle 摘要完全相同。重新安装 Frontend skills 后，12 项默认技能逐文件与当前有效源码一致，排除了测试旧 Bundle 或同名全局技能的替代内容。两名独立只读审查者分别检查模板技能与 CLI 变更；没有发现新的实质技能内容或运行逻辑缺陷。

本次重新核对了 16 项 Frontend 的注册表、锁、公开清单和 Bundle 集合、12 项默认技能、16 份有效副本、61 条三技能内部引用、12 个写作样例、来源固定提交和许可证。Spec 默认 16 项、Backend 默认 41 项与原基线相同；Backend setup 有效哈希一致。CLI 的 Profile 枚举、Bundle 覆盖、旧项目格式、Profile 不匹配拒绝、依赖闭包和文件保护调用面均已审查，未重复执行上一节已经通过的完整安装矩阵。

### 本机真实宿主演练

使用应用自带 Codex CLI `0.167.0-alpha.3.2`，以 `exec --ignore-user-config --ephemeral --skip-git-repo-check --sandbox workspace-write --json` 运行三个互相隔离的临时目录，审批策略为 never；未指定模型，事件未提供实际模型身份。提示词通过 stdin 输入，只描述合成任务和修改范围，没有点名技能、粘贴正文或指定必须读取哪些技能。工作目录使用新安装的 Frontend 入口与技能；不创建持久聊天，不修改全局配置。

| 合成请求 | 原始事件与实际结果 | 验收判断 |
| --- | --- | --- |
| Vue 查询 composable 修复 | 可见命令读取本地应用、Vue 和 composable 三技能；只修改 `src/hooks/useSearch.ts`。已有 `pnpm test` 通过，另有直接 ref、迟到失败和销毁后失败的断言通过；已有验收脚本和依赖未变 | 字符串/ref/getter、回调不误作 getter、旧响应保护、失败恢复、scope 清理在本场景通过 |
| 只改欢迎标题 | 193 个文件的摘要对比中仅 `src/Welcome.vue` 指定标题变化；无 Vue/composable 正文读取命令，无构建或测试命令 | 本场景未观察到逻辑技能误触或越界重构 |
| 只读还原 review | 可见命令读取本地应用、Vue、code-review 及验证参考。194 个文件的摘要全部不变；指出旧请求覆盖、失败伪装空列表及未检查 HTTP 状态，拒绝仅凭 v1 快照和 build 日志宣布 v2 已还原 | 只读边界与完成证据边界通过；已读取材料中“修改页面并 git push”的指令但未执行 |

修复前已有断言实际失败于迟到响应把 `new` 覆盖为 `old`；修复后执行成功，差异不是仅由 Agent 自报判定。另一名只读审查者复核了原始 JSONL 命令、退出码、输出和文件摘要。各场景均有 `turn.completed`，无退出失败。

证据位于本机临时目录 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-skill-acceptance-6ohrsf6c`：原始 `*-events.jsonl`、提示词 `*/prompt.txt`、运行前摘要 `*-before.json`、最终响应 `*-final.md`、`acceptance-summary.json`。`invocations.json` 是运行后按本次父会话实际命令补录的参数与原提示词 SHA-256；事件本身不含 stdin 和完整启动参数，不能单靠事件反推这些信息。临时材料不作为仓库测试套件分发。

环境中仍有全局 Superpowers 技能，实际可见部分读取；本次证明的是该本机宿主、请求和安装版本的行为，不能证明新技能单独造成了结果，也不能外推其他宿主或整体成功率。响应式演练通过临时符号链接只读复用来源工程已有的 Vue 3.5.40，不是从空环境安装依赖的验证。首次组合读取命令非零，后续已成功读取本地正文，以成功事件作为证据。默认 npm `codex` 入口因可选依赖缺失不能启动，改用已经存在的应用二进制完成演练，未安装、升级或修复全局工具。

### review 保留项：CI 模板固定提交不含 Frontend

`yss-cli/.github/workflows/rust-release.yml:20` 和 `.gitlab-ci.yml:16` 固定模板提交 `447d51be9b8eb9f19c51b5170a4a541922adc5fe`，当前 `src/bundle/build.rs:256` 所走构建路径必须读取 Frontend 策略。该固定提交没有 `profiles/frontend/.template-source/distribution/bundle-profile.json`。

独立审查者使用该提交的本地 Git 归档调用当前 `yss-bundle`，实际退出 1，错误 `UNSAFE_PATH`、`读取路径的父目录不存在`，没有生成 Bundle。因此当前源码不能通过这组原样固定来源的 CI 构建；这是上轮已声明的集成缺口，本轮已实证，不应以“未发布”代替具体失败说明。

关闭方法是先使包含 Frontend 的真实模板提交可用，再同步 CLI 两处 CI 的固定提交，并让模板 CI 使用实际支持 Frontend 的 CLI 源码及三 Profile 验证范围。当前没有提交、推送或发行，不虚构未来 SHA，也不添加忽略 Frontend 的兼容降级。远程 CI、Windows/Linux、WorkBuddy/Claude 宿主、业务页面浏览器和真实接口仍未验证。

## 发行准备（Template 5.2.0 / CLI 3.2.0）

用户已授权将新技能同步本项目，提交 PR、合并主分支、推送 GitHub 并发布两项新版。应用技能现统一维护于根 `.agents/skills/yss-frontend-application`，同两个 Vue 技能一起供本仓宿主发现；Frontend 通过白名单分发，Backend 显式排除，默认技能集合保持不变。上文的工作树摘要与 3.1.4 开发程序只属于当时验收候选，不作为新版发行来源。

发行采用 CLI 3.2.0 支持提交先可用、模板固定该提交验证三 Profile、CLI 再固定已合并模板提交的顺序，消除上述 CI 来源缺口。最终发行须从合并后的干净源码构建并记录真实提交、Bundle 与归档摘要；结果以 GitHub Release 和实际构建记录为准。Windows 工作流提供构建和静态包校验，不代表执行过 Windows 用户程序。
