# shadcn-vue 组件复用能力优化设计

日期：2026-11-07。状态：用户于 2026-11-08 确认本设计并要求进入实施计划；已完成引用核对与独立实施视角审阅，现已按计划完成本机实施与验证，整体审阅结果见实施记录；未提交或发布。

本设计面向 YSS 模板与前端技能维护者。目标是在现有三个技能与最小 starter 中补齐组件发现、按需获取、适配和验证能力，让 Agent 在已有页面开发或原型制作授权内完成缺失组件接入。本文沿用模板维护设计的既有 `.template-source/design/` 位置。

## 1. 已确认目标与当前差距

用户明确要求：Agent 发现缺少官方 shadcn-vue 组件时，自主检查已有实现、选择兼容版本、获取所需源码、补齐必要依赖与配置、适配当前主题和尺寸，并验证受影响范围。交付说明组件来源、实际变更、检查结果及未完成事项。

以下三种情况先给出具体影响与处理方案，由用户决定：大版本升级、覆盖已有定制组件、修改全局主题。提交、推送、部署沿用各自授权。

本轮读取到的现状如下；这是源码盘点，不是运行验证：

| 位置 | 当前事实 | 需要补齐的部分 |
| --- | --- | --- |
| `yss-design-system` | 固定来源清单登记 35 组组件，随附 28 组、184 个文件；组件 revision 为 `67c9a3926dc0a854507b325c6337ff2210d16379` | 区分已随附、可按清单获取、官方可选组件；调整“清单外必须等待维护者扩充”的现役限制 |
| `yss-frontend-application` | 已有组件工程、表单、弹层与可选能力指导 | 把兼容版本选择、获取方式、配置补齐、保护边界和失败处理写成可执行方法 |
| `yss-frontend-scaffold-generator` | 通过 CLI 复制静态 starter；仅生成源码时不安装依赖 | 说明组件配置的含义及后续由应用技能按需接入组件的边界 |
| Frontend starter | 已含 Button/Input、Reka、Tailwind 4、`@/` 别名与 YSS 主题；没有 `components.json` | 增加与现有源码和目录相符的元数据，方便后续组件工具识别 |

成功表现为：Agent 能为当前任务接入所缺的官方组件，保持业务行为与设计；来源和依赖可追溯；不会因组件不在随附快照中就无条件停工，也不会借此升级技术栈或覆盖项目定制。

## 2. 方案比较与选择

| 方案 | 组织方式 | 取舍 | 决定 |
| --- | --- | --- | --- |
| A：完善现有三个技能与 starter | 在现有参考内补齐组件方法，三个技能保留原职责，starter 增加配置 | 复用现有入口和分发；需要处理共享参考的单项安装引用 | 用户已选 |
| B：新增独立 `yss-shadcn-vue` 技能 | 独立维护组件选型、获取与更新方法，由设计和应用技能协作 | 组件知识集中，但新增触发、技能依赖、宿主副本和分发维护 | 不采用 |

以下具体组织方式由编写者提出，不冒充用户逐项决定：复用应用技能现有 `references/component-engineering.md` 作为共享组件方法的正文来源；设计技能按需读取该叶子文档；按现有 `skillReferences` 分发，不安装完整应用技能。starter 保留 Button/Input，不预装全部组件。

## 3. 范围与职责

| 维护位置 | 本次设计要求 |
| --- | --- |
| `.agents/skills/yss-design-system/SKILL.md`、`references/shadcn-vue-prototype.md`、`references/component-recipes.md` | 声明官方组件优先选用原则；补充可用状态与场景导航；允许在目标原型内验证并登记清单之外的官方源码；原型依赖与生产工程仍各自独立 |
| `.agents/skills/yss-frontend-application/SKILL.md`、`references/component-engineering.md` | 明确自主接入范围；集中维护组件目录入口、兼容选择、获取与差异处理、边界、验证和交付方法 |
| `.agents/skills/yss-frontend-scaffold-generator/SKILL.md`、`references/usage.md` | 解释新配置和后续接入方式；源码生成仍只复制 Bundle，不访问 registry，不安装依赖 |
| `profiles/frontend/.template-spec/templates/frontend-starter/` | 新增 `components.json`，更新 README 与 provenance 说明；既有组件字节、package/lock 与主题维持当前基线 |
| 对应来源说明、平台副本、Profile 分发与锁 | 同步行为变化和实际叶子引用，保持相同技能内容一致 |

本次不新增技能、组件包、私有 registry、组件管理 CLI 命令或脚本。不批量下载全部官方组件，不改造现有业务项目，不增加产品展示页、通用 CRUD、测试平台或统一审批流程。官方 Skills/MCP 可按需作为查询辅助，不成为必装依赖。

不修改 `yss-cli` 源码。既有 CLI 从 starter 前缀读取静态资源，新配置通过下一份实际构建的 Frontend Bundle 分发；模板文件变化不代表已安装 CLI 内嵌 Bundle 或公开发行已经更新。

## 4. 组件选择与可用状态

[官方组件目录](https://shadcn-vue.com/docs/components)是发现入口，不是本项目已安装清单。组件的实际可用性以目标工程源码、依赖和来源记录为准。

| 状态 | 判定依据 | Agent 行为 |
| --- | --- | --- |
| 项目已有 | 实际组件文件、导出、调用方和依赖齐全 | 优先复用现有 API、variants 和样式，不重复获取 |
| 固定快照已随附 | 当前可用技能或目标工程拥有相应源码与来源摘要 | 核对后复制必要文件及其跨组件依赖 |
| 固定清单已登记 | 清单包含固定 revision、路径和 SHA-256，源码未随附 | 从登记的官方固定来源取得并核对摘要 |
| 官方可选 | 官方目录存在，但本地快照与清单均未覆盖 | 查官方源码、依赖与目标工程兼容性，固定来源后在本任务目录引入；不能把“官网存在”写成“已经可用” |

组件目录按任务组织：输入与校验、搜索与选择、弹层与确认、导航与布局、反馈与空态、数据展示。常用组合优先复用现有配方：筛选栏、详情 Sheet、确认 AlertDialog、日期范围、表格选择与分页。

Data Table 是 Table 与 TanStack Table 等能力的组合，Date Picker 是 Calendar/Popover 等组件的组合，不能假设目录中的每个条目都是可单独导入的完整业务组件。复杂表格、表单、图表、Sidebar、Drawer、Sonner 或 AI 组件仅在任务需要时引入，并遵循现有可选能力和业务合同，不扩充默认 starter。

组件选择服从真实语义：单选、多选、导航、动作分别采用合适控件；不按选项数量强制 ToggleGroup，不因 Field/Form 名称自动安装表单状态库。

## 5. 自主接入与保护边界

### 5.1 先读目标工程

读取目标工程约定、当前变更、DESIGN、页面与状态、`components.json`（若有）、实际组件与调用方、package/lock、CSS 入口、别名及父 workspace。复用现有请求、表单和状态所有者。只读研究、review、技能安装和纯源码生成不触发组件写入。

### 5.2 选择兼容来源

优先使用目标工程已记录的组件 revision/style；其后考虑当前可用固定快照和清单。已有应用没有来源记录时，Agent 根据本地组件 API、Vue/Tailwind/Reka 与依赖锁自行调查并选择可证明兼容的官方固定来源，不为缺少历史记录而要求用户替 Agent 查事实。

兼容性不能只由版本号判断：核对组件的 imports、props/emits/slots、依赖与 peer 范围、style、CSS/动画能力及跨组件引用。Vue 3、ESM、Tailwind 4、Reka 的技能基线保持不变；旧工程只处理明确授权范围。

固定 CLI 包版本不等于固定组件内容。写入必须追溯至官方仓库的不可变 revision 或内容可核对的固定 registry 资源；不把可变默认 registry 或 `@latest` 视为可复现来源。需要的组件不在原 revision 时，Agent 可选择另一兼容的官方固定 revision，记录原因和实际来源；若必须改变既有 style/API 基线或升级现有依赖的大版本，转入用户决策。

### 5.3 取得源码并补齐依赖

使用项目已有、版本明确且支持所需操作的工具。执行前查看实际帮助；可使用受控的固定源码复制，不把官方 Skill 的“必须 CLI”覆盖本仓固定来源方法。没有 `components.json` 时可按现有目录复制源码，或在可准确确定配置且不改全局主题时补齐元数据，不运行初始化来重置工程。

先在本任务独立临时位置取得并阅读新增文件，核对其来源、跨组件依赖、导出、图标和实际包需求，再只合入本次所需部分。若 CLI 不能保证写入范围或固定来源，改用固定源码路径；不依赖未知的 dry-run、merge 或 overwrite 选项。临时位置不在技能目录或生产源码中安装依赖。

必要的同大版本依赖调整、导入、别名与应用配置可在授权范围内完成；通过项目包管理器更新 package 与锁，最终验证冻结安装。不手改锁摘要，不修改全局 Node/pnpm 或父 workspace，不为简单组件引入整套生态。

记录组件仓库、revision/style、源路径、原始摘要及实际适配，保留相应许可证和原始版权声明。项目已有 provenance 结构则沿用；没有时在本次开发说明记录，不为普通页面任务创建新的来源管理系统。设计任务只更新目标原型的记录，不自动扩充模板共享 vendor、清单或其依赖锁。

### 5.4 适配主题与交互

优先消费已有语义 tokens、尺寸、variants 和图标约定。新增组件的局部样式、局部 variant、别名适配，以及使用现有颜色与密度的调整，可自主完成并记录差异。固定 vendor 与目标工程适配分开记录，不能将适配后摘要冒充上游摘要。

保留标签和错误关联、disabled/loading、可访问名称、键盘操作、焦点进入和关闭返回行为；不自行再叠加冲突的焦点陷阱或全局 Escape 处理。实际检查 Teleport 弹层、窄屏和长内容，不以组件默认能力代替页面检查。

| 具体变化 | 处理方式 |
| --- | --- |
| 新增缺失组件及必要子组件、同大版本依赖与锁更新 | 自主完成受影响范围并验证 |
| 消费既有 token、调整新增组件的局部样式/variant | 自主完成，保持项目设计 |
| 补齐不改变主题的组件元数据、导入或必要支持资源 | 自主完成并核对实际影响；涉及主题定义时按下一行处理 |
| 新增或改动全局语义映射、`:root`/`.dark` 变量、默认字体、全局密度或 preset | 先列明文件、受影响组件、前后行为与可选处理方式，由用户决定；包括给全局主题补别名 |
| 升级现有依赖的大版本，或改变既有组件 style/API 基线 | 先调查影响与替代方案，由用户决定 |
| 覆盖已有定制组件，或为新增组件修改已有定制实现 | 先给出具体 diff、调用方与影响，由用户决定；优先提出不影响该定制的接入方式 |

后续若用户已有针对具体影响的有效决定，按该决定继续，不重复询问。无法证明兼容、来源不可取得或依赖无法安装时，保留现有工作，说明具体缺口，不用相似原生控件或假成功掩盖未完成项。

## 6. starter 配置设计

新增的 `components.json` 只描述已有 starter，不执行 init 或应用 preset。设计值如下；实施者根据实际选定 CLI 的 schema 与帮助验证支持后落地，不能为满足较新 CLI 而擅自更换现有组件 style。

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york-v4",
  "typescript": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/main.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "composables": "@/hooks"
  }
}
```

`new-york-v4` 对应现有上游源码路径；`@/hooks` 对应项目实际目录，不另建 `composables`。`baseColor` 是 registry 配置，运行时颜色继续来自现有 YSS tokens，不授予重置主题的权限。图标库按目标工程实际依赖与组件要求确定，不在最小 starter 中为元数据预装图标包。

仅新增配置与说明，不改 Button/Input、utils 的原始字节，不扩充默认依赖或全局主题。`components.json` 属于 YSS 配置，不加入 `copied-files.json` 冒充上游复制文件；现有 provenance 保留其原有含义。后续应用接入新增组件时单独记录其来源与适配。

## 7. 共享参考与分发

共享正文沿用 `.agents/skills/yss-frontend-application/references/component-engineering.md`。应用技能保留包内相对引用；设计技能在相关决策点按项目根 canonical 路径读取该文档，避免依赖宿主软链接布局。

在根 Spec 与 Frontend 的 `installations.project.skillReferences.yss-design-system`、`installations.skills.skillReferences.yss-design-system` 中加入该叶子文件。设计单项安装得到这份参考，不因此安装完整应用技能、starter 或其运行依赖。该共享文档新增的本地链接须同时分发完整引用闭包，或将必要规则保留为自包含正文；不能用全量安装掩盖漏分发。

同名技能继续以根 `.agents/skills` 为唯一主源，按实际消费范围同步根 `.workbuddy/skills` 与 Frontend `.workbuddy/skills` 副本；Claude 链接保持既有方式。Backend 不消费这三项技能，不增加其默认安装或内容范围。

更新实际受影响的来源说明与现有锁记录，保持上游 revision 与本地有效摘要分开。按维护规范更新已存在的 `effectiveHash`，不增加新锁 schema、生成器或原地替换源版本身份。技能集合和安装数量不变。设计文档只保存在模板内部，不进入项目安装资源。

## 8. 实施后的验证与完成判断

下列是本次改造的验证范围，不是新增统一门禁或需要分发的测试套件。执行者复用现有工具和临时工程，说明真实结果。

| 对象 | 需要取得的证据 |
| --- | --- |
| 文档与分发 | 内部链接有效；改动副本一致；Spec/Frontend 的 project、skills 及设计单项安装都能读取共享叶子；原有许可和来源记录保留 |
| starter | 新配置可解析，style、CSS 路径和 aliases 与实际源码一致；通过实际支持的 CLI/Bundle 在临时新目录生成，确认新文件被复制；冻结安装、lint、类型检查与构建通过，入口可运行 |
| 常规组件接入 | 在临时 starter 中按固定来源接入一个原先缺失、可复用现有主题的组件，例如 Switch；核对依赖、导出、尺寸、选中/禁用、键盘与焦点，证明规则可执行 |
| 弹层与设计保持 | 使用现有固定 Dialog/Sheet 等代表场景核对标签、Escape、焦点返回、Teleport 主题与窄屏；若接入需要修改全局主题，先形成具体影响方案，不为通过演练越过用户边界 |
| 授权与发现行为 | 以清楚标注的临时演练检查“新增缺失组件”能继续，以及“大版本升级、覆盖定制、改全局主题”会给出具体方案；只读 review、纯文案、技能安装和只生成源码保持原范围 |

结构和源码核对不证明宿主实际选对技能；人工推演不冒充 Agent 行为实测。运行验证中的临时组件和演示文件不回填到最小 starter。没有业务页面或真实接口输入，不宣称业务还原或生产联调完成。

目标应用中的每次实际接入仍按用户要求完成受影响范围的类型检查、构建和关键交互验证；设计还原另外保留同条件视觉对照。工具或环境受限时报告已完成与未验证范围，不能把受限检查写成通过。

本设计阶段只盘点了源码、配置、分发约定与官方资料；未生成应用、安装依赖、执行 shadcn-vue CLI 或验证新配置。本轮获取官方 `schema.json` 遇到 HTTP 403，配置支持范围留给实施时通过实际 CLI/schema 核对；这不证明配置无效，也不证明已兼容。

设计文档已完成本地引用、行尾空白与代码围栏核对，9 个本地引用均可达。独立实施视角审阅未发现影响制定计划的重要缺口；审阅未执行 CLI 或应用验证，不代替后续运行证据。

## 9. 实施者可自行确定的细节

实施者依据实际源码与工具决定兼容的精确 CLI 版本、官方固定源码的获取方式、代表场景与必要依赖版本；不新增用户未要求的管理平台。若所需调整触及第 5 节三项用户决策边界，先完成可审阅的影响分析，再请求对应决定。

本设计确认后再编写实施计划；设计确认本身不扩大提交、推送、部署或发行授权。

## 10. 依据

- 本聊天中用户确认的自主接入范围、三项决策边界及方案 A 选择。
- [现有组件工程参考](../../.agents/skills/yss-frontend-application/references/component-engineering.md)、[Vue 原型方法](../../.agents/skills/yss-design-system/references/shadcn-vue-prototype.md)、[组件配方](../../.agents/skills/yss-design-system/references/component-recipes.md)。
- [固定来源清单](../../.agents/skills/yss-design-system/assets/prototype/registry-manifest.json)、[随附快照清单](../../.agents/skills/yss-design-system/assets/shadcn-vue-authoring/registry-manifest.json)、[starter](../../profiles/frontend/.template-spec/templates/frontend-starter/README.md)。
- [技能维护约定](../agents/skills-maintenance.md)、[共享引用编写方法](../../.agents/skills/maintaining-skills/references/authoring.md)、[Frontend 分发](../../profiles/frontend/.template-source/distribution/bundle-profile.json)。
- [官方介绍](https://shadcn-vue.com/docs/introduction)：组件通过源码分发并由项目维护。[官方组件目录](https://shadcn-vue.com/docs/components)：发现入口。
- [components.json](https://shadcn-vue.com/docs/components-json)：CLI 配置，手工复制组件时可选。[CLI](https://shadcn-vue.com/docs/cli)：init、add、view、diff 等命令及写入行为，实际使用以选定版本帮助为准。
- [Data Table](https://shadcn-vue.com/docs/components/data-table)、[Date Picker](https://shadcn-vue.com/docs/components/date-picker)、[Combobox](https://shadcn-vue.com/docs/components/combobox)：组件组合及依赖。
- [官方 Skills](https://shadcn-vue.com/docs/skills)与[已核对的固定 Skill 源码](https://github.com/unovue/shadcn-vue/blob/d9aec43ae5eb258d62d532cc788c0f693c07bd5b/skills/shadcn-vue/SKILL.md)：仅吸收适用知识；不继承 `@latest`、强制表单库、preset 或自动命令的执行政策。

官方资料于 2026-11-07 查询。其默认文档不自动成为现有固定组件的 API 依据，也不证明特定 CLI 发行版与当前 starter 已验证兼容。
